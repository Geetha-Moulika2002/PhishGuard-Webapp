// ============================================================
// PhishGuard — Load Test Runner & Results Processor
// Runs Artillery and converts raw JSON to structured results
// ============================================================

const { execSync, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const config = require("../config");

const RAW_DIR = path.join(__dirname, "../reports/raw");
const RAW_OUTPUT = path.join(RAW_DIR, "load_results.json");
const PROCESSED_OUTPUT = path.join(RAW_DIR, "load_summary.json");

// Ensure output dirs exist
if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

// ── helpers ──────────────────────────────────────────────────
function log(status, name, detail = "") {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "ℹ️ ";
  console.log(`  ${icon} [${status}] ${name}${detail ? " — " + detail : ""}`);
}

// ── Run Artillery ────────────────────────────────────────────
function runArtillery() {
  return new Promise((resolve, reject) => {
    console.log("\n🚀 Starting Artillery load test...");
    console.log(`   Config  : load/load_test.yml`);
    console.log(`   Output  : reports/raw/load_results.json\n`);

    const cmd = `npx artillery run "${path.join(__dirname, "load_test.yml")}" --output "${RAW_OUTPUT}"`;

    const proc = exec(cmd, { cwd: path.join(__dirname, "..") });

    proc.stdout.on("data", (data) => process.stdout.write(data));
    proc.stderr.on("data", (data) => process.stderr.write(data));

    proc.on("close", (code) => {
      if (code === 0 || code === 1) {
        // Artillery exits 1 if thresholds breached — still process results
        console.log(`\n  Artillery finished (exit code ${code})`);
        resolve(code);
      } else {
        reject(new Error(`Artillery exited with code ${code}`));
      }
    });
  });
}

// ── Parse Artillery JSON output ──────────────────────────────
function processResults(exitCode) {
  console.log("\n📊 Processing load test results...");

  if (!fs.existsSync(RAW_OUTPUT)) {
    console.warn("  ⚠️  Raw results file not found — using empty placeholder");
    const placeholder = buildPlaceholder("Artillery output file not found");
    fs.writeFileSync(PROCESSED_OUTPUT, JSON.stringify(placeholder, null, 2));
    return placeholder;
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(RAW_OUTPUT, "utf-8"));
  } catch (e) {
    console.warn("  ⚠️  Could not parse Artillery JSON:", e.message);
    const placeholder = buildPlaceholder("Failed to parse Artillery output: " + e.message);
    fs.writeFileSync(PROCESSED_OUTPUT, JSON.stringify(placeholder, null, 2));
    return placeholder;
  }

  const agg = raw.aggregate || {};
  const counters = agg.counters || {};
  const summaries = agg.summaries || {};
  const rates = agg.rates || {};
  const http = agg.http || {};

  // Core metrics
  const totalRequests   = counters["vusers.created"]          || counters["http.requests"]         || 0;
  const totalCompleted  = counters["vusers.completed"]        || 0;
  const totalFailed     = counters["vusers.failed"]           || counters["http.request_rate"]      || 0;
  const httpCodes       = extractHttpCodes(counters);
  const errors2xx       = httpCodes["2xx"] || 0;
  const errors3xx       = httpCodes["3xx"] || 0;
  const errors4xx       = httpCodes["4xx"] || 0;
  const errors5xx       = httpCodes["5xx"] || 0;

  const responseTime    = summaries["http.response_time"] || summaries["response_time"] || {};
  const p50  = responseTime.p50  || responseTime.median || 0;
  const p95  = responseTime.p95  || 0;
  const p99  = responseTime.p99  || 0;
  const mean = responseTime.mean || 0;
  const min  = responseTime.min  || 0;
  const max  = responseTime.max  || 0;

  const reqPerSec = rates["http.request_rate"] || 0;
  const errorRate = totalRequests > 0
    ? (((errors4xx + errors5xx) / totalRequests) * 100).toFixed(2)
    : 0;

  // Thresholds
  const thresholds = [
    { name: "P99 response time < 3000ms",  value: p99,       threshold: 3000, unit: "ms",  pass: p99 <= 3000 },
    { name: "P95 response time < 2000ms",  value: p95,       threshold: 2000, unit: "ms",  pass: p95 <= 2000 },
    { name: "Mean response time < 1000ms", value: mean,      threshold: 1000, unit: "ms",  pass: mean <= 1000 },
    { name: "Error rate < 10%",            value: errorRate, threshold: 10,   unit: "%",   pass: parseFloat(errorRate) < 10 },
    { name: "5xx server errors = 0",       value: errors5xx, threshold: 0,    unit: "req", pass: errors5xx === 0 },
  ];

  // Per-phase summaries (intermediate results array)
  const phases = (raw.intermediate || []).map((phase, i) => ({
    phase: i + 1,
    name: phase._phase ? phase._phase.name : `Phase ${i + 1}`,
    requests: phase.counters ? (phase.counters["http.requests"] || 0) : 0,
    p50:  phase.summaries?.["http.response_time"]?.p50  || 0,
    p95:  phase.summaries?.["http.response_time"]?.p95  || 0,
    p99:  phase.summaries?.["http.response_time"]?.p99  || 0,
    errors5xx: Object.entries(phase.counters || {})
      .filter(([k]) => k.startsWith("http.codes.5"))
      .reduce((acc, [, v]) => acc + v, 0),
  }));

  // Build test cases (one per threshold + per phase)
  const testCases = [];

  thresholds.forEach((t) => {
    testCases.push({
      suite: "Load Test — Thresholds",
      name: t.name,
      status: t.pass ? "PASS" : "FAIL",
      value: `${t.value} ${t.unit}`,
      threshold: `${t.threshold} ${t.unit}`,
      detail: t.pass
        ? `Within threshold (${t.value} ${t.unit})`
        : `Exceeded threshold: ${t.value} ${t.unit} > ${t.threshold} ${t.unit}`,
    });
    log(t.pass ? "PASS" : "FAIL", t.name, `${t.value} ${t.unit} (limit: ${t.threshold} ${t.unit})`);
  });

  phases.forEach((p) => {
    const phasePass = p.errors5xx === 0 && p.p99 <= 3000;
    testCases.push({
      suite: "Load Test — Phases",
      name: `Phase ${p.phase}: ${p.name}`,
      status: phasePass ? "PASS" : "FAIL",
      value: `p99=${p.p99}ms, 5xx=${p.errors5xx}`,
      threshold: "p99<=3000ms, 5xx=0",
      detail: `Requests: ${p.requests}, p50: ${p.p50}ms, p95: ${p.p95}ms, p99: ${p.p99}ms`,
    });
    log(phasePass ? "PASS" : "FAIL", `Phase ${p.phase}: ${p.name}`, `p99=${p.p99}ms`);
  });

  const summary = {
    runAt: new Date().toISOString(),
    exitCode,
    totalRequests,
    totalCompleted,
    totalFailed,
    errorRate: `${errorRate}%`,
    httpCodes,
    responseTime: { min, mean, p50, p95, p99, max },
    requestsPerSecond: reqPerSec,
    thresholds,
    phases,
    testCases,
  };

  fs.writeFileSync(PROCESSED_OUTPUT, JSON.stringify(summary, null, 2));
  console.log(`\n  📁 Summary saved to reports/raw/load_summary.json`);
  return summary;
}

function extractHttpCodes(counters) {
  const codes = {};
  for (const [key, val] of Object.entries(counters)) {
    if (key.startsWith("http.codes.")) {
      const code = key.replace("http.codes.", "");
      const bucket = code[0] + "xx";
      codes[bucket] = (codes[bucket] || 0) + val;
      codes[code] = val;
    }
  }
  return codes;
}

function buildPlaceholder(reason) {
  return {
    runAt: new Date().toISOString(),
    exitCode: -1,
    error: reason,
    testCases: [{
      suite: "Load Test",
      name: "Artillery execution",
      status: "FAIL",
      value: "N/A",
      threshold: "N/A",
      detail: reason,
    }],
  };
}

// ── Summary printer ──────────────────────────────────────────
function printSummary(summary) {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Load Test Summary");
  console.log("═══════════════════════════════════════════════");
  if (summary.error) {
    console.log(`  ❌ ${summary.error}`);
    return;
  }
  console.log(`  Total Requests   : ${summary.totalRequests}`);
  console.log(`  Completed        : ${summary.totalCompleted}`);
  console.log(`  Error Rate       : ${summary.errorRate}`);
  console.log(`  Req/sec          : ${summary.requestsPerSecond}`);
  console.log("");
  console.log(`  Response Time:`);
  console.log(`    Min  : ${summary.responseTime.min}ms`);
  console.log(`    Mean : ${summary.responseTime.mean}ms`);
  console.log(`    P50  : ${summary.responseTime.p50}ms`);
  console.log(`    P95  : ${summary.responseTime.p95}ms`);
  console.log(`    P99  : ${summary.responseTime.p99}ms`);
  console.log(`    Max  : ${summary.responseTime.max}ms`);
  console.log("");
  console.log(`  HTTP Status Codes:`);
  for (const [code, count] of Object.entries(summary.httpCodes || {})) {
    if (!code.includes("xx")) console.log(`    ${code} : ${count}`);
  }

  const passed = summary.testCases.filter((t) => t.status === "PASS").length;
  const failed = summary.testCases.filter((t) => t.status === "FAIL").length;
  console.log(`\n  Threshold checks : ${passed} PASS | ${failed} FAIL`);
  console.log("═══════════════════════════════════════════════\n");
}

// ── Main ─────────────────────────────────────────────────────
async function runLoadTests() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PhishGuard — Load Test Suite (Artillery)");
  console.log("═══════════════════════════════════════════════");

  let exitCode = -1;
  try {
    exitCode = await runArtillery();
  } catch (err) {
    console.error("  Artillery failed to run:", err.message);
    console.log("  ℹ️  Tip: Make sure the Flask app is running on", config.BASE_URL);
    const summary = buildPlaceholder("Artillery failed: " + err.message);
    fs.writeFileSync(PROCESSED_OUTPUT, JSON.stringify(summary, null, 2));
    return summary;
  }

  const summary = processResults(exitCode);
  printSummary(summary);
  return summary;
}

if (require.main === module) {
  runLoadTests().catch((err) => {
    console.error("Fatal load test error:", err);
    process.exit(1);
  });
}

module.exports = { runLoadTests };
