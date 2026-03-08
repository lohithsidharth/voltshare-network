import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Zap, MapPin, Shield, Clock, Coins, Leaf, ChevronRight, Star } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px] animate-pulse-glow" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light text-sm text-secondary font-medium mb-6">
                <Zap className="w-4 h-4" />
                The Future of EV Charging
              </span>
            </motion.div>

            <motion.h1
              className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              Charge Your EV
              <br />
              <span className="text-primary text-glow">Anywhere</span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              VoltShare connects EV drivers with homeowners who share their charging outlets. 
              Find, book, and charge — all in one tap.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial="hidden" animate="visible" variants={fadeUp} custom={3}
            >
              <Button asChild size="lg" className="glow-primary text-base px-8 h-12">
                <Link to="/explore">
                  <MapPin className="w-5 h-5 mr-2" />
                  Find a Charger
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-8 h-12 border-border hover:border-primary/50">
                <Link to="/host">
                  <Zap className="w-5 h-5 mr-2" />
                  Become a Host
                </Link>
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16"
              initial="hidden" animate="visible" variants={fadeUp} custom={4}
            >
              {[
                { value: "2.4K+", label: "Chargers" },
                { value: "18K+", label: "Drivers" },
                { value: "₹4.2M", label: "Host Earnings" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-heading text-2xl md:text-3xl font-bold text-foreground">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Three simple steps to start charging or earning</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: MapPin, title: "Discover", desc: "Find nearby chargers on the map. Filter by price, power, and distance.", step: "01" },
              { icon: Clock, title: "Book & Pay", desc: "Select your time slot, see estimated cost, and pay securely.", step: "02" },
              { icon: Zap, title: "Charge Up", desc: "Navigate to the charger, plug in, and drive on with a full battery.", step: "03" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="glass-light rounded-2xl p-8 relative group hover:border-primary/30 transition-all"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <span className="absolute top-6 right-6 font-heading text-5xl font-bold text-primary/10">{item.step}</span>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6">
                Why Choose <span className="text-primary">VoltShare</span>?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Built for India's growing EV ecosystem. Affordable, accessible, and community-driven.
              </p>
              <div className="space-y-5">
                {[
                  { icon: Coins, title: "Save up to 40%", desc: "Cheaper than commercial charging stations" },
                  { icon: Shield, title: "Verified Hosts", desc: "Every charger is vetted for safety & reliability" },
                  { icon: Leaf, title: "Go Green", desc: "Many hosts offer solar-powered charging" },
                  { icon: Star, title: "Community Rated", desc: "Transparent reviews from real drivers" },
                ].map((b, i) => (
                  <motion.div
                    key={b.title}
                    className="flex items-start gap-4"
                    initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                      <b.icon className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-heading font-semibold">{b.title}</h4>
                      <p className="text-sm text-muted-foreground">{b.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="glass-light rounded-3xl p-8 relative"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            >
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
                <Zap className="w-24 h-24 text-primary/30 animate-float" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto text-center glass rounded-3xl p-12 glow-primary relative overflow-hidden"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
            <div className="relative z-10">
              <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Ready to Join the Revolution?</h2>
              <p className="text-muted-foreground text-lg mb-8">
                Whether you drive electric or own a charger, VoltShare has a place for you.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="text-base h-12 px-8">
                  <Link to="/explore">
                    Start Charging <ChevronRight className="w-5 h-5 ml-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base h-12 px-8">
                  <Link to="/host">List Your Charger</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
