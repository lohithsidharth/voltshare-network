import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, IndianRupee, Users, TrendingUp, Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const chargers = [
  { id: "1", title: "Home Charger – HSR Layout", power: 7.4, price: 10, bookings: 24, revenue: 4800, status: "active" },
  { id: "2", title: "Garage Charger – Whitefield", power: 3.3, price: 8, bookings: 12, revenue: 1920, status: "active" },
];

const recentBookings = [
  { id: "rb1", driver: "Arjun P.", charger: "Home Charger – HSR Layout", date: "2026-03-08", time: "10:00 – 12:00", amount: 148, status: "confirmed" },
  { id: "rb2", driver: "Sneha K.", charger: "Garage Charger – Whitefield", date: "2026-03-07", time: "15:00 – 17:00", amount: 106, status: "completed" },
];

const HostDashboard = () => {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="pt-20 pb-12 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold">Host Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your chargers & earnings</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Charger</Button>
            </DialogTrigger>
            <DialogContent className="glass border-border">
              <DialogHeader>
                <DialogTitle className="font-heading">Add New Charger</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label>Title</Label><Input placeholder="e.g. Home Charger – HSR Layout" className="mt-1" /></div>
                <div><Label>Address</Label><Input placeholder="Full address" className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Power (kW)</Label><Input type="number" placeholder="7.4" className="mt-1" /></div>
                  <div><Label>Price (₹/kWh)</Label><Input type="number" placeholder="10" className="mt-1" /></div>
                </div>
                <div><Label>Availability</Label><Input placeholder="e.g. 8 AM – 10 PM" className="mt-1" /></div>
                <Button className="w-full" onClick={() => setAddOpen(false)}>Add Charger</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Zap, label: "Active Chargers", value: "2", color: "text-primary" },
            { icon: Users, label: "Total Bookings", value: "36", color: "text-secondary" },
            { icon: IndianRupee, label: "Total Revenue", value: "₹6,720", color: "text-primary" },
            { icon: TrendingUp, label: "Your Earnings (80%)", value: "₹5,376", color: "text-secondary" },
          ].map((s) => (
            <Card key={s.label} className="glass-light border-border">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-heading text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chargers */}
          <Card className="glass-light border-border">
            <CardHeader><CardTitle className="font-heading">Your Chargers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {chargers.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-muted/50 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{c.title}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span>{c.power} kW</span>
                      <span>₹{c.price}/kWh</span>
                      <span>{c.bookings} bookings</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-semibold text-secondary">₹{c.revenue}</p>
                    <Badge className="bg-secondary/20 text-secondary text-xs">{c.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card className="glass-light border-border">
            <CardHeader><CardTitle className="font-heading">Recent Bookings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recentBookings.map((b) => (
                <div key={b.id} className="p-4 rounded-xl bg-muted/50 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{b.driver}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.charger}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.time}</span>
                    </div>
                  </div>
                  <span className="font-heading font-semibold">₹{b.amount}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
