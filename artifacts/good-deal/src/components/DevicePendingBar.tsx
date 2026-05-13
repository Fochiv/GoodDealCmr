import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Bell, ChevronRight, X, Loader2 } from "lucide-react";
import { formatRef } from "@/lib/api";

const DEVICE_PHONE_KEY = "gd_device_phone";
const DISMISS_KEY = "gd_device_bar_dismissed_until";
const ACTIVE_CHECKOUT_KEY = "gd_pending_payment";
const POLL_MS = 20_000;

interface Order {
  id: number;
  status: string;
  phoneNumber: string;
  totalAmount: number;
  bundle?: { dataSize?: string; operatorName?: string; operatorColor?: string };
}

export function saveDevicePhone(phone: string) {
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.length >= 8) {
    localStorage.setItem(DEVICE_PHONE_KEY, cleaned);
  }
}

export function getDevicePhone(): string | null {
  return localStorage.getItem(DEVICE_PHONE_KEY);
}

function isDismissed(): boolean {
  const until = localStorage.getItem(DISMISS_KEY);
  if (!until) return false;
  return Date.now() < parseInt(until);
}

function dismissFor(ms: number) {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + ms));
}

function hasActiveCheckout(): boolean {
  return !!localStorage.getItem(ACTIVE_CHECKOUT_KEY);
}

export function DevicePendingBar() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState<string | null>(null);
  const [pending, setPending] = useState<Order[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async (ph: string) => {
    if (hasActiveCheckout()) return; // PendingPaymentBar handles this
    try {
      const r = await fetch(`/api/orders/track?phone=${encodeURIComponent(ph)}`);
      if (!r.ok) return;
      const data: Order[] = await r.json();
      // Count: processing (Pixpay awaiting payment) + confirmed (payment done, admin delivering)
      const inProgress = data.filter(o =>
        o.status === "processing" ||
        o.status === "confirmed" ||
        (o.status === "pending" && (o as any).transactionId)
      );
      setPending(inProgress);
    } catch {}
  }, []);

  // Load phone from localStorage
  useEffect(() => {
    const load = () => {
      const ph = getDevicePhone();
      setPhone(ph);
      setDismissed(isDismissed());
      if (ph) {
        setLoading(true);
        check(ph).finally(() => setLoading(false));
      }
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("focus", load);
    };
  }, [check]);

  // Poll every 20s
  useEffect(() => {
    if (!phone) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => check(phone), POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phone, check]);

  const [location] = useLocation();
  const onOrdersPage = location === "/commandes" || location.startsWith("/commandes?");

  if (!phone || dismissed || pending.length === 0) return null;
  if (hasActiveCheckout()) return null; // already handled by PendingPaymentBar
  if (onOrdersPage) return null; // user can already see their orders

  const count = pending.length;

  // Determine dominant operator color from first pending order
  const firstBundle = pending[0]?.bundle;
  const isMtn = firstBundle?.operatorName?.toLowerCase().includes("mtn") ?? false;
  const color = isMtn ? "#B8860B" : "#CC4400";
  const bgColor = isMtn ? "#FFFBEB" : "#FFF7F0";
  const borderColor = isMtn ? "#FCD34D" : "#FDBA74";
  const accent = isMtn ? "#F59E0B" : "#F97316";

  const handleOpen = () => {
    setLocation(`/commandes?phone=${encodeURIComponent(phone)}`);
  };

  const handleDismiss = () => {
    dismissFor(60 * 60 * 1000); // dismiss for 1 hour
    setDismissed(true);
  };

  return (
    <div
      className="fixed left-3 right-3 z-40 rounded-2xl shadow-2xl border-2 overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
      style={{ bottom: "74px", borderColor, background: bgColor }}
    >
      {/* Pulsing top bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${borderColor})` }} />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Bell icon with badge */}
        <div className="relative flex-shrink-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: `${borderColor}60` }}
          >
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" style={{ color }} />
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
          <div className="text-sm font-black leading-tight" style={{ color }}>
            {count === 1
              ? "⏳ 1 paiement en attente"
              : `⏳ ${count} paiements en attente`}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color, opacity: 0.8 }}>
            {phone} · {pending[0]?.bundle?.dataSize ?? ""}
            {count > 1 ? ` +${count - 1} autre${count > 2 ? "s" : ""}` : ""}
          </div>
          <div className="text-[10px] mt-0.5 font-mono" style={{ color, opacity: 0.6 }}>
            {formatRef(pending[0].id)}{count > 1 ? ` …` : ""}
          </div>
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

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
