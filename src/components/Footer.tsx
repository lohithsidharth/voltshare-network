import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border py-6">
    <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <span className="font-mono text-[11px] tracking-wider text-muted-foreground">
        VOLT<span className="text-primary">SHARE</span> © {new Date().getFullYear()}
      </span>
      <div className="flex gap-6 text-[11px] font-mono tracking-wider text-muted-foreground">
        <Link to="/explore" className="hover:text-foreground transition-colors">MAP</Link>
        <Link to="/trip-planner" className="hover:text-foreground transition-colors">ROUTES</Link>
        <Link to="/host" className="hover:text-foreground transition-colors">HOST</Link>
      </div>
    </div>
  </footer>
);

export default Footer;
