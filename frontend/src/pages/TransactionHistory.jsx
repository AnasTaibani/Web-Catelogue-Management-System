import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Search, FileText, FileSpreadsheet, Printer, ArrowUpDown } from "lucide-react";
import { exportTransactionsPDF, exportTransactionsExcel, fmtDateShort } from "@/lib/exports";

export default function TransactionHistory() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => { api.get("/transactions").then(({ data }) => setList(data)); }, []);

  const filtered = useMemo(() => {
    let out = list;
    if (status !== "all") out = out.filter((t) => t.status === status);
    if (q) { const qs = q.toLowerCase(); out = out.filter((t) => t.customer_name.toLowerCase().includes(qs) || t.transaction_id.toLowerCase().includes(qs) || t.items.some((i) => i.catalogue_name.toLowerCase().includes(qs))); }
    const dir = sortDir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      let av = a[sortBy]; let bv = b[sortBy];
      if (sortBy === "customer_name") return ((av || "").localeCompare(bv || "")) * dir;
      return (new Date(av || 0).getTime() - new Date(bv || 0).getTime()) * dir;
    });
    return out;
  }, [list, q, status, sortBy, sortDir]);

  const head = (k, label) => (
    <th className="cursor-pointer select-none" onClick={() => { sortBy === k ? setSortDir(sortDir === "asc" ? "desc" : "asc") : (setSortBy(k), setSortDir("desc")); }}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="w-3 h-3" /></span>
    </th>
  );

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--ll-gold)] mb-3">Ledger</div>
          <h1 className="font-serif text-5xl text-white tracking-tight" style={{ letterSpacing: "-0.03em" }}>Transaction history</h1>
          <p className="text-neutral-500 mt-3 text-sm">{filtered.length} of {list.length} records</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button data-testid="print-history-btn" onClick={() => window.print()} className="btn-ghost"><Printer className="w-4 h-4" /> Print</button>
          <button data-testid="export-pdf-btn" onClick={() => exportTransactionsPDF(filtered)} className="btn-dark"><FileText className="w-4 h-4" /> PDF</button>
          <button data-testid="export-excel-btn" onClick={() => exportTransactionsExcel(filtered)} className="btn-dark"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
        </div>
      </header>

      <div className="card-lux overflow-hidden">
        <div className="px-6 py-5 flex flex-wrap gap-3 items-center border-b" style={{ borderColor: "var(--ll-border)" }}>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input data-testid="history-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client / catalogue / txn…" className="input-lux pl-10" />
          </div>
          <select data-testid="history-status-filter" value={status} onChange={(e) => setStatus(e.target.value)} className="input-lux w-40">
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="returned">Returned</option>
          </select>
        </div>
        <div className="overflow-x-auto print-area">
          <table className="table-lux" data-testid="history-table">
            <thead><tr>
              {head("customer_name", "Client")}
              <th>Catalogues</th>
              <th>Qty</th>
              {head("issue_date", "Issued")}
              <th>Due</th>
              <th>Returned</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-16 text-neutral-500">No records</td></tr>}
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="text-white font-medium">{t.customer_name}</td>
                  <td className="text-neutral-300">
                    <div className="flex flex-col gap-0.5">
                      {t.items.map((i, idx) => <span key={idx}>{i.catalogue_name}</span>)}
                    </div>
                  </td>
                  <td className="text-[color:var(--ll-gold)] font-medium">{t.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td>{fmtDateShort(t.issue_date)}</td>
                  <td>{fmtDateShort(t.expected_return_date)}</td>
                  <td>{fmtDateShort(t.actual_return_date)}</td>
                  <td><span className={`badge-lux ${t.status === "returned" ? "badge-emerald" : t.status === "partial" ? "badge-gold" : "badge-neutral"}`}>{t.status}</span></td>
                  <td className="text-neutral-500 text-xs">{t.remarks || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
