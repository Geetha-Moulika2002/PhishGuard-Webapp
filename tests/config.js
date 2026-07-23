// ============================================================
// PhishGuard Test Configuration
// ============================================================

module.exports = {
  BASE_URL: "http://localhost:5000",

  // Test credentials — use a real test account you have registered
  TEST_USER: {
    name: "Dhamini",
    email: "dhamini@gmail.com",
    password: "prajwal",
  },

  // An email that does NOT exist in the system (for negative tests)
  INVALID_USER: {
    email: "notregistered@fake.com",
    password: "wrongpassword",
  },

  // Selenium browser settings
  BROWSER: "chrome",       // "chrome" or "firefox"
  HEADLESS: true,          // set false to watch the browser during tests
  IMPLICIT_WAIT_MS: 5000,

  // Load test settings
  LOAD: {
    DURATION_SECONDS: 30,
    ARRIVAL_RATE: 5,        // virtual users per second
  },

  // Paths
  PATHS: {
    REPORTS_DIR: "./reports",
    RAW_DIR: "./reports/raw",
    EXCEL_FILE: "./reports/PhishGuard_Test_Report.xlsx",
  },
};
