import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, LogOut } from "lucide-react";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { formatFCFA, formatDate, getStatusColor, getStatusLabel } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isAdminAuthenticated, setAdminAuth } from "./Ashtech";

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const isAdmin = isAdminAuthenticated();

  useEffect(() => { if (!isAdmin) setLocation("/ashtech"); }, [isAdmin]);

  const { data: orders, isLoading } = useListOrders({
    query: { enabled: isAdmin, queryKey: getListOrdersQueryKey() }
  });

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation("/ashtech/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black text-foreground">Toutes les commandes</h1>
          <span className="ml-auto text-sm text-muted-foreground">{orders?.length ?? 0} commandes</span>
          <Button variant="ghost" size="sm" onClick={() => { setAdminAuth(false); setLocation("/ashtech"); }} className="text-red-500">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["ID", "Forfait", "Téléphone", "Paiement", "Montant", "Statut", "Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-6" /></td></tr>
                )) : !orders?.length ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Aucune commande</td></tr>
                ) : orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{order.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{order.bundle?.dataSize}</div>
                      <div className="text-xs text-muted-foreground">{order.bundle?.operatorName}</div>
                    </td>
                    <td className="px-4 py-3">{order.phoneNumber}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{order.paymentMethod === "mtn_momo" ? "MTN MoMo" : "Orange Money"}</td>
                    <td className="px-4 py-3 font-bold">{formatFCFA(order.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
