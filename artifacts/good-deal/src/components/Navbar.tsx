import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Moon, Sun, Wifi, Menu, X, User, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  onThemeToggle: () => void;
  isDark: boolean;
}

export function Navbar({ onThemeToggle, isDark }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
      data-testid="navbar"
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Wifi className="w-4 h-4 text-white" />
          </div>
          <span>Good Deal</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Accueil</Link>
          <Link href="/operator/1" className="text-muted-foreground hover:text-foreground transition-colors">MTN</Link>
          <Link href="/operator/2" className="text-muted-foreground hover:text-foreground transition-colors">Orange</Link>
          {isAuthenticated && (
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Mon Espace</Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onThemeToggle} data-testid="button-theme-toggle">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-user-menu">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block max-w-24 truncate">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setLocation("/dashboard")} data-testid="link-dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Mon tableau de bord
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => setLocation("/admin")} data-testid="link-admin">
                    <Shield className="w-4 h-4 mr-2" />
                    Administration
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/login")} data-testid="link-login">
                Connexion
              </Button>
              <Button size="sm" onClick={() => setLocation("/register")} data-testid="link-register">
                S'inscrire
              </Button>
            </div>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-4 pb-4 flex flex-col gap-3 text-sm font-medium">
          <Link href="/" className="py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Accueil</Link>
          <Link href="/operator/1" className="py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>MTN Cameroon</Link>
          <Link href="/operator/2" className="py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Orange Cameroun</Link>
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Mon Espace</Link>
              {isAdmin && <Link href="/admin" className="py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Administration</Link>}
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="py-2 text-left text-destructive">Déconnexion</button>
            </>
          ) : (
            <>
              <Link href="/login" className="py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Connexion</Link>
              <Link href="/register" className="py-2 text-primary font-semibold" onClick={() => setMobileOpen(false)}>S'inscrire</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
