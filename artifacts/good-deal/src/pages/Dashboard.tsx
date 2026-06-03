import { useLocation } from "wouter";
import { ShoppingBag, Wifi, Calendar, Clock, User } from "lucide-react";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { formatFCFA, formatDate, getStatusColor, getStatusLabel, formatRef } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: orders, isLoading } = useListOrders({ query: { enabled: isAuthenticated, queryKey: getListOrdersQueryKey() } });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-bold text-foreground mb-2">Connexion requise</h2>
          <p className="text-muted-foreground mb-6">Connectez-vous pour accéder à votre tableau de bord.</p>
          <Button onClick={() => setLocation("/login")}>Se connecter</Button>
        </div>
      </div>
    );
  }

  const paid = orders?.filter(o => o.status === "paid").length ?? 0;
  const total = orders?.length ?? 0;
  const spent = orders?.filter(o => o.status === "paid").reduce((s, o) => s + o.totalAmount, 0) ?? 0;

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-foreground">Mon espace</h1>
          <p className="text-muted-foreground">Bienvenue, {user?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Commandes", value: total, icon: ShoppingBag },
            { label: "Payées", value: paid, icon: Wifi },
            { label: "Total dépensé", value: formatFCFA(spent), icon: Calendar, small: true },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-card-border rounded-xl p-4" data-testid={`stat-${stat.label.toLowerCase()}`}>
              <stat.icon className="w-5 h-5 text-primary mb-2" />
              <div className={`font-black text-foreground mb-0.5 ${stat.small ? "text-sm" : "text-2xl"}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Account info */}
        <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Informations du compte
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs mb-0.5">Nom complet</div>
              <div className="font-semibold text-foreground" data-testid="text-username">{user?.name}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-0.5">Email</div>
              <div className="font-semibold text-foreground">{user?.email}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-0.5">Téléphone</div>
              <div className="font-semibold text-foreground">{user?.phone}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-0.5">Type de compte</div>
              <div className="font-semibold text-foreground capitalize">{user?.role}</div>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div>
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Historique des commandes
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : !orders?.length ? (
            <div className="bg-card border border-card-border rounded-xl p-10 text-center">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">Aucune commande pour le moment</p>
              <Button className="mt-4" onClick={() => setLocation("/")}>Acheter un forfait</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4" data-testid={`order-${order.id}`}>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: order.bundle?.operatorColor ? `${order.bundle.operatorColor}20` : "#f3f4f6" }}
                  >
                    <Wifi className="w-5 h-5" style={{ color: order.bundle?.operatorColor ?? "#888" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm">{order.bundle?.dataSize ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{order.bundle?.operatorName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatDate(order.createdAt)}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{formatRef(order.id)}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-sm text-foreground">{formatFCFA(order.totalAmount)}</div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`} data-testid={`status-order-${order.id}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12" style={{ background: "#111111", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded flex items-center justify-center font-black text-white text-base flex-shrink-0" style={{ background: "#FF6600" }}>
              G
            </div>
            <div>
              <div className="font-black text-white text-base">Good Deal</div>
              <div className="text-xs text-gray-500">Forfaits internet MTN & Orange au Cameroun</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Navigation</div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Accueil", href: "/" },
                { label: "Tous les forfaits", href: "/forfaits" },
                { label: "Mes commandes", href: "/commandes" },
              ].map(link => (
                <a key={link.label} href={link.href} className="text-sm font-bold transition-opacity hover:opacity-70" style={{ color: "#FF6600" }}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="border-t mb-8" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

          <div className="flex flex-col gap-3 mb-8">
            {["Politique de confidentialité", "Conditions générales d'utilisation", "Assistance client", "ANTIC — Cybersécurité"].map(link => (
              <a key={link} href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{link}</a>
            ))}
          </div>

          <div className="border-t mb-6" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

          <p className="text-xs text-gray-600">© 2025 GOOD DEAL, ALL RIGHTS RESERVED.</p>
          <p className="text-xs text-gray-700 mt-1">Forfaits distribués par <span style={{ color: "#FF6600" }}>Good Deal Cameroun</span></p>
        </div>
      </footer>
    </div>
  );
}
