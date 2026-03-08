import { Button } from "@/components/ui/button";
import {
  Plus, Loader2, Star, CheckCircle, XCircle, Zap, BatteryCharging, TrendingUp, BarChart3,
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface HostCharger {
  id: string; title: string; power: number; price_per_kwh: number;
  peak_price_per_kwh: number | null; off_peak_price_per_kwh: number | null;
  availability: string | null; is_active: boolean | null; charger_type: string | null;
  parking_available: boolean | null; rating: number | null; review_count: number | null;
}

interface BookingRow {
  id: string; booking_date: string; start_time: string; end_time: string;
  estimated_price: number; final_price: number | null; status: string;
  driver_id: string; charger_id: string; driver_profile?: { display_name: string | null }; charger_title?: string;
}

const HostDashboard = () => {
  const [addOpen, setAddOpen] = useState(false);
  const { user } = useAuth();
  const [chargers, setChargers] = useState<HostCharger[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", address: "", power: "7.4", price: "10", peakPrice: "", offPeakPrice: "", availability: "6 PM – 9 AM", chargerType: "Type 2", parkingAvailable: true, latitude: "12.9716", longitude: "77.5946" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [{ data: ch }, { data: bk }] = await Promise.all([
        supabase.from("chargers").select("id, title, power, price_per_kwh, peak_price_per_kwh, off_peak_price_per_kwh, availability, is_active, charger_type, parking_available, rating, review_count").eq("host_id", user.id),
        supabase.from("bookings").select("id, booking_date, start_time, end_time, estimated_price, final_price, status, driver_id, charger_id").order("created_at", { ascending: false }).limit(50),
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
        setBookings(hostBookings.map(b => ({ ...b, driver_profile: profileMap.get(b.driver_id) || { display_name: null }, charger_title: chargerMap.get(b.charger_id) || "Unknown" })));
      } else { setBookings([]); }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const toggleAvailability = async (charger: HostCharger) => {
    setTogglingId(charger.id);
    const newStatus = !charger.is_active;
    const { error } = await supabase.from("chargers").update({ is_active: newStatus }).eq("id", charger.id);
    if (error) { toast.error("Failed"); } else { setChargers(prev => prev.map(c => c.id === charger.id ? { ...c, is_active: newStatus } : c)); toast.success(newStatus ? "Charger is now online" : "Charger is now offline"); }
    setTogglingId(null);
  };

  const updateBookingStatus = async (bookingId: string, status: "confirmed" | "cancelled") => {
    setUpdatingStatusId(bookingId);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (error) { toast.error("Failed"); } else { setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b)); toast.success(status === "confirmed" ? "Booking confirmed" : "Booking cancelled"); }
    setUpdatingStatusId(null);
  };

  const handleAddCharger = async () => {
    if (!user) return;
    if (!form.title || !form.address) { toast.error("Title and address required"); return; }
    setAdding(true);
    const { error } = await supabase.from("chargers").insert({
      host_id: user.id, title: form.title, address: form.address,
      latitude: parseFloat(form.latitude) || 12.9716, longitude: parseFloat(form.longitude) || 77.5946,
      power: parseFloat(form.power) || 7.4, price_per_kwh: parseFloat(form.price) || 10,
      peak_price_per_kwh: form.peakPrice ? parseFloat(form.peakPrice) : null,
      off_peak_price_per_kwh: form.offPeakPrice ? parseFloat(form.offPeakPrice) : null,
      availability: form.availability, charger_type: form.chargerType, parking_available: form.parkingAvailable,
    });
    if (error) { toast.error("Failed: " + error.message); } else {
      toast.success("Charger added!");
      setAddOpen(false);
      const { data } = await supabase.from("chargers").select("id, title, power, price_per_kwh, peak_price_per_kwh, off_peak_price_per_kwh, availability, is_active, charger_type, parking_available, rating, review_count").eq("host_id", user.id);
      setChargers(data ?? []);
    }
    setAdding(false);
  };

  const completedBookings = bookings.filter(b => b.status === "completed");
  const totalRevenue = bookings.filter(b => ["completed", "confirmed"].includes(b.status)).reduce((s, b) => s + (b.final_price || b.estimated_price), 0);
  const hostEarnings = Math.round(totalRevenue * 0.8);
  const totalEnergy = completedBookings.reduce((s, b) => {
    const hours = (parseInt(b.end_time?.substring(0, 2) || "0") - parseInt(b.start_time?.substring(0, 2) || "0"));
    const charger = chargers.find(c => c.id === b.charger_id);
    return s + hours * (charger?.power || 7);
  }, 0);

  const chartData = useMemo(() => {
    const days: { day: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayBookings = bookings.filter(b => b.booking_date === dateStr && ["completed", "confirmed"].includes(b.status));
      days.push({ day: d.toLocaleDateString("en", { weekday: "short" }), revenue: Math.round(dayBookings.reduce((s, b) => s + (b.final_price || b.estimated_price), 0) * 0.8) });
    }
    return days;
  }, [bookings]);

  return (
    <div className="pt-16 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold">Host Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your chargers and track earnings</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-medium"><Plus className="w-4 h-4 mr-2" />Add Charger</Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-card rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-heading text-xl font-bold">Register a New Charger</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label className="text-sm font-medium">Charger Name</Label><Input placeholder="e.g. Home Charger – HSR Layout" className="mt-1.5 rounded-xl bg-background h-11" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div><Label className="text-sm font-medium">Address</Label><Input className="mt-1.5 rounded-xl bg-background h-11" placeholder="Full address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-sm font-medium">Latitude</Label><Input type="number" step="any" className="mt-1.5 rounded-xl bg-background h-11" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} /></div>
                  <div><Label className="text-sm font-medium">Longitude</Label><Input type="number" step="any" className="mt-1.5 rounded-xl bg-background h-11" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-sm font-medium">Power (kW)</Label><Input type="number" className="mt-1.5 rounded-xl bg-background h-11" value={form.power} onChange={e => setForm(p => ({ ...p, power: e.target.value }))} /></div>
                  <div>
                    <Label className="text-sm font-medium">Connector Type</Label>
                    <Select value={form.chargerType} onValueChange={v => setForm(p => ({ ...p, chargerType: v }))}>
                      <SelectTrigger className="mt-1.5 rounded-xl bg-background h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Type 1">Type 1</SelectItem><SelectItem value="Type 2">Type 2</SelectItem>
                        <SelectItem value="CCS">CCS</SelectItem><SelectItem value="CHAdeMO">CHAdeMO</SelectItem>
                        <SelectItem value="Wall Socket">Wall Socket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-sm font-medium">₹/kWh</Label><Input type="number" className="mt-1.5 rounded-xl bg-background h-11" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
                  <div><Label className="text-sm font-medium">Peak ₹</Label><Input type="number" className="mt-1.5 rounded-xl bg-background h-11" value={form.peakPrice} onChange={e => setForm(p => ({ ...p, peakPrice: e.target.value }))} /></div>
                  <div><Label className="text-sm font-medium">Off-peak ₹</Label><Input type="number" className="mt-1.5 rounded-xl bg-background h-11" value={form.offPeakPrice} onChange={e => setForm(p => ({ ...p, offPeakPrice: e.target.value }))} /></div>
                </div>
                <div><Label className="text-sm font-medium">Available Hours</Label><Input className="mt-1.5 rounded-xl bg-background h-11" value={form.availability} onChange={e => setForm(p => ({ ...p, availability: e.target.value }))} /></div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <Switch checked={form.parkingAvailable} onCheckedChange={v => setForm(p => ({ ...p, parkingAvailable: v }))} />
                  <div>
                    <p className="text-sm font-medium">Parking Available</p>
                    <p className="text-xs text-muted-foreground">Dedicated parking spot for charging</p>
                  </div>
                </div>
                <Button className="w-full rounded-xl font-medium h-11" onClick={handleAddCharger} disabled={adding}>
                  {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Register Charger
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Active Chargers", value: String(chargers.filter(c => c.is_active).length), icon: Zap },
            { label: "Total Bookings", value: String(bookings.length), icon: BarChart3 },
            { label: "Energy Delivered", value: `${totalEnergy} kWh`, icon: BatteryCharging },
            { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp },
            { label: "Your Earnings", value: `₹${hostEarnings.toLocaleString()}`, icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="font-heading text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 mb-8">
          <p className="text-sm font-medium mb-4">Earnings — Last 7 Days</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,12%,16%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(210,10%,50%)", fontSize: 12, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(210,10%,50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(210,18%,9%)", border: "1px solid hsl(210,12%,16%)", borderRadius: 12, color: "hsl(210,20%,95%)", fontFamily: "DM Sans", fontSize: 13 }} formatter={(value: number) => [`₹${value}`, "Earnings"]} />
                <Bar dataKey="revenue" fill="hsl(155,80%,45%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chargers */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Your Chargers</h2>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : chargers.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card/50 p-10 text-center">
                <BatteryCharging className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No chargers registered yet</p>
                <Button size="sm" className="mt-3 rounded-xl" onClick={() => setAddOpen(true)}>Add Your First Charger</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {chargers.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading font-bold text-sm">{c.title}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>{c.power} kW</span>
                          <span>₹{c.price_per_kwh}/kWh</span>
                          <span>{c.charger_type}</span>
                          {c.rating != null && c.rating > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-primary text-primary" />{c.rating}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-lg",
                          c.is_active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                        )}>
                          {c.is_active ? "Online" : "Offline"}
                        </span>
                        <Switch checked={!!c.is_active} disabled={togglingId === c.id} onCheckedChange={() => toggleAvailability(c)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bookings */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent Bookings</h2>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : bookings.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card/50 p-10 text-center">
                <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{b.driver_profile?.display_name || "Driver"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.charger_title} · {b.booking_date} · {b.start_time?.substring(0,5)}–{b.end_time?.substring(0,5)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-sm">₹{b.final_price || b.estimated_price}</span>
                        <span className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-lg",
                          b.status === "confirmed" ? "bg-primary/10 text-primary" :
                          b.status === "completed" ? "bg-primary/10 text-primary" :
                          "bg-destructive/10 text-destructive"
                        )}>{b.status}</span>
                      </div>
                    </div>
                    {b.status === "pending" && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                        <Button size="sm" className="rounded-xl font-medium" disabled={updatingStatusId === b.id} onClick={() => updateBookingStatus(b.id, "confirmed")}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Accept
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-xl font-medium text-destructive" disabled={updatingStatusId === b.id} onClick={() => updateBookingStatus(b.id, "cancelled")}>
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
