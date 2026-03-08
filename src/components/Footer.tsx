import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border">
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-heading text-sm font-bold">VoltShare</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/explore" className="hover:text-foreground transition-colors">Explore</Link>
          <Link to="/trip-planner" className="hover:text-foreground transition-colors">Trip Planner</Link>
          <Link to="/host" className="hover:text-foreground transition-colors">Host</Link>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} VoltShare</p>
      </div>
    </div>
  </footer>
);

export default Footer;
