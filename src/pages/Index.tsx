import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Zap, MapPin, Battery, Users, BatteryCharging, Plug, Shield, ChevronRight } from "lucide-react";
import { useState } from "react";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/explore${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/60" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 container mx-auto px-4 pt-20">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <BatteryCharging className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">India's P2P EV Charging Network</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
              Find & book EV chargers <span className="text-primary">near you</span>
            </h1>

            <p className="text-muted-foreground text-base max-w-md mb-8 leading-relaxed">
              Connect with 2,400+ community chargers across 50+ cities. Book a slot, get an access code, and charge your EV — all in minutes.
            </p>

            <form onSubmit={handleSearch} className="flex gap-2 mb-10">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by city, area, or charger..."
                  className="pl-11 h-12 bg-card/80 backdrop-blur-sm border-border rounded-xl text-sm"
                />
              </div>
              <Button type="submit" className="h-12 px-6 rounded-xl font-medium">
                <Search className="w-4 h-4 mr-2" /> Search
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {["Bangalore", "Mumbai", "Delhi", "Chennai"].map((city) => (
                <button
                  key={city}
                  onClick={() => navigate(`/explore?q=${city}`)}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                >
                  <MapPin className="w-3 h-3 inline mr-1" />{city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "2,400+", label: "EV Chargers", icon: Zap, desc: "Across India" },
              { value: "18K+", label: "Active Drivers", icon: Users, desc: "Growing daily" },
              { value: "50+", label: "Cities Covered", icon: MapPin, desc: "And expanding" },
              { value: "₹4K+", label: "Avg Host Earnings", icon: Battery, desc: "Per month" },
            ].map((s) => (
              <div key={s.label} className="p-6 rounded-xl bg-card/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-heading text-3xl font-extrabold">{s.value}</p>
                <p className="text-sm font-medium mt-1">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-primary mb-2">How It Works</p>
            <h2 className="font-heading text-3xl font-bold">Charge your EV in 3 simple steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Discover Chargers", desc: "Browse our live map to find nearby community chargers. Filter by power type, price, and real-time availability.", icon: MapPin },
              { step: "2", title: "Book a Slot", desc: "Choose a time slot, see the exact cost upfront, and confirm your booking. You'll receive a secure access code.", icon: Plug },
              { step: "3", title: "Plug In & Charge", desc: "Navigate to the charger, use your access code, and start charging. Rate your experience when done.", icon: BatteryCharging },
            ].map((item) => (
              <div key={item.step} className="p-8 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-xs font-medium text-primary mb-2">Step {item.step}</div>
                <h3 className="font-heading text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Host CTA */}
      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">For Charger Owners</span>
              </div>
              <h2 className="font-heading text-3xl font-bold mb-4">
                List your charger & earn passive income
              </h2>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Join India's largest P2P EV charging network. Set your own pricing, control when your charger is available, and get verified. Hosts earn ₹4,000+ monthly on average.
              </p>
              <ul className="space-y-3 mb-8">
                {["Set your own pricing per kWh", "Full control over availability", "80% revenue share — you keep the most", "Verified host badge & trust score"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Zap className="w-3 h-3 text-primary" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild className="rounded-xl font-medium h-11 px-6">
                <Link to="/host">Become a Host <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "₹4K+", label: "Avg Monthly", desc: "Host earnings" },
                { value: "100%", label: "Verified", desc: "All chargers" },
                { value: "80%", label: "Revenue Share", desc: "Host keeps" },
                { value: "4.8★", label: "Avg Rating", desc: "Host reviews" },
              ].map((s) => (
                <div key={s.label} className="p-5 rounded-xl bg-card border border-border/50">
                  <p className="font-heading text-2xl font-extrabold">{s.value}</p>
                  <p className="text-sm font-medium mt-1">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-4 text-center max-w-lg">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
            <Zap className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-heading text-3xl font-bold mb-3">Ready to power up?</h2>
          <p className="text-muted-foreground text-sm mb-8">Join thousands of EV drivers and charger hosts across India.</p>
          <div className="flex justify-center gap-3">
            <Button asChild className="rounded-xl font-medium h-11 px-6">
              <Link to="/explore">Find a Charger</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl font-medium h-11 px-6">
              <Link to="/host">List Your Charger</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
