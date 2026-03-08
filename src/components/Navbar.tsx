import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const { user, role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/explore", label: "MAP" },
    { to: "/trip-planner", label: "ROUTES" },
    ...(role === "driver" ? [{ to: "/driver", label: "DASHBOARD" }] : []),
    ...(role === "host" ? [{ to: "/host", label: "HOST" }] : []),
  ];

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          <Link to="/" className="font-mono text-sm font-semibold tracking-wider">
            VOLT<span className="text-primary">SHARE</span>
          </Link>

          <div className="hidden md:flex items-center gap-0">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "px-4 py-1 text-[11px] font-mono tracking-wider transition-colors",
                  isActive(link.to) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-muted-foreground tracking-wide">
                  {profile?.display_name?.toUpperCase() || user.email?.split("@")[0]?.toUpperCase()}
                </span>
                <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth" className="text-[11px] font-mono tracking-wider text-muted-foreground hover:text-foreground">LOGIN</Link>
                <Link to="/auth">
                  <Button size="sm" className="h-7 px-3 text-[11px] font-mono tracking-wider rounded-sm">
                    SIGN UP
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-3 pt-1 border-t border-border space-y-0">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-0 py-2 text-[11px] font-mono tracking-wider",
                  isActive(link.to) ? "text-primary" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="block py-2 text-[11px] font-mono tracking-wider text-muted-foreground">LOGOUT</button>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="block py-2 text-[11px] font-mono tracking-wider text-muted-foreground">LOGIN</Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
