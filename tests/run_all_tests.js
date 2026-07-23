// ============================================================
// PhishGuard — Master Test Runner
// Runs all 300 tests in sequence:
//   1. Unit Tests          (60)  — API & HTTP behavior
//   2. Validation Tests    (50)  — form fields & live feedback
//   3. Load Time Tests     (40)  — performance & timing
//   4. Vulnerability Tests (30)  — security checks
//   5. E2E Tests          (120)  — Selenium full browser
//   6. Artillery Load Tests       — concurrency & throughput
//   7. Excel Report Generation
// ============================================================

const axios = require("axios");
const fs    = require("fs");
const path  = require("path");
const config = require("./config");

const RAW_DIR = path.join(__dirname, "reports", "raw");
if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

const SUITE_START = Date.now();

// ── helpers ──────────────────────────────────────────────────
function banner(text) {
  const line = "═".repeat(58);
  console.log(`\n${line}\n  ${text}\n${line}`);
}
function step(icon, text) {
  console.log(`\n${icon}  ${text}`);
  console.log("─".repeat(58));
}
function elapsed(startMs) {
  return `${((Date.now() - startMs) / 1000).toFixed(1)}s`;
}

// ── server health check ───────────────────────────────────────
async function checkServer() {
  step("🌐", `Checking Flask server at ${config.BASE_URL} ...`);
  try {
    await axios.get(`${config.BASE_URL}/login`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    console.log("  ✅ Server is up");
    return true;
  } catch {
    console.error(`  ❌ Cannot reach ${config.BASE_URL}`);
    console.error("     Start Flask first:  python app.py");
    return false;
  }
}

// ── generic suite runner ──────────────────────────────────────
async function runSuite(label, modulePath, exportFn, emptyFallback) {
  step("🧪", `Running ${label}`);
  const start = Date.now();
  try {
    const mod     = require(modulePath);
    const results = await mod[exportFn]();
    const pass    = results.filter((r) => r.status === "PASS").length;
    const fail    = results.filter((r) => r.status === "FAIL").length;
    const skip    = results.filter((r) => r.status === "SKIP").length;
    console.log(`\n  ⏱  ${elapsed(start)}  |  ✅ ${pass} PASS  ❌ ${fail} FAIL  ⚠️  ${skip} SKIP`);
    return { label, pass, fail, skip, total: results.length, duration: elapsed(start), status: fail === 0 ? "PASS" : "PARTIAL" };
  } catch (err) {
    console.error(`  ❌ ${label} crashed: ${err.message}`);
    // write empty file so report generator never fails
    fs.writeFileSync(path.join(RAW_DIR, emptyFallback), JSON.stringify([], null, 2));
    return { label, pass: 0, fail: 0, skip: 0, total: 0, duration: elapsed(start), status: "ERROR", error: err.message };
  }
}

// ── Artillery load test runner ────────────────────────────────
async function runArtillery() {
  step("⚡", "Running Artillery Load Tests");
  const start = Date.now();
  try {
    const { runLoadTests } = require("./load/run_load_test");
    const summary  = await runLoadTests();
    const cases    = summary.testCases || [];
    const pass     = cases.filter((r) => r.status === "PASS").length;
    const fail     = cases.filter((r) => r.status === "FAIL").length;
    console.log(`\n  ⏱  ${elapsed(start)}  |  ✅ ${pass} PASS  ❌ ${fail} FAIL`);
    return { label: "Artillery Load", pass, fail, skip: 0, total: cases.length, duration: elapsed(start), status: fail === 0 ? "PASS" : "PARTIAL" };
  } catch (err) {
    console.error(`  ❌ Artillery crashed: ${err.message}`);
    const placeholder = { testCases: [], responseTime: {}, phases: [], error: err.message };
    fs.writeFileSync(path.join(RAW_DIR, "load_summary.json"), JSON.stringify(placeholder, null, 2));
    return { label: "Artillery Load", pass: 0, fail: 0, skip: 0, total: 0, duration: elapsed(start), status: "ERROR", error: err.message };
  }
}

// ── Excel report ──────────────────────────────────────────────
async function runReport() {
  step("📊", "Generating Excel Report");
  const start = Date.now();
  try {
    const { generateReport } = require("./reports/generate_report");
    const file = await generateReport();
    console.log(`  ⏱  ${elapsed(start)}`);
    return { status: "PASS", file, duration: elapsed(start) };
  } catch (err) {
    console.error(`  ❌ Report failed: ${err.message}`);
    return { status: "ERROR", error: err.message, duration: elapsed(start) };
  }
}

// ── final summary table ───────────────────────────────────────
function printSummary(suites, reportResult) {
  banner("PhishGuard — Complete Test Suite Summary");

  const colW = [24, 8, 6, 6, 6, 10];
  const row = (cells) =>
    "  " + cells.map((c, i) => String(c).padEnd(colW[i])).join("│ ");

  console.log(row(["Suite", "Status", "Pass", "Fail", "Skip", "Duration"]));
  console.log("  " + colW.map((w) => "─".repeat(w)).join("┼─"));

  let gPass = 0, gFail = 0, gSkip = 0, gTotal = 0;

  for (const s of suites) {
    const icon =
      s.status === "PASS"    ? "✅" :
      s.status === "PARTIAL" ? "⚠️ " :
      s.status === "ERROR"   ? "❌" : "⏭️ ";
    console.log(row([s.label, icon + s.status, s.pass, s.fail, s.skip, s.duration]));
    gPass  += s.pass  || 0;
    gFail  += s.fail  || 0;
    gSkip  += s.skip  || 0;
    gTotal += s.total || 0;
  }

  console.log("  " + colW.map((w) => "─".repeat(w)).join("┼─"));
  const rate = gTotal > 0 ? ((gPass / gTotal) * 100).toFixed(1) : "0.0";
  console.log(row(["TOTAL (" + gTotal + ")", "", gPass, gFail, gSkip, elapsed(SUITE_START)]));
  console.log(`\n  Pass Rate : ${rate}%`);
  console.log(`  Wall Time : ${elapsed(SUITE_START)}`);

  if (reportResult.status === "PASS") {
    console.log(`\n  📊 Report : ${reportResult.file}`);
  }

  console.log("");
  if (gFail === 0 && !suites.some((s) => s.status === "ERROR")) {
    console.log("  🎉 ALL TESTS PASSED");
  } else {
    console.log("  ⚠️  Some tests failed — open the Excel report for details.");
  }
  console.log("\n" + "═".repeat(58) + "\n");
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  banner("PhishGuard — Full Test Suite  (300 tests)");
  console.log(`  Target  : ${config.BASE_URL}`);
  console.log(`  Browser : ${config.BROWSER}  (headless: ${config.HEADLESS})`);
  console.log(`  Started : ${new Date().toLocaleString()}`);

  const serverUp = await checkServer();
  if (!serverUp) {
    console.error("\n  Aborting — Flask server is not running.\n");
    process.exit(1);
  }

  // run suites in order (cheapest first so E2E failures don't block unit results)
  const unitResult  = await runSuite(
    "Unit Tests (60)",       "./unit/unit_tests",            "runUnitTests",       "unit_results.json");
  const validResult = await runSuite(
    "Validation Tests (50)", "./validation/validation_tests", "runValidationTests", "validation_results.json");
  const ltResult    = await runSuite(
    "Load Time Tests (40)",  "./loadtime/loadtime_tests",    "runLoadTimeTests",   "loadtime_results.json");
  const vulnResult  = await runSuite(
    "Vuln Tests (30)",       "./vulnerability/vuln_tests",   "runVulnTests",       "vuln_results.json");
  const e2eResult   = await runSuite(
    "E2E Tests (120)",       "./selenium/e2e_tests",         "runE2E",             "e2e_results.json");
  const artResult   = await runArtillery();
  const reportResult = await runReport();

  printSummary(
    [unitResult, validResult, ltResult, vulnResult, e2eResult, artResult],
    reportResult
  );

  const anyError = [unitResult, validResult, ltResult, vulnResult, e2eResult, artResult]
    .some((s) => s.status === "ERROR");
  process.exit(anyError ? 1 : 0);
}

main().catch((err) => {
  console.error("\n  Fatal runner error:", err.message);
  process.exit(1);
});
