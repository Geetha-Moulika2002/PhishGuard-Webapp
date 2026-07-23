// ============================================================
// PhishGuard — Unit Test Suite
// Tests HTTP responses, API endpoints, route behavior,
// status codes, headers, JSON contracts, redirect logic
// Uses axios only — no browser needed
// ============================================================

const axios  = require("axios");
const config = require("../config");
const fs     = require("fs");
const path   = require("path");

const BASE    = config.BASE_URL;
const results = [];

// ── two axios instances ───────────────────────────────────────
// http      : never follows redirects  (for testing 302s)
// httpFollow: follows redirects        (for getting session cookies)
const http = axios.create({
  baseURL: BASE,
  timeout: 10000,
  validateStatus: () => true,
  maxRedirects: 0,
});

const httpFollow = axios.create({
  baseURL: BASE,
  timeout: 10000,
  validateStatus: () => true,
  maxRedirects: 10,
});

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

// ── session cookie helper ─────────────────────────────────────
// Uses http (maxRedirects:0) so we capture the Set-Cookie on the 302
let _cachedCookie = null;
async function getSessionCookie() {
  if (_cachedCookie) return _cachedCookie;

  const res = await http.post(
    "/login",
    new URLSearchParams({
      email:    config.TEST_USER.email,
      password: config.TEST_USER.password,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (res.status !== 302) {
    throw new Error(
      `Login returned HTTP ${res.status} (expected 302). ` +
      `Verify TEST_USER.email="${config.TEST_USER.email}" and password are correct in config.js`
    );
  }

  const setCookie = res.headers["set-cookie"] || [];
  if (setCookie.length === 0) {
    throw new Error("Login returned 302 but no Set-Cookie header — check Flask secret_key");
  }

  _cachedCookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  return _cachedCookie;
}

// ============================================================
// SUITE 1 — Route Availability & Status Codes  (12 tests)
// ============================================================
async function suiteRoutes() {
  console.log("\n📋 SUITE 1: Route Availability & Status Codes");

  await run("Routes", "GET /login returns HTTP 200", async () => {
    const res = await http.get("/login");
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Routes", "GET /create-account returns HTTP 200", async () => {
    const res = await http.get("/create-account");
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Routes", "GET / returns HTTP 302", async () => {
    const res = await http.get("/");
    if (res.status !== 302) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Routes", "GET / Location header points to /login", async () => {
    const res = await http.get("/");
    const loc = res.headers["location"] || "";
    if (!loc.includes("/login")) throw new Error(`Location: ${loc}`);
    return `Location: ${loc}`;
  });

  await run("Routes", "GET /dashboard without auth returns 302", async () => {
    const res = await http.get("/dashboard");
    if (res.status !== 302) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Routes", "GET /threats without auth returns 302", async () => {
    const res = await http.get("/threats");
    if (res.status !== 302) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Routes", "GET /reports without auth returns 302", async () => {
    const res = await http.get("/reports");
    if (res.status !== 302) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Routes", "GET /settings without auth returns 302", async () => {
    const res = await http.get("/settings");
    if (res.status !== 302) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Routes", "GET /scanner without auth returns 302", async () => {
    const res = await http.get("/scanner");
    if (res.status !== 302) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Routes", "GET /logout returns 302", async () => {
    const res = await http.get("/logout");
    if (res.status !== 302) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Routes", "GET /logout Location header points to /login", async () => {
    const res = await http.get("/logout");
    const loc = res.headers["location"] || "";
    if (!loc.includes("/login")) throw new Error(`Location: ${loc}`);
    return `Location: ${loc}`;
  });

  await run("Routes", "GET unknown route returns 404 or 302", async () => {
    const res = await http.get("/does-not-exist-xyz-abc");
    if (res.status !== 404 && res.status !== 302) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });
}

// ============================================================
// SUITE 2 — HTTP Headers & Content  (10 tests)
// ============================================================
async function suiteHeaders() {
  console.log("\n📋 SUITE 2: HTTP Headers & Content");

  await run("Headers", "GET /login Content-Type is text/html", async () => {
    const res = await http.get("/login");
    const ct  = res.headers["content-type"] || "";
    if (!ct.includes("text/html")) throw new Error(`Content-Type: ${ct}`);
    return ct;
  });

  await run("Headers", "GET /create-account Content-Type is text/html", async () => {
    const res = await http.get("/create-account");
    const ct  = res.headers["content-type"] || "";
    if (!ct.includes("text/html")) throw new Error(`Content-Type: ${ct}`);
    return ct;
  });

  await run("Headers", "POST /check-email returns Content-Type application/json", async () => {
    const res = await http.post("/check-email",
      { email: "test@test.com" },
      { headers: { "Content-Type": "application/json" } }
    );
    const ct = res.headers["content-type"] || "";
    if (!ct.includes("application/json")) throw new Error(`Content-Type: ${ct}`);
    return ct;
  });

  await run("Headers", "GET /login response body > 1KB", async () => {
    const res  = await http.get("/login");
    const size = Buffer.byteLength(res.data.toString(), "utf8");
    if (size < 1000) throw new Error(`Body: ${size} bytes`);
    return `${(size / 1024).toFixed(1)}KB`;
  });

  await run("Headers", "GET /create-account body contains <form tag", async () => {
    const res = await http.get("/create-account");
    if (!res.data.toString().includes("<form")) throw new Error("No <form tag");
    return "form tag found";
  });

  await run("Headers", "GET /login body contains PhishGuard", async () => {
    const res = await http.get("/login");
    if (!res.data.toString().includes("PhishGuard")) throw new Error("PhishGuard not found");
    return "PhishGuard text found";
  });

  await run("Headers", "GET /login body contains id=\"email\"", async () => {
    const res = await http.get("/login");
    if (!res.data.toString().includes('id="email"')) throw new Error("email input missing");
    return "email input found";
  });

  await run("Headers", "GET /login body contains id=\"password\"", async () => {
    const res = await http.get("/login");
    if (!res.data.toString().includes('id="password"')) throw new Error("password input missing");
    return "password input found";
  });

  await run("Headers", "GET /login HTML has <!DOCTYPE html>", async () => {
    const res  = await http.get("/login");
    const body = res.data.toString().toLowerCase();
    if (!body.includes("<!doctype html")) throw new Error("No DOCTYPE");
    return "DOCTYPE found";
  });

  await run("Headers", "GET /create-account HTML has <!DOCTYPE html>", async () => {
    const res  = await http.get("/create-account");
    const body = res.data.toString().toLowerCase();
    if (!body.includes("<!doctype html")) throw new Error("No DOCTYPE");
    return "DOCTYPE found";
  });
}

// ============================================================
// SUITE 3 — /check-email API Contract  (10 tests)
// ============================================================
async function suiteCheckEmail() {
  console.log("\n📋 SUITE 3: /check-email API");

  await run("Check-Email API", "POST returns HTTP 200", async () => {
    const res = await http.post("/check-email",
      { email: "anyone@test.com" },
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Check-Email API", "Response is valid JSON object", async () => {
    const res = await http.post("/check-email",
      { email: "test@test.com" },
      { headers: { "Content-Type": "application/json" } }
    );
    if (typeof res.data !== "object") throw new Error(`Not object: ${typeof res.data}`);
    return "valid JSON object";
  });

  await run("Check-Email API", "Response has exists boolean field", async () => {
    const res = await http.post("/check-email",
      { email: "test@test.com" },
      { headers: { "Content-Type": "application/json" } }
    );
    if (typeof res.data.exists !== "boolean") throw new Error(`exists type: ${typeof res.data.exists}`);
    return `exists: ${res.data.exists}`;
  });

  await run("Check-Email API", "Non-existent email returns exists:false", async () => {
    const res = await http.post("/check-email",
      { email: "definitely_nobody_xyz_2099@fake.com" },
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.data.exists !== false) throw new Error(`exists: ${res.data.exists}`);
    return "exists:false ✓";
  });

  await run("Check-Email API", "Registered email returns exists:true", async () => {
    const res = await http.post("/check-email",
      { email: config.TEST_USER.email },
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.data.exists !== true) throw new Error(`exists:${res.data.exists} — verify TEST_USER.email in config.js`);
    return "exists:true ✓";
  });

  await run("Check-Email API", "Empty email returns exists:false", async () => {
    const res = await http.post("/check-email",
      { email: "" },
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.data.exists !== false) throw new Error(`exists: ${res.data.exists}`);
    return "exists:false for empty ✓";
  });

  await run("Check-Email API", "Missing email field returns exists:false", async () => {
    const res = await http.post("/check-email",
      {},
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.data.exists !== false) throw new Error(`exists: ${res.data.exists}`);
    return "exists:false for missing ✓";
  });

  await run("Check-Email API", "Accepts form-encoded body", async () => {
    const res = await http.post("/check-email",
      new URLSearchParams({ email: "test@test.com" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Check-Email API", "Uppercase email is handled without 500", async () => {
    const res = await http.post("/check-email",
      { email: config.TEST_USER.email.toUpperCase() },
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    return `HTTP ${res.status}, exists:${res.data.exists}`;
  });

  await run("Check-Email API", "Does not return 500 for any input", async () => {
    const res = await http.post("/check-email",
      { email: "loadtest@example.com" },
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    return `HTTP ${res.status}`;
  });
}

// ============================================================
// SUITE 4 — Login API Behavior  (10 tests)
// ============================================================
async function suiteLoginAPI() {
  console.log("\n📋 SUITE 4: Login API");

  await run("Login API", "Wrong creds POST returns HTTP 200", async () => {
    const res = await httpFollow.post("/login",
      new URLSearchParams({ email: "bad@bad.com", password: "wrong" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Login API", "Wrong creds response contains login form", async () => {
    const res = await httpFollow.post("/login",
      new URLSearchParams({ email: "bad@bad.com", password: "wrong" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    if (!res.data.toString().includes('id="email"')) throw new Error("Login form missing");
    return "login form present";
  });

  await run("Login API", "Wrong creds does not echo password back", async () => {
    const res = await httpFollow.post("/login",
      new URLSearchParams({ email: "bad@bad.com", password: "supersecret_xyz_999" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    if (res.data.toString().includes("supersecret_xyz_999")) throw new Error("Password reflected!");
    return "password not reflected ✓";
  });

  await run("Login API", "Valid login POST returns 302", async () => {
    const res = await http.post("/login",
      new URLSearchParams({ email: config.TEST_USER.email, password: config.TEST_USER.password }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    if (res.status !== 302) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Login API", "Valid login 302 Location is /dashboard", async () => {
    const res = await http.post("/login",
      new URLSearchParams({ email: config.TEST_USER.email, password: config.TEST_USER.password }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const loc = res.headers["location"] || "";
    if (!loc.includes("/dashboard")) throw new Error(`Location: ${loc}`);
    return `Location: ${loc}`;
  });

  await run("Login API", "Valid login sets session cookie", async () => {
    const res = await http.post("/login",
      new URLSearchParams({ email: config.TEST_USER.email, password: config.TEST_USER.password }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const cookie = (res.headers["set-cookie"] || []).join(" ");
    if (!cookie.includes("session")) throw new Error("No session cookie");
    return "session cookie set ✓";
  });

  await run("Login API", "Empty credentials POST returns 200 not 500", async () => {
    const res = await httpFollow.post("/login",
      new URLSearchParams({ email: "", password: "" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Login API", "GET /login body has id=loginForm", async () => {
    const res = await http.get("/login");
    if (!res.data.toString().includes("loginForm")) throw new Error("loginForm not found");
    return "loginForm found";
  });

  await run("Login API", "GET /login body has id=createAccountLink", async () => {
    const res = await http.get("/login");
    if (!res.data.toString().includes("createAccountLink")) throw new Error("link not found");
    return "createAccountLink found";
  });

  await run("Login API", "GET /login body has remember checkbox", async () => {
    const res = await http.get("/login");
    if (!res.data.toString().includes('id="remember"')) throw new Error("remember not found");
    return "remember checkbox found";
  });
}

// ============================================================
// SUITE 5 — Authenticated Routes  (10 tests)
// ============================================================
async function suiteAuthenticatedRoutes() {
  console.log("\n📋 SUITE 5: Authenticated Routes");

  // Get session cookie ONCE at the start of the suite
  let cookie;
  try {
    cookie = await getSessionCookie();
    console.log("  🔑 Session cookie obtained successfully");
  } catch (err) {
    console.error(`  ❌ Cannot get session cookie: ${err.message}`);
    // Record all 10 tests as FAIL with a clear message
    const names = [
      "GET /dashboard with auth returns 200",
      "GET /threats with auth returns 200",
      "GET /reports with auth returns 200",
      "GET /settings with auth returns 200",
      "GET /scanner with auth returns 200",
      "/dashboard body contains stats-container",
      "/threats body contains history-table",
      "/reports body contains Security Reports",
      "/settings body contains Settings",
      "POST /dashboard returns 200",
    ];
    names.forEach((n) => {
      log("FAIL", n, err.message);
      record("Authenticated Routes", n, "FAIL", 0, err.message);
    });
    return;
  }

  await run("Authenticated Routes", "GET /dashboard with auth returns 200", async () => {
    const res = await http.get("/dashboard", { headers: { Cookie: cookie } });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Authenticated Routes", "GET /threats with auth returns 200", async () => {
    const res = await http.get("/threats", { headers: { Cookie: cookie } });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Authenticated Routes", "GET /reports with auth returns 200", async () => {
    const res = await http.get("/reports", { headers: { Cookie: cookie } });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Authenticated Routes", "GET /settings with auth returns 200", async () => {
    const res = await http.get("/settings", { headers: { Cookie: cookie } });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Authenticated Routes", "GET /scanner with auth returns 200", async () => {
    const res = await http.get("/scanner", { headers: { Cookie: cookie } });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Authenticated Routes", "/dashboard body contains stats-container", async () => {
    const res = await http.get("/dashboard", { headers: { Cookie: cookie } });
    if (!res.data.toString().includes("stats-container")) throw new Error("stats-container missing");
    return "stats-container found";
  });

  await run("Authenticated Routes", "/threats body contains history-table", async () => {
    const res = await http.get("/threats", { headers: { Cookie: cookie } });
    if (!res.data.toString().includes("history-table")) throw new Error("history-table missing");
    return "history-table found";
  });

  await run("Authenticated Routes", "/reports body contains Security Reports", async () => {
    const res = await http.get("/reports", { headers: { Cookie: cookie } });
    if (!res.data.toString().includes("Security Reports")) throw new Error("heading missing");
    return "Security Reports found";
  });

  await run("Authenticated Routes", "/settings body contains Settings", async () => {
    const res = await http.get("/settings", { headers: { Cookie: cookie } });
    if (!res.data.toString().includes("Settings")) throw new Error("Settings heading missing");
    return "Settings heading found";
  });

  await run("Authenticated Routes", "POST /dashboard with message returns 200", async () => {
    const res = await http.post("/dashboard",
      new URLSearchParams({ message: "Hello this is a simple safe test message" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie } }
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });
}

// ============================================================
// SUITE 6 — Scanner Logic via HTTP  (10 tests)
// ============================================================
async function suiteScannerLogic() {
  console.log("\n📋 SUITE 6: Scanner Logic");

  let cookie;
  try {
    cookie = await getSessionCookie();
    console.log("  🔑 Session cookie obtained successfully");
  } catch (err) {
    console.error(`  ❌ Cannot get session cookie: ${err.message}`);
    const names = [
      "Phishing message detected in response body",
      "Safe message detected in response body",
      "Phishing scan body has result-box",
      "Phishing scan body has Risk Score",
      "Safe scan body has Safe text",
      "Phishing scan body has AI Explanation",
      "Scan response has stats-container",
      "POST /dashboard does not return 500",
      "Prize/winner message flagged as Phishing",
      "Friendly message stays Safe",
    ];
    names.forEach((n) => {
      log("FAIL", n, err.message);
      record("Scanner Logic", n, "FAIL", 0, err.message);
    });
    return;
  }

  const scan = async (msg) => {
    const res = await http.post("/dashboard",
      new URLSearchParams({ message: msg }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie } }
    );
    return res.data.toString();
  };

  await run("Scanner Logic", "Phishing message detected in response body", async () => {
    const body = await scan("URGENT verify your bank account OTP now click here login");
    if (!body.includes("Phishing")) throw new Error("Phishing not in response");
    return "Phishing detected ✓";
  });

  await run("Scanner Logic", "Safe message detected in response body", async () => {
    const body = await scan("Hey are you coming to dinner tonight with the family?");
    if (!body.includes("Safe")) throw new Error("Safe not in response");
    return "Safe detected ✓";
  });

  await run("Scanner Logic", "Phishing scan body has result-box", async () => {
    const body = await scan("URGENT click verify bank OTP login account now");
    if (!body.includes("result-box")) throw new Error("result-box missing");
    return "result-box found";
  });

  await run("Scanner Logic", "Phishing scan body has Risk Score", async () => {
    const body = await scan("Click here urgently to verify your bank login OTP account");
    if (!body.includes("Risk Score")) throw new Error("Risk Score missing");
    return "Risk Score found";
  });

  await run("Scanner Logic", "Safe scan body has Safe text", async () => {
    const body = await scan("Good morning! The meeting has been rescheduled to 3pm tomorrow.");
    if (!body.includes("Safe")) throw new Error("Safe text missing");
    return "Safe text found";
  });

  await run("Scanner Logic", "Phishing scan body has AI Explanation", async () => {
    const body = await scan("URGENT click to verify bank account OTP login now immediately");
    if (!body.includes("Explanation")) throw new Error("Explanation missing");
    return "Explanation found";
  });

  await run("Scanner Logic", "Scan response has stats-container", async () => {
    const body = await scan("test message");
    if (!body.includes("stats-container")) throw new Error("stats-container missing");
    return "stats-container found";
  });

  await run("Scanner Logic", "POST /dashboard does not return 500", async () => {
    const res = await http.post("/dashboard",
      new URLSearchParams({ message: "simple test here" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie } }
    );
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await run("Scanner Logic", "Prize/winner message flagged as Phishing", async () => {
    const body = await scan("Congratulations winner! Click here to claim your prize money from bank account now");
    if (!body.includes("Phishing")) throw new Error("Not flagged as Phishing");
    return "Phishing for prize/winner ✓";
  });

  await run("Scanner Logic", "Friendly message stays Safe", async () => {
    const body = await scan("Hi Mom, I will call you this evening after work. Love you!");
    if (!body.includes("Safe")) throw new Error("Safe text missing");
    return "Safe for friendly ✓";
  });
}

// ============================================================
// MAIN RUNNER
// ============================================================
async function runUnitTests() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PhishGuard — Unit Test Suite");
  console.log(`  Target: ${BASE}`);
  console.log("═══════════════════════════════════════════════");

  await suiteRoutes();
  await suiteHeaders();
  await suiteCheckEmail();
  await suiteLoginAPI();
  await suiteAuthenticatedRoutes();
  await suiteScannerLogic();

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n  Unit: ${passed} PASS | ${failed} FAIL  (${results.length} total)\n`);

  const rawDir = path.join(__dirname, "../reports/raw");
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(path.join(rawDir, "unit_results.json"), JSON.stringify(results, null, 2));
  console.log("  📁 Saved to reports/raw/unit_results.json");
  return results;
}

if (require.main === module) {
  runUnitTests().catch((err) => { console.error("Fatal:", err); process.exit(1); });
}
module.exports = { runUnitTests };
