import { useLocation, useParams } from "wouter";
import { ArrowLeft, Wifi, Calendar, Search, ShoppingBag, Menu } from "lucide-react";
import { useGetOperator, getGetOperatorQueryKey, useListBundles, getListBundlesQueryKey } from "@workspace/api-client-react";
import { formatFCFA } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function OperatorBundles() {
  const params = useParams<{ id: string }>();
  const operatorId = parseInt(params.id ?? "1");
  const [, setLocation] = useLocation();

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
    <div className="min-h-screen" style={{ background: "#0d0d0d", color: "#ffffff" }}>

      {/* ── Top navbar — style opérateur sombre ─────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{ background: "#0d0d0d", borderBottomColor: accentBorder }}
      >
        {/* Logo row */}
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo opérateur */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-10 h-10 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: isMtn ? "#FFD700" : "#FF6600" }}
            >
              <img src={logoSrc} alt={logoAlt} className="w-full h-full object-cover" />
            </div>
            <span className="font-black text-white text-base hidden sm:inline">
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
              className="flex-1 px-3 py-2 text-sm outline-none bg-transparent text-white placeholder-gray-500"
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
              className="p-2 rounded hover:bg-white/10 transition-colors relative"
            >
              <ShoppingBag className="w-5 h-5 text-gray-300" />
            </button>
            <button className="md:hidden p-2 rounded hover:bg-white/10 transition-colors">
              <Menu className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero banner — fond sombre, nom opérateur ─────────────────────── */}
      <div
        className="pt-14"
        style={{
          background: `linear-gradient(180deg, ${isMtn ? "#1a1500" : "#1a0800"} 0%, #0d0d0d 100%)`,
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-10">
          {opLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-white/10" />
              <Skeleton className="h-5 w-32 bg-white/10" />
            </div>
          ) : (
            <>
              <div
                className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3"
                style={{ background: accentDim, color: accent }}
              >
                {bundles?.length ?? 0} forfaits disponibles
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
                Forfaits internet
              </h1>
              <p className="text-gray-400 text-sm max-w-md">
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
              <div key={i} className="h-52 animate-pulse rounded" style={{ background: "#1a1a1a" }} />
            ))}
          </div>
        ) : !bundles?.length ? (
          <div className="text-center py-20 text-gray-500">
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
                  background: "#1a1a1a",
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
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {bundle.validity}j
                    </span>
                  </div>

                  {/* Data size */}
                  <div className="text-4xl font-black text-white leading-none mb-1">
                    {bundle.dataSize}
                  </div>
                  <div className="text-sm text-gray-400 mb-5">{bundle.name}</div>

                  {/* Prix */}
                  <div className="text-2xl font-black mb-5" style={{ color: accent }}>
                    {formatFCFA(bundle.price)}
                  </div>

                  {/* Bouton — style "Souscrire à nos offres" avec bordure */}
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
              className="px-8 py-3.5 font-bold text-sm text-white border border-white/20 hover:bg-white/10 transition-colors"
              style={{ borderRadius: "4px" }}
            >
              Voir tous les forfaits disponibles
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
