import { useState, useEffect } from "react";
import { Phone, Search, Wifi, CheckCircle, XCircle, Clock, Loader2, RefreshCw } from "lucide-react";
import { formatFCFA, formatDate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrderBundle {
  dataSize: string;
  operatorName: string;
  operatorColor: string | null;
  validity: number;
  name: string;
}

interface Order {
  id: number;
  phoneNumber: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  transactionId: string | null;
  createdAt: string;
  bundle: OrderBundle | null;
}

function statusInfo(status: string) {
  switch (status) {
    case "paid":
      return { icon: CheckCircle, label: "Livré", color: "text-green-600", bg: "bg-green-50 border-green-200", iconBg: "bg-green-100" };
    case "pending":
      return { icon: Clock, label: "En cours", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", iconBg: "bg-yellow-100" };
    case "failed":
      return { icon: XCircle, label: "Échoué", color: "text-red-600", bg: "bg-red-50 border-red-200", iconBg: "bg-red-100" };
    default:
      return { icon: Clock, label: status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", iconBg: "bg-gray-100" };
  }
}

function OrderCard({ order }: { order: Order }) {
  const info = statusInfo(order.status);
  const isMtn = order.bundle?.operatorName?.toLowerCase().includes("mtn");
  const gradient = isMtn
    ? "linear-gradient(135deg, #FFD700, #FFA500)"
    : "linear-gradient(135deg, #FF6B00, #FF8C00)";

  return (
    <div className={`rounded-2xl border-2 p-4 ${info.bg}`}>
      <div className="flex items-start gap-3">
        {/* Operator badge */}
        <div
          className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-black"
          style={{ background: gradient, color: isMtn ? "#1a1a1a" : "white" }}
        >
          {isMtn ? "MTN" : "🟠"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-black text-foreground text-base">{order.bundle?.dataSize ?? "—"}</span>
            <span className="text-xs text-muted-foreground">{order.bundle?.operatorName}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-2">
            <span>Valide {order.bundle?.validity ?? "?"} jours</span>
            <span>·</span>
            <span>{order.paymentMethod === "mtn_momo" ? "MTN MoMo" : "Orange Money"}</span>
          </div>

          {/* Status bar */}
          <div className={`flex items-center gap-2 ${info.color}`}>
            <info.icon className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold text-sm">{info.label}</span>
          </div>

          {/* Progress bar for paid orders */}
          {order.status === "paid" && (
            <div className="mt-2">
              <div className="w-full bg-green-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-500" style={{ width: "100%" }} />
              </div>
              <div className="text-xs text-green-700 mt-1 font-medium">Forfait activé ✓</div>
            </div>
          )}
          {order.status === "pending" && (
            <div className="mt-2">
              <div className="w-full bg-yellow-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-yellow-500 animate-pulse"
                  style={{ width: "60%" }}
                />
              </div>
              <div className="text-xs text-yellow-700 mt-1 font-medium">Activation en cours...</div>
            </div>
          )}
          {order.status === "failed" && (
            <div className="mt-2">
              <div className="w-full bg-red-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-red-400" style={{ width: "30%" }} />
              </div>
              <div className="text-xs text-red-700 mt-1 font-medium">Échec — aucun montant débité</div>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <div className="font-black text-foreground">{formatFCFA(order.totalAmount)}</div>
          <div className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
        </div>
      </div>

      {order.transactionId && (
        <div className="mt-3 pt-3 border-t border-current/10">
          <div className="text-xs text-muted-foreground">
            Ref: <span className="font-mono">{order.transactionId}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Orders() {
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill from URL ?phone=
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const p = urlParams.get("phone");
    if (p) {
      setPhone(p);
      search(p);
    }
  }, []);

  const search = async (phoneVal?: string) => {
    const q = (phoneVal ?? phone).trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setSearched(q);
    try {
      const res = await fetch(`/api/orders/track?phone=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      setOrders(data);
    } catch {
      setError("Impossible de récupérer les commandes. Réessayez.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search();
  };

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-foreground mb-1">Mes commandes</h1>
          <p className="text-muted-foreground text-sm">Suivez l'état de vos forfaits internet</p>
        </div>

        {/* Search form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Entrez votre numéro de téléphone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Ex: 670000000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="text-base"
                data-testid="input-search-phone"
              />
              <p className="text-xs text-muted-foreground">Le numéro utilisé lors de l'achat du forfait</p>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={!phone.trim() || loading} data-testid="button-search">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Recherche..." : "Voir mes commandes"}
            </Button>
          </form>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {searched && !loading && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-foreground">
                {orders.length === 0
                  ? "Aucune commande trouvée"
                  : `${orders.length} commande${orders.length > 1 ? "s" : ""} pour ${searched}`}
              </div>
              <button
                onClick={() => search()}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="w-3 h-3" />
                Actualiser
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
                <Wifi className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-muted-foreground font-medium mb-1">Aucune commande</p>
                <p className="text-xs text-muted-foreground">
                  Aucun forfait trouvé pour le numéro <strong>{searched}</strong>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
