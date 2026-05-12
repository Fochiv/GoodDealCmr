import { useLocation, Link } from "wouter";
import { Wifi } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur d'inscription");
      }
      const data = await res.json();
      login(data.token, data.user);
      toast({ title: "Compte créé !", description: `Bienvenue ${data.user.name} !` });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Wifi className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-foreground">Créer un compte</h1>
          <p className="text-muted-foreground mt-1">Rejoignez Good Deal et achetez vos forfaits</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom complet</Label>
              <Input id="name" name="name" placeholder="Jean Mbarga" value={form.name} onChange={handleChange} required data-testid="input-name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse email</Label>
              <Input id="email" name="email" type="email" placeholder="vous@example.com" value={form.email} onChange={handleChange} required data-testid="input-email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+237 6XX XXX XXX" value={form.phone} onChange={handleChange} required data-testid="input-phone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" placeholder="Min. 6 caractères" value={form.password} onChange={handleChange} required minLength={6} data-testid="input-password" />
            </div>

            <Button type="submit" className="w-full" disabled={loading} data-testid="button-register">
              {loading ? "Création..." : "Créer mon compte"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
