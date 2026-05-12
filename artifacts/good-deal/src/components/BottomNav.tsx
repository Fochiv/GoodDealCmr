import { useLocation, Link } from "wouter";
import { Home, Wifi, ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function BottomNav() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  const items = [
    { href: "/", icon: Home, label: "Accueil" },
    { href: "/operator/1", icon: Wifi, label: "Forfaits" },
    { href: "/dashboard", icon: ShoppingBag, label: "Commandes" },
    { href: isAuthenticated ? "/dashboard" : "/login", icon: User, label: "Compte" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border" data-testid="bottom-nav">
      <div className="flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isActive(item.href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
