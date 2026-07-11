import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { FileText, FileSpreadsheet, BarChart3, Calendar, BookOpen, Users, Clock } from "lucide-react";
import { exportTransactionsPDF, exportTransactionsExcel } from "@/lib/exports";
import * as XLSX from "xlsx";

function inRange(iso, range) {
  if (!iso) return false;
  const d = new Date(iso); const now = new Date();
  if (range === "today") return d.toDateString() === now.toDateString();
  if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
}

function downloadCSV(rows, filename) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename; a.click();
}

const Card = ({ testId, icon: Icon, title, desc, count, onPdf, onExcel, onCsv }) => (
  <div data-testid={testId} className="card-lux p-6 group hover:-translate-y-0.5 transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: "rgba(200,169,106,0.08)", border: "1px solid rgba(200,169,106,0.20)" }}>
        <Icon className="w-[18px] h-[18px] text-[color:var(--ll-gold)]" strokeWidth={1.6} />
      </div>
      <div className="font-serif text-3xl text-white tracking-tight">{count}</div>
    </div>
    <h3 className="font-serif text-lg text-white">{title}</h3>
    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{desc}</p>
    <div className="mt-5 pt-4 border-t flex flex-wrap gap-2" style={{ borderColor: "var(--ll-border)" }}>
      <button data-testid={`${testId}-pdf`} onClick={onPdf} className="btn-dark text-xs px-3 py-1.5"><FileText className="w-3.5 h-3.5" /> PDF</button>
      <button data-testid={`${testId}-excel`} onClick={onExcel} className="btn-dark text-xs px-3 py-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</button>
      {onCsv && <button data-testid={`${testId}-csv`} onClick={onCsv} className="btn-ghost text-xs px-3 py-1.5">CSV</button>}
    </div>
  </div>
);

export default function Reports() {
  const [txns, setTxns] = useState([]);
  const [cats, setCats] = useState([]);
  const [custs, setCusts] = useState([]);
  useEffect(() => {
    Promise.all([api.get("/transactions"), api.get("/catalogues"), api.get("/customers")])
      .then(([t, c, u]) => { setTxns(t.data); setCats(c.data); setCusts(u.data); });
  }, []);

  const issuedToday = txns.filter((t) => inRange(t.issue_date, "today"));
  const returnedToday = txns.filter((t) => t.items.some((i) => i.returned_at && inRange(i.returned_at, "today")));
  const monthTxns = txns.filter((t) => inRange(t.issue_date, "month"));
  const pending = txns.filter((t) => t.status === "pending" || t.status === "partial");

  return (
    <div className="space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--ll-gold)] mb-3">Insights</div>
        <h1 className="font-serif text-5xl text-white tracking-tight" style={{ letterSpacing: "-0.03em" }}>Reports</h1>
        <p className="text-neutral-500 mt-3 text-sm">Considered exports for record and reflection.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card testId="report-daily-issue" icon={Calendar} title="Daily Issue" desc="All catalogues issued today" count={issuedToday.length}
          onPdf={() => exportTransactionsPDF(issuedToday, "Daily-Issue")}
          onExcel={() => exportTransactionsExcel(issuedToday, "Daily-Issue")}
          onCsv={() => downloadCSV(issuedToday.map((t) => ({ TxnID: t.transaction_id, Client: t.customer_name, Items: t.items.length, Qty: t.items.reduce((s, i) => s + i.quantity, 0) })), "daily-issue.csv")}
        />
        <Card testId="report-daily-return" icon={Calendar} title="Daily Return" desc="All catalogues returned today" count={returnedToday.length}
          onPdf={() => exportTransactionsPDF(returnedToday, "Daily-Return")}
          onExcel={() => exportTransactionsExcel(returnedToday, "Daily-Return")}
        />
        <Card testId="report-monthly" icon={BarChart3} title="Monthly" desc="This month's transactions" count={monthTxns.length}
          onPdf={() => exportTransactionsPDF(monthTxns, "Monthly")}
          onExcel={() => exportTransactionsExcel(monthTxns, "Monthly")}
        />
        <Card testId="report-pending" icon={Clock} title="Pending Returns" desc="Currently outstanding" count={pending.length}
          onPdf={() => exportTransactionsPDF(pending, "Pending")}
          onExcel={() => exportTransactionsExcel(pending, "Pending")}
        />
        <Card testId="report-inventory" icon={BookOpen} title="Inventory" desc="Full catalogue stock" count={cats.length}
          onPdf={() => exportTransactionsPDF([], "Inventory")}
          onExcel={() => {
            const ws = XLSX.utils.json_to_sheet(cats.map((c) => ({ Name: c.name, Brand: c.brand, Total: c.total_quantity, Available: c.available_quantity, Issued: c.issued_quantity })));
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Inventory");
            XLSX.writeFile(wb, "Luxur-Lavish-Inventory.xlsx");
          }}
          onCsv={() => downloadCSV(cats.map((c) => ({ Name: c.name, Brand: c.brand, Total: c.total_quantity, Available: c.available_quantity, Issued: c.issued_quantity })), "inventory.csv")}
        />
        <Card testId="report-customer" icon={Users} title="Clientele" desc="All clients in database" count={custs.length}
          onPdf={() => exportTransactionsPDF(txns, "Client-All")}
          onExcel={() => {
            const ws = XLSX.utils.json_to_sheet(custs.map((c) => ({ Name: c.name, Mobile: c.mobile, WhatsApp: c.whatsapp, Address: c.address })));
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Clients");
            XLSX.writeFile(wb, "Luxur-Lavish-Clients.xlsx");
          }}
          onCsv={() => downloadCSV(custs.map((c) => ({ Name: c.name, Mobile: c.mobile, Address: c.address })), "clients.csv")}
        />
      </div>
    </div>
  );
}
