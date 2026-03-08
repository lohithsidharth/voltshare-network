import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap, Plus, IndianRupee, Users, TrendingUp, Calendar, Clock, Loader2,
  Car, Star, Battery, CheckCircle, XCircle,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface HostCharger {
  id: string;
  title: string;
  power: number;
  price_per_kwh: number;
  peak_price_per_kwh: number | null;
  off_peak_price_per_kwh: number | null;
  availability: string | null;
  is_active: boolean | null;
  charger_type: string | null;
  parking_available: boolean | null;
  rating: number | null;
  review_count: number | null;
}

interface BookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  estimated_price: number;
  final_price: number | null;
  status: string;
  driver_id: string;
  charger_id: string;
  driver_profile?: { display_name: string | null };
  charger_title?: string;
}

const HostDashboard = () => {
  const [addOpen, setAddOpen] = useState(false);
  const { user } = useAuth();
  const [chargers, setChargers] = useState<HostCharger[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", address: "", power: "7.4", price: "10",
    peakPrice: "", offPeakPrice: "", availability: "6 PM – 9 AM",
    chargerType: "Type 2", parkingAvailable: true,
    latitude: "12.9716", longitude: "77.5946",
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [{ data: ch }, { data: bk }] = await Promise.all([
        supabase.from("chargers")
          .select("id, title, power, price_per_kwh, peak_price_per_kwh, off_peak_price_per_kwh, availability, is_active, charger_type, parking_available, rating, review_count")
          .eq("host_id", user.id),
        supabase.from("bookings")
          .select("id, booking_date, start_time, end_time, estimated_price, final_price, status, driver_id, charger_id")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const hostChargers = ch ?? [];
      setChargers(hostChargers);

      const chargerIds = new Set(hostChargers.map(c => c.id));
      const hostBookings = (bk ?? []).filter(b => chargerIds.has(b.charger_id));

      if (hostBookings.length > 0) {
        const driverIds = [...new Set(hostBookings.map(b => b.driver_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", driverIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const chargerMap = new Map(hostChargers.map(c => [c.id, c.title]));
        setBookings(hostBookings.map(b => ({
          ...b,
          driver_profile: profileMap.get(b.driver_id) || { display_name: null },
          charger_title: chargerMap.get(b.charger_id) || "Unknown",
        })));
      } else {
        setBookings([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const toggleAvailability = async (charger: HostCharger) => {
    setTogglingId(charger.id);
    const newStatus = !charger.is_active;
    const { error } = await supabase.from("chargers").update({ is_active: newStatus }).eq("id", charger.id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      setChargers(prev => prev.map(c => c.id === charger.id ? { ...c, is_active: newStatus } : c));
      toast.success(newStatus ? "Charger set to Available" : "Charger set to Offline");
    }
    setTogglingId(null);
  };

  const updateBookingStatus = async (bookingId: string, status: "confirmed" | "cancelled") => {
    setUpdatingStatusId(bookingId);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (error) {
      toast.error("Failed to update booking");
    } else {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      toast.success(status === "confirmed" ? "Booking confirmed" : "Booking cancelled");
    }
    setUpdatingStatusId(null);
  };

  const handleAddCharger = async () => {
    if (!user) return;
    if (!form.title || !form.address) { toast.error("Title and address required"); return; }
    setAdding(true);
    const { error } = await supabase.from("chargers").insert({
      host_id: user.id,
      title: form.title,
      address: form.address,
      latitude: parseFloat(form.latitude) || 12.9716,
      longitude: parseFloat(form.longitude) || 77.5946,
      power: parseFloat(form.power) || 7.4,
      price_per_kwh: parseFloat(form.price) || 10,
      peak_price_per_kwh: form.peakPrice ? parseFloat(form.peakPrice) : null,
      off_peak_price_per_kwh: form.offPeakPrice ? parseFloat(form.offPeakPrice) : null,
      availability: form.availability,
      charger_type: form.chargerType,
      parking_available: form.parkingAvailable,
    });
    if (error) {
      toast.error("Failed to add: " + error.message);
    } else {
      toast.success("Charger added!");
      setAddOpen(false);
      const { data } = await supabase.from("chargers")
        .select("id, title, power, price_per_kwh, peak_price_per_kwh, off_peak_price_per_kwh, availability, is_active, charger_type, parking_available, rating, review_count")
        .eq("host_id", user.id);
      setChargers(data ?? []);
    }
    setAdding(false);
  };

  // Stats
  const completedBookings = bookings.filter(b => b.status === "completed");
  const totalRevenue = bookings.filter(b => ["completed", "confirmed"].includes(b.status)).reduce((s, b) => s + (b.final_price || b.estimated_price), 0);
  const hostEarnings = Math.round(totalRevenue * 0.8);
  const totalEnergy = completedBookings.reduce((s, b) => {
    const hours = (parseInt(b.end_time?.substring(0, 2) || "0") - parseInt(b.start_time?.substring(0, 2) || "0"));
    const charger = chargers.find(c => c.id === b.charger_id);
    return s + hours * (charger?.power || 7);
  }, 0);

  // Chart data: last 7 days
  const chartData = useMemo(() => {
    const days: { day: string; revenue: number; sessions: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayBookings = bookings.filter(b => b.booking_date === dateStr && ["completed", "confirmed"].includes(b.status));
      days.push({
        day: d.toLocaleDateString("en", { weekday: "short" }),
        revenue: Math.round(dayBookings.reduce((s, b) => s + (b.final_price || b.estimated_price), 0) * 0.8),
        sessions: dayBookings.length,
      });
    }
    return days;
  }, [bookings]);

  return (
    <div className="pt-20 pb-12 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-extrabold">Host Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your chargers & track earnings</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-semibold glow-soft"><Plus className="w-4 h-4 mr-2" />Add Charger</Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/50 max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Register New Charger</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label className="text-xs font-semibold">Title</Label><Input placeholder="e.g. Home Charger – HSR Layout" className="mt-1.5 rounded-xl bg-accent/50 border-none" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div><Label className="text-xs font-semibold">Address</Label><Input placeholder="Full address" className="mt-1.5 rounded-xl bg-accent/50 border-none" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs font-semibold">Latitude</Label><Input type="number" step="any" className="mt-1.5 rounded-xl bg-accent/50 border-none" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} /></div>
                  <div><Label className="text-xs font-semibold">Longitude</Label><Input type="number" step="any" className="mt-1.5 rounded-xl bg-accent/50 border-none" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs font-semibold">Power (kW)</Label><Input type="number" className="mt-1.5 rounded-xl bg-accent/50 border-none" value={form.power} onChange={e => setForm(p => ({ ...p, power: e.target.value }))} /></div>
                  <div>
                    <Label className="text-xs font-semibold">Charger Type</Label>
                    <Select value={form.chargerType} onValueChange={v => setForm(p => ({ ...p, chargerType: v }))}>
                      <SelectTrigger className="mt-1.5 rounded-xl bg-accent/50 border-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Type 1">Type 1</SelectItem>
                        <SelectItem value="Type 2">Type 2</SelectItem>
                        <SelectItem value="CCS">CCS</SelectItem>
                        <SelectItem value="CHAdeMO">CHAdeMO</SelectItem>
                        <SelectItem value="Wall Socket">Wall Socket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs font-semibold">₹/kWh</Label><Input type="number" className="mt-1.5 rounded-xl bg-accent/50 border-none" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
                  <div><Label className="text-xs font-semibold">Peak ₹</Label><Input type="number" placeholder="₹12" className="mt-1.5 rounded-xl bg-accent/50 border-none" value={form.peakPrice} onChange={e => setForm(p => ({ ...p, peakPrice: e.target.value }))} /></div>
                  <div><Label className="text-xs font-semibold">Off-Peak ₹</Label><Input type="number" placeholder="₹8" className="mt-1.5 rounded-xl bg-accent/50 border-none" value={form.offPeakPrice} onChange={e => setForm(p => ({ ...p, offPeakPrice: e.target.value }))} /></div>
                </div>
                <div><Label className="text-xs font-semibold">Availability</Label><Input placeholder="e.g. 6 PM – 9 AM" className="mt-1.5 rounded-xl bg-accent/50 border-none" value={form.availability} onChange={e => setForm(p => ({ ...p, availability: e.target.value }))} /></div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.parkingAvailable} onCheckedChange={v => setForm(p => ({ ...p, parkingAvailable: v }))} />
                  <Label className="flex items-center gap-1.5 text-sm"><Car className="w-4 h-4" />Parking Available</Label>
                </div>
                <Button className="w-full rounded-xl font-semibold" onClick={handleAddCharger} disabled={adding}>
                  {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Register Charger
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { icon: Zap, label: "Active Chargers", value: String(chargers.filter(c => c.is_active).length), color: "text-primary", bg: "bg-primary/10" },
            { icon: Users, label: "Total Bookings", value: String(bookings.length), color: "text-secondary", bg: "bg-secondary/10" },
            { icon: Battery, label: "Energy Delivered", value: `${totalEnergy} kWh`, color: "text-primary", bg: "bg-primary/10" },
            { icon: IndianRupee, label: "Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "text-secondary", bg: "bg-secondary/10" },
            { icon: TrendingUp, label: "Your Earnings", value: `₹${hostEarnings.toLocaleString()}`, color: "text-primary", bg: "bg-primary/10" },
          ].map((s) => (
            <Card key={s.label} className="glass-card border-none rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", s.bg, s.color)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className="font-heading text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Earnings Chart */}
        <Card className="glass-card border-none rounded-2xl mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />Earnings (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,16%)" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(215,18%,55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215,18%,55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(222,44%,10%)", border: "1px solid hsl(222,25%,16%)", borderRadius: 12, color: "hsl(210,40%,96%)", fontFamily: "Outfit" }}
                    formatter={(value: number, name: string) => [name === "revenue" ? `₹${value}` : value, name === "revenue" ? "Earnings" : "Sessions"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(213,100%,50%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chargers */}
          <Card className="glass-card border-none rounded-2xl">
            <CardHeader><CardTitle className="font-heading text-lg">Your Chargers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : chargers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No chargers yet. Register one to start earning!</p>
              ) : (
                chargers.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-accent/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading font-semibold text-sm">{c.title}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" />{c.power} kW</span>
                          <span>₹{c.price_per_kwh}/kWh</span>
                          <span>{c.charger_type}</span>
                          {c.parking_available && <span className="flex items-center gap-0.5"><Car className="w-3 h-3" />Parking</span>}
                        </div>
                        {c.rating != null && c.rating > 0 && (
                          <div className="flex items-center gap-1 text-xs text-secondary mt-1">
                            <Star className="w-3 h-3 fill-secondary" />{c.rating} ({c.review_count})
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={cn("rounded-lg text-[10px] font-semibold", c.is_active ? "bg-secondary/15 text-secondary" : "bg-destructive/15 text-destructive")}>
                          {c.is_active ? "Active" : "Offline"}
                        </Badge>
                        <Switch checked={!!c.is_active} disabled={togglingId === c.id} onCheckedChange={() => toggleAvailability(c)} />
                      </div>
                    </div>
                    {c.peak_price_per_kwh && (
                      <div className="flex gap-2 text-[10px]">
                        <Badge variant="outline" className="rounded-md text-[10px]">Peak: ₹{c.peak_price_per_kwh}</Badge>
                        {c.off_peak_price_per_kwh && <Badge variant="outline" className="rounded-md text-[10px]">Off-Peak: ₹{c.off_peak_price_per_kwh}</Badge>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Bookings */}
          <Card className="glass-card border-none rounded-2xl">
            <CardHeader><CardTitle className="font-heading text-lg">Recent Bookings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No bookings yet.</p>
              ) : (
                bookings.map((b) => (
                  <div key={b.id} className="p-4 rounded-2xl bg-accent/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading font-semibold text-sm">{b.driver_profile?.display_name || "Driver"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.charger_title}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.booking_date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.start_time?.substring(0,5)} – {b.end_time?.substring(0,5)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-heading font-bold">₹{b.final_price || b.estimated_price}</span>
                        <Badge className={cn(
                          "rounded-lg text-[10px] font-semibold ml-2",
                          b.status === "confirmed" ? "bg-primary/15 text-primary" :
                          b.status === "completed" ? "bg-secondary/15 text-secondary" :
                          b.status === "cancelled" ? "bg-destructive/15 text-destructive" :
                          "bg-muted text-muted-foreground"
                        )}>{b.status}</Badge>
                      </div>
                    </div>
                    {b.status === "pending" && (
                      <div className="mt-3 flex gap-2 border-t border-border/50 pt-3">
                        <Button
                          size="sm"
                          className="rounded-xl text-xs"
                          disabled={updatingStatusId === b.id}
                          onClick={() => updateBookingStatus(b.id, "confirmed")}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl text-xs text-destructive"
                          disabled={updatingStatusId === b.id}
                          onClick={() => updateBookingStatus(b.id, "cancelled")}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
