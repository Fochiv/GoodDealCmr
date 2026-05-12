import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save, LogOut, Settings, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { isAdminAuthenticated, setAdminAuth } from "./Ashtech";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error("Erreur chargement paramètres");
  return res.json();
}

async function updateSetting(key: string, value: string): Promise<void> {
  const res = await fetch(`${API_BASE}/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("Erreur mise à jour");
}

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const isAdmin = isAdminAuthenticated();
  const { toast } = useToast();

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) { setLocation("/ashtech"); return; }
    fetchSettings()
      .then(s => { setWhatsappNumber(s.whatsapp_number ?? ""); })
      .catch(() => toast({ title: "Impossible de charger les paramètres", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return null;

  const handleSave = async () => {
    const clean = whatsappNumber.replace(/\D/g, "");
    if (clean.length < 8) {
      toast({ title: "Numéro invalide (min. 8 chiffres)", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateSetting("whatsapp_number", clean);
      setWhatsappNumber(clean);
      toast({ title: "Paramètres enregistrés" });
    } catch {
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const preview = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=Bonjour+Good+Deal`
    : null;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation("/ashtech/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6" /> Paramètres
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configuration générale de l'application</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setAdminAuth(false); setLocation("/ashtech"); }} className="text-red-500">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-foreground mb-1 flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-600" /> Service client WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Numéro WhatsApp affiché aux clients pour le support. Inclure l'indicatif pays (ex. : 237 pour le Cameroun).
          </p>

          {loading ? (
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">Numéro WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={whatsappNumber}
                  onChange={e => setWhatsappNumber(e.target.value)}
                  placeholder="237650000000"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Chiffres uniquement, sans espaces ni tirets. Ex. : 237650123456</p>
              </div>

              {preview && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-800">
                  <span className="font-semibold">Aperçu du lien :</span>{" "}
                  <a href={preview} target="_blank" rel="noopener noreferrer" className="underline break-all">
                    {preview}
                  </a>
                </div>
              )}

              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
