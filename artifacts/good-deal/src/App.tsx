import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
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
      <Route path="/ashtech" component={Ashtech} />
      <Route path="/ashtech/dashboard" component={Admin} />
      <Route path="/ashtech/bundles" component={AdminBundles} />
      <Route path="/ashtech/orders" component={AdminOrders} />
      <Route path="/ashtech/users" component={AdminUsers} />
      <Route path="/ashtech/reviews" component={AdminReviews} />
      <Route path="/ashtech/settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <>
      <Navbar />
      <Router />
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppLayout />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
