import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Pencil, Trash2, ArrowLeft, Check, X } from "lucide-react";
import { useListBundles, useCreateBundle, useUpdateBundle, useDeleteBundle, useListOperators, getListBundlesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { formatFCFA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface BundleFormData {
  name: string;
  dataSize: string;
  validity: string;
  price: string;
  operatorId: string;
  active: boolean;
}

const emptyForm: BundleFormData = { name: "", dataSize: "", validity: "30", price: "", operatorId: "1", active: true };

export default function AdminBundles() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bundles, isLoading } = useListBundles();
  const { data: operators } = useListOperators();
  const createBundle = useCreateBundle();
  const updateBundle = useUpdateBundle();
  const deleteBundle = useDeleteBundle();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<BundleFormData>(emptyForm);

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Accès réservé aux administrateurs.</p>
          <Button onClick={() => setLocation("/")}>Retour</Button>
        </div>
      </div>
    );
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBundlesQueryKey() });

  const handleSave = () => {
    const payload = {
      name: form.name,
      dataSize: form.dataSize,
      validity: parseInt(form.validity),
      price: parseInt(form.price),
      operatorId: parseInt(form.operatorId),
      active: form.active,
    };

    if (!form.name || !form.dataSize || !form.validity || !form.price) {
      toast({ title: "Champs requis", description: "Tous les champs sont obligatoires.", variant: "destructive" });
      return;
    }

    if (editId !== null) {
      updateBundle.mutate({ id: editId, data: payload }, {
        onSuccess: () => {
          toast({ title: "Forfait modifié" });
          invalidate();
          setShowForm(false);
          setEditId(null);
          setForm(emptyForm);
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      });
    } else {
      createBundle.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Forfait créé" });
          invalidate();
          setShowForm(false);
          setForm(emptyForm);
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (bundle: any) => {
    setForm({
      name: bundle.name,
      dataSize: bundle.dataSize,
      validity: String(bundle.validity),
      price: String(bundle.price),
      operatorId: String(bundle.operatorId),
      active: bundle.active,
    });
    setEditId(bundle.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer ce forfait ?")) return;
    deleteBundle.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Forfait supprimé" });
        invalidate();
      },
    });
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation("/admin")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground">Gérer les forfaits</h1>
          </div>
          <Button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="gap-2" data-testid="button-add-bundle">
            <Plus className="w-4 h-4" />
            Nouveau forfait
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-card border border-card-border rounded-xl p-6 mb-6">
            <h2 className="font-bold text-foreground mb-4">{editId ? "Modifier le forfait" : "Nouveau forfait"}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Forfait Start MTN" data-testid="input-bundle-name" />
              </div>
              <div className="space-y-1.5">
                <Label>Taille de données</Label>
                <Input value={form.dataSize} onChange={e => setForm(p => ({ ...p, dataSize: e.target.value }))} placeholder="2 Go" data-testid="input-bundle-data" />
              </div>
              <div className="space-y-1.5">
                <Label>Validité (jours)</Label>
                <Input type="number" value={form.validity} onChange={e => setForm(p => ({ ...p, validity: e.target.value }))} placeholder="30" data-testid="input-bundle-validity" />
              </div>
              <div className="space-y-1.5">
                <Label>Prix (FCFA)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="1000" data-testid="input-bundle-price" />
              </div>
              <div className="space-y-1.5">
                <Label>Opérateur</Label>
                <Select value={form.operatorId} onValueChange={v => setForm(p => ({ ...p, operatorId: v }))}>
                  <SelectTrigger data-testid="select-operator">
                    <SelectValue placeholder="Opérateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators?.map(op => (
                      <SelectItem key={op.id} value={String(op.id)}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.active ? "true" : "false"} onValueChange={v => setForm(p => ({ ...p, active: v === "true" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Actif</SelectItem>
                    <SelectItem value="false">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={handleSave} disabled={createBundle.isPending || updateBundle.isPending} data-testid="button-save-bundle">
                <Check className="w-4 h-4 mr-2" />
                {editId ? "Enregistrer" : "Créer"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Bundles table */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Forfait</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Opérateur</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Validité</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Prix</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-6" /></td></tr>
                  ))
                ) : bundles?.map(bundle => (
                  <tr key={bundle.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-bundle-${bundle.id}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{bundle.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: `${bundle.operatorColor}20`, color: bundle.operatorColor ?? "#888" }}>
                        {bundle.operatorName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground font-bold">{bundle.dataSize}</td>
                    <td className="px-4 py-3 text-muted-foreground">{bundle.validity} jours</td>
                    <td className="px-4 py-3 font-bold text-primary">{formatFCFA(bundle.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bundle.active ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                        {bundle.active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(bundle)} className="p-1.5 rounded hover:bg-muted" data-testid={`button-edit-bundle-${bundle.id}`}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(bundle.id)} className="p-1.5 rounded hover:bg-destructive/10" data-testid={`button-delete-bundle-${bundle.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
