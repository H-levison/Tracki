import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency } from './taxCalculator';

/**
 * Export sales data to PDF
 */
export const exportToPDF = (salesData, reportTitle = 'Sales Report') => {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(reportTitle, 14, 20);

  // Add date range if provided
  if (salesData.dateRange) {
    doc.setFontSize(12);
    doc.text(
      `Period: ${salesData.dateRange.start} to ${salesData.dateRange.end}`,
      14,
      30
    );
  }

  // Prepare table data
  const tableData = salesData.sales.map((sale) => [
    sale.createdAt.toLocaleDateString(),
    sale.items.map((item) => item.productName).join(', '),
    sale.paymentMethod,
    formatCurrency(sale.subtotal),
    formatCurrency(sale.vatAmount),
    formatCurrency(sale.total),
  ]);

  // Add table
  doc.autoTable({
    head: [['Date', 'Products', 'Payment', 'Subtotal', 'VAT', 'Total']],
    body: tableData,
    startY: salesData.dateRange ? 40 : 30,
    styles: { fontSize: 9 },
  });

  // Add summary
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text(`Total Sales: ${formatCurrency(salesData.summary.totalSales)}`, 14, finalY);
  doc.text(`Total VAT: ${formatCurrency(salesData.summary.totalVAT)}`, 14, finalY + 10);
  doc.text(`Grand Total: ${formatCurrency(salesData.summary.grandTotal)}`, 14, finalY + 20);

  // Save the PDF
  doc.save(`${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export sales data to Excel
 */
export const exportToExcel = (salesData, reportTitle = 'Sales Report') => {
  // Prepare worksheet data
  const worksheetData = [
    [reportTitle],
    salesData.dateRange
      ? [`Period: ${salesData.dateRange.start} to ${salesData.dateRange.end}`]
      : [],
    [], // Empty row
    ['Date', 'Products', 'Payment Method', 'Subtotal', 'VAT', 'Total'],
    ...salesData.sales.map((sale) => [
      sale.createdAt.toLocaleDateString(),
      sale.items.map((item) => item.productName).join(', '),
      sale.paymentMethod,
      sale.subtotal,
      sale.vatAmount,
      sale.total,
    ]),
    [], // Empty row
    ['Summary'],
    ['Total Sales', salesData.summary.totalSales],
    ['Total VAT', salesData.summary.totalVAT],
    ['Grand Total', salesData.summary.grandTotal],
  ];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 30 }, // Products
    { wch: 15 }, // Payment
    { wch: 12 }, // Subtotal
    { wch: 12 }, // VAT
    { wch: 12 }, // Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

  // Save the file
  XLSX.writeFile(
    wb,
    `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  );
};

/**
 * Export sales data to CSV
 */
export const exportToCSV = (salesData, reportTitle = 'Sales Report') => {
  // Prepare CSV rows
  const rows = [];
  
  // Header row
  rows.push(['Date', 'Products', 'Payment Method', 'Subtotal', 'VAT', 'Total']);
  
  // Data rows
  salesData.sales.forEach((sale) => {
    rows.push([
      sale.createdAt.toLocaleDateString(),
      sale.items.map((item) => item.productName).join(', '),
      sale.paymentMethod,
      sale.subtotal.toFixed(2),
      sale.vatAmount.toFixed(2),
      sale.total.toFixed(2),
    ]);
  });
  
  // Empty row
  rows.push([]);
  
  // Summary row
  rows.push(['Summary']);
  rows.push(['Total Sales', salesData.summary.totalSales.toFixed(2)]);
  rows.push(['Total VAT', salesData.summary.totalVAT.toFixed(2)]);
  rows.push(['Grand Total', salesData.summary.grandTotal.toFixed(2)]);
  
  // Convert to CSV string
  const csvContent = rows.map(row => 
    row.map(cell => {
      // Escape cells that contain commas, quotes, or newlines
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

