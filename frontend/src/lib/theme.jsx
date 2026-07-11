import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeCtx = createContext(null);
const STORAGE_KEY = "ll_theme"; // "system" | "light" | "dark"

function apply(mode) {
  const resolved = mode === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : mode;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(STORAGE_KEY) || "system");

  useEffect(() => { apply(mode); }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => apply("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const set = useCallback((m) => { localStorage.setItem(STORAGE_KEY, m); setMode(m); }, []);

  return <ThemeCtx.Provider value={{ mode, setMode: set }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
