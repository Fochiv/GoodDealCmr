import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Copy, Home, ClipboardList, Wifi, HeadphonesIcon, X, User } from "lucide-react";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { formatFCFA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
const DELIVERY_SECONDS = 180;

function DeliveryCountdown({ bundleName, phone }: { bundleName: string; phone: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (elapsed >= DELIVERY_SECONDS) { setDone(true); return; }
    const timer = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        if (next >= DELIVERY_SECONDS) setDone(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [elapsed]);

  const progress = Math.min((elapsed / DELIVERY_SECONDS) * 100, 100);
  const remaining = DELIVERY_SECONDS - elapsed;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-green-800 text-sm">Forfait activé !</div>
            <div className="text-xs text-green-700">{bundleName} livré sur {phone}</div>
          </div>
        </div>
        <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
          <div className="h-3 rounded-full bg-green-500" style={{ width: "100%" }} />
        </div>
        <div className="text-xs text-green-700 mt-2 text-center font-semibold">Connexion internet activée ✓</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-orange-50 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Wifi className="w-5 h-5 text-primary animate-pulse" />
        </div>
        <div>
          <div className="font-bold text-foreground text-sm">Livraison en cours...</div>
          <div className="text-xs text-muted-foreground">Activation de {bundleName} sur {phone}</div>
        </div>
        <div className="ml-auto text-right flex-shrink-0">
          <div className="text-lg font-black text-primary">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
          <div className="text-xs text-muted-foreground">restant</div>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
        <span>Traitement paiement</span>
        <span>Activation réseau</span>
        <span>Connexion active</span>
      </div>
    </div>
  );
}

function WhatsAppFab() {
  const [open, setOpen] = useState(false);
  const { data: settings } = useSettings();
  const whatsappNumber = settings?.whatsapp_number ?? DEFAULT_WHATSAPP;
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Bonjour Good Deal, j'ai besoin d'aide avec ma commande 👋")}`;

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
              <div className="text-sm font-bold text-foreground">Service client</div>
              <div className="text-xs text-muted-foreground">WhatsApp · Réponse rapide</div>
            </div>
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: open ? "#6b7280" : "linear-gradient(135deg, #FF6600, #FFD700)" }}
        aria-label="Aide"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <HeadphonesIcon className="w-6 h-6 text-white" />}
      </button>
    </div>
  );
}

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const txnId = urlParams.get("txn") ?? "";
  const orderId = parseInt(urlParams.get("orderId") ?? "0");
  const amount = parseInt(urlParams.get("amount") ?? "0");
  const phone = urlParams.get("phone") ?? "";
  const payerName = urlParams.get("payerName") ?? "";

  const { data: order } = useGetOrder(orderId, {
    query: { enabled: orderId > 0, queryKey: getGetOrderQueryKey(orderId) },
  });

  const copyTxn = () => {
    navigator.clipboard.writeText(txnId);
    toast({ title: "Copié !", description: "ID de transaction copié." });
  };

  const bundleName = order?.bundle
    ? `${order.bundle.dataSize} ${order.bundle.operatorName}`
    : "votre forfait";

  const displayName = (order as any)?.payerName ?? payerName;

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 px-4 bg-gray-50">
      <div className="max-w-md mx-auto pt-4">

        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-1">Paiement réussi !</h1>
          {displayName && (
            <p className="text-base font-semibold text-foreground mb-1">Merci, {displayName} 🙏</p>
          )}
          <p className="text-muted-foreground text-sm">Votre forfait est en cours d'activation</p>
        </div>

        {/* Delivery countdown */}
        <div className="mb-5">
          <DeliveryCountdown bundleName={bundleName} phone={phone} />
        </div>

        {/* Receipt */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-5 shadow-sm">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reçu de transaction</span>
          </div>
          <div className="p-5 space-y-3">
            {displayName && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Nom complet
                </span>
                <span className="text-sm font-semibold">{displayName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Forfait</span>
              <span className="text-sm font-semibold">{order?.bundle?.dataSize ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Opérateur</span>
              <span className="text-sm font-semibold">{order?.bundle?.operatorName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Numéro rechargé</span>
              <span className="text-sm font-semibold">{phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Validité</span>
              <span className="text-sm font-semibold">{order?.bundle?.validity ?? "—"} jours</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3">
              <span className="text-sm font-bold text-foreground">Total payé</span>
              <span className="text-sm font-black text-primary">{formatFCFA(amount)}</span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">ID de transaction</div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                  {txnId}
                </code>
                <button onClick={copyTxn} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setLocation("/")} className="gap-2">
            <Home className="w-4 h-4" />
            Accueil
          </Button>
          <Button
            onClick={() => setLocation(`/commandes?phone=${encodeURIComponent(phone)}`)}
            className="gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Mes commandes
          </Button>
        </div>
      </div>

      <WhatsAppFab />
    </div>
  );
}
