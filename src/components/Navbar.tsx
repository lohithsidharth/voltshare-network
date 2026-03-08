import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, Menu, X, User, LogOut, MapPin, Route, LayoutDashboard, Home } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const { user, role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/explore", label: "Explore", icon: MapPin },
    { to: "/trip-planner", label: "Trip Planner", icon: Route },
    ...(role === "driver" ? [{ to: "/driver", label: "My Trips", icon: LayoutDashboard }] : []),
    ...(role === "host" ? [{ to: "/host", label: "Host Panel", icon: Home }] : []),
  ];

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-heading text-base font-bold">VoltShare</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive(link.to) ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{profile?.display_name || user.email?.split("@")[0]}</span>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8 text-muted-foreground">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild><Link to="/auth">Sign In</Link></Button>
                <Button size="sm" asChild><Link to="/auth">Get Started</Link></Button>
              </div>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 space-y-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm",
                  isActive(link.to) ? "text-foreground bg-accent" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-border mt-2">
              {user ? (
                <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="block px-3 py-2 text-sm text-muted-foreground w-full text-left">
                  Sign Out
                </button>
              ) : (
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full" size="sm">Get Started</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
