import { useEffect } from "react";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ShoppingBag, Package, ArrowRight, LogOut } from "lucide-react";
import {
  useGetRevenueStats, getGetRevenueStatsQueryKey,
  useGetOrderStats, getGetOrderStatsQueryKey,
  useGetPopularBundles, getGetPopularBundlesQueryKey,
} from "@workspace/api-client-react";
import { formatFCFA, getStatusColor, getStatusLabel, formatDate } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isAdminAuthenticated, setAdminAuth } from "./Ashtech";

export default function Admin() {
  const [, setLocation] = useLocation();
  const isAdmin = isAdminAuthenticated();

  useEffect(() => {
    if (!isAdmin) setLocation("/ashtech");
  }, [isAdmin]);

  const { data: revenue, isLoading: revLoading } = useGetRevenueStats({
    query: { enabled: isAdmin, queryKey: getGetRevenueStatsQueryKey() }
  });
  const { data: orderStats, isLoading: ordersLoading } = useGetOrderStats({
    query: { enabled: isAdmin, queryKey: getGetOrderStatsQueryKey() }
  });
  const { data: popular, isLoading: popLoading } = useGetPopularBundles({
    query: { enabled: isAdmin, queryKey: getGetPopularBundlesQueryKey() }
  });

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Tableau de bord admin</h1>
            <p className="text-muted-foreground text-sm">Good Deal — panneau d'administration</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/bundles")}>Forfaits</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/orders")}>Commandes</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/users")}>Utilisateurs</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/reviews")} className="gap-1">⭐ Avis</Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Revenus totaux", value: revenue ? formatFCFA(revenue.totalRevenue) : "—", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", loading: revLoading },
            { label: "Commandes totales", value: orderStats?.total ?? "—", icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50", loading: ordersLoading },
            { label: "Payées", value: revenue?.paidOrders ?? "—", icon: Package, color: "text-primary", bg: "bg-orange-50", loading: revLoading },
            { label: "En attente", value: orderStats?.pending ?? "—", icon: ShoppingBag, color: "text-yellow-600", bg: "bg-yellow-50", loading: ordersLoading },
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
                </>
              )}
            </div>
          ))}
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

        {/* Recent orders */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">Commandes récentes</h2>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/ashtech/orders")} className="gap-1 text-xs">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          {ordersLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : (
            <div className="space-y-2">
              {orderStats?.recentOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{order.bundle?.dataSize} — {order.bundle?.operatorName}</div>
                    <div className="text-xs text-muted-foreground">{order.phoneNumber} · {formatDate(order.createdAt)}</div>
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
          )}
        </div>
      </div>
    </div>
  );
}
