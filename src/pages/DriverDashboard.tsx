import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Calendar, Clock, Loader2, Navigation, Heart, XCircle, Star, Shield,
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
    if (error) { toast.error("Failed to cancel"); } else { toast.success("Cancelled"); setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "cancelled" } : b)); }
    setCancellingId(null);
  };

  const totalSpent = bookings.reduce((s, b) => s + (b.final_price || b.estimated_price), 0);
  const totalSessions = bookings.filter(b => b.status === "completed").length;
  const activeBookings = bookings.filter(b => b.status === "confirmed");

  return (
    <div className="pt-12 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-[10px] tracking-wider text-primary mb-1">DRIVER DASHBOARD</p>
            <h1 className="font-heading text-2xl font-bold">Welcome, {profile?.display_name || "Driver"}</h1>
          </div>
          <Button asChild size="sm" className="rounded-sm font-mono text-[10px] tracking-wider">
            <Link to="/explore">FIND CHARGER</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-border mb-8">
          {[
            { label: "SESSIONS", value: String(totalSessions) },
            { label: "TOTAL SPENT", value: `₹${totalSpent.toLocaleString()}` },
            { label: "ACTIVE", value: String(activeBookings.length) },
          ].map((s) => (
            <div key={s.label} className="bg-background p-5">
              <p className="font-mono text-[10px] tracking-wider text-muted-foreground">{s.label}</p>
              <p className="font-heading text-2xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bookings */}
          <div className="lg:col-span-2">
            <h2 className="font-mono text-[11px] tracking-wider text-muted-foreground mb-3">BOOKINGS</h2>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : bookings.length === 0 ? (
              <div className="border border-border p-10 text-center">
                <p className="font-mono text-[11px] text-muted-foreground">NO BOOKINGS YET</p>
                <Button asChild size="sm" className="mt-3 rounded-sm font-mono text-[10px]"><Link to="/explore">FIND CHARGER</Link></Button>
              </div>
            ) : (
              <div className="divide-y divide-border border border-border">
                {bookings.map((b) => (
                  <div key={b.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading font-semibold text-sm">{b.charger_title}</p>
                        <div className="flex items-center gap-3 font-mono text-[10px] tracking-wider text-muted-foreground mt-1">
                          <span>{b.booking_date}</span>
                          <span>{b.start_time?.substring(0,5)}–{b.end_time?.substring(0,5)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-heading font-bold">₹{b.final_price || b.estimated_price}</span>
                        <span className={cn("font-mono text-[10px] tracking-wider font-semibold",
                          b.status === "confirmed" ? "text-primary" : b.status === "completed" ? "text-primary" : b.status === "cancelled" ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {b.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {b.status === "confirmed" && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
                        {b.access_code && (
                          <div className="flex items-center gap-2 border border-border px-3 py-1.5">
                            <Shield className="w-3 h-3 text-primary" />
                            <span className="font-mono text-[11px] font-bold tracking-widest text-primary">{b.access_code}</span>
                          </div>
                        )}
                        {b.charger_lat && b.charger_lng && (
                          <Button size="sm" variant="outline" className="rounded-sm font-mono text-[10px] h-7" onClick={() => {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.charger_lat},${b.charger_lng}`, "_blank");
                          }}>
                            <Navigation className="w-3 h-3 mr-1" />NAV
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="rounded-sm font-mono text-[10px] h-7 text-destructive ml-auto" disabled={cancellingId === b.id} onClick={() => handleCancel(b.id)}>
                          {cancellingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                          CANCEL
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
            <h2 className="font-mono text-[11px] tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Heart className="w-3 h-3" />FAVORITES
            </h2>
            {favChargers.length === 0 ? (
              <div className="border border-border p-6 text-center">
                <p className="font-mono text-[11px] text-muted-foreground">NO FAVORITES</p>
              </div>
            ) : (
              <div className="divide-y divide-border border border-border">
                {favChargers.map((c) => (
                  <Link key={c.id} to={`/charger/${c.id}`} className="block p-3 hover:bg-accent transition-colors">
                    <p className="font-heading font-semibold text-sm">{c.title}</p>
                    <div className="flex gap-3 font-mono text-[10px] tracking-wider text-muted-foreground mt-1">
                      <span>{c.power}KW</span>
                      <span>₹{c.price_per_kwh}/KWH</span>
                      {c.rating && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-primary text-primary" />{c.rating}</span>}
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
