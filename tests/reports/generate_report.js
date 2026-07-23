// ============================================================
// PhishGuard — Excel Report Generator
// Produces a rich multi-sheet .xlsx with:
//   1. Cover / Summary Dashboard
//   2. E2E Test Results
//   3. Vulnerability Test Results
//   4. Load Test Results
//   5. Load Test Phase Analysis
//   6. Recommendations
// ============================================================

const ExcelJS = require("exceljs");
const fs      = require("fs");
const path    = require("path");
const config  = require("../config");

const RAW_DIR     = path.join(__dirname, "raw");
const OUTPUT_FILE = path.join(__dirname, "PhishGuard_Test_Report.xlsx");

// ── colour palette ───────────────────────────────────────────
const C = {
  PASS_BG:    "FFD4EDDA",  PASS_FG:    "FF155724",
  FAIL_BG:    "FFF8D7DA",  FAIL_FG:    "FF721C24",
  SKIP_BG:    "FFFFF3CD",  SKIP_FG:    "FF856404",
  HEADER_BG:  "FF1E3A5F",  HEADER_FG:  "FFFFFFFF",
  TITLE_BG:   "FF0D2137",  TITLE_FG:   "FF38BDF8",
  SECTION_BG: "FF1A2E45",  SECTION_FG: "FFE2E8F0",
  CRIT_BG:    "FFFF0000",  CRIT_FG:    "FFFFFFFF",
  HIGH_BG:    "FFFD7E14",  HIGH_FG:    "FFFFFFFF",
  MED_BG:     "FFFFC107",  MED_FG:     "FF212529",
  LOW_BG:     "FF0DCAF0",  LOW_FG:     "FF212529",
  ALT_ROW:    "FFF0F4F8",
  WHITE:      "FFFFFFFF",
  DARK:       "FF0D2137",
  ACCENT:     "FF2563EB",
};

// ── style helpers ────────────────────────────────────────────
function hFill(bgHex, fgHex) {
  return { type: "pattern", pattern: "solid", fgColor: { argb: bgHex }, bgColor: { argb: bgHex } };
}
function font(fgHex, bold = false, size = 11, name = "Calibri") {
  return { name, size, bold, color: { argb: fgHex } };
}
function border() {
  const s = { style: "thin", color: { argb: "FFD0D8E0" } };
  return { top: s, left: s, bottom: s, right: s };
}
function align(h = "left", v = "middle", wrap = false) {
  return { horizontal: h, vertical: v, wrapText: wrap };
}
function statusFill(status) {
  if (status === "PASS") return hFill(C.PASS_BG, C.PASS_FG);
  if (status === "FAIL") return hFill(C.FAIL_BG, C.FAIL_FG);
  return hFill(C.SKIP_BG, C.SKIP_FG);
}
function statusFont(status) {
  if (status === "PASS") return font(C.PASS_FG, true);
  if (status === "FAIL") return font(C.FAIL_FG, true);
  return font(C.SKIP_FG, true);
}
function severityFill(sev) {
  if (sev === "CRITICAL") return hFill(C.CRIT_BG, C.CRIT_FG);
  if (sev === "HIGH")     return hFill(C.HIGH_BG, C.HIGH_FG);
  if (sev === "MEDIUM")   return hFill(C.MED_BG,  C.MED_FG);
  return hFill(C.LOW_BG, C.LOW_FG);
}
function severityFont(sev) {
  if (sev === "CRITICAL") return font(C.CRIT_FG, true);
  if (sev === "HIGH")     return font(C.HIGH_FG, true);
  if (sev === "MEDIUM")   return font(C.MED_FG,  true);
  return font(C.LOW_FG, true);
}

function applyHeaderRow(row, bgHex, fgHex) {
  row.eachCell((cell) => {
    cell.fill   = hFill(bgHex, fgHex);
    cell.font   = font(fgHex, true, 11);
    cell.border = border();
    cell.alignment = align("center", "middle");
  });
  row.height = 30;
}

function applyDataRow(row, altRow = false) {
  row.eachCell((cell) => {
    if (!cell.fill || cell.fill.pattern === "none") {
      cell.fill = altRow ? hFill(C.ALT_ROW, C.DARK) : hFill(C.WHITE, C.DARK);
    }
    if (!cell.font || !cell.font.bold) cell.font = font("FF1E293B");
    cell.border    = border();
    cell.alignment = align("left", "middle", true);
  });
  row.height = 22;
}

// ── data loader ──────────────────────────────────────────────
function loadJSON(filename, fallback = []) {
  const p = path.join(RAW_DIR, filename);
  if (!fs.existsSync(p)) {
    console.warn(`  ⚠️  ${filename} not found — using empty data`);
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {
    console.warn(`  ⚠️  Failed to parse ${filename}:`, e.message);
    return fallback;
  }
}

// ============================================================
// SHEET 1 — Cover / Summary Dashboard
// ============================================================
function buildCoverSheet(wb, e2e, vuln, load, unit = [], valid = [], loadtime = []) {
  const ws = wb.addWorksheet("📊 Summary Dashboard", {
    properties: { tabColor: { argb: C.ACCENT } },
  });

  ws.columns = [
    { width: 4 }, { width: 28 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 18 }, { width: 4 },
  ];

  // ── Title block ──
  ws.mergeCells("B2:F2");
  const titleCell = ws.getCell("B2");
  titleCell.value     = "🛡️  PhishGuard — Complete Test Analysis Report";
  titleCell.font      = font(C.TITLE_FG, true, 20);
  titleCell.fill      = hFill(C.TITLE_BG, C.TITLE_FG);
  titleCell.alignment = align("center", "middle");
  ws.getRow(2).height = 50;

  ws.mergeCells("B3:F3");
  const subCell = ws.getCell("B3");
  subCell.value     = `Generated: ${new Date().toLocaleString()}   |   Target: ${config.BASE_URL}`;
  subCell.font      = font("FF94A3B8", false, 10);
  subCell.fill      = hFill(C.TITLE_BG, "FF94A3B8");
  subCell.alignment = align("center", "middle");
  ws.getRow(3).height = 20;

  ws.addRow([]);

  // ── Compute totals ──
  const e2ePass   = e2e.filter((r) => r.status === "PASS").length;
  const e2eFail   = e2e.filter((r) => r.status === "FAIL").length;
  const e2eSkip   = e2e.filter((r) => r.status === "SKIP").length;
  const e2eTotal  = e2e.length;

  const vulnPass  = vuln.filter((r) => r.status === "PASS").length;
  const vulnFail  = vuln.filter((r) => r.status === "FAIL").length;
  const vulnTotal = vuln.length;
  const critFail  = vuln.filter((r) => r.status === "FAIL" && r.severity === "CRITICAL").length;
  const highFail  = vuln.filter((r) => r.status === "FAIL" && r.severity === "HIGH").length;

  const loadCases = load.testCases || [];
  const loadPass  = loadCases.filter((r) => r.status === "PASS").length;
  const loadFail  = loadCases.filter((r) => r.status === "FAIL").length;
  const loadTotal = loadCases.length;

  const unitPass  = unit.filter((r) => r.status === "PASS").length;
  const unitFail  = unit.filter((r) => r.status === "FAIL").length;
  const unitTotal = unit.length;

  const validPass  = valid.filter((r) => r.status === "PASS").length;
  const validFail  = valid.filter((r) => r.status === "FAIL").length;
  const validTotal = valid.length;

  const ltPass  = loadtime.filter((r) => r.status === "PASS").length;
  const ltFail  = loadtime.filter((r) => r.status === "FAIL").length;
  const ltTotal = loadtime.length;

  const grandTotal = e2eTotal + vulnTotal + loadTotal + unitTotal + validTotal + ltTotal;
  const grandPass  = e2ePass  + vulnPass  + loadPass  + unitPass  + validPass  + ltPass;
  const grandFail  = e2eFail  + vulnFail  + loadFail  + unitFail  + validFail  + ltFail;
  const passRate   = grandTotal > 0 ? ((grandPass / grandTotal) * 100).toFixed(1) : 0;

  // ── Stats cards ──
  function addStatCard(row, col, label, value, bgHex, fgHex) {
    const labelCell = ws.getCell(row, col);
    labelCell.value     = label;
    labelCell.font      = font(fgHex, false, 10);
    labelCell.fill      = hFill(bgHex, fgHex);
    labelCell.alignment = align("center", "middle");
    labelCell.border    = border();
    ws.getRow(row).height = 20;

    const valCell = ws.getCell(row + 1, col);
    valCell.value     = value;
    valCell.font      = font(fgHex, true, 22);
    valCell.fill      = hFill(bgHex, fgHex);
    valCell.alignment = align("center", "middle");
    valCell.border    = border();
    ws.getRow(row + 1).height = 40;
  }

  ws.mergeCells(5, 2, 6, 2); addStatCard(5, 2, "TOTAL TESTS",    grandTotal, C.SECTION_BG, C.SECTION_FG);
  ws.mergeCells(5, 3, 6, 3); addStatCard(5, 3, "PASSED",         grandPass,  C.PASS_BG,    C.PASS_FG);
  ws.mergeCells(5, 4, 6, 4); addStatCard(5, 4, "FAILED",         grandFail,  C.FAIL_BG,    C.FAIL_FG);
  ws.mergeCells(5, 5, 6, 5); addStatCard(5, 5, "PASS RATE",      passRate + "%", C.HEADER_BG, C.HEADER_FG);
  ws.mergeCells(5, 6, 6, 6); addStatCard(5, 6, "CRITICAL VULNS", critFail,   C.CRIT_BG,    C.CRIT_FG);

  ws.addRow([]); ws.addRow([]);

  // ── Section breakdown table ──
  const sectionHeader = ws.addRow(["", "Test Category", "Total", "Passed", "Failed", "Pass Rate", ""]);
  applyHeaderRow(sectionHeader, C.HEADER_BG, C.HEADER_FG);

  const sections = [
    ["", "E2E Tests (Selenium)",      e2eTotal,   e2ePass,   e2eFail,   e2eTotal   > 0 ? ((e2ePass   / e2eTotal)   * 100).toFixed(1) + "%" : "N/A"],
    ["", "Unit Tests",                 unitTotal,  unitPass,  unitFail,  unitTotal  > 0 ? ((unitPass  / unitTotal)  * 100).toFixed(1) + "%" : "N/A"],
    ["", "Validation Tests",           validTotal, validPass, validFail, validTotal > 0 ? ((validPass / validTotal) * 100).toFixed(1) + "%" : "N/A"],
    ["", "Load Time Tests",            ltTotal,    ltPass,    ltFail,    ltTotal    > 0 ? ((ltPass    / ltTotal)    * 100).toFixed(1) + "%" : "N/A"],
    ["", "Vulnerability Tests",        vulnTotal,  vulnPass,  vulnFail,  vulnTotal  > 0 ? ((vulnPass  / vulnTotal)  * 100).toFixed(1) + "%" : "N/A"],
    ["", "Artillery Load Tests",       loadTotal,  loadPass,  loadFail,  loadTotal  > 0 ? ((loadPass  / loadTotal)  * 100).toFixed(1) + "%" : "N/A"],
    ["", "TOTAL",                      grandTotal, grandPass, grandFail, passRate + "%"],
  ];

  sections.forEach((sec, i) => {
    const r = ws.addRow([...sec, ""]);
    const isTotalRow = sec[1] === "TOTAL";
    r.getCell(2).font      = font(isTotalRow ? C.HEADER_FG : "FF1E293B", isTotalRow);
    r.getCell(2).fill      = isTotalRow ? hFill(C.HEADER_BG, C.HEADER_FG) : hFill(i % 2 ? C.ALT_ROW : C.WHITE, "FF000000");
    [3, 4, 5].forEach((col) => {
      const cell = r.getCell(col);
      cell.alignment = align("center", "middle");
      cell.font      = font(isTotalRow ? C.HEADER_FG : "FF1E293B", true);
      cell.fill      = isTotalRow ? hFill(C.HEADER_BG, C.HEADER_FG) : hFill(i % 2 ? C.ALT_ROW : C.WHITE, "FF000000");
      cell.border    = border();
    });
    r.getCell(6).font      = font(parseFloat(sec[5]) >= 80 ? C.PASS_FG : C.FAIL_FG, true);
    r.getCell(6).fill      = parseFloat(sec[5]) >= 80 ? hFill(C.PASS_BG, C.PASS_FG) : hFill(C.FAIL_BG, C.FAIL_FG);
    r.getCell(6).alignment = align("center", "middle");
    r.getCell(6).border    = border();
    r.height = 24;
  });

  ws.addRow([]);

  // ── Vulnerability severity breakdown ──
  const sevHeader = ws.addRow(["", "Vulnerability Severity", "Count", "Status", "", "", ""]);
  applyHeaderRow(sevHeader, C.HEADER_BG, C.HEADER_FG);

  const sevData = [
    { sev: "CRITICAL", count: vuln.filter((r) => r.severity === "CRITICAL" && r.status === "FAIL").length },
    { sev: "HIGH",     count: vuln.filter((r) => r.severity === "HIGH"     && r.status === "FAIL").length },
    { sev: "MEDIUM",   count: vuln.filter((r) => r.severity === "MEDIUM"   && r.status === "FAIL").length },
    { sev: "LOW",      count: vuln.filter((r) => r.severity === "LOW"      && r.status === "FAIL").length },
  ];

  sevData.forEach((s) => {
    const r = ws.addRow(["", s.sev, s.count, s.count > 0 ? "⚠️ Issues Found" : "✅ Clean", "", "", ""]);
    r.getCell(2).fill      = severityFill(s.sev);
    r.getCell(2).font      = severityFont(s.sev);
    r.getCell(2).alignment = align("center", "middle");
    r.getCell(2).border    = border();
    r.getCell(3).alignment = align("center", "middle");
    r.getCell(3).border    = border();
    r.getCell(4).fill      = s.count > 0 ? hFill(C.FAIL_BG, C.FAIL_FG) : hFill(C.PASS_BG, C.PASS_FG);
    r.getCell(4).font      = s.count > 0 ? font(C.FAIL_FG, true) : font(C.PASS_FG, true);
    r.getCell(4).alignment = align("center", "middle");
    r.getCell(4).border    = border();
    r.height = 22;
  });

  // ── Load test key metrics ──
  if (load.responseTime) {
    ws.addRow([]); ws.addRow([]);
    const ltHeader = ws.addRow(["", "Load Test Metric", "Value", "Threshold", "Status", "", ""]);
    applyHeaderRow(ltHeader, C.HEADER_BG, C.HEADER_FG);

    const metrics = [
      { name: "Mean Response Time", val: load.responseTime.mean + "ms", thr: "< 1000ms", pass: load.responseTime.mean <= 1000 },
      { name: "P95 Response Time",  val: load.responseTime.p95  + "ms", thr: "< 2000ms", pass: load.responseTime.p95  <= 2000 },
      { name: "P99 Response Time",  val: load.responseTime.p99  + "ms", thr: "< 3000ms", pass: load.responseTime.p99  <= 3000 },
      { name: "Error Rate",         val: load.errorRate || "N/A",       thr: "< 10%",    pass: parseFloat(load.errorRate) < 10 },
      { name: "Total Requests",     val: load.totalRequests,            thr: "> 0",       pass: load.totalRequests > 0 },
    ];

    metrics.forEach((m, i) => {
      const r = ws.addRow(["", m.name, m.val, m.thr, m.pass ? "✅ PASS" : "❌ FAIL", "", ""]);
      r.getCell(5).fill      = m.pass ? hFill(C.PASS_BG, C.PASS_FG) : hFill(C.FAIL_BG, C.FAIL_FG);
      r.getCell(5).font      = m.pass ? font(C.PASS_FG, true) : font(C.FAIL_FG, true);
      r.getCell(5).alignment = align("center", "middle");
      [2, 3, 4, 5].forEach((c) => { r.getCell(c).border = border(); });
      r.height = 22;
    });
  }
}

// ============================================================
// SHEET 2 — E2E Test Results
// ============================================================
function buildE2ESheet(wb, e2e) {
  const ws = wb.addWorksheet("🧪 E2E Tests", {
    properties: { tabColor: { argb: "FF22C55E" } },
    views: [{ state: "frozen", ySplit: 3 }],
  });

  ws.columns = [
    { width: 3 },
    { key: "suite",    header: "Suite",        width: 22 },
    { key: "name",     header: "Test Name",    width: 50 },
    { key: "status",   header: "Status",       width: 12 },
    { key: "duration", header: "Duration (ms)", width: 16 },
    { key: "error",    header: "Error Detail", width: 55 },
    { key: "shot",     header: "Screenshot",   width: 22 },
    { width: 3 },
  ];

  // Title row
  ws.mergeCells("B1:G1");
  const title = ws.getCell("B1");
  title.value     = "E2E Test Results — Selenium WebDriver";
  title.font      = font(C.TITLE_FG, true, 14);
  title.fill      = hFill(C.TITLE_BG, C.TITLE_FG);
  title.alignment = align("center", "middle");
  ws.getRow(1).height = 36;

  // Header row
  const hRow = ws.getRow(2);
  hRow.values = ["", "Suite", "Test Name", "Status", "Duration (ms)", "Error / Detail", "Screenshot", ""];
  applyHeaderRow(hRow, C.HEADER_BG, C.HEADER_FG);

  // Group by suite
  let prevSuite = null;
  let altRow = false;

  e2e.forEach((test, idx) => {
    if (test.suite !== prevSuite) {
      // Section divider row
      const divRow = ws.addRow(["", test.suite, "", "", "", "", "", ""]);
      ws.mergeCells(divRow.number, 2, divRow.number, 7);
      divRow.getCell(2).value     = `📂  ${test.suite}`;
      divRow.getCell(2).fill      = hFill(C.SECTION_BG, C.SECTION_FG);
      divRow.getCell(2).font      = font(C.SECTION_FG, true, 11);
      divRow.getCell(2).alignment = align("left", "middle");
      divRow.height = 26;
      prevSuite = test.suite;
      altRow = false;
    }

    const r = ws.addRow([
      "",
      test.suite,
      test.name,
      test.status,
      test.duration || 0,
      test.error || "",
      test.screenshot || "",
      "",
    ]);

    r.getCell(4).fill      = statusFill(test.status);
    r.getCell(4).font      = statusFont(test.status);
    r.getCell(4).alignment = align("center", "middle");
    r.getCell(5).alignment = align("center", "middle");
    r.getCell(6).font      = test.status === "FAIL" ? font(C.FAIL_FG) : font("FF374151");
    r.getCell(6).alignment = align("left", "middle", true);

    [2, 3, 4, 5, 6, 7].forEach((c) => {
      r.getCell(c).border = border();
      if (c !== 4) {
        r.getCell(c).fill = hFill(altRow ? C.ALT_ROW : C.WHITE, "FF000000");
      }
    });
    r.height = 22;
    altRow = !altRow;
  });

  // Totals row
  ws.addRow([]);
  const pass = e2e.filter((r) => r.status === "PASS").length;
  const fail = e2e.filter((r) => r.status === "FAIL").length;
  const skip = e2e.filter((r) => r.status === "SKIP").length;
  const totalRow = ws.addRow(["", `Total: ${e2e.length}`, `Pass: ${pass}  |  Fail: ${fail}  |  Skip: ${skip}`, "", "", "", "", ""]);
  ws.mergeCells(totalRow.number, 2, totalRow.number, 7);
  totalRow.getCell(2).font      = font(C.HEADER_FG, true, 11);
  totalRow.getCell(2).fill      = hFill(C.HEADER_BG, C.HEADER_FG);
  totalRow.getCell(2).alignment = align("center", "middle");
  totalRow.height = 26;
}

// ============================================================
// SHEET 3 — Vulnerability Test Results
// ============================================================
function buildVulnSheet(wb, vuln) {
  const ws = wb.addWorksheet("🔐 Vulnerability Tests", {
    properties: { tabColor: { argb: "FFEF4444" } },
    views: [{ state: "frozen", ySplit: 3 }],
  });

  ws.columns = [
    { width: 3 },
    { key: "suite",          width: 24 },
    { key: "name",           width: 45 },
    { key: "status",         width: 12 },
    { key: "severity",       width: 13 },
    { key: "detail",         width: 50 },
    { key: "recommendation", width: 55 },
    { width: 3 },
  ];

  ws.mergeCells("B1:G1");
  const title = ws.getCell("B1");
  title.value     = "Vulnerability Test Results — Security Audit";
  title.font      = font("FFFF6B6B", true, 14);
  title.fill      = hFill(C.TITLE_BG, "FFFF6B6B");
  title.alignment = align("center", "middle");
  ws.getRow(1).height = 36;

  const hRow = ws.getRow(2);
  hRow.values = ["", "Suite", "Test Name", "Status", "Severity", "Finding", "Recommendation", ""];
  applyHeaderRow(hRow, C.HEADER_BG, C.HEADER_FG);

  let prevSuite = null;
  let altRow = false;

  vuln.forEach((test) => {
    if (test.suite !== prevSuite) {
      const divRow = ws.addRow(["", test.suite, "", "", "", "", "", ""]);
      ws.mergeCells(divRow.number, 2, divRow.number, 7);
      divRow.getCell(2).value     = `📂  ${test.suite}`;
      divRow.getCell(2).fill      = hFill(C.SECTION_BG, C.SECTION_FG);
      divRow.getCell(2).font      = font(C.SECTION_FG, true, 11);
      divRow.getCell(2).alignment = align("left", "middle");
      divRow.height = 26;
      prevSuite = test.suite;
      altRow = false;
    }

    const r = ws.addRow([
      "",
      test.suite,
      test.name,
      test.status,
      test.severity || "INFO",
      test.detail || "",
      test.recommendation || "",
      "",
    ]);

    r.getCell(4).fill      = statusFill(test.status);
    r.getCell(4).font      = statusFont(test.status);
    r.getCell(4).alignment = align("center", "middle");

    r.getCell(5).fill      = severityFill(test.severity || "LOW");
    r.getCell(5).font      = severityFont(test.severity || "LOW");
    r.getCell(5).alignment = align("center", "middle");

    r.getCell(6).font      = test.status === "FAIL" ? font(C.FAIL_FG) : font("FF374151");
    r.getCell(6).alignment = align("left", "middle", true);

    r.getCell(7).font      = font("FF1D4ED8");
    r.getCell(7).alignment = align("left", "middle", true);

    [2, 3, 4, 5, 6, 7].forEach((c) => {
      r.getCell(c).border = border();
      if (c !== 4 && c !== 5) {
        r.getCell(c).fill = hFill(altRow ? C.ALT_ROW : C.WHITE, "FF000000");
      }
    });
    r.height = 28;
    altRow = !altRow;
  });

  ws.addRow([]);
  const pass = vuln.filter((r) => r.status === "PASS").length;
  const fail = vuln.filter((r) => r.status === "FAIL").length;
  const crit = vuln.filter((r) => r.status === "FAIL" && r.severity === "CRITICAL").length;
  const high = vuln.filter((r) => r.status === "FAIL" && r.severity === "HIGH").length;
  const totalRow = ws.addRow([
    "", `Total: ${vuln.length}`,
    `Pass: ${pass}  |  Fail: ${fail}  |  Critical: ${crit}  |  High: ${high}`,
    "", "", "", "", "",
  ]);
  ws.mergeCells(totalRow.number, 2, totalRow.number, 7);
  totalRow.getCell(2).font      = font(C.HEADER_FG, true, 11);
  totalRow.getCell(2).fill      = hFill(C.HEADER_BG, C.HEADER_FG);
  totalRow.getCell(2).alignment = align("center", "middle");
  totalRow.height = 26;
}

// ============================================================
// SHEET 4 — Load Test Results
// ============================================================
function buildLoadSheet(wb, load) {
  const ws = wb.addWorksheet("⚡ Load Tests", {
    properties: { tabColor: { argb: "FFFBBF24" } },
    views: [{ state: "frozen", ySplit: 3 }],
  });

  ws.columns = [
    { width: 3 },
    { key: "suite",     width: 28 },
    { key: "name",      width: 42 },
    { key: "status",    width: 12 },
    { key: "value",     width: 20 },
    { key: "threshold", width: 20 },
    { key: "detail",    width: 45 },
    { width: 3 },
  ];

  ws.mergeCells("B1:G1");
  const title = ws.getCell("B1");
  title.value     = "Load Test Results — Artillery Performance Analysis";
  title.font      = font("FFFBBF24", true, 14);
  title.fill      = hFill(C.TITLE_BG, "FFFBBF24");
  title.alignment = align("center", "middle");
  ws.getRow(1).height = 36;

  const hRow = ws.getRow(2);
  hRow.values = ["", "Suite", "Test / Threshold", "Status", "Actual Value", "Threshold", "Detail", ""];
  applyHeaderRow(hRow, C.HEADER_BG, C.HEADER_FG);

  const testCases = load.testCases || [];
  let prevSuite = null;
  let altRow = false;

  testCases.forEach((test) => {
    if (test.suite !== prevSuite) {
      const divRow = ws.addRow(["", test.suite, "", "", "", "", "", ""]);
      ws.mergeCells(divRow.number, 2, divRow.number, 7);
      divRow.getCell(2).value     = `📂  ${test.suite}`;
      divRow.getCell(2).fill      = hFill(C.SECTION_BG, C.SECTION_FG);
      divRow.getCell(2).font      = font(C.SECTION_FG, true, 11);
      divRow.getCell(2).alignment = align("left", "middle");
      divRow.height = 26;
      prevSuite = test.suite;
      altRow = false;
    }

    const r = ws.addRow([
      "",
      test.suite,
      test.name,
      test.status,
      test.value     || "",
      test.threshold || "",
      test.detail    || "",
      "",
    ]);

    r.getCell(4).fill      = statusFill(test.status);
    r.getCell(4).font      = statusFont(test.status);
    r.getCell(4).alignment = align("center", "middle");
    [2, 3, 5, 6, 7].forEach((c) => {
      r.getCell(c).fill      = hFill(altRow ? C.ALT_ROW : C.WHITE, "FF000000");
      r.getCell(c).border    = border();
      r.getCell(c).alignment = align("left", "middle", true);
    });
    r.getCell(4).border = border();
    r.height = 22;
    altRow = !altRow;
  });

  // Key metrics summary block
  if (load.responseTime) {
    ws.addRow([]); ws.addRow([]);
    const mHeader = ws.addRow(["", "Metric", "Value", "", "", "", "", ""]);
    applyHeaderRow(mHeader, C.SECTION_BG, C.SECTION_FG);
    [
      ["Total Requests",   load.totalRequests],
      ["Completed",        load.totalCompleted],
      ["Error Rate",       load.errorRate],
      ["Requests / sec",   load.requestsPerSecond],
      ["Min Response",     (load.responseTime.min  || 0) + "ms"],
      ["Mean Response",    (load.responseTime.mean || 0) + "ms"],
      ["P50 Response",     (load.responseTime.p50  || 0) + "ms"],
      ["P95 Response",     (load.responseTime.p95  || 0) + "ms"],
      ["P99 Response",     (load.responseTime.p99  || 0) + "ms"],
      ["Max Response",     (load.responseTime.max  || 0) + "ms"],
    ].forEach(([label, val], i) => {
      const r = ws.addRow(["", label, val, "", "", "", "", ""]);
      r.getCell(2).fill      = hFill(i % 2 ? C.ALT_ROW : C.WHITE, "FF000000");
      r.getCell(2).font      = font("FF1E293B", true);
      r.getCell(3).fill      = hFill(i % 2 ? C.ALT_ROW : C.WHITE, "FF000000");
      r.getCell(3).font      = font("FF1D4ED8", true);
      r.getCell(3).alignment = align("left", "middle");
      [2, 3].forEach((c) => { r.getCell(c).border = border(); });
      r.height = 22;
    });
  }
}

// ============================================================
// SHEET 5 — Load Test Phase Analysis
// ============================================================
function buildLoadPhaseSheet(wb, load) {
  const ws = wb.addWorksheet("📈 Load Phase Analysis", {
    properties: { tabColor: { argb: "FF8B5CF6" } },
  });

  ws.columns = [
    { width: 3 },
    { key: "phase",    width: 8  },
    { key: "name",     width: 22 },
    { key: "requests", width: 14 },
    { key: "p50",      width: 14 },
    { key: "p95",      width: 14 },
    { key: "p99",      width: 14 },
    { key: "err5xx",   width: 14 },
    { key: "status",   width: 12 },
    { width: 3 },
  ];

  ws.mergeCells("B1:I1");
  const title = ws.getCell("B1");
  title.value     = "Load Test — Phase-by-Phase Performance Analysis";
  title.font      = font("FFAB8EF8", true, 14);
  title.fill      = hFill(C.TITLE_BG, "FFAB8EF8");
  title.alignment = align("center", "middle");
  ws.getRow(1).height = 36;

  const hRow = ws.getRow(2);
  hRow.values = ["", "Phase", "Name", "Requests", "P50 (ms)", "P95 (ms)", "P99 (ms)", "5xx Errors", "Status", ""];
  applyHeaderRow(hRow, C.HEADER_BG, C.HEADER_FG);

  const phases = load.phases || [];

  if (phases.length === 0) {
    const r = ws.addRow(["", "", "No phase data available — load test may not have run yet", "", "", "", "", "", "", ""]);
    ws.mergeCells(r.number, 2, r.number, 9);
    r.getCell(2).font      = font("FF94A3B8", false, 11);
    r.getCell(2).alignment = align("center", "middle");
    r.height = 30;
  }

  phases.forEach((p, i) => {
    const pass = p.errors5xx === 0 && p.p99 <= 3000;
    const r = ws.addRow([
      "",
      p.phase,
      p.name || `Phase ${p.phase}`,
      p.requests,
      p.p50  || 0,
      p.p95  || 0,
      p.p99  || 0,
      p.errors5xx || 0,
      pass ? "✅ PASS" : "❌ FAIL",
      "",
    ]);

    [2, 3, 4, 5, 6, 7, 8].forEach((c) => {
      r.getCell(c).fill      = hFill(i % 2 ? C.ALT_ROW : C.WHITE, "FF000000");
      r.getCell(c).border    = border();
      r.getCell(c).alignment = align("center", "middle");
      r.getCell(c).font      = font("FF1E293B");
    });
    r.getCell(9).fill      = pass ? hFill(C.PASS_BG, C.PASS_FG) : hFill(C.FAIL_BG, C.FAIL_FG);
    r.getCell(9).font      = pass ? font(C.PASS_FG, true) : font(C.FAIL_FG, true);
    r.getCell(9).alignment = align("center", "middle");
    r.getCell(9).border    = border();
    r.height = 24;
  });

  // Artillery scenarios description
  ws.addRow([]); ws.addRow([]);
  const scenHeader = ws.addRow(["", "Phase", "Description", "Target RPS", "", "", "", "", "", ""]);
  applyHeaderRow(scenHeader, C.SECTION_BG, C.SECTION_FG);

  const scenDesc = [
    ["1", "Warm Up",         "Ramp from 2 → 5 req/sec over 20s"],
    ["2", "Sustained Load",  "Steady 10 req/sec for 40s"],
    ["3", "Spike Test",      "Sudden spike to 30 req/sec for 15s"],
    ["4", "Cool Down",       "Back to 2 req/sec for 15s"],
  ];

  scenDesc.forEach(([phase, name, desc], i) => {
    const r = ws.addRow(["", phase, name, desc, "", "", "", "", "", ""]);
    ws.mergeCells(r.number, 4, r.number, 9);
    [2, 3, 4].forEach((c) => {
      r.getCell(c).fill      = hFill(i % 2 ? C.ALT_ROW : C.WHITE, "FF000000");
      r.getCell(c).border    = border();
      r.getCell(c).alignment = align("center", "middle");
    });
    r.height = 22;
  });
}

// ============================================================
// SHEET 6 — Recommendations
// ============================================================
function buildRecommendationsSheet(wb, vuln) {
  const ws = wb.addWorksheet("💡 Recommendations", {
    properties: { tabColor: { argb: "FF38BDF8" } },
  });

  ws.columns = [
    { width: 3 },
    { key: "priority",       width: 13 },
    { key: "category",       width: 20 },
    { key: "finding",        width: 45 },
    { key: "recommendation", width: 65 },
    { key: "effort",         width: 14 },
    { width: 3 },
  ];

  ws.mergeCells("B1:F1");
  const title = ws.getCell("B1");
  title.value     = "Security Recommendations & Remediation Guide";
  title.font      = font("FF38BDF8", true, 14);
  title.fill      = hFill(C.TITLE_BG, "FF38BDF8");
  title.alignment = align("center", "middle");
  ws.getRow(1).height = 36;

  const hRow = ws.getRow(2);
  hRow.values = ["", "Priority", "Category", "Finding", "Recommendation", "Effort", ""];
  applyHeaderRow(hRow, C.HEADER_BG, C.HEADER_FG);

  // Pull FAIL recommendations from vuln results
  const failedVulns = vuln.filter((r) => r.status === "FAIL" && r.recommendation);

  // Sort by severity
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  failedVulns.sort((a, b) => (order[a.severity] || 4) - (order[b.severity] || 4));

  const effortMap = { CRITICAL: "🔴 Immediate", HIGH: "🟠 This Sprint", MEDIUM: "🟡 Next Sprint", LOW: "🟢 Backlog" };

  failedVulns.forEach((v, i) => {
    const r = ws.addRow([
      "",
      v.severity || "INFO",
      v.suite    || "",
      v.name     || "",
      v.recommendation || "",
      effortMap[v.severity] || "🟢 Backlog",
      "",
    ]);

    r.getCell(2).fill      = severityFill(v.severity || "LOW");
    r.getCell(2).font      = severityFont(v.severity || "LOW");
    r.getCell(2).alignment = align("center", "middle");
    r.getCell(2).border    = border();

    r.getCell(6).fill      = severityFill(v.severity || "LOW");
    r.getCell(6).font      = severityFont(v.severity || "LOW");
    r.getCell(6).alignment = align("center", "middle");
    r.getCell(6).border    = border();

    [3, 4, 5].forEach((c) => {
      r.getCell(c).fill      = hFill(i % 2 ? C.ALT_ROW : C.WHITE, "FF000000");
      r.getCell(c).border    = border();
      r.getCell(c).alignment = align("left", "middle", true);
      r.getCell(c).font      = font("FF1E293B");
    });
    r.height = 36;
  });

  if (failedVulns.length === 0) {
    const r = ws.addRow(["", "", "No failed vulnerability tests — all checks passed!", "", "", "", ""]);
    ws.mergeCells(r.number, 2, r.number, 6);
    r.getCell(2).fill      = hFill(C.PASS_BG, C.PASS_FG);
    r.getCell(2).font      = font(C.PASS_FG, true, 12);
    r.getCell(2).alignment = align("center", "middle");
    r.height = 36;
  }

  // General best practices
  ws.addRow([]); ws.addRow([]);
  const bpHeader = ws.addRow(["", "General Best Practice Recommendations", "", "", "", "", ""]);
  ws.mergeCells(bpHeader.number, 2, bpHeader.number, 6);
  applyHeaderRow(bpHeader, C.SECTION_BG, C.SECTION_FG);

  const bestPractices = [
    ["HIGH",   "Security Headers", "Add Flask-Talisman for HSTS, CSP, X-Frame-Options, X-Content-Type-Options", "🟠 This Sprint"],
    ["HIGH",   "CSRF Protection",  "Install Flask-WTF and add CSRFProtect(app) — all state-changing forms need a CSRF token", "🟠 This Sprint"],
    ["HIGH",   "Secret Key",       "Move SECRET_KEY to an environment variable. Use secrets.token_hex(32) to generate it", "🟠 This Sprint"],
    ["MEDIUM", "Rate Limiting",    "Add Flask-Limiter with limits like 5/minute on /login and /create-account", "🟡 Next Sprint"],
    ["MEDIUM", "Debug Mode",       "Set debug=False and use a proper WSGI server (gunicorn) for production", "🟡 Next Sprint"],
    ["LOW",    "Input Validation", "Add max-length validation on all form fields both client-side and server-side", "🟢 Backlog"],
    ["LOW",    "Server Header",    "Use nginx as a reverse proxy to hide the Werkzeug server header", "🟢 Backlog"],
  ];

  bestPractices.forEach(([sev, cat, rec, effort], i) => {
    const r = ws.addRow(["", sev, cat, rec, "", effort, ""]);
    r.getCell(2).fill      = severityFill(sev);
    r.getCell(2).font      = severityFont(sev);
    r.getCell(2).alignment = align("center", "middle");
    r.getCell(2).border    = border();
    r.getCell(6).fill      = severityFill(sev);
    r.getCell(6).font      = severityFont(sev);
    r.getCell(6).alignment = align("center", "middle");
    r.getCell(6).border    = border();
    [3, 4, 5].forEach((c) => {
      r.getCell(c).fill      = hFill(i % 2 ? C.ALT_ROW : C.WHITE, "FF000000");
      r.getCell(c).border    = border();
      r.getCell(c).alignment = align("left", "middle", true);
      r.getCell(c).font      = font("FF1E293B");
    });
    r.height = 30;
  });
}

// ============================================================
// SHEET — Generic flat results sheet (unit / validation / loadtime)
// ============================================================
function buildGenericSheet(wb, data, sheetName, tabColor, titleText, titleColor, columns) {
  const ws = wb.addWorksheet(sheetName, {
    properties: { tabColor: { argb: tabColor } },
    views: [{ state: "frozen", ySplit: 3 }],
  });

  ws.columns = [{ width: 3 }, ...columns, { width: 3 }];

  // Title row
  const colSpan = columns.length + 1;
  ws.mergeCells(1, 2, 1, colSpan);
  const titleCell      = ws.getCell(1, 2);
  titleCell.value      = titleText;
  titleCell.font       = font(titleColor, true, 14);
  titleCell.fill       = hFill(C.TITLE_BG, titleColor);
  titleCell.alignment  = align("center", "middle");
  ws.getRow(1).height  = 36;

  // Header row
  const hRow = ws.getRow(2);
  hRow.values = ["", ...columns.map((c) => c.header || c.key || ""), ""];
  applyHeaderRow(hRow, C.HEADER_BG, C.HEADER_FG);

  if (!data || data.length === 0) {
    const r = ws.addRow(["", "No results available — run the test suite first", ...Array(columns.length - 1).fill(""), ""]);
    ws.mergeCells(r.number, 2, r.number, colSpan);
    r.getCell(2).font      = font("FF94A3B8", false, 11);
    r.getCell(2).alignment = align("center", "middle");
    r.height = 30;
    return;
  }

  let prevSuite = null;
  let altRow    = false;

  data.forEach((test) => {
    // Suite divider
    if (test.suite && test.suite !== prevSuite) {
      const divRow = ws.addRow(["", test.suite, ...Array(columns.length - 1).fill(""), ""]);
      ws.mergeCells(divRow.number, 2, divRow.number, colSpan);
      divRow.getCell(2).value     = `📂  ${test.suite}`;
      divRow.getCell(2).fill      = hFill(C.SECTION_BG, C.SECTION_FG);
      divRow.getCell(2).font      = font(C.SECTION_FG, true, 11);
      divRow.getCell(2).alignment = align("left", "middle");
      divRow.height = 26;
      prevSuite = test.suite;
      altRow    = false;
    }

    const rowValues = ["", ...columns.map((c) => {
      if (c.key === "suite")    return test.suite    || "";
      if (c.key === "name")     return test.name     || "";
      if (c.key === "status")   return test.status   || "";
      if (c.key === "duration") return test.duration || 0;
      if (c.key === "detail")   return test.detail   || test.error || "";
      if (c.key === "severity") return test.severity || "INFO";
      if (c.key === "recommendation") return test.recommendation || "";
      return test[c.key] || "";
    }), ""];

    const r = ws.addRow(rowValues);

    // Style status cell
    const statusColIdx = columns.findIndex((c) => c.key === "status");
    if (statusColIdx >= 0) {
      const cell = r.getCell(statusColIdx + 2);
      cell.fill      = statusFill(test.status);
      cell.font      = statusFont(test.status);
      cell.alignment = align("center", "middle");
      cell.border    = border();
    }

    // Style severity cell if present
    const sevColIdx = columns.findIndex((c) => c.key === "severity");
    if (sevColIdx >= 0) {
      const cell = r.getCell(sevColIdx + 2);
      cell.fill      = severityFill(test.severity || "LOW");
      cell.font      = severityFont(test.severity || "LOW");
      cell.alignment = align("center", "middle");
      cell.border    = border();
    }

    // Fill remaining cells
    for (let i = 2; i <= colSpan; i++) {
      const cell  = r.getCell(i);
      const colDef = columns[i - 2];
      if (!colDef) continue;
      if (colDef.key !== "status" && colDef.key !== "severity") {
        cell.fill      = hFill(altRow ? C.ALT_ROW : C.WHITE, "FF000000");
        cell.font      = font("FF1E293B");
        cell.alignment = align("left", "middle", true);
        cell.border    = border();
      }
    }
    r.height = 22;
    altRow = !altRow;
  });

  // Totals footer
  ws.addRow([]);
  const pass = data.filter((r) => r.status === "PASS").length;
  const fail = data.filter((r) => r.status === "FAIL").length;
  const skip = data.filter((r) => r.status === "SKIP").length;
  const rate = data.length > 0 ? ((pass / data.length) * 100).toFixed(1) : "0.0";
  const totalRow = ws.addRow([
    "", `Total: ${data.length}`,
    `✅ Pass: ${pass}   ❌ Fail: ${fail}   ⚠️  Skip: ${skip}   Pass Rate: ${rate}%`,
    ...Array(columns.length - 2).fill(""), "",
  ]);
  ws.mergeCells(totalRow.number, 3, totalRow.number, colSpan);
  ws.mergeCells(totalRow.number, 2, totalRow.number, 2);
  totalRow.getCell(2).font      = font(C.HEADER_FG, true);
  totalRow.getCell(2).fill      = hFill(C.HEADER_BG, C.HEADER_FG);
  totalRow.getCell(2).alignment = align("center", "middle");
  totalRow.getCell(3).font      = font(C.HEADER_FG, true);
  totalRow.getCell(3).fill      = hFill(C.HEADER_BG, C.HEADER_FG);
  totalRow.getCell(3).alignment = align("center", "middle");
  totalRow.height = 26;
}

// ============================================================
// MAIN — Generate Report
// ============================================================
async function generateReport() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PhishGuard — Excel Report Generator");
  console.log("  300 Tests | 9 Sheets");
  console.log("═══════════════════════════════════════════════\n");

  if (!fs.existsSync(path.join(__dirname, "raw"))) {
    fs.mkdirSync(path.join(__dirname, "raw"), { recursive: true });
  }

  // Load all raw results
  console.log("  📂 Loading raw test results...");
  const e2e      = loadJSON("e2e_results.json",         []);
  const vuln     = loadJSON("vuln_results.json",        []);
  const unit     = loadJSON("unit_results.json",        []);
  const valid    = loadJSON("validation_results.json",  []);
  const loadtime = loadJSON("loadtime_results.json",    []);
  const load     = loadJSON("load_summary.json",        { testCases: [], responseTime: {}, phases: [] });

  console.log(`     E2E         : ${e2e.length}`);
  console.log(`     Unit        : ${unit.length}`);
  console.log(`     Validation  : ${valid.length}`);
  console.log(`     Load Time   : ${loadtime.length}`);
  console.log(`     Vuln        : ${vuln.length}`);
  console.log(`     Artillery   : ${(load.testCases || []).length} threshold checks`);

  // Column definitions reused across generic sheets
  const standardCols = [
    { key: "suite",    header: "Suite",        width: 26 },
    { key: "name",     header: "Test Name",    width: 48 },
    { key: "status",   header: "Status",       width: 12 },
    { key: "duration", header: "Duration(ms)", width: 14 },
    { key: "detail",   header: "Detail / Error", width: 50 },
  ];
  const vulnCols = [
    { key: "suite",          header: "Suite",          width: 24 },
    { key: "name",           header: "Test Name",      width: 44 },
    { key: "status",         header: "Status",         width: 12 },
    { key: "severity",       header: "Severity",       width: 12 },
    { key: "detail",         header: "Finding",        width: 44 },
    { key: "recommendation", header: "Recommendation", width: 52 },
  ];

  // Build workbook
  const wb = new ExcelJS.Workbook();
  wb.creator  = "PhishGuard Test Suite";
  wb.created  = new Date();
  wb.modified = new Date();

  console.log("\n  📊 Building sheets...");

  buildCoverSheet(wb, e2e, vuln, load, unit, valid, loadtime);
  console.log("     ✅ Summary Dashboard");

  buildGenericSheet(wb, e2e, "🧪 E2E Tests (120)", "FF22C55E",
    "E2E Tests — Selenium WebDriver  (120 tests)", "FF86EFAC", standardCols);
  console.log("     ✅ E2E Tests");

  buildGenericSheet(wb, unit, "🔬 Unit Tests (60)", "FF3B82F6",
    "Unit Tests — HTTP API & Route Behavior  (60 tests)", "FF93C5FD", standardCols);
  console.log("     ✅ Unit Tests");

  buildGenericSheet(wb, valid, "✔️  Validation (50)", "FF8B5CF6",
    "Validation Tests — Form Fields & Live Feedback  (50 tests)", "FFC4B5FD", standardCols);
  console.log("     ✅ Validation Tests");

  buildGenericSheet(wb, loadtime, "⏱ Load Time (40)", "FFFBBF24",
    "Load Time Tests — Performance & Timing  (40 tests)", "FFFDE68A", standardCols);
  console.log("     ✅ Load Time Tests");

  buildVulnSheet(wb, vuln);
  console.log("     ✅ Vulnerability Tests");

  buildLoadSheet(wb, load);
  console.log("     ✅ Artillery Load Tests");

  buildLoadPhaseSheet(wb, load);
  console.log("     ✅ Load Phase Analysis");

  buildRecommendationsSheet(wb, vuln);
  console.log("     ✅ Recommendations");

  await wb.xlsx.writeFile(OUTPUT_FILE);
  console.log(`\n  ✅ Report saved to:\n     ${OUTPUT_FILE}`);
  console.log("═══════════════════════════════════════════════\n");
  return OUTPUT_FILE;
}

if (require.main === module) {
  generateReport().catch((err) => {
    console.error("Report generation failed:", err);
    process.exit(1);
  });
}

module.exports = { generateReport };
