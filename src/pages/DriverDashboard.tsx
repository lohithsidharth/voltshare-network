import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Loader2, Navigation, Heart, XCircle, Star, Shield, Zap, Calendar, MapPin, BatteryCharging,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BookingWithDetails {
  id: string; charger_id: string; booking_date: string; start_time: string; end_time: string;
  estimated_price: number; final_price: number | null; status: string;
  charger_title?: string; charger_lat?: number; charger_lng?: number; access_code?: string | null;
}

interface FavCharger { id: string; title: string; power: number; price_per_kwh: number; rating: number | null; address: string; }

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
      const { data: bks } = await supabase.from("bookings").select("id, charger_id, booking_date, start_time, end_time, estimated_price, final_price, status").eq("driver_id", user.id).order("booking_date", { ascending: false });
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
      setBookings(bks.map(b => { const ch = chargerMap.get(b.charger_id); return { ...b, charger_title: ch?.title || "Unknown", charger_lat: ch?.latitude, charger_lng: ch?.longitude, access_code: codeMap.get(b.id) || null }; }));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (favoriteIds.length === 0) { setFavChargers([]); return; }
    supabase.from("chargers").select("id, title, power, price_per_kwh, rating, address").in("id", favoriteIds).then(({ data }) => { setFavChargers(data ?? []); });
  }, [favoriteIds]);

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    if (error) { toast.error("Failed to cancel"); } else { toast.success("Booking cancelled"); setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "cancelled" } : b)); }
    setCancellingId(null);
  };

  const totalSpent = bookings.reduce((s, b) => s + (b.final_price || b.estimated_price), 0);
  const totalSessions = bookings.filter(b => b.status === "completed").length;
  const activeBookings = bookings.filter(b => b.status === "confirmed");

  return (
    <div className="pt-16 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold">Hi, {profile?.display_name || "Driver"} 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your bookings and favorite chargers</p>
          </div>
          <Button asChild className="rounded-xl font-medium">
            <Link to="/explore"><MapPin className="w-4 h-4 mr-2" />Find Charger</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Charging Sessions", value: String(totalSessions), icon: BatteryCharging },
            { label: "Total Spent", value: `₹${totalSpent.toLocaleString()}`, icon: Zap },
            { label: "Active Bookings", value: String(activeBookings.length), icon: Calendar },
          ].map((s) => (
            <div key={s.label} className="p-5 rounded-xl bg-card/50 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="font-heading text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bookings */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Your Bookings</h2>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : bookings.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card/50 p-10 text-center">
                <BatteryCharging className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No bookings yet</p>
                <Button asChild size="sm" className="rounded-xl"><Link to="/explore">Find Your First Charger</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading font-bold text-sm">{b.charger_title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.booking_date}</span>
                          <span>{b.start_time?.substring(0,5)} – {b.end_time?.substring(0,5)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-heading font-bold">₹{b.final_price || b.estimated_price}</span>
                        <span className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-lg",
                          b.status === "confirmed" ? "bg-primary/10 text-primary" :
                          b.status === "completed" ? "bg-primary/10 text-primary" :
                          b.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {b.status}
                        </span>
                      </div>
                    </div>

                    {b.status === "confirmed" && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-3">
                        {b.access_code && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                            <Shield className="w-3.5 h-3.5 text-primary" />
                            <span className="font-mono text-sm font-bold tracking-widest text-primary">{b.access_code}</span>
                          </div>
                        )}
                        {b.charger_lat && b.charger_lng && (
                          <Button size="sm" variant="outline" className="rounded-xl font-medium" onClick={() => {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.charger_lat},${b.charger_lng}`, "_blank");
                          }}>
                            <Navigation className="w-3.5 h-3.5 mr-1.5" />Navigate
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="rounded-xl font-medium text-destructive ml-auto" disabled={cancellingId === b.id} onClick={() => handleCancel(b.id)}>
                          {cancellingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Favorites */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" /> Saved Chargers
            </h2>
            {favChargers.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
                <Heart className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No favorites yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {favChargers.map((c) => (
                  <Link key={c.id} to={`/charger/${c.id}`} className="block rounded-xl border border-border/50 bg-card/50 p-4 hover:border-primary/30 transition-all">
                    <p className="font-heading font-bold text-sm">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{c.address}
                    </p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                      <span>{c.power} kW</span>
                      <span>₹{c.price_per_kwh}/kWh</span>
                      {c.rating && <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-primary text-primary" />{c.rating}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
