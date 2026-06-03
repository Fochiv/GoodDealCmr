import { useLocation, useParams } from "wouter";
import { ArrowLeft, Wifi, Calendar, Zap, ShoppingCart } from "lucide-react";
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
  const gradient = isMtn
    ? "linear-gradient(135deg, #FFD700, #FFA500)"
    : "linear-gradient(135deg, #FF6600, #FF8000)";
  const textOnBg = isMtn ? "text-gray-900" : "text-white";
  const subTextOnBg = isMtn ? "text-yellow-900" : "text-orange-100";

  const handleBuyBundle = (bundleId: number) => {
    setLocation(`/checkout?bundleId=${bundleId}`);
  };

  return (
    <div className="min-h-screen pt-16 pb-24 md:pb-8">
      {/* Header */}
      <div className="relative" style={{ background: gradient }}>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <button
            onClick={() => setLocation("/")}
            className={`flex items-center gap-2 ${textOnBg} opacity-80 hover:opacity-100 mb-6 font-medium text-sm`}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          {opLoading ? (
            <Skeleton className="h-10 w-48 bg-white/30" />
          ) : (
            <>
              <h1 className={`text-3xl md:text-4xl font-black ${textOnBg} mb-2`}>{operator?.name}</h1>
              <p className={`${subTextOnBg} font-medium`}>
                {bundles?.length ?? 0} forfaits disponibles
              </p>
            </>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {bundlesLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : !bundles?.length ? (
          <div className="text-center py-20 text-muted-foreground">
            <Wifi className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aucun forfait disponible pour le moment</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                className="group bg-card border border-card-border rounded-2xl p-5 hover:shadow-lg transition-all hover:-translate-y-1"
                data-testid={`card-bundle-${bundle.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: isMtn ? "rgba(255,215,0,0.15)" : "rgba(255,102,0,0.15)",
                      color: isMtn ? "#B8860B" : "#CC5200",
                    }}
                  >
                    {bundle.operatorName}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {bundle.validity} jours
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-black text-foreground mb-1">{bundle.dataSize}</div>
                  <div className="text-sm text-muted-foreground">{bundle.name}</div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black text-primary">{formatFCFA(bundle.price)}</div>
                    <div className="text-xs text-muted-foreground">Valide {bundle.validity} jours</div>
                  </div>
                  <button
                    onClick={() => handleBuyBundle(bundle.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 shadow-md"
                    style={{ background: gradient }}
                    data-testid={`button-buy-${bundle.id}`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Acheter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
