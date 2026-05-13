import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Store, Copy, LogOut, TrendingUp, ShoppingBag, Wallet,
  ArrowDownCircle, Check, RefreshCw, Link2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFCFA, formatDate, getStatusColor, getStatusLabel } from "@/lib/api";
import { getMerchantToken, clearMerchantSession } from "./MarchandLogin";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function merchantHeaders(): Record<string, string> {
  return { "x-merchant-token": getMerchantToken() ?? "" };
}

function WithdrawModal({ balance, onClose, onSuccess }: { balance: number; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount);
    if (!amt || amt < 500) {
      toast({ title: "Montant minimum: 500 FCFA", variant: "destructive" });
      return;
    }
    if (amt > balance) {
      toast({ title: "Solde insuffisant", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/merchant/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...merchantHeaders() },
        body: JSON.stringify({ amount: amt, withdrawalPhone: phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Erreur", variant: "destructive" });
      } else {
        toast({ title: "Demande de retrait envoyée !" });
        onSuccess();
        onClose();
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-black text-lg">Demande de retrait</h2>
            <p className="text-xs text-muted-foreground">Solde disponible: <strong>{formatFCFA(balance)}</strong></p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Montant (FCFA)</Label>
            <Input
              type="number"
              placeholder="Ex: 5000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min={500}
              max={balance}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Numéro de retrait (MoMo / Orange Money)</Label>
            <Input
              type="tel"
              placeholder="6XX XXX XXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full text-white font-bold"
            style={{ background: "linear-gradient(135deg, #FF6B00, #FF3D00)" }}
            disabled={!amount || !phone || loading}
          >
            {loading ? "Envoi en cours..." : "Confirmer le retrait"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function MarchandDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    const token = getMerchantToken();
    if (!token) { setLocation("/marchand"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/merchant/me`, { headers: merchantHeaders() });
      if (res.status === 401) { clearMerchantSession(); setLocation("/marchand"); return; }
      const json = await res.json();
      setData(json);
    } catch {
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const referralLink = data ? `${window.location.origin}/?ref=${data.referralCode}` : "";

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Lien copié !" });
    });
  };

  const handleLogout = () => {
    clearMerchantSession();
    setLocation("/marchand");
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gray-50">
      {showWithdraw && data && (
        <WithdrawModal
          balance={data.balance}
          onClose={() => setShowWithdraw(false)}
          onSuccess={fetchData}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF6B00, #FF3D00)" }}>
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-foreground leading-tight">
                {loading ? "Chargement..." : data?.name}
              </h1>
              <p className="text-xs text-muted-foreground">Espace marchand · Good Deal</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} className="w-9 h-9 p-0">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50 w-9 h-9 p-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            {
              label: "Solde disponible",
              value: loading ? null : formatFCFA(data?.balance ?? 0),
              icon: Wallet,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "Commissions gagnées",
              value: loading ? null : formatFCFA(data?.stats?.totalEarnings ?? 0),
              icon: TrendingUp,
              color: "text-orange-600",
              bg: "bg-orange-50",
            },
            {
              label: "Commandes via lien",
              value: loading ? null : String(data?.stats?.totalOrders ?? 0),
              icon: ShoppingBag,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Commandes payées",
              value: loading ? null : String(data?.stats?.paidOrders ?? 0),
              icon: Users,
              color: "text-purple-600",
              bg: "bg-purple-50",
            },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              {loading ? <Skeleton className="h-14" /> : (
                <>
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="text-lg font-black text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Balance + Withdraw */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Solde à retirer</p>
              <p className="text-3xl font-black text-foreground">
                {loading ? <Skeleton className="h-9 w-32 inline-block" /> : formatFCFA(data?.balance ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Commission: 50% de chaque vente</p>
            </div>
            <Button
              onClick={() => setShowWithdraw(true)}
              className="text-white font-bold gap-2"
              style={{ background: "linear-gradient(135deg, #FF6B00, #FF3D00)" }}
              disabled={loading || (data?.balance ?? 0) < 500}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Retrait
            </Button>
          </div>
        </div>

        {/* Referral link */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Mon lien de parrainage</h2>
          </div>
          {loading ? <Skeleton className="h-12" /> : (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 font-mono text-xs text-gray-700 break-all">
                {referralLink}
              </div>
              <Button
                onClick={copyLink}
                variant="outline"
                className="w-full gap-2 font-semibold"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Lien copié !" : "Copier le lien"}
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Partagez ce lien — vous gagnez <strong>50%</strong> de chaque achat effectué via votre lien
              </p>
            </>
          )}
        </div>

        {/* Recent orders */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-foreground mb-4">Commandes récentes via mon lien</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : !data?.recentOrders?.length ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">Aucune commande pour l'instant</p>
              <p className="text-xs text-muted-foreground mt-1">Partagez votre lien pour commencer à gagner</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">Commande #{order.id}</div>
                    <div className="text-xs text-muted-foreground">
                      📱 {order.phoneNumber} · {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm">{formatFCFA(order.totalAmount)}</div>
                    {order.status === "paid" && (
                      <div className="text-xs text-green-600 font-semibold">
                        +{formatFCFA(Math.floor(order.totalAmount * 0.5))}
                      </div>
                    )}
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
