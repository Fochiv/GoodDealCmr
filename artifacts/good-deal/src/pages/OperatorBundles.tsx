import { useLocation, useParams } from "wouter";
import { ArrowLeft, Wifi, Calendar, Search, ShoppingBag, Menu } from "lucide-react";
import { useGetOperator, getGetOperatorQueryKey, useListBundles, getListBundlesQueryKey } from "@workspace/api-client-react";
import { formatFCFA } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useColors } from "@/hooks/use-colors";

export default function OperatorBundles() {
  const params = useParams<{ id: string }>();
  const operatorId = parseInt(params.id ?? "1");
  const [, setLocation] = useLocation();
  const c = useColors();

  const { data: operator, isLoading: opLoading } = useGetOperator(operatorId, {
    query: { enabled: !isNaN(operatorId), queryKey: getGetOperatorQueryKey(operatorId) }
  });
  const { data: bundles, isLoading: bundlesLoading } = useListBundles(
    { operatorId, active: true },
    { query: { enabled: !isNaN(operatorId), queryKey: getListBundlesQueryKey({ operatorId, active: true }) } }
  );

  const isMtn = operator?.slug === "mtn";

  const accent = isMtn ? "#FFD700" : "#FF6600";
  const accentDim = isMtn ? "rgba(255,215,0,0.15)" : "rgba(255,102,0,0.15)";
  const accentBorder = isMtn ? "rgba(255,215,0,0.3)" : "rgba(255,102,0,0.3)";
  const btnText = isMtn ? "#1a1a1a" : "#ffffff";
  const logoSrc = isMtn ? "/logo-mtn.png" : "/logo-orange.jpg";
  const logoAlt = isMtn ? "MTN" : "Orange";

  const handleBuyBundle = (bundleId: number) => {
    setLocation(`/checkout?bundleId=${bundleId}`);
  };

  return (
    <div className="min-h-screen" style={{ background: c.bg, color: c.text }}>

      {/* ── Top navbar — style opérateur ─────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{ background: c.bg, borderBottomColor: accentBorder }}
      >
        {/* Logo row */}
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo opérateur */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1.5 transition-colors text-sm"
              style={{ color: c.textMuted }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-10 h-10 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: isMtn ? "#FFD700" : "#FF6600" }}
            >
              <img src={logoSrc} alt={logoAlt} className="w-full h-full object-cover" />
            </div>
            <span className="font-black text-base hidden sm:inline" style={{ color: c.text }}>
              {isMtn ? "MTN Cameroon" : "Orange Cameroun"}
            </span>
          </div>

          {/* Search bar */}
          <div
            className="flex-1 max-w-md hidden md:flex items-center overflow-hidden border"
            style={{ borderColor: accentBorder, borderRadius: "4px" }}
          >
            <input
              type="text"
              placeholder="Rechercher un forfait..."
              className="flex-1 px-3 py-2 text-sm outline-none bg-transparent placeholder-gray-500"
              style={{ color: c.text }}
              readOnly
            />
            <button
              className="px-3 py-2 flex items-center justify-center flex-shrink-0"
              style={{ background: accent }}
            >
              <Search className="w-4 h-4" style={{ color: btnText }} />
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/commandes")}
              className="p-2 rounded transition-colors"
              style={{ color: c.textMuted }}
            >
              <ShoppingBag className="w-5 h-5" />
            </button>
            <button className="md:hidden p-2 rounded transition-colors" style={{ color: c.textMuted }}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero banner ────────────────────────────────────────────────────── */}
      <div
        className="pt-14"
        style={{ background: isMtn ? c.heroGradMtn : c.heroGradOrange }}
      >
        <div className="max-w-5xl mx-auto px-4 py-10">
          {opLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" style={{ background: c.skeleton }} />
              <Skeleton className="h-5 w-32" style={{ background: c.skeleton }} />
            </div>
          ) : (
            <>
              <div
                className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3"
                style={{ background: accentDim, color: accent }}
              >
                {bundles?.length ?? 0} forfaits disponibles
              </div>
              <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2" style={{ color: c.text }}>
                Forfaits internet
              </h1>
              <p className="text-sm max-w-md" style={{ color: c.textMuted }}>
                Découvrez tous nos forfaits Internet {isMtn ? "MTN" : "Orange"} avec ou sans engagement
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Grille de forfaits ────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-28 md:pb-12">
        {bundlesLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-52 animate-pulse rounded" style={{ background: c.bgCard }} />
            ))}
          </div>
        ) : !bundles?.length ? (
          <div className="text-center py-20" style={{ color: c.textMuted }}>
            <Wifi className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aucun forfait disponible pour le moment</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                className="overflow-hidden transition-all hover:scale-[1.02] group"
                style={{
                  background: c.bgCard,
                  border: `1px solid ${accentBorder}`,
                  borderRadius: "6px",
                }}
                data-testid={`card-bundle-${bundle.id}`}
              >
                {/* Top accent bar */}
                <div className="h-1 w-full" style={{ background: accent }} />

                <div className="p-5">
                  {/* Badge + validité */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-sm"
                      style={{ background: accentDim, color: accent }}
                    >
                      {bundle.operatorName}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: c.textSubtle }}>
                      <Calendar className="w-3 h-3" />
                      {bundle.validity}j
                    </span>
                  </div>

                  {/* Data size */}
                  <div className="text-4xl font-black leading-none mb-1" style={{ color: c.text }}>
                    {bundle.dataSize}
                  </div>
                  <div className="text-sm mb-5" style={{ color: c.textMuted }}>{bundle.name}</div>

                  {/* Prix */}
                  <div className="text-2xl font-black mb-5" style={{ color: accent }}>
                    {formatFCFA(bundle.price)}
                  </div>

                  {/* Bouton */}
                  <button
                    onClick={() => handleBuyBundle(bundle.id)}
                    className="w-full py-2.5 font-bold text-sm transition-all border-2 hover:opacity-90 active:opacity-75"
                    style={{
                      borderColor: accent,
                      color: accent,
                      background: "transparent",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = accent;
                      (e.currentTarget as HTMLButtonElement).style.color = btnText;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = accent;
                    }}
                    data-testid={`button-buy-${bundle.id}`}
                  >
                    Souscrire à cette offre
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA bas de page */}
        {!bundlesLoading && !!bundles?.length && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setLocation("/forfaits")}
              className="px-8 py-3.5 font-bold text-sm border transition-colors hover:opacity-80"
              style={{ borderColor: c.borderMd, color: c.text, borderRadius: "4px" }}
            >
              Voir tous les forfaits disponibles
            </button>
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ background: c.bgSecondary, borderTop: `1px solid ${accentBorder}` }}>
        <div className="max-w-5xl mx-auto px-4 py-10">

          {/* Logo + description */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: accent }}
            >
              <img src={logoSrc} alt={logoAlt} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-black text-base" style={{ color: c.text }}>
                {isMtn ? "MTN Cameroon" : "Orange Cameroun"}
              </div>
              <div className="text-xs" style={{ color: c.textSubtle }}>via Good Deal</div>
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: c.textSubtle }}>
              Plus de sites
            </div>
            <div className="flex flex-col gap-3">
              {(isMtn
                ? [
                    { name: "TWITTER",   href: "https://twitter.com/MTNCameroon" },
                    { name: "YOUTUBE",   href: "https://youtube.com/@MTNCameroon" },
                    { name: "FACEBOOK",  href: "https://facebook.com/MTNCameroon" },
                    { name: "INSTAGRAM", href: "https://instagram.com/mtncameroon" },
                    { name: "LINKEDIN",  href: "https://linkedin.com/company/mtn-cameroon" },
                  ]
                : [
                    { name: "TWITTER",   href: "https://twitter.com/OrangeCameroun" },
                    { name: "YOUTUBE",   href: "https://youtube.com/@OrangeCameroun" },
                    { name: "FACEBOOK",  href: "https://facebook.com/OrangeCameroun" },
                    { name: "INSTAGRAM", href: "https://instagram.com/orangecameroun" },
                    { name: "LINKEDIN",  href: "https://linkedin.com/company/orange-cameroun" },
                  ]
              ).map(link => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold transition-opacity hover:opacity-70"
                  style={{ color: accent }}
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          <div className="border-t mb-8" style={{ borderColor: c.border }} />

          {/* Liens légaux */}
          <div className="flex flex-col gap-3 mb-8">
            {[
              "Politique de confidentialité",
              "Conditions générales d'utilisation",
              "Mon contrat",
              "Couverture réseau",
              "ANTIC — Cybersécurité",
            ].map(link => (
              <a
                key={link}
                href="#"
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: c.textMuted }}
              >
                {link}
              </a>
            ))}
          </div>

          <div className="border-t mb-6" style={{ borderColor: c.border }} />

          <p className="text-xs" style={{ color: c.textSubtle }}>
            © 2025 {isMtn ? "MTN CAMEROON" : "ORANGE CAMEROUN"}, ALL RIGHTS RESERVED.
          </p>
          <p className="text-xs mt-1" style={{ color: c.textSubtle }}>
            Forfaits distribués via <span style={{ color: accent }}>Good Deal</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
