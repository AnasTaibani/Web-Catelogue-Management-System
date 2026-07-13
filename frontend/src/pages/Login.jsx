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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--ll-bg)" }}>
      {/* Left Panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80"
          alt="luxury interior"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.75) contrast(1.05)" }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(18,18,18,0.55) 0%, rgba(18,18,18,0.35) 55%, rgba(18,18,18,0.60) 100%)",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl grid place-items-center"
              style={{
                background:
                  "linear-gradient(140deg, #C8A96A 0%, #8B7440 100%)",
              }}
            >
              <span className="text-black font-serif text-lg font-semibold">
                L
              </span>
            </div>

            <div>
              <div
                className="font-serif text-xl"
                style={{
                  color: "#FFFFFF",
                  textShadow: "0 2px 10px rgba(0,0,0,0.55)",
                }}
              >
                Luxur & Lavish
              </div>

              <div
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{
                  color: "#EAEAEA",
                  textShadow: "0 1px 6px rgba(0,0,0,0.45)",
                }}
              >
                ATELIER SYSTEM
              </div>
            </div>
          </div>

          {/* Hero */}
          <div className="max-w-lg">
            <div
              className="text-[11px] uppercase tracking-[0.3em] mb-6"
              style={{
                color: "#D8B46A",
                textShadow: "0 1px 8px rgba(0,0,0,0.55)",
              }}
            >
              EST. SINCE 2026
            </div>

            <h1
              className="font-serif text-5xl lg:text-6xl leading-[1.05] tracking-tight"
              style={{
                color: "#FFFFFF",
                textShadow: "0 4px 18px rgba(0,0,0,0.65)",
              }}
            >
              The atelier's
              <br />
              <span
                style={{
                  color: "#E1BE78",
                  textShadow: "0 3px 12px rgba(0,0,0,0.55)",
                }}
              >
                quiet
              </span>{" "}
              command
              <br />
              room.
            </h1>

            <p
              className="mt-6 text-base leading-relaxed max-w-md"
              style={{
                color: "#F3F3F3",
                textShadow: "0 2px 10px rgba(0,0,0,0.55)",
              }}
            >
              A considered instrument for tracking every catalogue, every
              clientele, every return — with the precision your craft deserves.
            </p>
          </div>

          {/* Footer */}
          <div
            className="text-xs tracking-wider"
            style={{
              color: "#E0E0E0",
              textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            }}
          >
            © {new Date().getFullYear()} · Luxur & Lavish
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div
              className="w-10 h-10 rounded-xl grid place-items-center"
              style={{
                background:
                  "linear-gradient(140deg, #C8A96A 0%, #8B7440 100%)",
              }}
            >
              <span className="text-black font-serif text-lg font-semibold">
                L
              </span>
            </div>
            <span className="font-serif text-xl text-white">
              Luxur & Lavish
            </span>
          </div>

          <div className="mb-10">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--ll-gold)] mb-3">
              Sign in
            </div>
            <h2 className="font-serif text-4xl text-white tracking-tight">
              Welcome back.
            </h2>
            <p className="text-neutral-500 mt-3 text-sm leading-relaxed">
              Continue where you left off.
            </p>
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
              {loading ? (
                "Signing in…"
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}