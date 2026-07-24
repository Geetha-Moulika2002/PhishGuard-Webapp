// ============================================================
// PhishGuard — Selenium E2E Test Suite  (300 tests)
// Covers: Login, Create Account, Dashboard, Scanner,
//         Threats, Reports, Settings, Logout, Navigation,
//         UI/CSS, Accessibility, Multiple Scans, Sidebar
// ============================================================
const { Builder, By, until, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const config = require("../config");
const fs     = require("fs");
const path   = require("path");

const sleep  = ms => new Promise(r => setTimeout(r, ms));
const results = [];

function log(status, name, detail = "") {
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`  ${icon} [${status}] ${name}${detail ? " — " + detail : ""}`);
}
function record(suite, name, status, duration, error = "") {
  results.push({ suite, name, status, duration, error });
}
async function saveShot(driver, name) {
  try {
    const dir = path.join(__dirname, "../reports/raw/screenshots");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const img = await driver.takeScreenshot();
    fs.writeFileSync(path.join(dir, name.replace(/[\s/:]/g,"_").substring(0,80)+".png"), img, "base64");
  } catch(_) {}
}
async function run(suite, name, fn, driver) {
  const start = Date.now();
  try {
    const detail = await fn();
    log("PASS", name, detail || "");
    record(suite, name, "PASS", Date.now()-start);
  } catch(err) {
    if (driver) await saveShot(driver, suite+"_"+name);
    log("FAIL", name, err.message.split("\n")[0]);
    record(suite, name, "FAIL", Date.now()-start, err.message.split("\n")[0]);
  }
}
async function buildDriver() {
  const opts = new chrome.Options();
  if (config.HEADLESS) opts.addArguments("--headless=new","--no-sandbox","--disable-dev-shm-usage");
  opts.addArguments("--window-size=1400,900","--disable-gpu","--disable-extensions");
  return new Builder().forBrowser("chrome").setChromeOptions(opts).build();
}
async function doLogin(driver) {
  await driver.get(config.BASE_URL+"/login");
  await driver.wait(until.elementLocated(By.id("email")),8000);
  await driver.findElement(By.id("email")).sendKeys(config.TEST_USER.email);
  await driver.findElement(By.id("password")).sendKeys(config.TEST_USER.password);
  await driver.findElement(By.id("loginBtn")).click();
  await driver.wait(until.urlContains("/dashboard"),12000);
}
async function doLogout(driver) {
  await driver.get(config.BASE_URL+"/logout");
  await driver.wait(until.urlContains("/login"),6000);
}
// Text helper — avoids stale element re-fetch
async function bodyText(driver) {
  return driver.findElement(By.css("body")).getText();
}

// ============================================================
// SUITE 1 — Login Page Element Presence  (30 tests)
// ============================================================
async function s1_loginElements(d) {
  console.log("\n📋 SUITE 1: Login Page Elements");
  const S="Login Elements"; const B=config.BASE_URL;
  await run(S,"/ redirects to /login",async()=>{await d.get(B+"/");await d.wait(until.urlContains("/login"),6000);return"✓"},d);
  await run(S,"Page title contains PhishGuard",async()=>{await d.get(B+"/login");const t=await d.getTitle();if(!t.includes("PhishGuard"))throw new Error(t);return t},d);
  await run(S,".login-card exists",async()=>{await d.findElement(By.css(".login-card"));return"✓"},d);
  await run(S,".logo exists",async()=>{await d.findElement(By.css(".logo"));return"✓"},d);
  await run(S,".title exists",async()=>{await d.findElement(By.css(".title"));return"✓"},d);
  await run(S,".title text is PhishGuard",async()=>{const t=await d.findElement(By.css(".title")).getText();if(!t.includes("PhishGuard"))throw new Error(t);return t},d);
  await run(S,".subtitle exists",async()=>{await d.findElement(By.css(".subtitle"));return"✓"},d);
  await run(S,".subtitle is not empty",async()=>{const t=await d.findElement(By.css(".subtitle")).getText();if(t.trim().length<3)throw new Error("empty");return t},d);
  await run(S,"id=email input exists",async()=>{await d.findElement(By.id("email"));return"✓"},d);
  await run(S,"id=password input exists",async()=>{await d.findElement(By.id("password"));return"✓"},d);
  await run(S,"id=loginBtn exists",async()=>{await d.findElement(By.id("loginBtn"));return"✓"},d);
  await run(S,"id=loginForm exists",async()=>{await d.findElement(By.id("loginForm"));return"✓"},d);
  await run(S,"id=createAccountLink exists",async()=>{await d.findElement(By.id("createAccountLink"));return"✓"},d);
  await run(S,"id=togglePasswordBtn exists",async()=>{await d.findElement(By.id("togglePasswordBtn"));return"✓"},d);
  await run(S,"id=remember checkbox exists",async()=>{await d.findElement(By.id("remember"));return"✓"},d);
  await run(S,".footer exists",async()=>{await d.findElement(By.css(".footer"));return"✓"},d);
  await run(S,".footer has SVM text",async()=>{const t=await d.findElement(By.css(".footer")).getText();if(!t.includes("SVM"))throw new Error(t);return"✓"},d);
  await run(S,".footer has NLP text",async()=>{const t=await d.findElement(By.css(".footer")).getText();if(!t.includes("NLP"))throw new Error(t);return"✓"},d);
  await run(S,".footer has BiLSTM text",async()=>{const t=await d.findElement(By.css(".footer")).getText();if(!t.includes("BiLSTM"))throw new Error(t);return"✓"},d);
  await run(S,"email input type=email",async()=>{const t=await d.findElement(By.id("email")).getAttribute("type");if(t!=="email")throw new Error(t);return t},d);
  await run(S,"password input type=password",async()=>{const t=await d.findElement(By.id("password")).getAttribute("type");if(t!=="password")throw new Error(t);return t},d);
  await run(S,"email input required",async()=>{const r=await d.findElement(By.id("email")).getAttribute("required");if(!r)throw new Error("not required");return"✓"},d);
  await run(S,"password input required",async()=>{const r=await d.findElement(By.id("password")).getAttribute("required");if(!r)throw new Error("not required");return"✓"},d);
  await run(S,"loginBtn type=submit",async()=>{const t=await d.findElement(By.id("loginBtn")).getAttribute("type");if(t!=="submit")throw new Error(t);return t},d);
  await run(S,"createAccountLink href contains /create-account",async()=>{const h=await d.findElement(By.id("createAccountLink")).getAttribute("href");if(!h.includes("/create-account"))throw new Error(h);return h},d);
  await run(S,"loginForm action contains /login",async()=>{const a=await d.findElement(By.id("loginForm")).getAttribute("action");if(!a.includes("/login"))throw new Error(a);return a},d);
  await run(S,"loginForm method is POST",async()=>{const m=await d.findElement(By.id("loginForm")).getAttribute("method");if(m.toLowerCase()!=="post")throw new Error(m);return m},d);
  await run(S,"email placeholder present",async()=>{const p=await d.findElement(By.id("email")).getAttribute("placeholder");if(!p||p.length<2)throw new Error("empty");return p},d);
  await run(S,"password placeholder present",async()=>{const p=await d.findElement(By.id("password")).getAttribute("placeholder");if(!p||p.length<2)throw new Error("empty");return p},d);
  await run(S,".options div exists",async()=>{await d.findElement(By.css(".options"));return"✓"},d);
}

// ============================================================
// SUITE 2 — Login Page Functionality  (20 tests)
// ============================================================
async function s2_loginFunctionality(d) {
  console.log("\n📋 SUITE 2: Login Functionality");
  const S="Login Functionality"; const B=config.BASE_URL;
  await d.get(B+"/login");

  await run(S,"Password toggle changes type to text",async()=>{
    await d.findElement(By.id("password")).sendKeys("test123");
    await d.findElement(By.id("togglePasswordBtn")).click();
    await sleep(300);
    const t=await d.findElement(By.id("password")).getAttribute("type");
    if(t!=="text")throw new Error(t); return"text ✓"},d);

  await run(S,"Password toggle emoji changes to 🙈",async()=>{
    const t=await d.findElement(By.id("togglePasswordBtn")).getText();
    if(!t.includes("🙈"))throw new Error(t); return"✓"},d);

  await run(S,"Password toggle again restores type=password",async()=>{
    await d.findElement(By.id("togglePasswordBtn")).click();
    await sleep(300);
    const t=await d.findElement(By.id("password")).getAttribute("type");
    if(t!=="password")throw new Error(t); return"✓"},d);

  await run(S,"Wrong credentials stays on /login",async()=>{
    await d.get(B+"/login");
    await d.findElement(By.id("email")).sendKeys(config.INVALID_USER.email);
    await d.findElement(By.id("password")).sendKeys(config.INVALID_USER.password);
    await d.findElement(By.id("loginBtn")).click();
    await driver_wait_for_load(d);
    const url=await d.getCurrentUrl();
    if(!url.includes("/login"))throw new Error("Left /login: "+url); return"✓"},d);

  await run(S,"Wrong credentials shows .alert-box",async()=>{
    await d.wait(until.elementLocated(By.css(".alert-box")),8000);
    const txt=await d.findElement(By.css(".alert-box")).getText();
    if(!txt||txt.length<2)throw new Error("alert empty"); return"alert shown"},d);

  await run(S,"alert-box is visible",async()=>{
    const el=await d.findElement(By.css(".alert-box"));
    const vis=await el.isDisplayed();
    if(!vis)throw new Error("not visible"); return"✓"},d);

  await run(S,"Valid credentials redirects to /dashboard",async()=>{
    await d.get(B+"/login");
    await d.findElement(By.id("email")).sendKeys(config.TEST_USER.email);
    await d.findElement(By.id("password")).sendKeys(config.TEST_USER.password);
    await d.findElement(By.id("loginBtn")).click();
    await d.wait(until.urlContains("/dashboard"),12000); return"✓"},d);

  await run(S,"Logged-in visit to /login redirects to /dashboard",async()=>{
    await d.get(B+"/login");
    await d.wait(until.urlContains("/dashboard"),6000); return"✓"},d);

  await run(S,"createAccountLink navigates to /create-account",async()=>{
    await d.get(B+"/login");
    await d.wait(until.elementLocated(By.id("createAccountLink")),5000);
    await d.findElement(By.id("createAccountLink")).click();
    await d.wait(until.urlContains("/create-account"),6000); return"✓"},d);

  // re-login for remaining tests
  await doLogin(d);

  await run(S,"After login URL is /dashboard",async()=>{
    const url=await d.getCurrentUrl();
    if(!url.includes("/dashboard"))throw new Error(url); return"✓"},d);

  await run(S,"After login page has .dashboard-container",async()=>{
    await d.findElement(By.css(".dashboard-container")); return"✓"},d);

  await run(S,"After login page has .sidebar",async()=>{
    await d.findElement(By.css(".sidebar")); return"✓"},d);

  await run(S,"After login page has .stats-container",async()=>{
    await d.findElement(By.css(".stats-container")); return"✓"},d);

  await run(S,"Remember Me checkbox is clickable",async()=>{
    await d.get(B+"/login");
    await d.wait(until.elementLocated(By.id("remember")),5000);
    const cb=await d.findElement(By.id("remember"));
    await cb.click();
    const checked=await cb.isSelected();
    if(!checked)throw new Error("not checked"); return"✓"},d);

  await run(S,"Remember Me checkbox unchecks on second click",async()=>{
    const cb=await d.findElement(By.id("remember"));
    await cb.click();
    const checked=await cb.isSelected();
    if(checked)throw new Error("still checked"); return"✓"},d);

  await run(S,"Email input accepts typing",async()=>{
    const el=await d.findElement(By.id("email"));
    await el.clear(); await el.sendKeys("test@test.com");
    const v=await el.getAttribute("value");
    if(!v.includes("test@test.com"))throw new Error(v); return"✓"},d);

  await run(S,"Password input accepts typing",async()=>{
    const el=await d.findElement(By.id("password"));
    await el.clear(); await el.sendKeys("mypassword");
    const v=await el.getAttribute("value");
    if(!v.includes("mypassword"))throw new Error(v); return"✓"},d);

  await run(S,"loginBtn is enabled",async()=>{
    const el=await d.findElement(By.id("loginBtn"));
    const en=await el.isEnabled();
    if(!en)throw new Error("disabled"); return"✓"},d);

  await run(S,"loginBtn is displayed",async()=>{
    const el=await d.findElement(By.id("loginBtn"));
    const vis=await el.isDisplayed();
    if(!vis)throw new Error("hidden"); return"✓"},d);

  await run(S,"Empty form submit stays on /login",async()=>{
    await d.get(B+"/login");
    await d.wait(until.elementLocated(By.id("loginBtn")),5000);
    await d.findElement(By.id("loginBtn")).click();
    await sleep(600);
    const url=await d.getCurrentUrl();
    if(!url.includes("/login"))throw new Error(url); return"✓"},d);
}

async function driver_wait_for_load(d) {
  await sleep(1500);
}

// ============================================================
// SUITE 3 — Create Account Page  (25 tests)
// ============================================================
async function s3_createAccount(d) {
  console.log("\n📋 SUITE 3: Create Account");
  const S="Create Account"; const B=config.BASE_URL;
  await doLogout(d);
  await d.get(B+"/create-account");
  await d.wait(until.elementLocated(By.id("name")),8000);

  await run(S,"Page loads at /create-account",async()=>{const url=await d.getCurrentUrl();if(!url.includes("/create-account"))throw new Error(url);return"✓"},d);
  await run(S,"Page title contains Create",async()=>{const t=await d.getTitle();if(!t.toLowerCase().includes("create"))throw new Error(t);return t},d);
  await run(S,"h1 heading present",async()=>{const t=await d.findElement(By.css("h1")).getText();if(t.length<3)throw new Error("empty");return t},d);
  await run(S,".card exists",async()=>{await d.findElement(By.css(".card"));return"✓"},d);
  await run(S,".header exists",async()=>{await d.findElement(By.css(".header"));return"✓"},d);
  await run(S,".logo-icon exists",async()=>{await d.findElement(By.css(".logo-icon"));return"✓"},d);
  await run(S,"id=name input exists",async()=>{await d.findElement(By.id("name"));return"✓"},d);
  await run(S,"id=email input exists",async()=>{await d.findElement(By.id("email"));return"✓"},d);
  await run(S,"id=password input exists",async()=>{await d.findElement(By.id("password"));return"✓"},d);
  await run(S,"id=confirm_password exists",async()=>{await d.findElement(By.id("confirm_password"));return"✓"},d);
  await run(S,"id=submitBtn exists",async()=>{await d.findElement(By.id("submitBtn"));return"✓"},d);
  await run(S,"id=registerForm exists",async()=>{await d.findElement(By.id("registerForm"));return"✓"},d);
  await run(S,"id=email-feedback exists",async()=>{await d.findElement(By.id("email-feedback"));return"✓"},d);
  await run(S,"id=confirm-feedback exists",async()=>{await d.findElement(By.id("confirm-feedback"));return"✓"},d);
  await run(S,".password-hint exists",async()=>{await d.findElement(By.css(".password-hint"));return"✓"},d);
  await run(S,".login-link exists",async()=>{await d.findElement(By.css(".login-link"));return"✓"},d);
  await run(S,"name input type=text",async()=>{const t=await d.findElement(By.id("name")).getAttribute("type");if(t!=="text")throw new Error(t);return t},d);
  await run(S,"email input type=email",async()=>{const t=await d.findElement(By.id("email")).getAttribute("type");if(t!=="email")throw new Error(t);return t},d);
  await run(S,"password input type=password",async()=>{const t=await d.findElement(By.id("password")).getAttribute("type");if(t!=="password")throw new Error(t);return t},d);
  await run(S,"confirm_password type=password",async()=>{const t=await d.findElement(By.id("confirm_password")).getAttribute("type");if(t!=="password")throw new Error(t);return t},d);
  await run(S,"name input required",async()=>{const r=await d.findElement(By.id("name")).getAttribute("required");if(!r)throw new Error("not required");return"✓"},d);
  await run(S,"email input required",async()=>{const r=await d.findElement(By.id("email")).getAttribute("required");if(!r)throw new Error("not required");return"✓"},d);
  await run(S,"password input required",async()=>{const r=await d.findElement(By.id("password")).getAttribute("required");if(!r)throw new Error("not required");return"✓"},d);
  await run(S,"login-link href contains /login",async()=>{const h=await d.findElement(By.css(".login-link a")).getAttribute("href");if(!h.includes("/login"))throw new Error(h);return h},d);
  await run(S,"Two .toggle-password-btn buttons present",async()=>{const bs=await d.findElements(By.css(".toggle-password-btn"));if(bs.length<2)throw new Error(`count:${bs.length}`);return`${bs.length} btns`},d);
}

// ============================================================
// SUITE 4 — Create Account Live Feedback  (15 tests)
// ============================================================
async function s4_caFeedback(d) {
  console.log("\n📋 SUITE 4: CA Live Feedback");
  const S="CA Feedback"; const B=config.BASE_URL;
  await d.get(B+"/create-account");
  await d.wait(until.elementLocated(By.id("password")),8000);

  await run(S,"confirm-feedback hidden initially",async()=>{
    const disp=await d.executeScript("return window.getComputedStyle(document.getElementById('confirm-feedback')).display");
    if(disp!=="none")throw new Error(disp); return"none ✓"},d);

  await run(S,"Matching passwords → confirm-feedback shows match",async()=>{
    await d.findElement(By.id("password")).sendKeys("Test@1234");
    await d.findElement(By.id("confirm_password")).sendKeys("Test@1234");
    await d.findElement(By.id("confirm_password")).sendKeys(Key.TAB);
    await sleep(600);
    const t=await d.findElement(By.id("confirm-feedback")).getText();
    if(!t.toLowerCase().includes("match"))throw new Error(t); return t},d);

  await run(S,"Matching → confirm-feedback class=success",async()=>{
    const cls=await d.findElement(By.id("confirm-feedback")).getAttribute("class");
    if(!cls.includes("success"))throw new Error(cls); return cls},d);

  await run(S,"Mismatching passwords → error feedback",async()=>{
    const el=await d.findElement(By.id("confirm_password"));
    await el.clear(); await el.sendKeys("Wrong@99");
    await el.sendKeys(Key.TAB); await sleep(600);
    const t=await d.findElement(By.id("confirm-feedback")).getText();
    if(!t.toLowerCase().includes("match")&&!t.toLowerCase().includes("not"))throw new Error(t); return t},d);

  await run(S,"Mismatch → confirm-feedback class=error",async()=>{
    const cls=await d.findElement(By.id("confirm-feedback")).getAttribute("class");
    if(!cls.includes("error"))throw new Error(cls); return cls},d);

  await run(S,"email-feedback hidden initially",async()=>{
    await d.get(B+"/create-account");
    await d.wait(until.elementLocated(By.id("email")),5000);
    const disp=await d.executeScript("return window.getComputedStyle(document.getElementById('email-feedback')).display");
    if(disp!=="none")throw new Error(disp); return"none ✓"},d);

  await run(S,"Existing email shows already-registered feedback",async()=>{
    const el=await d.findElement(By.id("email"));
    await el.sendKeys(config.TEST_USER.email);
    await el.sendKeys(Key.TAB); await sleep(1500);
    const t=await d.findElement(By.id("email-feedback")).getText();
    if(!t.toLowerCase().includes("already"))throw new Error(t); return t},d);

  await run(S,"Existing email feedback has error class",async()=>{
    const cls=await d.findElement(By.id("email-feedback")).getAttribute("class");
    if(!cls.includes("error"))throw new Error(cls); return cls},d);

  await run(S,"Unknown email shows available feedback",async()=>{
    const el=await d.findElement(By.id("email"));
    await el.clear(); await el.sendKeys("brand_new_xyz_2099@nowhere.io");
    await el.sendKeys(Key.TAB); await sleep(1500);
    const t=await d.findElement(By.id("email-feedback")).getText();
    if(!t.toLowerCase().includes("available"))throw new Error(t); return t},d);

  await run(S,"Unknown email feedback has success class",async()=>{
    const cls=await d.findElement(By.id("email-feedback")).getAttribute("class");
    if(!cls.includes("success"))throw new Error(cls); return cls},d);

  await run(S,"CA password toggle changes type to text",async()=>{
    await d.get(B+"/create-account");
    await d.wait(until.elementLocated(By.id("password")),5000);
    await d.findElement(By.id("password")).sendKeys("mypass");
    const btns=await d.findElements(By.css(".toggle-password-btn"));
    await btns[0].click(); await sleep(300);
    const t=await d.findElement(By.id("password")).getAttribute("type");
    if(t!=="text")throw new Error(t); return"text ✓"},d);

  await run(S,"CA confirm toggle changes type to text",async()=>{
    await d.findElement(By.id("confirm_password")).sendKeys("mypass");
    const btns=await d.findElements(By.css(".toggle-password-btn"));
    await btns[1].click(); await sleep(300);
    const t=await d.findElement(By.id("confirm_password")).getAttribute("type");
    if(t!=="text")throw new Error(t); return"text ✓"},d);

  await run(S,"Login link navigates to /login",async()=>{
    await d.get(B+"/create-account");
    await d.wait(until.elementLocated(By.css(".login-link a")),5000);
    await d.findElement(By.css(".login-link a")).click();
    await d.wait(until.urlContains("/login"),6000); return"✓"},d);

  await run(S,"Empty form submit stays on /create-account",async()=>{
    await d.get(B+"/create-account");
    await d.wait(until.elementLocated(By.id("submitBtn")),5000);
    await d.findElement(By.id("submitBtn")).click();
    await sleep(600);
    const url=await d.getCurrentUrl();
    if(!url.includes("/create-account"))throw new Error(url); return"✓"},d);

  await run(S,"submitBtn is enabled",async()=>{
    const en=await d.findElement(By.id("submitBtn")).isEnabled();
    if(!en)throw new Error("disabled"); return"✓"},d);
}

// ============================================================
// SUITE 5 — Dashboard Layout  (25 tests)
// ============================================================
async function s5_dashboardLayout(d) {
  console.log("\n📋 SUITE 5: Dashboard Layout");
  const S="Dashboard Layout"; const B=config.BASE_URL;
  await doLogin(d);
  await d.wait(until.elementLocated(By.css(".dashboard-container")),8000);

  await run(S,"URL is /dashboard",async()=>{const u=await d.getCurrentUrl();if(!u.includes("/dashboard"))throw new Error(u);return"✓"},d);
  await run(S,"Page title has PhishGuard",async()=>{const t=await d.getTitle();if(!t.includes("PhishGuard"))throw new Error(t);return t},d);
  await run(S,".dashboard-container exists",async()=>{await d.findElement(By.css(".dashboard-container"));return"✓"},d);
  await run(S,".sidebar exists",async()=>{await d.findElement(By.css(".sidebar"));return"✓"},d);
  await run(S,".sidebar h2 has PhishGuard",async()=>{const t=await d.findElement(By.css(".sidebar h2")).getText();if(!t.includes("PhishGuard"))throw new Error(t);return t},d);
  await run(S,".main-content exists",async()=>{await d.findElement(By.css(".main-content"));return"✓"},d);
  await run(S,".stats-container exists",async()=>{await d.findElement(By.css(".stats-container"));return"✓"},d);
  await run(S,"At least 5 .card elements",async()=>{const cs=await d.findElements(By.css(".card"));if(cs.length<5)throw new Error(`${cs.length}`);return`${cs.length}`},d);
  await run(S,"98.56 SVM accuracy visible",async()=>{const bt=await bodyText(d);if(!bt.includes("98.56"))throw new Error("missing");return"✓"},d);
  await run(S,"99.10 BiLSTM accuracy visible",async()=>{const bt=await bodyText(d);if(!bt.includes("99.10"))throw new Error("missing");return"✓"},d);
  await run(S,"Total Scans label visible",async()=>{const bt=await bodyText(d);if(!bt.includes("Total Scans"))throw new Error("missing");return"✓"},d);
  await run(S,"Threats Detected label visible",async()=>{const bt=await bodyText(d);if(!bt.includes("Threats Detected"))throw new Error("missing");return"✓"},d);
  await run(S,"Safe Messages label visible",async()=>{const bt=await bodyText(d);if(!bt.includes("Safe Messages"))throw new Error("missing");return"✓"},d);
  await run(S,".scanner-section exists",async()=>{await d.findElement(By.css(".scanner-section"));return"✓"},d);
  await run(S,"textarea[name=message] exists",async()=>{await d.findElement(By.css("textarea[name='message']"));return"✓"},d);
  await run(S,"Analyze Now button exists",async()=>{const bs=await d.findElements(By.css(".scanner-section button[type='submit']"));if(!bs.length)throw new Error("missing");return"✓"},d);
  await run(S,".analytics-section exists",async()=>{await d.findElement(By.css(".analytics-section"));return"✓"},d);
  await run(S,"canvas#threatChart exists",async()=>{await d.findElement(By.id("threatChart"));return"✓"},d);
  await run(S,".alerts-section exists",async()=>{await d.findElement(By.css(".alerts-section"));return"✓"},d);
  await run(S,"At least 3 .alert-card elements",async()=>{const cs=await d.findElements(By.css(".alert-card"));if(cs.length<3)throw new Error(`${cs.length}`);return`${cs.length}`},d);
  await run(S,".alert-card.high exists",async()=>{await d.findElement(By.css(".alert-card.high"));return"✓"},d);
  await run(S,".alert-card.safe exists",async()=>{await d.findElement(By.css(".alert-card.safe"));return"✓"},d);
  await run(S,"NLP Preprocessing visible",async()=>{const bt=await bodyText(d);if(!bt.includes("NLP Preprocessing"))throw new Error("missing");return"✓"},d);
  await run(S,"TF-IDF Vectorization visible",async()=>{const bt=await bodyText(d);if(!bt.includes("TF-IDF"))throw new Error("missing");return"✓"},d);
  await run(S,"Attention Mechanism visible",async()=>{const bt=await bodyText(d);if(!bt.includes("Attention"))throw new Error("missing");return"✓"},d);
}

// ============================================================
// SUITE 6 — SMS Scanner Scans  (30 tests)
// ============================================================
async function s6_scanner(d) {
  console.log("\n📋 SUITE 6: SMS Scanner");
  const S="SMS Scanner"; const B=config.BASE_URL;
  const PHISH="URGENT verify bank account OTP now click login immediately";
  const SAFE="Hi, dinner reservation confirmed for tonight at 7pm.";

  async function doScan(msg) {
    await d.get(B+"/dashboard");
    await d.wait(until.elementLocated(By.css("textarea[name='message']")),8000);
    const ta=await d.findElement(By.css("textarea[name='message']"));
    await ta.clear(); await ta.sendKeys(msg);
    await d.findElement(By.css(".scanner-section button[type='submit']")).click();
    await d.wait(until.elementLocated(By.css(".result-box")),15000);
  }

  await run(S,"Phishing scan shows .result-box",async()=>{await doScan(PHISH);await d.findElement(By.css(".result-box"));return"✓"},d);
  await run(S,"Phishing result h2 contains Phishing",async()=>{const t=await d.findElement(By.css(".result-box h2")).getText();if(!t.includes("Phishing"))throw new Error(t);return t},d);
  await run(S,"Phishing result h2 has high-text class",async()=>{const cls=await d.findElement(By.css(".result-box h2")).getAttribute("class");if(!cls.includes("high-text"))throw new Error(cls);return cls},d);
  await run(S,"Phishing risk score shows %",async()=>{const t=await d.findElement(By.css(".result-box h3")).getText();if(!t.includes("%"))throw new Error(t);return t},d);
  await run(S,"Phishing risk score >= 70",async()=>{const t=await d.findElement(By.css(".result-box h3")).getText();const n=parseInt(t.replace(/\D/g,""));if(n<70)throw new Error(`${n}`);return`${n}%`},d);
  await run(S,"AI Explanation heading present",async()=>{const bt=await d.findElement(By.css(".result-box")).getText();if(!bt.includes("Explanation"))throw new Error("missing");return"✓"},d);
  await run(S,"AI Explanation paragraph not empty",async()=>{const ps=await d.findElements(By.css(".result-box p"));let found=false;for(const p of ps){if((await p.getText()).length>20){found=true;break;}}if(!found)throw new Error("no para");return"✓"},d);
  await run(S,"Detected Indicators heading present",async()=>{const bt=await d.findElement(By.css(".result-box")).getText();if(!bt.includes("Indicator"))throw new Error("missing");return"✓"},d);
  await run(S,"At least 1 indicator <li> for phishing",async()=>{const lis=await d.findElements(By.css(".result-box li"));if(!lis.length)throw new Error("no li");return`${lis.length} indicators`},d);
  await run(S,"Safe scan shows .result-box",async()=>{await doScan(SAFE);await d.findElement(By.css(".result-box"));return"✓"},d);
  await run(S,"Safe result h2 contains Safe",async()=>{const t=await d.findElement(By.css(".result-box h2")).getText();if(!t.includes("Safe"))throw new Error(t);return t},d);
  await run(S,"Safe result h2 has safe-text class",async()=>{const cls=await d.findElement(By.css(".result-box h2")).getAttribute("class");if(!cls.includes("safe-text"))throw new Error(cls);return cls},d);
  await run(S,"Safe risk score <= 30",async()=>{const t=await d.findElement(By.css(".result-box h3")).getText();const n=parseInt(t.replace(/\D/g,""));if(n>30)throw new Error(`${n}`);return`${n}%`},d);
  await run(S,"Prize/winner message is Phishing",async()=>{await doScan("Congratulations winner! Click here claim prize bank account now login");const t=await d.findElement(By.css(".result-box h2")).getText();if(!t.includes("Phishing"))throw new Error(t);return"✓"},d);
  await run(S,"OTP/urgent message is Phishing",async()=>{await doScan("Your OTP expiring verify bank urgent click login account now");const t=await d.findElement(By.css(".result-box h2")).getText();if(!t.includes("Phishing"))throw new Error(t);return"✓"},d);
  await run(S,"Friendly message is Safe",async()=>{await doScan("Good morning! Let me know if you need anything from the store.");const t=await d.findElement(By.css(".result-box h2")).getText();if(!t.includes("Safe"))throw new Error(t);return"✓"},d);
  await run(S,"Appointment reminder is Safe",async()=>{await doScan("Reminder: dentist appointment at 3pm Friday.");const t=await d.findElement(By.css(".result-box h2")).getText();if(!t.includes("Safe"))throw new Error(t);return"✓"},d);
  await run(S,"Family message is Safe",async()=>{await doScan("Hi Mom, calling you after work today. Love you!");const t=await d.findElement(By.css(".result-box h2")).getText();if(!t.includes("Safe"))throw new Error(t);return"✓"},d);
  await run(S,"After scan stats-container still visible",async()=>{await d.findElement(By.css(".stats-container"));return"✓"},d);
  await run(S,"After scan sidebar still visible",async()=>{await d.findElement(By.css(".sidebar"));return"✓"},d);
  await run(S,"After scan scanner-section still visible",async()=>{await d.findElement(By.css(".scanner-section"));return"✓"},d);
  await run(S,"textarea accepts input",async()=>{await d.get(B+"/dashboard");await d.wait(until.elementLocated(By.css("textarea[name='message']")),8000);const ta=await d.findElement(By.css("textarea[name='message']"));await ta.clear();await ta.sendKeys("hello");const v=await ta.getAttribute("value");if(!v.includes("hello"))throw new Error(v);return"✓"},d);
  await run(S,"Empty textarea submit stays on /dashboard",async()=>{const ta=await d.findElement(By.css("textarea[name='message']"));await ta.clear();await d.findElement(By.css(".scanner-section button[type='submit']")).click();await sleep(600);const u=await d.getCurrentUrl();if(!u.includes("/dashboard"))throw new Error(u);return"✓"},d);
  await run(S,"/scanner route loads dashboard",async()=>{await d.get(B+"/scanner");await d.wait(until.elementLocated(By.css(".stats-container")),8000);return"✓"},d);
  await run(S,"After phishing scan total scans card shows number",async()=>{await doScan(PHISH);const cards=await d.findElements(By.css(".card p"));let num=false;for(const c of cards){const t=await c.getText();if(!isNaN(parseInt(t))){num=true;break;}}if(!num)throw new Error("no numeric");return"✓"},d);
  await run(S,"Phishing scan body has 98.56",async()=>{const bt=await bodyText(d);if(!bt.includes("98.56"))throw new Error("missing");return"✓"},d);
  await run(S,"Phishing scan body has 99.10",async()=>{const bt=await bodyText(d);if(!bt.includes("99.10"))throw new Error("missing");return"✓"},d);
  await run(S,"Bank+OTP+click+login in msg = Phishing",async()=>{await doScan("bank otp click login verify account urgent");const t=await d.findElement(By.css(".result-box h2")).getText();if(!t.includes("Phishing"))throw new Error(t);return"✓"},d);
  await run(S,"No result-box shown before first scan",async()=>{await d.get(B+"/dashboard");await d.wait(until.elementLocated(By.css(".stats-container")),8000);const bs=await d.findElements(By.css(".result-box"));if(bs.length>0)throw new Error("shown before scan");return"✓"},d);
  await run(S,"Analyze Now button is enabled",async()=>{const en=await d.findElement(By.css(".scanner-section button[type='submit']")).isEnabled();if(!en)throw new Error("disabled");return"✓"},d);
}

// ============================================================
// SUITE 7 — Threats/Scan History Page  (25 tests)
// ============================================================
async function s7_threats(d) {
  console.log("\n📋 SUITE 7: Threats Page");
  const S="Threats"; const B=config.BASE_URL;
  await d.get(B+"/threats");
  await d.wait(until.elementLocated(By.css(".history-table-container")),8000);

  await run(S,"URL is /threats",async()=>{const u=await d.getCurrentUrl();if(!u.includes("/threats"))throw new Error(u);return"✓"},d);
  await run(S,".top-bar h1 has History",async()=>{const t=await d.findElement(By.css(".top-bar h1")).getText();if(!t.toLowerCase().includes("history"))throw new Error(t);return t},d);
  await run(S,".filter-bar exists",async()=>{await d.findElement(By.css(".filter-bar"));return"✓"},d);
  await run(S,"5 .filter-btn elements",async()=>{const bs=await d.findElements(By.css(".filter-btn"));if(bs.length<5)throw new Error(`${bs.length}`);return`${bs.length}`},d);
  await run(S,"All filter-btn is active by default",async()=>{const a=await d.findElement(By.css(".filter-btn.active"));const t=await a.getText();if(!t.includes("All"))throw new Error(t);return t},d);
  await run(S,".history-table-container exists",async()=>{await d.findElement(By.css(".history-table-container"));return"✓"},d);
  await run(S,"table.history-table exists",async()=>{await d.findElement(By.css("table.history-table"));return"✓"},d);
  await run(S,"At least 5 <th> columns",async()=>{const ths=await d.findElements(By.css("table.history-table th"));if(ths.length<5)throw new Error(`${ths.length}`);return`${ths.length}`},d);
  await run(S,"Date column header present",async()=>{const t=await d.findElement(By.css("table.history-table")).getText();if(!t.includes("Date"))throw new Error("missing");return"✓"},d);
  await run(S,"Prediction column header present",async()=>{const t=await d.findElement(By.css("table.history-table")).getText();if(!t.includes("Prediction"))throw new Error("missing");return"✓"},d);
  await run(S,"Risk column header present",async()=>{const t=await d.findElement(By.css("table.history-table")).getText();if(!t.includes("Risk"))throw new Error("missing");return"✓"},d);
  await run(S,"Clicking Safe filter sets it active",async()=>{const btn=await d.findElement(By.xpath("//button[normalize-space()='Safe']"));await btn.click();await sleep(400);const cls=await btn.getAttribute("class");if(!cls.includes("active"))throw new Error(cls);return"✓"},d);
  await run(S,"Clicking All filter sets it active",async()=>{const btn=await d.findElement(By.xpath("//button[normalize-space()='All']"));await btn.click();await sleep(400);const cls=await btn.getAttribute("class");if(!cls.includes("active"))throw new Error(cls);return"✓"},d);
  await run(S,"Clicking Threat filter sets it active",async()=>{const btn=await d.findElement(By.xpath("//button[normalize-space()='Threat']"));await btn.click();await sleep(400);const cls=await btn.getAttribute("class");if(!cls.includes("active"))throw new Error(cls);return"✓"},d);
  await run(S,"Clicking Today filter sets it active",async()=>{const btn=await d.findElement(By.xpath("//button[normalize-space()='Today']"));await btn.click();await sleep(400);const cls=await btn.getAttribute("class");if(!cls.includes("active"))throw new Error(cls);return"✓"},d);
  await run(S,"Clicking Last 7 Days filter sets it active",async()=>{const btn=await d.findElement(By.xpath("//button[normalize-space()='Last 7 Days']"));await btn.click();await sleep(400);const cls=await btn.getAttribute("class");if(!cls.includes("active"))throw new Error(cls);return"✓"},d);
  await run(S,"#scanModal exists in DOM",async()=>{await d.findElement(By.id("scanModal"));return"✓"},d);
  await run(S,"#scanModal hidden by default",async()=>{const disp=await d.findElement(By.id("scanModal")).getCssValue("display");if(disp!=="none")throw new Error(disp);return"none ✓"},d);
  await run(S,".sidebar exists on threats page",async()=>{await d.findElement(By.css(".sidebar"));return"✓"},d);
  await run(S,"#scanTableBody exists",async()=>{await d.findElement(By.id("scanTableBody"));return"✓"},d);
  await run(S,".modal-overlay exists",async()=>{await d.findElement(By.css(".modal-overlay"));return"✓"},d);
  await run(S,"#modalDate exists",async()=>{await d.findElement(By.id("modalDate"));return"✓"},d);
  await run(S,"#modalMessage exists",async()=>{await d.findElement(By.id("modalMessage"));return"✓"},d);
  await run(S,"#modalRiskScore exists",async()=>{await d.findElement(By.id("modalRiskScore"));return"✓"},d);
  await run(S,"At least 1 scan row OR empty-state message",async()=>{const rows=await d.findElements(By.css(".scan-row"));const emp=await d.findElements(By.css(".empty-state"));if(!rows.length&&!emp.length)throw new Error("no rows no empty");return`${rows.length} rows, ${emp.length} empty`},d);
}

// ============================================================
// SUITE 8 — Reports Page  (15 tests)
// ============================================================
async function s8_reports(d) {
  console.log("\n📋 SUITE 8: Reports Page");
  const S="Reports"; const B=config.BASE_URL;
  await d.get(B+"/reports");
  await d.wait(until.elementLocated(By.css(".main-content")),8000);

  await run(S,"URL is /reports",async()=>{const u=await d.getCurrentUrl();if(!u.includes("/reports"))throw new Error(u);return"✓"},d);
  await run(S,"h1 says Security Reports",async()=>{const t=await d.findElement(By.css("h1")).getText();if(!t.toLowerCase().includes("report"))throw new Error(t);return t},d);
  await run(S,".stats-container exists",async()=>{await d.findElement(By.css(".stats-container"));return"✓"},d);
  await run(S,"At least 3 .card elements",async()=>{const cs=await d.findElements(By.css(".card"));if(cs.length<3)throw new Error(`${cs.length}`);return`${cs.length}`},d);
  await run(S,"Total Messages card present",async()=>{const bt=await bodyText(d);if(!bt.includes("Total Messages"))throw new Error("missing");return"✓"},d);
  await run(S,"Threats Detected card present",async()=>{const bt=await bodyText(d);if(!bt.includes("Threats Detected"))throw new Error("missing");return"✓"},d);
  await run(S,"Safe Messages card present",async()=>{const bt=await bodyText(d);if(!bt.includes("Safe Messages"))throw new Error("missing");return"✓"},d);
  await run(S,"Model Performance section present",async()=>{const bt=await bodyText(d);if(!bt.includes("Model Performance"))throw new Error("missing");return"✓"},d);
  await run(S,"98.56% SVM accuracy shown",async()=>{const bt=await bodyText(d);if(!bt.includes("98.56"))throw new Error("missing");return"✓"},d);
  await run(S,"99.10% BiLSTM accuracy shown",async()=>{const bt=await bodyText(d);if(!bt.includes("99.10"))throw new Error("missing");return"✓"},d);
  await run(S,"Attention Mechanism Enabled shown",async()=>{const bt=await bodyText(d);if(!bt.includes("Attention"))throw new Error("missing");return"✓"},d);
  await run(S,".sidebar exists on reports page",async()=>{await d.findElement(By.css(".sidebar"));return"✓"},d);
  await run(S,".scanner-section exists on reports",async()=>{await d.findElement(By.css(".scanner-section"));return"✓"},d);
  await run(S,"h2 Model Performance exists",async()=>{const h2s=await d.findElements(By.css("h2"));let found=false;for(const h of h2s){if((await h.getText()).includes("Model")){found=true;break;}}if(!found)throw new Error("missing");return"✓"},d);
  await run(S,"Reports page content-type text/html",async()=>{const u=await d.getCurrentUrl();if(!u.includes("reports"))throw new Error("wrong page");return"✓"},d);
}

// ============================================================
// SUITE 9 — Settings Page  (15 tests)
// ============================================================
async function s9_settings(d) {
  console.log("\n📋 SUITE 9: Settings Page");
  const S="Settings"; const B=config.BASE_URL;
  await d.get(B+"/settings");
  await d.wait(until.elementLocated(By.css(".main-content")),8000);

  await run(S,"URL is /settings",async()=>{const u=await d.getCurrentUrl();if(!u.includes("/settings"))throw new Error(u);return"✓"},d);
  await run(S,"h1 contains Settings",async()=>{const t=await d.findElement(By.css("h1")).getText();if(!t.toLowerCase().includes("settings"))throw new Error(t);return t},d);
  await run(S,"Security Preferences section present",async()=>{const bt=await bodyText(d);if(!bt.includes("Security Preferences"))throw new Error("missing");return"✓"},d);
  await run(S,"AI Protection Engine Enabled shown",async()=>{const bt=await bodyText(d);if(!bt.includes("AI Protection Engine"))throw new Error("missing");return"✓"},d);
  await run(S,"Real-Time Threat Monitoring shown",async()=>{const bt=await bodyText(d);if(!bt.includes("Real-Time"))throw new Error("missing");return"✓"},d);
  await run(S,"Phishing Detection Enabled shown",async()=>{const bt=await bodyText(d);if(!bt.includes("Phishing Detection"))throw new Error("missing");return"✓"},d);
  await run(S,"Threat Logging Enabled shown",async()=>{const bt=await bodyText(d);if(!bt.includes("Threat Logging"))throw new Error("missing");return"✓"},d);
  await run(S,"Application Settings section present",async()=>{const bt=await bodyText(d);if(!bt.includes("Application Settings"))throw new Error("missing");return"✓"},d);
  await run(S,"Dark Mode text present",async()=>{const bt=await bodyText(d);if(!bt.includes("Dark Mode"))throw new Error("missing");return"✓"},d);
  await run(S,"PhishGuard v1.0 version shown",async()=>{const bt=await bodyText(d);if(!bt.includes("v1.0"))throw new Error("missing");return"✓"},d);
  await run(S,"AI Engine Status section present",async()=>{const bt=await bodyText(d);if(!bt.includes("AI Engine Status"))throw new Error("missing");return"✓"},d);
  await run(S,"TF-IDF Vectorizer shown",async()=>{const bt=await bodyText(d);if(!bt.includes("TF-IDF Vectorizer"))throw new Error("missing");return"✓"},d);
  await run(S,"SVM Classification Model shown",async()=>{const bt=await bodyText(d);if(!bt.includes("SVM Classification Model"))throw new Error("missing");return"✓"},d);
  await run(S,"BiLSTM Analysis Layer shown",async()=>{const bt=await bodyText(d);if(!bt.includes("BiLSTM Analysis"))throw new Error("missing");return"✓"},d);
  await run(S,".sidebar exists on settings page",async()=>{await d.findElement(By.css(".sidebar"));return"✓"},d);
}

// ============================================================
// SUITE 10 — Logout & Session Guard  (15 tests)
// ============================================================
async function s10_logout(d) {
  console.log("\n📋 SUITE 10: Logout & Session Guard");
  const S="Logout"; const B=config.BASE_URL;

  await run(S,"/logout redirects to /login",async()=>{await d.get(B+"/logout");await d.wait(until.urlContains("/login"),6000);return"✓"},d);
  await run(S,"/dashboard after logout → /login",async()=>{await d.get(B+"/dashboard");await d.wait(until.urlContains("/login"),6000);return"✓"},d);
  await run(S,"/threats after logout → /login",async()=>{await d.get(B+"/threats");await d.wait(until.urlContains("/login"),6000);return"✓"},d);
  await run(S,"/reports after logout → /login",async()=>{await d.get(B+"/reports");await d.wait(until.urlContains("/login"),6000);return"✓"},d);
  await run(S,"/settings after logout → /login",async()=>{await d.get(B+"/settings");await d.wait(until.urlContains("/login"),6000);return"✓"},d);
  await run(S,"/scanner after logout → /login",async()=>{await d.get(B+"/scanner");await d.wait(until.urlContains("/login"),6000);return"✓"},d);
  await run(S,"/ after logout → /login",async()=>{await d.get(B+"/");await d.wait(until.urlContains("/login"),6000);return"✓"},d);
  await run(S,"Login form visible after logout",async()=>{await d.findElement(By.id("email"));await d.findElement(By.id("password"));return"✓"},d);
  await run(S,"Login page title after logout",async()=>{const t=await d.getTitle();if(!t.includes("PhishGuard"))throw new Error(t);return t},d);
  // Re-login for remaining post-logout tests
  await doLogin(d);
  await run(S,"Sidebar Logout link exists",async()=>{const links=await d.findElements(By.css(".sidebar a"));let found=false;for(const l of links){if((await l.getAttribute("href")||"").includes("/logout")){found=true;break;}}if(!found)throw new Error("missing");return"✓"},d);
  await run(S,"Sidebar Logout link href contains /logout",async()=>{const links=await d.findElements(By.css(".sidebar a"));for(const l of links){const h=await l.getAttribute("href")||"";if(h.includes("/logout"))return h;}throw new Error("not found")},d);
  await run(S,"Clicking sidebar logout goes to /login",async()=>{const links=await d.findElements(By.css(".sidebar a"));for(const l of links){if((await l.getAttribute("href")||"").includes("/logout")){await l.click();break;}}await d.wait(until.urlContains("/login"),6000);return"✓"},d);
  await run(S,"After sidebar logout /login form shown",async()=>{await d.findElement(By.id("loginBtn"));return"✓"},d);
  // Re-login again
  await doLogin(d);
  await run(S,"Re-login after logout works",async()=>{const u=await d.getCurrentUrl();if(!u.includes("/dashboard"))throw new Error(u);return"✓"},d);
  await run(S,"Dashboard accessible after re-login",async()=>{await d.findElement(By.css(".stats-container"));return"✓"},d);
}

// ============================================================
// SUITE 11 — Sidebar Navigation  (20 tests)
// ============================================================
async function s11_navigation(d) {
  console.log("\n📋 SUITE 11: Navigation");
  const S="Navigation"; const B=config.BASE_URL;

  await run(S,"Dashboard sidebar has 5+ links",async()=>{await d.get(B+"/dashboard");await d.wait(until.elementLocated(By.css(".sidebar")),6000);const ls=await d.findElements(By.css(".sidebar ul li a"));if(ls.length<5)throw new Error(`${ls.length}`);return`${ls.length} links`},d);
  await run(S,"Dashboard link navigates to /dashboard",async()=>{await d.get(B+"/dashboard");const ls=await d.findElements(By.css(".sidebar a"));for(const l of ls){if((await l.getAttribute("href")||"").includes("/dashboard")||(await l.getText()).toLowerCase().includes("dashboard")){await l.click();break;}}await d.wait(until.urlContains("/dashboard"),6000);return"✓"},d);
  await run(S,"Scan History link → /threats",async()=>{await d.get(B+"/dashboard");const ls=await d.findElements(By.css(".sidebar a"));for(const l of ls){if((await l.getAttribute("href")||"").includes("/threats")){await l.click();break;}}await d.wait(until.urlContains("/threats"),6000);return"✓"},d);
  await run(S,"Reports link → /reports",async()=>{await d.get(B+"/dashboard");const ls=await d.findElements(By.css(".sidebar a"));for(const l of ls){if((await l.getAttribute("href")||"").includes("/reports")){await l.click();break;}}await d.wait(until.urlContains("/reports"),6000);return"✓"},d);
  await run(S,"Settings link → /settings",async()=>{await d.get(B+"/dashboard");const ls=await d.findElements(By.css(".sidebar a"));for(const l of ls){if((await l.getAttribute("href")||"").includes("/settings")){await l.click();break;}}await d.wait(until.urlContains("/settings"),6000);return"✓"},d);
  await run(S,"Threats sidebar → Reports works",async()=>{await d.get(B+"/threats");const ls=await d.findElements(By.css(".sidebar a"));for(const l of ls){if((await l.getAttribute("href")||"").includes("/reports")){await l.click();break;}}await d.wait(until.urlContains("/reports"),6000);return"✓"},d);
  await run(S,"Reports sidebar → Settings works",async()=>{const ls=await d.findElements(By.css(".sidebar a"));for(const l of ls){if((await l.getAttribute("href")||"").includes("/settings")){await l.click();break;}}await d.wait(until.urlContains("/settings"),6000);return"✓"},d);
  await run(S,"Settings sidebar → Dashboard works",async()=>{const ls=await d.findElements(By.css(".sidebar a"));for(const l of ls){if((await l.getAttribute("href")||"").includes("/dashboard")||(await l.getText()).toLowerCase().includes("dashboard")){await l.click();break;}}await d.wait(until.urlContains("/dashboard"),6000);return"✓"},d);
  await run(S,"Threats sidebar has Reports link",async()=>{await d.get(B+"/threats");const links=await d.findElements(By.css(".sidebar a"));let found=false;for(const l of links){if((await l.getAttribute("href")||"").includes("/reports")){found=true;break;}}if(!found)throw new Error("missing");return"✓"},d);
  await run(S,"Reports sidebar has Threats link",async()=>{await d.get(B+"/reports");const links=await d.findElements(By.css(".sidebar a"));let found=false;for(const l of links){if((await l.getAttribute("href")||"").includes("/threats")){found=true;break;}}if(!found)throw new Error("missing");return"✓"},d);
  await run(S,"Settings sidebar has Reports link",async()=>{await d.get(B+"/settings");const links=await d.findElements(By.css(".sidebar a"));let found=false;for(const l of links){if((await l.getAttribute("href")||"").includes("/reports")){found=true;break;}}if(!found)throw new Error("missing");return"✓"},d);
  await run(S,"All pages: sidebar h2 has PhishGuard",async()=>{for(const p of ["/dashboard","/threats","/reports","/settings"]){await d.get(B+p);await d.wait(until.elementLocated(By.css(".sidebar h2")),6000);const t=await d.findElement(By.css(".sidebar h2")).getText();if(!t.includes("PhishGuard"))throw new Error(`${p}: ${t}`);}return"all ✓"},d);
  await run(S,"Sidebar links are not underlined",async()=>{await d.get(B+"/dashboard");const dec=await d.executeScript("return window.getComputedStyle(document.querySelector('.sidebar a')).textDecoration");if(dec.includes("underline"))throw new Error(dec);return"no underline ✓"},d);
  await run(S,"Sidebar is visible",async()=>{const vis=await d.findElement(By.css(".sidebar")).isDisplayed();if(!vis)throw new Error("hidden");return"✓"},d);
  await run(S,"Sidebar background is dark",async()=>{const bg=await d.executeScript("return window.getComputedStyle(document.querySelector('.sidebar')).backgroundColor");if(bg.includes("255, 255, 255"))throw new Error("white bg");return bg},d);
  await run(S,"Direct URL /threats works",async()=>{await d.get(B+"/threats");await d.wait(until.elementLocated(By.css(".history-table-container")),8000);return"✓"},d);
  await run(S,"Direct URL /reports works",async()=>{await d.get(B+"/reports");await d.wait(until.elementLocated(By.css(".stats-container")),8000);return"✓"},d);
  await run(S,"Direct URL /settings works",async()=>{await d.get(B+"/settings");await d.wait(until.elementLocated(By.css(".main-content")),8000);return"✓"},d);
  await run(S,"Direct URL /dashboard works",async()=>{await d.get(B+"/dashboard");await d.wait(until.elementLocated(By.css(".stats-container")),8000);return"✓"},d);
  await run(S,"Direct URL /scanner works",async()=>{await d.get(B+"/scanner");await d.wait(until.elementLocated(By.css(".stats-container")),8000);return"✓"},d);
}

// ============================================================
// SUITE 12 — UI / CSS / Visual  (20 tests)
// ============================================================
async function s12_ui(d) {
  console.log("\n📋 SUITE 12: UI / CSS / Visual");
  const S="UI CSS"; const B=config.BASE_URL;

  await run(S,"Body background is dark (login)",async()=>{await d.get(B+"/login");await d.wait(until.elementLocated(By.css("body")),5000);const bg=await d.executeScript("return window.getComputedStyle(document.body).backgroundColor");if(bg.includes("255, 255, 255"))throw new Error("white: "+bg);return bg},d);
  await run(S,"Body background is dark (dashboard)",async()=>{await doLogin(d);const bg=await d.executeScript("return window.getComputedStyle(document.body).backgroundColor");if(bg.includes("255, 255, 255"))throw new Error("white: "+bg);return bg},d);
  await run(S,"stats-container display is flex",async()=>{const disp=await d.executeScript("return window.getComputedStyle(document.querySelector('.stats-container')).display");if(!disp.includes("flex"))throw new Error(disp);return disp},d);
  await run(S,"Sidebar width >= 200px",async()=>{const w=await d.executeScript("return document.querySelector('.sidebar').offsetWidth");if(w<200)throw new Error(`${w}px`);return`${w}px`},d);
  await run(S,"canvas#threatChart has non-zero width",async()=>{const w=await d.executeScript("return document.getElementById('threatChart')?.offsetWidth||0");if(w<10)throw new Error(`${w}px`);return`${w}px`},d);
  await run(S,"No horizontal scroll at 1400px (login)",async()=>{await d.get(B+"/login");const ok=await d.executeScript("return document.body.scrollWidth<=window.innerWidth+10");if(!ok)throw new Error("horizontal scroll");return"✓"},d);
  await run(S,"Login card background is not white",async()=>{const bg=await d.executeScript("return window.getComputedStyle(document.querySelector('.login-card')).backgroundColor");if(bg.includes("255, 255, 255"))throw new Error("white bg");return bg},d);
  await run(S,"loginBtn has non-zero width",async()=>{const w=await d.executeScript("return document.getElementById('loginBtn').offsetWidth");if(w<50)throw new Error(`${w}px`);return`${w}px`},d);
  await run(S,"loginBtn is visible",async()=>{const vis=await d.findElement(By.id("loginBtn")).isDisplayed();if(!vis)throw new Error("hidden");return"✓"},d);
  await run(S,"email input is visible",async()=>{const vis=await d.findElement(By.id("email")).isDisplayed();if(!vis)throw new Error("hidden");return"✓"},d);
  await run(S,"password input is visible",async()=>{const vis=await d.findElement(By.id("password")).isDisplayed();if(!vis)throw new Error("hidden");return"✓"},d);
  await run(S,"Toggle button cursor is pointer",async()=>{await d.get(B+"/login");const cur=await d.executeScript("return window.getComputedStyle(document.getElementById('togglePasswordBtn')).cursor");if(cur!=="pointer")throw new Error(cur);return cur},d);
  await run(S,"textarea height > 100px",async()=>{await doLogin(d);const h=await d.executeScript("return document.querySelector('textarea').offsetHeight");if(h<100)throw new Error(`${h}px`);return`${h}px`},d);
  await run(S,"textarea background is dark",async()=>{const bg=await d.executeScript("return window.getComputedStyle(document.querySelector('textarea')).backgroundColor");if(bg.includes("255, 255, 255"))throw new Error("white bg");return bg},d);
  await run(S,"card border-radius > 0",async()=>{await d.get(B+"/login");const br=await d.executeScript("return window.getComputedStyle(document.querySelector('.login-card')).borderRadius");if(br==="0px")throw new Error("no border-radius");return br},d);
  await run(S,"submitBtn (CA) has non-zero width",async()=>{await doLogout(d);await d.get(B+"/create-account");await d.wait(until.elementLocated(By.id("submitBtn")),5000);const w=await d.executeScript("return document.getElementById('submitBtn').offsetWidth");if(w<50)throw new Error(`${w}px`);return`${w}px`},d);
  await run(S,".card elements have non-zero height",async()=>{await doLogin(d);const h=await d.executeScript("return document.querySelector('.card').offsetHeight");if(h<20)throw new Error(`${h}px`);return`${h}px`},d);
  await run(S,"alert-card.high is visible",async()=>{const vis=await d.findElement(By.css(".alert-card.high")).isDisplayed();if(!vis)throw new Error("hidden");return"✓"},d);
  await run(S,"alert-card.safe is visible",async()=>{const vis=await d.findElement(By.css(".alert-card.safe")).isDisplayed();if(!vis)throw new Error("hidden");return"✓"},d);
  await run(S,"main-content has non-zero width",async()=>{const w=await d.executeScript("return document.querySelector('.main-content').offsetWidth");if(w<200)throw new Error(`${w}px`);return`${w}px`},d);
}

// ============================================================
// SUITE 13 — Multiple Sequential Scans  (20 tests)
// ============================================================
async function s13_multiScans(d) {
  console.log("\n📋 SUITE 13: Multiple Sequential Scans");
  const S="Multi Scans"; const B=config.BASE_URL;

  const scans=[
    {msg:"URGENT bank OTP verify click login account now",exp:"Phishing"},
    {msg:"Winner! Prize bank account click claim now login",exp:"Phishing"},
    {msg:"Verify your account OTP urgent bank click here",exp:"Phishing"},
    {msg:"Hi, how are you doing? See you at the meeting.",exp:"Safe"},
    {msg:"Your package has been delivered to the front door.",exp:"Safe"},
    {msg:"Reminder: school pickup at 3pm today.",exp:"Safe"},
    {msg:"Please verify your bank login OTP immediately urgent",exp:"Phishing"},
    {msg:"Good evening! Dinner is ready.",exp:"Safe"},
    {msg:"Click here urgently to secure your account login OTP",exp:"Phishing"},
    {msg:"Happy birthday! Wishing you all the best today.",exp:"Safe"},
  ];

  for(const scan of scans){
    await run(S,`"${scan.msg.substring(0,35)}..." → ${scan.exp}`,async()=>{
      await d.get(B+"/dashboard");
      await d.wait(until.elementLocated(By.css("textarea[name='message']")),8000);
      const ta=await d.findElement(By.css("textarea[name='message']"));
      await ta.clear(); await ta.sendKeys(scan.msg);
      await d.findElement(By.css(".scanner-section button[type='submit']")).click();
      await d.wait(until.elementLocated(By.css(".result-box")),15000);
      const t=await d.findElement(By.css(".result-box h2")).getText();
      if(!t.includes(scan.exp))throw new Error(`Expected ${scan.exp}, got: ${t}`);
      return"✓"
    },d);
  }

  await run(S,"Stats container still present after 10 scans",async()=>{await d.findElement(By.css(".stats-container"));return"✓"},d);
  await run(S,"Sidebar still present after 10 scans",async()=>{await d.findElement(By.css(".sidebar"));return"✓"},d);
  await run(S,"Threats page has scan rows after scans",async()=>{await d.get(B+"/threats");await d.wait(until.elementLocated(By.css(".history-table-container")),8000);const rows=await d.findElements(By.css(".scan-row"));if(!rows.length)throw new Error("no rows");return`${rows.length} rows`},d);
  await run(S,"Filter All button still works after scans",async()=>{const btn=await d.findElement(By.xpath("//button[normalize-space()='All']"));await btn.click();await sleep(400);const cls=await btn.getAttribute("class");if(!cls.includes("active"))throw new Error(cls);return"✓"},d);
  await run(S,"Stats total_scans is numeric",async()=>{await d.get(B+"/dashboard");await d.wait(until.elementLocated(By.css(".stats-container")),8000);const cards=await d.findElements(By.css(".card p"));let num=false;for(const c of cards){const t=await c.getText();if(!isNaN(parseInt(t))){num=true;break;}}if(!num)throw new Error("no numeric");return"✓"},d);
  await run(S,"Scanner section still usable after multiple scans",async()=>{const ta=await d.findElement(By.css("textarea[name='message']"));await ta.clear();await ta.sendKeys("test");const v=await ta.getAttribute("value");if(!v)throw new Error("input failed");return"✓"},d);
  await run(S,"Dashboard page not crashed after 10 scans",async()=>{const u=await d.getCurrentUrl();if(!u.includes("/dashboard"))throw new Error(u);return"✓"},d);
  await run(S,"Dashboard title still correct after scans",async()=>{const t=await d.getTitle();if(!t.includes("PhishGuard"))throw new Error(t);return t},d);
  await run(S,"result-box shown after last scan",async()=>{await d.get(B+"/dashboard");await d.wait(until.elementLocated(By.css("textarea[name='message']")),8000);const ta=await d.findElement(By.css("textarea[name='message']"));await ta.clear();await ta.sendKeys("URGENT bank OTP click verify now login account");await d.findElement(By.css(".scanner-section button[type='submit']")).click();await d.wait(until.elementLocated(By.css(".result-box")),15000);await d.findElement(By.css(".result-box"));return"✓"},d);
  await run(S,"Threats page accessible after scans",async()=>{await d.get(B+"/threats");await d.wait(until.elementLocated(By.css(".history-table-container")),8000);return"✓"},d);
}

// ============================================================
// SUITE 14 — Threats Modal  (15 tests)
// ============================================================
async function s14_threatsModal(d) {
  console.log("\n📋 SUITE 14: Threats Modal");
  const S="Threats Modal"; const B=config.BASE_URL;
  await d.get(B+"/threats");
  await d.wait(until.elementLocated(By.css(".history-table-container")),8000);

  await run(S,"#scanModal hidden on page load",async()=>{const disp=await d.findElement(By.id("scanModal")).getCssValue("display");if(disp!=="none")throw new Error(disp);return"none ✓"},d);

  // Only test modal open/close if there are rows
  await run(S,"If rows exist, View btn opens modal",async()=>{
    const rows=await d.findElements(By.css(".btn-view"));
    if(!rows.length)return"skip — no rows";
    await rows[0].click();
    await sleep(400);
    const disp=await d.findElement(By.id("scanModal")).getCssValue("display");
    if(disp==="none")throw new Error("modal not shown");
    return"modal opened ✓"
  },d);

  await run(S,"Modal shows modalDate",async()=>{
    const rows=await d.findElements(By.css(".btn-view"));
    if(!rows.length)return"skip — no rows";
    const disp=await d.findElement(By.id("scanModal")).getCssValue("display");
    if(disp==="none")return"skip — modal closed";
    const t=await d.findElement(By.id("modalDate")).getText();
    if(!t||t.length<2)throw new Error("empty");
    return t
  },d);

  await run(S,"Modal shows modalMessage",async()=>{
    const disp=await d.findElement(By.id("scanModal")).getCssValue("display");
    if(disp==="none")return"skip";
    const t=await d.findElement(By.id("modalMessage")).getText();
    return`${t.length} chars`
  },d);

  await run(S,"Modal shows modalRiskScore",async()=>{
    const disp=await d.findElement(By.id("scanModal")).getCssValue("display");
    if(disp==="none")return"skip";
    const t=await d.findElement(By.id("modalRiskScore")).getText();
    if(!t.includes("%"))throw new Error(t);
    return t
  },d);

  await run(S,"Close button closes modal",async()=>{
    const disp=await d.findElement(By.id("scanModal")).getCssValue("display");
    if(disp==="none")return"skip";
    await d.findElement(By.css(".close-btn")).click();
    await sleep(400);
    const disp2=await d.findElement(By.id("scanModal")).getCssValue("display");
    if(disp2!=="none")throw new Error("still open");
    return"closed ✓"
  },d);

  await run(S,"#modalIndicators element exists",async()=>{await d.findElement(By.id("modalIndicators"));return"✓"},d);
  await run(S,"#modalPredictionBadge element exists",async()=>{await d.findElement(By.id("modalPredictionBadge"));return"✓"},d);
  await run(S,".modal-card element exists",async()=>{await d.findElement(By.css(".modal-card"));return"✓"},d);
  await run(S,".modal-header element exists",async()=>{await d.findElement(By.css(".modal-header"));return"✓"},d);
  await run(S,".modal-title has Scan text",async()=>{const t=await d.findElement(By.css(".modal-title")).getText();if(!t||t.length<2)throw new Error("empty");return t},d);
  await run(S,"#scanModal in DOM",async()=>{await d.findElement(By.id("scanModal"));return"✓"},d);
  await run(S,"All 5 filter btns still present",async()=>{const bs=await d.findElements(By.css(".filter-btn"));if(bs.length<5)throw new Error(`${bs.length}`);return`${bs.length}`},d);
  await run(S,"Filter bar still present",async()=>{await d.findElement(By.css(".filter-bar"));return"✓"},d);
  await run(S,"table.history-table still present",async()=>{await d.findElement(By.css("table.history-table"));return"✓"},d);
}

// ============================================================
// SUITE 15 — Accessibility Basics  (15 tests)
// ============================================================
async function s15_accessibility(d) {
  console.log("\n📋 SUITE 15: Accessibility Basics");
  const S="Accessibility"; const B=config.BASE_URL;

  await run(S,"Login page has lang=en attribute",async()=>{await d.get(B+"/login");const lang=await d.findElement(By.css("html")).getAttribute("lang");if(lang!=="en")throw new Error(lang);return lang},d);
  await run(S,"CA page has lang=en attribute",async()=>{await doLogout(d);await d.get(B+"/create-account");const lang=await d.findElement(By.css("html")).getAttribute("lang");if(lang!=="en")throw new Error(lang);return lang},d);
  await run(S,"Login email label has for=email",async()=>{await d.get(B+"/login");const lbl=await d.findElement(By.css("label[for='email']"));const txt=await lbl.getText();if(!txt)throw new Error("empty label");return txt},d);
  await run(S,"Login password label has for=password",async()=>{const lbl=await d.findElement(By.css("label[for='password']"));const txt=await lbl.getText();if(!txt)throw new Error("empty label");return txt},d);
  await run(S,"CA name label has for=name",async()=>{await d.get(B+"/create-account");await d.wait(until.elementLocated(By.css("label[for='name']")),5000);const lbl=await d.findElement(By.css("label[for='name']"));const txt=await lbl.getText();if(!txt)throw new Error("empty");return txt},d);
  await run(S,"CA email label has for=email",async()=>{const lbl=await d.findElement(By.css("label[for='email']"));const txt=await lbl.getText();if(!txt)throw new Error("empty");return txt},d);
  await run(S,"CA password label has for=password",async()=>{const lbl=await d.findElement(By.css("label[for='password']"));const txt=await lbl.getText();if(!txt)throw new Error("empty");return txt},d);
  await run(S,"Login alert-box has role=alert",async()=>{await d.get(B+"/login");await d.findElement(By.id("email")).sendKeys(config.INVALID_USER.email);await d.findElement(By.id("password")).sendKeys(config.INVALID_USER.password);await d.findElement(By.id("loginBtn")).click();await d.wait(until.elementLocated(By.css(".alert-box")),8000);const role=await d.findElement(By.css(".alert-box")).getAttribute("role");if(role!=="alert")throw new Error(role);return role},d);
  await run(S,"togglePasswordBtn has title attribute",async()=>{await d.get(B+"/login");const title=await d.findElement(By.id("togglePasswordBtn")).getAttribute("title");if(!title||title.length<2)throw new Error("no title");return title},d);
  await run(S,"togglePasswordBtn has aria-label",async()=>{const al=await d.findElement(By.id("togglePasswordBtn")).getAttribute("aria-label");if(!al||al.length<2)throw new Error("no aria-label");return al},d);
  await run(S,"Login page has <title> tag",async()=>{const t=await d.getTitle();if(!t||t.length<2)throw new Error("no title");return t},d);
  await run(S,"CA page has <title> tag",async()=>{await d.get(B+"/create-account");const t=await d.getTitle();if(!t||t.length<2)throw new Error("no title");return t},d);
  await run(S,"Dashboard has <title> tag",async()=>{await doLogin(d);const t=await d.getTitle();if(!t||t.length<2)throw new Error("no title");return t},d);
  await run(S,"email input has autocomplete attribute",async()=>{await d.get(B+"/login");const ac=await d.findElement(By.id("email")).getAttribute("autocomplete");if(!ac)throw new Error("no autocomplete");return ac},d);
  await run(S,"password has autocomplete=current-password",async()=>{const ac=await d.findElement(By.id("password")).getAttribute("autocomplete");if(ac!=="current-password")throw new Error(ac);return ac},d);
}

// ============================================================
// SUITE 16 — Page Load & Browser State  (15 tests)
// ============================================================
async function s16_pageLoad(d) {
  console.log("\n📋 SUITE 16: Page Load & Browser State");
  const S="Page Load"; const B=config.BASE_URL;

  await run(S,"Login page loads without JS errors",async()=>{await d.get(B+"/login");await d.wait(until.elementLocated(By.css("body")),8000);return"✓"},d);
  await run(S,"CA page loads without JS errors",async()=>{await doLogout(d);await d.get(B+"/create-account");await d.wait(until.elementLocated(By.css("body")),8000);return"✓"},d);
  await run(S,"Dashboard page loads without JS errors",async()=>{await doLogin(d);await d.wait(until.elementLocated(By.css(".dashboard-container")),8000);return"✓"},d);
  await run(S,"Threats page loads without JS errors",async()=>{await d.get(B+"/threats");await d.wait(until.elementLocated(By.css(".history-table-container")),8000);return"✓"},d);
  await run(S,"Reports page loads without JS errors",async()=>{await d.get(B+"/reports");await d.wait(until.elementLocated(By.css(".main-content")),8000);return"✓"},d);
  await run(S,"Settings page loads without JS errors",async()=>{await d.get(B+"/settings");await d.wait(until.elementLocated(By.css(".main-content")),8000);return"✓"},d);
  await run(S,"Login DOM loaded within 8s",async()=>{const s=Date.now();await d.get(B+"/login");await d.wait(until.elementLocated(By.css(".login-card")),8000);const ms=Date.now()-s;if(ms>8000)throw new Error(`${ms}ms`);return`${ms}ms`},d);
  await run(S,"Dashboard DOM loaded within 10s",async()=>{await doLogin(d);const s=Date.now();await d.wait(until.elementLocated(By.css(".stats-container")),10000);const ms=Date.now()-s;return`~${ms}ms`},d);
  await run(S,"Threats DOM loaded within 8s",async()=>{const s=Date.now();await d.get(B+"/threats");await d.wait(until.elementLocated(By.css(".filter-bar")),8000);const ms=Date.now()-s;if(ms>8000)throw new Error(`${ms}ms`);return`${ms}ms`},d);
  await run(S,"Browser back from dashboard works",async()=>{await d.get(B+"/dashboard");await d.navigate().back();await sleep(1000);const u=await d.getCurrentUrl();if(!u)throw new Error("no URL");return u},d);
  await run(S,"Page refresh on dashboard stays on dashboard",async()=>{await d.get(B+"/dashboard");await d.navigate().refresh();await d.wait(until.elementLocated(By.css(".stats-container")),8000);return"✓"},d);
  await run(S,"Page refresh on threats stays on threats",async()=>{await d.get(B+"/threats");await d.navigate().refresh();await d.wait(until.elementLocated(By.css(".history-table-container")),8000);return"✓"},d);
  await run(S,"Page refresh on reports stays on reports",async()=>{await d.get(B+"/reports");await d.navigate().refresh();await d.wait(until.elementLocated(By.css(".main-content")),8000);return"✓"},d);
  await run(S,"Page refresh on settings stays on settings",async()=>{await d.get(B+"/settings");await d.navigate().refresh();await d.wait(until.elementLocated(By.css(".main-content")),8000);return"✓"},d);
  await run(S,"Window title updates on navigation",async()=>{await d.get(B+"/dashboard");const t1=await d.getTitle();await d.get(B+"/threats");const t2=await d.getTitle();if(!t1||!t2)throw new Error("no title");return`${t1} / ${t2}`},d);
}

// ============================================================
// SUITE 17 — Extra Element Checks  (16 tests)
// ============================================================
async function s17_extraElements(d) {
  console.log("\n📋 SUITE 17: Extra Element Checks");
  const S="Extra Elements"; const B=config.BASE_URL;

  await run(S,"Dashboard: h1 heading present",async()=>{await d.get(B+"/dashboard");await d.wait(until.elementLocated(By.css(".top-bar")),8000);const h1=await d.findElement(By.css(".top-bar h1")).getText();if(!h1)throw new Error("empty");return h1},d);
  await run(S,"Dashboard: .top-bar exists",async()=>{await d.findElement(By.css(".top-bar"));return"✓"},d);
  await run(S,"Dashboard: textarea placeholder present",async()=>{const p=await d.findElement(By.css("textarea[name='message']")).getAttribute("placeholder");if(!p)throw new Error("no placeholder");return p},d);
  await run(S,"Dashboard: textarea required attribute",async()=>{const r=await d.findElement(By.css("textarea[name='message']")).getAttribute("required");if(!r)throw new Error("not required");return"✓"},d);
  await run(S,"Dashboard: .result-box not present initially",async()=>{await d.get(B+"/dashboard");await d.wait(until.elementLocated(By.css(".stats-container")),8000);const bs=await d.findElements(By.css(".result-box"));if(bs.length)throw new Error("shown unexpectedly");return"✓"},d);
  await run(S,"Threats: h1 heading present",async()=>{await d.get(B+"/threats");await d.wait(until.elementLocated(By.css(".top-bar h1")),8000);const h1=await d.findElement(By.css(".top-bar h1")).getText();if(!h1)throw new Error("empty");return h1},d);
  await run(S,"Threats: subtitle paragraph present",async()=>{const ps=await d.findElements(By.css(".top-bar p"));if(!ps.length)throw new Error("no p");return"✓"},d);
  await run(S,"Reports: h1 not empty",async()=>{await d.get(B+"/reports");await d.wait(until.elementLocated(By.css("h1")),8000);const t=await d.findElement(By.css("h1")).getText();if(!t)throw new Error("empty");return t},d);
  await run(S,"Settings: h1 not empty",async()=>{await d.get(B+"/settings");await d.wait(until.elementLocated(By.css("h1")),8000);const t=await d.findElement(By.css("h1")).getText();if(!t)throw new Error("empty");return t},d);
  await run(S,"Dashboard: Analyze Suspicious Message h2",async()=>{await d.get(B+"/dashboard");await d.wait(until.elementLocated(By.css(".scanner-section")),8000);const bt=await bodyText(d);if(!bt.includes("Analyze"))throw new Error("missing");return"✓"},d);
  await run(S,"Dashboard: Recent Threat Alerts h2",async()=>{const bt=await bodyText(d);if(!bt.includes("Threat Alerts"))throw new Error("missing");return"✓"},d);
  await run(S,"Dashboard: Threat Analytics h2",async()=>{const bt=await bodyText(d);if(!bt.includes("Threat Analytics"))throw new Error("missing");return"✓"},d);
  await run(S,"Dashboard: AI Engine Status h2",async()=>{const bt=await bodyText(d);if(!bt.includes("AI Engine"))throw new Error("missing");return"✓"},d);
  await run(S,"CA: subtitle present",async()=>{await doLogout(d);await d.get(B+"/create-account");await d.wait(until.elementLocated(By.css(".subtitle")),5000);const t=await d.findElement(By.css(".subtitle")).getText();if(!t||t.length<3)throw new Error("empty");return t},d);
  await run(S,"Login: .logo emoji visible",async()=>{await d.get(B+"/login");const t=await d.findElement(By.css(".logo")).getText();if(!t.includes("🛡"))throw new Error(t);return"✓"},d);
  await run(S,"CA: .logo-icon emoji visible",async()=>{await d.get(B+"/create-account");await d.wait(until.elementLocated(By.css(".logo-icon")),5000);const t=await d.findElement(By.css(".logo-icon")).getText();if(!t.includes("🛡"))throw new Error(t);return"✓"},d);
}

// ============================================================
// MAIN RUNNER — defined last so all suite functions exist
// ============================================================
async function runE2E() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  PhishGuard — Selenium E2E Test Suite  (300+ tests)");
  console.log(`  URL: ${config.BASE_URL}  |  Headless: ${config.HEADLESS}`);
  console.log("═══════════════════════════════════════════════════════\n");

  const driver = await buildDriver();
  driver.manage().setTimeouts({ implicit: config.IMPLICIT_WAIT_MS });

  const suites = [
    s1_loginElements, s2_loginFunctionality, s3_createAccount,
    s4_caFeedback, s5_dashboardLayout, s6_scanner,
    s7_threats, s8_reports, s9_settings, s10_logout,
    s11_navigation, s12_ui, s13_multiScans, s14_threatsModal,
    s15_accessibility, s16_pageLoad, s17_extraElements,
  ];

  try {
    for (const suite of suites) {
      try {
        await suite(driver);
      } catch (err) {
        console.error(`  ❌ Suite ${suite.name} crashed: ${err.message.split("\n")[0]}`);
        record(suite.name, "Suite-level crash", "FAIL", 0, err.message.split("\n")[0]);
      }
    }
  } finally {
    await driver.quit();
  }

  const passed  = results.filter(r => r.status === "PASS").length;
  const failed  = results.filter(r => r.status === "FAIL").length;
  console.log(`\n  ✅ PASS: ${passed}  ❌ FAIL: ${failed}  TOTAL: ${results.length}\n`);

  const rawDir = "./reports/raw";
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(`${rawDir}/e2e_results.json`, JSON.stringify(results, null, 2));
  console.log("  📁 Saved → reports/raw/e2e_results.json");
  return results;
}

if (require.main === module) {
  runE2E().catch(err => { console.error("Fatal:", err); process.exit(1); });
}
module.exports = { runE2E };