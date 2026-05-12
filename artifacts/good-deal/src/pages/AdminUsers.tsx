import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, RefreshCw, Phone, ShoppingBag, Calendar, TrendingUp } from "lucide-react";
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

export default function AdminUsers() {
  const [, setLocation] = useLocation();
  const isAdmin = isAdminAuthenticated();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

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

  const totalSpentAll = clients.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrdersAll = clients.reduce((s, c) => s + c.paidOrders, 0);

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
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-black text-foreground">{clients.length}</div>
              <div className="text-xs text-muted-foreground">Clients uniques</div>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="font-black text-foreground text-sm">{formatFCFA(totalSpentAll)}</div>
              <div className="text-xs text-muted-foreground">{totalOrdersAll} forfaits payés</div>
            </div>
          </div>
        </div>

        {/* Client cards */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <Phone className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Aucun client pour l'instant</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client, i) => (
              <div key={client.phone} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    #{i + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-foreground text-base">{client.phone}</span>
                      {client.operators.map(op => (
                        <span key={op} className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          op.toLowerCase().includes("mtn")
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-orange-100 text-orange-700"
                        }`}>{op.includes("MTN") ? "MTN" : "Orange"}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" />
                        <strong className="text-foreground">{client.paidOrders}</strong> forfait{client.paidOrders > 1 ? "s" : ""} payé{client.paidOrders > 1 ? "s" : ""}
                        {client.totalOrders !== client.paidOrders && (
                          <span className="text-yellow-600">· {client.totalOrders - client.paidOrders} en attente</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        1er achat : <strong className="text-foreground">{formatDate(client.firstOrder)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Spent */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-green-600">{formatFCFA(client.totalSpent)}</div>
                    <div className="text-xs text-muted-foreground">dépensé</div>
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
