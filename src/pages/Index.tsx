import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Zap, MapPin, Battery, Users } from "lucide-react";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/explore${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <div className="min-h-screen pt-12">
      {/* Hero — search centered */}
      <section className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-2xl">
          <p className="font-mono text-[11px] tracking-[0.2em] text-primary mb-6 uppercase">
            Peer-to-peer charging network
          </p>

          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-4">
            Where do you want<br />to charge?
          </h1>

          <p className="text-muted-foreground text-sm max-w-md mb-10">
            2,400+ community chargers across India. Search a location, find a charger, book instantly.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2 mb-16">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city, area, or charger name..."
                className="pl-10 h-11 bg-card border-border rounded-sm font-mono text-sm"
              />
            </div>
            <Button type="submit" className="h-11 px-5 rounded-sm font-mono text-[11px] tracking-wider">
              SEARCH
            </Button>
          </form>

          {/* Grid stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
            {[
              { value: "2,400+", label: "CHARGERS", icon: Zap },
              { value: "18K+", label: "DRIVERS", icon: Users },
              { value: "50+", label: "CITIES", icon: MapPin },
              { value: "₹4K", label: "AVG HOST/MO", icon: Battery },
            ].map((s) => (
              <div key={s.label} className="bg-background p-5">
                <s.icon className="w-4 h-4 text-primary mb-3" />
                <p className="font-heading text-2xl font-bold">{s.value}</p>
                <p className="font-mono text-[10px] tracking-wider text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-px bg-border">
            {[
              { step: "01", title: "DISCOVER", desc: "Browse the live map. Filter by power, price, availability. Find community chargers near you." },
              { step: "02", title: "BOOK", desc: "Pick a time slot and confirm. See exact cost upfront. Get a secure access code." },
              { step: "03", title: "CHARGE", desc: "Navigate to the charger. Plug in using your access code. Rate your experience." },
            ].map((item) => (
              <div key={item.step} className="bg-background p-8 md:p-10">
                <span className="font-mono text-primary text-[11px] tracking-wider">{item.step}</span>
                <h3 className="font-heading text-lg font-bold mt-3 mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Host CTA */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-4xl mx-auto">
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] text-primary mb-4">FOR HOMEOWNERS</p>
              <h2 className="font-heading text-3xl font-bold mb-4">List your charger.<br />Earn passive income.</h2>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                Hosts earn ₹4,000+ monthly on average. Set your own pricing, control availability, and get verified.
              </p>
              <Button asChild className="rounded-sm font-mono text-[11px] tracking-wider h-10 px-5">
                <Link to="/host">BECOME A HOST <ArrowRight className="w-3.5 h-3.5 ml-2" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border">
              {[
                { value: "₹4K+", label: "AVG MONTHLY" },
                { value: "100%", label: "VERIFIED" },
                { value: "80%", label: "HOST SHARE" },
                { value: "4.8★", label: "AVG RATING" },
              ].map((s) => (
                <div key={s.label} className="bg-card p-5">
                  <p className="font-heading text-xl font-bold">{s.value}</p>
                  <p className="font-mono text-[10px] tracking-wider text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl font-bold mb-3">Ready to start?</h2>
          <p className="text-muted-foreground text-sm mb-8">Find a charger or list yours.</p>
          <div className="flex justify-center gap-3">
            <Button asChild className="rounded-sm font-mono text-[11px] tracking-wider h-10 px-5">
              <Link to="/explore">FIND CHARGER</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-sm font-mono text-[11px] tracking-wider h-10 px-5">
              <Link to="/host">LIST CHARGER</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
