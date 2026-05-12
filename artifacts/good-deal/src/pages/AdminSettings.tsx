import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save, LogOut, Settings, Phone, Wifi } from "lucide-react";
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

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0, 3) + " " + digits.slice(3);
  return digits.slice(0, 3) + " " + digits.slice(3, 6) + " " + digits.slice(6, 9);
}

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const isAdmin = isAdminAuthenticated();
  const { toast } = useToast();

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [mtnNumber, setMtnNumber] = useState("");
  const [orangeNumber, setOrangeNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) { setLocation("/ashtech"); return; }
    fetchSettings()
      .then(s => {
        setWhatsappNumber(s.whatsapp_number ?? "");
        setMtnNumber(s.good_deal_mtn_number ?? "");
        setOrangeNumber(s.good_deal_orange_number ?? "");
      })
      .catch(() => toast({ title: "Impossible de charger les paramètres", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return null;

  const handleSave = async (key: string, value: string, label: string, minLen = 8) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length < minLen) {
      toast({ title: `Numéro invalide (min. ${minLen} chiffres)`, variant: "destructive" });
      return;
    }
    setSaving(key);
    try {
      await updateSetting(key, clean);
      if (key === "whatsapp_number") setWhatsappNumber(clean);
      if (key === "good_deal_mtn_number") setMtnNumber(clean);
      if (key === "good_deal_orange_number") setOrangeNumber(clean);
      toast({ title: `${label} enregistré` });
    } catch {
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const whatsappPreview = whatsappNumber
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

        <div className="space-y-5">
          {/* Good Deal MTN number */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-foreground mb-1 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-yellow-500" /> Numéro MTN Good Deal
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Numéro MTN MoMo où les clients envoient leur paiement. Affiché à l'étape 3 du checkout.
            </p>
            {loading ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mtn-number">Numéro MTN MoMo</Label>
                  <Input
                    id="mtn-number"
                    type="tel"
                    value={mtnNumber}
                    onChange={e => setMtnNumber(e.target.value)}
                    placeholder="650000000"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Chiffres uniquement. Ex. : 650123456 — Affiché : {formatPhoneDisplay(mtnNumber || "650000000")}
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-sm text-yellow-800 font-mono">
                  Aperçu : <strong>{formatPhoneDisplay(mtnNumber || "650000000")}</strong>
                </div>
                <Button
                  onClick={() => handleSave("good_deal_mtn_number", mtnNumber, "Numéro MTN", 8)}
                  disabled={saving === "good_deal_mtn_number"}
                  className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  <Save className="w-4 h-4" />
                  {saving === "good_deal_mtn_number" ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            )}
          </div>

          {/* Good Deal Orange number */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-foreground mb-1 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-orange-500" /> Numéro Orange Good Deal
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Numéro Orange Money où les clients envoient leur paiement. Affiché à l'étape 3 du checkout.
            </p>
            {loading ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="orange-number">Numéro Orange Money</Label>
                  <Input
                    id="orange-number"
                    type="tel"
                    value={orangeNumber}
                    onChange={e => setOrangeNumber(e.target.value)}
                    placeholder="690000000"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Chiffres uniquement. Ex. : 690123456 — Affiché : {formatPhoneDisplay(orangeNumber || "690000000")}
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm text-orange-800 font-mono">
                  Aperçu : <strong>{formatPhoneDisplay(orangeNumber || "690000000")}</strong>
                </div>
                <Button
                  onClick={() => handleSave("good_deal_orange_number", orangeNumber, "Numéro Orange", 8)}
                  disabled={saving === "good_deal_orange_number"}
                  className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Save className="w-4 h-4" />
                  {saving === "good_deal_orange_number" ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            )}
          </div>

          {/* WhatsApp */}
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
                {whatsappPreview && (
                  <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-800">
                    <span className="font-semibold">Aperçu du lien :</span>{" "}
                    <a href={whatsappPreview} target="_blank" rel="noopener noreferrer" className="underline break-all">
                      {whatsappPreview}
                    </a>
                  </div>
                )}
                <Button
                  onClick={() => handleSave("whatsapp_number", whatsappNumber, "WhatsApp")}
                  disabled={saving === "whatsapp_number"}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving === "whatsapp_number" ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
