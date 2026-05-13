import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, ChevronRight, X, CheckCircle2, XCircle, Package } from "lucide-react";

export interface PendingPayment {
  orderId: number;
  recipientPhone: string;
  dataSize: string;
  operatorName: string;
  operatorColor: string;
  isMtn: boolean;
  paymentMethod: string;
  amount: number;
  timestamp: number;
}

const STORAGE_KEY = "gd_pending_payment";

export function savePendingPayment(p: PendingPayment) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function clearPendingPayment() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadPendingPayment(): PendingPayment | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingPayment;
    // Expire after 60 minutes (extended for delivery window)
    if (Date.now() - p.timestamp > 60 * 60 * 1000) {
      clearPendingPayment();
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

type FinalStatus = "confirmed" | "paid" | "failed";

export function PendingPaymentBar() {
  const [, setLocation] = useLocation();
  const [payment, setPayment] = useState<PendingPayment | null>(null);
  const [finalStatus, setFinalStatus] = useState<FinalStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [pulse, setPulse] = useState(0);
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from localStorage on mount + listen for storage changes
  useEffect(() => {
    const load = () => {
      const p = loadPendingPayment();
      setPayment(p);
      setDismissed(false);
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  // Animate pulsing bar
  useEffect(() => {
    pulseRef.current = setInterval(() => setPulse(p => (p + 1) % 100), 30);
    return () => { if (pulseRef.current) clearInterval(pulseRef.current); };
  }, []);

  // Check status + subscribe to SSE for real-time updates
  useEffect(() => {
    if (!payment || finalStatus === "paid" || finalStatus === "failed") return;

    let es: EventSource | null = null;
    let cancelled = false;

    function handleStatus(status: string) {
      if (cancelled) return;
      if (status === "confirmed") {
        setFinalStatus("confirmed");
        // Don't dismiss — keep showing "En cours de livraison"
      } else if (status === "paid") {
        setFinalStatus("paid");
        clearPendingPayment();
        es?.close();
        setTimeout(() => { if (!cancelled) { setDismissed(true); setPayment(null); } }, 5000);
      } else if (status === "failed" || status === "cancelled") {
        setFinalStatus("failed");
        clearPendingPayment();
        es?.close();
        setTimeout(() => { if (!cancelled) { setDismissed(true); setPayment(null); } }, 6000);
      }
    }

    function openSSE() {
      es = new EventSource(`/api/orders/${payment!.orderId}/events`);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as { status: string };
          handleStatus(data.status);
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        if (!cancelled) scheduleRetry();
      };
    }

    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    function scheduleRetry() {
      retryTimer = setTimeout(() => checkCurrent(), 3000);
    }

    async function checkCurrent() {
      if (cancelled) return;
      try {
        const r = await fetch(`/api/orders/${payment!.orderId}`);
        if (!r.ok) { scheduleRetry(); return; }
        const data = await r.json() as { status: string };
        if (data.status === "confirmed" || data.status === "paid" || data.status === "failed" || data.status === "cancelled") {
          handleStatus(data.status);
          if (data.status !== "confirmed") return; // terminal for paid/failed — SSE not needed
        }
        openSSE();
      } catch {
        scheduleRetry();
      }
    }

    checkCurrent();

    return () => {
      cancelled = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [payment?.orderId, finalStatus]);

  if (!payment || dismissed) return null;

  // ── Colors based on mode ──────────────────────────────────────────────────
  const isDelivering = finalStatus === "confirmed";
  const isPaid       = finalStatus === "paid";
  const isFailed     = finalStatus === "failed";
  const isPending    = !finalStatus || finalStatus === null;

  // Blue for delivery mode, operator color for payment pending
  const color       = isPaid ? "#15803D" : isFailed ? "#B91C1C" : isDelivering ? "#1D4ED8" : payment.isMtn ? "#B8860B" : "#CC4400";
  const bgColor     = isPaid ? "#F0FDF4" : isFailed ? "#FFF1F2" : isDelivering ? "#EFF6FF" : payment.isMtn ? "#FFFBEB" : "#FFF7F0";
  const borderColor = isPaid ? "#86EFAC" : isFailed ? "#FCA5A5" : isDelivering ? "#BFDBFE" : payment.isMtn ? "#FCD34D" : "#FDBA74";
  const barFrom     = isDelivering ? "#3B82F6" : payment.isMtn ? "#F59E0B" : "#F97316";
  const barTo       = isDelivering ? "#60A5FA" : payment.isMtn ? "#FCD34D" : "#FB923C";

  const barWidth = 30 + 40 * Math.abs(Math.sin((pulse / 100) * Math.PI));
  const barLeft  = Math.max(0, pulse - 30);

  const handleClick = () => {
    setLocation(`/commandes?phone=${encodeURIComponent(payment.recipientPhone)}`);
  };

  const title = isPaid
    ? "✅ Forfait activé !"
    : isFailed
    ? "❌ Paiement échoué"
    : isDelivering
    ? "📦 En cours de livraison…"
    : "⏳ Paiement en cours…";

  const subtitle = isPaid
    ? `Forfait ${payment.dataSize} activé sur ${payment.recipientPhone}`
    : isFailed
    ? `Le paiement n'a pas abouti pour ${payment.recipientPhone}`
    : isDelivering
    ? `Paiement confirmé — activation en cours pour ${payment.recipientPhone}`
    : `${payment.dataSize} · ${payment.operatorName} · ${payment.recipientPhone}`;

  const showBar = !isPaid && !isFailed;

  return (
    <div
      className="fixed left-3 right-3 z-50 rounded-2xl shadow-2xl border-2 overflow-hidden"
      style={{ bottom: "74px", borderColor, background: bgColor }}
    >
      {/* Animated progress bar at top */}
      {showBar && (
        <div className="h-1 w-full overflow-hidden" style={{ background: isDelivering ? "#DBEAFE" : "#FEF9C3" }}>
          <div
            className="h-1 rounded-full"
            style={{
              width: `${barWidth}%`,
              marginLeft: `${barLeft}%`,
              background: `linear-gradient(90deg, ${barFrom}, ${barTo})`,
              transition: "width 0.09s, margin-left 0.09s",
            }}
          />
        </div>
      )}
      {isPaid   && <div className="h-1 w-full bg-green-400" />}
      {isFailed && <div className="h-1 w-full bg-red-400" />}

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${borderColor}60` }}
        >
          {isPaid
            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
            : isFailed
            ? <XCircle className="w-5 h-5 text-red-500" />
            : isDelivering
            ? <Package className="w-5 h-5 animate-pulse" style={{ color }} />
            : <Loader2 className="w-5 h-5 animate-spin" style={{ color }} />
          }
        </div>

        {/* Text */}
        <button
          onClick={!isPaid && !isFailed ? handleClick : undefined}
          className="flex-1 text-left min-w-0"
        >
          <div className="text-sm font-black leading-tight truncate" style={{ color }}>
            {title}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color, opacity: 0.85 }}>
            {subtitle}
          </div>
        </button>

        {/* Right action */}
        {!isPaid && !isFailed ? (
          <button
            onClick={handleClick}
            className="flex items-center gap-0.5 text-xs font-bold flex-shrink-0 px-2.5 py-1.5 rounded-xl transition-all active:scale-95"
            style={{ background: `${borderColor}40`, color }}
          >
            Voir
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => { setDismissed(true); setPayment(null); }}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}
