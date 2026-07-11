import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Catalogues from "@/pages/Catalogues";
import Customers from "@/pages/Customers";
import IssueCatalogue from "@/pages/IssueCatalogue";
import ReturnCatalogue from "@/pages/ReturnCatalogue";
import PendingReturns from "@/pages/PendingReturns";
import TransactionHistory from "@/pages/TransactionHistory";
import Reports from "@/pages/Reports";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/" element={<Protected><Layout /></Protected>}>
              <Route index element={<Dashboard />} />
              <Route path="catalogues" element={<Catalogues />} />
              <Route path="customers" element={<Customers />} />
              <Route path="issue" element={<IssueCatalogue />} />
              <Route path="return" element={<ReturnCatalogue />} />
              <Route path="pending" element={<PendingReturns />} />
              <Route path="history" element={<TransactionHistory />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </div>
  );
}
