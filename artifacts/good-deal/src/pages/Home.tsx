import { useLocation } from "wouter";
import { Wifi, Zap, Shield, Phone, ChevronRight, Check } from "lucide-react";
import { useListOperators, useListBundles } from "@workspace/api-client-react";
import { formatFCFA } from "@/lib/api";

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
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-background to-yellow-50 dark:from-orange-950/20 dark:via-background dark:to-yellow-950/10" />
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
              data-testid="button-mtn-hero"
            >
              Forfaits MTN
            </button>
            <button
              onClick={() => setLocation("/operator/2")}
              className="px-8 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:scale-105 shadow-lg"
              style={{ background: "linear-gradient(135deg, #FF6B00, #FF8C00)" }}
              data-testid="button-orange-hero"
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
            {[1, 2].map(i => (
              <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* MTN Card */}
            <button
              onClick={() => setLocation("/operator/1")}
              className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)" }}
              data-testid="card-operator-mtn"
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
                <p className="text-gray-800 font-medium mb-4">
                  {mtnBundles.length} forfaits disponibles
                </p>
                <div className="flex gap-2 flex-wrap">
                  {mtnBundles.map(b => (
                    <span key={b.id} className="bg-white/40 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
                      {b.dataSize} — {formatFCFA(b.price)}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {/* Orange Card */}
            <button
              onClick={() => setLocation("/operator/2")}
              className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #FF6B00 0%, #FF8C00 50%, #FFA040 100%)" }}
              data-testid="card-operator-orange"
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
                <p className="text-orange-100 font-medium mb-4">
                  {orangeBundles.length} forfaits disponibles
                </p>
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

      {/* How it works */}
      <section className="px-4 pb-16 bg-muted/30">
        <div className="max-w-4xl mx-auto py-16">
          <h2 className="text-2xl font-black text-center text-foreground mb-12">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Wifi, step: "1", title: "Choisissez un forfait", desc: "Parcourez nos offres MTN et Orange, comparez les prix et la data." },
              { icon: Phone, step: "2", title: "Entrez votre numéro", desc: "Renseignez le numéro à recharger et choisissez votre moyen de paiement." },
              { icon: Zap, step: "3", title: "Payez en 1 clic", desc: "Paiement MTN MoMo ou Orange Money. Votre forfait est activé instantanément." },
            ].map((item) => (
              <div key={item.step} className="text-center" data-testid={`step-${item.step}`}>
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
      <section className="px-4 pb-20 max-w-4xl mx-auto pt-12">
        <div className="bg-card border border-card-border rounded-2xl p-8">
          <h2 className="text-xl font-black text-foreground mb-6">Pourquoi Good Deal ?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Paiement 100% sécurisé Mobile Money",
              "Activation instantanée du forfait",
              "Historique de toutes vos commandes",
              "Reçu électronique par transaction",
              "Assistance disponible 24h/24",
              "Pas de frais cachés",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
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
