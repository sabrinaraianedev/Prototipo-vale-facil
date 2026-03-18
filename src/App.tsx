import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { VoucherProvider } from "./contexts/VoucherContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import GenerateVoucher from "./pages/GenerateVoucher";
import RedeemVoucher from "./pages/RedeemVoucher";
import Users from "./pages/Users";
import VoucherTypes from "./pages/VoucherTypes";
const Reports = lazy(() => import("./pages/Reports"));
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <VoucherProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/generate-voucher" element={<GenerateVoucher />} />
              <Route path="/redeem-voucher" element={<RedeemVoucher />} />
              <Route path="/users" element={<Users />} />
              <Route path="/voucher-types" element={<VoucherTypes />} />
              
              <Route path="/reports" element={<Suspense fallback={<LoadingSpinner />}><Reports /></Suspense>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </VoucherProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
