import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Wifi, Menu, X, Zap, Clock } from "lucide-react";

const DURATION_MS = 5 * 60 * 60 * 1000; // 5 heures

function getRemaining(): number {
  try {
    const stored = localStorage.getItem("gd_promo_start");
    const start = stored ? parseInt(stored) : Date.now();
    if (!stored) localStorage.setItem("gd_promo_start", String(start));
    const elapsed = Date.now() - start;
    const remaining = DURATION_MS - (elapsed % DURATION_MS);
    // Reset stored time at each cycle boundary
    if (elapsed > DURATION_MS) {
      const newStart = Date.now() - (elapsed % DURATION_MS);
      localStorage.setItem("gd_promo_start", String(newStart));
    }
    return remaining;
  } catch {
    return DURATION_MS;
  }
}

function PromoBanner() {
  const [remaining, setRemaining] = useState<number>(getRemaining);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1000;
        if (next <= 0) {
          localStorage.setItem("gd_promo_start", String(Date.now()));
          setFlash(true);
          setTimeout(() => setFlash(false), 600);
          return DURATION_MS;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const totalSec = Math.floor(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="w-full flex items-center justify-center gap-2 px-3 py-2 relative overflow-hidden select-none"
      style={{
        background: "linear-gradient(90deg, #e65c00 0%, #FF6600 40%, #ff8000 70%, #e65c00 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmerBg 4s linear infinite",
      }}
    >
      <style>{`
        @keyframes shimmerBg {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes flashNum {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.9); }
        }
      `}</style>

      {/* Animated light sweep */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
          animation: "shimmerBg 2.5s linear infinite",
          backgroundSize: "200% 100%",
        }}
      />

      {/* Zap icon */}
      <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 flex-shrink-0 animate-pulse" />

      {/* Text */}
      <span className="text-white text-xs font-bold tracking-wide">
        Offre spéciale — expire dans
      </span>

      {/* Countdown digits */}
      <div
        className="flex items-center gap-0.5"
        style={flash ? { animation: "flashNum 0.6s ease-in-out" } : {}}
      >
        <Digit value={pad(h)} />
        <span className="text-yellow-300 font-black text-sm leading-none">:</span>
        <Digit value={pad(m)} />
        <span className="text-yellow-300 font-black text-sm leading-none">:</span>
        <Digit value={pad(s)} />
      </div>

      {/* Clock icon */}
      <Clock className="w-3.5 h-3.5 text-yellow-200 flex-shrink-0" />
    </div>
  );
}

function Digit({ value }: { value: string }) {
  return (
    <span
      className="font-black text-sm tracking-tighter bg-black/30 text-yellow-300 px-1 py-0.5 rounded min-w-[1.5rem] text-center leading-none"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {value}
    </span>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const linkClass = (href: string) =>
    `transition-colors font-medium ${isActive(href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Promo banner */}
      <PromoBanner />

      {/* Main navbar */}
      <div
        className={`transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wifi className="w-4 h-4 text-white" />
            </div>
            <span>Good Deal</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className={linkClass("/")}>Accueil</Link>
            <Link href="/forfaits" className={linkClass("/forfaits")}>Forfaits</Link>
            <Link href="/commandes" className={linkClass("/commandes")}>Mes commandes</Link>
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 pb-4 flex flex-col gap-1">
          <Link href="/" className="py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-gray-50">Accueil</Link>
          <Link href="/forfaits" className="py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-gray-50">Forfaits</Link>
          <Link href="/commandes" className="py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-gray-50">Mes commandes</Link>
        </div>
      )}
    </nav>
  );
}
