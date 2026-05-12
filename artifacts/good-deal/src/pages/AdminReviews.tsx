import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Star, Check, X, Clock, ChevronLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdminAuthenticated } from "./Ashtech";

type Review = {
  id: number;
  name: string;
  phone: string;
  stars: number;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

const TAB_FILTERS = [
  { key: "pending", label: "En attente", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { key: "approved", label: "Approuvés", color: "text-green-600 bg-green-50 border-green-200" },
  { key: "rejected", label: "Rejetés", color: "text-red-600 bg-red-50 border-red-200" },
] as const;

function getAdminHeaders(): Record<string, string> {
  const pass = localStorage.getItem("gd_admin_pass") ?? "";
  return { "X-Admin-Key": pass };
}

export default function AdminReviews() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isAdmin = isAdminAuthenticated();

  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) setLocation("/ashtech");
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchReviews();
  }, [tab, isAdmin]);

  async function fetchReviews() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${tab}`, {
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error();
      setReviews(await res.json());
    } catch {
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: number, status: "approved" | "rejected") {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast({
        title: status === "approved" ? "Avis approuvé ✅" : "Avis rejeté",
        description: status === "approved" ? "Il sera affiché sur la page d'accueil." : "L'avis ne sera pas publié.",
      });
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  if (!isAdmin) return null;

  const counts = { pending: 0, approved: 0, rejected: 0 };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/ashtech/dashboard")} className="gap-1">
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Modération des avis
            </h1>
            <p className="text-sm text-muted-foreground">Approuvez ou rejetez les avis clients avant publication</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {TAB_FILTERS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                tab === t.key ? t.color : "text-muted-foreground bg-white border-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground font-medium">Aucun avis {tab === "pending" ? "en attente" : tab === "approved" ? "approuvé" : "rejeté"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <div key={review.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                      {review.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm">{review.name}</div>
                      <div className="text-xs text-muted-foreground">{review.phone}</div>
                    </div>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    {Array.from({ length: review.stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                    {Array.from({ length: 5 - review.stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-gray-200" />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed mb-4 bg-gray-50 rounded-xl px-4 py-3 italic">
                  "{review.message}"
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(review.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>

                  {tab === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(review.id, "rejected")}
                        disabled={actionLoading === review.id}
                        className="gap-1 text-red-600 border-red-200 hover:bg-red-50 text-xs h-8"
                      >
                        <X className="w-3.5 h-3.5" />
                        Rejeter
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAction(review.id, "approved")}
                        disabled={actionLoading === review.id}
                        className="gap-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approuver
                      </Button>
                    </div>
                  )}

                  {tab === "approved" && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Publié
                    </span>
                  )}
                  {tab === "rejected" && (
                    <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-3 py-1 rounded-full flex items-center gap-1">
                      <X className="w-3 h-3" /> Rejeté
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
