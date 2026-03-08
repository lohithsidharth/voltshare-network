import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Zap, MapPin, Calendar, Clock, ChevronRight, Battery, IndianRupee } from "lucide-react";

const bookings = [
  { id: "b1", charger: "Home Charger – HSR Layout", date: "2026-03-10", time: "10:00 – 12:00", price: 148, status: "confirmed" },
  { id: "b2", charger: "Fast Charger – Koramangala", date: "2026-03-08", time: "14:00 – 15:30", price: 495, status: "completed" },
  { id: "b3", charger: "Standard Outlet – Indiranagar", date: "2026-03-05", time: "08:00 – 10:00", price: 53, status: "completed" },
];

const statusColor: Record<string, string> = {
  confirmed: "bg-primary/20 text-primary",
  completed: "bg-secondary/20 text-secondary",
  cancelled: "bg-destructive/20 text-destructive",
  pending: "bg-muted text-muted-foreground",
};

const DriverDashboard = () => (
  <div className="pt-20 pb-12 min-h-screen">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold">Driver Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, Driver!</p>
        </div>
        <Button asChild>
          <Link to="/explore"><MapPin className="w-4 h-4 mr-2" />Find Charger</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Battery, label: "Total Sessions", value: "23", color: "text-primary" },
          { icon: IndianRupee, label: "Total Spent", value: "₹2,840", color: "text-secondary" },
          { icon: Zap, label: "kWh Charged", value: "186 kWh", color: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="glass-light border-border">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="font-heading text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bookings */}
      <Card className="glass-light border-border">
        <CardHeader>
          <CardTitle className="font-heading">Your Bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{b.charger}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-heading font-semibold">₹{b.price}</span>
                <Badge className={statusColor[b.status]}>{b.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

export default DriverDashboard;
