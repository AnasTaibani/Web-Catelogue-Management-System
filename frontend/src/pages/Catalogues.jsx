import React, { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, BookOpen, LayoutGrid, List, MoreHorizontal, Copy, Eye, FileText, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { exportCataloguePDF, fmtDateShort } from "@/lib/exports";

const empty = { name: "", brand: "", category: "", total_quantity: 0, description: "", image_url: "" };
const PLACEHOLDER = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80";

export default function Catalogues() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState("grid");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [delId, setDelId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const nav = useNavigate();

  const load = useCallback(async () => {
  const { data } = await api.get(
    `/catalogues${q ? `?q=${encodeURIComponent(q)}` : ""}`
  );
  setList(data);
}, [q]);

  useEffect(() => {
  load();
}, [load]);

  const openAdd = () => { setForm(empty); setEditingId(null); setOpen(true); };
  const openEdit = (c) => { setForm({ name: c.name, brand: c.brand, category: c.category, total_quantity: c.total_quantity, description: c.description, image_url: c.image_url }); setEditingId(c.id); setOpen(true); };
  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    try {
      if (editingId) await api.put(`/catalogues/${editingId}`, form); else await api.post(`/catalogues`, form);
      toast.success(editingId ? "Updated" : "Added"); setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const doDelete = async () => { try { await api.delete(`/catalogues/${delId}`); toast.success("Deleted"); setDelId(null); load(); } catch (e) { toast.error(e?.response?.data?.detail || "Delete failed"); } };
  const duplicate = async (c) => {
    try {
      await api.post("/catalogues", { name: `${c.name} (Copy)`, brand: c.brand, category: c.category, total_quantity: c.total_quantity, description: c.description, image_url: c.image_url });
      toast.success("Duplicated"); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Duplicate failed"); }
  };
  const issueThis = (c) => nav(`/issue?catalogue=${encodeURIComponent(c.name)}`);
  const viewing = list.find((c) => c.id === viewingId);

  // Status helper: "Issued" if has issued qty; "Draft" otherwise. Purely visual — no locking.
  const statusOf = (c) => (c.issued_quantity > 0 ? "Issued" : "Draft");

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--ll-gold)] mb-3">Inventory</div>
          <h1 className="font-serif text-5xl text-white tracking-tight" style={{ letterSpacing: "-0.03em" }}>Catalogues</h1>
          <p className="text-neutral-500 mt-3 text-sm">The complete atelier collection.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl p-1" style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border)" }}>
            <button onClick={() => setView("grid")} className={`p-1.5 rounded-lg ${view === "grid" ? "bg-white/[0.06] text-white" : "text-neutral-500"}`} data-testid="view-grid-btn"><LayoutGrid className="w-4 h-4" strokeWidth={1.6} /></button>
            <button onClick={() => setView("list")} className={`p-1.5 rounded-lg ${view === "list" ? "bg-white/[0.06] text-white" : "text-neutral-500"}`} data-testid="view-list-btn"><List className="w-4 h-4" strokeWidth={1.6} /></button>
          </div>
          <button data-testid="add-catalogue-btn" onClick={openAdd} className="btn-gold"><Plus className="w-4 h-4" /> Add Catalogue</button>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" strokeWidth={1.6} />
        <input data-testid="catalogue-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className="input-lux pl-10" />
      </div>

      {list.length === 0 ? (
        <div className="card-lux py-20 text-center text-neutral-500 text-sm">
          <BookOpen className="w-8 h-8 mx-auto mb-3 text-neutral-700" strokeWidth={1.4} />
          No catalogues yet. Add your first title above.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" data-testid="catalogues-table">
          {list.map((c) => {
            const status = statusOf(c);
            return (
            <div key={c.id} className="card-lux overflow-hidden group hover:-translate-y-0.5 transition-all">
              <div className="aspect-[4/5] overflow-hidden relative" style={{ background: "var(--ll-card-2)" }}>
                <img src={c.image_url || PLACEHOLDER} alt={c.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.target.src = PLACEHOLDER; }} />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span data-testid={`status-badge-${c.id}`} className={`badge-lux backdrop-blur-md ${status === "Issued" ? "badge-gold" : "badge-neutral"}`} style={{ background: status === "Issued" ? "rgba(200,169,106,0.18)" : "rgba(0,0,0,0.5)" }}>{status}</span>
                  {c.available_quantity === 0 && <span className="badge-lux badge-red backdrop-blur-md">Out</span>}
                </div>
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button data-testid={`actions-menu-${c.id}`} className="w-8 h-8 rounded-full grid place-items-center backdrop-blur-md text-white/90 hover:text-white transition-colors" style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <MoreHorizontal className="w-4 h-4" strokeWidth={1.8} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", color: "var(--ll-text)" }}>
                      <DropdownMenuItem data-testid={`action-view-${c.id}`} onClick={() => setViewingId(c.id)} className="cursor-pointer"><Eye className="w-3.5 h-3.5 mr-2" /> View</DropdownMenuItem>
                      <DropdownMenuItem data-testid={`action-edit-${c.id}`} onClick={() => openEdit(c)} className="cursor-pointer"><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem data-testid={`action-duplicate-${c.id}`} onClick={() => duplicate(c)} className="cursor-pointer"><Copy className="w-3.5 h-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem data-testid={`action-pdf-${c.id}`} onClick={() => exportCataloguePDF(c)} className="cursor-pointer"><FileText className="w-3.5 h-3.5 mr-2" /> Export PDF</DropdownMenuItem>
                      {status === "Draft" && (
                        <DropdownMenuItem data-testid={`action-issue-${c.id}`} onClick={() => issueThis(c)} className="cursor-pointer"><Send className="w-3.5 h-3.5 mr-2" /> Issue Catalogue</DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem data-testid={`action-delete-${c.id}`} onClick={() => setDelId(c.id)} className="cursor-pointer text-red-400 focus:text-red-300"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="p-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{c.brand || "House"}</div>
                <h3 className="font-serif text-lg text-white mt-1 truncate">{c.name}</h3>
                <div className="flex items-center gap-3 mt-4 text-xs text-neutral-400 font-mono-2">
                  <span><span className="text-neutral-600">Avail </span><span className="text-[color:var(--ll-gold)]">{c.available_quantity}</span></span>
                  <span className="text-neutral-700">·</span>
                  <span><span className="text-neutral-600">Issued </span>{c.issued_quantity}</span>
                  <span className="text-neutral-700">·</span>
                  <span><span className="text-neutral-600">Total </span>{c.total_quantity}</span>
                </div>
                <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: "var(--ll-border)" }}>
                  <span className="text-[11px] text-neutral-500">{fmtDateShort(c.date_added)}</span>
                  <div className="flex items-center gap-1">
                    <button data-testid={`edit-catalogue-${c.id}`} onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.05]"><Pencil className="w-3.5 h-3.5" /></button>
                    <button data-testid={`delete-catalogue-${c.id}`} onClick={() => setDelId(c.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/[0.05]"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="card-lux overflow-hidden">
          <table className="table-lux">
            <thead><tr><th>Name</th><th>House</th><th>Category</th><th>Status</th><th>Total</th><th>Available</th><th>Issued</th><th></th></tr></thead>
            <tbody>
              {list.map((c) => {
                const status = statusOf(c);
                return (
                <tr key={c.id}>
                  <td className="text-white font-medium">{c.name}</td>
                  <td>{c.brand || "-"}</td>
                  <td>{c.category || "-"}</td>
                  <td><span className={`badge-lux ${status === "Issued" ? "badge-gold" : "badge-neutral"}`}>{status}</span></td>
                  <td>{c.total_quantity}</td>
                  <td className="text-[color:var(--ll-gold)]">{c.available_quantity}</td>
                  <td>{c.issued_quantity}</td>
                  <td className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button data-testid={`row-actions-menu-${c.id}`} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.05]"><MoreHorizontal className="w-4 h-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", color: "var(--ll-text)" }}>
                        <DropdownMenuItem onClick={() => setViewingId(c.id)} className="cursor-pointer"><Eye className="w-3.5 h-3.5 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(c)} className="cursor-pointer"><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate(c)} className="cursor-pointer"><Copy className="w-3.5 h-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportCataloguePDF(c)} className="cursor-pointer"><FileText className="w-3.5 h-3.5 mr-2" /> Export PDF</DropdownMenuItem>
                        {status === "Draft" && <DropdownMenuItem onClick={() => issueThis(c)} className="cursor-pointer"><Send className="w-3.5 h-3.5 mr-2" /> Issue Catalogue</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDelId(c.id)} className="cursor-pointer text-red-400 focus:text-red-300"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", color: "var(--ll-text)" }}>
          <DialogHeader><DialogTitle className="font-serif text-2xl">{editingId ? "Edit catalogue" : "New catalogue"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2"><label className="label-lux">Name</label><input data-testid="catalogue-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-lux mt-2" /></div>
            <div><label className="label-lux">House / Brand</label><input data-testid="catalogue-brand-input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input-lux mt-2" /></div>
            <div><label className="label-lux">Category</label><input data-testid="catalogue-category-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-lux mt-2" /></div>
            <div><label className="label-lux">Total Quantity</label><input data-testid="catalogue-total-input" type="number" min={0} value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: parseInt(e.target.value || "0", 10) })} className="input-lux mt-2" /></div>
            <div><label className="label-lux">Image URL</label><input data-testid="catalogue-image-input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input-lux mt-2" /></div>
            <div className="col-span-2"><label className="label-lux">Description</label><textarea data-testid="catalogue-description-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-lux mt-2" /></div>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
            <button data-testid="save-catalogue-btn" onClick={save} className="btn-gold">{editingId ? "Save changes" : "Add catalogue"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", color: "var(--ll-text)" }}>
          <AlertDialogHeader><AlertDialogTitle className="font-serif text-2xl">Delete this catalogue?</AlertDialogTitle><AlertDialogDescription className="text-neutral-500">This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-catalogue-btn" onClick={doDelete} style={{ background: "var(--ll-red)", color: "white" }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewingId} onOpenChange={(o) => !o && setViewingId(null)}>
        <DialogContent style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", color: "var(--ll-text)" }} data-testid="catalogue-view-dialog">
          {viewing && (
            <div>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-24 rounded-lg overflow-hidden shrink-0" style={{ background: "var(--ll-card-2)" }}>
                    <img src={viewing.image_url || PLACEHOLDER} alt={viewing.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = PLACEHOLDER; }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{viewing.brand || "House"}</div>
                    <DialogTitle className="font-serif text-2xl mt-1">{viewing.name}</DialogTitle>
                    <div className="mt-2"><span className={`badge-lux ${statusOf(viewing) === "Issued" ? "badge-gold" : "badge-neutral"}`}>{statusOf(viewing)}</span></div>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-4 gap-3 mt-5">
                {[["Total", viewing.total_quantity], ["Available", viewing.available_quantity], ["Issued", viewing.issued_quantity], ["Returned", viewing.returned_count || 0]].map(([k, v]) => (
                  <div key={k} className="p-3 rounded-lg text-center" style={{ background: "var(--ll-card-2)", border: "1px solid var(--ll-border)" }}>
                    <div className="label-lux">{k}</div>
                    <div className="font-serif text-2xl text-white mt-1">{v}</div>
                  </div>
                ))}
              </div>
              {viewing.category && <div className="mt-4 text-sm"><span className="text-neutral-500">Category · </span><span className="text-neutral-200">{viewing.category}</span></div>}
              {viewing.description && <p className="mt-4 text-sm text-neutral-400 leading-relaxed">{viewing.description}</p>}
              <div className="text-xs text-neutral-600 mt-4">Added {fmtDateShort(viewing.date_added)}</div>
              <DialogFooter className="mt-6">
                <button onClick={() => exportCataloguePDF(viewing)} className="btn-ghost"><FileText className="w-4 h-4" /> Export PDF</button>
                <button onClick={() => { openEdit(viewing); setViewingId(null); }} className="btn-gold"><Pencil className="w-4 h-4" /> Edit</button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
