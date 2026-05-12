import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2, ChevronRight, X, CheckCircle2, XCircle } from "lucide-react";

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
    // Expire after 30 minutes
    if (Date.now() - p.timestamp > 30 * 60 * 1000) {
      clearPendingPayment();
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function PendingPaymentBar() {
  const [, setLocation] = useLocation();
  const [payment, setPayment] = useState<PendingPayment | null>(null);
  const [finalStatus, setFinalStatus] = useState<"paid" | "failed" | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [pulse, setPulse] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from localStorage on mount + listen for storage changes
  useEffect(() => {
    const load = () => {
      const p = loadPendingPayment();
      setPayment(p);
      setDismissed(false);
      setFinalStatus(null);
    };
    load();
    window.addEventListener("storage", load);
    // Also check on focus
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

  // Poll order status
  useEffect(() => {
    if (!payment || finalStatus) return;
    if (pollRef.current) clearInterval(pollRef.current);

    const check = async () => {
      try {
        const r = await fetch(`/api/orders/${payment.orderId}`);
        if (!r.ok) return;
        const data = await r.json();
        if (data.status === "paid") {
          setFinalStatus("paid");
          clearPendingPayment();
          clearInterval(pollRef.current!);
          // Auto-dismiss after 4s
          setTimeout(() => { setDismissed(true); setPayment(null); }, 4000);
        } else if (data.status === "failed" || data.status === "cancelled") {
          setFinalStatus("failed");
          clearPendingPayment();
          clearInterval(pollRef.current!);
          // Auto-dismiss after 5s
          setTimeout(() => { setDismissed(true); setPayment(null); }, 5000);
        }
      } catch {}
    };

    check();
    pollRef.current = setInterval(check, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [payment, finalStatus]);

  if (!payment || dismissed) return null;

  const color = payment.isMtn ? "#B8860B" : "#CC4400";
  const bgColor = payment.isMtn ? "#FFFBEB" : "#FFF7F0";
  const borderColor = payment.isMtn ? "#FCD34D" : "#FDBA74";
  const barFrom = payment.isMtn ? "#F59E0B" : "#F97316";
  const barTo = payment.isMtn ? "#FCD34D" : "#FB923C";

  const barWidth = 30 + 40 * Math.abs(Math.sin((pulse / 100) * Math.PI));
  const barLeft = Math.max(0, pulse - 30);

  const handleClick = () => {
    setLocation(`/commandes?phone=${encodeURIComponent(payment.recipientPhone)}`);
  };

  return (
    <div
      className="fixed left-3 right-3 z-50 rounded-2xl shadow-2xl border-2 overflow-hidden"
      style={{
        bottom: "74px", // above BottomNav on mobile
        borderColor: finalStatus === "paid" ? "#86EFAC" : finalStatus === "failed" ? "#FCA5A5" : borderColor,
        background: finalStatus === "paid" ? "#F0FDF4" : finalStatus === "failed" ? "#FFF1F2" : bgColor,
      }}
    >
      {/* Animated progress bar at top */}
      {!finalStatus && (
        <div className="h-1 w-full overflow-hidden bg-yellow-100">
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
      {finalStatus === "paid" && <div className="h-1 w-full bg-green-400" />}
      {finalStatus === "failed" && <div className="h-1 w-full bg-red-400" />}

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: finalStatus === "paid" ? "#DCFCE7" : finalStatus === "failed" ? "#FEE2E2" : `${borderColor}60`,
          }}
        >
          {finalStatus === "paid"
            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
            : finalStatus === "failed"
            ? <XCircle className="w-5 h-5 text-red-500" />
            : <Loader2 className="w-5 h-5 animate-spin" style={{ color }} />
          }
        </div>

        {/* Text — clickable area */}
        <button
          onClick={!finalStatus ? handleClick : undefined}
          className="flex-1 text-left min-w-0"
        >
          <div
            className="text-sm font-black leading-tight truncate"
            style={{ color: finalStatus === "paid" ? "#15803D" : finalStatus === "failed" ? "#B91C1C" : color }}
          >
            {finalStatus === "paid"
              ? "✅ Paiement confirmé !"
              : finalStatus === "failed"
              ? "❌ Paiement échoué"
              : `⏳ Paiement en cours…`}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color: finalStatus === "paid" ? "#16A34A" : finalStatus === "failed" ? "#DC2626" : color, opacity: 0.85 }}>
            {finalStatus === "paid"
              ? `Forfait ${payment.dataSize} activé sur ${payment.recipientPhone}`
              : finalStatus === "failed"
              ? `Le paiement n'a pas abouti pour ${payment.recipientPhone}`
              : `${payment.dataSize} · ${payment.operatorName} · ${payment.recipientPhone}`}
          </div>
        </button>

        {/* Right action */}
        {!finalStatus ? (
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
