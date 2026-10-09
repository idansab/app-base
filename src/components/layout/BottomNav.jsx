import React from "react";
import { NavLink } from "react-router-dom";
import { Compass, Heart, Map, Sparkles, PenTool } from "lucide-react";
import useFavorites from "@/hooks/useFavorites";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const BASE_ITEMS = [
  { to: "/", label: "בית", icon: Compass },
  { to: "/favorites", label: "מועדפים", icon: Heart },
  { to: "/trips", label: "מסלולים", icon: Map },
  { to: "/surprise", label: "הפתעה", icon: Sparkles },
];

const AUTH_ITEM = { to: "/write-tip", label: "כתוב", icon: PenTool };

export default function BottomNav() {
  const { isAuthenticated, user } = useAuth();
  const { favorites } = useFavorites();
  const favoritesCount = Object.keys(favorites).length;

  const ITEMS = isAuthenticated ? [AUTH_ITEM, ...BASE_ITEMS] : BASE_ITEMS;

  const gridColsClass = isAuthenticated ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-md">
      <div className={`mx-auto grid w-full max-w-4xl ${gridColsClass} items-center px-2 pb-[env(safe-area-inset-bottom)] pt-2`}>
        {ITEMS.map((item, index) => (
          <NavItem
            key={item.to}
            {...item}
            badge={item.to === "/favorites" && favoritesCount > 0 ? favoritesCount : null}
          />
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