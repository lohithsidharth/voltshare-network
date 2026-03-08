import { Link } from "react-router-dom";
import { Zap, Github, Twitter, Mail } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card/50">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Zap className="w-4 h-4 text-primary" /></div>
            <span className="font-heading text-lg font-bold">Volt<span className="text-primary">Share</span></span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">India's peer-to-peer EV charging network. Find, book, and share chargers in your community.</p>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-sm mb-4 text-foreground">Platform</h4>
          <div className="space-y-2.5">
            {[{ to: "/explore", label: "Find Chargers" }, { to: "/trip-planner", label: "Trip Planner" }, { to: "/host", label: "Become a Host" }].map((l) => (
              <Link key={l.to} to={l.to} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-sm mb-4 text-foreground">Resources</h4>
          <div className="space-y-2.5">
            {["Pricing", "Safety", "Support"].map((l) => (<span key={l} className="block text-sm text-muted-foreground cursor-default">{l}</span>))}
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-sm mb-4 text-foreground">Connect</h4>
          <div className="flex items-center gap-3">
            {[{ icon: Twitter }, { icon: Github }, { icon: Mail }].map((s, i) => (
              <button key={i} className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors"><s.icon className="w-4 h-4" /></button>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} VoltShare. Built for India's EV future.</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Zap className="w-3 h-3 text-secondary" /><span>Powered by clean energy</span></div>
      </div>
    </div>
  </footer>
);

export default Footer;
