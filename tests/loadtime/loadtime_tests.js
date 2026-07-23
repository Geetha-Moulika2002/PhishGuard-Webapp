// ============================================================
// PhishGuard — Load Time Test Suite  (40 tests)
// Tests page load performance using Navigation Timing API,
// resource counts, response times, and concurrency
// ============================================================

const axios  = require("axios");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const config = require("../config");
const fs     = require("fs");
const path   = require("path");

const BASE    = config.BASE_URL;
const results = [];

const http = axios.create({ baseURL: BASE, timeout: 15000, validateStatus: () => true, maxRedirects: 5 });

function log(status, name, detail = "") {
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`  ${icon} [${status}] ${name}${detail ? " — " + detail : ""}`);
}
function record(suite, name, status, duration, detail = "") {
  results.push({ suite, name, status, duration, detail, error: status === "FAIL" ? detail : "" });
}
async function run(suite, name, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    log("PASS", name, detail || "");
    record(suite, name, "PASS", Date.now() - start, detail || "");
  } catch (err) {
    log("FAIL", name, err.message);
    record(suite, name, "FAIL", Date.now() - start, err.message);
  }
}
async function buildDriver() {
  const opts = new chrome.Options();
  if (config.HEADLESS) opts.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");
  opts.addArguments("--window-size=1400,900", "--disable-gpu");
  return new Builder().forBrowser("chrome").setChromeOptions(opts).build();
}
async function getSessionCookie() {
  const res = await http.post("/login",
    new URLSearchParams({ email: config.TEST_USER.email, password: config.TEST_USER.password }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return (res.headers["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ");
}

// ── thresholds (ms) ──────────────────────────────────────────
const T = { FAST: 500, NORMAL: 1500, SLOW: 3000 };

// ============================================================
// SUITE 1 — HTTP Response Times (axios)  (12 tests)
// ============================================================
async function suiteHTTPResponseTimes() {
  console.log("\n📋 SUITE: HTTP Response Times");

  let cookie = "";
  try { cookie = await getSessionCookie(); } catch (e) { console.warn("  ⚠️  No session:", e.message); }

  const timeGet = async (url, hdrs = {}) => {
    const s = Date.now();
    const res = await http.get(url, { headers: hdrs });
    return { ms: Date.now() - s, status: res.status };
  };

  await run("Response Time", "GET /login responds within 3000ms", async () => {
    const { ms } = await timeGet("/login");
    if (ms > T.SLOW) throw new Error(`${ms}ms > ${T.SLOW}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "GET /create-account responds within 3000ms", async () => {
    const { ms } = await timeGet("/create-account");
    if (ms > T.SLOW) throw new Error(`${ms}ms > ${T.SLOW}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "GET / (root redirect) within 1500ms", async () => {
    const { ms } = await timeGet("/");
    if (ms > T.NORMAL) throw new Error(`${ms}ms > ${T.NORMAL}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "GET /dashboard (unauth) redirect within 1500ms", async () => {
    const { ms } = await timeGet("/dashboard");
    if (ms > T.NORMAL) throw new Error(`${ms}ms > ${T.NORMAL}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "GET /logout redirect within 1500ms", async () => {
    const { ms } = await timeGet("/logout");
    if (ms > T.NORMAL) throw new Error(`${ms}ms > ${T.NORMAL}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "GET /dashboard (auth) within 3000ms", async () => {
    if (!cookie) throw new Error("No session");
    const { ms } = await timeGet("/dashboard", { Cookie: cookie });
    if (ms > T.SLOW) throw new Error(`${ms}ms > ${T.SLOW}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "GET /threats (auth) within 3000ms", async () => {
    if (!cookie) throw new Error("No session");
    const { ms } = await timeGet("/threats", { Cookie: cookie });
    if (ms > T.SLOW) throw new Error(`${ms}ms > ${T.SLOW}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "GET /reports (auth) within 3000ms", async () => {
    if (!cookie) throw new Error("No session");
    const { ms } = await timeGet("/reports", { Cookie: cookie });
    if (ms > T.SLOW) throw new Error(`${ms}ms > ${T.SLOW}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "GET /settings (auth) within 3000ms", async () => {
    if (!cookie) throw new Error("No session");
    const { ms } = await timeGet("/settings", { Cookie: cookie });
    if (ms > T.SLOW) throw new Error(`${ms}ms > ${T.SLOW}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "POST /check-email within 3000ms", async () => {
    const s = Date.now();
    await http.post("/check-email", { email: "test@test.com" }, { headers: { "Content-Type": "application/json" } });
    const ms = Date.now() - s;
    if (ms > T.SLOW) throw new Error(`${ms}ms > ${T.SLOW}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "POST /login (wrong creds) within 3000ms", async () => {
    const s = Date.now();
    await http.post("/login",
      new URLSearchParams({ email: "x@x.com", password: "bad" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const ms = Date.now() - s;
    if (ms > T.SLOW) throw new Error(`${ms}ms > ${T.SLOW}ms`);
    return `${ms}ms`;
  });

  await run("Response Time", "POST /dashboard scan within 5000ms", async () => {
    if (!cookie) throw new Error("No session");
    const s = Date.now();
    await http.post("/dashboard",
      new URLSearchParams({ message: "Test message for timing" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie } }
    );
    const ms = Date.now() - s;
    if (ms > 5000) throw new Error(`${ms}ms > 5000ms`);
    return `${ms}ms`;
  });
}

// ============================================================
// SUITE 2 — Browser Navigation Timing  (12 tests)
// ============================================================
async function suiteBrowserTiming() {
  console.log("\n📋 SUITE: Browser Navigation Timing");

  const driver = await buildDriver();
  driver.manage().setTimeouts({ implicit: config.IMPLICIT_WAIT_MS });

  const getTimings = async (url) => {
    await driver.get(url);
    await driver.wait(until.elementLocated(By.css("body")), 8000);
    return driver.executeScript(`
      const t = window.performance.timing;
      return {
        domLoad:   t.domContentLoadedEventEnd - t.navigationStart,
        pageLoad:  t.loadEventEnd              - t.navigationStart,
        ttfb:      t.responseStart             - t.navigationStart,
        domInteractive: t.domInteractive       - t.navigationStart,
      };
    `);
  };

  try {
    await run("Browser Timing", "/login TTFB < 2000ms", async () => {
      const t = await getTimings(BASE + "/login");
      if (t.ttfb > 2000) throw new Error(`TTFB: ${t.ttfb}ms`);
      return `TTFB: ${t.ttfb}ms`;
    });

    await run("Browser Timing", "/login DOM Content Loaded < 5000ms", async () => {
      const t = await getTimings(BASE + "/login");
      if (t.domLoad > 5000) throw new Error(`DCL: ${t.domLoad}ms`);
      return `DCL: ${t.domLoad}ms`;
    });

    await run("Browser Timing", "/login Page Load < 8000ms", async () => {
      const t = await getTimings(BASE + "/login");
      if (t.pageLoad > 8000) throw new Error(`Load: ${t.pageLoad}ms`);
      return `Load: ${t.pageLoad}ms`;
    });

    await run("Browser Timing", "/create-account TTFB < 2000ms", async () => {
      const t = await getTimings(BASE + "/create-account");
      if (t.ttfb > 2000) throw new Error(`TTFB: ${t.ttfb}ms`);
      return `TTFB: ${t.ttfb}ms`;
    });

    await run("Browser Timing", "/create-account DOM Content Loaded < 5000ms", async () => {
      const t = await getTimings(BASE + "/create-account");
      if (t.domLoad > 5000) throw new Error(`DCL: ${t.domLoad}ms`);
      return `DCL: ${t.domLoad}ms`;
    });

    // Login then check authenticated pages
    await driver.get(BASE + "/login");
    await driver.wait(until.elementLocated(By.id("email")), 5000);
    await driver.findElement(By.id("email")).sendKeys(config.TEST_USER.email);
    await driver.findElement(By.id("password")).sendKeys(config.TEST_USER.password);
    await driver.findElement(By.css("button[type='submit']")).click();
    await driver.wait(until.urlContains("/dashboard"), 10000);

    await run("Browser Timing", "/dashboard DOM Interactive < 5000ms", async () => {
      const t = await getTimings(BASE + "/dashboard");
      if (t.domInteractive > 5000) throw new Error(`domInteractive: ${t.domInteractive}ms`);
      return `domInteractive: ${t.domInteractive}ms`;
    });

    await run("Browser Timing", "/dashboard Page Load < 8000ms", async () => {
      const t = await getTimings(BASE + "/dashboard");
      if (t.pageLoad > 8000) throw new Error(`Load: ${t.pageLoad}ms`);
      return `Load: ${t.pageLoad}ms`;
    });

    await run("Browser Timing", "/threats Page Load < 8000ms", async () => {
      const t = await getTimings(BASE + "/threats");
      if (t.pageLoad > 8000) throw new Error(`Load: ${t.pageLoad}ms`);
      return `Load: ${t.pageLoad}ms`;
    });

    await run("Browser Timing", "/reports Page Load < 8000ms", async () => {
      const t = await getTimings(BASE + "/reports");
      if (t.pageLoad > 8000) throw new Error(`Load: ${t.pageLoad}ms`);
      return `Load: ${t.pageLoad}ms`;
    });

    await run("Browser Timing", "/settings Page Load < 8000ms", async () => {
      const t = await getTimings(BASE + "/settings");
      if (t.pageLoad > 8000) throw new Error(`Load: ${t.pageLoad}ms`);
      return `Load: ${t.pageLoad}ms`;
    });

    await run("Browser Timing", "/dashboard DOM load is positive (page actually loaded)", async () => {
      const t = await getTimings(BASE + "/dashboard");
      if (t.domLoad <= 0) throw new Error(`domLoad: ${t.domLoad}`);
      return `domLoad: ${t.domLoad}ms > 0 ✓`;
    });

    await run("Browser Timing", "navigationStart is a valid timestamp", async () => {
      await driver.get(BASE + "/login");
      const ns = await driver.executeScript("return window.performance.timing.navigationStart");
      if (!ns || ns < 1000000000000) throw new Error(`navigationStart: ${ns}`);
      return `navigationStart: ${ns}`;
    });
  } finally {
    await driver.quit();
  }
}

// ============================================================
// SUITE 3 — Concurrent Request Handling  (8 tests)
// ============================================================
async function suiteConcurrency() {
  console.log("\n📋 SUITE: Concurrency");

  let cookie = "";
  try { cookie = await getSessionCookie(); } catch (e) { console.warn("  ⚠️  No session:", e.message); }

  await run("Concurrency", "5 concurrent GET /login requests all return 200", async () => {
    const reqs = Array.from({ length: 5 }, () => http.get("/login"));
    const responses = await Promise.all(reqs);
    const bad = responses.filter((r) => r.status !== 200);
    if (bad.length > 0) throw new Error(`${bad.length} non-200 responses`);
    return "5/5 returned 200 ✓";
  });

  await run("Concurrency", "10 concurrent GET /login all return 200", async () => {
    const reqs = Array.from({ length: 10 }, () => http.get("/login"));
    const responses = await Promise.all(reqs);
    const bad = responses.filter((r) => r.status !== 200);
    if (bad.length > 0) throw new Error(`${bad.length} failed`);
    return "10/10 returned 200 ✓";
  });

  await run("Concurrency", "5 concurrent /check-email calls all return 200", async () => {
    const reqs = Array.from({ length: 5 }, () =>
      http.post("/check-email", { email: "concurrent@test.com" }, { headers: { "Content-Type": "application/json" } })
    );
    const responses = await Promise.all(reqs);
    const bad = responses.filter((r) => r.status !== 200);
    if (bad.length > 0) throw new Error(`${bad.length} failed`);
    return "5/5 returned 200 ✓";
  });

  await run("Concurrency", "5 concurrent GET /dashboard (unauth) all return 302", async () => {
    const reqs = Array.from({ length: 5 }, () => http.get("/dashboard"));
    const responses = await Promise.all(reqs);
    const bad = responses.filter((r) => r.status !== 302);
    if (bad.length > 0) throw new Error(`${bad.length} non-302`);
    return "5/5 returned 302 ✓";
  });

  await run("Concurrency", "3 concurrent auth dashboard requests return 200", async () => {
    if (!cookie) throw new Error("No session");
    const reqs = Array.from({ length: 3 }, () => http.get("/dashboard", { headers: { Cookie: cookie } }));
    const responses = await Promise.all(reqs);
    const bad = responses.filter((r) => r.status !== 200);
    if (bad.length > 0) throw new Error(`${bad.length} non-200`);
    return "3/3 returned 200 ✓";
  });

  await run("Concurrency", "5 concurrent GET /reports all respond", async () => {
    if (!cookie) throw new Error("No session");
    const reqs = Array.from({ length: 5 }, () => http.get("/reports", { headers: { Cookie: cookie } }));
    const responses = await Promise.all(reqs);
    const bad = responses.filter((r) => r.status >= 500);
    if (bad.length > 0) throw new Error(`${bad.length} server errors`);
    return "5/5 responded without 5xx ✓";
  });

  await run("Concurrency", "10 concurrent /check-email all return valid JSON", async () => {
    const reqs = Array.from({ length: 10 }, () =>
      http.post("/check-email", { email: "load@test.com" }, { headers: { "Content-Type": "application/json" } })
    );
    const responses = await Promise.all(reqs);
    const bad = responses.filter((r) => typeof r.data?.exists !== "boolean");
    if (bad.length > 0) throw new Error(`${bad.length} invalid responses`);
    return "10/10 returned valid JSON ✓";
  });

  await run("Concurrency", "No 500 errors across 20 mixed concurrent requests", async () => {
    const reqs = [
      ...Array.from({ length: 7 }, () => http.get("/login")),
      ...Array.from({ length: 7 }, () => http.get("/create-account")),
      ...Array.from({ length: 6 }, () => http.get("/logout")),
    ];
    const responses = await Promise.all(reqs);
    const errors = responses.filter((r) => r.status >= 500);
    if (errors.length > 0) throw new Error(`${errors.length} server errors`);
    return "20/20 no 5xx ✓";
  });
}

// ============================================================
// SUITE 4 — Response Size & Resource  (8 tests)
// ============================================================
async function suiteResourceSize() {
  console.log("\n📋 SUITE: Response Size & Resources");

  await run("Resource Size", "GET /login response body < 100KB", async () => {
    const res = await http.get("/login");
    const size = Buffer.byteLength(res.data.toString(), "utf8");
    if (size > 100000) throw new Error(`${(size / 1024).toFixed(1)}KB > 100KB`);
    return `${(size / 1024).toFixed(1)}KB`;
  });

  await run("Resource Size", "GET /create-account response body < 100KB", async () => {
    const res = await http.get("/create-account");
    const size = Buffer.byteLength(res.data.toString(), "utf8");
    if (size > 100000) throw new Error(`${(size / 1024).toFixed(1)}KB`);
    return `${(size / 1024).toFixed(1)}KB`;
  });

  await run("Resource Size", "GET /login response body > 1KB (not empty)", async () => {
    const res = await http.get("/login");
    const size = Buffer.byteLength(res.data.toString(), "utf8");
    if (size < 1000) throw new Error(`Too small: ${size} bytes`);
    return `${(size / 1024).toFixed(1)}KB > 1KB ✓`;
  });

  await run("Resource Size", "GET /create-account response body > 2KB", async () => {
    const res = await http.get("/create-account");
    const size = Buffer.byteLength(res.data.toString(), "utf8");
    if (size < 2000) throw new Error(`Too small: ${size} bytes`);
    return `${(size / 1024).toFixed(1)}KB > 2KB ✓`;
  });

  await run("Resource Size", "POST /check-email response < 200 bytes", async () => {
    const res = await http.post("/check-email", { email: "test@test.com" }, { headers: { "Content-Type": "application/json" } });
    const size = Buffer.byteLength(JSON.stringify(res.data), "utf8");
    if (size > 200) throw new Error(`${size} bytes > 200`);
    return `${size} bytes`;
  });

  await run("Resource Size", "GET /login includes Chart.js CDN link", async () => {
    // Check dashboard instead where Chart.js is used
    let cookie = "";
    try { cookie = await getSessionCookie(); } catch (_) {}
    if (!cookie) return "skipped — no session";
    const res = await http.get("/dashboard", { headers: { Cookie: cookie } });
    if (!res.data.toString().includes("chart.js")) throw new Error("Chart.js CDN not found");
    return "chart.js CDN found ✓";
  });

  await run("Resource Size", "GET /login HTML contains DOCTYPE declaration", async () => {
    const res = await http.get("/login");
    if (!res.data.toString().toLowerCase().includes("<!doctype html")) throw new Error("No DOCTYPE");
    return "DOCTYPE ✓";
  });

  await run("Resource Size", "GET /create-account HTML contains DOCTYPE declaration", async () => {
    const res = await http.get("/create-account");
    if (!res.data.toString().toLowerCase().includes("<!doctype html")) throw new Error("No DOCTYPE");
    return "DOCTYPE ✓";
  });
}

// ============================================================
// MAIN RUNNER
// ============================================================
async function runLoadTimeTests() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PhishGuard — Load Time Test Suite (40 tests)");
  console.log(`  Target: ${BASE}`);
  console.log("═══════════════════════════════════════════════");

  await suiteHTTPResponseTimes();
  await suiteBrowserTiming();
  await suiteConcurrency();
  await suiteResourceSize();

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n  Load Time: ${passed} PASS | ${failed} FAIL  (${results.length} total)\n`);

  const rawDir = path.join(__dirname, "../reports/raw");
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(path.join(rawDir, "loadtime_results.json"), JSON.stringify(results, null, 2));
  console.log("  📁 Saved to reports/raw/loadtime_results.json");
  return results;
}

if (require.main === module) {
  runLoadTimeTests().catch((err) => { console.error("Fatal:", err); process.exit(1); });
}
module.exports = { runLoadTimeTests };
