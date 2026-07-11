import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, X, ArrowUpRight, Printer, FileText, FileSpreadsheet } from "lucide-react";
import { exportIssueSlipPDF, exportIssueSlipExcel, fmtDate } from "@/lib/exports";
import { useSearchParams } from "react-router-dom";

const emptyRow = { catalogue_name: "", company: "", quantity: 1, remarks: "" };

function Autocomplete({ items, value, onChange, placeholder, testId, getLabel = (i) => i.name, getSub = () => "" }) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    if (!value) return items.slice(0, 8);
    return items.filter((i) => getLabel(i).toLowerCase().includes(value.toLowerCase())).slice(0, 8);
  }, [items, value, getLabel]);

  return (
    <div className="relative">
      <input
        data-testid={testId}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder={placeholder}
        className="input-lux"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl max-h-56 overflow-auto fade-up" style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", boxShadow: "0 12px 28px -8px rgba(0,0,0,0.6)" }}>
          {filtered.map((it, i) => (
            <button type="button" key={i} onClick={() => { onChange(getLabel(it), it); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-white/[0.04] text-sm border-b last:border-0" style={{ borderColor: "var(--ll-border)" }}>
              <div className="font-medium text-neutral-100">{getLabel(it)}</div>
              {getSub(it) && <div className="text-xs text-neutral-500 mt-0.5">{getSub(it)}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IssueCatalogue() {
  const [customers, setCustomers] = useState([]);
  const [catalogues, setCatalogues] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [rows, setRows] = useState([{ ...emptyRow }]);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expected, setExpected] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); });
  const [remarks, setRemarks] = useState("");
  const [lastTxn, setLastTxn] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const refresh = async () => {
    const [cu, ca] = await Promise.all([api.get("/customers"), api.get("/catalogues")]);
    setCustomers(cu.data); setCatalogues(ca.data);
  };
  useEffect(() => { refresh(); }, []);

  // Prefill catalogue row from ?catalogue=NAME (from Catalogues action menu)
  useEffect(() => {
    const preName = searchParams.get("catalogue");
    if (preName) {
      setRows([{ ...emptyRow, catalogue_name: preName }]);
      searchParams.delete("catalogue");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line
  }, []);

  const addRow = () => setRows([...rows, { ...emptyRow }]);
  const removeRow = (idx) => setRows(rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows);
  const updateRow = (idx, patch) => setRows(rows.map((r, i) => i === idx ? { ...r, ...patch } : r));

  const submit = async () => {
    if (!customerName.trim()) { toast.error("Client name required"); return; }
    for (const r of rows) {
      if (!r.catalogue_name.trim()) { toast.error("Every row needs a catalogue"); return; }
      if (!r.quantity || r.quantity < 1) { toast.error("Quantity must be ≥ 1"); return; }
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/transactions/issue", {
        customer_name: customerName.trim(), customer_mobile: customerMobile.trim(),
        items: rows.map((r) => ({ ...r, quantity: parseInt(r.quantity, 10) })),
        issue_date: new Date(issueDate).toISOString(),
        expected_return_date: new Date(expected).toISOString(),
        remarks,
      });
      setLastTxn(data);
      toast.success(`Issued ${data.items.length} · ${data.transaction_id}`);
      setRows([{ ...emptyRow }]); setCustomerName(""); setCustomerMobile(""); setRemarks("");
      refresh();
    } catch (e) { toast.error(e?.response?.data?.detail || "Issue failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--ll-gold)] mb-3">Ledger · New entry</div>
        <h1 className="font-serif text-5xl text-white tracking-tight" style={{ letterSpacing: "-0.03em" }}>Issue catalogue</h1>
        <p className="text-neutral-500 mt-3 text-sm max-w-xl leading-relaxed">Assign one or several catalogues to a client. New clients and titles are quietly created on the fly.</p>
      </header>

      <section className="card-lux p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="md:col-span-2">
            <label className="label-lux">Client Name</label>
            <div className="mt-2"><Autocomplete testId="issue-customer-name-input" items={customers} value={customerName} onChange={(v, item) => { setCustomerName(v); if (item) setCustomerMobile(item.mobile || ""); }} placeholder="Type to search or create…" getSub={(c) => c.mobile || ""} /></div>
          </div>
          <div><label className="label-lux">Mobile</label><input data-testid="issue-customer-mobile-input" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} className="input-lux mt-2" /></div>
          <div><label className="label-lux">Issue Date</label><input data-testid="issue-date-input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="input-lux mt-2" style={{ colorScheme: "dark" }} /></div>
          <div><label className="label-lux">Expected Return</label><input data-testid="issue-expected-input" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className="input-lux mt-2" style={{ colorScheme: "dark" }} /></div>
          <div className="md:col-span-3"><label className="label-lux">Remarks</label><input data-testid="issue-remarks-input" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="input-lux mt-2" placeholder="Optional note for the transaction" /></div>
        </div>

        <div className="divider" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-lux">Items</div>
              <h3 className="font-serif text-2xl text-white mt-1">Catalogues to issue</h3>
            </div>
            <button data-testid="add-row-btn" onClick={addRow} className="btn-ghost"><Plus className="w-4 h-4" /> Add row</button>
          </div>
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div key={idx} data-testid={`issue-row-${idx}`} className="grid grid-cols-12 gap-3 items-start p-4 rounded-xl" style={{ background: "var(--ll-card-2)", border: "1px solid var(--ll-border)" }}>
                <div className="col-span-12 md:col-span-5">
                  <label className="label-lux">Catalogue</label>
                  <div className="mt-2"><Autocomplete testId={`row-catalogue-${idx}`} items={catalogues} value={row.catalogue_name} onChange={(v, item) => updateRow(idx, { catalogue_name: v, company: item?.brand || row.company })} placeholder="Type name (auto-creates)…" getSub={(c) => `Available · ${c.available_quantity}`} /></div>
                </div>
                <div className="col-span-6 md:col-span-3"><label className="label-lux">Company</label><input data-testid={`row-company-${idx}`} value={row.company} onChange={(e) => updateRow(idx, { company: e.target.value })} className="input-lux mt-2" /></div>
                <div className="col-span-3 md:col-span-1"><label className="label-lux">Qty</label><input data-testid={`row-qty-${idx}`} type="number" min={1} value={row.quantity} onChange={(e) => updateRow(idx, { quantity: parseInt(e.target.value || "1", 10) })} className="input-lux mt-2" /></div>
                <div className="col-span-3 md:col-span-2"><label className="label-lux">Remarks</label><input data-testid={`row-remarks-${idx}`} value={row.remarks} onChange={(e) => updateRow(idx, { remarks: e.target.value })} className="input-lux mt-2" /></div>
                <div className="col-span-12 md:col-span-1 flex md:justify-end">
                  <button data-testid={`remove-row-${idx}`} onClick={() => removeRow(idx)} disabled={rows.length === 1} className="md:mt-6 p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-white/[0.04] disabled:opacity-30"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button data-testid="submit-issue-btn" onClick={submit} disabled={submitting} className="btn-gold"><ArrowUpRight className="w-4 h-4" /> {submitting ? "Issuing…" : "Issue catalogues"}</button>
        </div>
      </section>

      {lastTxn && (
        <section className="card-lux overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3 no-print border-b" style={{ borderColor: "var(--ll-border)" }}>
            <div>
              <div className="label-lux">Issue Slip</div>
              <div className="font-mono-2 text-sm text-neutral-200 mt-1">{lastTxn.transaction_id}</div>
            </div>
            <div className="flex gap-2">
              <button data-testid="slip-print-btn" onClick={() => window.print()} className="btn-ghost"><Printer className="w-4 h-4" /> Print</button>
              <button data-testid="slip-pdf-btn" onClick={() => exportIssueSlipPDF(lastTxn)} className="btn-dark"><FileText className="w-4 h-4" /> PDF</button>
              <button data-testid="slip-excel-btn" onClick={() => exportIssueSlipExcel(lastTxn)} className="btn-dark"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
            </div>
          </div>
          <div className="print-area p-8">
            <div className="flex items-start justify-between border-b pb-5 mb-5" style={{ borderColor: "var(--ll-border)" }}>
              <div>
                <div className="font-serif text-3xl text-white" style={{ letterSpacing: "-0.03em" }}>Luxur & Lavish</div>
                <div className="text-xs text-neutral-500 mt-1 tracking-widest uppercase">Issue Slip</div>
              </div>
              <div className="text-right text-xs text-neutral-400 space-y-0.5 font-mono-2">
                <div><span className="text-neutral-600">Txn </span>{lastTxn.transaction_id}</div>
                <div><span className="text-neutral-600">Issued </span>{fmtDate(lastTxn.issue_date)}</div>
                <div><span className="text-neutral-600">Due </span>{fmtDate(lastTxn.expected_return_date)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
              <div><span className="text-neutral-500">Client · </span><span className="text-white font-medium">{lastTxn.customer_name}</span></div>
              {lastTxn.customer_mobile && <div><span className="text-neutral-500">Mobile · </span><span className="text-white font-mono-2">{lastTxn.customer_mobile}</span></div>}
            </div>
            <table className="w-full text-sm border-t border-b" style={{ borderColor: "var(--ll-border)" }}>
              <thead><tr className="text-left" style={{ background: "#141414" }}>
                <th className="py-3 px-4 label-lux">#</th><th className="py-3 px-4 label-lux">Catalogue</th><th className="py-3 px-4 label-lux">Company</th><th className="py-3 px-4 label-lux text-right">Qty</th><th className="py-3 px-4 label-lux">Remarks</th>
              </tr></thead>
              <tbody>
                {lastTxn.items.map((it, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--ll-border)" }}>
                    <td className="py-3 px-4 text-neutral-500">{i + 1}</td>
                    <td className="py-3 px-4 text-white font-medium">{it.catalogue_name}</td>
                    <td className="py-3 px-4 text-neutral-300">{it.company || "-"}</td>
                    <td className="py-3 px-4 text-right text-[color:var(--ll-gold)] font-medium">{it.quantity}</td>
                    <td className="py-3 px-4 text-neutral-400">{it.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{ background: "#141414" }}><td colSpan={3} className="py-3 px-4 text-right text-neutral-400">Total catalogues issued</td><td className="py-3 px-4 text-right text-white font-medium">{lastTxn.items.reduce((s, i) => s + i.quantity, 0)}</td><td></td></tr></tfoot>
            </table>
            <div className="grid grid-cols-2 gap-8 mt-16 text-[11px] text-neutral-500 uppercase tracking-widest">
              <div className="border-t pt-3" style={{ borderColor: "var(--ll-border-strong)" }}>Client Signature</div>
              <div className="border-t pt-3 text-right" style={{ borderColor: "var(--ll-border-strong)" }}>Authorized Signature</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
