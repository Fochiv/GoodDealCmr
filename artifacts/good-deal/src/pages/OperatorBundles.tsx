import { useLocation, useParams } from "wouter";
import { ArrowLeft, Wifi, Calendar } from "lucide-react";
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
  const accentColor = isMtn ? "#FFD700" : "#FF6600";
  const priceColor = isMtn ? "#B8860B" : "#FF6600";
  const btnBg = isMtn ? "#FFD700" : "#FF6600";
  const btnText = isMtn ? "#1a1a1a" : "white";

  const handleBuyBundle = (bundleId: number) => {
    setLocation(`/checkout?bundleId=${bundleId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-24 md:pb-8">
      {/* Header — style orange.cm : blanc + bordure basse colorée */}
      <div className="bg-white border-b-4 py-6 px-4" style={{ borderBottomColor: accentColor }}>
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 mb-4 text-sm font-medium transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          {opLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <>
              <h1 className="text-2xl font-black text-gray-900">{operator?.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {bundles?.length ?? 0} forfaits disponibles
              </p>
            </>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {bundlesLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-52 rounded" />
            ))}
          </div>
        ) : !bundles?.length ? (
          <div className="text-center py-20 text-gray-400">
            <Wifi className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aucun forfait disponible pour le moment</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="bg-white border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  style={{ borderLeft: `4px solid ${accentColor}` }}
                  data-testid={`card-bundle-${bundle.id}`}
                >
                  <div className="p-4">
                    {/* Badge opérateur + validité */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-sm"
                        style={{
                          background: isMtn ? "rgba(255,215,0,0.2)" : "rgba(255,102,0,0.12)",
                          color: priceColor,
                        }}
                      >
                        {bundle.operatorName}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {bundle.validity} jours
                      </span>
                    </div>

                    {/* Data size — très grand et gras */}
                    <div className="text-4xl font-black text-gray-900 leading-none mb-1">
                      {bundle.dataSize}
                    </div>
                    <div className="text-sm text-gray-500 mb-4">{bundle.name}</div>

                    {/* Prix — grand, couleur opérateur, style orange.cm */}
                    <div
                      className="text-3xl font-black mb-1"
                      style={{ color: priceColor }}
                    >
                      {formatFCFA(bundle.price)}
                    </div>
                    <div className="text-xs text-gray-400 mb-4">Valide {bundle.validity} jours</div>

                    {/* Bouton Acheter — plat, solide */}
                    <button
                      onClick={() => handleBuyBundle(bundle.id)}
                      className="w-full py-2.5 font-bold text-sm transition-opacity hover:opacity-90 active:opacity-75"
                      style={{ background: btnBg, color: btnText, borderRadius: "4px" }}
                      data-testid={`button-buy-${bundle.id}`}
                    >
                      Acheter
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA noir — style orange.cm */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setLocation("/forfaits")}
                className="w-full max-w-lg py-3.5 font-bold text-white text-sm transition-opacity hover:opacity-90"
                style={{ background: "#1a1a1a", borderRadius: "4px" }}
              >
                Voir tous les forfaits disponibles
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
