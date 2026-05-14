import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Star, Check, X, Clock, ChevronLeft, MessageSquare, Pencil, Trash2, Plus } from "lucide-react";
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

type EditForm = {
  name: string;
  phone: string;
  stars: number;
  message: string;
  status: "pending" | "approved" | "rejected";
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

function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star className={`w-5 h-5 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
        </button>
      ))}
    </div>
  );
}

function EditModal({
  review,
  isNew,
  onClose,
  onSave,
}: {
  review: EditForm & { id?: number };
  isNew: boolean;
  onClose: () => void;
  onSave: (data: EditForm) => Promise<void>;
}) {
  const [form, setForm] = useState<EditForm>({
    name: review.name,
    phone: review.phone,
    stars: review.stars,
    message: review.message,
    status: review.status,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        <h2 className="text-lg font-black text-foreground mb-5">
          {isNew ? "Créer un avis" : "Modifier l'avis"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Nom</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="Ex: Jean-Pierre K."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Téléphone</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="Ex: 690***432"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Note</label>
            <StarSelector value={form.stars} onChange={n => setForm(f => ({ ...f, stars: n }))} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Message</label>
            <textarea
              required
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              placeholder="Contenu de l'avis..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Statut</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as EditForm["status"] }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="approved">Approuvé (visible sur le site)</option>
              <option value="pending">En attente</option>
              <option value="rejected">Rejeté</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? "Enregistrement..." : isNew ? "Créer l'avis" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminReviews() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isAdmin = isAdminAuthenticated();

  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editingReview, setEditingReview] = useState<(Review & { isNew?: boolean }) | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

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

  async function handleStatusChange(id: number, status: "approved" | "rejected") {
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

  async function handleSave(data: EditForm) {
    if (!editingReview) return;
    try {
      if (editingReview.isNew) {
        const res = await fetch("/api/admin/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAdminHeaders() },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error();
        toast({ title: "Avis créé ✅", description: data.status === "approved" ? "Visible sur la page d'accueil." : "Enregistré." });
      } else {
        const res = await fetch(`/api/admin/reviews/${editingReview.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAdminHeaders() },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error();
        toast({ title: "Avis modifié ✅" });
      }
      setEditingReview(null);
      fetchReviews();
    } catch {
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Avis supprimé" });
      setReviews(prev => prev.filter(r => r.id !== id));
      setDeleteConfirm(null);
    } catch {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gray-50">
      {editingReview && (
        <EditModal
          review={
            editingReview.isNew
              ? { id: undefined, name: "", phone: "", stars: 5, message: "", status: "approved" }
              : editingReview
          }
          isNew={!!editingReview.isNew}
          onClose={() => setEditingReview(null)}
          onSave={handleSave}
        />
      )}

      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/ashtech/dashboard")} className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-xl font-black text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Modération des avis
              </h1>
              <p className="text-sm text-muted-foreground">Gérez les avis clients affichés sur la page d'accueil</p>
            </div>
          </div>
          <Button
            onClick={() => setEditingReview({ id: 0, name: "", phone: "", stars: 5, message: "", status: "approved", createdAt: "", isNew: true })}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nouvel avis
          </Button>
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
            <p className="text-muted-foreground font-medium">
              Aucun avis {tab === "pending" ? "en attente" : tab === "approved" ? "approuvé" : "rejeté"}
            </p>
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

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Modifier */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingReview(review)}
                      disabled={actionLoading === review.id}
                      className="gap-1 text-xs h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier
                    </Button>

                    {/* Supprimer */}
                    {deleteConfirm === review.id ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs h-8 px-2"
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDelete(review.id)}
                          disabled={actionLoading === review.id}
                          className="gap-1 text-xs h-8 bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Confirmer
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(review.id)}
                        disabled={actionLoading === review.id}
                        className="gap-1 text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </Button>
                    )}

                    {/* Changer statut */}
                    {tab === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(review.id, "rejected")}
                          disabled={actionLoading === review.id}
                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50 text-xs h-8"
                        >
                          <X className="w-3.5 h-3.5" />
                          Rejeter
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(review.id, "approved")}
                          disabled={actionLoading === review.id}
                          className="gap-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approuver
                        </Button>
                      </>
                    )}

                    {tab === "approved" && (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Publié
                      </span>
                    )}
                    {tab === "rejected" && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(review.id, "approved")}
                        disabled={actionLoading === review.id}
                        className="gap-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Republier
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
