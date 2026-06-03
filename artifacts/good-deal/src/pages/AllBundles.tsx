import { useState } from "react";
import { useLocation } from "wouter";
import { Calendar, Wifi, SlidersHorizontal } from "lucide-react";
import { useListBundles, getListBundlesQueryKey } from "@workspace/api-client-react";
import { formatFCFA } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type Filter = "tous" | "mtn" | "orange";
type SortKey = "price_asc" | "price_desc" | "data_asc" | "validity_asc";

export default function AllBundles() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<Filter>("tous");
  const [sort, setSort] = useState<SortKey>("price_asc");
  const [showSort, setShowSort] = useState(false);

  const { data: all, isLoading } = useListBundles(
    { active: true },
    { query: { queryKey: getListBundlesQueryKey({ active: true }) } }
  );

  const filtered = (all ?? []).filter(b => {
    if (filter === "mtn") return b.operatorSlug === "mtn";
    if (filter === "orange") return b.operatorSlug === "orange";
    return true;
  });

  const parseDataMb = (s: string): number => {
    const n = parseFloat(s);
    if (s.toLowerCase().includes("go")) return n * 1024;
    return n;
  };

  const sorted = [...filtered].sort((a, b) => {
    if (filter === "tous" && a.operatorSlug !== b.operatorSlug) {
      return a.operatorSlug === "mtn" ? -1 : 1;
    }
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "data_asc") return parseDataMb(a.dataSize) - parseDataMb(b.dataSize);
    if (sort === "validity_asc") return a.validity - b.validity;
    return 0;
  });

  const mtnCount = (all ?? []).filter(b => b.operatorSlug === "mtn").length;
  const orangeCount = (all ?? []).filter(b => b.operatorSlug === "orange").length;

  const sortLabels: Record<SortKey, string> = {
    price_asc: "Prix croissant",
    price_desc: "Prix décroissant",
    data_asc: "Data croissante",
    validity_asc: "Validité courte",
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-24 md:pb-8">
      {/* Header — style orange.cm : blanc avec bordure orange en bas */}
      <div className="bg-white border-b-4 border-orange-500 py-6 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Tous les forfaits</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              MTN &amp; Orange · {all?.length ?? 0} forfaits disponibles
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filter + Sort */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex bg-white border border-gray-200 rounded-sm overflow-hidden shadow-sm">
            {(["tous", "mtn", "orange"] as Filter[]).map(f => {
              const labels: Record<Filter, string> = {
                tous: `Tous (${all?.length ?? 0})`,
                mtn: `MTN (${mtnCount})`,
                orange: `Orange (${orangeCount})`,
              };
              const isActive = filter === f;
              const activeBg: Record<Filter, string> = {
                tous: "#1a1a1a",
                mtn: "#FFD700",
                orange: "#FF6600",
              };
              const activeText: Record<Filter, string> = {
                tous: "white",
                mtn: "#1a1a1a",
                orange: "white",
              };
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-4 py-2 text-sm font-bold transition-all border-r border-gray-200 last:border-r-0"
                  style={isActive
                    ? { background: activeBg[f], color: activeText[f] }
                    : { background: "white", color: "#555" }
                  }
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSort(s => !s)}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-sm px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              {sortLabels[sort]}
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-sm shadow-lg z-20 overflow-hidden">
                {(Object.entries(sortLabels) as [SortKey, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSort(key); setShowSort(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gray-50 last:border-0"
                    style={sort === key
                      ? { background: "#FFF0E6", color: "#FF6600", fontWeight: 700 }
                      : { color: "#333" }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bundle grid — style orange.cm */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <Wifi className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-400">Aucun forfait disponible</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map(bundle => {
              const isMtn = bundle.operatorSlug === "mtn";
              const accentColor = isMtn ? "#FFD700" : "#FF6600";
              const priceColor = isMtn ? "#B8860B" : "#FF6600";
              const btnBg = isMtn ? "#FFD700" : "#FF6600";
              const btnText = isMtn ? "#1a1a1a" : "white";

              return (
                <div
                  key={bundle.id}
                  className="bg-white border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  style={{ borderLeft: `4px solid ${accentColor}` }}
                >
                  <div className="p-4">
                    {/* Top: operator badge + validity */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-sm"
                        style={{
                          background: isMtn ? "rgba(255,215,0,0.2)" : "rgba(255,102,0,0.12)",
                          color: isMtn ? "#B8860B" : "#FF6600",
                        }}
                      >
                        {bundle.operatorName}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {bundle.validity} jours
                      </span>
                    </div>

                    {/* Data size — gros et gras */}
                    <div className="text-4xl font-black text-gray-900 leading-none mb-1">
                      {bundle.dataSize}
                    </div>
                    <div className="text-sm text-gray-500 mb-4">{bundle.name}</div>

                    {/* Prix — très grand, couleur opérateur */}
                    <div
                      className="text-3xl font-black mb-1"
                      style={{ color: priceColor }}
                    >
                      {formatFCFA(bundle.price)}
                    </div>
                    <div className="text-xs text-gray-400 mb-4">Valide {bundle.validity} jours</div>

                    {/* Bouton Acheter — plat, solide, style orange.cm */}
                    <button
                      onClick={() => setLocation(`/checkout?bundleId=${bundle.id}`)}
                      className="w-full py-2.5 font-bold text-sm transition-opacity hover:opacity-90 active:opacity-75"
                      style={{ background: btnBg, color: btnText, borderRadius: "4px" }}
                    >
                      Acheter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* "Voir tous" CTA — style orange.cm (bouton noir) */}
        {!isLoading && sorted.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setFilter("tous")}
              className="w-full max-w-lg py-3.5 font-bold text-white text-sm transition-opacity hover:opacity-90"
              style={{ background: "#1a1a1a", borderRadius: "4px" }}
            >
              Voir tous les forfaits disponibles
            </button>
          </div>
        )}

        {/* Tableau de comparaison */}
        {!isLoading && sorted.length > 0 && (
          <div className="mt-6 bg-white border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">Comparer rapidement</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-2 px-4 font-semibold text-gray-500">Forfait</th>
                    <th className="text-left py-2 px-4 font-semibold text-gray-500">Opérateur</th>
                    <th className="text-left py-2 px-4 font-semibold text-gray-500">Data</th>
                    <th className="text-left py-2 px-4 font-semibold text-gray-500">Validité</th>
                    <th className="text-left py-2 px-4 font-semibold text-gray-500">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(b => {
                    const isMtn = b.operatorSlug === "mtn";
                    return (
                      <tr
                        key={b.id}
                        className="border-b border-gray-50 hover:bg-orange-50 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/checkout?bundleId=${b.id}`)}
                      >
                        <td className="py-2.5 px-4 font-medium text-gray-800">{b.name}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className="px-2 py-0.5 rounded-sm text-xs font-bold"
                            style={{
                              background: isMtn ? "rgba(255,215,0,0.2)" : "rgba(255,102,0,0.12)",
                              color: isMtn ? "#B8860B" : "#FF6600",
                            }}
                          >
                            {b.operatorName}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-gray-900">{b.dataSize}</td>
                        <td className="py-2.5 px-4 text-gray-500">{b.validity}j</td>
                        <td className="py-2.5 px-4 font-black" style={{ color: isMtn ? "#B8860B" : "#FF6600" }}>
                          {formatFCFA(b.price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
