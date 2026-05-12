import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Copy, Home, ClipboardList, Wifi } from "lucide-react";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { formatFCFA, formatDate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const DELIVERY_SECONDS = 180; // 3 minutes simulated delivery

function DeliveryCountdown({ bundleName, phone }: { bundleName: string; phone: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (elapsed >= DELIVERY_SECONDS) {
      setDone(true);
      return;
    }
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
          <div className="h-3 rounded-full bg-green-500 transition-all duration-1000" style={{ width: "100%" }} />
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

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const txnId = urlParams.get("txn") ?? "";
  const orderId = parseInt(urlParams.get("orderId") ?? "0");
  const amount = parseInt(urlParams.get("amount") ?? "0");
  const phone = urlParams.get("phone") ?? "";

  const { data: order } = useGetOrder(orderId, {
    query: { enabled: orderId > 0, queryKey: getGetOrderQueryKey(orderId) }
  });

  const copyTxn = () => {
    navigator.clipboard.writeText(txnId);
    toast({ title: "Copié !", description: "ID de transaction copié." });
  };

  const bundleName = order?.bundle
    ? `${order.bundle.dataSize} ${order.bundle.operatorName}`
    : "votre forfait";

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 px-4 bg-gray-50">
      <div className="max-w-md mx-auto pt-4">
        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-1">Paiement réussi !</h1>
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
          <Button onClick={() => setLocation(`/commandes?phone=${encodeURIComponent(phone)}`)} className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Mes commandes
          </Button>
        </div>
      </div>
    </div>
  );
}
