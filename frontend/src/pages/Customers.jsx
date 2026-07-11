import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Users, Phone, MessageCircle, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

const empty = { name: "", mobile: "", whatsapp: "", address: "", notes: "" };

export default function Customers() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [delId, setDelId] = useState(null);

  const load = useCallback(async () => {
  const { data } = await api.get(
    `/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`
  );
  setList(data);
}, [q]);

useEffect(() => {
  load();
}, [load]);
  const openAdd = () => { setForm(empty); setEditingId(null); setOpen(true); };
  const openEdit = (c) => { setForm({ name: c.name, mobile: c.mobile, whatsapp: c.whatsapp, address: c.address, notes: c.notes }); setEditingId(c.id); setOpen(true); };
  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    try {
      if (editingId) await api.put(`/customers/${editingId}`, form); else await api.post(`/customers`, form);
      toast.success(editingId ? "Updated" : "Added"); setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const doDelete = async () => { try { await api.delete(`/customers/${delId}`); toast.success("Deleted"); setDelId(null); load(); } catch { toast.error("Delete failed"); } };

  const initials = (n) => (n || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--ll-gold)] mb-3">Roster</div>
          <h1 className="font-serif text-5xl text-white tracking-tight" style={{ letterSpacing: "-0.03em" }}>Clientele</h1>
          <p className="text-neutral-500 mt-3 text-sm">The people we craft for.</p>
        </div>
        <button data-testid="add-customer-btn" onClick={openAdd} className="btn-gold"><Plus className="w-4 h-4" /> Add Client</button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" strokeWidth={1.6} />
        <input data-testid="customer-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className="input-lux pl-10" />
      </div>

      {list.length === 0 ? (
        <div className="card-lux py-20 text-center text-neutral-500 text-sm">
          <Users className="w-8 h-8 mx-auto mb-3 text-neutral-700" strokeWidth={1.4} />No clientele yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="customers-table">
          {list.map((c) => (
            <div key={c.id} className="card-lux p-6 group hover:-translate-y-0.5 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full grid place-items-center font-serif text-lg shrink-0" style={{ background: "linear-gradient(140deg, #C8A96A 0%, #8B7440 100%)", color: "#1a1508" }}>
                  {initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg text-white truncate">{c.name}</h3>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 mt-0.5">Client</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button data-testid={`edit-customer-${c.id}`} onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.05]"><Pencil className="w-3.5 h-3.5" /></button>
                  <button data-testid={`delete-customer-${c.id}`} onClick={() => setDelId(c.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/[0.05]"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="mt-5 space-y-2.5 text-sm text-neutral-300">
                {c.mobile && <div className="flex items-center gap-2.5"><Phone className="w-3.5 h-3.5 text-neutral-500" strokeWidth={1.6} /><span className="font-mono-2 text-xs">{c.mobile}</span></div>}
                {c.whatsapp && <div className="flex items-center gap-2.5"><MessageCircle className="w-3.5 h-3.5 text-neutral-500" strokeWidth={1.6} /><span className="font-mono-2 text-xs">{c.whatsapp}</span></div>}
                {c.address && <div className="flex items-start gap-2.5"><MapPin className="w-3.5 h-3.5 text-neutral-500 mt-0.5" strokeWidth={1.6} /><span className="text-xs text-neutral-400 leading-relaxed">{c.address}</span></div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", color: "var(--ll-text)" }}>
          <DialogHeader><DialogTitle className="font-serif text-2xl">{editingId ? "Edit client" : "New client"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2"><label className="label-lux">Full Name</label><input data-testid="customer-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-lux mt-2" /></div>
            <div><label className="label-lux">Mobile</label><input data-testid="customer-mobile-input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="input-lux mt-2" /></div>
            <div><label className="label-lux">WhatsApp</label><input data-testid="customer-whatsapp-input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="input-lux mt-2" /></div>
            <div className="col-span-2"><label className="label-lux">Address</label><input data-testid="customer-address-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-lux mt-2" /></div>
            <div className="col-span-2"><label className="label-lux">Notes</label><textarea data-testid="customer-notes-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-lux mt-2" /></div>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
            <button data-testid="save-customer-btn" onClick={save} className="btn-gold">{editingId ? "Save" : "Add client"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", color: "var(--ll-text)" }}>
          <AlertDialogHeader><AlertDialogTitle className="font-serif text-2xl">Delete this client?</AlertDialogTitle><AlertDialogDescription className="text-neutral-500">This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-customer-btn" onClick={doDelete} style={{ background: "var(--ll-red)", color: "white" }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
