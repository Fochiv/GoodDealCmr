import { useLocation, Link } from "wouter";
import { Home, Wifi, ClipboardList } from "lucide-react";
import { useColors } from "@/hooks/use-colors";

export function BottomNav() {
  const [location] = useLocation();
  const c = useColors();

  const items = [
    { href: "/", icon: Home, label: "Accueil" },
    { href: "/forfaits", icon: Wifi, label: "Forfaits" },
    { href: "/commandes", icon: ClipboardList, label: "Mes commandes" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t shadow-lg"
      style={{ background: c.bg, borderColor: c.border }}
    >
      <div className="flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
            style={{ color: isActive(item.href) ? "#FF6600" : c.textMuted }}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
