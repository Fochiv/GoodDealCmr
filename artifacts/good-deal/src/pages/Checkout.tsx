import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Phone, CreditCard, Loader2, Calendar, Check,
  Wifi, User, ChevronRight, Signal, CheckCircle2,
  PartyPopper, XCircle, RefreshCw,
} from "lucide-react";
import { useGetBundle, getGetBundleQueryKey } from "@workspace/api-client-react";
import { formatFCFA } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePendingPayment, clearPendingPayment } from "@/components/PendingPaymentBar";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + " " + d.slice(3);
  return d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6, 9);
}

type OrderStatus = "pending" | "processing" | "paid" | "failed" | "cancelled";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const bundleId = parseInt(urlParams.get("bundleId") ?? "0");

  const [recipientPhone, setRecipientPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mtn_momo" | "orange_money">("mtn_momo");
  const [payerPhone, setPayerPhone] = useState("");
  const [payerName, setPayerName] = useState("");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [processing, setProcessing] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("processing");
  const [pixpayState, setPixpayState] = useState<string>("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { token } = useAuth();
  const { toast } = useToast();

  const { data: bundle, isLoading: bundleLoading } = useGetBundle(bundleId, {
    query: { enabled: bundleId > 0, queryKey: getGetBundleQueryKey(bundleId) },
  });

  const isMtn = bundle?.operatorSlug === "mtn";
  const operatorLabel = isMtn ? "MTN" : "Orange";
  const operatorColor = isMtn ? "#FFD700" : "#FF6B00";
  const operatorTextColor = isMtn ? "#1a1a1a" : "#ffffff";
  const gradient = isMtn
    ? "linear-gradient(135deg, #FFD700, #FFA500)"
    : "linear-gradient(135deg, #FF6B00, #FF8C00)";

  const startPolling = (id: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    // SSE: server pushes status instantly when IPN fires — no polling needed
    const es = new EventSource(`${API_BASE}/orders/${id}/events`);
    (pollRef as any).current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { status: string };
        const status = data.status as OrderStatus;
        setOrderStatus(status);
        if (status === "paid" || status === "failed" || status === "cancelled") {
          clearPendingPayment();
          es.close();
        }
      } catch {}
    };
    es.onerror = () => es.close();
  };

  useEffect(() => {
    return () => {
      const ref = (pollRef as any).current;
      if (ref instanceof EventSource) ref.close();
      else if (ref) clearInterval(ref);
    };
  }, []);

  const handleValidateStep1 = () => {
    if (!recipientPhone.trim() || recipientPhone.replace(/\s/g, "").length < 9) {
      toast({ title: "Numéro invalide", description: "Entrez un numéro valide à 9 chiffres.", variant: "destructive" });
      return;
    }
    setPaymentMethod(isMtn ? "mtn_momo" : "orange_money");
    setStep(2);
  };

  const handlePay = async () => {
    if (!payerPhone.replace(/\s/g, "")) {
      toast({ title: "Numéro manquant", description: "Entrez votre numéro de paiement.", variant: "destructive" });
      return;
    }
    if (!payerName.trim()) {
      toast({ title: "Nom manquant", description: "Entrez votre nom complet.", variant: "destructive" });
      return;
    }

    setProcessing(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const orderRes = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          bundleId,
          phoneNumber: recipientPhone.replace(/\s/g, ""),
          paymentMethod,
          payerPhone: payerPhone.replace(/\s/g, ""),
          payerName: payerName.trim(),
        }),
      });

      if (!orderRes.ok) throw new Error("Échec de création de commande");
      const order = await orderRes.json();
      const id: number = order.id;

      const payRes = await fetch(`${API_BASE}/orders/${id}/pay`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          paymentMethod,
          payerPhone: payerPhone.replace(/\s/g, ""),
          payerName: payerName.trim(),
        }),
      });

      if (!payRes.ok) {
        const err = await payRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Échec de l'initiation du paiement");
      }

      const payData = await payRes.json();
      setOrderId(id);
      setOrderStatus("processing");
      setPixpayState(payData.state ?? "PENDING");
      setStep(3);
      // Save to localStorage so the global floating bar can show it
      savePendingPayment({
        orderId: id,
        recipientPhone: recipientPhone.replace(/\s/g, ""),
        dataSize: bundle?.dataSize ?? "",
        operatorName: bundle?.operatorName ?? "",
        operatorColor,
        isMtn,
        paymentMethod,
        amount: bundle?.price ?? 0,
        timestamp: Date.now(),
      });
      startPolling(id);
    } catch (err: any) {
      toast({
        title: "Erreur de paiement",
        description: err.message ?? "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setOrderId(null);
    setOrderStatus("processing");
    setPixpayState("");
    setStep(2);
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
    <div className="min-h-screen pt-20 pb-24 md:pb-8 px-4 bg-gray-50">
      <div className="max-w-lg mx-auto">

        <button
          onClick={() => {
            if (step === 2) setStep(1);
            else if (step === 3 && (orderStatus === "failed" || orderStatus === "cancelled")) handleRetry();
            else if (step !== 3) window.history.back();
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 2 ? "Modifier le numéro" : step === 3 ? (orderStatus === "failed" ? "Réessayer" : "") : "Retour"}
        </button>

        {step < 3 && (
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: step >= 1 ? operatorColor : "#e5e7eb", color: step >= 1 ? operatorTextColor : "#9ca3af" }}
              >1</div>
              <span className={`text-sm font-semibold ${step === 1 ? "text-foreground" : "text-muted-foreground"}`}>
                Numéro bénéficiaire
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: step >= 2 ? operatorColor : "#e5e7eb", color: step >= 2 ? operatorTextColor : "#9ca3af" }}
              >2</div>
              <span className={`text-sm font-semibold ${step === 2 ? "text-foreground" : "text-muted-foreground"}`}>
                Paiement
              </span>
            </div>
          </div>
        )}

        {step < 3 && bundleLoading ? (
          <div className="h-28 rounded-2xl bg-gray-200 animate-pulse mb-5" />
        ) : step < 3 && bundle ? (
          <div className="rounded-2xl p-5 mb-5 shadow-lg" style={{ background: gradient }}>
            <div className="flex items-center justify-between" style={{ color: operatorTextColor }}>
              <div>
                <div className="text-xs font-bold opacity-70 mb-0.5">{bundle.operatorName}</div>
                <div className="text-3xl font-black">{bundle.dataSize}</div>
                <div className="flex items-center gap-1.5 text-sm opacity-80 mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Validité : {bundle.validity} jours</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black">{formatFCFA(bundle.price)}</div>
                <div className="text-xs opacity-70 mt-0.5">Prix forfait</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ===================== STEP 1 ===================== */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-black text-foreground mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" style={{ color: operatorColor }} />
                Numéro {operatorLabel} à recharger
              </h2>
              <Label htmlFor="recipient" className="text-sm text-muted-foreground mb-1 block">
                Entrez le numéro <strong>{operatorLabel}</strong> qui recevra le forfait
              </Label>
              <Input
                id="recipient"
                type="tel"
                placeholder={isMtn ? "Ex: 650 00 00 00" : "Ex: 690 00 00 00"}
                value={recipientPhone}
                onChange={e => setRecipientPhone(e.target.value)}
                className="text-base mt-1"
                style={{ borderColor: recipientPhone.replace(/\s/g,"").length >= 9 ? operatorColor : undefined }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Ce numéro recevra directement le forfait internet {operatorLabel}.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-black text-foreground mb-4 flex items-center gap-2">
                <Signal className="w-4 h-4" style={{ color: operatorColor }} />
                Récapitulatif de la commande
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Opérateur</span>
                  </div>
                  <span
                    className="text-sm font-black px-3 py-0.5 rounded-full"
                    style={{ background: isMtn ? "#FFF3CD" : "#FFE5CC", color: isMtn ? "#B8860B" : "#CC4400" }}
                  >
                    {operatorLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Numéro bénéficiaire</span>
                  </div>
                  <span className="text-sm font-black text-foreground font-mono">
                    {recipientPhone.trim() || <span className="text-muted-foreground font-normal italic">à saisir</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Forfait</span>
                  </div>
                  <span className="text-sm font-black text-foreground">
                    {bundle ? `${bundle.dataSize} — ${bundle.validity}j` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Montant à payer</span>
                  </div>
                  <span className="text-sm font-black" style={{ color: isMtn ? "#B8860B" : "#D45800" }}>
                    {bundle ? formatFCFA(bundle.price) : "—"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleValidateStep1}
              disabled={!bundle || recipientPhone.replace(/\s/g, "").length < 9}
              className="w-full py-4 rounded-2xl font-black text-base transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              style={{ background: gradient, color: operatorTextColor }}
            >
              Valider et choisir le paiement
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ===================== STEP 2 ===================== */}
        {step === 2 && (
          <>
            {processing ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${operatorColor}20` }}
                >
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: operatorColor }} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Initiation du paiement...</h3>
                <p className="text-sm text-muted-foreground">
                  Connexion à {isMtn ? "MTN Mobile Money" : "Orange Money"} en cours.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-black/10">
                      <img
                        src={isMtn ? "/logo-mtn.png" : "/logo-orange.jpg"}
                        alt={operatorLabel}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Numéro bénéficiaire</div>
                      <div className="font-black text-foreground">{recipientPhone}</div>
                    </div>
                  </div>
                  <div
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: isMtn ? "#FFF3CD" : "#FFE5CC", color: isMtn ? "#B8860B" : "#CC4400" }}
                  >
                    {operatorLabel}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
                  <h2 className="text-base font-black text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4" style={{ color: operatorColor }} />
                    Finaliser le paiement
                  </h2>

                  <div>
                    <Label className="text-sm font-semibold text-foreground mb-3 block">
                      Mode de paiement
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod("mtn_momo")}
                        className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                          paymentMethod === "mtn_momo"
                            ? "border-yellow-400 bg-yellow-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        {paymentMethod === "mtn_momo" && (
                          <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="w-10 h-10 rounded-lg overflow-hidden mb-2 border border-black/10">
                          <img src="/logo-mtn.png" alt="MTN" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-sm font-bold text-gray-900">MTN MoMo</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Mobile Money</div>
                      </button>

                      <button
                        onClick={() => setPaymentMethod("orange_money")}
                        className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                          paymentMethod === "orange_money"
                            ? "border-orange-400 bg-orange-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        {paymentMethod === "orange_money" && (
                          <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="w-10 h-10 rounded-lg overflow-hidden mb-2 border border-black/10">
                          <img src="/logo-orange.jpg" alt="Orange" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-sm font-bold text-gray-900">Orange Money</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Orange Money</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="payer-phone" className="text-sm font-semibold text-foreground mb-1 block">
                      Votre numéro de paiement
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="payer-phone"
                        type="tel"
                        placeholder={paymentMethod === "mtn_momo" ? "Ex: 650 00 00 00 (MTN)" : "Ex: 690 00 00 00 (Orange)"}
                        value={payerPhone}
                        onChange={e => setPayerPhone(e.target.value)}
                        className="pl-9 text-base"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Le numéro {paymentMethod === "mtn_momo" ? "MTN MoMo" : "Orange Money"} qui sera débité
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="payer-name" className="text-sm font-semibold text-foreground mb-1 block">
                      Nom complet
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="payer-name"
                        type="text"
                        placeholder="Ex: Jean-Pierre Kamga"
                        value={payerName}
                        onChange={e => setPayerName(e.target.value)}
                        className="pl-9 text-base"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-gray-100">
                    <span className="text-sm font-semibold text-foreground">Total à payer</span>
                    <span className="text-xl font-black" style={{ color: operatorColor }}>
                      {bundle ? formatFCFA(bundle.price) : "—"}
                    </span>
                  </div>

                  <button
                    onClick={handlePay}
                    disabled={!payerPhone.replace(/\s/g, "") || !payerName.trim() || !bundle}
                    className="w-full py-4 rounded-2xl font-black text-base transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    style={{ background: gradient, color: operatorTextColor }}
                  >
                    Payer {bundle ? formatFCFA(bundle.price) : ""}
                  </button>

                  <p className="text-xs text-center text-muted-foreground">
                    Une demande de confirmation sera envoyée sur votre téléphone via {paymentMethod === "mtn_momo" ? "MTN MoMo" : "Orange Money"}.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================== STEP 3 — SUIVI PAIEMENT ===================== */}
        {step === 3 && (
          <div className="space-y-4">

            {/* Status card */}
            {orderStatus === "processing" && (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center space-y-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: `${operatorColor}20` }}
                >
                  <Loader2 className="w-10 h-10 animate-spin" style={{ color: operatorColor }} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground mb-1">
                    Confirmez sur votre téléphone
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Une demande de paiement {isMtn ? "MTN MoMo" : "Orange Money"} a été envoyée au{" "}
                    <strong className="text-foreground font-mono">{formatPhoneDisplay(payerPhone)}</strong>.
                    <br />Validez le prompt USSD qui s'affiche sur votre écran.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  En attente de confirmation…
                </div>
              </div>
            )}

            {orderStatus === "paid" && (
              <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-8 shadow-sm text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <PartyPopper className="w-10 h-10 text-green-600" />
                </div>
                <p className="font-black text-green-700 text-xl">Paiement confirmé !</p>
                <p className="text-sm text-green-600 leading-relaxed">
                  Votre forfait <strong>{bundle?.dataSize}</strong> sera activé sur le{" "}
                  <strong className="font-mono">{recipientPhone}</strong> dans les plus brefs délais.
                </p>
                <div className="pt-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                </div>
              </div>
            )}

            {(orderStatus === "failed" || orderStatus === "cancelled") && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-8 shadow-sm text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <p className="font-black text-red-700 text-xl">Paiement échoué</p>
                <p className="text-sm text-red-600 leading-relaxed">
                  Le paiement n'a pas pu être confirmé. Vérifiez votre solde {isMtn ? "MTN MoMo" : "Orange Money"} et réessayez.
                </p>
                <button
                  onClick={handleRetry}
                  className="mt-2 px-6 py-3 rounded-xl font-bold text-sm border-2 border-red-400 text-red-600 hover:bg-red-100 transition-all"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Order summary */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-sm space-y-2">
              <div className="font-bold text-foreground mb-2">Récapitulatif</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Référence</span>
                <span className="font-mono font-semibold">#{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Forfait</span>
                <span className="font-semibold">{bundle?.dataSize} — {bundle?.operatorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bénéficiaire</span>
                <span className="font-semibold font-mono">{recipientPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payeur</span>
                <span className="font-semibold">{payerName} · {formatPhoneDisplay(payerPhone)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-black text-lg" style={{ color: operatorColor === "#FFD700" ? "#b45309" : operatorColor }}>
                  {bundle ? formatFCFA(bundle.price) : ""}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Statut</span>
                {orderStatus === "paid"
                  ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">✅ Payé</span>
                  : orderStatus === "failed" || orderStatus === "cancelled"
                  ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">❌ Échoué</span>
                  : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">⏳ En cours</span>
                }
              </div>
            </div>

            {orderStatus === "paid" && (
              <button
                onClick={() => setLocation("/commandes")}
                className="w-full py-4 rounded-2xl font-black text-base border-2 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                style={{ borderColor: operatorColor, color: operatorColor === "#FFD700" ? "#b45309" : operatorColor }}
              >
                Suivre ma commande
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            <p className="text-xs text-center text-muted-foreground pb-4">
              {orderStatus === "processing"
                ? "Une fois votre paiement confirmé, votre forfait sera activé automatiquement."
                : "Merci d'avoir utilisé Good Deal."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
