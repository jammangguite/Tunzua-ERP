import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute, AuthCallback } from "@/components/AuthRoutes";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import LedgerPage from "@/pages/LedgerPage";
import Parties from "@/pages/Parties";
import Contra from "@/pages/Contra";
import Journal from "@/pages/Journal";
import FixedAssets from "@/pages/FixedAssets";
import Reports from "@/pages/Reports";
import Daybook from "@/pages/Daybook";
import RecurringBills from "@/pages/RecurringBills";

function RouterShell() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="bills" element={<RecurringBills />} />
        <Route path="purchases" element={<LedgerPage kind="purchases" title="Purchases" subtitle="Inward stock and expense bills from your vendors." />} />
        <Route path="sales" element={<LedgerPage kind="sales" title="Sales" subtitle="Invoices and outward sales to your customers." />} />
        <Route path="receipts" element={<LedgerPage kind="receipts" title="Receipts" subtitle="Money received from parties — cash, bank, or transfers." />} />
        <Route path="payments" element={<LedgerPage kind="payments" title="Payments" subtitle="Money paid to parties — expenses and settlements." />} />
        <Route path="contra" element={<Contra />} />
        <Route path="journal" element={<Journal />} />
        <Route path="daybook" element={<Daybook />} />
        <Route path="parties" element={<Parties />} />
        <Route path="assets" element={<FixedAssets />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouterShell />
        <Toaster position="top-right" theme="light" closeButton richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
