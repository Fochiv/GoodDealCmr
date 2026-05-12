import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Shield, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ADMIN_PASSWORD = "Apashash28@";
const ADMIN_KEY = "gd_admin";

export function isAdminAuthenticated(): boolean {
  return localStorage.getItem(ADMIN_KEY) === "true";
}

export function setAdminAuth(value: boolean) {
  if (value) localStorage.setItem(ADMIN_KEY, "true");
  else localStorage.removeItem(ADMIN_KEY);
}

export default function Ashtech() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already authenticated, go to admin dashboard
  useEffect(() => {
    if (isAdminAuthenticated()) {
      setLocation("/ashtech/dashboard");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (password === ADMIN_PASSWORD) {
      setAdminAuth(true);
      toast({ title: "Accès administrateur accordé" });
      setLocation("/ashtech/dashboard");
    } else {
      toast({ title: "Mot de passe incorrect", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-black text-foreground">Espace administrateur</h1>
          <p className="text-sm text-muted-foreground mt-1">Accès restreint — Good Deal</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="flex items-center gap-2 font-semibold">
                <Lock className="w-4 h-4" />
                Mot de passe administrateur
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10"
                  autoFocus
                  data-testid="input-admin-password"
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
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              disabled={!password || loading}
              data-testid="button-admin-login"
            >
              {loading ? "Vérification..." : "Accéder au panneau"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
