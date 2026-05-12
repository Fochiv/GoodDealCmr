import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Plus, Pencil, Trash2, ArrowLeft, Check, X, LogOut } from "lucide-react";
import { useListBundles, useCreateBundle, useUpdateBundle, useDeleteBundle, useListOperators, getListBundlesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatFCFA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { isAdminAuthenticated, setAdminAuth } from "./Ashtech";

interface BundleFormData {
  name: string; dataSize: string; validity: string; price: string; operatorId: string; active: boolean;
}
const emptyForm: BundleFormData = { name: "", dataSize: "", validity: "30", price: "", operatorId: "1", active: true };

export default function AdminBundles() {
  const [, setLocation] = useLocation();
  const isAdmin = isAdminAuthenticated();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => { if (!isAdmin) setLocation("/ashtech"); }, [isAdmin]);

  const { data: bundles, isLoading } = useListBundles();
  const { data: operators } = useListOperators();
  const createBundle = useCreateBundle();
  const updateBundle = useUpdateBundle();
  const deleteBundle = useDeleteBundle();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<BundleFormData>(emptyForm);

  if (!isAdmin) return null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBundlesQueryKey() });

  const handleSave = () => {
    if (!form.name || !form.dataSize || !form.validity || !form.price) {
      toast({ title: "Tous les champs sont requis", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name, dataSize: form.dataSize,
      validity: parseInt(form.validity), price: parseInt(form.price),
      operatorId: parseInt(form.operatorId), active: form.active,
    };
    if (editId !== null) {
      updateBundle.mutate({ id: editId, data: payload }, {
        onSuccess: () => { toast({ title: "Forfait modifié" }); invalidate(); setShowForm(false); setEditId(null); setForm(emptyForm); },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      });
    } else {
      createBundle.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Forfait créé" }); invalidate(); setShowForm(false); setForm(emptyForm); },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (bundle: any) => {
    setForm({ name: bundle.name, dataSize: bundle.dataSize, validity: String(bundle.validity), price: String(bundle.price), operatorId: String(bundle.operatorId), active: bundle.active });
    setEditId(bundle.id); setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer ce forfait ?")) return;
    deleteBundle.mutate({ id }, { onSuccess: () => { toast({ title: "Forfait supprimé" }); invalidate(); } });
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation("/ashtech/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground">Gérer les forfaits</h1>
          </div>
          <Button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }} className="gap-2" data-testid="button-add-bundle">
            <Plus className="w-4 h-4" /> Nouveau forfait
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setAdminAuth(false); setLocation("/ashtech"); }} className="text-red-500">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="font-bold text-foreground mb-4">{editId ? "Modifier" : "Nouveau forfait"}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nom</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Forfait Start MTN" /></div>
              <div className="space-y-1.5"><Label>Données</Label><Input value={form.dataSize} onChange={e => setForm(p => ({ ...p, dataSize: e.target.value }))} placeholder="2 Go" /></div>
              <div className="space-y-1.5"><Label>Validité (jours)</Label><Input type="number" value={form.validity} onChange={e => setForm(p => ({ ...p, validity: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Prix (FCFA)</Label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Opérateur</Label>
                <Select value={form.operatorId} onValueChange={v => setForm(p => ({ ...p, operatorId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{operators?.map(op => <SelectItem key={op.id} value={String(op.id)}>{op.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.active ? "true" : "false"} onValueChange={v => setForm(p => ({ ...p, active: v === "true" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Actif</SelectItem><SelectItem value="false">Inactif</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={handleSave} disabled={createBundle.isPending || updateBundle.isPending}><Check className="w-4 h-4 mr-2" />{editId ? "Enregistrer" : "Créer"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}><X className="w-4 h-4 mr-2" />Annuler</Button>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Forfait", "Opérateur", "Data", "Validité", "Prix", "Statut", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-6" /></td></tr>
                )) : bundles?.map(bundle => (
                  <tr key={bundle.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{bundle.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${bundle.operatorColor}20`, color: bundle.operatorColor ?? "#888" }}>{bundle.operatorName}</span>
                    </td>
                    <td className="px-4 py-3 font-bold">{bundle.dataSize}</td>
                    <td className="px-4 py-3 text-muted-foreground">{bundle.validity}j</td>
                    <td className="px-4 py-3 font-bold text-primary">{formatFCFA(bundle.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bundle.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{bundle.active ? "Actif" : "Inactif"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(bundle)} className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(bundle.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-destructive" /></button>
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
