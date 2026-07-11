import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, BookOpen, Users, ArrowUpRight, ArrowDownLeft, Clock, History, FileBarChart, LogOut, Search, Menu, ChevronsLeft, ChevronsRight, Sun, Moon, Monitor } from "lucide-react";
import api from "@/lib/api";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useTheme } from "@/lib/theme";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/catalogues", label: "Catalogues", icon: BookOpen },
  { to: "/customers", label: "Clientele", icon: Users },
  { to: "/issue", label: "Issue", icon: ArrowUpRight },
  { to: "/return", label: "Return", icon: ArrowDownLeft },
  { to: "/pending", label: "Pending", icon: Clock },
  { to: "/history", label: "History", icon: History },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];

function Brand({ collapsed }) {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: "linear-gradient(140deg, #C8A96A 0%, #8B7440 100%)", boxShadow: "0 6px 20px -6px rgba(200,169,106,0.5)" }}>
        <span className="text-black font-serif text-lg font-semibold">L</span>
      </div>
      {!collapsed && (
        <div className="fade-up">
          <div className="font-serif text-[17px] font-medium text-white tracking-tight">Luxur & Lavish</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mt-0.5">Atelier System</div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNav, collapsed = false }) {
  return (
    <div className="h-full flex flex-col" style={{ background: "var(--ll-sidebar)", borderRight: "1px solid var(--ll-border)", width: collapsed ? 72 : 240, transition: "width .28s cubic-bezier(.4,0,.2,1)" }}>
      <Brand collapsed={collapsed} />
      <div className="px-3 py-2 flex-1 overflow-y-auto">
        {!collapsed && <div className="label-lux px-3 py-2">Navigation</div>}
        <nav className="space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={onNav}
              data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) => `sidebar-item flex items-center gap-3 ${collapsed ? "justify-center px-2" : "px-3"} py-2.5 rounded-lg text-[13px] transition-all ${
                isActive ? "active" : ""
              }`}
              style={({ isActive }) => ({
                background: isActive ? "var(--ll-hover)" : "transparent",
                color: isActive ? "var(--ll-text)" : "var(--ll-text-2)",
              })}
              title={collapsed ? n.label : undefined}
            >
              <span className="active-indicator" />
              <n.icon className={`w-[18px] h-[18px] shrink-0`} strokeWidth={1.6} aria-hidden="true" />
              {!collapsed && <span className="font-medium">{n.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
      {!collapsed && (
        <div className="px-5 py-4 border-t" style={{ borderColor: "var(--ll-border)" }}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">Version</div>
          <div className="text-xs text-neutral-500 mt-0.5">1.0 · Atelier Edition</div>
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (!q || q.length < 2) { setResults(null); return; }
    const t = setTimeout(async () => {
      try { const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`); setResults(data); setOpen(true); } catch { /* ignore */ }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative w-full max-w-lg">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" strokeWidth={1.6} />
      <input
        data-testid="global-search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search clients, catalogues, transactions…"
        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl focus:outline-none"
        style={{ background: "var(--ll-input)", border: "1px solid var(--ll-border)", color: "var(--ll-text)" }}
      />
      {open && results && (
        <div data-testid="global-search-results" className="absolute z-50 left-0 right-0 mt-2 rounded-xl max-h-96 overflow-auto fade-up" style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", boxShadow: "0 20px 40px -12px rgba(0,0,0,0.6)" }}>
          {(["customers", "catalogues", "transactions"]).map((k) => results[k]?.length > 0 && (
            <div key={k} className="p-2">
              <div className="label-lux px-3 py-1.5">{k}</div>
              {results[k].map((it) => (
                <button
                  key={it.id || it.transaction_id}
                  onClick={() => {
                    setOpen(false); setQ("");
                    if (k === "customers") nav("/customers");
                    if (k === "catalogues") nav("/catalogues");
                    if (k === "transactions") nav("/history");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/[0.04] rounded-lg text-sm text-neutral-200"
                >
                  {it.name || it.customer_name || it.transaction_id}
                </button>
              ))}
            </div>
          ))}
          {(!results.customers?.length && !results.catalogues?.length && !results.transactions?.length) && (
            <div className="p-5 text-sm text-neutral-500 text-center">No results</div>
          )}
        </div>
      )}
    </div>
  );
}

function AppearancePicker() {
  const { mode, setMode } = useTheme();
  const opts = [
    { k: "system", label: "System", icon: Monitor },
    { k: "light", label: "Light", icon: Sun },
    { k: "dark", label: "Dark", icon: Moon },
  ];
  const Current = (opts.find((o) => o.k === mode) || opts[0]).icon;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button data-testid="appearance-btn" className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.03] transition-colors" title="Appearance">
          <Current className="w-[18px] h-[18px]" strokeWidth={1.6} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2" style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)", color: "var(--ll-text)" }}>
        <div className="label-lux px-2 py-1.5">Appearance</div>
        {opts.map((o) => (
          <button
            key={o.k}
            data-testid={`theme-${o.k}`}
            onClick={() => setMode(o.k)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${mode === o.k ? "text-white" : "text-neutral-400 hover:text-white"}`}
            style={{ background: mode === o.k ? "var(--ll-hover)" : "transparent" }}
          >
            <o.icon className="w-4 h-4" strokeWidth={1.6} />
            <span className="flex-1 text-left">{o.label}</span>
            {mode === o.k && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ll-gold)" }} />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--ll-bg)" }}>
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30">
        <SidebarContent collapsed={collapsed} />
        <button
          data-testid="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-24 w-6 h-6 rounded-full grid place-items-center text-neutral-400 hover:text-white transition-colors"
          style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border-strong)" }}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      <div className={`flex-1 flex flex-col min-h-screen transition-[padding] duration-300 ${collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"}`}>
        <header className="sticky top-0 z-20 backdrop-blur-lg" style={{ background: "color-mix(in srgb, var(--ll-bg) 75%, transparent)", borderBottom: "1px solid var(--ll-border)" }}>
          <div className="flex items-center gap-4 px-5 lg:px-10 py-4">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button data-testid="mobile-menu-btn" className="lg:hidden p-2 rounded-lg text-neutral-300 hover:bg-white/[0.05]">
                  <Menu className="w-5 h-5" strokeWidth={1.6} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 border-0" style={{ background: "var(--ll-sidebar)", width: 240 }}>
                <SidebarContent onNav={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <GlobalSearch />
            <div className="flex-1" />
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-neutral-100">{user?.username}</div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">{user?.role}</div>
              </div>
              <div className="w-9 h-9 rounded-full grid place-items-center font-serif text-sm" style={{ background: "linear-gradient(140deg, #C8A96A 0%, #8B7440 100%)", color: "#1a1508" }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
            </div>
            <button data-testid="logout-btn" onClick={logout} className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/[0.03] transition-colors" title="Logout">
              <LogOut className="w-[18px] h-[18px]" strokeWidth={1.6} />
            </button>
            <AppearancePicker />
          </div>
        </header>

        <main className="flex-1 px-5 lg:px-12 py-8 lg:py-10 max-w-[1600px] w-full mx-auto">
          <div className="fade-up"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
