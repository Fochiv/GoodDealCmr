import { useEffect, useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Store, RefreshCw, TrendingUp, ShoppingBag,
  ArrowDownCircle, Wallet, Wifi, ChevronLeft, ChevronRight, Package
} from "lucide-react";
import { formatFCFA, formatDate, getStatusColor, getStatusLabel, formatRef } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { isAdminAuthenticated } from "./Ashtech";

function adminHeaders(): Record<string, string> {
  return { "X-Admin-Key": localStorage.getItem("gd_admin_pass") ?? "" };
}

type MerchantDetail = {
  merchant: {
    id: number;
    name: string;
    phone: string;
    referralCode: string;
    balance: number;
    createdAt: string;
  };
  stats: {
    totalOrders: number;
    paidOrders: number;
    totalEarnings: number;
    totalWithdrawn: number;
  };
  orders: any[];
  withdrawals: any[];
};

const PAGE_SIZE = 15;

type TabKey = "orders" | "withdrawals";

export default function AdminMerchantDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const isAdmin = isAdminAuthenticated();

  const [data, setData] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("orders");
  const [ordersPage, setOrdersPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState("");

  useEffect(() => { if (!isAdmin) setLocation("/ashtech"); }, [isAdmin]);

  const fetchData = useCallback(async () => {
    if (!isAdmin || !params.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/merchants/${params.id}`, { headers: adminHeaders() });
      if (res.ok) setData(await res.json());
      else toast({ title: "Erreur de chargement", variant: "destructive" });
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, params.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!isAdmin) return null;

  const merchant = data?.merchant;
  const stats = data?.stats;

  // Orders filtering + pagination
  const q = orderSearch.trim().toLowerCase();
  const filteredOrders = (data?.orders ?? []).filter(o =>
    !q || o.phoneNumber?.includes(q) ||
    (o.payerName ?? "").toLowerCase().includes(q) ||
    (o.transactionId ?? "").toLowerCase().includes(q) ||
    String(o.id).includes(q) ||
    (o.bundle?.dataSize ?? "").toLowerCase().includes(q)
  );
  const ordersTotalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const ordersSafePage = Math.min(ordersPage, ordersTotalPages);
  const paginatedOrders = filteredOrders.slice((ordersSafePage - 1) * PAGE_SIZE, ordersSafePage * PAGE_SIZE);

  // Withdrawals pagination
  const allWithdrawals = data?.withdrawals ?? [];
  const wTotalPages = Math.max(1, Math.ceil(allWithdrawals.length / PAGE_SIZE));
  const wSafePage = Math.min(withdrawalsPage, wTotalPages);
  const paginatedWithdrawals = allWithdrawals.slice((wSafePage - 1) * PAGE_SIZE, wSafePage * PAGE_SIZE);

  function Paginator({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-muted-foreground hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "…")[]>((acc, p, i, arr) => {
              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`e-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    page === p ? "bg-gray-900 text-white" : "border border-gray-200 text-muted-foreground hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-muted-foreground hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setLocation("/ashtech/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {loading ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <>
                <h1 className="text-xl font-black text-foreground truncate">{merchant?.name}</h1>
                <p className="text-xs text-muted-foreground">
                  📱 {merchant?.phone} · Code : <span className="font-mono font-bold text-orange-600">{merchant?.referralCode}</span>
                </p>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}
            className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 flex-shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Stats cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { icon: ShoppingBag, color: "text-blue-600",  bg: "bg-blue-50",   label: "Commandes",    value: String(stats.totalOrders) },
              { icon: TrendingUp,  color: "text-green-600", bg: "bg-green-50",  label: "Gains totaux", value: formatFCFA(stats.totalEarnings) },
              { icon: Wallet,      color: "text-orange-600",bg: "bg-orange-50", label: "Retiré",       value: formatFCFA(stats.totalWithdrawn) },
              { icon: Store,       color: "text-purple-600",bg: "bg-purple-50", label: "Solde actuel", value: formatFCFA(merchant?.balance ?? 0) },
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
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { key: "orders" as TabKey,      label: "Commandes",   count: data?.orders.length },
            { key: "withdrawals" as TabKey, label: "Retraits",    count: data?.withdrawals.length },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                tab === t.key
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-muted-foreground border-gray-200 hover:border-gray-300"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1.5 opacity-60">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── ORDERS TAB ─────────────────────────────────────────────────── */}
        {tab === "orders" && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {/* Search */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <input
                value={orderSearch}
                onChange={e => { setOrderSearch(e.target.value); setOrdersPage(1); }}
                placeholder="Rechercher numéro, nom, ID…"
                className="w-full px-3 py-1.5 text-xs rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:border-primary"
              />
            </div>

            {loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">
                  {q ? `Aucun résultat pour "${q}"` : "Aucune commande via ce marchand"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paginatedOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: order.bundle?.operatorColor ? `${order.bundle.operatorColor}20` : "#f3f4f6" }}
                    >
                      <Wifi className="w-4 h-4" style={{ color: order.bundle?.operatorColor ?? "#888" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{order.bundle?.dataSize ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{order.bundle?.operatorName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        📱 {order.phoneNumber}
                        {order.payerName ? ` · ${order.payerName}` : ""}
                        {" · "}{formatDate(order.createdAt)}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground/60">{formatRef(order.id)}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-black text-sm ${
                        order.status === "paid"      ? "text-green-600" :
                        order.status === "confirmed" ? "text-blue-600"  :
                        order.status === "failed"    ? "text-red-500"   :
                        "text-foreground"
                      }`}>{formatFCFA(order.totalAmount)}</div>
                      <div className="text-xs text-green-600 font-semibold">
                        +{formatFCFA(Math.floor(order.totalAmount * 0.5))} comm.
                      </div>
                    </div>
                  </div>
                ))}
                <div className="px-4 pb-4">
                  <Paginator page={ordersSafePage} totalPages={ordersTotalPages} setPage={setOrdersPage} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WITHDRAWALS TAB ─────────────────────────────────────────────── */}
        {tab === "withdrawals" && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : allWithdrawals.length === 0 ? (
              <div className="p-12 text-center">
                <ArrowDownCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">Aucun retrait pour ce marchand</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paginatedWithdrawals.map((w: any) => {
                  const opColor = w.operator === "mtn" ? "#FFD700" : "#FF6600";
                  const opLabel = w.operator === "mtn" ? "MTN MoMo" : "Orange Money";
                  const statusMap: Record<string, { label: string; cls: string }> = {
                    pending:    { label: "En attente", cls: "bg-yellow-100 text-yellow-700" },
                    processing: { label: "En cours",   cls: "bg-blue-100 text-blue-700" },
                    paid:       { label: "Payé",       cls: "bg-green-100 text-green-700" },
                    failed:     { label: "Échoué",     cls: "bg-red-100 text-red-700" },
                    rejected:   { label: "Refusé",     cls: "bg-red-100 text-red-700" },
                  };
                  const s = statusMap[w.status] ?? { label: w.status, cls: "bg-gray-100 text-gray-700" };
                  return (
                    <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0"
                        style={{ background: opColor, color: w.operator === "mtn" ? "#000" : "#fff" }}
                      >
                        {w.operator === "mtn" ? "MTN" : "ORG"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{opLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          📱 {w.withdrawalPhone} · {formatDate(w.createdAt)}
                        </div>
                        {w.transactionId && (
                          <div className="font-mono text-xs text-muted-foreground/60">TXN: {w.transactionId}</div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-black text-sm">{formatFCFA(w.amount)}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="px-4 pb-4">
                  <Paginator page={wSafePage} totalPages={wTotalPages} setPage={setWithdrawalsPage} />
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
