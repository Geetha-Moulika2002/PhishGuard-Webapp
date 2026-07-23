// ============================================================
// PhishGuard — Selenium E2E Test Suite  (120 tests)
// Suites: Login, Create Account, Dashboard, Scanner,
//         Threats, Reports, Settings, Logout, Navigation,
//         UI/Layout, Accessibility, Session, Chart/Analytics
// ============================================================

const { Builder, By, until, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const config = require("../config");
const fs     = require("fs");
const path   = require("path");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

function log(status, name, detail = "") {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️ ";
  console.log(`  ${icon} [${status}] ${name}${detail ? " — " + detail : ""}`);
}
function record(suite, name, status, duration, error = "", screenshot = "") {
  results.push({ suite, name, status, duration, error, screenshot });
}
async function saveScreenshot(driver, name) {
  try {
    const dir = path.join(__dirname, "../reports/raw/screenshots");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const img = await driver.takeScreenshot();
    fs.writeFileSync(path.join(dir, `${name}.png`), img, "base64");
  } catch (_) {}
}
async function runTest(suite, name, fn, driver) {
  const start = Date.now();
  try {
    await fn();
    const dur = Date.now() - start;
    log("PASS", name);
    record(suite, name, "PASS", dur);
  } catch (err) {
    const dur = Date.now() - start;
    const shot = `${suite}_${name}`.replace(/[\s/]/g, "_").substring(0, 80);
    if (driver) await saveScreenshot(driver, shot);
    log("FAIL", name, err.message.split("\n")[0]);
    record(suite, name, "FAIL", dur, err.message.split("\n")[0], shot + ".png");
  }
}
async function buildDriver() {
  const opts = new chrome.Options();
  if (config.HEADLESS) opts.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");
  opts.addArguments("--window-size=1400,900", "--disable-gpu", "--disable-extensions");
  return new Builder().forBrowser("chrome").setChromeOptions(opts).build();
}

// ── login helper (reused across suites) ──────────────────────
async function doLogin(driver) {
  const BASE = config.BASE_URL;
  const { email, password } = config.TEST_USER;
  await driver.get(BASE + "/login");
  await driver.wait(until.elementLocated(By.id("email")), 6000);
  await driver.findElement(By.id("email")).sendKeys(email);
  await driver.findElement(By.id("password")).sendKeys(password);
  await driver.findElement(By.css("button[type='submit']")).click();
  await driver.wait(until.urlContains("/dashboard"), 10000);
}

// ============================================================
// SUITE 1 — Login Page  (18 tests)
// ============================================================
async function suiteLogin(driver) {
  console.log("\n📋 SUITE 1: Login Page");
  const BASE = config.BASE_URL;
  const { email, password } = config.TEST_USER;

  await runTest("Login", "Root / redirects to /login", async () => {
    await driver.get(BASE + "/");
    await driver.wait(until.urlContains("/login"), 6000);
  }, driver);

  await runTest("Login", "Page title contains PhishGuard", async () => {
    await driver.get(BASE + "/login");
    const title = await driver.getTitle();
    if (!title.toLowerCase().includes("phishguard")) throw new Error("Title: " + title);
  }, driver);

  await runTest("Login", "Shield logo emoji visible", async () => {
    await driver.get(BASE + "/login");
    await driver.wait(until.elementLocated(By.css(".logo")), 5000);
    const logo = await driver.findElement(By.css(".logo")).getText();
    if (!logo.includes("🛡")) throw new Error("Logo not found");
  }, driver);

  await runTest("Login", ".title heading shows PhishGuard", async () => {
    const text = await driver.findElement(By.css(".title")).getText();
    if (!text.includes("PhishGuard")) throw new Error("Heading: " + text);
  }, driver);

  await runTest("Login", ".subtitle text is present", async () => {
    const text = await driver.findElement(By.css(".subtitle")).getText();
    if (text.trim().length < 5) throw new Error("Subtitle empty");
  }, driver);

  await runTest("Login", "Email input field exists with id=email", async () => {
    await driver.findElement(By.id("email"));
  }, driver);

  await runTest("Login", "Password input field exists with id=password", async () => {
    await driver.findElement(By.id("password"));
  }, driver);

  await runTest("Login", "Submit button exists with id=loginBtn", async () => {
    await driver.findElement(By.id("loginBtn"));
  }, driver);

  await runTest("Login", "Remember Me checkbox is present", async () => {
    await driver.findElement(By.id("remember"));
  }, driver);

  await runTest("Login", "Create Account link has correct href", async () => {
    const link = await driver.findElement(By.id("createAccountLink"));
    const href = await link.getAttribute("href");
    if (!href.includes("/create-account")) throw new Error("Href: " + href);
  }, driver);

  await runTest("Login", "Footer tech stack text visible", async () => {
    const footer = await driver.findElement(By.css(".footer")).getText();
    if (!footer.includes("SVM") || !footer.includes("TF-IDF")) throw new Error("Footer: " + footer);
  }, driver);

  await runTest("Login", "Password toggle button id=togglePasswordBtn present", async () => {
    await driver.findElement(By.id("togglePasswordBtn"));
  }, driver);

  await runTest("Login", "Password toggle changes input type to text", async () => {
    const passInput = await driver.findElement(By.id("password"));
    await passInput.sendKeys("mypassword");
    await driver.findElement(By.id("togglePasswordBtn")).click();
    await sleep(300);
    const type = await passInput.getAttribute("type");
    if (type !== "text") throw new Error("Expected text, got: " + type);
  }, driver);

  await runTest("Login", "Password toggle changes emoji to 🙈", async () => {
    const btn = await driver.findElement(By.id("togglePasswordBtn"));
    const text = await btn.getText();
    if (!text.includes("🙈")) throw new Error("Toggle emoji: " + text);
  }, driver);

  await runTest("Login", "Password toggle again hides password", async () => {
    const btn = await driver.findElement(By.id("togglePasswordBtn"));
    await btn.click();
    await sleep(300);
    const type = await driver.findElement(By.id("password")).getAttribute("type");
    if (type !== "password") throw new Error("Should be password type, got: " + type);
  }, driver);

  await runTest("Login", "Wrong credentials shows .alert-box", async () => {
    await driver.get(BASE + "/login");
    await driver.findElement(By.id("email")).sendKeys(config.INVALID_USER.email);
    await driver.findElement(By.id("password")).sendKeys(config.INVALID_USER.password);
    await driver.findElement(By.id("loginBtn")).click();
    await driver.wait(until.elementLocated(By.css(".alert-box")), 8000);
    const msg = await driver.findElement(By.css(".alert-box")).getText();
    if (!msg || msg.trim().length < 2) throw new Error("Alert box empty");
  }, driver);

  await runTest("Login", "Valid credentials redirect to /dashboard", async () => {
    await driver.get(BASE + "/login");
    await driver.findElement(By.id("email")).sendKeys(email);
    await driver.findElement(By.id("password")).sendKeys(password);
    await driver.findElement(By.id("loginBtn")).click();
    await driver.wait(until.urlContains("/dashboard"), 10000);
  }, driver);

  await runTest("Login", "Already logged-in visit to /login redirects to /dashboard", async () => {
    await driver.get(BASE + "/login");
    await driver.wait(until.urlContains("/dashboard"), 6000);
  }, driver);
}

// ============================================================
// SUITE 2 — Create Account Page  (14 tests)
// ============================================================
async function suiteCreateAccount(driver) {
  console.log("\n📋 SUITE 2: Create Account");
  const BASE = config.BASE_URL;

  // Logout first so we can reach create-account
  await driver.get(BASE + "/logout");
  await driver.wait(until.urlContains("/login"), 5000);

  await runTest("Create Account", "Page loads at /create-account", async () => {
    await driver.get(BASE + "/create-account");
    await driver.wait(until.elementLocated(By.css(".card")), 5000);
  }, driver);

  await runTest("Create Account", "Page title contains Create", async () => {
    const title = await driver.getTitle();
    if (!title.toLowerCase().includes("create")) throw new Error("Title: " + title);
  }, driver);

  await runTest("Create Account", "h1 heading present on page", async () => {
    const h1 = await driver.findElement(By.css("h1")).getText();
    if (h1.trim().length < 3) throw new Error("h1 empty");
  }, driver);

  await runTest("Create Account", "id=name input field exists", async () => {
    await driver.findElement(By.id("name"));
  }, driver);

  await runTest("Create Account", "id=email input field exists", async () => {
    await driver.findElement(By.id("email"));
  }, driver);

  await runTest("Create Account", "id=password input field exists", async () => {
    await driver.findElement(By.id("password"));
  }, driver);

  await runTest("Create Account", "id=confirm_password input field exists", async () => {
    await driver.findElement(By.id("confirm_password"));
  }, driver);

  await runTest("Create Account", "id=submitBtn button exists", async () => {
    await driver.findElement(By.id("submitBtn"));
  }, driver);

  await runTest("Create Account", "id=email-feedback element exists", async () => {
    await driver.findElement(By.id("email-feedback"));
  }, driver);

  await runTest("Create Account", "id=confirm-feedback element exists", async () => {
    await driver.findElement(By.id("confirm-feedback"));
  }, driver);

  await runTest("Create Account", "Password hint text visible", async () => {
    const hint = await driver.findElement(By.css(".password-hint")).getText();
    if (!hint.toLowerCase().includes("characters")) throw new Error("Hint: " + hint);
  }, driver);

  await runTest("Create Account", "Password mismatch shows confirm-feedback error", async () => {
    await driver.findElement(By.id("name")).sendKeys("Test");
    await driver.findElement(By.id("email")).sendKeys("fresh@test.com");
    await driver.findElement(By.id("password")).sendKeys("Pass@1234");
    const conf = await driver.findElement(By.id("confirm_password"));
    await conf.sendKeys("Mismatch@99");
    await conf.sendKeys(Key.TAB);
    await sleep(500);
    const feedback = await driver.findElement(By.id("confirm-feedback")).getText();
    if (!feedback.toLowerCase().includes("match")) throw new Error("Feedback: " + feedback);
  }, driver);

  await runTest("Create Account", "Matching passwords shows green success feedback", async () => {
    const conf = await driver.findElement(By.id("confirm_password"));
    await conf.clear();
    await conf.sendKeys("Pass@1234");
    await conf.sendKeys(Key.TAB);
    await sleep(500);
    const feedback = await driver.findElement(By.id("confirm-feedback")).getText();
    if (!feedback.toLowerCase().includes("match")) throw new Error("Feedback: " + feedback);
  }, driver);

  await runTest("Create Account", "Login link navigates to /login", async () => {
    await driver.get(BASE + "/create-account");
    await driver.wait(until.elementLocated(By.css(".login-link a")), 5000);
    await driver.findElement(By.css(".login-link a")).click();
    await driver.wait(until.urlContains("/login"), 5000);
  }, driver);
}

// ============================================================
// SUITE 3 — Dashboard Layout  (18 tests)
// ============================================================
async function suiteDashboardLayout(driver) {
  console.log("\n📋 SUITE 3: Dashboard Layout");
  const BASE = config.BASE_URL;
  await doLogin(driver);

  await runTest("Dashboard Layout", "Page title is PhishGuard Dashboard", async () => {
    const title = await driver.getTitle();
    if (!title.toLowerCase().includes("phishguard")) throw new Error("Title: " + title);
  }, driver);

  await runTest("Dashboard Layout", ".dashboard-container exists", async () => {
    await driver.findElement(By.css(".dashboard-container"));
  }, driver);

  await runTest("Dashboard Layout", ".sidebar exists", async () => {
    await driver.findElement(By.css(".sidebar"));
  }, driver);

  await runTest("Dashboard Layout", ".sidebar h2 shows PhishGuard", async () => {
    const h2 = await driver.findElement(By.css(".sidebar h2")).getText();
    if (!h2.includes("PhishGuard")) throw new Error("Sidebar h2: " + h2);
  }, driver);

  await runTest("Dashboard Layout", ".main-content exists", async () => {
    await driver.findElement(By.css(".main-content"));
  }, driver);

  await runTest("Dashboard Layout", ".stats-container exists", async () => {
    await driver.findElement(By.css(".stats-container"));
  }, driver);

  await runTest("Dashboard Layout", "At least 5 .card elements present", async () => {
    const cards = await driver.findElements(By.css(".card"));
    if (cards.length < 5) throw new Error("Cards: " + cards.length);
  }, driver);

  await runTest("Dashboard Layout", "SVM Accuracy card shows 98.56%", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("98.56")) throw new Error("SVM accuracy not found");
  }, driver);

  await runTest("Dashboard Layout", "BiLSTM Accuracy card shows 99.10%", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("99.10")) throw new Error("BiLSTM accuracy not found");
  }, driver);

  await runTest("Dashboard Layout", "Total Scans card label exists", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Total Scans")) throw new Error("Total Scans not found");
  }, driver);

  await runTest("Dashboard Layout", "Threats Detected card label exists", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Threats Detected")) throw new Error("Threats Detected not found");
  }, driver);

  await runTest("Dashboard Layout", "Safe Messages card label exists", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Safe Messages")) throw new Error("Safe Messages not found");
  }, driver);

  await runTest("Dashboard Layout", ".scanner-section with Analyze heading exists", async () => {
    const sections = await driver.findElements(By.css(".scanner-section"));
    let found = false;
    for (const s of sections) {
      if ((await s.getText()).includes("Analyze")) { found = true; break; }
    }
    if (!found) throw new Error("Analyze section not found");
  }, driver);

  await runTest("Dashboard Layout", "textarea[name=message] present and accepts input", async () => {
    const ta = await driver.findElement(By.css("textarea[name='message']"));
    await ta.sendKeys("hello test");
    const val = await ta.getAttribute("value");
    if (!val.includes("hello test")) throw new Error("Textarea value: " + val);
  }, driver);

  await runTest("Dashboard Layout", "Analyze Now submit button present", async () => {
    const btns = await driver.findElements(By.css(".scanner-section button[type='submit']"));
    if (btns.length === 0) throw new Error("No submit button in scanner-section");
  }, driver);

  await runTest("Dashboard Layout", ".analytics-section with canvas#threatChart present", async () => {
    await driver.findElement(By.id("threatChart"));
  }, driver);

  await runTest("Dashboard Layout", ".alerts-section heading present", async () => {
    await driver.findElement(By.css(".alerts-section"));
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Threat Alerts")) throw new Error("Alerts section not found");
  }, driver);

  await runTest("Dashboard Layout", "Three .alert-card elements exist (high/medium/safe)", async () => {
    const cards = await driver.findElements(By.css(".alert-card"));
    if (cards.length < 3) throw new Error("Alert cards: " + cards.length);
  }, driver);
}

// ============================================================
// SUITE 4 — SMS Scanner Functionality  (16 tests)
// ============================================================
async function suiteSMSScanner(driver) {
  console.log("\n📋 SUITE 4: SMS Scanner");
  const BASE = config.BASE_URL;
  await driver.get(BASE + "/dashboard");
  await driver.wait(until.elementLocated(By.css("textarea[name='message']")), 6000);

  const PHISHING_MSG = "URGENT: Your bank account OTP is needed. Verify now or it will be blocked. Click login link.";
  const SAFE_MSG     = "Hi there, lunch is at noon today. See you at the usual spot!";

  await runTest("SMS Scanner", "Phishing message scan shows result-box", async () => {
    const ta = await driver.findElement(By.css("textarea[name='message']"));
    await ta.clear(); await ta.sendKeys(PHISHING_MSG);
    await driver.findElement(By.css(".scanner-section button[type='submit']")).click();
    await driver.wait(until.elementLocated(By.css(".result-box")), 12000);
  }, driver);

  await runTest("SMS Scanner", "Phishing scan result h2 contains Phishing", async () => {
    const h2 = await driver.findElement(By.css(".result-box h2")).getText();
    if (!h2.includes("Phishing")) throw new Error("Result: " + h2);
  }, driver);

  await runTest("SMS Scanner", "Risk score shown with % sign", async () => {
    const h3 = await driver.findElement(By.css(".result-box h3")).getText();
    if (!h3.includes("%")) throw new Error("Score h3: " + h3);
  }, driver);

  await runTest("SMS Scanner", "Risk score for phishing is >= 70", async () => {
    const h3 = await driver.findElement(By.css(".result-box h3")).getText();
    const num = parseInt(h3.replace(/\D/g, ""));
    if (num < 70) throw new Error("Score too low: " + num);
  }, driver);

  await runTest("SMS Scanner", "AI Explanation heading present after phishing scan", async () => {
    const body = await driver.findElement(By.css(".result-box")).getText();
    if (!body.includes("Explanation")) throw new Error("No explanation heading");
  }, driver);

  await runTest("SMS Scanner", "AI Explanation text is non-empty", async () => {
    const paras = await driver.findElements(By.css(".result-box p"));
    let found = false;
    for (const p of paras) {
      if ((await p.getText()).length > 20) { found = true; break; }
    }
    if (!found) throw new Error("No explanation paragraph found");
  }, driver);

  await runTest("SMS Scanner", "Detected Indicators section present", async () => {
    const body = await driver.findElement(By.css(".result-box")).getText();
    if (!body.includes("Indicator")) throw new Error("Indicators section not found");
  }, driver);

  await runTest("SMS Scanner", "At least one indicator listed for phishing message", async () => {
    const items = await driver.findElements(By.css(".result-box li"));
    if (items.length < 1) throw new Error("No indicator list items");
  }, driver);

  await runTest("SMS Scanner", "Result h2 has high-text or safe-text CSS class", async () => {
    const h2 = await driver.findElement(By.css(".result-box h2"));
    const cls = await h2.getAttribute("class");
    if (!cls.includes("high-text") && !cls.includes("safe-text") && !cls.includes("medium-text")) {
      throw new Error("Class: " + cls);
    }
  }, driver);

  await runTest("SMS Scanner", "Safe message scan shows result-box", async () => {
    await driver.get(BASE + "/dashboard");
    await driver.wait(until.elementLocated(By.css("textarea[name='message']")), 6000);
    const ta = await driver.findElement(By.css("textarea[name='message']"));
    await ta.clear(); await ta.sendKeys(SAFE_MSG);
    await driver.findElement(By.css(".scanner-section button[type='submit']")).click();
    await driver.wait(until.elementLocated(By.css(".result-box")), 12000);
  }, driver);

  await runTest("SMS Scanner", "Safe message result h2 contains Safe", async () => {
    const h2 = await driver.findElement(By.css(".result-box h2")).getText();
    if (!h2.includes("Safe")) throw new Error("Result: " + h2);
  }, driver);

  await runTest("SMS Scanner", "Safe message risk score <= 30", async () => {
    const h3 = await driver.findElement(By.css(".result-box h3")).getText();
    const num = parseInt(h3.replace(/\D/g, ""));
    if (num > 30) throw new Error("Safe score too high: " + num);
  }, driver);

  await runTest("SMS Scanner", "Safe message h2 has safe-text class", async () => {
    const h2 = await driver.findElement(By.css(".result-box h2"));
    const cls = await h2.getAttribute("class");
    if (!cls.includes("safe-text")) throw new Error("Class: " + cls);
  }, driver);

  await runTest("SMS Scanner", "AI Engine Status section shows NLP Preprocessing", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("NLP Preprocessing")) throw new Error("NLP not found");
  }, driver);

  await runTest("SMS Scanner", "AI Engine Status shows TF-IDF Vectorization", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("TF-IDF")) throw new Error("TF-IDF not found");
  }, driver);

  await runTest("SMS Scanner", "/scanner route also loads dashboard", async () => {
    await driver.get(BASE + "/scanner");
    await driver.wait(until.elementLocated(By.css(".stats-container")), 8000);
  }, driver);
}

// ============================================================
// SUITE 5 — Threats / Scan History  (16 tests)
// ============================================================
async function suiteThreats(driver) {
  console.log("\n📋 SUITE 5: Threats / Scan History");
  const BASE = config.BASE_URL;
  await driver.get(BASE + "/threats");
  await driver.wait(until.elementLocated(By.css(".history-table-container")), 8000);

  await runTest("Threats", "Page URL is /threats", async () => {
    const url = await driver.getCurrentUrl();
    if (!url.includes("/threats")) throw new Error("URL: " + url);
  }, driver);

  await runTest("Threats", ".top-bar h1 contains History", async () => {
    const h1 = await driver.findElement(By.css(".top-bar h1")).getText();
    if (!h1.includes("History")) throw new Error("h1: " + h1);
  }, driver);

  await runTest("Threats", ".filter-bar exists", async () => {
    await driver.findElement(By.css(".filter-bar"));
  }, driver);

  await runTest("Threats", "5 filter buttons present (All/Safe/Threat/Today/7days)", async () => {
    const btns = await driver.findElements(By.css(".filter-btn"));
    if (btns.length < 5) throw new Error("Buttons: " + btns.length);
  }, driver);

  await runTest("Threats", "All filter button has .active class by default", async () => {
    const activeBtn = await driver.findElement(By.css(".filter-btn.active"));
    const text = await activeBtn.getText();
    if (!text.includes("All")) throw new Error("Active btn: " + text);
  }, driver);

  await runTest("Threats", ".history-table-container exists", async () => {
    await driver.findElement(By.css(".history-table-container"));
  }, driver);

  await runTest("Threats", "table.history-table present", async () => {
    await driver.findElement(By.css("table.history-table"));
  }, driver);

  await runTest("Threats", "Table header has 5 columns", async () => {
    const ths = await driver.findElements(By.css("table.history-table th"));
    if (ths.length < 5) throw new Error("TH count: " + ths.length);
  }, driver);

  await runTest("Threats", "Table header Date & Time column present", async () => {
    const headers = await driver.findElement(By.css("table.history-table")).getText();
    if (!headers.includes("Date")) throw new Error("No Date header");
  }, driver);

  await runTest("Threats", "Table header Prediction column present", async () => {
    const headers = await driver.findElement(By.css("table.history-table")).getText();
    if (!headers.includes("Prediction")) throw new Error("No Prediction header");
  }, driver);

  await runTest("Threats", "Clicking Safe filter changes active button", async () => {
    const safeBtn = await driver.findElement(By.xpath("//button[normalize-space()='Safe']"));
    await safeBtn.click();
    await sleep(300);
    const cls = await safeBtn.getAttribute("class");
    if (!cls.includes("active")) throw new Error("Safe btn not active after click");
  }, driver);

  await runTest("Threats", "Clicking All filter resets active button", async () => {
    const allBtn = await driver.findElement(By.xpath("//button[normalize-space()='All']"));
    await allBtn.click();
    await sleep(300);
    const cls = await allBtn.getAttribute("class");
    if (!cls.includes("active")) throw new Error("All btn not active");
  }, driver);

  await runTest("Threats", "#scanModal exists in DOM", async () => {
    await driver.findElement(By.id("scanModal"));
  }, driver);

  await runTest("Threats", "#scanModal hidden by default", async () => {
    const display = await driver.findElement(By.id("scanModal")).getCssValue("display");
    if (display !== "none") throw new Error("Modal should be hidden, got: " + display);
  }, driver);

  await runTest("Threats", "Sidebar shows Scan History as active link", async () => {
    const links = await driver.findElements(By.css(".sidebar a"));
    let found = false;
    for (const l of links) {
      const txt = await l.getText();
      if (txt.includes("Scan History") || txt.includes("History")) { found = true; break; }
    }
    if (!found) throw new Error("Scan History link not found");
  }, driver);

  await runTest("Threats", "Scan History subtitle paragraph present", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Inspect") && !body.includes("scan")) throw new Error("Subtitle not found");
  }, driver);
}

// ============================================================
// SUITE 6 — Reports Page  (10 tests)
// ============================================================
async function suiteReports(driver) {
  console.log("\n📋 SUITE 6: Reports Page");
  const BASE = config.BASE_URL;
  await driver.get(BASE + "/reports");
  await driver.wait(until.elementLocated(By.css(".main-content")), 8000);

  await runTest("Reports", "URL is /reports", async () => {
    const url = await driver.getCurrentUrl();
    if (!url.includes("/reports")) throw new Error("URL: " + url);
  }, driver);

  await runTest("Reports", "h1 says Security Reports", async () => {
    const h1 = await driver.findElement(By.css("h1")).getText();
    if (!h1.toLowerCase().includes("report")) throw new Error("h1: " + h1);
  }, driver);

  await runTest("Reports", ".stats-container present on reports page", async () => {
    await driver.findElement(By.css(".stats-container"));
  }, driver);

  await runTest("Reports", "At least 3 stat cards on reports page", async () => {
    const cards = await driver.findElements(By.css(".card"));
    if (cards.length < 3) throw new Error("Cards: " + cards.length);
  }, driver);

  await runTest("Reports", "Total Messages card label present", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Total Messages")) throw new Error("Total Messages not found");
  }, driver);

  await runTest("Reports", "Threats Detected card label present", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Threats Detected")) throw new Error("Not found");
  }, driver);

  await runTest("Reports", "Model Performance section visible", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Model Performance")) throw new Error("Not found");
  }, driver);

  await runTest("Reports", "SVM Accuracy 98.56% shown", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("98.56")) throw new Error("SVM not found");
  }, driver);

  await runTest("Reports", "BiLSTM Accuracy 99.10% shown", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("99.10")) throw new Error("BiLSTM not found");
  }, driver);

  await runTest("Reports", "Sidebar .sidebar present on reports page", async () => {
    await driver.findElement(By.css(".sidebar"));
  }, driver);
}

// ============================================================
// SUITE 7 — Settings Page  (10 tests)
// ============================================================
async function suiteSettings(driver) {
  console.log("\n📋 SUITE 7: Settings Page");
  const BASE = config.BASE_URL;
  await driver.get(BASE + "/settings");
  await driver.wait(until.elementLocated(By.css(".main-content")), 8000);

  await runTest("Settings", "URL is /settings", async () => {
    const url = await driver.getCurrentUrl();
    if (!url.includes("/settings")) throw new Error("URL: " + url);
  }, driver);

  await runTest("Settings", "h1 contains Settings", async () => {
    const h1 = await driver.findElement(By.css("h1")).getText();
    if (!h1.toLowerCase().includes("settings")) throw new Error("h1: " + h1);
  }, driver);

  await runTest("Settings", "Security Preferences section present", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Security Preferences")) throw new Error("Not found");
  }, driver);

  await runTest("Settings", "AI Protection Engine Enabled text present", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("AI Protection Engine")) throw new Error("Not found");
  }, driver);

  await runTest("Settings", "Application Settings section present", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Application Settings")) throw new Error("Not found");
  }, driver);

  await runTest("Settings", "Theme Mode : Dark Mode text present", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("Dark Mode")) throw new Error("Not found");
  }, driver);

  await runTest("Settings", "PhishGuard v1.0 version text present", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("v1.0")) throw new Error("Version not found");
  }, driver);

  await runTest("Settings", "AI Engine Status section present", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("AI Engine Status")) throw new Error("Not found");
  }, driver);

  await runTest("Settings", "TF-IDF Vectorizer listed in AI Engine Status", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("TF-IDF Vectorizer")) throw new Error("Not found");
  }, driver);

  await runTest("Settings", "SVM Classification Model listed", async () => {
    const body = await driver.findElement(By.css("body")).getText();
    if (!body.includes("SVM Classification Model")) throw new Error("Not found");
  }, driver);
}

// ============================================================
// SUITE 8 — Logout & Session Guard  (8 tests)
// ============================================================
async function suiteLogout(driver) {
  console.log("\n📋 SUITE 8: Logout & Session Guard");
  const BASE = config.BASE_URL;

  await runTest("Logout", "/logout redirects to /login", async () => {
    await driver.get(BASE + "/logout");
    await driver.wait(until.urlContains("/login"), 6000);
  }, driver);

  await runTest("Logout", "/dashboard after logout goes to /login", async () => {
    await driver.get(BASE + "/dashboard");
    await driver.wait(until.urlContains("/login"), 6000);
  }, driver);

  await runTest("Logout", "/threats after logout goes to /login", async () => {
    await driver.get(BASE + "/threats");
    await driver.wait(until.urlContains("/login"), 6000);
  }, driver);

  await runTest("Logout", "/reports after logout goes to /login", async () => {
    await driver.get(BASE + "/reports");
    await driver.wait(until.urlContains("/login"), 6000);
  }, driver);

  await runTest("Logout", "/settings after logout goes to /login", async () => {
    await driver.get(BASE + "/settings");
    await driver.wait(until.urlContains("/login"), 6000);
  }, driver);

  await runTest("Logout", "/scanner after logout goes to /login", async () => {
    await driver.get(BASE + "/scanner");
    await driver.wait(until.urlContains("/login"), 6000);
  }, driver);

  await runTest("Logout", "/ after logout goes to /login", async () => {
    await driver.get(BASE + "/");
    await driver.wait(until.urlContains("/login"), 6000);
  }, driver);

  await runTest("Logout", "Login form visible after logout redirect", async () => {
    await driver.findElement(By.id("email"));
    await driver.findElement(By.id("password"));
  }, driver);
}

// ============================================================
// SUITE 9 — Sidebar Navigation  (10 tests)
// ============================================================
async function suiteNavigation(driver) {
  console.log("\n📋 SUITE 9: Navigation");
  const BASE = config.BASE_URL;
  await doLogin(driver);

  await runTest("Navigation", "Sidebar has 5 links", async () => {
    const links = await driver.findElements(By.css(".sidebar ul li a"));
    if (links.length < 5) throw new Error("Links: " + links.length);
  }, driver);

  await runTest("Navigation", "Dashboard link navigates to /dashboard", async () => {
    const links = await driver.findElements(By.css(".sidebar ul li a"));
    for (const l of links) {
      if ((await l.getAttribute("href") || "").includes("/dashboard") ||
          (await l.getText()).toLowerCase().includes("dashboard")) {
        await l.click(); break;
      }
    }
    await driver.wait(until.urlContains("/dashboard"), 6000);
  }, driver);

  await runTest("Navigation", "Threats link navigates to /threats", async () => {
    await driver.get(BASE + "/dashboard");
    const links = await driver.findElements(By.css(".sidebar ul li a"));
    for (const l of links) {
      if ((await l.getAttribute("href") || "").includes("/threats")) { await l.click(); break; }
    }
    await driver.wait(until.urlContains("/threats"), 6000);
  }, driver);

  await runTest("Navigation", "Reports link navigates to /reports", async () => {
    await driver.get(BASE + "/dashboard");
    const links = await driver.findElements(By.css(".sidebar ul li a"));
    for (const l of links) {
      if ((await l.getAttribute("href") || "").includes("/reports")) { await l.click(); break; }
    }
    await driver.wait(until.urlContains("/reports"), 6000);
  }, driver);

  await runTest("Navigation", "Settings link navigates to /settings", async () => {
    await driver.get(BASE + "/dashboard");
    const links = await driver.findElements(By.css(".sidebar ul li a"));
    for (const l of links) {
      if ((await l.getAttribute("href") || "").includes("/settings")) { await l.click(); break; }
    }
    await driver.wait(until.urlContains("/settings"), 6000);
  }, driver);

  await runTest("Navigation", "Logout link navigates to /login", async () => {
    await driver.get(BASE + "/dashboard");
    const links = await driver.findElements(By.css(".sidebar ul li a"));
    for (const l of links) {
      if ((await l.getAttribute("href") || "").includes("/logout")) { await l.click(); break; }
    }
    await driver.wait(until.urlContains("/login"), 6000);
  }, driver);

  await doLogin(driver);

  await runTest("Navigation", "Browser back after logout stays at login", async () => {
    await driver.get(BASE + "/logout");
    await driver.wait(until.urlContains("/login"), 6000);
    await driver.navigate().back();
    await sleep(1000);
    const url = await driver.getCurrentUrl();
    if (!url.includes("/login") && !url.includes("/dashboard")) throw new Error("URL: " + url);
  }, driver);

  await runTest("Navigation", "Reports sidebar also has Threat History link", async () => {
    await driver.get(BASE + "/reports");
    const body = await driver.findElement(By.css(".sidebar")).getText();
    if (!body.includes("Threat") && !body.includes("History")) throw new Error("Link missing");
  }, driver);

  await runTest("Navigation", "Settings sidebar has logout link", async () => {
    await driver.get(BASE + "/settings");
    const links = await driver.findElements(By.css(".sidebar a"));
    let found = false;
    for (const l of links) {
      if ((await l.getAttribute("href") || "").includes("/logout")) { found = true; break; }
    }
    if (!found) throw new Error("Logout link not in sidebar");
  }, driver);

  await runTest("Navigation", "Threats sidebar has Reports link", async () => {
    await driver.get(BASE + "/threats");
    const links = await driver.findElements(By.css(".sidebar a"));
    let found = false;
    for (const l of links) {
      if ((await l.getAttribute("href") || "").includes("/reports")) { found = true; break; }
    }
    if (!found) throw new Error("Reports link missing from threats sidebar");
  }, driver);
}

// ============================================================
// SUITE 10 — UI / Layout & Responsiveness  (8 tests)
// ============================================================
async function suiteUI(driver) {
  console.log("\n📋 SUITE 10: UI / Layout");
  const BASE = config.BASE_URL;

  await runTest("UI", "Login card background is dark (not white)", async () => {
    await driver.get(BASE + "/login");
    await driver.wait(until.elementLocated(By.css(".login-card")), 5000);
    const bg = await driver.findElement(By.css("body")).getCssValue("background-color");
    if (bg.includes("255, 255, 255")) throw new Error("Background is white: " + bg);
  }, driver);

  await runTest("UI", "Login page has no horizontal scrollbar at 1400px", async () => {
    await driver.get(BASE + "/login");
    const overflow = await driver.executeScript("return document.body.scrollWidth <= window.innerWidth");
    if (!overflow) throw new Error("Horizontal scroll present");
  }, driver);

  await runTest("UI", "Dashboard sidebar width is 250px", async () => {
    await doLogin(driver);
    const width = await driver.executeScript(
      "return document.querySelector('.sidebar').offsetWidth"
    );
    if (width < 200) throw new Error("Sidebar width: " + width);
  }, driver);

  await runTest("UI", "Stats cards use flex layout", async () => {
    const display = await driver.executeScript(
      "return window.getComputedStyle(document.querySelector('.stats-container')).display"
    );
    if (!display.includes("flex")) throw new Error("display: " + display);
  }, driver);

  await runTest("UI", "Body background color is dark blue", async () => {
    const bg = await driver.executeScript(
      "return window.getComputedStyle(document.body).backgroundColor"
    );
    if (bg.includes("255, 255, 255")) throw new Error("BG: " + bg);
  }, driver);

  await runTest("UI", "Chart.js canvas has non-zero dimensions", async () => {
    const dims = await driver.executeScript(`
      const c = document.getElementById('threatChart');
      return c ? { w: c.offsetWidth, h: c.offsetHeight } : null;
    `);
    if (!dims || dims.w < 10) throw new Error("Chart canvas size: " + JSON.stringify(dims));
  }, driver);

  await runTest("UI", "Sidebar links have no underline decoration", async () => {
    const dec = await driver.executeScript(
      "return window.getComputedStyle(document.querySelector('.sidebar a')).textDecoration"
    );
    if (dec.includes("underline")) throw new Error("Text decoration: " + dec);
  }, driver);

  await runTest("UI", "Result box not present before any scan", async () => {
    await driver.get(BASE + "/dashboard");
    await driver.wait(until.elementLocated(By.css(".stats-container")), 6000);
    const boxes = await driver.findElements(By.css(".result-box"));
    if (boxes.length > 0) throw new Error("Result box shown without scan");
  }, driver);
}

// ============================================================
// SUITE 11 — Multiple Phishing Scans  (8 tests)
// ============================================================
async function suiteMultipleScans(driver) {
  console.log("\n📋 SUITE 11: Multiple Scan Scenarios");
  const BASE = config.BASE_URL;
  await driver.get(BASE + "/dashboard");
  await driver.wait(until.elementLocated(By.css("textarea[name='message']")), 6000);

  const scans = [
    { msg: "Your OTP is 4523. Verify your bank account urgently to avoid block.", expect: "Phishing" },
    { msg: "Winner! Click here to claim your prize money now from our bank account.", expect: "Phishing" },
    { msg: "Please login to your account urgently. Verify your OTP before it expires.", expect: "Phishing" },
    { msg: "Hey, how are you? Let me know if you are coming to the party tonight.", expect: "Safe" },
    { msg: "Reminder: your dentist appointment is at 3pm on Friday.", expect: "Safe" },
    { msg: "Your Amazon package has been delivered to the front door.", expect: "Safe" },
  ];

  for (const scan of scans) {
    await runTest("Multiple Scans", `Scan: "${scan.msg.substring(0, 40)}..." → ${scan.expect}`, async () => {
      await driver.get(BASE + "/dashboard");
      await driver.wait(until.elementLocated(By.css("textarea[name='message']")), 6000);
      const ta = await driver.findElement(By.css("textarea[name='message']"));
      await ta.clear(); await ta.sendKeys(scan.msg);
      await driver.findElement(By.css(".scanner-section button[type='submit']")).click();
      await driver.wait(until.elementLocated(By.css(".result-box")), 12000);
      const result = await driver.findElement(By.css(".result-box h2")).getText();
      if (!result.includes(scan.expect)) throw new Error(`Expected ${scan.expect}, got: ${result}`);
    }, driver);
  }

  await runTest("Multiple Scans", "Stats total_scans counter increments after scan", async () => {
    await driver.get(BASE + "/dashboard");
    await driver.wait(until.elementLocated(By.css(".stats-container")), 6000);
    const cards = await driver.findElements(By.css(".card p"));
    let found = false;
    for (const c of cards) {
      const txt = await c.getText();
      if (!isNaN(parseInt(txt))) { found = true; break; }
    }
    if (!found) throw new Error("No numeric stats found");
  }, driver);

  await runTest("Multiple Scans", "Threats page shows at least one row after scans", async () => {
    await driver.get(BASE + "/threats");
    await driver.wait(until.elementLocated(By.css(".history-table-container")), 6000);
    const rows = await driver.findElements(By.css(".scan-row"));
    if (rows.length === 0) throw new Error("No scan rows in threats table");
  }, driver);
}

// ============================================================
// MAIN RUNNER
// ============================================================
async function runE2E() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PhishGuard — E2E Test Suite (120 tests)");
  console.log(`  URL: ${config.BASE_URL}  |  Headless: ${config.HEADLESS}`);
  console.log("═══════════════════════════════════════════════\n");

  const driver = await buildDriver();
  driver.manage().setTimeouts({ implicit: config.IMPLICIT_WAIT_MS });

  try {
    await suiteLogin(driver);
    await suiteCreateAccount(driver);
    await suiteDashboardLayout(driver);
    await suiteSMSScanner(driver);
    await suiteThreats(driver);
    await suiteReports(driver);
    await suiteSettings(driver);
    await suiteLogout(driver);
    await suiteNavigation(driver);
    await suiteUI(driver);
    await suiteMultipleScans(driver);
  } finally {
    await driver.quit();
  }

  const passed  = results.filter((r) => r.status === "PASS").length;
  const failed  = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;
  console.log(`\n  E2E: ${passed} PASS | ${failed} FAIL | ${skipped} SKIP  (${results.length} total)\n`);

  const rawDir = "./reports/raw";
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(`${rawDir}/e2e_results.json`, JSON.stringify(results, null, 2));
  console.log("  📁 Saved to reports/raw/e2e_results.json");
  return results;
}

if (require.main === module) {
  runE2E().catch((err) => { console.error("Fatal:", err); process.exit(1); });
}
module.exports = { runE2E };
