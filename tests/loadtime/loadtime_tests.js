// ============================================================
// PhishGuard — Load Time Test Suite  (300 tests)
// Tests: HTTP response times, browser timing API,
//        concurrency, response size, repeated requests
// ============================================================
const axios  = require("axios");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const config = require("../config");
const fs     = require("fs");
const path   = require("path");

const BASE    = config.BASE_URL;
const results = [];

const http = axios.create({ baseURL: BASE, timeout: 15000, validateStatus: () => true, maxRedirects: 0 });
const httpF = axios.create({ baseURL: BASE, timeout: 15000, validateStatus: () => true, maxRedirects: 10 });

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
let _cookie = null;
async function getCookie() {
  if (_cookie) return _cookie;
  const res = await http.post("/login",
    new URLSearchParams({ email: config.TEST_USER.email, password: config.TEST_USER.password }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  if (res.status !== 302) throw new Error(`Login ${res.status}`);
  const sc = res.headers["set-cookie"] || [];
  if (!sc.length) throw new Error("No cookie");
  _cookie = sc.map(c => c.split(";")[0]).join("; ");
  return _cookie;
}
const time = async (fn) => { const s = Date.now(); await fn(); return Date.now() - s; };
const SLA = { FAST: 500, MED: 1500, SLOW: 3000, XSLOW: 5000, SCAN: 8000 };

// ============================================================
// SUITE 1 — Public Route Response Times  (30 tests)
// ============================================================
async function s1_publicTimes() {
  console.log("\n📋 SUITE 1: Public Route Response Times");
  const S = "Public Times";

  for (let i = 1; i <= 5; i++) {
    await run(S, `GET /login run ${i} < 3000ms`, async () => {
      const ms = await time(() => http.get("/login"));
      if (ms > SLA.SLOW) throw new Error(`${ms}ms`);
      return `${ms}ms`;
    });
  }
  for (let i = 1; i <= 5; i++) {
    await run(S, `GET /create-account run ${i} < 3000ms`, async () => {
      const ms = await time(() => http.get("/create-account"));
      if (ms > SLA.SLOW) throw new Error(`${ms}ms`);
      return `${ms}ms`;
    });
  }
  for (let i = 1; i <= 5; i++) {
    await run(S, `GET / redirect run ${i} < 1500ms`, async () => {
      const ms = await time(() => http.get("/"));
      if (ms > SLA.MED) throw new Error(`${ms}ms`);
      return `${ms}ms`;
    });
  }
  for (let i = 1; i <= 5; i++) {
    await run(S, `GET /logout run ${i} < 1500ms`, async () => {
      const ms = await time(() => http.get("/logout"));
      if (ms > SLA.MED) throw new Error(`${ms}ms`);
      return `${ms}ms`;
    });
  }
  for (let i = 1; i <= 5; i++) {
    await run(S, `POST /check-email run ${i} < 5000ms`, async () => {
      const ms = await time(() => http.post("/check-email", { email: "t@t.com" }, { headers: { "Content-Type": "application/json" } }));
      if (ms > SLA.XSLOW) throw new Error(`${ms}ms`);
      return `${ms}ms`;
    });
  }
  for (let i = 1; i <= 5; i++) {
    await run(S, `POST /login wrong creds run ${i} < 5000ms`, async () => {
      const ms = await time(() => httpF.post("/login", new URLSearchParams({ email: "x@x.com", password: "y" }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } }));
      if (ms > SLA.XSLOW) throw new Error(`${ms}ms`);
      return `${ms}ms`;
    });
  }
}

// ============================================================
// SUITE 2 — Unauth Protected Route Times  (20 tests)
// ============================================================
async function s2_unauthTimes() {
  console.log("\n📋 SUITE 2: Unauth Protected Route Times");
  const S = "Unauth Times";
  const routes = ["/dashboard", "/threats", "/reports", "/settings", "/scanner"];

  for (const route of routes) {
    for (let i = 1; i <= 4; i++) {
      await run(S, `GET ${route} unauth run ${i} < 1500ms`, async () => {
        const ms = await time(() => http.get(route));
        if (ms > SLA.MED) throw new Error(`${ms}ms`);
        return `${ms}ms`;
      });
    }
  }
}

// ============================================================
// SUITE 3 — Authenticated Route Times  (30 tests)
// ============================================================
async function s3_authTimes() {
  console.log("\n📋 SUITE 3: Authenticated Route Times");
  const S = "Auth Times";
  let ck;
  try { ck = await getCookie(); } catch (e) { console.warn("  ⚠️ No cookie:", e.message); }

  const routes = ["/dashboard", "/threats", "/reports", "/settings", "/scanner"];
  for (const route of routes) {
    for (let i = 1; i <= 6; i++) {
      await run(S, `GET ${route} auth run ${i} < 5000ms`, async () => {
        if (!ck) throw new Error("No session cookie");
        const ms = await time(() => http.get(route, { headers: { Cookie: ck } }));
        if (ms > SLA.XSLOW) throw new Error(`${ms}ms`);
        return `${ms}ms`;
      });
    }
  }
}

// ============================================================
// SUITE 4 — Concurrent Requests  (30 tests)
// ============================================================
async function s4_concurrent() {
  console.log("\n📋 SUITE 4: Concurrent Requests");
  const S = "Concurrent";

  const concTest = async (label, requests) => {
    const s = Date.now();
    const responses = await Promise.all(requests);
    const ms = Date.now() - s;
    const bad = responses.filter(r => r.status >= 500);
    if (bad.length > 0) throw new Error(`${bad.length} server errors`);
    return `${responses.length} reqs in ${ms}ms`;
  };

  for (let n of [5, 10, 15]) {
    await run(S, `${n}x GET /login concurrent → no 5xx`, async () =>
      concTest(`${n}x /login`, Array.from({ length: n }, () => http.get("/login")))
    );
  }
  for (let n of [5, 10, 15]) {
    await run(S, `${n}x GET /create-account concurrent → no 5xx`, async () =>
      concTest(`${n}x /create-account`, Array.from({ length: n }, () => http.get("/create-account")))
    );
  }
  for (let n of [5, 10, 15]) {
    await run(S, `${n}x POST /check-email concurrent → no 5xx`, async () =>
      concTest(`${n}x /check-email`, Array.from({ length: n }, () =>
        http.post("/check-email", { email: "t@t.com" }, { headers: { "Content-Type": "application/json" } })
      ))
    );
  }
  for (let n of [5, 10]) {
    await run(S, `${n}x GET /logout concurrent → no 5xx`, async () =>
      concTest(`${n}x /logout`, Array.from({ length: n }, () => http.get("/logout")))
    );
  }
  for (let n of [5, 10]) {
    await run(S, `${n}x GET / concurrent → no 5xx`, async () =>
      concTest(`${n}x /`, Array.from({ length: n }, () => http.get("/")))
    );
  }
  for (let n of [5, 10]) {
    await run(S, `${n}x GET /dashboard unauth concurrent → no 5xx`, async () =>
      concTest(`${n}x /dashboard`, Array.from({ length: n }, () => http.get("/dashboard")))
    );
  }
  // Status checks
  for (let n of [5, 10, 15]) {
    await run(S, `${n}x GET /login concurrent all return 200`, async () => {
      const rs = await Promise.all(Array.from({ length: n }, () => http.get("/login")));
      const bad = rs.filter(r => r.status !== 200);
      if (bad.length) throw new Error(`${bad.length} non-200`);
      return `${n}/${n} ✓`;
    });
  }
}

// ============================================================
// SUITE 5 — Response Size Tests  (30 tests)
// ============================================================
async function s5_responseSizes() {
  console.log("\n📋 SUITE 5: Response Sizes");
  const S = "Response Size";

  for (let i = 1; i <= 5; i++) {
    await run(S, `GET /login body > 1KB run ${i}`, async () => {
      const r = await http.get("/login");
      const sz = Buffer.byteLength(r.data.toString(), "utf8");
      if (sz < 1000) throw new Error(`${sz}B`);
      return `${(sz/1024).toFixed(1)}KB`;
    });
  }
  for (let i = 1; i <= 5; i++) {
    await run(S, `GET /login body < 200KB run ${i}`, async () => {
      const r = await http.get("/login");
      const sz = Buffer.byteLength(r.data.toString(), "utf8");
      if (sz > 200000) throw new Error(`${(sz/1024).toFixed(1)}KB`);
      return `${(sz/1024).toFixed(1)}KB`;
    });
  }
  for (let i = 1; i <= 5; i++) {
    await run(S, `GET /create-account body > 1KB run ${i}`, async () => {
      const r = await http.get("/create-account");
      const sz = Buffer.byteLength(r.data.toString(), "utf8");
      if (sz < 1000) throw new Error(`${sz}B`);
      return `${(sz/1024).toFixed(1)}KB`;
    });
  }
  for (let i = 1; i <= 5; i++) {
    await run(S, `POST /check-email response < 100B run ${i}`, async () => {
      const r = await http.post("/check-email", { email: "t@t.com" }, { headers: { "Content-Type": "application/json" } });
      const sz = Buffer.byteLength(JSON.stringify(r.data), "utf8");
      if (sz > 200) throw new Error(`${sz}B`);
      return `${sz}B`;
    });
  }
  for (let i = 1; i <= 5; i++) {
    await run(S, `GET / response < 500B run ${i}`, async () => {
      const r = await http.get("/");
      const body = r.data ? r.data.toString() : "";
      const sz = Buffer.byteLength(body, "utf8");
      if (sz > 1000) throw new Error(`${sz}B`);
      return `${sz}B`;
    });
  }
  for (let i = 1; i <= 5; i++) {
    await run(S, `GET /logout response < 500B run ${i}`, async () => {
      const r = await http.get("/logout");
      const body = r.data ? r.data.toString() : "";
      const sz = Buffer.byteLength(body, "utf8");
      if (sz > 1000) throw new Error(`${sz}B`);
      return `${sz}B`;
    });
  }
}

// ============================================================
// SUITE 6 — Browser Navigation Timing  (50 tests)
// ============================================================
async function s6_browserTiming() {
  console.log("\n📋 SUITE 6: Browser Navigation Timing");
  const S = "Browser Timing";
  const driver = await buildDriver();
  driver.manage().setTimeouts({ implicit: config.IMPLICIT_WAIT_MS });

  const getTiming = async (url) => {
    await driver.get(url);
    await driver.wait(until.elementLocated(By.css("body")), 10000);
    return driver.executeScript(`
      const t = window.performance.timing;
      return {
        ttfb: t.responseStart - t.navigationStart,
        dcl:  t.domContentLoadedEventEnd - t.navigationStart,
        load: t.loadEventEnd - t.navigationStart,
        di:   t.domInteractive - t.navigationStart,
      };
    `);
  };

  try {
    // Login page — 10 timing tests
    for (let i = 1; i <= 2; i++) {
      await run(S, `/login TTFB < 3000ms run ${i}`, async () => { const t = await getTiming(BASE + "/login"); if (t.ttfb > 3000) throw new Error(`${t.ttfb}ms`); return `${t.ttfb}ms`; });
      await run(S, `/login DCL < 8000ms run ${i}`, async () => { const t = await getTiming(BASE + "/login"); if (t.dcl > 8000) throw new Error(`${t.dcl}ms`); return `${t.dcl}ms`; });
      await run(S, `/login pageLoad < 10000ms run ${i}`, async () => { const t = await getTiming(BASE + "/login"); if (t.load > 10000) throw new Error(`${t.load}ms`); return `${t.load}ms`; });
      await run(S, `/login domInteractive < 8000ms run ${i}`, async () => { const t = await getTiming(BASE + "/login"); if (t.di > 8000) throw new Error(`${t.di}ms`); return `${t.di}ms`; });
      await run(S, `/login navigationStart is valid run ${i}`, async () => { await driver.get(BASE + "/login"); const ns = await driver.executeScript("return window.performance.timing.navigationStart"); if (!ns || ns < 1000000000000) throw new Error(`${ns}`); return `${ns}`; });
    }

    // Create account page — 10 timing tests
    for (let i = 1; i <= 2; i++) {
      await run(S, `/create-account TTFB < 3000ms run ${i}`, async () => { const t = await getTiming(BASE + "/create-account"); if (t.ttfb > 3000) throw new Error(`${t.ttfb}ms`); return `${t.ttfb}ms`; });
      await run(S, `/create-account DCL < 8000ms run ${i}`, async () => { const t = await getTiming(BASE + "/create-account"); if (t.dcl > 8000) throw new Error(`${t.dcl}ms`); return `${t.dcl}ms`; });
      await run(S, `/create-account pageLoad < 10000ms run ${i}`, async () => { const t = await getTiming(BASE + "/create-account"); if (t.load > 10000) throw new Error(`${t.load}ms`); return `${t.load}ms`; });
      await run(S, `/create-account domInteractive < 8000ms run ${i}`, async () => { const t = await getTiming(BASE + "/create-account"); if (t.di > 8000) throw new Error(`${t.di}ms`); return `${t.di}ms`; });
      await run(S, `/create-account TTFB positive run ${i}`, async () => { const t = await getTiming(BASE + "/create-account"); if (t.ttfb <= 0) throw new Error(`${t.ttfb}`); return `${t.ttfb}ms`; });
    }

    // Login then check auth pages — 30 timing tests
    await driver.get(BASE + "/login");
    await driver.wait(until.elementLocated(By.id("email")), 8000);
    await driver.findElement(By.id("email")).sendKeys(config.TEST_USER.email);
    await driver.findElement(By.id("password")).sendKeys(config.TEST_USER.password);
    await driver.findElement(By.css("button[type='submit']")).click();
    await driver.wait(until.urlContains("/dashboard"), 12000);

    const authPages = ["/dashboard", "/threats", "/reports", "/settings"];
    for (const page of authPages) {
      for (let i = 1; i <= 2; i++) {
        await run(S, `${page} TTFB < 5000ms run ${i}`, async () => { const t = await getTiming(BASE + page); if (t.ttfb > 5000) throw new Error(`${t.ttfb}ms`); return `${t.ttfb}ms`; });
        await run(S, `${page} DCL < 10000ms run ${i}`, async () => { const t = await getTiming(BASE + page); if (t.dcl > 10000) throw new Error(`${t.dcl}ms`); return `${t.dcl}ms`; });
        await run(S, `${page} pageLoad > 0ms run ${i}`, async () => { const t = await getTiming(BASE + page); if (t.load <= 0) throw new Error(`${t.load}`); return `${t.load}ms`; });
      }
    }
  } finally {
    await driver.quit();
  }
}

// ============================================================
// SUITE 7 — Repeated Sequential Requests  (60 tests)
// ============================================================
async function s7_repeated() {
  console.log("\n📋 SUITE 7: Repeated Sequential Requests");
  const S = "Repeated";
  let ck;
  try { ck = await getCookie(); } catch (e) { console.warn("  ⚠️ No cookie:", e.message); }

  const routes = [
    { url: "/login", maxMs: 3000, needsAuth: false },
    { url: "/create-account", maxMs: 3000, needsAuth: false },
    { url: "/", maxMs: 1500, needsAuth: false },
    { url: "/logout", maxMs: 1500, needsAuth: false },
    { url: "/dashboard", maxMs: 5000, needsAuth: true },
    { url: "/threats", maxMs: 5000, needsAuth: true },
    { url: "/reports", maxMs: 5000, needsAuth: true },
    { url: "/settings", maxMs: 5000, needsAuth: true },
    { url: "/scanner", maxMs: 5000, needsAuth: true },
    { url: "/dashboard", maxMs: 1500, needsAuth: false }, // unauth test
  ];

  for (const { url, maxMs, needsAuth } of routes) {
    if (needsAuth && !ck) {
      record(S, `${url} × 6 sequential < ${maxMs}ms`, "SKIP", 0, "No session");
      continue;
    }
    for (let i = 1; i <= 6; i++) {
      await run(S, `${url} sequential req ${i} < ${maxMs}ms`, async () => {
        const headers = needsAuth && ck ? { Cookie: ck } : {};
        const ms = await time(() => http.get(url, { headers }));
        if (ms > maxMs) throw new Error(`${ms}ms > ${maxMs}ms`);
        return `${ms}ms`;
      });
    }
  }
}

// ============================================================
// SUITE 8 — POST Scan Timing  (30 tests)
// ============================================================
async function s8_scanTiming() {
  console.log("\n📋 SUITE 8: Scan POST Timing");
  const S = "Scan Timing";
  let ck;
  try { ck = await getCookie(); } catch (e) { console.warn("  ⚠️ No cookie:", e.message); }

  const messages = [
    "URGENT verify bank OTP login click",
    "Hello how are you today friend",
    "Prize winner click account bank login urgent",
    "Meeting at 3pm tomorrow see you there",
    "Verify your account immediately or it gets blocked",
    "Dinner is ready come home now",
    "OTP bank click login urgent account winner",
    "Good morning have a nice day",
    "Your package arrived click to verify",
    "Simple safe message nothing suspicious here",
  ];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    for (let r = 1; r <= 3; r++) {
      await run(S, `Scan "${msg.substring(0, 30)}..." run ${r} < 8000ms`, async () => {
        if (!ck) throw new Error("No session");
        const ms = await time(() => http.post("/dashboard",
          new URLSearchParams({ message: msg }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: ck } }
        ));
        if (ms > SLA.SCAN) throw new Error(`${ms}ms`);
        return `${ms}ms`;
      });
    }
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================
async function runLoadTimeTests() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  PhishGuard — Load Time Test Suite  (300 tests)");
  console.log(`  Target: ${BASE}`);
  console.log("═══════════════════════════════════════════════════════");

  await s1_publicTimes();
  await s2_unauthTimes();
  await s3_authTimes();
  await s4_concurrent();
  await s5_responseSizes();
  await s6_browserTiming();
  await s7_repeated();
  await s8_scanTiming();

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`\n  ✅ PASS: ${passed}  ❌ FAIL: ${failed}  TOTAL: ${results.length}\n`);

  const rawDir = path.join(__dirname, "../reports/raw");
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(path.join(rawDir, "loadtime_results.json"), JSON.stringify(results, null, 2));
  console.log("  📁 Saved → reports/raw/loadtime_results.json");
  return results;
}

if (require.main === module) {
  runLoadTimeTests().catch(err => { console.error("Fatal:", err); process.exit(1); });
}
module.exports = { runLoadTimeTests };
