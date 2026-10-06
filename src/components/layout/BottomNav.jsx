import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Compass, Heart, Map, Plus, Sparkles, Settings } from "lucide-react";
import useFavorites from "@/hooks/useFavorites";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "בית", icon: Compass },
  { to: "/favorites", label: "מועדפים", icon: Heart },
  { to: "/trips", label: "מסלולים", icon: Map },
  { to: "/surprise", label: "הפתעה", icon: Sparkles },
  { to: "/settings", label: "הגדרות", icon: Settings },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { favorites } = useFavorites();
  const favoritesCount = Object.keys(favorites).length;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-4xl grid-cols-6 items-center px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {ITEMS.slice(0, 2).map((item) => (
          <NavItem
            key={item.to}
            {...item}
            badge={item.to === "/favorites" && favoritesCount > 0 ? favoritesCount : null}
          />
        ))}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? "/contribute" : "/login")}
            aria-label="המלצה על מקום"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 text-white shadow-lg shadow-green-600/25 transition active:scale-95 hover:bg-green-700"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {ITEMS.slice(2).map((item) => (
          <NavItem key={item.to} {...item} badge={null} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ to, label, icon: Icon, badge }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "relative flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold transition",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon className={cn("h-5 w-5", isActive && "stroke-[2.4]")} />
            {badge ? (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {badge}
              </span>
            ) : null}
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}