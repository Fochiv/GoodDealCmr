import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Check, X, RefreshCw, Wifi,
  TrendingUp, Clock, CheckCircle, XCircle, Search
} from "lucide-react";
import { formatFCFA, formatDate, getStatusColor, getStatusLabel, formatRef } from "@/lib/api";
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
    name: string;
    operatorName: string;
    operatorColor: string;
  } | null;
};

const TABS = [
  { key: "all",     label: "Tout",           color: "gray"   },
  { key: "pending", label: "En attente",      color: "yellow" },
  { key: "paid",    label: "Validées",        color: "green"  },
  { key: "failed",  label: "Échouées",        color: "red"    },
  { key: "cancelled", label: "Annulées",      color: "slate"  },
] as const;

type TabKey = typeof TABS[number]["key"];

const TAB_ACTIVE: Record<string, string> = {
  gray:   "bg-gray-900 text-white border-gray-900",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-300",
  green:  "bg-green-50 text-green-700 border-green-300",
  red:    "bg-red-50 text-red-600 border-red-300",
  slate:  "bg-slate-100 text-slate-600 border-slate-300",
};

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isAdmin = isAdminAuthenticated();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("pending");
  const [search, setSearch] = useState("");

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
        title: status === "paid" ? "✅ Paiement validé" : "❌ Paiement échoué",
        description: status === "paid"
          ? `${updated.bundle?.dataSize} activé pour ${updated.phoneNumber}`
          : `Commande #${id} marquée comme échouée`,
      });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  // Stats
  const total       = orders.length;
  const totalPaid   = orders.filter(o => o.status === "paid").reduce((s, o) => s + o.totalAmount, 0);
  const pending     = orders.filter(o => o.status === "pending");
  const pendingAmt  = pending.reduce((s, o) => s + o.totalAmount, 0);
  const failed      = orders.filter(o => o.status === "failed").length;

  // Filter
  const q = search.trim().toLowerCase();
  const filtered = orders
    .filter(o => tab === "all" || o.status === tab)
    .filter(o => !q || o.phoneNumber.includes(q) ||
      (o.payerName ?? "").toLowerCase().includes(q) ||
      (o.transactionId ?? "").toLowerCase().includes(q) ||
      String(o.id).includes(q) ||
      (o.bundle?.dataSize ?? "").toLowerCase().includes(q));

  return (
    <div className="min-h-screen pt-20 pb-10 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setLocation("/ashtech/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-foreground">Historique des paiements</h1>
            <p className="text-xs text-muted-foreground">{total} commandes au total</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}
            className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 flex-shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { icon: TrendingUp,   color: "text-green-600",  bg: "bg-green-50",  label: "Encaissé",    value: formatFCFA(totalPaid) },
            { icon: Clock,        color: "text-yellow-600", bg: "bg-yellow-50", label: "En attente",  value: `${formatFCFA(pendingAmt)}` },
            { icon: CheckCircle,  color: "text-blue-600",   bg: "bg-blue-50",   label: "Validées",    value: `${orders.filter(o=>o.status==="paid").length} cmd` },
            { icon: XCircle,      color: "text-red-500",    bg: "bg-red-50",    label: "Échouées",    value: `${failed} cmd` },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <div className="font-black text-sm text-foreground truncate">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  tab === t.key ? TAB_ACTIVE[t.color] : "bg-white text-muted-foreground border-gray-200 hover:border-gray-300"
                }`}
              >
                {t.label}
                {t.key === "pending" && pending.length > 0 && (
                  <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-xs font-black px-1.5 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                )}
                {t.key !== "pending" && (
                  <span className="ml-1.5 opacity-50">
                    {t.key === "all" ? total : orders.filter(o => o.status === t.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative flex-shrink-0 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Numéro, nom, ID…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-full border border-gray-200 bg-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground text-sm">
              {search ? `Aucun résultat pour "${search}"` : "Aucune commande"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${
                  order.status === "pending"   ? "border-yellow-200" :
                  order.status === "paid"      ? "border-green-100"  :
                  order.status === "failed"    ? "border-red-100"    :
                  "border-gray-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Operator dot */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: order.bundle?.operatorColor ? `${order.bundle.operatorColor}20` : "#f3f4f6" }}
                  >
                    <Wifi className="w-5 h-5" style={{ color: order.bundle?.operatorColor ?? "#888" }} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-foreground">{order.bundle?.dataSize ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{order.bundle?.operatorName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>📱 <span className="font-semibold text-foreground">{order.phoneNumber}</span></div>
                      {order.payerName && (
                        <div>👤 {order.payerName}{order.payerPhone ? ` · ${order.payerPhone}` : ""}</div>
                      )}
                      <div>💳 {order.paymentMethod === "mtn_momo" ? "MTN MoMo" : "Orange Money"}</div>
                      <div>🕐 {formatDate(order.createdAt)}</div>
                      <div className="font-mono text-xs text-muted-foreground/70">{formatRef(order.id)}</div>
                    </div>
                  </div>

                  {/* Amount + ID */}
                  <div className="text-right flex-shrink-0">
                    <div className={`font-black text-lg ${
                      order.status === "paid" ? "text-green-600" :
                      order.status === "failed" ? "text-red-500" :
                      "text-foreground"
                    }`}>{formatFCFA(order.totalAmount)}</div>
                    <div className="text-xs text-muted-foreground font-mono">#{order.id}</div>
                  </div>
                </div>

                {/* Action buttons — pending only */}
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
                      style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 4px 12px rgba(34,197,94,.35)" }}
                    >
                      {actionLoading === order.id
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <Check className="w-4 h-4" />}
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
