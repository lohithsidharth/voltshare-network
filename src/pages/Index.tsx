import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, MapPin, Clock, Battery, ArrowRight, ChevronRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="min-h-[90vh] flex items-center justify-center pt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm text-muted-foreground mb-4 tracking-wide uppercase">Peer-to-peer EV charging</p>

            <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Find and share EV chargers near you.
            </h1>

            <p className="text-muted-foreground text-lg max-w-lg mx-auto mb-10">
              VoltShare connects drivers with homeowners who share their chargers. Book in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 rounded-lg font-medium">
                <Link to="/explore">
                  <MapPin className="w-4 h-4 mr-2" />
                  Find a Charger
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-6 rounded-lg font-medium">
                <Link to="/host">
                  List Your Charger
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-8 mt-16 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> 2,400+ chargers</span>
              <span className="hidden sm:flex items-center gap-2"><Battery className="w-4 h-4 text-primary" /> 18K+ drivers</span>
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> 50+ cities</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-16">How it works</h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: MapPin, step: "1", title: "Discover", desc: "Browse chargers on the map. Filter by price, power, and availability." },
              { icon: Clock, step: "2", title: "Book", desc: "Pick a time slot, see the cost, and confirm instantly." },
              { icon: Battery, step: "3", title: "Charge", desc: "Get your access code, navigate there, and plug in." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center mx-auto mb-4 text-sm font-medium text-muted-foreground">
                  {item.step}
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Host CTA */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm text-secondary font-medium mb-3 uppercase tracking-wide">For homeowners</p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">Share your charger, earn money.</h2>
            <p className="text-muted-foreground mb-8">
              Hosts earn an average of ₹4,000/month. List your charger in minutes.
            </p>
            <Button asChild size="lg" className="h-12 px-6 rounded-lg font-medium">
              <Link to="/host">
                Become a Host <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-8">Find a community charger or list yours today.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 rounded-lg font-medium">
                <Link to="/explore">Start Charging</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-6 rounded-lg font-medium">
                <Link to="/host">List Your Charger</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
