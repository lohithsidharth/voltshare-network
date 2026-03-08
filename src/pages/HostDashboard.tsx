import { Button } from "@/components/ui/button";
import {
  Plus, Loader2, Car, Star, CheckCircle, XCircle,
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
    if (error) { toast.error("Failed"); } else { setChargers(prev => prev.map(c => c.id === charger.id ? { ...c, is_active: newStatus } : c)); toast.success(newStatus ? "Online" : "Offline"); }
    setTogglingId(null);
  };

  const updateBookingStatus = async (bookingId: string, status: "confirmed" | "cancelled") => {
    setUpdatingStatusId(bookingId);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (error) { toast.error("Failed"); } else { setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b)); toast.success(status === "confirmed" ? "Confirmed" : "Cancelled"); }
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
    <div className="pt-12 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-[10px] tracking-wider text-primary mb-1">HOST DASHBOARD</p>
            <h1 className="font-heading text-2xl font-bold">Manage chargers & earnings</h1>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-sm font-mono text-[10px] tracking-wider"><Plus className="w-3 h-3 mr-1" />ADD CHARGER</Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-card rounded-sm max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-heading text-lg">Register Charger</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div><Label className="font-mono text-[10px] tracking-wider">TITLE</Label><Input placeholder="e.g. Home Charger – HSR" className="mt-1 rounded-sm bg-background" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div><Label className="font-mono text-[10px] tracking-wider">ADDRESS</Label><Input className="mt-1 rounded-sm bg-background" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="font-mono text-[10px] tracking-wider">LAT</Label><Input type="number" step="any" className="mt-1 rounded-sm bg-background" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} /></div>
                  <div><Label className="font-mono text-[10px] tracking-wider">LNG</Label><Input type="number" step="any" className="mt-1 rounded-sm bg-background" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="font-mono text-[10px] tracking-wider">POWER (KW)</Label><Input type="number" className="mt-1 rounded-sm bg-background" value={form.power} onChange={e => setForm(p => ({ ...p, power: e.target.value }))} /></div>
                  <div>
                    <Label className="font-mono text-[10px] tracking-wider">TYPE</Label>
                    <Select value={form.chargerType} onValueChange={v => setForm(p => ({ ...p, chargerType: v }))}>
                      <SelectTrigger className="mt-1 rounded-sm bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Type 1">Type 1</SelectItem><SelectItem value="Type 2">Type 2</SelectItem>
                        <SelectItem value="CCS">CCS</SelectItem><SelectItem value="CHAdeMO">CHAdeMO</SelectItem>
                        <SelectItem value="Wall Socket">Wall Socket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="font-mono text-[10px] tracking-wider">₹/KWH</Label><Input type="number" className="mt-1 rounded-sm bg-background" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
                  <div><Label className="font-mono text-[10px] tracking-wider">PEAK ₹</Label><Input type="number" className="mt-1 rounded-sm bg-background" value={form.peakPrice} onChange={e => setForm(p => ({ ...p, peakPrice: e.target.value }))} /></div>
                  <div><Label className="font-mono text-[10px] tracking-wider">OFF-PEAK ₹</Label><Input type="number" className="mt-1 rounded-sm bg-background" value={form.offPeakPrice} onChange={e => setForm(p => ({ ...p, offPeakPrice: e.target.value }))} /></div>
                </div>
                <div><Label className="font-mono text-[10px] tracking-wider">AVAILABILITY</Label><Input className="mt-1 rounded-sm bg-background" value={form.availability} onChange={e => setForm(p => ({ ...p, availability: e.target.value }))} /></div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.parkingAvailable} onCheckedChange={v => setForm(p => ({ ...p, parkingAvailable: v }))} />
                  <Label className="font-mono text-[10px] tracking-wider">PARKING</Label>
                </div>
                <Button className="w-full rounded-sm font-mono text-[10px] tracking-wider" onClick={handleAddCharger} disabled={adding}>
                  {adding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}REGISTER
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border mb-8">
          {[
            { label: "CHARGERS", value: String(chargers.filter(c => c.is_active).length) },
            { label: "BOOKINGS", value: String(bookings.length) },
            { label: "ENERGY", value: `${totalEnergy}kWh` },
            { label: "REVENUE", value: `₹${totalRevenue.toLocaleString()}` },
            { label: "EARNINGS", value: `₹${hostEarnings.toLocaleString()}` },
          ].map((s) => (
            <div key={s.label} className="bg-background p-4">
              <p className="font-mono text-[9px] tracking-wider text-muted-foreground">{s.label}</p>
              <p className="font-heading text-xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="border border-border p-4 mb-6">
          <p className="font-mono text-[10px] tracking-wider text-muted-foreground mb-3">EARNINGS — LAST 7 DAYS</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,14%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(0,0%,45%)", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(0,0%,45%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(0,0%,7%)", border: "1px solid hsl(0,0%,14%)", borderRadius: 0, color: "hsl(0,0%,93%)", fontFamily: "JetBrains Mono", fontSize: 11 }} formatter={(value: number) => [`₹${value}`, "Earnings"]} />
                <Bar dataKey="revenue" fill="hsl(145,100%,42%)" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chargers */}
          <div>
            <h2 className="font-mono text-[11px] tracking-wider text-muted-foreground mb-3">YOUR CHARGERS</h2>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : chargers.length === 0 ? (
              <div className="border border-border p-8 text-center"><p className="font-mono text-[11px] text-muted-foreground">NO CHARGERS YET</p></div>
            ) : (
              <div className="divide-y divide-border border border-border">
                {chargers.map((c) => (
                  <div key={c.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading font-semibold text-sm">{c.title}</p>
                        <div className="flex gap-3 font-mono text-[10px] tracking-wider text-muted-foreground mt-1">
                          <span>{c.power}KW</span><span>₹{c.price_per_kwh}/KWH</span><span>{c.charger_type}</span>
                          {c.rating != null && c.rating > 0 && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-primary text-primary" />{c.rating}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("font-mono text-[10px] tracking-wider font-semibold", c.is_active ? "text-primary" : "text-destructive")}>
                          {c.is_active ? "ONLINE" : "OFFLINE"}
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
            <h2 className="font-mono text-[11px] tracking-wider text-muted-foreground mb-3">RECENT BOOKINGS</h2>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : bookings.length === 0 ? (
              <div className="border border-border p-8 text-center"><p className="font-mono text-[11px] text-muted-foreground">NO BOOKINGS</p></div>
            ) : (
              <div className="divide-y divide-border border border-border">
                {bookings.map((b) => (
                  <div key={b.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{b.driver_profile?.display_name || "Driver"}</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{b.charger_title} · {b.booking_date} · {b.start_time?.substring(0,5)}–{b.end_time?.substring(0,5)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-sm">₹{b.final_price || b.estimated_price}</span>
                        <span className={cn("font-mono text-[9px] tracking-wider font-semibold",
                          b.status === "confirmed" ? "text-primary" : b.status === "completed" ? "text-primary" : "text-destructive"
                        )}>{b.status.toUpperCase()}</span>
                      </div>
                    </div>
                    {b.status === "pending" && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                        <Button size="sm" className="rounded-sm font-mono text-[10px] h-7" disabled={updatingStatusId === b.id} onClick={() => updateBookingStatus(b.id, "confirmed")}>
                          <CheckCircle className="w-3 h-3 mr-1" />ACCEPT
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-sm font-mono text-[10px] h-7 text-destructive" disabled={updatingStatusId === b.id} onClick={() => updateBookingStatus(b.id, "cancelled")}>
                          <XCircle className="w-3 h-3 mr-1" />REJECT
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
