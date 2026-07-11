import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success("Welcome back");
      nav("/");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Login failed";
      toast.error(typeof msg === "string" ? msg : "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--ll-bg)" }}>
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80"
          alt="luxury interior"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.55) contrast(1.05)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(13,13,13,0.9) 0%, rgba(13,13,13,0.5) 60%, rgba(13,13,13,0.85) 100%)" }} />
        <div className="relative z-10 flex flex-col justify-between p-14 text-neutral-100 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: "linear-gradient(140deg, #C8A96A 0%, #8B7440 100%)" }}>
              <span className="text-black font-serif text-lg font-semibold">L</span>
            </div>
            <div>
              <div className="font-serif text-xl">Luxur & Lavish</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">Atelier System</div>
            </div>
          </div>
          <div className="max-w-lg">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ll-gold)] mb-6">Est. Since 2026</div>
            <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] text-white tracking-tight">
              The atelier's<br />
              <em className="not-italic text-[color:var(--ll-gold)]">quiet</em> command room.
            </h1>
            <p className="mt-6 text-neutral-400 text-base leading-relaxed max-w-md">
              A considered instrument for tracking every catalogue, every clientele, every return — with the precision your craft deserves.
            </p>
          </div>
          <div className="text-neutral-500 text-xs tracking-wider">© {new Date().getFullYear()} · Luxur & Lavish</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: "linear-gradient(140deg, #C8A96A 0%, #8B7440 100%)" }}>
              <span className="text-black font-serif text-lg font-semibold">L</span>
            </div>
            <span className="font-serif text-xl text-white">Luxur & Lavish</span>
          </div>
          <div className="mb-10">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--ll-gold)] mb-3">Sign in</div>
            <h2 className="font-serif text-4xl text-white tracking-tight">Welcome back.</h2>
            <p className="text-neutral-500 mt-3 text-sm leading-relaxed">Continue where you left off.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label-lux">Username</label>
              <input
                data-testid="login-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-lux mt-2"
                required
              />
            </div>
            <div>
              <label className="label-lux">Password</label>
              <input
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-lux mt-2"
                required
              />
            </div>
            <button
              data-testid="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-gold w-full justify-center mt-2"
            >
              {loading ? "Signing in…" : (<>Enter atelier <ArrowRight className="w-4 h-4" /></>)}
            </button>

            <div className="mt-8 p-4 rounded-xl text-xs text-neutral-400 leading-relaxed" style={{ background: "var(--ll-card)", border: "1px solid var(--ll-border)" }}>
              <span className="text-[color:var(--ll-gold)] font-medium">Demo access · </span>
              admin / admin123
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
