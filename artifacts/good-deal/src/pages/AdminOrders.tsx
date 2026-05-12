import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Check, X, Clock, RefreshCw, Wifi } from "lucide-react";
import { formatFCFA, formatDate, getStatusColor, getStatusLabel } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { isAdminAuthenticated } from "./Ashtech";

function adminHeaders(): Record<string, string> {
  return { "X-Admin-Key": localStorage.getItem("gd_admin_pass") ?? "" };
}

type Order = {
  id: number;
  phoneNumber: string;
  payerName: string | null;
  payerPhone: string | null;
  paymentMethod: string;
  status: string;
  totalAmount: number;
  transactionId: string | null;
  createdAt: string;
  bundle: {
    dataSize: string;
    operatorName: string;
    operatorColor: string;
  } | null;
};

const STATUS_TABS = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "paid", label: "Payées" },
  { key: "failed", label: "Échouées" },
] as const;

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isAdmin = isAdminAuthenticated();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [tab, setTab] = useState<"all" | "pending" | "paid" | "failed">("pending");

  useEffect(() => { if (!isAdmin) setLocation("/ashtech"); }, [isAdmin]);

  const fetchOrders = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders", { headers: adminHeaders() });
      if (res.ok) setOrders(await res.json());
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (!isAdmin) return null;

  async function handleStatus(id: number, status: "paid" | "failed") {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
      toast({
        title: status === "paid" ? "✅ Commande validée" : "❌ Commande marquée échouée",
        description: status === "paid"
          ? `Forfait ${updated.bundle?.dataSize} activé pour ${updated.phoneNumber}`
          : `Commande #${id} marquée comme échouée`,
      });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = tab === "all" ? orders : orders.filter(o => o.status === tab);
  const pendingCount = orders.filter(o => o.status === "pending").length;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setLocation("/ashtech/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-foreground">Commandes</h1>
            <p className="text-xs text-muted-foreground">{orders.length} au total · {pendingCount} en attente</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrders} className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 flex-shrink-0">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                tab === t.key
                  ? t.key === "pending" ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                    : t.key === "paid" ? "bg-green-50 text-green-700 border-green-300"
                    : t.key === "failed" ? "bg-red-50 text-red-600 border-red-300"
                    : "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-muted-foreground border-gray-200 hover:border-gray-300"
              }`}
            >
              {t.label}
              {t.key === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-xs font-black px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Aucune commande {tab !== "all" ? `"${STATUS_TABS.find(t=>t.key===tab)?.label.toLowerCase()}"` : ""}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${
                  order.status === "pending" ? "border-yellow-200" : "border-gray-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Operator icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: order.bundle?.operatorColor ? `${order.bundle.operatorColor}20` : "#f3f4f6" }}
                  >
                    <Wifi className="w-5 h-5" style={{ color: order.bundle?.operatorColor ?? "#888" }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-black text-foreground">{order.bundle?.dataSize ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{order.bundle?.operatorName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>📱 Bénéficiaire : <span className="font-semibold text-foreground">{order.phoneNumber}</span></div>
                      {order.payerName && <div>👤 Payeur : <span className="font-semibold text-foreground">{order.payerName}</span>{order.payerPhone ? ` · ${order.payerPhone}` : ""}</div>}
                      <div>💳 {order.paymentMethod === "mtn_momo" ? "MTN MoMo" : "Orange Money"} · <span className="font-bold text-foreground">{formatFCFA(order.totalAmount)}</span></div>
                      <div>🕐 {formatDate(order.createdAt)}</div>
                      {order.transactionId && <div className="font-mono text-xs">#{order.transactionId}</div>}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-lg text-foreground">{formatFCFA(order.totalAmount)}</div>
                    <div className="text-xs text-muted-foreground font-mono">#{order.id}</div>
                  </div>
                </div>

                {/* Action buttons — only for pending */}
                {order.status === "pending" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleStatus(order.id, "failed")}
                      disabled={actionLoading === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Marquer échoué
                    </button>
                    <button
                      onClick={() => handleStatus(order.id, "paid")}
                      disabled={actionLoading === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 12px rgba(34,197,94,0.35)" }}
                    >
                      {actionLoading === order.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Valider le paiement
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
