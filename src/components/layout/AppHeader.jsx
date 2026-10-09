import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function AppHeader() {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();
  const isAdmin = user?.role === "admin";

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="Logo"
            className="h-10 w-10 rounded-lg shadow-sm"
          />
          <span className="flex flex-col leading-none">
            <span className="font-heading text-lg font-bold tracking-tight">מה יש פה</span>
            <span className="mt-1 text-[11px] font-medium text-muted-foreground">גילוי מקומי</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <span className="text-xs text-gray-600 hidden sm:inline">
              {user?.email}
            </span>
          )}
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
                onClick={handleLogout}
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
      </div>
    </header>
  );
}