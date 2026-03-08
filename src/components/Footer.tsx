import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-lg text-foreground">
              Volt<span className="text-secondary">Share</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Decentralized EV charging. Power your drive, share your outlet.
          </p>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3">Platform</h4>
          <div className="space-y-2">
            <Link to="/explore" className="block text-sm text-muted-foreground hover:text-foreground">Find Chargers</Link>
            <Link to="/host" className="block text-sm text-muted-foreground hover:text-foreground">Become a Host</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3">Company</h4>
          <div className="space-y-2">
            <span className="block text-sm text-muted-foreground">About Us</span>
            <span className="block text-sm text-muted-foreground">Careers</span>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3">Legal</h4>
          <div className="space-y-2">
            <span className="block text-sm text-muted-foreground">Privacy Policy</span>
            <span className="block text-sm text-muted-foreground">Terms of Service</span>
          </div>
        </div>
      </div>
      <div className="border-t border-border mt-8 pt-8 text-center">
        <p className="text-sm text-muted-foreground">© 2026 VoltShare. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
