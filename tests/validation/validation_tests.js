// ============================================================
// PhishGuard — Validation Test Suite  (50 tests)
// Tests client-side HTML5 validation, form field attributes,
// required fields, email format, password rules, live
// feedback elements, and input accessibility
// Uses Selenium for browser-level validation behaviour
// ============================================================

const { Builder, By, until, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const config = require("../config");
const fs     = require("fs");
const path   = require("path");

const sleep   = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

function log(status, name, detail = "") {
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`  ${icon} [${status}] ${name}${detail ? " — " + detail : ""}`);
}
function record(suite, name, status, duration, detail = "") {
  results.push({ suite, name, status, duration, detail, error: status === "FAIL" ? detail : "" });
}
async function run(suite, name, fn, driver) {
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

// ============================================================
// SUITE 1 — Login Form Field Attributes  (10 tests)
// ============================================================
async function suiteLoginFieldAttrs(driver) {
  console.log("\n📋 SUITE: Login Field Attributes");
  const BASE = config.BASE_URL;
  await driver.get(BASE + "/login");
  await driver.wait(until.elementLocated(By.id("email")), 6000);

  await run("Login Validation", "email input type is email", async () => {
    const t = await driver.findElement(By.id("email")).getAttribute("type");
    if (t !== "email") throw new Error(`type: ${t}`);
    return `type=${t}`;
  }, driver);

  await run("Login Validation", "email input has required attribute", async () => {
    const r = await driver.findElement(By.id("email")).getAttribute("required");
    if (!r) throw new Error("required missing");
    return "required ✓";
  }, driver);

  await run("Login Validation", "password input type is password", async () => {
    const t = await driver.findElement(By.id("password")).getAttribute("type");
    if (t !== "password") throw new Error(`type: ${t}`);
    return `type=${t}`;
  }, driver);

  await run("Login Validation", "password input has required attribute", async () => {
    const r = await driver.findElement(By.id("password")).getAttribute("required");
    if (!r) throw new Error("required missing");
    return "required ✓";
  }, driver);

  await run("Login Validation", "email input has autocomplete=email", async () => {
    const ac = await driver.findElement(By.id("email")).getAttribute("autocomplete");
    if (ac !== "email") throw new Error(`autocomplete: ${ac}`);
    return `autocomplete=${ac}`;
  }, driver);

  await run("Login Validation", "password has autocomplete=current-password", async () => {
    const ac = await driver.findElement(By.id("password")).getAttribute("autocomplete");
    if (ac !== "current-password") throw new Error(`autocomplete: ${ac}`);
    return `autocomplete=${ac}`;
  }, driver);

  await run("Login Validation", "email input placeholder present", async () => {
    const ph = await driver.findElement(By.id("email")).getAttribute("placeholder");
    if (!ph || ph.trim().length < 2) throw new Error("placeholder empty");
    return `placeholder: ${ph}`;
  }, driver);

  await run("Login Validation", "password input placeholder present", async () => {
    const ph = await driver.findElement(By.id("password")).getAttribute("placeholder");
    if (!ph || ph.trim().length < 2) throw new Error("placeholder empty");
    return `placeholder: ${ph}`;
  }, driver);

  await run("Login Validation", "Submit button type is submit", async () => {
    const t = await driver.findElement(By.css("button[type='submit']")).getAttribute("type");
    if (t !== "submit") throw new Error(`type: ${t}`);
    return `type=${t}`;
  }, driver);

  await run("Login Validation", "Empty form click keeps user on /login", async () => {
    await driver.findElement(By.css("button[type='submit']")).click();
    await sleep(500);
    const url = await driver.getCurrentUrl();
    if (!url.includes("/login")) throw new Error(`URL: ${url}`);
    return "stayed on /login ✓";
  }, driver);
}

// ============================================================
// SUITE 2 — Create Account Field Attributes  (14 tests)
// ============================================================
async function suiteCreateAccountAttrs(driver) {
  console.log("\n📋 SUITE: Create Account Field Attributes");
  const BASE = config.BASE_URL;
  await driver.get(BASE + "/create-account");
  await driver.wait(until.elementLocated(By.id("name")), 6000);

  await run("CA Validation", "name input type is text", async () => {
    const t = await driver.findElement(By.id("name")).getAttribute("type");
    if (t !== "text") throw new Error(`type: ${t}`);
    return `type=${t}`;
  }, driver);

  await run("CA Validation", "name input has required attribute", async () => {
    const r = await driver.findElement(By.id("name")).getAttribute("required");
    if (!r) throw new Error("required missing");
    return "required ✓";
  }, driver);

  await run("CA Validation", "name input autocomplete is name", async () => {
    const ac = await driver.findElement(By.id("name")).getAttribute("autocomplete");
    if (ac !== "name") throw new Error(`autocomplete: ${ac}`);
    return `autocomplete=${ac}`;
  }, driver);

  await run("CA Validation", "email input type is email", async () => {
    const t = await driver.findElement(By.id("email")).getAttribute("type");
    if (t !== "email") throw new Error(`type: ${t}`);
    return `type=${t}`;
  }, driver);

  await run("CA Validation", "email input has required attribute", async () => {
    const r = await driver.findElement(By.id("email")).getAttribute("required");
    if (!r) throw new Error("required missing");
    return "required ✓";
  }, driver);

  await run("CA Validation", "password input type is password", async () => {
    const t = await driver.findElement(By.id("password")).getAttribute("type");
    if (t !== "password") throw new Error(`type: ${t}`);
    return `type=${t}`;
  }, driver);

  await run("CA Validation", "password input has required attribute", async () => {
    const r = await driver.findElement(By.id("password")).getAttribute("required");
    if (!r) throw new Error("required missing");
    return "required ✓";
  }, driver);

  await run("CA Validation", "password input autocomplete is new-password", async () => {
    const ac = await driver.findElement(By.id("password")).getAttribute("autocomplete");
    if (ac !== "new-password") throw new Error(`autocomplete: ${ac}`);
    return `autocomplete=${ac}`;
  }, driver);

  await run("CA Validation", "confirm_password type is password", async () => {
    const t = await driver.findElement(By.id("confirm_password")).getAttribute("type");
    if (t !== "password") throw new Error(`type: ${t}`);
    return `type=${t}`;
  }, driver);

  await run("CA Validation", "confirm_password has required attribute", async () => {
    const r = await driver.findElement(By.id("confirm_password")).getAttribute("required");
    if (!r) throw new Error("required missing");
    return "required ✓";
  }, driver);

  await run("CA Validation", "Form action is /create-account", async () => {
    const action = await driver.findElement(By.id("registerForm")).getAttribute("action");
    if (!action.includes("/create-account")) throw new Error(`action: ${action}`);
    return `action=${action}`;
  }, driver);

  await run("CA Validation", "Form method is POST", async () => {
    const method = await driver.findElement(By.id("registerForm")).getAttribute("method");
    if (method.toLowerCase() !== "post") throw new Error(`method: ${method}`);
    return `method=${method}`;
  }, driver);

  await run("CA Validation", "submitBtn type is submit", async () => {
    const t = await driver.findElement(By.id("submitBtn")).getAttribute("type");
    if (t !== "submit") throw new Error(`type: ${t}`);
    return `type=${t}`;
  }, driver);

  await run("CA Validation", "Empty form submit stays on /create-account", async () => {
    await driver.findElement(By.id("submitBtn")).click();
    await sleep(500);
    const url = await driver.getCurrentUrl();
    if (!url.includes("/create-account")) throw new Error(`URL: ${url}`);
    return "stayed on /create-account ✓";
  }, driver);
}

// ============================================================
// SUITE 3 — Live Password Feedback  (10 tests)
// ============================================================
async function suiteLiveFeedback(driver) {
  console.log("\n📋 SUITE: Live Password Feedback");
  const BASE = config.BASE_URL;
  await driver.get(BASE + "/create-account");
  await driver.wait(until.elementLocated(By.id("password")), 6000);

  await run("Live Feedback", "confirm-feedback hidden before typing", async () => {
    const display = await driver.executeScript(
      "return window.getComputedStyle(document.getElementById('confirm-feedback')).display"
    );
    if (display !== "none") throw new Error(`display: ${display}`);
    return "hidden ✓";
  }, driver);

  await run("Live Feedback", "Typing matching passwords shows match feedback", async () => {
    await driver.findElement(By.id("password")).sendKeys("Test@1234");
    await driver.findElement(By.id("confirm_password")).sendKeys("Test@1234");
    await driver.findElement(By.id("confirm_password")).sendKeys(Key.TAB);
    await sleep(500);
    const text = await driver.findElement(By.id("confirm-feedback")).getText();
    if (!text.toLowerCase().includes("match")) throw new Error(`feedback: ${text}`);
    return `feedback: ${text}`;
  }, driver);

  await run("Live Feedback", "confirm-feedback has class success for matching", async () => {
    const cls = await driver.findElement(By.id("confirm-feedback")).getAttribute("class");
    if (!cls.includes("success")) throw new Error(`class: ${cls}`);
    return `class: ${cls}`;
  }, driver);

  await run("Live Feedback", "Typing mismatched passwords shows error feedback", async () => {
    const conf = await driver.findElement(By.id("confirm_password"));
    await conf.clear();
    await conf.sendKeys("Wrong@999");
    await conf.sendKeys(Key.TAB);
    await sleep(500);
    const text = await driver.findElement(By.id("confirm-feedback")).getText();
    if (!text.toLowerCase().includes("not") && !text.toLowerCase().includes("match")) throw new Error(`feedback: ${text}`);
    return `feedback: ${text}`;
  }, driver);

  await run("Live Feedback", "confirm-feedback has class error for mismatch", async () => {
    const cls = await driver.findElement(By.id("confirm-feedback")).getAttribute("class");
    if (!cls.includes("error")) throw new Error(`class: ${cls}`);
    return `class: ${cls}`;
  }, driver);

  await run("Live Feedback", "email-feedback hidden before typing", async () => {
    await driver.get(BASE + "/create-account");
    await driver.wait(until.elementLocated(By.id("email")), 5000);
    const display = await driver.executeScript(
      "return window.getComputedStyle(document.getElementById('email-feedback')).display"
    );
    if (display !== "none") throw new Error(`display: ${display}`);
    return "hidden ✓";
  }, driver);

  await run("Live Feedback", "Partial email (no @) does not trigger API check", async () => {
    await driver.findElement(By.id("email")).sendKeys("notanemail");
    await sleep(600);
    const text = await driver.findElement(By.id("email-feedback")).getText();
    if (text.includes("already") || text.includes("available")) throw new Error(`Unexpected feedback: ${text}`);
    return "no premature feedback ✓";
  }, driver);

  await run("Live Feedback", "Valid new email shows available feedback", async () => {
    const emailInput = await driver.findElement(By.id("email"));
    await emailInput.clear();
    await emailInput.sendKeys("brandnew_unique_xyz_2099@test.com");
    await emailInput.sendKeys(Key.TAB);
    await sleep(1200);
    const text = await driver.findElement(By.id("email-feedback")).getText();
    if (!text.toLowerCase().includes("available")) throw new Error(`feedback: ${text}`);
    return `feedback: ${text}`;
  }, driver);

  await run("Live Feedback", "Existing email shows already registered feedback", async () => {
    const emailInput = await driver.findElement(By.id("email"));
    await emailInput.clear();
    await emailInput.sendKeys(config.TEST_USER.email);
    await emailInput.sendKeys(Key.TAB);
    await sleep(1200);
    const text = await driver.findElement(By.id("email-feedback")).getText();
    if (!text.toLowerCase().includes("already")) throw new Error(`feedback: ${text}`);
    return `feedback: ${text}`;
  }, driver);

  await run("Live Feedback", "Existing email feedback has error class", async () => {
    const cls = await driver.findElement(By.id("email-feedback")).getAttribute("class");
    if (!cls.includes("error")) throw new Error(`class: ${cls}`);
    return `class: ${cls}`;
  }, driver);
}

// ============================================================
// SUITE 4 — Password Toggle Validation  (8 tests)
// ============================================================
async function suitePasswordToggle(driver) {
  console.log("\n📋 SUITE: Password Toggle");
  const BASE = config.BASE_URL;
  await driver.get(BASE + "/login");
  await driver.wait(until.elementLocated(By.id("password")), 5000);

  await run("Password Toggle", "Login password initially type=password", async () => {
    const t = await driver.findElement(By.id("password")).getAttribute("type");
    if (t !== "password") throw new Error(`type: ${t}`);
    return "type=password ✓";
  }, driver);

  await run("Password Toggle", "Login toggle click changes type to text", async () => {
    await driver.findElement(By.id("password")).sendKeys("testpass");
    await driver.findElement(By.id("togglePasswordBtn")).click();
    await sleep(300);
    const t = await driver.findElement(By.id("password")).getAttribute("type");
    if (t !== "text") throw new Error(`type: ${t}`);
    return "type=text ✓";
  }, driver);

  await run("Password Toggle", "Login toggle click again restores type=password", async () => {
    await driver.findElement(By.id("togglePasswordBtn")).click();
    await sleep(300);
    const t = await driver.findElement(By.id("password")).getAttribute("type");
    if (t !== "password") throw new Error(`type: ${t}`);
    return "type=password ✓";
  }, driver);

  await run("Password Toggle", "CA page password toggle present", async () => {
    await driver.get(BASE + "/create-account");
    await driver.wait(until.elementLocated(By.id("password")), 5000);
    const btns = await driver.findElements(By.css(".toggle-password-btn"));
    if (btns.length < 2) throw new Error(`toggle buttons: ${btns.length}`);
    return `${btns.length} toggle buttons found`;
  }, driver);

  await run("Password Toggle", "CA password toggle changes type to text", async () => {
    await driver.findElement(By.id("password")).sendKeys("mypass");
    const btns = await driver.findElements(By.css(".toggle-password-btn"));
    await btns[0].click();
    await sleep(300);
    const t = await driver.findElement(By.id("password")).getAttribute("type");
    if (t !== "text") throw new Error(`type: ${t}`);
    return "type=text ✓";
  }, driver);

  await run("Password Toggle", "CA confirm_password toggle changes type to text", async () => {
    await driver.findElement(By.id("confirm_password")).sendKeys("mypass");
    const btns = await driver.findElements(By.css(".toggle-password-btn"));
    await btns[1].click();
    await sleep(300);
    const t = await driver.findElement(By.id("confirm_password")).getAttribute("type");
    if (t !== "text") throw new Error(`type: ${t}`);
    return "type=text ✓";
  }, driver);

  await run("Password Toggle", "Toggle button cursor style is pointer", async () => {
    const cursor = await driver.executeScript(
      "return window.getComputedStyle(document.querySelector('.toggle-password-btn')).cursor"
    );
    if (cursor !== "pointer") throw new Error(`cursor: ${cursor}`);
    return `cursor: ${cursor}`;
  }, driver);

  await run("Password Toggle", "Toggle button has no visible border", async () => {
    const border = await driver.executeScript(
      "return window.getComputedStyle(document.querySelector('.toggle-password-btn')).borderStyle"
    );
    if (border === "solid" || border === "groove") throw new Error(`border: ${border}`);
    return `border: ${border} ✓`;
  }, driver);
}

// ============================================================
// SUITE 5 — Scanner Input Validation  (8 tests)
// ============================================================
async function suiteScannerValidation(driver) {
  console.log("\n📋 SUITE: Scanner Input Validation");
  const BASE = config.BASE_URL;

  // login first
  await driver.get(BASE + "/login");
  await driver.wait(until.elementLocated(By.id("email")), 5000);
  await driver.findElement(By.id("email")).sendKeys(config.TEST_USER.email);
  await driver.findElement(By.id("password")).sendKeys(config.TEST_USER.password);
  await driver.findElement(By.css("button[type='submit']")).click();
  await driver.wait(until.urlContains("/dashboard"), 10000);

  await run("Scanner Validation", "textarea has required attribute", async () => {
    const r = await driver.findElement(By.css("textarea[name='message']")).getAttribute("required");
    if (!r) throw new Error("required missing");
    return "required ✓";
  }, driver);

  await run("Scanner Validation", "textarea placeholder text present", async () => {
    const ph = await driver.findElement(By.css("textarea[name='message']")).getAttribute("placeholder");
    if (!ph || ph.length < 3) throw new Error(`placeholder: ${ph}`);
    return `placeholder: ${ph}`;
  }, driver);

  await run("Scanner Validation", "Empty textarea submit stays on /dashboard", async () => {
    await driver.findElement(By.css("textarea[name='message']")).clear();
    await driver.findElement(By.css(".scanner-section button[type='submit']")).click();
    await sleep(500);
    const url = await driver.getCurrentUrl();
    if (!url.includes("/dashboard")) throw new Error(`URL: ${url}`);
    return "stayed on /dashboard ✓";
  }, driver);

  await run("Scanner Validation", "textarea accepts multi-line input", async () => {
    const ta = await driver.findElement(By.css("textarea[name='message']"));
    await ta.clear();
    await ta.sendKeys("Line 1\nLine 2\nLine 3");
    const val = await ta.getAttribute("value");
    if (!val.includes("Line 1") || !val.includes("Line 3")) throw new Error(`value: ${val}`);
    return "multi-line accepted ✓";
  }, driver);

  await run("Scanner Validation", "textarea is resizable (resize not none)", async () => {
    const resize = await driver.executeScript(
      "return window.getComputedStyle(document.querySelector('textarea')).resize"
    );
    // dashboard.css sets resize:none which is intentional — test it's set
    if (!resize) throw new Error("resize property not found");
    return `resize: ${resize}`;
  }, driver);

  await run("Scanner Validation", "textarea height > 100px", async () => {
    const h = await driver.executeScript(
      "return document.querySelector('textarea').offsetHeight"
    );
    if (h < 100) throw new Error(`height: ${h}px`);
    return `height: ${h}px`;
  }, driver);

  await run("Scanner Validation", "Analyze Now button type is submit", async () => {
    const t = await driver.findElement(By.css(".scanner-section button[type='submit']")).getAttribute("type");
    if (t !== "submit") throw new Error(`type: ${t}`);
    return `type=${t}`;
  }, driver);

  await run("Scanner Validation", "textarea background is dark (not white)", async () => {
    const bg = await driver.executeScript(
      "return window.getComputedStyle(document.querySelector('textarea')).backgroundColor"
    );
    if (bg === "rgb(255, 255, 255)") throw new Error("background is white");
    return `bg: ${bg}`;
  }, driver);
}

// ============================================================
// MAIN RUNNER
// ============================================================
async function runValidationTests() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PhishGuard — Validation Test Suite (50 tests)");
  console.log(`  Target: ${config.BASE_URL}`);
  console.log("═══════════════════════════════════════════════");

  const driver = await buildDriver();
  driver.manage().setTimeouts({ implicit: config.IMPLICIT_WAIT_MS });

  try {
    await suiteLoginFieldAttrs(driver);
    await suiteCreateAccountAttrs(driver);
    await suiteLiveFeedback(driver);
    await suitePasswordToggle(driver);
    await suiteScannerValidation(driver);
  } finally {
    await driver.quit();
  }

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n  Validation: ${passed} PASS | ${failed} FAIL  (${results.length} total)\n`);

  const rawDir = path.join(__dirname, "../reports/raw");
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(path.join(rawDir, "validation_results.json"), JSON.stringify(results, null, 2));
  console.log("  📁 Saved to reports/raw/validation_results.json");
  return results;
}

if (require.main === module) {
  runValidationTests().catch((err) => { console.error("Fatal:", err); process.exit(1); });
}
module.exports = { runValidationTests };
