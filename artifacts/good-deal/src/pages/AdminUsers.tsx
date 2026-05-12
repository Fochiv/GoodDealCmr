import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Shield, User, LogOut } from "lucide-react";
import { useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isAdminAuthenticated, setAdminAuth } from "./Ashtech";

export default function AdminUsers() {
  const [, setLocation] = useLocation();
  const isAdmin = isAdminAuthenticated();

  useEffect(() => { if (!isAdmin) setLocation("/ashtech"); }, [isAdmin]);

  const { data: users, isLoading } = useListUsers({
    query: { enabled: isAdmin, queryKey: getListUsersQueryKey() }
  });

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation("/ashtech/dashboard")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black text-foreground">Utilisateurs</h1>
          <span className="ml-auto text-sm text-muted-foreground">{users?.length ?? 0} utilisateurs</span>
          <Button variant="ghost" size="sm" onClick={() => { setAdminAuth(false); setLocation("/ashtech"); }} className="text-red-500">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Utilisateur", "Email", "Téléphone", "Rôle", "Inscrit le"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-6" /></td></tr>
                )) : !users?.length ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucun utilisateur</td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">{user.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${user.role === "admin" ? "bg-primary/10 text-primary" : "bg-gray-100 text-muted-foreground"}`}>
                        {user.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
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
