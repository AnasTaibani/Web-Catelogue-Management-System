import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Search, ArrowDownLeft, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { fmtDateShort, daysBetween } from "@/lib/exports";

export default function ReturnCatalogue() {
  const [allCustomers, setAllCustomers] = useState([]);
  const [name, setName] = useState("");
  const [pending, setPending] = useState([]);
  const [selected, setSelected] = useState({});
  const [returnRemarks, setReturnRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/customers").then(({ data }) => setAllCustomers(data)); }, []);

  const search = async (n = name) => {
    if (!n.trim()) { toast.error("Enter client name"); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/transactions/pending?customer=${encodeURIComponent(n.trim())}`);
      setPending(data); setSelected({});
      if (data.length === 0) toast.info("No pending catalogues for this client");
    } finally { setLoading(false); }
  };

  const toggle = (txnId, idx) => setSelected((s) => {
    const cur = new Set(s[txnId] || []);
    if (cur.has(idx)) cur.delete(idx); else cur.add(idx);
    return { ...s, [txnId]: cur };
  });

  const totalSelected = useMemo(() => Object.values(selected).reduce((s, set) => s + set.size, 0), [selected]);

  const doReturn = async () => {
    const entries = Object.entries(selected).filter(([, set]) => set.size > 0);
    if (entries.length === 0) { toast.error("Select items to return"); return; }
    try {
      for (const [txnId, set] of entries) {
        await api.post("/transactions/return", { transaction_id: txnId, item_indexes: Array.from(set), return_remarks: returnRemarks });
      }
      toast.success(`Returned ${totalSelected} item(s)`);
      setReturnRemarks(""); search();
    } catch (e) { toast.error(e?.response?.data?.detail || "Return failed"); }
  };

  const filteredCustomers = useMemo(() => {
    if (!name) return [];
    return allCustomers.filter((c) => c.name.toLowerCase().includes(name.toLowerCase())).slice(0, 6);
  }, [name, allCustomers]);

  return (
    <div className="space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--ll-gold)] mb-3">Ledger · Close</div>
        <h1 className="font-serif text-5xl text-white tracking-tight" style={{ letterSpacing: "-0.03em" }}>Return catalogue</h1>
        <p className="text-neutral-500 mt-3 text-sm">Search by client name and return one, several, or all pending catalogues.</p>
      </header>

      <section className="card-lux p-8">
        <label className="label-lux">Client Name</label>
        <div className="mt-3 flex gap-3 relative">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" strokeWidth={1.6} />
            <input data-testid="return-customer-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Type client name…" className="input-lux pl-10" />
            {filteredCustomers.length > 0 && name && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl max-h-56 overflow-auto z-20 fade-up" style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", boxShadow: "0 12px 28px -8px rgba(0,0,0,0.6)" }}>
                {filteredCustomers.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setName(c.name); search(c.name); }} className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] text-sm border-b last:border-0" style={{ borderColor: "var(--ll-border)" }}>
                    <div className="text-white font-medium">{c.name}</div>
                    {c.mobile && <div className="text-xs text-neutral-500 mt-0.5 font-mono-2">{c.mobile}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button data-testid="return-search-btn" onClick={() => search()} disabled={loading} className="btn-gold">{loading ? "Searching…" : "Search"}</button>
        </div>
      </section>

      {pending.length > 0 && (
        <>
          <div className="space-y-4">
            {pending.map((t) => {
              const overdue = new Date(t.expected_return_date) < new Date();
              return (
                <div key={t.id} data-testid={`return-txn-${t.id}`} className="card-lux overflow-hidden">
                  <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-2 border-b" style={{ borderColor: "var(--ll-border)", background: "#141414" }}>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono-2 text-xs text-neutral-500">{t.transaction_id}</span>
                      <span className="text-neutral-700">·</span>
                      <span className="text-white font-medium">{t.customer_name}</span>
                      {t.customer_mobile && <span className="text-neutral-500 font-mono-2 text-xs">· {t.customer_mobile}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-neutral-500">Issued <span className="text-neutral-300">{fmtDateShort(t.issue_date)}</span></span>
                      <span className={`badge-lux ${overdue ? "badge-red" : "badge-gold"}`}>{overdue ? `Overdue · ${daysBetween(t.expected_return_date)}d` : `Due ${fmtDateShort(t.expected_return_date)}`}</span>
                    </div>
                  </div>
                  <table className="table-lux">
                    <thead><tr><th className="w-10"></th><th>Catalogue</th><th>Company</th><th className="text-right">Qty</th><th>Status</th></tr></thead>
                    <tbody>
                      {t.items.map((it, idx) => (
                        <tr key={idx} className={it.status === "returned" ? "opacity-50" : ""}>
                          <td><Checkbox data-testid={`return-item-${t.id}-${idx}`} checked={selected[t.id]?.has(idx) || false} onCheckedChange={() => toggle(t.id, idx)} disabled={it.status === "returned"} /></td>
                          <td className="text-white font-medium">{it.catalogue_name}</td>
                          <td>{it.company || "-"}</td>
                          <td className="text-right text-[color:var(--ll-gold)] font-medium">{it.quantity}</td>
                          <td>{it.status === "returned"
                            ? <span className="badge-lux badge-emerald"><CheckCircle2 className="w-3 h-3" /> Returned</span>
                            : <span className="badge-lux badge-neutral">Pending</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          <div className="card-lux p-5 flex items-center gap-3 flex-wrap sticky bottom-4" style={{ boxShadow: "0 20px 40px -12px rgba(0,0,0,0.6)" }}>
            <input data-testid="return-remarks-input" value={returnRemarks} onChange={(e) => setReturnRemarks(e.target.value)} placeholder="Return remarks (optional)" className="input-lux flex-1 min-w-[220px]" />
            <div className="text-sm text-neutral-400">Selected · <span className="text-[color:var(--ll-gold)] font-medium">{totalSelected}</span></div>
            <button data-testid="confirm-return-btn" onClick={doReturn} disabled={totalSelected === 0} className="btn-gold" style={{ background: "linear-gradient(180deg, #4CC48C 0%, #3FAF7D 100%)", color: "#0a1912" }}>
              <ArrowDownLeft className="w-4 h-4" /> Return selected
            </button>
          </div>
        </>
      )}
    </div>
  );
}
