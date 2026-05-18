import { useState, useEffect, useRef } from "react";
import {
  Phone, Search, Wifi, CheckCircle, XCircle, Clock,
  Loader2, RefreshCw, User, HeadphonesIcon, X,
  CircleDot, AlertCircle, Package,
} from "lucide-react";
import { formatFCFA, formatDate, formatRef } from "@/lib/api";
import { saveDevicePhone } from "@/components/DevicePendingBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_WHATSAPP = "237650000000";
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/settings`);
      if (!res.ok) throw new Error("settings fetch failed");
      return res.json();
    },
    staleTime: 60000,
  });
}

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

// ─── Pending Banner ──────────────────────────────────────────────────────────
function PendingGlobalBanner({ count, onRefresh }: { count: number; onRefresh: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-3 p-4"
      style={{ background: "linear-gradient(135deg, #fef9c3, #fef08a)" }}>
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl overflow-hidden bg-yellow-200">
        <div className="h-full bg-yellow-500"
          style={{ animation: "slideRight 2s ease-in-out infinite" }} />
      </div>
      <style>{`
        @keyframes slideRight {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
      <div className="flex items-start gap-3 pt-1">
        <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-yellow-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-yellow-900 text-sm">
            {count === 1
              ? "1 paiement en attente de confirmation"
              : `${count} paiements en attente de confirmation`}
          </div>
          <div className="text-xs text-yellow-800 mt-0.5">
            Votre paiement Mobile Money est en cours de traitement. Nous attendons la confirmation de l'opérateur.
          </div>
        </div>
        <button onClick={onRefresh}
          className="flex-shrink-0 text-yellow-700 hover:text-yellow-900 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Delivering Banner (confirmed = payment received, delivery in progress) ────
function DeliveringGlobalBanner({ count, onRefresh }: { count: number; onRefresh: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-3 p-4"
      style={{ background: "linear-gradient(135deg, #dbeafe, #bfdbfe)" }}>
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl overflow-hidden bg-blue-200">
        <div className="h-full bg-blue-500"
          style={{ animation: "slideRight 2s ease-in-out infinite" }} />
      </div>
      <div className="flex items-start gap-3 pt-1">
        <div className="w-9 h-9 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5 text-blue-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-blue-900 text-sm">
            {count === 1
              ? "✅ Paiement reçu — forfait en cours de livraison"
              : `✅ ${count} paiements reçus — forfaits en cours de livraison`}
          </div>
          <div className="text-xs text-blue-800 mt-0.5">
            Votre paiement a été confirmé avec succès. L'activation du forfait est en cours.
          </div>
        </div>
        <button onClick={onRefresh}
          className="flex-shrink-0 text-blue-700 hover:text-blue-900 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Delivery Progress (paid) ─────────────────────────────────────────────────
function DeliveryProgress({ validatedAt }: { validatedAt: string }) {
  const STAGES = [
    { label: "Paiement reçu",   detail: "Confirmé par l'équipe" },
    { label: "Activation réseau", detail: "En cours chez l'opérateur" },
    { label: "Forfait livré",    detail: "Connexion active" },
  ];

  // Animate steps sequentially on mount
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setActive(1), 400);
    const t2 = setTimeout(() => setActive(2), 900);
    const t3 = setTimeout(() => setActive(3), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="mt-3">
      {/* Progress bar */}
      <div className="relative flex items-center mb-3">
        <div className="absolute left-3 right-3 h-1 bg-green-200 rounded-full" />
        <div
          className="absolute left-3 h-1 bg-green-500 rounded-full transition-all duration-700"
          style={{ width: active >= 3 ? "calc(100% - 24px)" : active === 2 ? "calc(50% - 12px)" : active === 1 ? "calc(0%)" : "0%" }}
        />
        <div className="relative flex justify-between w-full">
          {STAGES.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1" style={{ width: "33.33%" }}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                  i < active
                    ? "bg-green-500 scale-110 shadow-md shadow-green-200"
                    : "bg-green-200"
                }`}
              >
                {i < active
                  ? <CheckCircle className="w-4 h-4 text-white" />
                  : <CircleDot className="w-3 h-3 text-green-400" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step labels */}
      <div className="flex justify-between">
        {STAGES.map((s, i) => (
          <div key={i} className="text-center flex-1 px-0.5">
            <div className={`text-xs font-bold leading-tight ${i < active ? "text-green-700" : "text-green-400"}`}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-center text-xs font-semibold text-green-700 bg-green-100 rounded-lg py-1.5">
        ✅ Forfait activé avec succès
      </div>
    </div>
  );
}

// ─── Pending Progress (waiting) ───────────────────────────────────────────────
function PendingProgress() {
  const [pulse, setPulse] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    ref.current = setInterval(() => setPulse(p => (p + 1) % 100), 30);
    return () => clearInterval(ref.current);
  }, []);

  const barWidth = 30 + 40 * Math.abs(Math.sin((pulse / 100) * Math.PI));

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-yellow-700 flex items-center gap-1.5">
          <Clock className="w-3 h-3 animate-pulse" />
          En attente de confirmation
        </span>
        <div className="flex gap-0.5">
          {[0, 1, 2].map(i => (
            <div key={i}
              className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
      <div className="w-full bg-yellow-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-none"
          style={{
            width: `${barWidth}%`,
            marginLeft: `${Math.max(0, pulse - 30)}%`,
            transition: "width 0.1s, margin-left 0.1s",
          }}
        />
      </div>
      <div className="text-xs text-yellow-700 mt-1.5 text-center">
        Notre équipe vérifie votre paiement Mobile Money
      </div>
    </div>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: Order }) {
  const isMtn = order.bundle?.operatorName?.toLowerCase().includes("mtn");
  const opColor = order.bundle?.operatorColor ?? (isMtn ? "#FFD700" : "#FF6B00");
  const gradient = isMtn
    ? "linear-gradient(135deg, #FFD700, #FFA500)"
    : "linear-gradient(135deg, #FF6B00, #FF8C00)";
  const opText = isMtn ? "#1a1a1a" : "white";

  const isPaid = order.status === "paid";
  // "confirmed" = Pixpay confirmed payment, admin validating delivery
  const isDelivering = order.status === "confirmed";
  // "processing" = USSD sent to Pixpay, waiting for payment confirmation
  const isProcessing = order.status === "processing" || (order.status === "pending" && !!order.transactionId);
  // "notStarted" = order created but never paid (no USSD sent)
  const isNotStarted = order.status === "pending" && !order.transactionId;
  const isFailed = order.status === "failed" || order.status === "cancelled";

  const borderColor = isPaid ? "#bbf7d0" : isDelivering ? "#bfdbfe" : isProcessing ? "#fde68a" : isNotStarted ? "#e5e7eb" : isFailed ? "#fecaca" : "#e5e7eb";
  const bgColor     = isPaid ? "#f0fdf4" : isDelivering ? "#eff6ff" : isProcessing ? "#fefce8" : isNotStarted ? "#fafafa" : isFailed ? "#fff1f2" : "#ffffff";

  return (
    <div
      className="rounded-2xl border-2 overflow-hidden shadow-sm"
      style={{ borderColor, background: bgColor }}
    >
      {/* Status stripe at top */}
      {isProcessing && (
        <div className="h-1.5 w-full overflow-hidden bg-yellow-200">
          <div className="h-full"
            style={{
              background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
              animation: "moveStripe 1.5s ease-in-out infinite",
              width: "50%",
            }}
          />
          <style>{`@keyframes moveStripe { 0%{margin-left:-50%} 100%{margin-left:150%} }`}</style>
        </div>
      )}
      {isDelivering && (
        <div className="h-1.5 w-full overflow-hidden bg-blue-200">
          <div className="h-full"
            style={{
              background: "linear-gradient(90deg, transparent, #3b82f6, transparent)",
              animation: "moveStripe 2s ease-in-out infinite",
              width: "50%",
            }}
          />
        </div>
      )}
      {isNotStarted && <div className="h-1.5 w-full bg-gray-200" />}
      {isPaid   && <div className="h-1.5 w-full bg-green-500" />}
      {isFailed && <div className="h-1.5 w-full bg-red-400" />}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Operator badge */}
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden shadow-sm border border-black/10"
            style={{ background: gradient }}
          >
            <img
              src={isMtn ? "/logo-mtn.png" : "/logo-orange.jpg"}
              alt={isMtn ? "MTN" : "Orange"}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Bundle name + operator */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-foreground text-lg leading-tight">
                {order.bundle?.dataSize ?? "—"}
              </span>
              <img
                src={isMtn ? "/logo-mtn.png" : "/logo-orange.jpg"}
                alt={isMtn ? "MTN" : "Orange"}
                className="h-4 w-auto object-contain rounded"
              />
            </div>

            {/* Payer */}
            {order.payerName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <User className="w-3 h-3" />
                <span className="font-semibold text-foreground">{order.payerName}</span>
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-1">
              <span>Valide {order.bundle?.validity ?? "?"} j</span>
              <span>·</span>
              <span>{order.paymentMethod === "mtn_momo" ? "MTN MoMo" : "Orange Money"}</span>
              {order.payerPhone && <><span>·</span><span>{order.payerPhone}</span></>}
            </div>
          </div>

          {/* Right — amount + status badge */}
          <div className="text-right flex-shrink-0">
            <div className="font-black text-foreground">{formatFCFA(order.totalAmount)}</div>
            <div className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
            <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              isPaid        ? "bg-green-100 text-green-700"  :
              isDelivering  ? "bg-blue-100 text-blue-700"   :
              isProcessing  ? "bg-yellow-100 text-yellow-700" :
              isNotStarted  ? "bg-gray-100 text-gray-500"    :
              isFailed      ? "bg-red-100 text-red-600"      :
              "bg-gray-100 text-gray-600"
            }`}>
              {isPaid        && <CheckCircle className="w-3 h-3" />}
              {isDelivering  && <Package className="w-3 h-3" />}
              {isProcessing  && <Clock className="w-3 h-3" />}
              {isNotStarted  && <Clock className="w-3 h-3" />}
              {isFailed      && <XCircle className="w-3 h-3" />}
              {isPaid ? "Livré" : isDelivering ? "En livraison" : isProcessing ? "En attente" : isNotStarted ? "Non payé" : isFailed ? "Échoué" : order.status}
            </div>
          </div>
        </div>

        {/* Progress section */}
        {isProcessing  && <PendingProgress />}
        {isDelivering  && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                <Package className="w-3 h-3 animate-pulse" />
                En cours de livraison
              </span>
              <div className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <div key={i}
                    className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                style={{ width: "55%", transition: "width 0.5s" }}
              />
            </div>
            <div className="text-xs text-blue-700 mt-1.5 text-center">
              Paiement confirmé — activation forfait en cours
            </div>
          </div>
        )}
        {isNotStarted  && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-gray-300" style={{ width: "5%" }} />
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Paiement non initié — aucun montant débité.
            </div>
          </div>
        )}
        {isPaid    && <DeliveryProgress validatedAt={order.createdAt} />}
        {isFailed  && (
          <div className="mt-3">
            <div className="w-full bg-red-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-red-400" style={{ width: "20%" }} />
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Paiement non reçu — aucun montant débité. Contactez-nous.
            </div>
          </div>
        )}

        {/* Reference */}
        <div className="mt-3 pt-3 border-t border-black/5">
          <div className="text-xs text-muted-foreground font-mono">
            Réf : {formatRef(order.id)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp FAB ─────────────────────────────────────────────────────────────
function WhatsAppFab() {
  const [open, setOpen] = useState(false);
  const { data: settings } = useSettings();
  const whatsappNumber = settings?.whatsapp_number ?? DEFAULT_WHATSAPP;
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Bonjour Good Deal, j'ai besoin d'aide avec ma commande 👋")}`;

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 transition-all hover:scale-105">
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Orders() {
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const p = urlParams.get("phone");
    if (p) { setPhone(p); search(p); }
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
      if (data.length > 0) saveDevicePhone(q);
    } catch {
      setError("Impossible de récupérer les commandes. Réessayez.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); search(); };

  // Orders in active states (visible in floating bars)
  const deliveringOrders = orders.filter(o => o.status === "confirmed");
  const processingOrders = orders.filter(o =>
    o.status === "processing" || (o.status === "pending" && o.transactionId)
  );
  const pendingCount     = processingOrders.length;
  const deliveringCount  = deliveringOrders.length;
  const paidOrders       = orders.filter(o => o.status === "paid");
  const notStartedOrders = orders.filter(o => o.status === "pending" && !o.transactionId);
  const otherOrders      = orders.filter(o =>
    o.status !== "paid" && o.status !== "pending" && o.status !== "processing" && o.status !== "confirmed"
  );

  // Sorted: delivering first, then processing, then paid, then not-started, then failed/cancelled
  const sorted = [...deliveringOrders, ...processingOrders, ...paidOrders, ...notStartedOrders, ...otherOrders];

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="mb-6">
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
              />
              <p className="text-xs text-muted-foreground">
                Le numéro qui a reçu ou doit recevoir le forfait
              </p>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={!phone.trim() || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Recherche..." : "Voir mes commandes"}
            </Button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                  : `${orders.length} commande${orders.length > 1 ? "s" : ""} pour `}
                {orders.length > 0 && <span className="font-black text-foreground underline underline-offset-2">{searched}</span>}
              </div>
              <button onClick={() => search()}
                className="text-xs text-primary flex items-center gap-1 hover:underline">
                <RefreshCw className="w-3 h-3" />
                Actualiser
              </button>
            </div>

            {/* Pending global banner */}
            {deliveringCount > 0 && (
              <DeliveringGlobalBanner count={deliveringCount} onRefresh={() => search()} />
            )}
            {pendingCount > 0 && (
              <PendingGlobalBanner count={pendingCount} onRefresh={() => search()} />
            )}

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
                <Wifi className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-muted-foreground font-medium mb-1">Aucune commande</p>
                <p className="text-xs text-muted-foreground">
                  Aucun forfait trouvé pour <strong>{searched}</strong>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map(order => (
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
