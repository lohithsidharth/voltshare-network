import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import voltIcon from "@/assets/volt-icon.png";

const Footer = () => (
  <footer className="border-t border-border/50 py-10">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <img src={voltIcon} alt="VoltShare" className="w-6 h-6" />
          <span className="font-heading text-base font-bold">
            Volt<span className="text-primary">Share</span>
          </span>
          <span className="text-sm text-muted-foreground ml-2">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link to="/explore" className="hover:text-foreground transition-colors">Find Chargers</Link>
          <Link to="/trip-planner" className="hover:text-foreground transition-colors">Trip Planner</Link>
          <Link to="/host" className="hover:text-foreground transition-colors">Host</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
