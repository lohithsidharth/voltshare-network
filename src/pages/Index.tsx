import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Zap, MapPin, Shield, Clock, Coins, Leaf, ChevronRight, Star,
  Battery, Users, Home, TrendingUp, ArrowRight,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-primary/8 blur-[150px] animate-pulse-glow" />
          <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-[120px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-1/3 left-1/6 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px] animate-pulse-glow" style={{ animationDelay: "3s" }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(hsla(213,100%,50%,0.03)_1px,transparent_1px),linear-gradient(90deg,hsla(213,100%,50%,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass text-sm font-medium mb-8 border-glow">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                India's EV Charging Network
              </span>
            </motion.div>

            <motion.h1
              className="font-heading text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.05]"
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
            >
              Find and share
              <br />
              <span className="gradient-text">EV chargers</span> near you
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
            >
              VoltShare connects EV drivers with homeowners who share their charging outlets.
              Discover community chargers, book in seconds, and drive on.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial="hidden" animate="visible" variants={fadeUp} custom={3}
            >
              <Button asChild size="lg" className="glow-primary text-base px-8 h-13 rounded-xl font-semibold">
                <Link to="/explore">
                  <MapPin className="w-5 h-5 mr-2" />
                  Find a Charger
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-8 h-13 rounded-xl border-border hover:border-primary/40 font-semibold">
                <Link to="/host">
                  <Home className="w-5 h-5 mr-2" />
                  List Your Charger
                </Link>
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="grid grid-cols-3 gap-6 max-w-xl mx-auto mt-20"
              initial="hidden" animate="visible" variants={fadeUp} custom={4}
            >
              {[
                { value: "2.4K+", label: "Chargers", icon: Zap },
                { value: "18K+", label: "EV Drivers", icon: Users },
                { value: "₹4.2M", label: "Host Earnings", icon: TrendingUp },
              ].map((s) => (
                <div key={s.label} className="glass-card rounded-2xl p-5 text-center border-glow">
                  <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="font-heading text-2xl md:text-3xl font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-28 relative">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-20" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">How it works</span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mt-3 mb-4">Three steps to charge up</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">No apps to download. No subscriptions. Just find, book, and go.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: MapPin, title: "Discover Chargers", desc: "Browse the map to find community chargers near you. Filter by price, power, and rating.", step: "01", color: "text-primary" },
              { icon: Clock, title: "Book & Pay", desc: "Select an available time slot, see the estimated cost, and confirm your booking instantly.", step: "02", color: "text-secondary" },
              { icon: Battery, title: "Charge & Go", desc: "Get your secure access code, navigate to the charger, plug in, and drive on.", step: "03", color: "text-primary" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="glass-card rounded-2xl p-8 relative group hover:border-primary/20 transition-all border-glow"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
              >
                <span className="absolute top-6 right-6 font-heading text-6xl font-black text-primary/5">{item.step}</span>
                <div className={`w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-6 ${item.color}`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Charger Marketplace */}
      <section className="py-28 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(hsla(135,100%,55%,0.02)_1px,transparent_1px),linear-gradient(90deg,hsla(135,100%,55%,0.02)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <span className="text-sm font-semibold text-secondary uppercase tracking-wider">Community Charging</span>
              <h2 className="font-heading text-4xl md:text-5xl font-bold mt-3 mb-6">
                Your neighborhood<br /><span className="gradient-text">charging network</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                Join a growing community of hosts earning ₹4,000+ monthly by sharing their home chargers. Safe, verified, and accessible.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-10">
                {[
                  { icon: Coins, value: "₹4K+", label: "Avg monthly host earnings" },
                  { icon: Shield, value: "100%", label: "Verified hosts" },
                  { icon: Leaf, value: "40%", label: "Cheaper than stations" },
                  { icon: Star, value: "4.8★", label: "Average host rating" },
                ].map((s) => (
                  <div key={s.label} className="glass-card rounded-xl p-4 border-glow">
                    <s.icon className="w-5 h-5 text-secondary mb-2" />
                    <p className="font-heading text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <Button asChild size="lg" className="rounded-xl font-semibold glow-neon bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Link to="/host">
                  Share Your Charger <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              className="relative"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            >
              {/* Community charger card mockups */}
              <div className="space-y-4">
                {[
                  { name: "Home Charger – HSR Layout", power: "7.4 kW", price: "₹10/kWh", distance: "0.8 km", rating: "4.9", type: "Type 2" },
                  { name: "Solar Charger – Koramangala", power: "11 kW", price: "₹8/kWh", distance: "1.2 km", rating: "4.7", type: "CCS" },
                  { name: "Garden Charger – Indiranagar", power: "22 kW", price: "₹12/kWh", distance: "2.1 km", rating: "4.8", type: "Type 2" },
                ].map((c, i) => (
                  <motion.div
                    key={c.name}
                    className="glass-card rounded-2xl p-5 border-glow"
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, duration: 0.5 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <h4 className="font-heading font-semibold text-sm">{c.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>⚡ {c.power}</span>
                            <span>{c.price}</span>
                            <span>{c.distance}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-secondary text-sm font-semibold">
                          <Star className="w-3.5 h-3.5 fill-secondary" />{c.rating}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{c.type}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-28 border-t border-border">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Why VoltShare</span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mt-3">Built for India's EV future</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[
              { icon: Coins, title: "Save 40%", desc: "Cheaper than commercial stations", gradient: "from-primary/10 to-primary/5" },
              { icon: Shield, title: "Verified Hosts", desc: "ID & charger certification", gradient: "from-secondary/10 to-secondary/5" },
              { icon: Leaf, title: "Go Green", desc: "Solar-powered charging options", gradient: "from-secondary/10 to-primary/5" },
              { icon: Star, title: "Community Rated", desc: "Transparent driver reviews", gradient: "from-primary/10 to-secondary/5" },
            ].map((b, i) => (
              <motion.div
                key={b.title}
                className={`glass-card rounded-2xl p-6 relative overflow-hidden border-glow group`}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${b.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                    <b.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading text-lg font-bold mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto text-center glass-card rounded-3xl p-16 relative overflow-hidden border-glow"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-heading text-3xl md:text-5xl font-bold mb-5">Ready to join the revolution?</h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
                Whether you drive electric or own a charger, VoltShare has a place for you.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="text-base h-13 px-8 rounded-xl glow-primary font-semibold">
                  <Link to="/explore">
                    Start Charging <ChevronRight className="w-5 h-5 ml-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base h-13 px-8 rounded-xl font-semibold">
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
