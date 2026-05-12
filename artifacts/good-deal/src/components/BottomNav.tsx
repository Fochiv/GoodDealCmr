import { useLocation, Link } from "wouter";
import { Home, Wifi, ClipboardList } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  const items = [
    { href: "/", icon: Home, label: "Accueil" },
    { href: "/forfaits", icon: Wifi, label: "Forfaits" },
    { href: "/commandes", icon: ClipboardList, label: "Commandes" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
      <div className="flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isActive(item.href) ? "text-primary" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
