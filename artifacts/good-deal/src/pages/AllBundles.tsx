import { useState } from "react";
import { useLocation } from "wouter";
import { ShoppingCart, Calendar, Wifi, SlidersHorizontal } from "lucide-react";
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
    // Quand on affiche tous les forfaits, MTN toujours avant Orange
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
      {/* Header banner */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 pt-8 pb-10 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-1">Tous les forfaits</h1>
          <p className="text-white/90 font-medium text-sm">
            MTN &amp; Orange · {all?.length ?? 0} forfaits disponibles
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-4">
        {/* Filter tabs */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1">
            {(["tous", "mtn", "orange"] as Filter[]).map(f => {
              const labels: Record<Filter, string> = {
                tous: `Tous (${all?.length ?? 0})`,
                mtn: `MTN (${mtnCount})`,
                orange: `Orange (${orangeCount})`,
              };
              const activeStyle: Record<Filter, string> = {
                tous: "bg-foreground text-white",
                mtn: "bg-yellow-400 text-gray-900",
                orange: "bg-orange-500 text-white",
              };
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    isActive ? activeStyle[f] : "text-muted-foreground hover:bg-gray-100"
                  }`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSort(s => !s)}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              {sortLabels[sort]}
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {(Object.entries(sortLabels) as [SortKey, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSort(key); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      sort === key
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-gray-50 text-foreground font-medium"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bundle grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <Wifi className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-muted-foreground">Aucun forfait disponible</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map(bundle => {
              const isMtn = bundle.operatorSlug === "mtn";
              const gradient = isMtn
                ? "linear-gradient(135deg,#FFD700,#FFA500)"
                : "linear-gradient(135deg,#FF6600,#FF8000)";
              const badgeBg = isMtn ? "rgba(255,215,0,0.15)" : "rgba(255,102,0,0.15)";
              const badgeColor = isMtn ? "#B8860B" : "#CC5200";

              return (
                <div
                  key={bundle.id}
                  className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  {/* Operator stripe */}
                  <div
                    className="h-1.5 w-full"
                    style={{ background: gradient }}
                  />

                  <div className="p-5">
                    {/* Operator badge + validity */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: badgeBg, color: badgeColor }}
                      >
                        {bundle.operatorName}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {bundle.validity} jours
                      </span>
                    </div>

                    {/* Data size — star of the show */}
                    <div className="mb-1">
                      <span className="text-4xl font-black text-foreground">{bundle.dataSize}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-5">{bundle.name}</div>

                    {/* Price + CTA */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-black" style={{ color: isMtn ? "#B8860B" : "#CC5200" }}>
                          {formatFCFA(bundle.price)}
                        </div>
                        <div className="text-xs text-muted-foreground">Valide {bundle.validity} jours</div>
                      </div>
                      <button
                        onClick={() => setLocation(`/checkout?bundleId=${bundle.id}`)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-md"
                        style={{ background: gradient, color: isMtn ? "#1a1a1a" : "white" }}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Acheter
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Comparison hint */}
        {!isLoading && sorted.length > 0 && (
          <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-foreground mb-3 text-sm">Comparer rapidement</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Forfait</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Opérateur</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Data</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Validité</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Prix</th>
                    <th className="text-left py-2 font-semibold text-muted-foreground">Mo/FCFA</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(b => {
                    const isMtn = b.operatorSlug === "mtn";
                    const mb = parseDataMb(b.dataSize);
                    const ratio = b.price > 0 ? (mb / b.price).toFixed(2) : "—";
                    return (
                      <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setLocation(`/checkout?bundleId=${b.id}`)}>
                        <td className="py-2.5 pr-4 font-medium text-foreground">{b.name}</td>
                        <td className="py-2.5 pr-4">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{
                              background: isMtn ? "rgba(255,215,0,0.15)" : "rgba(255,102,0,0.15)",
                              color: isMtn ? "#B8860B" : "#CC5200",
                            }}
                          >
                            {b.operatorName}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-bold text-foreground">{b.dataSize}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{b.validity}j</td>
                        <td className="py-2.5 pr-4 font-bold" style={{ color: isMtn ? "#B8860B" : "#CC5200" }}>
                          {formatFCFA(b.price)}
                        </td>
                        <td className="py-2.5 text-muted-foreground text-xs">{ratio} Mo/F</td>
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
