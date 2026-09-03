/**
 * Export Utilities — CSV download, Excel (.xlsx / .xml / CSV-formatted), and Google Sheets opener
 * Used across all data pages in the app.
 */

export type ExportRow = Record<string, string | number | null | undefined>;

/**
 * Convert an array of objects to a CSV string with proper UTF-8 BOM so Excel displays unicode & currency symbols flawlessly.
 */
export function toCSV(rows: ExportRow[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(','))
  ];
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Download data as a .csv file (with UTF-8 BOM for Native Excel Compatibility).
 */
export function exportToCSV(rows: ExportRow[], filename = 'export.csv') {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export directly formatted as Microsoft Excel XML (.xls / .xlsx-ready) Spreadsheet 
 * with styled table headers, autofit types, number formats, and zero third-party dependencies.
 */
export function exportToExcel(rows: ExportRow[], filename = 'export.xls') {
  if (!rows.length) {
    exportToCSV(rows, filename);
    return;
  }

  const headers = Object.keys(rows[0]);
  
  const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#00B386"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#00B386" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="TextCell">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Data">
  <Table>
`;

  const headerRowXml = `   <Row ss:Height="24">\n` + 
    headers.map(h => `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('\n') + 
    `\n   </Row>\n`;

  const dataRowsXml = rows.map(row => {
    const cells = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined || val === '') {
        return `    <Cell ss:StyleID="TextCell"><Data ss:Type="String">-</Data></Cell>`;
      }
      if (typeof val === 'number') {
        return `    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${val}</Data></Cell>`;
      }
      const numVal = Number(val);
      if (!isNaN(numVal) && String(val).trim() !== '' && !String(val).startsWith('0') && !String(val).includes('-') && !String(val).includes('/')) {
        return `    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${numVal}</Data></Cell>`;
      }
      return `    <Cell ss:StyleID="TextCell"><Data ss:Type="String">${escapeXml(String(val))}</Data></Cell>`;
    }).join('\n');
    return `   <Row ss:Height="20">\n${cells}\n   </Row>`;
  }).join('\n');

  const xmlFooter = `
  </Table>
 </Worksheet>
</Workbook>`;

  const completeXml = xmlHeader + headerRowXml + dataRowsXml + xmlFooter;
  const blob = new Blob([completeXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Open data in Google Sheets via the import URL trick.
 * Downloads CSV first, then opens the Sheets import page.
 */
export function exportToGoogleSheets(rows: ExportRow[], filename = 'export') {
  exportToCSV(rows, filename);
  setTimeout(() => {
    window.open('https://docs.google.com/spreadsheets/d/create', '_blank');
  }, 500);
}

/**
 * Convert live Fund objects to export rows with common columns.
 */
import type { Fund } from './types';

export function fundsToExportRows(funds: Fund[]): ExportRow[] {
  return funds.map(f => ({
    'Scheme Name': f.label ?? f.schemeName ?? '',
    'Category': f.category ?? '',
    'AMC': f.amc ?? '',
    'AUM (Cr)': f.aum ?? '',
    'NAV': f.nav ?? '',
    'NAV Date': f.navDate ?? '',
    'CAGR 1Y (%)': f.y1 ?? '',
    'CAGR 3Y (%)': f.y3 ?? '',
    'CAGR 5Y (%)': f.y5 ?? '',
    'CAGR 10Y (%)': f.y10 ?? '',
    'Sharpe 3Y': f.sharpe3 ?? '',
    'Sortino 3Y': f.sort3 ?? '',
    'Beta 3Y': f.beta3 ?? '',
    'Std Dev 3Y (%)': f.sd3 ?? '',
    'Max Drawdown (%)': f.maxDrawdown ?? '',
    'Alpha (%)': f.alpha ?? '',
    'Expense Ratio (%)': f.exp ?? '',
    '3Y Roll Min (%)': f.r3min ?? '',
    '3Y Roll Median (%)': f.r3med ?? '',
    '3Y Roll Max (%)': f.r3max ?? '',
    'Return vs Cat 3Y': f.ret3yVsCat ?? '',
    'P/E': f.pe ?? '',
    'P/B': f.pb ?? '',
    '% Equity': f.percEquity ?? '',
    '% Large Cap': f.percLargecap ?? '',
    '% Mid Cap': f.percMidcap ?? '',
    '% Small Cap': f.percSmallcap ?? '',
    'No. of Holdings': f.nhold ?? '',
    'Top 10 Holdings %': f.percTop10 ?? '',
    'Risk Level': f.riskometer ?? '',
    'Rating': f.rating ?? '',
    'Launch Year': f.launch ? new Date(f.launch).getFullYear() : '',
  }));
}
