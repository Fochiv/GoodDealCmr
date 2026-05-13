import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ShoppingBag, Package, ArrowRight, LogOut, RefreshCw, Trophy, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatFCFA, getStatusColor, getStatusLabel, formatDate } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isAdminAuthenticated, setAdminAuth } from "./Ashtech";

const HIST_PAGE_SIZE = 15;

function adminHeaders(): Record<string, string> {
  return { "X-Admin-Key": localStorage.getItem("gd_admin_pass") ?? "" };
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const isAdmin = isAdminAuthenticated();

  const [revenue, setRevenue] = useState<any>(null);
  const [revLoading, setRevLoading] = useState(true);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [popular, setPopular] = useState<any[]>([]);
  const [popLoading, setPopLoading] = useState(true);

  // History (full orders list)
  const [histOrders, setHistOrders] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histSearch, setHistSearch] = useState("");
  const [histPage, setHistPage] = useState(1);

  useEffect(() => {
    if (!isAdmin) setLocation("/ashtech");
  }, [isAdmin]);

  const fetchAll = useCallback(async () => {
    if (!isAdmin) return;
    setRevLoading(true); setOrdersLoading(true); setPopLoading(true); setHistLoading(true);
    const h = adminHeaders();
    const [revRes, ordRes, popRes, histRes] = await Promise.all([
      fetch("/api/stats/revenue", { headers: h }),
      fetch("/api/stats/orders", { headers: h }),
      fetch("/api/stats/popular-bundles", { headers: h }),
      fetch("/api/orders", { headers: h }),
    ]);
    if (revRes.ok)  { setRevenue(await revRes.json()); }
    setRevLoading(false);
    if (ordRes.ok)  { setOrderStats(await ordRes.json()); }
    setOrdersLoading(false);
    if (popRes.ok)  { setPopular(await popRes.json()); }
    setPopLoading(false);
    if (histRes.ok) { setHistOrders(await histRes.json()); }
    setHistLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!isAdmin) return null;

  const chartData = revenue?.revenueByOperator.map(r => ({
    name: r.operatorName,
    revenue: r.revenue,
  })) ?? [];

  const handleLogout = () => {
    setAdminAuth(false);
    setLocation("/ashtech");
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <h1 className="text-lg font-black text-foreground leading-tight">Tableau de bord</h1>
              <p className="text-muted-foreground text-xs">Good Deal — admin</p>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-3">
              <Button variant="outline" size="sm" onClick={fetchAll} className="text-blue-600 border-blue-200 hover:bg-blue-50 w-9 h-9 p-0">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50 w-9 h-9 p-0">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* Nav grid — 2×2 on mobile, single row on desktop */}
          <div className="grid grid-cols-2 sm:flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/bundles")} className="justify-start sm:justify-center">📦 Forfaits</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/orders")} className="justify-start sm:justify-center">🧾 Commandes</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/users")} className="justify-start sm:justify-center">👥 Utilisateurs</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/reviews")} className="justify-start sm:justify-center">⭐ Avis</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/settings")} className="justify-start sm:justify-center">⚙️ Paramètres</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Revenus encaissés", value: revenue ? formatFCFA(revenue.totalRevenue) : "—", sub: `${revenue?.paidOrders ?? "—"} paiements`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", loading: revLoading },
            { label: "Paiements en attente", value: revenue ? formatFCFA(revenue.pendingRevenue) : "—", sub: `${orderStats?.pending ?? "—"} commandes`, icon: ShoppingBag, color: "text-yellow-600", bg: "bg-yellow-50", loading: revLoading || ordersLoading },
            { label: "Commandes totales", value: orderStats?.total ?? "—", sub: null, icon: Package, color: "text-blue-600", bg: "bg-blue-50", loading: ordersLoading },
            { label: "Échouées", value: orderStats?.failed ?? "—", sub: null, icon: ShoppingBag, color: "text-red-500", bg: "bg-red-50", loading: ordersLoading },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              {stat.loading ? (
                <Skeleton className="h-16" />
              ) : (
                <>
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="text-xl font-black text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                  {stat.sub && <div className="text-xs font-semibold text-muted-foreground mt-1">{stat.sub}</div>}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Top forfait */}
        <div className="mb-6">
          {popLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : popular[0] ? (() => {
            const top = popular[0];
            return (
              <div
                className="rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-white/20"
                style={{ background: `linear-gradient(135deg, ${top.bundle?.operatorColor ?? "#888"}dd, ${top.bundle?.operatorColor ?? "#888"}99)` }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white/70 uppercase tracking-wide mb-0.5">Forfait le plus vendu</div>
                  <div className="text-xl font-black text-white leading-tight">{top.bundle?.dataSize}</div>
                  <div className="text-sm text-white/80">{top.bundle?.operatorName} · {top.bundle?.name}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-black text-white">{top.totalOrders}</div>
                  <div className="text-xs text-white/70">commande{top.totalOrders > 1 ? "s" : ""}</div>
                  <div className="text-sm font-bold text-white/90 mt-0.5">{formatFCFA(top.totalRevenue)}</div>
                </div>
              </div>
            );
          })() : null}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue chart */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-foreground mb-4">Revenus par opérateur</h2>
            {revLoading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                  <Tooltip
                    formatter={(v: number) => [formatFCFA(v), "Revenus"]}
                    contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Order statuses */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-foreground mb-4">Statut des commandes</h2>
            {ordersLoading ? <Skeleton className="h-48" /> : orderStats ? (
              <div className="space-y-3">
                {[
                  { label: "Payées", value: orderStats.paid, color: "bg-green-500" },
                  { label: "En attente", value: orderStats.pending, color: "bg-yellow-500" },
                  { label: "Échouées", value: orderStats.failed, color: "bg-red-500" },
                  { label: "Annulées", value: orderStats.cancelled, color: "bg-gray-400" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                    <div className="flex-1 text-sm text-foreground">{item.label}</div>
                    <div className="font-bold text-sm">{item.value}</div>
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${item.color}`}
                        style={{ width: orderStats.total > 0 ? `${(item.value / orderStats.total) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Popular bundles */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm mb-6">
          <h2 className="font-bold text-foreground mb-4">Forfaits populaires</h2>
          {popLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="space-y-2">
              {popular?.slice(0, 5).map((item, i) => (
                <div key={item.bundle?.id ?? i} className="flex items-center gap-3 py-2">
                  <div className="text-muted-foreground font-bold text-sm w-5">{i + 1}</div>
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                    style={{ background: item.bundle?.operatorColor ?? "#888" }}
                  >
                    {(item.bundle?.operatorName ?? "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{item.bundle?.dataSize} — {item.bundle?.operatorName}</div>
                    <div className="text-xs text-muted-foreground">{item.bundle?.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm">{item.totalOrders} cmd.</div>
                    <div className="text-xs text-primary">{formatFCFA(item.totalRevenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full order history */}
        {(() => {
          const q = histSearch.trim().toLowerCase();
          const filtered = histOrders.filter(o =>
            !q || o.phoneNumber?.includes(q) ||
            (o.payerName ?? "").toLowerCase().includes(q) ||
            (o.transactionId ?? "").toLowerCase().includes(q) ||
            String(o.id).includes(q)
          );
          const totalPages = Math.max(1, Math.ceil(filtered.length / HIST_PAGE_SIZE));
          const safePage   = Math.min(histPage, totalPages);
          const paginated  = filtered.slice((safePage - 1) * HIST_PAGE_SIZE, safePage * HIST_PAGE_SIZE);

          return (
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="flex items-center justify-between flex-1">
                  <h2 className="font-bold text-foreground">Historique des commandes</h2>
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/ashtech/orders")} className="gap-1 text-xs">
                    Gérer <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
                {/* Search */}
                <div className="relative sm:w-52 flex-shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={histSearch}
                    onChange={e => { setHistSearch(e.target.value); setHistPage(1); }}
                    placeholder="Numéro, nom, ID…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* List */}
              {histLoading ? (
                <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {q ? `Aucun résultat pour "${q}"` : "Aucune commande"}
                </p>
              ) : (
                <>
                  <div className="space-y-0 divide-y divide-gray-100">
                    {paginated.map(order => (
                      <div key={order.id} className="flex items-center gap-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {order.bundle?.dataSize ?? "—"} — {order.bundle?.operatorName ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            📱 {order.phoneNumber}
                            {order.payerName ? ` · ${order.payerName}` : ""}
                            {" · "}{formatDate(order.createdAt)}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm">{formatFCFA(order.totalAmount)}</div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {filtered.length > HIST_PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <span className="text-xs text-muted-foreground">
                        {(safePage - 1) * HIST_PAGE_SIZE + 1}–{Math.min(safePage * HIST_PAGE_SIZE, filtered.length)} sur {filtered.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setHistPage(p => Math.max(1, p - 1))}
                          disabled={safePage === 1}
                          className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-muted-foreground hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
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
                                onClick={() => setHistPage(p as number)}
                                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                  safePage === p
                                    ? "bg-gray-900 text-white"
                                    : "border border-gray-200 text-muted-foreground hover:bg-gray-50"
                                }`}
                              >
                                {p}
                              </button>
                            )
                          )}
                        <button
                          onClick={() => setHistPage(p => Math.min(totalPages, p + 1))}
                          disabled={safePage === totalPages}
                          className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-muted-foreground hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
