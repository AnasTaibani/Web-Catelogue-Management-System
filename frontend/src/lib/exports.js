import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const BRAND = "Luxur & Lavish";

export function fmtDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch { return iso; }
}

export function fmtDateShort(iso) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" }); } catch { return iso; }
}

export function daysBetween(fromIso, toIso = null) {
  const a = new Date(fromIso).getTime();
  const b = toIso ? new Date(toIso).getTime() : Date.now();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function header(doc, title) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#1E3A8A");
  doc.text(BRAND, 14, 18);
  doc.setFontSize(11);
  doc.setTextColor("#475569");
  doc.text("Catalogue Return Management System", 14, 25);
  doc.setFontSize(13);
  doc.setTextColor("#0F172A");
  doc.text(title, 14, 35);
  doc.setLineWidth(0.5);
  doc.setDrawColor("#1E3A8A");
  doc.line(14, 38, 196, 38);
}

export function exportTransactionsPDF(transactions, filenameSuffix = "") {
  const doc = new jsPDF();
  header(doc, "Transaction History");
  const rows = transactions.map((t) => {
    const cats = t.items.map((i) => `${i.catalogue_name} x${i.quantity}`).join(", ");
    return [
      t.transaction_id,
      t.customer_name,
      cats,
      String(t.items.reduce((s, i) => s + i.quantity, 0)),
      fmtDateShort(t.issue_date),
      fmtDateShort(t.actual_return_date),
      t.status,
      t.remarks || "-",
    ];
  });
  autoTable(doc, {
    startY: 42,
    head: [["Transaction ID", "Customer", "Catalogues", "Qty", "Issue Date", "Return Date", "Status", "Remarks"]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.save(`Luxur-Lavish-Transactions${filenameSuffix ? "-" + filenameSuffix : ""}.pdf`);
}

export function exportTransactionsExcel(transactions, filenameSuffix = "") {
  const rows = transactions.map((t) => ({
    "Transaction ID": t.transaction_id,
    "Customer Name": t.customer_name,
    "Mobile": t.customer_mobile || "",
    "Catalogues": t.items.map((i) => `${i.catalogue_name} (${i.company || ""}) x${i.quantity}`).join("; "),
    "Total Qty": t.items.reduce((s, i) => s + i.quantity, 0),
    "Issue Date": fmtDateShort(t.issue_date),
    "Expected Return": fmtDateShort(t.expected_return_date),
    "Actual Return": fmtDateShort(t.actual_return_date),
    "Status": t.status,
    "Remarks": t.remarks || "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  // Header row
  XLSX.utils.sheet_add_aoa(ws, [["Luxur & Lavish – Transactions"]], { origin: -1 });
  XLSX.writeFile(wb, `Luxur-Lavish-Transactions${filenameSuffix ? "-" + filenameSuffix : ""}.xlsx`);
}

export function exportCataloguePDF(cat) {
  const doc = new jsPDF();
  header(doc, "Catalogue Detail");
  doc.setFontSize(11);
  doc.setTextColor("#0F172A");
  doc.text(`Name: ${cat.name}`, 14, 48);
  doc.text(`House / Brand: ${cat.brand || "-"}`, 14, 55);
  doc.text(`Category: ${cat.category || "-"}`, 14, 62);
  doc.text(`Added: ${fmtDateShort(cat.date_added)}`, 120, 48);
  autoTable(doc, {
    startY: 72,
    head: [["Total", "Available", "Issued", "Returned"]],
    body: [[cat.total_quantity, cat.available_quantity, cat.issued_quantity, cat.returned_count || 0]],
    styles: { fontSize: 10, cellPadding: 4, halign: "center" },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, halign: "center" },
  });
  if (cat.description) {
    const y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor("#475569");
    doc.text("Description:", 14, y);
    doc.setTextColor("#0F172A");
    doc.text(doc.splitTextToSize(cat.description, 180), 14, y + 6);
  }
  doc.save(`Luxur-Lavish-Catalogue-${cat.name.replace(/\s+/g, "-")}.pdf`);
}

export function exportIssueSlipPDF(txn) {
  const doc = new jsPDF();
  header(doc, "Issue Slip");
  doc.setFontSize(10);
  doc.setTextColor("#0F172A");
  doc.text(`Transaction ID: ${txn.transaction_id}`, 14, 46);
  doc.text(`Customer: ${txn.customer_name}`, 14, 52);
  if (txn.customer_mobile) doc.text(`Mobile: ${txn.customer_mobile}`, 14, 58);
  doc.text(`Issue Date: ${fmtDate(txn.issue_date)}`, 120, 46);
  doc.text(`Expected Return: ${fmtDateShort(txn.expected_return_date)}`, 120, 52);

  autoTable(doc, {
    startY: 66,
    head: [["#", "Catalogue", "Company", "Quantity", "Remarks"]],
    body: txn.items.map((it, idx) => [idx + 1, it.catalogue_name, it.company || "-", it.quantity, it.remarks || "-"]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
  });

  const totalQty = txn.items.reduce((s, i) => s + i.quantity, 0);
  const endY = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.text(`Total Catalogues Issued: ${totalQty}`, 14, endY);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Items: ${txn.items.length}`, 14, endY + 6);

  doc.text("Customer Signature: ____________________", 14, endY + 30);
  doc.text("Authorized Signature: __________________", 120, endY + 30);

  doc.save(`Luxur-Lavish-Issue-Slip-${txn.transaction_id}.pdf`);
}

export function exportIssueSlipExcel(txn) {
  const wb = XLSX.utils.book_new();
  const meta = [
    ["Luxur & Lavish – Issue Slip"],
    [],
    ["Transaction ID", txn.transaction_id],
    ["Customer Name", txn.customer_name],
    ["Mobile", txn.customer_mobile || ""],
    ["Issue Date", fmtDate(txn.issue_date)],
    ["Expected Return", fmtDateShort(txn.expected_return_date)],
    [],
    ["#", "Catalogue", "Company", "Quantity", "Remarks"],
    ...txn.items.map((it, idx) => [idx + 1, it.catalogue_name, it.company || "", it.quantity, it.remarks || ""]),
    [],
    ["Total Catalogues Issued", txn.items.reduce((s, i) => s + i.quantity, 0)],
  ];
  const ws = XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.book_append_sheet(wb, ws, "Issue Slip");
  XLSX.writeFile(wb, `Luxur-Lavish-Issue-Slip-${txn.transaction_id}.xlsx`);
}
