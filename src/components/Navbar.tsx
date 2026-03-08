import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, LogOut, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import voltIcon from "@/assets/volt-icon.png";

const Navbar = () => {
  const { user, role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/explore", label: "Find Chargers" },
    { to: "/trip-planner", label: "Trip Planner" },
    ...(role === "driver" ? [{ to: "/driver", label: "My Bookings" }] : []),
    ...(role === "host" ? [{ to: "/host", label: "Host Dashboard" }] : []),
  ];

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={voltIcon} alt="VoltShare" className="w-7 h-7" />
            <span className="font-heading text-lg font-bold">
              Volt<span className="text-primary">Share</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive(link.to)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium">
                    {profile?.display_name || user.email?.split("@")[0]}
                  </span>
                </div>
                <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2">
                  Log in
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="rounded-lg font-medium px-4">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden p-2 rounded-lg hover:bg-muted/50" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-border/50 space-y-1 animate-fade-in">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2.5 text-sm font-medium rounded-lg",
                  isActive(link.to) ? "text-primary bg-primary/10" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2.5 text-sm font-medium text-muted-foreground">
                Log out
              </button>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-primary">
                Log in / Sign up
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
