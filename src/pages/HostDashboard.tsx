import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, IndianRupee, Users, TrendingUp, Calendar, Clock, Loader2, Car, Star, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

  // Add charger form state
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
          .limit(20),
      ]);

      const hostChargers = ch ?? [];
      setChargers(hostChargers);

      // Filter bookings to host's chargers
      const chargerIds = new Set(hostChargers.map(c => c.id));
      const hostBookings = (bk ?? []).filter(b => chargerIds.has(b.charger_id));

      // Fetch driver profiles
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
      setChargers((prev) => prev.map((c) => (c.id === charger.id ? { ...c, is_active: newStatus } : c)));
      toast.success(newStatus ? "Charger set to Available" : "Charger set to Occupied");
    }
    setTogglingId(null);
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
      // Refresh
      const { data } = await supabase.from("chargers")
        .select("id, title, power, price_per_kwh, peak_price_per_kwh, off_peak_price_per_kwh, availability, is_active, charger_type, parking_available, rating, review_count")
        .eq("host_id", user.id);
      setChargers(data ?? []);
    }
    setAdding(false);
  };

  // Stats calculations
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === "completed");
  const totalRevenue = bookings.reduce((s, b) => s + (b.final_price || b.estimated_price), 0);
  const hostEarnings = Math.round(totalRevenue * 0.8);

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
            <DialogContent className="glass border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">Add New Charger</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label>Title</Label><Input placeholder="e.g. Home Charger – HSR Layout" className="mt-1" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div><Label>Address</Label><Input placeholder="Full address" className="mt-1" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Latitude</Label><Input type="number" step="any" className="mt-1" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} /></div>
                  <div><Label>Longitude</Label><Input type="number" step="any" className="mt-1" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Power (kW)</Label><Input type="number" className="mt-1" value={form.power} onChange={e => setForm(p => ({ ...p, power: e.target.value }))} /></div>
                  <div>
                    <Label>Charger Type</Label>
                    <Select value={form.chargerType} onValueChange={v => setForm(p => ({ ...p, chargerType: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Price (₹/kWh)</Label><Input type="number" className="mt-1" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
                  <div><Label>Peak Price</Label><Input type="number" placeholder="₹12" className="mt-1" value={form.peakPrice} onChange={e => setForm(p => ({ ...p, peakPrice: e.target.value }))} /></div>
                  <div><Label>Off-Peak Price</Label><Input type="number" placeholder="₹8" className="mt-1" value={form.offPeakPrice} onChange={e => setForm(p => ({ ...p, offPeakPrice: e.target.value }))} /></div>
                </div>
                <div><Label>Availability</Label><Input placeholder="e.g. 6 PM – 9 AM" className="mt-1" value={form.availability} onChange={e => setForm(p => ({ ...p, availability: e.target.value }))} /></div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.parkingAvailable} onCheckedChange={v => setForm(p => ({ ...p, parkingAvailable: v }))} />
                  <Label className="flex items-center gap-1"><Car className="w-4 h-4" />Parking Available</Label>
                </div>
                <Button className="w-full" onClick={handleAddCharger} disabled={adding}>
                  {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Charger
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Zap, label: "Active Chargers", value: String(chargers.filter(c => c.is_active).length), color: "text-primary" },
            { icon: Users, label: "Total Bookings", value: String(totalBookings), color: "text-secondary" },
            { icon: IndianRupee, label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "text-primary" },
            { icon: TrendingUp, label: "Your Earnings (80%)", value: `₹${hostEarnings.toLocaleString()}`, color: "text-secondary" },
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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : chargers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No chargers yet. Add one to get started!</p>
              ) : (
                chargers.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{c.title}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>{c.power} kW</span>
                          <span>₹{c.price_per_kwh}/kWh</span>
                          <span>{c.charger_type}</span>
                          {c.parking_available && <span className="flex items-center gap-0.5"><Car className="w-3 h-3" />Parking</span>}
                        </div>
                        {c.rating != null && c.rating > 0 && (
                          <div className="flex items-center gap-1 text-xs text-secondary mt-1">
                            <Star className="w-3 h-3 fill-secondary" />{c.rating} ({c.review_count} reviews)
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={c.is_active ? "bg-green-500/20 text-green-400 text-xs" : "bg-red-500/20 text-red-400 text-xs"}>
                          {c.is_active ? "Available" : "Occupied"}
                        </Badge>
                        <Switch checked={!!c.is_active} disabled={togglingId === c.id} onCheckedChange={() => toggleAvailability(c)} />
                      </div>
                    </div>
                    {c.peak_price_per_kwh && (
                      <div className="flex gap-2 text-[10px]">
                        <Badge variant="outline" className="text-[10px]">Peak: ₹{c.peak_price_per_kwh}/kWh</Badge>
                        {c.off_peak_price_per_kwh && <Badge variant="outline" className="text-[10px]">Off-Peak: ₹{c.off_peak_price_per_kwh}/kWh</Badge>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card className="glass-light border-border">
            <CardHeader><CardTitle className="font-heading">Recent Bookings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No bookings yet.</p>
              ) : (
                bookings.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl bg-muted/50 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{b.driver_profile?.display_name || "Driver"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.charger_title}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.booking_date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.start_time?.substring(0,5)} – {b.end_time?.substring(0,5)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-heading font-semibold">₹{b.final_price || b.estimated_price}</span>
                      <Badge className={
                        b.status === "confirmed" ? "bg-primary/20 text-primary text-[10px] ml-2" :
                        b.status === "completed" ? "bg-green-500/20 text-green-400 text-[10px] ml-2" :
                        "bg-muted text-muted-foreground text-[10px] ml-2"
                      }>{b.status}</Badge>
                    </div>
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
