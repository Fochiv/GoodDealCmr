import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { Search, ShoppingBag, Menu, X, Zap, Clock, Star, MessageSquarePlus, Sun, Moon } from "lucide-react";

function scrollToAvis() {
  const el = document.getElementById("avis");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.location.href = "/#avis";
  }
}

function openAvisModal() {
  window.dispatchEvent(new CustomEvent("open-avis-modal"));
}

const DURATION_MS = 5 * 60 * 60 * 1000;

function getRemaining(): number {
  try {
    const stored = localStorage.getItem("gd_promo_start");
    const start = stored ? parseInt(stored) : Date.now();
    if (!stored) localStorage.setItem("gd_promo_start", String(start));
    const elapsed = Date.now() - start;
    const remaining = DURATION_MS - (elapsed % DURATION_MS);
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
      style={{ background: "#FF6600" }}
    >
      <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 flex-shrink-0 animate-pulse" />
      <span className="text-white text-xs font-bold tracking-wide">
        Offre spéciale — expire dans
      </span>
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
      <Clock className="w-3.5 h-3.5 text-yellow-200 flex-shrink-0" />
      <style>{`@keyframes flashNum{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.9)}}`}</style>
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => { setMobileOpen(false); }, [location]);

  const navBg    = isDark ? "#0d0d0d" : "#ffffff";
  const navBorder= isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textColor= isDark ? "#ffffff" : "#111111";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";
  const hoverBg  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const mobileBg = isDark ? "#111111" : "#f9f9f9";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: navBg, borderBottomColor: navBorder }}>
      <PromoBanner />

      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2.5 font-black text-lg flex-shrink-0" style={{ color: textColor }}>
            <div
              className="flex items-center justify-center rounded-sm font-black text-white leading-none px-2 h-9 sm:w-9 sm:px-0"
              style={{ background: "#FF6600", fontSize: "clamp(7px, 1.8vw, 11px)" }}
            >
              <span className="sm:hidden tracking-tight">GOODDEALS</span>
              <span className="hidden sm:inline text-base">G</span>
            </div>
            <span className="hidden sm:inline">Good Deal</span>
          </Link>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95"
            style={{ background: hoverBg, color: isDark ? "#FFD700" : "#FF6600" }}
            title={isDark ? "Mode clair" : "Mode sombre"}
            aria-label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
            aria-pressed={isDark}
          >
            {isDark
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />
            }
          </button>
        </div>

        <div className="flex-1 max-w-md hidden md:flex items-center border overflow-hidden" style={{ borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)", borderRadius: "4px" }}>
          <input
            type="text"
            placeholder="Rechercher un forfait, un opérateur..."
            className="flex-1 px-3 py-2 text-sm outline-none placeholder-gray-500"
            style={{ background: "transparent", color: textColor }}
            readOnly
          />
          <button
            className="px-3 py-2 flex items-center justify-center text-white flex-shrink-0"
            style={{ background: "#FF6600" }}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/forfaits" className="hidden md:flex items-center gap-1.5 text-sm font-semibold transition-colors" style={{ color: mutedColor }}>
            Forfaits
          </Link>
          <Link href="/commandes" className="hidden md:flex items-center gap-1.5 text-sm font-semibold transition-colors" style={{ color: mutedColor }}>
            Mes commandes
          </Link>
          <button
            onClick={scrollToAvis}
            className="hidden md:flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: mutedColor }}
          >
            <Star className="w-4 h-4" />
            Avis
          </button>
          <button
            onClick={openAvisModal}
            className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-white px-3 py-1.5 rounded-md transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #FF6600, #FFD700)" }}
          >
            <MessageSquarePlus className="w-4 h-4" />
            Poster un avis
          </button>
          <Link href="/commandes" className="p-2 rounded transition-colors" style={{ color: mutedColor }}>
            <ShoppingBag className="w-5 h-5" />
          </Link>
          <button
            className="md:hidden p-2 rounded transition-colors"
            style={{ color: textColor }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t px-4 pb-4 flex flex-col gap-1" style={{ background: mobileBg, borderColor: navBorder }}>
          <Link href="/" className="py-2.5 px-3 rounded text-sm font-semibold transition-colors" style={{ color: mutedColor }}>Accueil</Link>
          <Link href="/forfaits" className="py-2.5 px-3 rounded text-sm font-semibold transition-colors" style={{ color: mutedColor }}>Forfaits</Link>
          <Link href="/commandes" className="py-2.5 px-3 rounded text-sm font-semibold transition-colors" style={{ color: mutedColor }}>Mes commandes</Link>
          <button
            onClick={() => { setMobileOpen(false); scrollToAvis(); }}
            className="py-2.5 px-3 rounded text-sm font-semibold flex items-center gap-2 text-left transition-colors"
            style={{ color: mutedColor }}
          >
            <Star className="w-4 h-4 text-yellow-500" />
            Avis
          </button>
          <button
            onClick={() => { setMobileOpen(false); openAvisModal(); }}
            className="mt-1 py-2.5 px-3 rounded text-sm font-bold text-white flex items-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #FF6600, #FFD700)" }}
          >
            <MessageSquarePlus className="w-4 h-4" />
            Poster un avis
          </button>
        </div>
      )}
    </nav>
  );
}
