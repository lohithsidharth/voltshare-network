import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Zap, MapPin, Calendar, Clock, Battery, IndianRupee, Shield, Loader2,
  Navigation, Heart, XCircle, Star,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

interface FavCharger {
  id: string;
  title: string;
  power: number;
  price_per_kwh: number;
  rating: number | null;
  address: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: "bg-primary/15", text: "text-primary", label: "Confirmed" },
  completed: { bg: "bg-secondary/15", text: "text-secondary", label: "Completed" },
  cancelled: { bg: "bg-destructive/15", text: "text-destructive", label: "Cancelled" },
  pending: { bg: "bg-muted", text: "text-muted-foreground", label: "Pending" },
};

const DriverDashboard = () => {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [favChargers, setFavChargers] = useState<FavCharger[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { favoriteIds } = useFavorites();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: bks } = await supabase
        .from("bookings")
        .select("id, charger_id, booking_date, start_time, end_time, estimated_price, final_price, status")
        .eq("driver_id", user.id)
        .order("booking_date", { ascending: false });

      if (!bks || bks.length === 0) { setBookings([]); setLoading(false); return; }

      const chargerIds = [...new Set(bks.map(b => b.charger_id))];
      const { data: chargers } = await supabase.from("chargers").select("id, title, latitude, longitude").in("id", chargerIds);
      const chargerMap = new Map(chargers?.map(c => [c.id, c]) || []);

      const confirmedIds = bks.filter(b => b.status === "confirmed").map(b => b.id);
      let codeMap = new Map<string, string>();
      if (confirmedIds.length > 0) {
        const { data: codes } = await supabase.from("access_codes").select("booking_id, code").in("booking_id", confirmedIds);
        codeMap = new Map(codes?.map(c => [c.booking_id, c.code]) || []);
      }

      setBookings(bks.map(b => {
        const ch = chargerMap.get(b.charger_id);
        return { ...b, charger_title: ch?.title || "Unknown", charger_lat: ch?.latitude, charger_lng: ch?.longitude, access_code: codeMap.get(b.id) || null };
      }));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Fetch favorite chargers
  useEffect(() => {
    if (favoriteIds.length === 0) { setFavChargers([]); return; }
    supabase.from("chargers").select("id, title, power, price_per_kwh, rating, address").in("id", favoriteIds).then(({ data }) => {
      setFavChargers(data ?? []);
    });
  }, [favoriteIds]);

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    if (error) {
      toast.error("Failed to cancel");
    } else {
      toast.success("Booking cancelled");
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "cancelled" } : b));
    }
    setCancellingId(null);
  };

  const totalSpent = bookings.reduce((s, b) => s + (b.final_price || b.estimated_price), 0);
  const totalSessions = bookings.filter(b => b.status === "completed").length;
  const activeBookings = bookings.filter(b => b.status === "confirmed");

  return (
    <div className="pt-20 pb-12 min-h-screen">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-extrabold">My Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {profile?.display_name || "Driver"}!</p>
          </div>
          <Button asChild className="rounded-xl font-semibold glow-soft">
            <Link to="/explore"><MapPin className="w-4 h-4 mr-2" />Find Charger</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Battery, label: "Sessions", value: String(totalSessions), color: "text-primary", bgColor: "bg-primary/10" },
            { icon: IndianRupee, label: "Total Spent", value: `₹${totalSpent.toLocaleString()}`, color: "text-secondary", bgColor: "bg-secondary/10" },
            { icon: Zap, label: "Active", value: String(activeBookings.length), color: "text-primary", bgColor: "bg-primary/10" },
          ].map((s) => (
            <Card key={s.label} className="glass-card border-none rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", s.bgColor, s.color)}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-heading text-2xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bookings */}
          <Card className="glass-card border-none rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Your Bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-10">
                  <Battery className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No bookings yet</p>
                  <Button asChild size="sm" className="rounded-xl"><Link to="/explore">Find a Charger</Link></Button>
                </div>
              ) : (
                bookings.map((b) => {
                  const sc = statusConfig[b.status] || statusConfig.pending;
                  return (
                    <div key={b.id} className="p-4 rounded-2xl bg-accent/30 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-heading font-semibold text-sm">{b.charger_title}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.booking_date}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.start_time?.substring(0,5)} – {b.end_time?.substring(0,5)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-heading font-bold">₹{b.final_price || b.estimated_price}</span>
                          <Badge className={cn("rounded-lg text-[11px] font-semibold", sc.bg, sc.text)}>{sc.label}</Badge>
                        </div>
                      </div>

                      {b.status === "confirmed" && (
                        <div className="mt-3 flex items-center gap-3 border-t border-border/50 pt-3">
                          {b.access_code && (
                            <div className="flex items-center gap-2 glass rounded-xl px-3.5 py-2">
                              <Shield className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs text-muted-foreground">Code:</span>
                              <span className="font-heading font-bold text-primary tracking-widest">{b.access_code}</span>
                            </div>
                          )}
                          {b.charger_lat && b.charger_lng && (
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.charger_lat},${b.charger_lng}`, "_blank");
                            }}>
                              <Navigation className="w-3.5 h-3.5 mr-1" />Navigate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl text-destructive hover:text-destructive ml-auto"
                            disabled={cancellingId === b.id}
                            onClick={() => handleCancel(b.id)}
                          >
                            {cancellingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Favorites */}
          <Card className="glass-card border-none rounded-2xl">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-destructive" />Favorites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {favChargers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No favorites yet. Heart a charger to save it!</p>
              ) : (
                favChargers.map((c) => (
                  <Link key={c.id} to={`/charger/${c.id}`} className="block p-3.5 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors">
                    <p className="font-heading font-semibold text-sm">{c.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>⚡ {c.power} kW</span>
                      <span>₹{c.price_per_kwh}/kWh</span>
                      {c.rating && <span className="flex items-center gap-0.5 text-secondary"><Star className="w-3 h-3 fill-secondary" />{c.rating}</span>}
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
