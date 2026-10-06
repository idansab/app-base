import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function AppHeader() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <MapPin className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-heading text-lg font-bold tracking-tight">מה יש פה</span>
            <span className="mt-1 text-[11px] font-medium text-muted-foreground">גילוי מקומי</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <ShieldCheck className="h-4 w-4" />
              ניהול
            </Button>
          ) : null}
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout(true)}
              title="התנתקות"
              className="rounded-xl text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate("/login")} className="rounded-xl">
              התחברות
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}