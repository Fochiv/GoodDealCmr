import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ShoppingBag, Users, Package, ArrowRight } from "lucide-react";
import {
  useGetRevenueStats, getGetRevenueStatsQueryKey,
  useGetOrderStats, getGetOrderStatsQueryKey,
  useGetPopularBundles, getGetPopularBundlesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { formatFCFA, getStatusColor, getStatusLabel, formatDate } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Admin() {
  const { isAdmin, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: revenue, isLoading: revLoading } = useGetRevenueStats({ query: { enabled: isAdmin, queryKey: getGetRevenueStatsQueryKey() } });
  const { data: orderStats, isLoading: ordersLoading } = useGetOrderStats({ query: { enabled: isAdmin, queryKey: getGetOrderStatsQueryKey() } });
  const { data: popular, isLoading: popLoading } = useGetPopularBundles({ query: { enabled: isAdmin, queryKey: getGetPopularBundlesQueryKey() } });

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Accès non autorisé</h2>
          <p className="text-muted-foreground mb-4">Vous devez être administrateur pour accéder à cette page.</p>
          <Button onClick={() => setLocation("/")}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  const chartData = revenue?.revenueByOperator.map(r => ({
    name: r.operatorName,
    revenue: r.revenue,
    commandes: r.orders,
  })) ?? [];

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Administration</h1>
            <p className="text-muted-foreground text-sm">Vue d'ensemble de la plateforme</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/admin/bundles")} data-testid="link-admin-bundles">
              Gérer les forfaits
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/admin/orders")} data-testid="link-admin-orders">
              Commandes
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Revenus totaux", value: revenue ? formatFCFA(revenue.totalRevenue) : "—", icon: TrendingUp, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20", loading: revLoading },
            { label: "Commandes totales", value: orderStats?.total ?? "—", icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20", loading: ordersLoading },
            { label: "Commandes payées", value: revenue?.paidOrders ?? "—", icon: Package, color: "text-primary", bg: "bg-primary/10", loading: revLoading },
            { label: "En attente", value: orderStats?.pending ?? "—", icon: Users, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/20", loading: ordersLoading },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-card-border rounded-xl p-4" data-testid={`admin-stat-${stat.label}`}>
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
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-bold text-foreground mb-4">Revenus par opérateur</h2>
            {revLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    formatter={(value: number) => [formatFCFA(value), "Revenus"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Order status breakdown */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-bold text-foreground mb-4">Statut des commandes</h2>
            {ordersLoading ? (
              <Skeleton className="h-48" />
            ) : orderStats ? (
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
                    <div className="font-bold text-sm text-foreground">{item.value}</div>
                    <div className="w-24 bg-muted rounded-full h-1.5">
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
        <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">Forfaits populaires</h2>
          </div>
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
                    <div className="font-semibold text-sm text-foreground">{item.bundle?.dataSize} — {item.bundle?.operatorName}</div>
                    <div className="text-xs text-muted-foreground">{item.bundle?.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm text-foreground">{item.totalOrders} cmd.</div>
                    <div className="text-xs text-primary">{formatFCFA(item.totalRevenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">Commandes récentes</h2>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/orders")} className="gap-1 text-xs">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          {ordersLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : (
            <div className="space-y-2">
              {orderStats?.recentOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {order.bundle?.dataSize} — {order.bundle?.operatorName}
                    </div>
                    <div className="text-xs text-muted-foreground">{order.phoneNumber} · {formatDate(order.createdAt)}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm text-foreground">{formatFCFA(order.totalAmount)}</div>
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
