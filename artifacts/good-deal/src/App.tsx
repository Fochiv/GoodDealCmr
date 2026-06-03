import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { PendingPaymentBar } from "@/components/PendingPaymentBar";
import { DevicePendingBar } from "@/components/DevicePendingBar";
import Home from "@/pages/Home";
import OperatorBundles from "@/pages/OperatorBundles";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Orders from "@/pages/Orders";
import AllBundles from "@/pages/AllBundles";
import Ashtech from "@/pages/Ashtech";
import Admin from "@/pages/Admin";
import AdminBundles from "@/pages/AdminBundles";
import AdminOrders from "@/pages/AdminOrders";
import AdminUsers from "@/pages/AdminUsers";
import AdminReviews from "@/pages/AdminReviews";
import AdminSettings from "@/pages/AdminSettings";
import AdminMerchantDetail from "@/pages/AdminMerchantDetail";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import MarchandLogin from "@/pages/MarchandLogin";
import MarchandDashboard from "@/pages/MarchandDashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/operator/:id" component={OperatorBundles} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/forfaits" component={AllBundles} />
      <Route path="/commandes" component={Orders} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/ashtech" component={Ashtech} />
      <Route path="/ashtech/dashboard" component={Admin} />
      <Route path="/ashtech/bundles" component={AdminBundles} />
      <Route path="/ashtech/orders" component={AdminOrders} />
      <Route path="/ashtech/users" component={AdminUsers} />
      <Route path="/ashtech/reviews" component={AdminReviews} />
      <Route path="/ashtech/settings" component={AdminSettings} />
      <Route path="/ashtech/marchands/:id" component={AdminMerchantDetail} />
      <Route path="/marchand" component={MarchandLogin} />
      <Route path="/marchand/dashboard" component={MarchandDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

const REFERRAL_KEY = "gd_referral_code";

export function saveReferralCode(code: string) {
  localStorage.setItem(REFERRAL_KEY, code);
}
export function getReferralCode(): string | null {
  return localStorage.getItem(REFERRAL_KEY);
}
export function clearReferralCode() {
  localStorage.removeItem(REFERRAL_KEY);
}

function AppLayout() {
  const [location] = useLocation();
  const isOperatorPage = location.startsWith("/operator/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.trim()) {
      saveReferralCode(ref.trim());
    }
  }, []);

  return (
    <>
      {!isOperatorPage && <Navbar />}
      <Router />
      {!isOperatorPage && <PendingPaymentBar />}
      {!isOperatorPage && <DevicePendingBar />}
      {!isOperatorPage && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppLayout />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
