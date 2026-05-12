import { useState, useEffect } from "react";
import {
  Phone, Search, Wifi, CheckCircle, XCircle, Clock,
  Loader2, RefreshCw, User, HeadphonesIcon, X,
} from "lucide-react";
import { formatFCFA, formatDate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WHATSAPP_NUMBER = "237650000000";
const DELIVERY_SECONDS = 180;

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
  payerPhone: string | null;
  payerName: string | null;
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
      return { icon: CheckCircle, label: "Livré", color: "text-green-600", bg: "bg-green-50 border-green-200" };
    case "pending":
      return { icon: Clock, label: "En cours", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" };
    case "failed":
      return { icon: XCircle, label: "Échoué", color: "text-red-600", bg: "bg-red-50 border-red-200" };
    default:
      return { icon: Clock, label: status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" };
  }
}

function PendingCountdown({ createdAt }: { createdAt: string }) {
  const startMs = new Date(createdAt).getTime();
  const totalMs = DELIVERY_SECONDS * 1000;

  const calcElapsed = () => Math.floor((Date.now() - startMs) / 1000);
  const [elapsed, setElapsed] = useState(calcElapsed);
  const done = elapsed >= DELIVERY_SECONDS;

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed(calcElapsed()), 1000);
    return () => clearInterval(t);
  }, [done]);

  const progress = Math.min((elapsed / DELIVERY_SECONDS) * 100, 100);
  const remaining = Math.max(DELIVERY_SECONDS - elapsed, 0);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (done) {
    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-yellow-700">Finalisation en cours...</span>
        </div>
        <div className="w-full bg-yellow-200 rounded-full h-2.5 overflow-hidden">
          <div className="h-2.5 rounded-full bg-yellow-500 animate-pulse" style={{ width: "90%" }} />
        </div>
        <div className="text-xs text-yellow-700 mt-1">Activation réseau en cours, patientez svp</div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-yellow-700">Activation en cours...</span>
        <span className="text-sm font-black text-yellow-700">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
      </div>
      <div className="w-full bg-yellow-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-yellow-600 mt-1">
        <span>Paiement reçu</span>
        <span>Activation réseau</span>
        <span>Connexion active</span>
      </div>
    </div>
  );
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

          {/* Payer name */}
          {order.payerName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="font-semibold text-foreground">{order.payerName}</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-2">
            <span>Valide {order.bundle?.validity ?? "?"} jours</span>
            <span>·</span>
            <span>{order.paymentMethod === "mtn_momo" ? "MTN MoMo" : "Orange Money"}</span>
            {order.payerPhone && (
              <>
                <span>·</span>
                <span>{order.payerPhone}</span>
              </>
            )}
          </div>

          {/* Status */}
          <div className={`flex items-center gap-2 ${info.color}`}>
            <info.icon className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold text-sm">{info.label}</span>
          </div>

          {/* Paid: full green bar */}
          {order.status === "paid" && (
            <div className="mt-2">
              <div className="w-full bg-green-200 rounded-full h-2.5">
                <div className="h-2.5 rounded-full bg-green-500" style={{ width: "100%" }} />
              </div>
              <div className="text-xs text-green-700 mt-1 font-medium">Forfait activé ✓</div>
            </div>
          )}

          {/* Pending: live countdown */}
          {order.status === "pending" && (
            <PendingCountdown createdAt={order.createdAt} />
          )}

          {/* Failed */}
          {order.status === "failed" && (
            <div className="mt-2">
              <div className="w-full bg-red-200 rounded-full h-2.5">
                <div className="h-2.5 rounded-full bg-red-400" style={{ width: "30%" }} />
              </div>
              <div className="text-xs text-red-700 mt-1 font-medium">Échec — aucun montant débité</div>
            </div>
          )}
        </div>

        {/* Amount + date */}
        <div className="text-right flex-shrink-0">
          <div className="font-black text-foreground">{formatFCFA(order.totalAmount)}</div>
          <div className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
        </div>
      </div>

      {order.transactionId && (
        <div className="mt-3 pt-3 border-t border-current/10">
          <div className="text-xs text-muted-foreground">
            Ref : <span className="font-mono">{order.transactionId}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsAppFab() {
  const [open, setOpen] = useState(false);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Bonjour Good Deal, j'ai besoin d'aide avec ma commande 👋")}`;

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 transition-all hover:scale-105"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#25D366" }}>
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.524 5.855L.057 23.293a.75.75 0 0 0 .908.941l5.629-1.48A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.694 9.694 0 0 1-4.951-1.355l-.355-.212-3.683.967.984-3.595-.232-.37A9.694 9.694 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Contacter l'admin</div>
              <div className="text-xs text-muted-foreground">WhatsApp · Réponse rapide</div>
            </div>
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: open ? "#6b7280" : "linear-gradient(135deg, #FF6B00, #FFD700)" }}
        aria-label="Aide"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <HeadphonesIcon className="w-6 h-6 text-white" />}
      </button>
    </div>
  );
}

export default function Orders() {
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
                Numéro de téléphone bénéficiaire
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
              <p className="text-xs text-muted-foreground">
                Le numéro qui a reçu ou doit recevoir le forfait
              </p>
            </div>
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={!phone.trim() || loading}
              data-testid="button-search"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Recherche..." : "Voir mes commandes"}
            </Button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {/* Results */}
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

      <WhatsAppFab />
    </div>
  );
}
