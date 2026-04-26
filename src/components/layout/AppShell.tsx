import { NavLink, Outlet } from "react-router-dom";
import { Home, Upload, BookOpen, Library, BarChart3, Settings as Cog } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Accueil", icon: Home, end: true },
  { to: "/review", label: "Réviser", icon: BookOpen },
  { to: "/import", label: "Importer", icon: Upload },
  { to: "/browse", label: "Cartes", icon: Library },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/settings", label: "Réglages", icon: Cog },
];

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r bg-sidebar">
        <div className="px-6 py-5 border-b">
          <div className="flex items-center gap-2">
            <img
              src="/rosetta-logo.svg"
              alt="Logo Rosetta"
              className="h-8 w-8 rounded-lg object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div>
              <p className="font-semibold leading-tight">Rosetta</p>
              <p className="text-xs text-muted-foreground">Spaced repetition</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-5xl px-3 sm:px-6 py-4 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-6">
          {links.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-full px-0.5">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
