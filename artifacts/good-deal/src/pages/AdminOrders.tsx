import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { formatFCFA, formatDate, getStatusColor, getStatusLabel } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AdminOrders() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { data: orders, isLoading } = useListOrders({ query: { enabled: isAdmin, queryKey: getListOrdersQueryKey() } });

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Accès réservé aux administrateurs.</p>
          <Button onClick={() => setLocation("/")}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation("/admin")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black text-foreground">Toutes les commandes</h1>
          <span className="ml-auto text-sm text-muted-foreground">{orders?.length ?? 0} commandes</span>
        </div>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Forfait</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Téléphone</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Paiement</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Montant</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-6" /></td></tr>
                  ))
                ) : !orders?.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Aucune commande</td>
                  </tr>
                ) : orders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-order-${order.id}`}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{order.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{order.bundle?.dataSize}</div>
                      <div className="text-xs text-muted-foreground">{order.bundle?.operatorName}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{order.phoneNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize text-xs">
                      {order.paymentMethod === "mtn_momo" ? "MTN MoMo" : "Orange Money"}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{formatFCFA(order.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`} data-testid={`status-order-${order.id}`}>
                        {getStatusLabel(order.status)}
                      </span>
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
