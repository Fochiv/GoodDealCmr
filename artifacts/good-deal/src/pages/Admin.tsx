import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ShoppingBag, Package, ArrowRight, LogOut, RefreshCw, Trophy, Search, ChevronLeft, ChevronRight, Store, Plus, ArrowDownCircle, Wallet, X, Shield, PlusCircle, MinusCircle, Eye } from "lucide-react";
import { formatFCFA, getStatusColor, getStatusLabel, formatDate } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { isAdminAuthenticated, setAdminAuth } from "./Ashtech";

const HIST_PAGE_SIZE = 15;
const API_BASE = "/api";

function adminHeaders(): Record<string, string> {
  return { "X-Admin-Key": localStorage.getItem("gd_admin_pass") ?? "" };
}

function AdjustBalanceModal({ merchant, onClose, onDone }: { merchant: any; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [type, setType] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { toast({ title: "Montant invalide", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/merchants/${merchant.id}/balance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ type, amount: amt, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Erreur", variant: "destructive" });
      } else {
        toast({
          title: type === "add"
            ? `+${formatFCFA(amt)} ajouté au solde de ${merchant.name}`
            : `-${formatFCFA(amt)} déduit du solde de ${merchant.name}`,
        });
        onDone();
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
            <h2 className="font-black text-lg">Ajuster le solde</h2>
            <p className="text-xs text-muted-foreground">{merchant.name} · Solde actuel : <strong>{formatFCFA(merchant.balance)}</strong></p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setType("add")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
              type === "add" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Ajouter
          </button>
          <button
            type="button"
            onClick={() => setType("subtract")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
              type === "subtract" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <MinusCircle className="w-4 h-4" /> Réduire
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Montant (FCFA)</Label>
            <Input
              type="number"
              placeholder="Ex: 5000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min={1}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note (optionnel)</Label>
            <Input
              type="text"
              placeholder="Ex: Correction manuelle, bonus..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {amount && parseInt(amount) > 0 && (
            <div className={`text-sm font-semibold p-3 rounded-xl ${type === "add" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              Nouveau solde : {formatFCFA(
                type === "add"
                  ? merchant.balance + parseInt(amount)
                  : Math.max(0, merchant.balance - parseInt(amount))
              )}
            </div>
          )}

          <Button
            type="submit"
            className={`w-full font-bold text-white ${type === "add" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
            disabled={!amount || loading}
          >
            {loading ? "En cours..." : type === "add" ? `Ajouter ${amount ? formatFCFA(parseInt(amount) || 0) : ""}` : `Déduire ${amount ? formatFCFA(parseInt(amount) || 0) : ""}`}
          </Button>
        </form>
      </div>
    </div>
  );
}

function CreateMerchantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/merchants`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ name, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Erreur", variant: "destructive" });
      } else {
        toast({ title: `Marchand créé — Code: ${data.referralCode}` });
        onCreated();
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
          <h2 className="font-black text-lg">Créer un marchand</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nom du marchand</Label>
            <Input placeholder="Jean Dupont" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Numéro de téléphone</Label>
            <Input type="tel" placeholder="6XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mot de passe</Label>
            <Input type="text" placeholder="Mot de passe du compte" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white" disabled={!name || !phone || !password || loading}>
            {loading ? "Création..." : "Créer le compte"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function AdminDepositModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount);
    if (!amt || amt < 100) { toast({ title: "Montant minimum : 100 FCFA", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ amount: amt, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Erreur", variant: "destructive" });
      } else {
        toast({ title: `${formatFCFA(amt)} ajouté au solde disponible` });
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <PlusCircle className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="font-black text-lg">Ajouter des fonds</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Crédite directement ton solde admin (dépôt externe, virement, recette manuelle…)
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Montant (FCFA)</Label>
            <Input
              type="number"
              placeholder="Ex: 50 000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min={100}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note (optionnel)</Label>
            <Input
              type="text"
              placeholder="Ex: Virement OrangeMoney, recette journée..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          {amount && parseInt(amount) >= 100 && (
            <div className="text-sm font-semibold p-3 rounded-xl bg-green-50 text-green-700">
              +{formatFCFA(parseInt(amount))} seront ajoutés à ton solde disponible
            </div>
          )}
          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
            disabled={!amount || parseInt(amount) < 100 || loading}
          >
            {loading ? "En cours..." : `Ajouter ${amount ? formatFCFA(parseInt(amount) || 0) : ""}`}
          </Button>
        </form>
      </div>
    </div>
  );
}

function AdminManualWithdrawModal({ onClose, onSuccess, availableBalance }: { onClose: () => void; onSuccess: () => void; availableBalance: number }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount);
    if (!amt || amt < 100) { toast({ title: "Montant minimum : 100 FCFA", variant: "destructive" }); return; }
    if (amt > availableBalance) { toast({ title: `Solde insuffisant (${formatFCFA(availableBalance)} disponible)`, variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/manual-withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ amount: amt, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Erreur", variant: "destructive" });
      } else {
        toast({ title: `${formatFCFA(amt)} retirés du solde` });
        onSuccess();
        onClose();
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const amt = parseInt(amount) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <ArrowDownCircle className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="font-black text-lg">Retirer des fonds</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="text-xs text-muted-foreground mb-4 flex items-center justify-between">
          <span>Soustraction directe du solde admin</span>
          <span className="font-bold text-foreground">Dispo : {formatFCFA(availableBalance)}</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Montant (FCFA)</Label>
            <Input
              type="number"
              placeholder="Ex: 20 000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min={100}
              max={availableBalance}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note (optionnel)</Label>
            <Input
              type="text"
              placeholder="Ex: Retrait espèces, paiement fournisseur..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          {amt >= 100 && amt <= availableBalance && (
            <div className="text-sm font-semibold p-3 rounded-xl bg-red-50 text-red-700">
              -{formatFCFA(amt)} seront déduits · Solde restant : {formatFCFA(availableBalance - amt)}
            </div>
          )}
          {amt > availableBalance && (
            <div className="text-sm font-semibold p-3 rounded-xl bg-orange-50 text-orange-700">
              Montant supérieur au solde disponible ({formatFCFA(availableBalance)})
            </div>
          )}
          <Button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
            disabled={!amount || amt < 100 || amt > availableBalance || loading}
          >
            {loading ? "En cours..." : `Retirer ${amt >= 100 ? formatFCFA(amt) : ""}`}
          </Button>
        </form>
      </div>
    </div>
  );
}

type AdminWithdrawStep = "operator" | "details";

function AdminWithdrawModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<AdminWithdrawStep>("operator");
  const [operator, setOperator] = useState<"mtn" | "orange" | null>(null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount);
    if (!amt || amt < 100) { toast({ title: "Montant invalide", variant: "destructive" }); return; }
    if (!phone.trim()) { toast({ title: "Numéro de téléphone requis", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ amount: amt, operator, withdrawalPhone: phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Erreur", variant: "destructive" });
      } else {
        toast({ title: `Retrait de ${formatFCFA(amt)} enregistré` });
        onSuccess();
        onClose();
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const opColor = operator === "mtn" ? "#FFD700" : "#FF6600";
  const opLabel = operator === "mtn" ? "MTN MoMo" : "Orange Money";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            <h2 className="font-black text-lg">Retrait admin</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {step === "operator" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground mb-4">Choisissez l'opérateur Mobile Money</p>
            <button
              onClick={() => { setOperator("mtn"); setStep("details"); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-black text-sm flex-shrink-0" style={{ background: "#FFD700" }}>MTN</div>
              <div className="text-left">
                <div className="font-bold text-sm">MTN Mobile Money</div>
                <div className="text-xs text-muted-foreground">Retrait via MoMo</div>
              </div>
            </button>
            <button
              onClick={() => { setOperator("orange"); setStep("details"); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0" style={{ background: "#FF6600" }}>ORG</div>
              <div className="text-left">
                <div className="font-bold text-sm">Orange Money</div>
                <div className="text-xs text-muted-foreground">Retrait via Orange Money</div>
              </div>
            </button>
          </div>
        )}

        {step === "details" && operator && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("operator")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Changer d'opérateur
            </button>
            <div
              className="flex items-center gap-3 p-3 rounded-xl border-2"
              style={{ borderColor: opColor, background: opColor + "15" }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0"
                style={{ background: opColor, color: operator === "mtn" ? "#000" : "#fff" }}>
                {operator === "mtn" ? "MTN" : "ORG"}
              </div>
              <div>
                <div className="font-bold text-sm">{opLabel}</div>
                <div className="text-xs text-muted-foreground">Opérateur sélectionné</div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Montant (FCFA)</Label>
              <Input type="number" placeholder="Ex: 50000" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Numéro {opLabel}</Label>
              <Input type="tel" placeholder="6XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <Button type="submit" className="w-full text-white font-bold"
              style={{ background: `linear-gradient(135deg, ${opColor}, ${opColor}cc)`, color: operator === "mtn" ? "#000" : "#fff" }}
              disabled={!amount || !phone || loading}>
              {loading ? "Envoi..." : "Confirmer le retrait"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isAdmin = isAdminAuthenticated();

  const [revenue, setRevenue] = useState<any>(null);
  const [revLoading, setRevLoading] = useState(true);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [popular, setPopular] = useState<any[]>([]);
  const [popLoading, setPopLoading] = useState(true);

  // History (full orders list)
  const [histOrders, setHistOrders] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histSearch, setHistSearch] = useState("");
  const [histPage, setHistPage] = useState(1);

  // Merchants
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [showCreateMerchant, setShowCreateMerchant] = useState(false);
  const [showAdminWithdraw, setShowAdminWithdraw] = useState(false);
  const [showAdminDeposit, setShowAdminDeposit] = useState(false);
  const [showAdminManualWithdraw, setShowAdminManualWithdraw] = useState(false);
  const [adjustMerchant, setAdjustMerchant] = useState<any | null>(null);

  useEffect(() => {
    if (!isAdmin) setLocation("/ashtech");
  }, [isAdmin]);

  const fetchAll = useCallback(async () => {
    if (!isAdmin) return;
    setRevLoading(true); setOrdersLoading(true); setPopLoading(true); setHistLoading(true);
    setMerchantsLoading(true); setWithdrawalsLoading(true);
    const h = adminHeaders();
    const [revRes, ordRes, popRes, histRes, merchantsRes, withdrawalsRes] = await Promise.all([
      fetch("/api/stats/revenue", { headers: h }),
      fetch("/api/stats/orders", { headers: h }),
      fetch("/api/stats/popular-bundles", { headers: h }),
      fetch("/api/orders", { headers: h }),
      fetch("/api/admin/merchants", { headers: h }),
      fetch("/api/admin/withdrawals", { headers: h }),
    ]);
    if (revRes.ok)  { setRevenue(await revRes.json()); }
    setRevLoading(false);
    if (ordRes.ok)  { setOrderStats(await ordRes.json()); }
    setOrdersLoading(false);
    if (popRes.ok)  { setPopular(await popRes.json()); }
    setPopLoading(false);
    if (histRes.ok) { setHistOrders(await histRes.json()); }
    setHistLoading(false);
    if (merchantsRes.ok) { setMerchants(await merchantsRes.json()); }
    setMerchantsLoading(false);
    if (withdrawalsRes.ok) { setWithdrawals(await withdrawalsRes.json()); }
    setWithdrawalsLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh toutes les 30 secondes pour afficher les nouveaux paiements
  useEffect(() => {
    const interval = setInterval(() => { fetchAll(); }, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (!isAdmin) return null;

  const chartData = revenue?.revenueByOperator.map((r: { operatorName: string; revenue: number }) => ({
    name: r.operatorName,
    revenue: r.revenue,
  })) ?? [];

  const handleLogout = () => {
    setAdminAuth(false);
    setLocation("/ashtech");
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <h1 className="text-lg font-black text-foreground leading-tight">Tableau de bord</h1>
              <p className="text-muted-foreground text-xs">Good Deal — admin</p>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-3">
              <Button variant="outline" size="sm" onClick={fetchAll} className="text-blue-600 border-blue-200 hover:bg-blue-50 w-9 h-9 p-0">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50 w-9 h-9 p-0">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* Nav grid — 2×2 on mobile, single row on desktop */}
          <div className="grid grid-cols-2 sm:flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/bundles")} className="justify-start sm:justify-center">📦 Forfaits</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/orders")} className="justify-start sm:justify-center">🧾 Commandes</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/users")} className="justify-start sm:justify-center">👥 Utilisateurs</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/reviews")} className="justify-start sm:justify-center">⭐ Avis</Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/ashtech/settings")} className="justify-start sm:justify-center">⚙️ Paramètres</Button>
            <Button variant="outline" size="sm" disabled title="Les retraits Mobile Money sont temporairement suspendus" className="justify-start sm:justify-center">
              <ArrowDownCircle className="w-4 h-4 mr-1" /> Retraits suspendus
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Les retraits Mobile Money sont suspendus jusqu’à la disponibilité d’une API de virement sortant AshTech.
          </p>
        </div>

        {/* Solde disponible — carte principale */}
        {revLoading ? (
          <Skeleton className="h-24 rounded-2xl mb-4" />
        ) : (
          <div className="rounded-2xl p-5 mb-4 shadow-sm border border-white/20"
            style={{
              background: revenue && revenue.availableBalance < 0
                ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                : "linear-gradient(135deg, #16a34a, #15803d)"
            }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <div className="text-xs font-bold text-white/70 uppercase tracking-wide mb-1">
                  {revenue && revenue.availableBalance < 0 ? "⚠️ Déficit — Solde négatif" : "Solde disponible"}
                </div>
                <div className="text-3xl font-black text-white">
                  {revenue ? formatFCFA(Math.max(0, revenue.availableBalance)) : "—"}
                </div>
                {revenue && revenue.availableBalance < 0 && (
                  <div className="text-xs text-white/90 mt-1 font-semibold">
                    Déficit réel : {formatFCFA(revenue.availableBalance)} — Ajoutez {formatFCFA(-revenue.availableBalance)} pour remettre à zéro
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAdminDeposit(true)}
                className="flex-1 font-bold gap-2"
                style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
              >
                <PlusCircle className="w-4 h-4" /> Ajouter des fonds
              </Button>
              <Button
                onClick={() => setShowAdminManualWithdraw(true)}
                className="flex-1 font-bold gap-2"
                disabled={!revenue || revenue.availableBalance <= 0}
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
              >
                <ArrowDownCircle className="w-4 h-4" /> Retirer
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Revenus bruts", value: revenue ? formatFCFA(revenue.totalRevenue) : "—", sub: `${revenue?.paidOrders ?? "—"} paiements`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", loading: revLoading },
            { label: "Paiements en attente", value: revenue ? formatFCFA(revenue.pendingRevenue) : "—", sub: `${orderStats?.pending ?? "—"} commandes`, icon: ShoppingBag, color: "text-yellow-600", bg: "bg-yellow-50", loading: revLoading || ordersLoading },
            { label: "Commandes totales", value: orderStats?.total ?? "—", sub: null, icon: Package, color: "text-blue-600", bg: "bg-blue-50", loading: ordersLoading },
            { label: "Échouées", value: orderStats?.failed ?? "—", sub: null, icon: ShoppingBag, color: "text-red-500", bg: "bg-red-50", loading: ordersLoading },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              {stat.loading ? (
                <Skeleton className="h-16" />
              ) : (
                <>
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="text-xl font-black text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                  {stat.sub && <div className="text-xs font-semibold text-muted-foreground mt-1">{stat.sub}</div>}
                </>
              )}
            </div>
          ))}
        </div>

        {/* ── Gains via marchands ──────────────────────────────────────────── */}
        {!revLoading && revenue && (revenue.merchantOrdersCount > 0 || revenue.merchantOrdersRevenue > 0) && (
          <div className="rounded-2xl border border-purple-100 bg-white shadow-sm mb-6 overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-purple-50">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-sm">Ventes via marchands</h2>
                <p className="text-xs text-muted-foreground">{revenue.merchantOrdersCount} commande{revenue.merchantOrdersCount !== 1 ? "s" : ""} passées via lien de parrainage</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-muted-foreground">Chiffre d'affaires</div>
                <div className="font-black text-base text-foreground">{formatFCFA(revenue.merchantOrdersRevenue)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-purple-50">
              <div className="px-5 py-4">
                <div className="text-xs text-muted-foreground mb-1">Ma part (50%)</div>
                <div className="text-xl font-black text-purple-700">{formatFCFA(revenue.adminMerchantShare)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Revenus nets admin sur ventes marchands</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-xs text-muted-foreground mb-1">Commissions marchands (50%)</div>
                <div className="text-xl font-black text-orange-500">{formatFCFA(revenue.merchantCommissionsTotal)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Versés aux marchands partenaires</div>
              </div>
            </div>
          </div>
        )}
        {!revLoading && revenue && revenue.merchantOrdersCount === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mb-6 px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Store className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">Ventes via marchands</div>
              <div className="text-xs text-muted-foreground">Aucune vente via lien marchand pour l'instant</div>
            </div>
          </div>
        )}

        {/* Top forfait */}
        <div className="mb-6">
          {popLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : popular[0] ? (() => {
            const top = popular[0];
            return (
              <div
                className="rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-white/20"
                style={{ background: `linear-gradient(135deg, ${top.bundle?.operatorColor ?? "#888"}dd, ${top.bundle?.operatorColor ?? "#888"}99)` }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white/70 uppercase tracking-wide mb-0.5">Forfait le plus vendu</div>
                  <div className="text-xl font-black text-white leading-tight">{top.bundle?.dataSize}</div>
                  <div className="text-sm text-white/80">{top.bundle?.operatorName} · {top.bundle?.name}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-black text-white">{top.totalOrders}</div>
                  <div className="text-xs text-white/70">commande{top.totalOrders > 1 ? "s" : ""}</div>
                  <div className="text-sm font-bold text-white/90 mt-0.5">{formatFCFA(top.totalRevenue)}</div>
                </div>
              </div>
            );
          })() : null}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue chart */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-foreground mb-4">Revenus par opérateur</h2>
            {revLoading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                  <Tooltip
                    formatter={(v: number) => [formatFCFA(v), "Revenus"]}
                    contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Order statuses */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-foreground mb-4">Statut des commandes</h2>
            {ordersLoading ? <Skeleton className="h-48" /> : orderStats ? (
              <div className="space-y-3">
                {[
                  { label: "Payées", value: orderStats.paid, color: "bg-green-500" },
                  { label: "En attente", value: orderStats.pending, color: "bg-yellow-500" },
                  { label: "Échouées", value: orderStats.failed, color: "bg-red-500" },
                  { label: "Annulées", value: orderStats.cancelled, color: "bg-gray-400" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                    <div className="flex-1 text-sm text-foreground">{item.label}</div>
                    <div className="font-bold text-sm">{item.value}</div>
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${item.color}`}
                        style={{ width: orderStats.total > 0 ? `${(item.value / orderStats.total) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Popular bundles */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm mb-6">
          <h2 className="font-bold text-foreground mb-4">Forfaits populaires</h2>
          {popLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="space-y-2">
              {popular?.slice(0, 5).map((item, i) => (
                <div key={item.bundle?.id ?? i} className="flex items-center gap-3 py-2">
                  <div className="text-muted-foreground font-bold text-sm w-5">{i + 1}</div>
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                    style={{ background: item.bundle?.operatorColor ?? "#888" }}
                  >
                    {(item.bundle?.operatorName ?? "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{item.bundle?.dataSize} — {item.bundle?.operatorName}</div>
                    <div className="text-xs text-muted-foreground">{item.bundle?.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm">{item.totalOrders} cmd.</div>
                    <div className="text-xs text-primary">{formatFCFA(item.totalRevenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full order history */}
        {(() => {
          const q = histSearch.trim().toLowerCase();
          const filtered = histOrders.filter(o =>
            !q || o.phoneNumber?.includes(q) ||
            (o.payerName ?? "").toLowerCase().includes(q) ||
            (o.transactionId ?? "").toLowerCase().includes(q) ||
            String(o.id).includes(q)
          );
          const totalPages = Math.max(1, Math.ceil(filtered.length / HIST_PAGE_SIZE));
          const safePage   = Math.min(histPage, totalPages);
          const paginated  = filtered.slice((safePage - 1) * HIST_PAGE_SIZE, safePage * HIST_PAGE_SIZE);

          return (
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="flex items-center justify-between flex-1">
                  <h2 className="font-bold text-foreground">Historique des commandes</h2>
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/ashtech/orders")} className="gap-1 text-xs">
                    Gérer <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
                {/* Search */}
                <div className="relative sm:w-52 flex-shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={histSearch}
                    onChange={e => { setHistSearch(e.target.value); setHistPage(1); }}
                    placeholder="Numéro, nom, ID…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* List */}
              {histLoading ? (
                <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {q ? `Aucun résultat pour "${q}"` : "Aucune commande"}
                </p>
              ) : (
                <>
                  <div className="space-y-0 divide-y divide-gray-100">
                    {paginated.map(order => (
                      <div key={order.id} className="flex items-center gap-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {order.bundle?.dataSize ?? "—"} — {order.bundle?.operatorName ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            📱 {order.phoneNumber}
                            {order.payerName ? ` · ${order.payerName}` : ""}
                            {" · "}{formatDate(order.createdAt)}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm">{formatFCFA(order.totalAmount)}</div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {filtered.length > HIST_PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <span className="text-xs text-muted-foreground">
                        {(safePage - 1) * HIST_PAGE_SIZE + 1}–{Math.min(safePage * HIST_PAGE_SIZE, filtered.length)} sur {filtered.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setHistPage(p => Math.max(1, p - 1))}
                          disabled={safePage === 1}
                          className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-muted-foreground hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                          .reduce<(number | "…")[]>((acc, p, i, arr) => {
                            if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, i) =>
                            p === "…" ? (
                              <span key={`e-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">…</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setHistPage(p as number)}
                                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                  safePage === p
                                    ? "bg-gray-900 text-white"
                                    : "border border-gray-200 text-muted-foreground hover:bg-gray-50"
                                }`}
                              >
                                {p}
                              </button>
                            )
                          )}
                        <button
                          onClick={() => setHistPage(p => Math.min(totalPages, p + 1))}
                          disabled={safePage === totalPages}
                          className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-muted-foreground hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* ── Marchands ─────────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-foreground">Marchands</h2>
            </div>
            <Button size="sm" onClick={() => setShowCreateMerchant(true)} className="bg-gray-900 hover:bg-gray-800 text-white gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> Créer
            </Button>
          </div>
          {merchantsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : merchants.length === 0 ? (
            <div className="text-center py-8">
              <Store className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">Aucun marchand — créez le premier</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {merchants.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #FF6600, #FF6600)" }}>
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{m.name}</div>
                    <div className="text-xs text-muted-foreground">📱 {m.phone} · Code: <span className="font-mono font-bold text-orange-600">{m.referralCode}</span></div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-sm text-green-600">{formatFCFA(m.balance)}</div>
                      <div className="text-xs text-muted-foreground">solde</div>
                    </div>
                    <button
                      onClick={() => setLocation(`/ashtech/marchands/${m.id}`)}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-all"
                      title="Voir les transactions"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAdjustMerchant(m)}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-orange-100 hover:text-orange-600 flex items-center justify-center transition-all"
                      title="Ajuster le solde"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Historique des retraits (marchands + admin) ────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm mt-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-foreground">Historique des retraits</h2>
            <span className="ml-auto text-xs text-muted-foreground">{withdrawals.length} demande{withdrawals.length !== 1 ? "s" : ""}</span>
          </div>
          {withdrawalsLoading ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-8">
              <ArrowDownCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">Aucune demande de retrait</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {withdrawals.map((w: any) => {
                const opColor = w.operator === "mtn" ? "#FFD700" : "#FF6600";
                const opLabel = w.operator === "mtn" ? "MTN MoMo" : "Orange Money";
                const who = w.isAdmin ? "Admin" : (w.merchant?.name ?? `Marchand #${w.merchantId}`);
                return (
                  <div key={w.id} className="flex items-center gap-3 py-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0"
                      style={{ background: opColor, color: w.operator === "mtn" ? "#000" : "#fff" }}
                    >
                      {w.operator === "mtn" ? "MTN" : "ORG"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{who}</span>
                        {w.isAdmin && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-900 text-white font-bold">ADMIN</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {opLabel} · 📱 {w.withdrawalPhone} · {formatDate(w.createdAt)}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-sm">{formatFCFA(w.amount)}</div>
                      <div className="flex gap-1 justify-end mt-1">
                        {w.status === "pending" || w.status === "processing" ? (
                          <>
                            <button
                              onClick={async () => {
                                await fetch(`${API_BASE}/admin/withdrawals/${w.id}/status`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json", ...adminHeaders() },
                                  body: JSON.stringify({ status: "paid" }),
                                });
                                fetchAll();
                              }}
                              className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold hover:bg-green-200"
                            >Payé</button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Annuler ce retrait de ${formatFCFA(w.amount)} ?`)) return;
                                await fetch(`${API_BASE}/admin/withdrawals/${w.id}/status`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json", ...adminHeaders() },
                                  body: JSON.stringify({ status: "rejected" }),
                                });
                                fetchAll();
                              }}
                              className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold hover:bg-red-200"
                            >Annuler</button>
                          </>
                        ) : w.status === "paid" ? (
                          <div className="flex gap-1 items-center">
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">Payé</span>
                            {w.isAdmin && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Annuler ce retrait de ${formatFCFA(w.amount)} ? Le montant sera recrédité sur le solde.`)) return;
                                  await fetch(`${API_BASE}/admin/withdrawals/${w.id}/status`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json", ...adminHeaders() },
                                    body: JSON.stringify({ status: "rejected" }),
                                  });
                                  fetchAll();
                                }}
                                className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold hover:bg-orange-200"
                              >Annuler</button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">
                            {w.status === "rejected" ? "Annulé" : w.status === "failed" ? "Échoué" : w.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateMerchant && <CreateMerchantModal onClose={() => setShowCreateMerchant(false)} onCreated={fetchAll} />}
      {showAdminWithdraw && <AdminWithdrawModal onClose={() => setShowAdminWithdraw(false)} onSuccess={fetchAll} />}
      {showAdminDeposit && <AdminDepositModal onClose={() => setShowAdminDeposit(false)} onSuccess={fetchAll} />}
      {showAdminManualWithdraw && (
        <AdminManualWithdrawModal
          onClose={() => setShowAdminManualWithdraw(false)}
          onSuccess={fetchAll}
          availableBalance={revenue?.availableBalance ?? 0}
        />
      )}
      {adjustMerchant && <AdjustBalanceModal merchant={adjustMerchant} onClose={() => setAdjustMerchant(null)} onDone={fetchAll} />}
    </div>
  );
}
