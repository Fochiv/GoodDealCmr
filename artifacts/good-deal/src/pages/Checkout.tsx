import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Phone, CreditCard, Loader2, Wifi, Calendar, Check } from "lucide-react";
import { useGetBundle, useCreateOrder, usePayOrder, getGetBundleQueryKey } from "@workspace/api-client-react";
import { formatFCFA } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Checkout() {
  const [location, setLocation] = useLocation();
  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const bundleId = parseInt(urlParams.get("bundleId") ?? "0");

  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mtn_momo" | "orange_money">("mtn_momo");
  const [step, setStep] = useState<"form" | "processing" | "done">("form");

  const { isAuthenticated, token } = useAuth();
  const { toast } = useToast();

  const { data: bundle, isLoading: bundleLoading } = useGetBundle(bundleId, {
    query: { enabled: bundleId > 0, queryKey: getGetBundleQueryKey(bundleId) }
  });

  const createOrder = useCreateOrder();
  const payOrder = usePayOrder();

  const isMtn = bundle?.operatorSlug === "mtn";
  const gradient = isMtn
    ? "linear-gradient(135deg, #FFD700, #FFA500)"
    : "linear-gradient(135deg, #FF6B00, #FF8C00)";

  const handlePay = async () => {
    if (!phone.trim() || phone.trim().length < 9) {
      toast({ title: "Numéro invalide", description: "Entrez un numéro à 9 chiffres minimum.", variant: "destructive" });
      return;
    }

    setStep("processing");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({ bundleId, phoneNumber: phone.trim(), paymentMethod }),
      });

      if (!orderRes.ok) throw new Error("Échec de création de commande");
      const order = await orderRes.json();

      await new Promise(r => setTimeout(r, 1500));

      const payRes = await fetch(`/api/orders/${order.id}/pay`, {
        method: "POST",
        headers,
        body: JSON.stringify({ paymentMethod }),
      });

      if (!payRes.ok) throw new Error("Échec du paiement");
      const result = await payRes.json();

      setLocation(`/payment/success?txn=${result.transactionId}&orderId=${order.id}&amount=${bundle?.price ?? 0}&phone=${encodeURIComponent(phone)}`);
    } catch (err) {
      setStep("form");
      toast({ title: "Erreur", description: "Une erreur est survenue. Réessayez.", variant: "destructive" });
    }
  };

  if (!bundleId) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Aucun forfait sélectionné</p>
          <Button onClick={() => setLocation("/")}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 px-4">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 font-medium text-sm"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <h1 className="text-2xl font-black text-foreground mb-6">Finaliser l'achat</h1>

        {/* Bundle Summary */}
        {bundleLoading ? (
          <div className="h-32 rounded-2xl bg-muted animate-pulse mb-6" />
        ) : bundle ? (
          <div
            className="rounded-2xl p-5 mb-6 shadow-lg"
            style={{ background: gradient }}
            data-testid="bundle-summary"
          >
            <div className={`flex items-center justify-between ${isMtn ? "text-gray-900" : "text-white"}`}>
              <div>
                <div className="text-xs font-bold opacity-75 mb-1">{bundle.operatorName}</div>
                <div className="text-3xl font-black mb-1">{bundle.dataSize}</div>
                <div className="flex items-center gap-3 text-sm opacity-80">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{bundle.validity} jours</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black">{formatFCFA(bundle.price)}</div>
                <div className="text-xs opacity-75 mt-1">Prix total</div>
              </div>
            </div>
          </div>
        ) : null}

        {step === "processing" ? (
          <div className="bg-card border border-card-border rounded-2xl p-10 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Traitement en cours...</h3>
            <p className="text-sm text-muted-foreground">Votre paiement Mobile Money est en cours de traitement.</p>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-2xl p-6 space-y-6">
            {/* Phone number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Numéro à recharger
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Ex: 6XXXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="text-base"
                data-testid="input-phone"
              />
              <p className="text-xs text-muted-foreground">Entrez le numéro qui recevra le forfait internet</p>
            </div>

            {/* Payment method */}
            <div className="space-y-3">
              <Label className="font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Moyen de paiement
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("mtn_momo")}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === "mtn_momo"
                      ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20"
                      : "border-border bg-background"
                  }`}
                  data-testid="button-payment-mtn"
                >
                  {paymentMethod === "mtn_momo" && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="text-sm font-bold" style={{ color: "#B8860B" }}>MTN</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Mobile Money</div>
                </button>
                <button
                  onClick={() => setPaymentMethod("orange_money")}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === "orange_money"
                      ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                      : "border-border bg-background"
                  }`}
                  data-testid="button-payment-orange"
                >
                  {paymentMethod === "orange_money" && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="text-sm font-bold text-orange-700">Orange</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Orange Money</div>
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-3 border-t border-border">
              <span className="font-semibold text-foreground">Total à payer</span>
              <span className="text-xl font-black text-primary">{bundle ? formatFCFA(bundle.price) : "—"}</span>
            </div>

            <Button
              onClick={handlePay}
              className="w-full py-6 text-base font-bold rounded-xl"
              style={{ background: gradient, color: isMtn ? "#1a1a1a" : "white", border: "none" }}
              disabled={!phone.trim() || !bundle}
              data-testid="button-pay"
            >
              Payer {bundle ? formatFCFA(bundle.price) : ""}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Paiement 100% sécurisé. Mode démo activé — aucun vrai paiement prélevé.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
