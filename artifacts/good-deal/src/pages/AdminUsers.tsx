import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, RefreshCw, Phone, ShoppingBag, Calendar,
  TrendingUp, Search, ChevronLeft, ChevronRight, Star, Users
} from "lucide-react";
import { formatFCFA, formatDate } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isAdminAuthenticated } from "./Ashtech";

function adminHeaders(): Record<string, string> {
  return { "X-Admin-Key": localStorage.getItem("gd_admin_pass") ?? "" };
}

type Client = {
  phone: string;
  totalOrders: number;
  paidOrders: number;
  totalSpent: number;
  firstOrder: string;
  lastOrder: string;
  operators: string[];
};

const PAGE_SIZE = 20;

const TABS = [
  { key: "all",    label: "Tous",   color: "gray"   },
  { key: "mtn",    label: "MTN",    color: "yellow" },
  { key: "orange", label: "Orange", color: "orange" },
  { key: "vip",    label: "VIP",    color: "purple" },
] as const;
type TabKey = typeof TABS[number]["key"];

const TAB_ACTIVE: Record<string, string> = {
  gray:   "bg-gray-900 text-white border-gray-900",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-300",
  orange: "bg-orange-50 text-orange-700 border-orange-300",
  purple: "bg-purple-50 text-purple-700 border-purple-300",
};

function isVip(c: Client) {
  return c.paidOrders >= 3 || c.totalSpent >= 3000;
}

export default function AdminUsers() {
  const [, setLocation] = useLocation();
  const isAdmin = isAdminAuthenticated();

  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [tab, setTab]           = useState<TabKey>("all");
  const [page, setPage]         = useState(1);

  useEffect(() => { if (!isAdmin) setLocation("/ashtech"); }, [isAdmin]);

  const fetchClients = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients", { headers: adminHeaders() });
      if (res.ok) setClients(await res.json());
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  if (!isAdmin) return null;

  // ── Stats (always on full list) ─────────────────────────────────────────────
  const totalSpentAll  = clients.reduce((s, c) => s + c.totalSpent, 0);
  const totalPaidAll   = clients.reduce((s, c) => s + c.paidOrders, 0);
  const vipCount       = clients.filter(isVip).length;

  // ── Filter + search ─────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const filtered = clients
    .filter(c => {
      if (tab === "mtn")    return c.operators.some(o => o.toLowerCase().includes("mtn"));
      if (tab === "orange") return c.operators.some(o => o.toLowerCase().includes("orange"));
      if (tab === "vip")    return isVip(c);
      return true;
    })
    .filter(c => !q || c.phone.includes(q));

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changeTab(t: TabKey) { setTab(t); setPage(1); }
  function changeSearch(v: string) { setSearch(v); setPage(1); }

  return (
    <div className="min-h-screen pt-20 pb-10 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setLocation("/ashtech/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-foreground">Clients</h1>
            <p className="text-xs text-muted-foreground">{clients.length} numéros enregistrés</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchClients} disabled={loading}
            className="text-blue-600 border-blue-200 hover:bg-blue-50 w-9 h-9 p-0 flex-shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { icon: Users,       bg: "bg-blue-50",   color: "text-blue-600",   label: "Clients",       value: `${clients.length}` },
            { icon: TrendingUp,  bg: "bg-green-50",  color: "text-green-600",  label: "Encaissé",      value: formatFCFA(totalSpentAll) },
            { icon: ShoppingBag, bg: "bg-orange-50", color: "text-orange-600", label: "Forfaits payés",value: `${totalPaidAll}` },
            { icon: Star,        bg: "bg-purple-50", color: "text-purple-600", label: "VIP (≥3 achat)",value: `${vipCount}` },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <div className="font-black text-sm text-foreground truncate">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => changeTab(t.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  tab === t.key ? TAB_ACTIVE[t.color] : "bg-white text-muted-foreground border-gray-200 hover:border-gray-300"
                }`}
              >
                {t.label}
                <span className="ml-1.5 opacity-50">
                  {t.key === "all"    ? clients.length :
                   t.key === "mtn"    ? clients.filter(c => c.operators.some(o => o.toLowerCase().includes("mtn"))).length :
                   t.key === "orange" ? clients.filter(c => c.operators.some(o => o.toLowerCase().includes("orange"))).length :
                   vipCount}
                </span>
              </button>
            ))}
          </div>

          {/* Search by phone */}
          <div className="relative flex-shrink-0 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => changeSearch(e.target.value)}
              placeholder="Rechercher un numéro…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-full border border-gray-200 bg-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Result count when filtering */}
        {(q || tab !== "all") && !loading && (
          <p className="text-xs text-muted-foreground mb-3">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
            {q ? ` pour "${q}"` : ""}
            {tab !== "all" ? ` · filtre : ${TABS.find(t => t.key === tab)?.label}` : ""}
          </p>
        )}

        {/* Client cards */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <Phone className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground text-sm">
              {q ? `Aucun client pour "${q}"` : "Aucun client dans cette catégorie"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginated.map((client, i) => {
              const globalIndex = (safePage - 1) * PAGE_SIZE + i + 1;
              const vip = isVip(client);
              const hasMtn    = client.operators.some(o => o.toLowerCase().includes("mtn"));
              const hasOrange = client.operators.some(o => o.toLowerCase().includes("orange"));

              return (
                <div key={client.phone} className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${
                  vip ? "border-purple-200" : "border-gray-100"
                }`}>
                  {vip && <div className="h-0.5 w-full bg-gradient-to-r from-purple-400 to-pink-400 -mt-4 mb-4 rounded-t-2xl" />}
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${
                      vip
                        ? "bg-gradient-to-br from-purple-500 to-pink-500"
                        : "bg-gradient-to-br from-orange-400 to-yellow-400"
                    }`}>
                      {vip ? <Star className="w-5 h-5" /> : `#${globalIndex}`}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-black text-foreground text-base">{client.phone}</span>
                        {vip && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">VIP</span>
                        )}
                        {hasMtn && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">MTN</span>
                        )}
                        {hasOrange && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Orange</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" />
                          <strong className="text-foreground">{client.paidOrders}</strong> forfait{client.paidOrders !== 1 ? "s" : ""} payé{client.paidOrders !== 1 ? "s" : ""}
                          {client.totalOrders !== client.paidOrders && (
                            <span className="text-yellow-600 ml-1">· {client.totalOrders - client.paidOrders} en attente</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Dernier : <strong className="text-foreground">{formatDate(client.lastOrder)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Spent */}
                    <div className="text-right flex-shrink-0">
                      <div className={`font-black ${vip ? "text-purple-600" : "text-green-600"}`}>{formatFCFA(client.totalSpent)}</div>
                      <div className="text-xs text-muted-foreground">dépensé</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-5 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
            <span className="text-xs text-muted-foreground">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-muted-foreground hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        safePage === p
                          ? "bg-gray-900 text-white"
                          : "border border-gray-200 text-muted-foreground hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-muted-foreground hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
