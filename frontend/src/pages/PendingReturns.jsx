import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Search, AlertTriangle, Clock } from "lucide-react";
import { fmtDateShort, daysBetween } from "@/lib/exports";

export default function PendingReturns() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => { api.get("/transactions/pending").then(({ data }) => setItems(data)); }, []);

  const rows = useMemo(() => {
    const out = [];
    items.forEach((t) => t.items.forEach((it, idx) => { if (it.status !== "returned") out.push({ txn: t, item: it, idx }); }));
    if (!q) return out;
    const qs = q.toLowerCase();
    return out.filter((r) => r.txn.customer_name.toLowerCase().includes(qs) || r.item.catalogue_name.toLowerCase().includes(qs) || r.txn.transaction_id.toLowerCase().includes(qs));
  }, [items, q]);
  const overdueCount = rows.filter((r) => new Date(r.txn.expected_return_date) < new Date()).length;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--ll-gold)] mb-3">Owed</div>
          <h1 className="font-serif text-5xl text-white tracking-tight" style={{ letterSpacing: "-0.03em" }}>Pending returns</h1>
          <p className="text-neutral-500 mt-3 text-sm">{rows.length} in the field · <span className="text-[color:var(--ll-red)]">{overdueCount} overdue</span></p>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" strokeWidth={1.6} />
          <input data-testid="pending-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client / catalogue…" className="input-lux pl-10 w-80" />
        </div>
      </header>

      <div className="card-lux overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-20 text-center text-neutral-500 text-sm">
            <Clock className="w-8 h-8 mx-auto mb-3 text-neutral-700" strokeWidth={1.4} />No pending returns.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-lux" data-testid="pending-table">
              <thead><tr><th>Client</th><th>Contact</th><th>Catalogue</th><th>Qty</th><th>Issued</th><th>Due</th><th>Days</th></tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const overdue = new Date(r.txn.expected_return_date) < new Date();
                  const days = daysBetween(r.txn.issue_date);
                  return (
                    <tr key={i} style={overdue ? { background: "rgba(226,112,112,0.05)" } : {}}>
                      <td className="text-white font-medium">{r.txn.customer_name}</td>
                      <td className="font-mono-2 text-xs">{r.txn.customer_mobile || "-"}</td>
                      <td className="text-neutral-300">{r.item.catalogue_name}</td>
                      <td className="text-[color:var(--ll-gold)] font-medium">{r.item.quantity}</td>
                      <td>{fmtDateShort(r.txn.issue_date)}</td>
                      <td className={overdue ? "text-[color:var(--ll-red)] font-medium" : ""}>
                        {overdue && <AlertTriangle className="inline w-3.5 h-3.5 mr-1.5" strokeWidth={1.8} />}
                        {fmtDateShort(r.txn.expected_return_date)}
                      </td>
                      <td><span className={`badge-lux ${overdue ? "badge-red" : "badge-gold"}`}>{days}d</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
