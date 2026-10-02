import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Bell, ChevronRight, X, Loader2, Package } from "lucide-react";
import { formatRef } from "@/lib/api";

const ACTIVE_CHECKOUT_KEY = "gd_pending_payment";
const POLL_MS = 15_000;

interface ActiveOrder {
  id: number;
  status: string;
  phoneNumber: string;
  totalAmount: number;
  bundle?: { dataSize?: string; operatorName?: string; operatorColor?: string };
}

export function saveDevicePhone(phone: string) {
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.length >= 8) {
    localStorage.setItem("gd_device_phone", cleaned);
  }
}

export function getDevicePhone(): string | null {
  return localStorage.getItem("gd_device_phone");
}

function hasActiveCheckout(): boolean {
  return !!localStorage.getItem(ACTIVE_CHECKOUT_KEY);
}

export function DevicePendingBar() {
  const [, setLocation] = useLocation();
  // dismissed is session-only (resets on every page refresh — intentional)
  const [dismissed, setDismissed] = useState(false);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActive = useCallback(async () => {
    if (hasActiveCheckout()) return; // PendingPaymentBar handles this case
    try {
      const r = await fetch("/api/orders/active-for-ip");
      if (!r.ok) return;
      const data: ActiveOrder[] = await r.json();
      setOrders(data);
    } catch {}
  }, []);

  // On mount: always fetch (no cached dismiss — reappears after each refresh)
  useEffect(() => {
    setLoading(true);
    fetchActive().finally(() => setLoading(false));
  }, [fetchActive]);

  // Poll every 15s
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchActive, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchActive]);

  // Re-check when tab regains focus
  useEffect(() => {
    const onFocus = () => fetchActive();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchActive]);

  const [location] = useLocation();
  const onOrdersPage = location === "/commandes" || location.startsWith("/commandes?");

  if (dismissed) return null;
  if (orders.length === 0 && !loading) return null;
  if (hasActiveCheckout()) return null;
  if (onOrdersPage) return null;

  // Separate delivering (confirmed) from processing (awaiting Mobile Money confirmation)
  const delivering  = orders.filter(o => o.status === "confirmed");
  const processing  = orders.filter(o => o.status !== "confirmed");
  const count       = orders.length;

  // Pick the dominant order for display (delivering takes priority)
  const primary     = delivering[0] ?? processing[0];
  const isDelivery  = !!delivering.length;

  const isMtn       = primary?.bundle?.operatorName?.toLowerCase().includes("mtn") ?? false;
  const color       = isDelivery ? "#1D4ED8"   : isMtn ? "#B8860B"  : "#CC5200";
  const bgColor     = isDelivery ? "#EFF6FF"   : isMtn ? "#FFFBEB"  : "#FFF7F0";
  const borderColor = isDelivery ? "#BFDBFE"   : isMtn ? "#FCD34D"  : "#FDBA74";
  const accent      = isDelivery ? "#3B82F6"   : isMtn ? "#F59E0B"  : "#F97316";

  const handleOpen = () => {
    const phone = primary?.phoneNumber;
    setLocation(phone ? `/commandes?phone=${encodeURIComponent(phone)}` : "/commandes");
  };

  const title = loading && orders.length === 0
    ? "Vérification en cours…"
    : isDelivery
    ? delivering.length === 1
      ? "📦 Forfait en cours de livraison"
      : `📦 ${delivering.length} forfaits en livraison`
    : count === 1
    ? "⏳ 1 paiement en attente"
    : `⏳ ${count} paiements en attente`;

  const subtitle = loading && orders.length === 0
    ? "Recherche de vos commandes actives…"
    : `${primary?.phoneNumber ?? ""} · ${primary?.bundle?.dataSize ?? ""}`
      + (count > 1 ? ` +${count - 1} autre${count > 2 ? "s" : ""}` : "");

  return (
    <div
      className="fixed left-3 right-3 z-40 rounded-2xl shadow-2xl border-2 overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
      style={{ bottom: "74px", borderColor, background: bgColor }}
    >
      {/* Animated top bar */}
      <div className="h-1 w-full overflow-hidden" style={{ background: `${accent}30` }}>
        <div
          className="h-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            animation: "moveStripe 2s ease-in-out infinite",
            width: "50%",
          }}
        />
        <style>{`@keyframes moveStripe { 0%{margin-left:-50%} 100%{margin-left:150%} }`}</style>
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon with badge */}
        <div className="relative flex-shrink-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: `${borderColor}60` }}
          >
            {loading && orders.length === 0
              ? <Loader2 className="w-5 h-5 animate-spin" style={{ color }} />
              : isDelivery
              ? <Package className="w-5 h-5 animate-pulse" style={{ color }} />
              : <Bell className="w-5 h-5" style={{ color }} />
            }
          </div>
          {count > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center text-white"
              style={{ background: accent }}
            >
              {count}
            </span>
          )}
        </div>

        {/* Text */}
        <button onClick={handleOpen} className="flex-1 text-left min-w-0">
          <div className="text-sm font-black leading-tight truncate" style={{ color }}>
            {title}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color, opacity: 0.8 }}>
            {subtitle}
          </div>
          {primary && (
            <div className="text-[10px] mt-0.5 font-mono" style={{ color, opacity: 0.55 }}>
              {formatRef(primary.id)}{count > 1 ? " …" : ""}
            </div>
          )}
        </button>

        {/* Voir button */}
        <button
          onClick={handleOpen}
          className="flex items-center gap-0.5 text-xs font-bold flex-shrink-0 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 mr-1"
          style={{ background: `${borderColor}40`, color }}
        >
          Voir
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Dismiss — session only, reappears on next refresh */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-black/5 transition-colors"
          title="Masquer (jusqu'au prochain chargement)"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
