import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Wifi, Zap, Phone, ChevronRight, Check, Star, CheckCircle, MessageCircle, X, Send, HeadphonesIcon, Shield, Store } from "lucide-react";
import { useListOperators, useListBundles } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { formatFCFA } from "@/lib/api";

const DEFAULT_WHATSAPP = "237650000000";
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/settings`);
      if (!res.ok) throw new Error("settings fetch failed");
      return res.json();
    },
    staleTime: 60000,
  });
}

type DisplayTestimonial = {
  id?: number;
  phone: string;
  bundle?: string;
  amount?: string;
  msg: string;
  stars: number;
};

function useApprovedReviews() {
  return useQuery<DisplayTestimonial[]>({
    queryKey: ["approved-reviews"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/reviews`);
      if (!res.ok) return [];
      const rows: { id: number; name: string; phone: string; stars: number; message: string }[] = await res.json();
      return rows.map(r => ({
        id: r.id,
        phone: r.name || r.phone,
        msg: r.message,
        stars: r.stars,
      }));
    },
    staleTime: 30000,
  });
}

const TESTIMONIALS: DisplayTestimonial[] = [
  { phone: "690***432", bundle: "2 Go MTN", amount: "500 FCFA", msg: "Reçu en moins d'une minute, incroyable 🔥", stars: 5 },
  { phone: "677***891", bundle: "6 Go MTN", amount: "1 000 FCFA", msg: "Meilleur service internet du Cameroun !", stars: 5 },
  { phone: "655***204", bundle: "10 Go Orange", amount: "1 500 FCFA", msg: "Ça marche bien mais parfois un peu lent 👌", stars: 3 },
  { phone: "694***017", bundle: "30 Go MTN", amount: "3 500 FCFA", msg: "Forfait activé instantanément, merci Good Deal !", stars: 5 },
  { phone: "674***553", bundle: "1 Go MTN", amount: "200 FCFA", msg: "Simple, rapide, pas cher. Je recommande 💯", stars: 5 },
  { phone: "699***788", bundle: "800 Mo Orange", amount: "200 FCFA", msg: "Bien, mais j'attendais que le forfait s'active un peu plus vite", stars: 4 },
  { phone: "651***341", bundle: "15 Go MTN", amount: "2 000 FCFA", msg: "C'est trop facile ! J'adore cette appli 😍", stars: 5 },
  { phone: "667***629", bundle: "2 Go Orange", amount: "400 FCFA", msg: "Paiement MoMo sécurisé, aucun problème 👍", stars: 5 },
  { phone: "683***115", bundle: "6 Go Orange", amount: "800 FCFA", msg: "Honnêtement bien, je reviendrai sûrement", stars: 4 },
  { phone: "640***977", bundle: "30 Go MTN", amount: "3 500 FCFA", msg: "Good Deal c'est vraiment le meilleur deal !", stars: 5 },
  { phone: "696***452", bundle: "1 Go MTN", amount: "200 FCFA", msg: "Très pratique pour recharger à toute heure 🕐", stars: 5 },
  { phone: "675***803", bundle: "15 Go Orange", amount: "1 800 FCFA", msg: "Service parfait ! Merci du fond du cœur 🙏", stars: 5 },
  { phone: "658***226", bundle: "2 Go MTN", amount: "500 FCFA", msg: "Correct, j'espère que le service va encore s'améliorer", stars: 3 },
  { phone: "691***564", bundle: "6 Go MTN", amount: "1 000 FCFA", msg: "Forfait trop bien, très vite activé. 5 étoiles ⭐", stars: 5 },
  { phone: "644***739", bundle: "800 Mo Orange", amount: "200 FCFA", msg: "Même à minuit ça marche ! Trop fort 💪", stars: 5 },
  { phone: "670***318", bundle: "10 Go MTN", amount: "1 200 FCFA", msg: "Ma famille entière utilise Good Deal maintenant 😄", stars: 5 },
  { phone: "653***874", bundle: "30 Go Orange", amount: "3 000 FCFA", msg: "Bien dans l'ensemble, livraison un peu longue cette fois", stars: 4 },
  { phone: "693***141", bundle: "2 Go Orange", amount: "400 FCFA", msg: "Je recommande à tous mes amis de Douala 🤩", stars: 5 },
  { phone: "647***592", bundle: "15 Go MTN", amount: "2 000 FCFA", msg: "Excellent ! Paiement MoMo instantané 🚀", stars: 5 },
  { phone: "688***267", bundle: "6 Go Orange", amount: "800 FCFA", msg: "Bonne appli, bonne connexion, bon prix ! 👌", stars: 5 },
  { phone: "664***450", bundle: "1 Go Orange", amount: "150 FCFA", msg: "Merci Good Deal, ma connexion est top 🎉", stars: 5 },
  { phone: "679***183", bundle: "30 Go MTN", amount: "3 500 FCFA", msg: "Pas mal du tout, je préfère passer par ici maintenant", stars: 4 },
  { phone: "682***310", bundle: "2 Go Orange", amount: "400 FCFA", msg: "Trop bien, j'ai rechargé depuis Yaoundé en 2 min !", stars: 5 },
  { phone: "671***045", bundle: "10 Go MTN", amount: "1 200 FCFA", msg: "Good Deal c'est la solution pour les étudiants 📚", stars: 5 },
  { phone: "698***722", bundle: "6 Go Orange", amount: "800 FCFA", msg: "Fiable à 100%, je commande tous les mois ici 🔄", stars: 5 },
  { phone: "656***891", bundle: "15 Go MTN", amount: "2 000 FCFA", msg: "Meilleur prix que partout ailleurs, merci ! 💸", stars: 5 },
  { phone: "692***437", bundle: "30 Go Orange", amount: "3 000 FCFA", msg: "On attend plus rien, c'est immédiat ici ✨", stars: 5 },
  { phone: "643***269", bundle: "1 Go MTN", amount: "200 FCFA", msg: "Pratique même pour les petits forfaits 👏", stars: 5 },
  { phone: "678***514", bundle: "800 Mo Orange", amount: "200 FCFA", msg: "Je n'ai plus besoin d'aller en boutique 🏠", stars: 5 },
  { phone: "695***883", bundle: "2 Go MTN", amount: "500 FCFA", msg: "Super rapide, mon forfait est là avant même de fermer l'appli 🚀", stars: 5 },
  { phone: "661***156", bundle: "6 Go MTN", amount: "1 000 FCFA", msg: "Tout le monde dans mon quartier connaît Good Deal 💬", stars: 5 },
  { phone: "687***328", bundle: "10 Go Orange", amount: "1 500 FCFA", msg: "Service sérieux, je recommande sans hésiter ! 👍", stars: 5 },
];

function TestimonialCard({ t }: { t: DisplayTestimonial }) {
  const isMtn = t.bundle ? t.bundle.includes("MTN") : Math.random() > 0.5;
  const initial = t.phone.charAt(0).toUpperCase();
  return (
    <div className="flex-shrink-0 w-72 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mx-2">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {t.bundle ? (
            <div
              className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden border border-black/10"
              style={{ background: isMtn ? "#FFD700" : "#FF6B00" }}
            >
              <img
                src={isMtn ? "/logo-mtn.png" : "/logo-orange.jpg"}
                alt={isMtn ? "MTN" : "Orange"}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full flex-shrink-0 bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-black text-sm border border-black/10">
              {initial}
            </div>
          )}
          <div>
            <div className="font-bold text-sm text-foreground">{t.phone}</div>
            {t.bundle && t.amount && (
              <div className="text-xs text-muted-foreground">{t.bundle} · {t.amount}</div>
            )}
          </div>
        </div>
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
      </div>
      <div className="flex gap-0.5 mb-2">
        {Array.from({ length: t.stars }).map((_, i) => (
          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        ))}
        {Array.from({ length: 5 - t.stars }).map((_, i) => (
          <Star key={i} className="w-3 h-3 text-gray-200" />
        ))}
      </div>
      <p className="text-sm text-gray-700 leading-snug">{t.msg}</p>
    </div>
  );
}

function MarqueeRow({ items, reverse = false }: { items: DisplayTestimonial[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden relative">
      <div
        className="flex"
        style={{
          animation: `marquee-${reverse ? "reverse" : "forward"} ${items.length * 5}s linear infinite`,
          width: "max-content",
        }}
      >
        {doubled.map((t, i) => (
          <TestimonialCard key={i} t={t} />
        ))}
      </div>
    </div>
  );
}

function AvisModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [stars, setStars] = useState(5);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, stars, message: msg }),
      });
    } catch {}
    setSent(true);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {sent ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-black text-foreground mb-2">Merci pour votre avis !</h3>
            <p className="text-muted-foreground text-sm mb-6">Votre témoignage a bien été envoyé. Merci de faire confiance à Good Deal 🙏</p>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #FF6B00, #FFD700)" }}
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h3 className="text-xl font-black text-foreground">Poster un avis</h3>
              <p className="text-sm text-muted-foreground mt-1">Partagez votre expérience avec Good Deal</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Votre nom</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Jean-Pierre K."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Numéro de téléphone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ex: 690***432"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Note</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStars(s)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={`w-7 h-7 transition-colors ${s <= stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Votre message</label>
                <textarea
                  required
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  rows={3}
                  placeholder="Parlez de votre expérience avec Good Deal..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #FF6B00, #FFD700)" }}
              >
                <Send className="w-4 h-4" />
                {submitting ? "Envoi..." : "Envoyer mon avis"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function FloatingActions({ whatsappNumber, onAvis }: { whatsappNumber: string; onAvis: () => void }) {
  const [open, setOpen] = useState(false);

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Bonjour Good Deal, j'ai besoin d'aide 👋")}`;

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <button
            onClick={() => { setOpen(false); onAvis(); }}
            className="flex items-center gap-3 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 transition-all hover:scale-105"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #FF6B00, #FFD700)" }}>
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Poster un avis</div>
              <div className="text-xs text-muted-foreground">Partagez votre expérience</div>
            </div>
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 transition-all hover:scale-105"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#25D366" }}>
              <svg className="w-5 h-5 text-white fill-white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.524 5.855L.057 23.293a.75.75 0 0 0 .908.941l5.629-1.48A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.694 9.694 0 0 1-4.951-1.355l-.355-.212-3.683.967.984-3.595-.232-.37A9.694 9.694 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Service client</div>
              <div className="text-xs text-muted-foreground">Répondre sous 5 min</div>
            </div>
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: open ? "#6b7280" : "linear-gradient(135deg, #FF6B00, #FFD700)" }}
        aria-label="Aide"
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <HeadphonesIcon className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [showAvisModal, setShowAvisModal] = useState(false);
  const { data: operators, isLoading: opsLoading } = useListOperators();
  const { data: bundles } = useListBundles({ active: true });
  const { data: settings } = useSettings();
  const { data: dbReviews = [] } = useApprovedReviews();
  const whatsappNumber = settings?.whatsapp_number ?? DEFAULT_WHATSAPP;

  // Fusionner les avis approuvés (BDD en premier) avec les témoignages hardcodés
  const allTestimonials: DisplayTestimonial[] = [...dbReviews, ...TESTIMONIALS];
  const chunkSize = Math.ceil(allTestimonials.length / 3);
  const ROW1 = allTestimonials.slice(0, chunkSize);
  const ROW2 = allTestimonials.slice(chunkSize, chunkSize * 2);
  const ROW3 = allTestimonials.slice(chunkSize * 2);

  const allMtnBundles = bundles?.filter(b => b.operatorSlug === "mtn") ?? [];
  const allOrangeBundles = bundles?.filter(b => b.operatorSlug === "orange") ?? [];
  const mtnBundles = allMtnBundles.slice(0, 3);
  const orangeBundles = allOrangeBundles.slice(0, 3);

  const mtnOp = operators?.find(o => o.slug === "mtn");
  const orangeOp = operators?.find(o => o.slug === "orange");

  // ── Secret shortcut: 5 taps on Étape 3 → show access modal ─────────────────
  const step3Clicks = useRef(0);
  const step3Timer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);

  function handleStep3Click() {
    step3Clicks.current += 1;
    if (step3Timer.current) clearTimeout(step3Timer.current);
    if (step3Clicks.current >= 5) {
      step3Clicks.current = 0;
      setShowAccessModal(true);
      return;
    }
    step3Timer.current = setTimeout(() => { step3Clicks.current = 0; }, 2000);
  }

  return (
    <div className="min-h-screen">
      {/* ── Access modal (admin or merchant) ─────────────────────────────── */}
      {showAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-base text-foreground">Accès restreint</h2>
              <button onClick={() => setShowAccessModal(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowAccessModal(false); setLocation("/ashtech"); }}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">Administrateur</div>
                  <div className="text-xs text-muted-foreground">Accès au panneau admin</div>
                </div>
              </button>
              <button
                onClick={() => { setShowAccessModal(false); setLocation("/marchand"); }}
                className="flex items-center gap-4 p-4 rounded-xl border border-orange-200 hover:bg-orange-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #FF6B00, #FF3D00)" }}>
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">Espace marchand</div>
                  <div className="text-xs text-muted-foreground">Gérer mon compte marchand</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-yellow-50" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black text-foreground leading-tight mb-6">
            Internet mobile au<br />
            <span className="text-primary">meilleur prix</span> au Cameroun
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Achetez vos forfaits internet MTN et Orange directement depuis votre téléphone. Paiement Mobile Money instantané.
          </p>

          {/* Operator quick buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <button
              onClick={() => orangeOp ? setLocation(`/operator/${orangeOp.id}`) : setLocation("/forfaits")}
              className="group relative flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-base transition-all hover:scale-105 active:scale-95 text-white overflow-hidden"
              style={{ background: "linear-gradient(135deg, #FF6B00, #FF3D00)", boxShadow: "0 8px 24px rgba(255,80,0,0.45)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(135deg, #FF8500, #FF4500)" }} />
              <div className="relative flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-white/20">
                  <img src="/logo-orange.jpg" alt="Orange" className="w-full h-full object-cover" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold uppercase tracking-widest text-orange-100/70 leading-none mb-0.5">Découvrir</div>
                  <div className="text-lg font-black leading-tight">Good Deals Orange</div>
                </div>
              </div>
              <ChevronRight className="relative w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </button>

            <button
              onClick={() => mtnOp ? setLocation(`/operator/${mtnOp.id}`) : setLocation("/forfaits")}
              className="group relative flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-base transition-all hover:scale-105 active:scale-95 text-gray-900 overflow-hidden"
              style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 8px 24px rgba(255,193,0,0.5)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(135deg, #FFE44D, #FFB800)" }} />
              <div className="relative flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-black/10">
                  <img src="/logo-mtn.png" alt="MTN" className="w-full h-full object-cover" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold uppercase tracking-widest text-yellow-900/60 leading-none mb-0.5">Découvrir</div>
                  <div className="text-lg font-black leading-tight">Good Deals MTN</div>
                </div>
              </div>
              <ChevronRight className="relative w-5 h-5 text-yellow-900/50 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </button>
          </div>

          {/* Secondary buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setLocation("/forfaits")}
              className="px-8 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 shadow-md"
              style={{ background: "linear-gradient(135deg, #FF6B00, #FFD700)" }}
            >
              Voir tous les forfaits
            </button>
            <button
              onClick={() => setLocation("/commandes")}
              className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-105 shadow-md border-2 border-gray-200 bg-white text-foreground hover:bg-gray-50"
            >
              Suivre mes commandes
            </button>
          </div>
        </div>
      </section>

      {/* Operator Cards */}
      <section className="px-4 pb-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-black text-center text-foreground mb-8">Choisissez votre opérateur</h2>
        {opsLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map(i => <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Orange Card */}
            <button
              onClick={() => orangeOp ? setLocation(`/operator/${orangeOp.id}`) : setLocation("/forfaits")}
              className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #FF6B00 0%, #FF8C00 50%, #FFA040 100%)" }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-white/30 rounded-2xl p-2 w-20 h-14 flex items-center justify-center overflow-hidden">
                    <img src="/logo-orange.jpg" alt="Orange" className="w-full h-full object-contain" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Orange Cameroun</h3>
                <p className="text-orange-100 font-medium mb-4">{allOrangeBundles.length} forfaits disponibles</p>
                <div className="flex gap-2 flex-wrap">
                  {orangeBundles.map(b => (
                    <span key={b.id} className="bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {b.dataSize} — {formatFCFA(b.price)}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {/* MTN Card */}
            <button
              onClick={() => mtnOp ? setLocation(`/operator/${mtnOp.id}`) : setLocation("/forfaits")}
              className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)" }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-white/30 rounded-2xl p-2 w-20 h-14 flex items-center justify-center overflow-hidden">
                    <img src="/logo-mtn.png" alt="MTN" className="w-full h-full object-contain" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-800 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">MTN Cameroon</h3>
                <p className="text-gray-800 font-medium mb-4">{allMtnBundles.length} forfaits disponibles</p>
                <div className="flex gap-2 flex-wrap">
                  {mtnBundles.map(b => (
                    <span key={b.id} className="bg-white/40 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
                      {b.dataSize} — {formatFCFA(b.price)}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          </div>
        )}
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="pb-16 bg-gray-50 pt-12 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            <CheckCircle className="w-4 h-4" />
            Clients satisfaits
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">Ce que disent nos clients</h2>
          <p className="text-muted-foreground text-sm mb-6">Plus de <strong>10 000 forfaits</strong> vendus — ils témoignent</p>
        </div>

        <div className="space-y-3">
          <MarqueeRow items={ROW1} reverse={false} />
          <MarqueeRow items={ROW2} reverse={true} />
          <MarqueeRow items={ROW3} reverse={false} />
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-16 bg-white">
        <div className="max-w-4xl mx-auto py-16">
          <h2 className="text-2xl font-black text-center text-foreground mb-12">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Wifi,  step: "1", title: "Choisissez un forfait", desc: "Parcourez nos offres MTN et Orange, comparez les prix et la data." },
              { icon: Phone, step: "2", title: "Entrez votre numéro",   desc: "Renseignez le numéro à recharger et choisissez votre moyen de paiement." },
              { icon: Zap,   step: "3", title: "Payez en 1 clic",       desc: "Paiement MTN MoMo ou Orange Money. Votre forfait est activé instantanément." },
            ].map((item) => (
              <div
                key={item.step}
                className="text-center"
                onClick={item.step === "3" ? handleStep3Click : undefined}
                style={item.step === "3" ? { cursor: "default", userSelect: "none" } : undefined}
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Étape {item.step}</div>
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-20 max-w-4xl mx-auto pt-4">
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
          <h2 className="text-xl font-black text-foreground mb-6">Pourquoi Good Deal ?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Paiement 100% sécurisé Mobile Money",
              "Activation instantanée du forfait",
              "Suivi de commande par numéro",
              "Reçu électronique par transaction",
              "Assistance disponible 24h/24",
              "Pas de frais cachés",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-sm text-foreground">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-16 md:hidden" />

      {/* Floating Actions */}
      <FloatingActions whatsappNumber={whatsappNumber} onAvis={() => setShowAvisModal(true)} />

      {/* Avis Modal */}
      {showAvisModal && <AvisModal onClose={() => setShowAvisModal(false)} />}
    </div>
  );
}
