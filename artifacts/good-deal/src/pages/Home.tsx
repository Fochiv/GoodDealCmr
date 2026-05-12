import { useLocation } from "wouter";
import { Wifi, Zap, Phone, ChevronRight, Check, Star, CheckCircle } from "lucide-react";
import { useListOperators, useListBundles } from "@workspace/api-client-react";
import { formatFCFA } from "@/lib/api";

const TESTIMONIALS = [
  { phone: "690***432", bundle: "2 Go MTN", amount: "500 FCFA", msg: "Reçu en moins d'une minute, incroyable 🔥", stars: 5 },
  { phone: "677***891", bundle: "6 Go MTN", amount: "1 000 FCFA", msg: "Meilleur service internet du Cameroun !", stars: 5 },
  { phone: "655***204", bundle: "10 Go Orange", amount: "1 500 FCFA", msg: "Je commande chaque semaine, toujours rapide 👌", stars: 5 },
  { phone: "694***017", bundle: "30 Go MTN", amount: "3 500 FCFA", msg: "Forfait activé instantanément, merci Good Deal !", stars: 5 },
  { phone: "674***553", bundle: "1 Go MTN", amount: "200 FCFA", msg: "Simple, rapide, pas cher. Je recommande 💯", stars: 5 },
  { phone: "699***788", bundle: "800 Mo Orange", amount: "200 FCFA", msg: "Payé avec Orange Money, forfait actif direct ✅", stars: 5 },
  { phone: "651***341", bundle: "15 Go MTN", amount: "2 000 FCFA", msg: "C'est trop facile ! J'adore cette appli 😍", stars: 5 },
  { phone: "667***629", bundle: "2 Go Orange", amount: "400 FCFA", msg: "Paiement MoMo sécurisé, aucun problème 👍", stars: 5 },
  { phone: "683***115", bundle: "6 Go Orange", amount: "800 FCFA", msg: "Activé en 2 minutes chrono. Parfait 🙌", stars: 5 },
  { phone: "640***977", bundle: "30 Go MTN", amount: "3 500 FCFA", msg: "Good Deal c'est vraiment le meilleur deal !", stars: 5 },
  { phone: "696***452", bundle: "1 Go MTN", amount: "200 FCFA", msg: "Très pratique pour recharger à toute heure 🕐", stars: 5 },
  { phone: "675***803", bundle: "15 Go Orange", amount: "1 800 FCFA", msg: "Service parfait ! Merci du fond du cœur 🙏", stars: 5 },
  { phone: "658***226", bundle: "2 Go MTN", amount: "500 FCFA", msg: "Rapide et fiable, je fais confiance à Good Deal", stars: 5 },
  { phone: "691***564", bundle: "6 Go MTN", amount: "1 000 FCFA", msg: "Forfait trop bien, très vite activé. 5 étoiles ⭐", stars: 5 },
  { phone: "644***739", bundle: "800 Mo Orange", amount: "200 FCFA", msg: "Même à minuit ça marche ! Trop fort 💪", stars: 5 },
  { phone: "670***318", bundle: "10 Go MTN", amount: "1 200 FCFA", msg: "Ma famille entière utilise Good Deal maintenant 😄", stars: 5 },
  { phone: "653***874", bundle: "30 Go Orange", amount: "3 000 FCFA", msg: "Aucune arnaque, prix honnête et service top ✨", stars: 5 },
  { phone: "693***141", bundle: "2 Go Orange", amount: "400 FCFA", msg: "Je recommande à tous mes amis de Douala 🤩", stars: 5 },
  { phone: "647***592", bundle: "15 Go MTN", amount: "2 000 FCFA", msg: "Excellent ! Paiement MoMo instantané 🚀", stars: 5 },
  { phone: "688***267", bundle: "6 Go Orange", amount: "800 FCFA", msg: "Bonne appli, bonne connexion, bon prix ! 👌", stars: 5 },
  { phone: "664***450", bundle: "1 Go Orange", amount: "150 FCFA", msg: "Merci Good Deal, ma connexion est top 🎉", stars: 5 },
  { phone: "679***183", bundle: "30 Go MTN", amount: "3 500 FCFA", msg: "3 mois que j'utilise ce service, jamais déçu !", stars: 5 },
];

const ROW1 = TESTIMONIALS.slice(0, 11);
const ROW2 = TESTIMONIALS.slice(11);

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[0] }) {
  const isMtn = t.bundle.includes("MTN");
  return (
    <div className="flex-shrink-0 w-72 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mx-2">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{
              background: isMtn ? "linear-gradient(135deg,#FFD700,#FFA500)" : "linear-gradient(135deg,#FF6B00,#FF8C00)",
              color: isMtn ? "#1a1a1a" : "white",
            }}
          >
            {isMtn ? "M" : "O"}
          </div>
          <div>
            <div className="font-bold text-sm text-foreground">{t.phone}</div>
            <div className="text-xs text-muted-foreground">{t.bundle} · {t.amount}</div>
          </div>
        </div>
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
      </div>
      <div className="flex gap-0.5 mb-2">
        {Array.from({ length: t.stars }).map((_, i) => (
          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-sm text-gray-700 leading-snug">{t.msg}</p>
    </div>
  );
}

function MarqueeRow({ items, reverse = false }: { items: typeof TESTIMONIALS; reverse?: boolean }) {
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

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: operators, isLoading: opsLoading } = useListOperators();
  const { data: bundles } = useListBundles({ active: true });

  const mtnBundles = bundles?.filter(b => b.operatorSlug === "mtn").slice(0, 3) ?? [];
  const orangeBundles = bundles?.filter(b => b.operatorSlug === "orange").slice(0, 3) ?? [];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-yellow-50" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Zap className="w-4 h-4" />
            Rechargez en moins de 2 minutes
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-foreground leading-tight mb-6">
            Internet mobile au<br />
            <span className="text-primary">meilleur prix</span> au Cameroun
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Achetez vos forfaits internet MTN et Orange directement depuis votre téléphone. Paiement Mobile Money instantané.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setLocation("/operator/1")}
              className="px-8 py-3.5 rounded-xl font-bold text-gray-900 text-base transition-all hover:scale-105 shadow-lg"
              style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }}
            >
              Forfaits MTN
            </button>
            <button
              onClick={() => setLocation("/operator/2")}
              className="px-8 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:scale-105 shadow-lg"
              style={{ background: "linear-gradient(135deg, #FF6B00, #FF8C00)" }}
            >
              Forfaits Orange
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
            <button
              onClick={() => setLocation("/operator/1")}
              className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)" }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-white/30 rounded-2xl p-3">
                    <div className="text-2xl font-black text-gray-900">MTN</div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-800 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">MTN Cameroon</h3>
                <p className="text-gray-800 font-medium mb-4">{mtnBundles.length} forfaits disponibles</p>
                <div className="flex gap-2 flex-wrap">
                  {mtnBundles.map(b => (
                    <span key={b.id} className="bg-white/40 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
                      {b.dataSize} — {formatFCFA(b.price)}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            <button
              onClick={() => setLocation("/operator/2")}
              className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #FF6B00 0%, #FF8C00 50%, #FFA040 100%)" }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-white/30 rounded-2xl p-3">
                    <div className="text-2xl font-black text-white">Orange</div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Orange Cameroun</h3>
                <p className="text-orange-100 font-medium mb-4">{orangeBundles.length} forfaits disponibles</p>
                <div className="flex gap-2 flex-wrap">
                  {orangeBundles.map(b => (
                    <span key={b.id} className="bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-full">
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
          <p className="text-muted-foreground text-sm">Plus de <strong>10 000 forfaits</strong> vendus — ils témoignent</p>
        </div>

        <div className="space-y-3">
          <MarqueeRow items={ROW1} reverse={false} />
          <MarqueeRow items={ROW2} reverse={true} />
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-16 bg-white">
        <div className="max-w-4xl mx-auto py-16">
          <h2 className="text-2xl font-black text-center text-foreground mb-12">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Wifi, step: "1", title: "Choisissez un forfait", desc: "Parcourez nos offres MTN et Orange, comparez les prix et la data." },
              { icon: Phone, step: "2", title: "Entrez votre numéro", desc: "Renseignez le numéro à recharger et choisissez votre moyen de paiement." },
              { icon: Zap, step: "3", title: "Payez en 1 clic", desc: "Paiement MTN MoMo ou Orange Money. Votre forfait est activé instantanément." },
            ].map((item) => (
              <div key={item.step} className="text-center">
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
    </div>
  );
}
