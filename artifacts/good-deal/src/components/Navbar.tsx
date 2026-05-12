import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Wifi, Menu, X } from "lucide-react";

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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
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

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 pb-4 flex flex-col gap-1">
          <Link href="/" className="py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-gray-50">Accueil</Link>
          <Link href="/forfaits" className="py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-gray-50">Tous les forfaits</Link>
          <Link href="/commandes" className="py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-gray-50">Mes commandes</Link>
        </div>
      )}
    </nav>
  );
}
