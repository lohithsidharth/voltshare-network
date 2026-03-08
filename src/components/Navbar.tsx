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
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors glow-soft">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight">Volt<span className="text-primary">Share</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", isActive(link.to) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                <link.icon className="w-4 h-4" />{link.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center"><User className="w-3.5 h-3.5 text-primary" /></div>
                  <span className="text-sm font-medium">{profile?.display_name || user.email?.split("@")[0]}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground"><LogOut className="w-4 h-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild><Link to="/auth">Sign In</Link></Button>
                <Button size="sm" className="glow-soft" asChild><Link to="/auth">Get Started</Link></Button>
              </div>
            )}
          </div>
          <button className="md:hidden p-2 rounded-lg hover:bg-accent" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 space-y-1 animate-fade-in">
            {links.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all", isActive(link.to) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                <link.icon className="w-4 h-4" />{link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-border mt-2">
              {user ? (
                <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground w-full"><LogOut className="w-4 h-4" />Sign Out</button>
              ) : (
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="block"><Button className="w-full" size="sm">Get Started</Button></Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
