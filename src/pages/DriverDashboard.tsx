import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Zap, MapPin, Calendar, Clock, Battery, IndianRupee, Shield, Loader2, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface BookingWithDetails {
  id: string;
  charger_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  estimated_price: number;
  final_price: number | null;
  status: string;
  charger_title?: string;
  charger_lat?: number;
  charger_lng?: number;
  access_code?: string | null;
}

const statusColor: Record<string, string> = {
  confirmed: "bg-primary/20 text-primary",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-destructive/20 text-destructive",
  pending: "bg-muted text-muted-foreground",
};

const DriverDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchBookings = async () => {
      setLoading(true);
      const { data: bks } = await supabase
        .from("bookings")
        .select("id, charger_id, booking_date, start_time, end_time, estimated_price, final_price, status")
        .eq("driver_id", user.id)
        .order("booking_date", { ascending: false });

      if (!bks || bks.length === 0) { setBookings([]); setLoading(false); return; }

      // Fetch charger details
      const chargerIds = [...new Set(bks.map(b => b.charger_id))];
      const { data: chargers } = await supabase.from("chargers").select("id, title, latitude, longitude").in("id", chargerIds);
      const chargerMap = new Map(chargers?.map(c => [c.id, c]) || []);

      // Fetch access codes for confirmed bookings
      const confirmedIds = bks.filter(b => b.status === "confirmed").map(b => b.id);
      let codeMap = new Map<string, string>();
      if (confirmedIds.length > 0) {
        const { data: codes } = await supabase.from("access_codes").select("booking_id, code").in("booking_id", confirmedIds);
        codeMap = new Map(codes?.map(c => [c.booking_id, c.code]) || []);
      }

      setBookings(bks.map(b => {
        const ch = chargerMap.get(b.charger_id);
        return {
          ...b,
          charger_title: ch?.title || "Unknown",
          charger_lat: ch?.latitude,
          charger_lng: ch?.longitude,
          access_code: codeMap.get(b.id) || null,
        };
      }));
      setLoading(false);
    };
    fetchBookings();
  }, [user]);

  const totalSpent = bookings.reduce((s, b) => s + (b.final_price || b.estimated_price), 0);
  const totalSessions = bookings.filter(b => b.status === "completed").length;

  return (
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
            { icon: Battery, label: "Total Sessions", value: String(totalSessions), color: "text-primary" },
            { icon: IndianRupee, label: "Total Spent", value: `₹${totalSpent.toLocaleString()}`, color: "text-secondary" },
            { icon: Zap, label: "Active Bookings", value: String(bookings.filter(b => b.status === "confirmed").length), color: "text-primary" },
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">No bookings yet.</p>
                <Button asChild size="sm"><Link to="/explore">Find a Charger</Link></Button>
              </div>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{b.charger_title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.booking_date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.start_time?.substring(0,5)} – {b.end_time?.substring(0,5)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-heading font-semibold">₹{b.final_price || b.estimated_price}</span>
                      <Badge className={statusColor[b.status] || statusColor.pending}>{b.status}</Badge>
                    </div>
                  </div>

                  {/* Access code + navigation for confirmed bookings */}
                  {b.status === "confirmed" && (
                    <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                      {b.access_code && (
                        <div className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
                          <Shield className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs text-muted-foreground">Access Code:</span>
                          <span className="font-heading font-bold text-primary tracking-wider">{b.access_code}</span>
                        </div>
                      )}
                      {b.charger_lat && b.charger_lng && (
                        <Button size="sm" variant="outline" onClick={() => {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.charger_lat},${b.charger_lng}`, "_blank");
                        }}>
                          <Navigation className="w-3.5 h-3.5 mr-1" />Navigate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDashboard;
