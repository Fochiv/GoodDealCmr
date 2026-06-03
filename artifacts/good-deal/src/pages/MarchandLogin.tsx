import { useState } from "react";
import { useLocation } from "wouter";
import { Store, Eye, EyeOff, Phone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export function getMerchantToken(): string | null {
  return localStorage.getItem("gd_merchant_token");
}

export function getMerchantData(): any | null {
  try {
    const raw = localStorage.getItem("gd_merchant");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setMerchantSession(token: string, merchant: any) {
  localStorage.setItem("gd_merchant_token", token);
  localStorage.setItem("gd_merchant", JSON.stringify(merchant));
}

export function clearMerchantSession() {
  localStorage.removeItem("gd_merchant_token");
  localStorage.removeItem("gd_merchant");
}

export default function MarchandLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/merchant/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Erreur de connexion", variant: "destructive" });
      } else {
        setMerchantSession(data.token, data.merchant);
        toast({ title: "Connexion réussie" });
        setLocation("/marchand/dashboard");
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #FF6600, #FF6600)" }}>
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-black text-foreground">Espace marchand</h1>
          <p className="text-sm text-muted-foreground mt-1">Connectez-vous avec vos identifiants</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="flex items-center gap-2 font-semibold">
                <Phone className="w-4 h-4" />
                Numéro de téléphone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="6XX XXX XXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="flex items-center gap-2 font-semibold">
                <Lock className="w-4 h-4" />
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full text-white font-bold"
              style={{ background: "linear-gradient(135deg, #FF6600, #FF6600)" }}
              disabled={!phone || !password || loading}
            >
              {loading ? "Connexion..." : "Accéder à mon espace"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
