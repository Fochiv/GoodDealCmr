import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingBag, Menu, X, Zap, Clock, Star, MessageSquarePlus } from "lucide-react";

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

  useEffect(() => { setMobileOpen(false); }, [location]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <PromoBanner />

      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo — carré orange comme orange.cm */}
        <Link href="/" className="flex items-center gap-2.5 font-black text-lg text-foreground flex-shrink-0">
          <div
            className="w-9 h-9 flex items-center justify-center rounded-sm font-black text-white text-base leading-none"
            style={{ background: "#FF6600" }}
          >
            G
          </div>
          <span className="hidden sm:inline">Good Deal</span>
        </Link>

        {/* Search bar — style orange.cm */}
        <div className="flex-1 max-w-md hidden md:flex items-center border border-gray-300 rounded-sm overflow-hidden">
          <input
            type="text"
            placeholder="Rechercher un forfait, un opérateur..."
            className="flex-1 px-3 py-2 text-sm outline-none bg-white"
            readOnly
            onClick={() => {}}
          />
          <button
            className="px-3 py-2 flex items-center justify-center text-white flex-shrink-0"
            style={{ background: "#FF6600" }}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-2">
          <Link href="/forfaits" className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-orange-600 transition-colors">
            Forfaits
          </Link>
          <Link href="/commandes" className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-orange-600 transition-colors">
            Mes commandes
          </Link>
          <button
            onClick={scrollToAvis}
            className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-orange-600 transition-colors"
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
          <Link href="/commandes" className="p-2 rounded hover:bg-gray-100 transition-colors relative">
            <ShoppingBag className="w-5 h-5 text-gray-700" />
          </Link>
          <button
            className="md:hidden p-2 rounded hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4 flex flex-col gap-1">
          <Link href="/" className="py-2.5 px-3 rounded text-sm font-semibold text-foreground hover:bg-gray-50">Accueil</Link>
          <Link href="/forfaits" className="py-2.5 px-3 rounded text-sm font-semibold text-foreground hover:bg-gray-50">Forfaits</Link>
          <Link href="/commandes" className="py-2.5 px-3 rounded text-sm font-semibold text-foreground hover:bg-gray-50">Mes commandes</Link>
          <button
            onClick={() => { setMobileOpen(false); scrollToAvis(); }}
            className="py-2.5 px-3 rounded text-sm font-semibold text-foreground hover:bg-gray-50 flex items-center gap-2 text-left"
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
