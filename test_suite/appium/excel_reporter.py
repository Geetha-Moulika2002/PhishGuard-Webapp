import os
import datetime

def generate_excel_report(test_results, output_path):
    """
    Generates a structured, professional Excel (.xlsx) / CSV compatible test report
    summarizing Appium E2E Functional, Validation, Security & Vulnerability Test Results.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Generate CSV/Excel formatted content
    lines = []
    lines.append("Test ID,Category,Test Case Name,Target Component,Input Data,Expected Result,Actual Status,Execution Time (ms),Security Score")
    
    total_passed = 0
    total_failed = 0
    
    for item in test_results:
        tid = item.get("id", "TC-000")
        cat = item.get("category", "Functional E2E")
        name = item.get("name", "Test Case").replace(",", " ")
        comp = item.get("component", "MainActivity").replace(",", " ")
        data = str(item.get("input", "N/A")).replace(",", " ")
        exp = item.get("expected", "Success").replace(",", " ")
        status = item.get("status", "PASS")
        duration = item.get("duration_ms", 120)
        sec_score = item.get("security_score", 95)
        
        if status == "PASS":
            total_passed += 1
        else:
            total_failed += 1
            
        lines.append(f"{tid},{cat},{name},{comp},{data},{exp},{status},{duration},{sec_score}")
        
    csv_path = output_path.replace(".xlsx", ".csv")
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
        
    # Also write XML-based Excel workbook (.xlsx) format
    xlsx_content = generate_openxml_spreadsheet(test_results, total_passed, total_failed)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(xlsx_content)
        
    print(f"[REPORT] Excel Test Report Generated: {output_path}")
    print(f"[REPORT] CSV Summary Generated: {csv_path}")

def generate_openxml_spreadsheet(results, passed, failed):
    header = f"""<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Background ss:Color="#10192E" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Pass"><Font ss:Color="#10B981" ss:Bold="1"/></Style>
  <Style ss:ID="Fail"><Font ss:Color="#EF4444" ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="PhishGuard Test Results">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Test ID</Data></Cell>
    <Cell><Data ss:Type="String">Category</Data></Cell>
    <Cell><Data ss:Type="String">Test Case Name</Data></Cell>
    <Cell><Data ss:Type="String">Target Component</Data></Cell>
    <Cell><Data ss:Type="String">Expected Result</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>"""
    
    rows = []
    for r in results:
        status_style = "Pass" if r.get("status") == "PASS" else "Fail"
        row_str = f"""
   <Row>
    <Cell><Data ss:Type="String">{r.get('id')}</Data></Cell>
    <Cell><Data ss:Type="String">{r.get('category')}</Data></Cell>
    <Cell><Data ss:Type="String">{r.get('name')}</Data></Cell>
    <Cell><Data ss:Type="String">{r.get('component')}</Data></Cell>
    <Cell><Data ss:Type="String">{r.get('expected')}</Data></Cell>
    <Cell ss:StyleID="{status_style}"><Data ss:Type="String">{r.get('status')}</Data></Cell>
   </Row>"""
        rows.append(row_str)
        
    footer = """
  </Table>
 </Worksheet>
</Workbook>"""
    return header + "".join(rows) + footer

if __name__ == "__main__":
    sample = [
        {"id": "TC-APP-001", "category": "Validation", "name": "Short Password Registration Reject", "component": "LoginActivity", "input": "pass", "expected": "Validation Error Banner", "status": "PASS", "duration_ms": 95},
        {"id": "TC-APP-002", "category": "Vulnerability", "name": "SQL Injection SMS Payload Immunity", "component": "PhishingAnalyzer", "input": "' OR '1'='1", "expected": "Parsed Safely Without Crash", "status": "PASS", "duration_ms": 110}
    ]
    generate_excel_report(sample, "PhishGuard_Mobile_Appium_Test_Report.xlsx")
