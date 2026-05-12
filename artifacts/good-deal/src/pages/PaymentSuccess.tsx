import { useLocation } from "wouter";
import { CheckCircle, Copy, Home, History, Download } from "lucide-react";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { formatFCFA, formatDate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 px-4 flex items-center">
      <div className="max-w-md mx-auto w-full">
        {/* Success icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">Paiement réussi !</h1>
          <p className="text-muted-foreground">Votre forfait internet a été activé avec succès.</p>
        </div>

        {/* Receipt */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-6" data-testid="receipt">
          <div className="bg-green-500 px-6 py-4">
            <div className="text-white text-sm font-semibold">Reçu de transaction</div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Forfait</span>
              <span className="text-sm font-semibold text-foreground">{order?.bundle?.dataSize ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Opérateur</span>
              <span className="text-sm font-semibold text-foreground">{order?.bundle?.operatorName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Numéro rechargé</span>
              <span className="text-sm font-semibold text-foreground">{phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Montant payé</span>
              <span className="text-sm font-black text-primary">{formatFCFA(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Validité</span>
              <span className="text-sm font-semibold text-foreground">{order?.bundle?.validity ?? "—"} jours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-semibold text-foreground">
                {order?.createdAt ? formatDate(order.createdAt) : new Intl.DateTimeFormat("fr-FR").format(new Date())}
              </span>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground mb-1">ID de transaction</div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate" data-testid="text-transaction-id">
                  {txnId}
                </code>
                <button onClick={copyTxn} className="p-1.5 rounded hover:bg-muted transition-colors" data-testid="button-copy-txn">
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setLocation("/")} className="gap-2" data-testid="button-go-home">
            <Home className="w-4 h-4" />
            Accueil
          </Button>
          <Button onClick={() => setLocation("/dashboard")} className="gap-2" data-testid="button-view-history">
            <History className="w-4 h-4" />
            Mon historique
          </Button>
        </div>
      </div>
    </div>
  );
}
