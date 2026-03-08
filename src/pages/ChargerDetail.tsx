import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Zap, MapPin, Star, Calendar as CalendarIcon, Clock, IndianRupee,
  Car, Shield, Navigation, Loader2, Lock, Battery, Plug, Heart,
} from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

interface ChargerDetail {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  power: number;
  price_per_kwh: number;
  peak_price_per_kwh: number | null;
  off_peak_price_per_kwh: number | null;
  availability: string | null;
  rating: number | null;
  review_count: number | null;
  images: string[] | null;
  is_active: boolean | null;
  charger_type: string | null;
  parking_available: boolean | null;
  host_id: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  driver_id: string;
  profile?: { display_name: string | null };
}

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

const ChargerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [charger, setCharger] = useState<ChargerDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startSlot, setStartSlot] = useState<string | null>(null);
  const [endSlot, setEndSlot] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [existingBookings, setExistingBookings] = useState<string[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from("chargers").select("*").eq("id", id).single(),
        supabase.from("reviews").select("id, rating, comment, created_at, driver_id").eq("charger_id", id).order("created_at", { ascending: false }),
      ]);
      setCharger(c as any);
      if (r && r.length > 0) {
        const driverIds = [...new Set(r.map(rv => rv.driver_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", driverIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setReviews(r.map(rv => ({ ...rv, profile: profileMap.get(rv.driver_id) || { display_name: null } })));
      } else {
        setReviews([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!id || !date) return;
    const fetchBookings = async () => {
      const dateStr = format(date, "yyyy-MM-dd");
      const { data } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("charger_id", id)
        .eq("booking_date", dateStr)
        .in("status", ["pending", "confirmed"]);
      const booked: string[] = [];
      (data || []).forEach((b) => {
        const start = b.start_time.substring(0, 5);
        const end = b.end_time.substring(0, 5);
        TIME_SLOTS.forEach((slot) => {
          if (slot >= start && slot < end) booked.push(slot);
        });
      });
      setExistingBookings(booked);
    };
    fetchBookings();
  }, [id, date]);

  const getPrice = () => {
    if (!charger || !startSlot || !endSlot) return 0;
    const startHour = parseInt(startSlot.split(":")[0]);
    const endHour = parseInt(endSlot.split(":")[0]);
    if (endHour <= startHour) return 0;
    let total = 0;
    for (let h = startHour; h < endHour; h++) {
      const isPeak = h >= 18 && h < 22;
      const price = isPeak && charger.peak_price_per_kwh
        ? charger.peak_price_per_kwh
        : charger.off_peak_price_per_kwh || charger.price_per_kwh;
      total += price * charger.power;
    }
    return Math.round(total);
  };

  const handleBook = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!charger || !date || !startSlot || !endSlot) return;
    const estimatedPrice = getPrice();
    if (estimatedPrice <= 0) { toast.error("Select valid time slots"); return; }

    setBooking(true);
    const { data, error } = await supabase.from("bookings").insert({
      charger_id: charger.id,
      driver_id: user.id,
      booking_date: format(date, "yyyy-MM-dd"),
      start_time: startSlot,
      end_time: endSlot,
      estimated_price: estimatedPrice,
      status: "confirmed",
    }).select("id").single();

    if (error) {
      if (error.message.includes("just booked")) {
        toast.error("This slot was just booked. Try another time.");
      } else {
        toast.error("Booking failed: " + error.message);
      }
    } else {
      toast.success("Booking confirmed!");
      setTimeout(async () => {
        const { data: ac } = await supabase
          .from("access_codes")
          .select("code, valid_until")
          .eq("booking_id", data.id)
          .single();
        if (ac) setAccessCode(ac.code);
      }, 1000);
    }
    setBooking(false);
  };

  const handleSubmitReview = async () => {
    if (!user || !charger) { toast.error("Please sign in"); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      charger_id: charger.id,
      driver_id: user.id,
      rating: reviewRating,
      comment: reviewComment || null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Review submitted!");
      setShowReviewForm(false);
      setReviewComment("");
      const { data: r } = await supabase.from("reviews").select("id, rating, comment, created_at, driver_id").eq("charger_id", charger.id).order("created_at", { ascending: false });
      if (r) {
        const driverIds = [...new Set(r.map(rv => rv.driver_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", driverIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setReviews(r.map(rv => ({ ...rv, profile: profileMap.get(rv.driver_id) || { display_name: null } })));
      }
      const avgRating = r ? (r.reduce((sum, rv) => sum + rv.rating, 0) / r.length) : 0;
      await supabase.from("chargers").update({ rating: Math.round(avgRating * 10) / 10, review_count: r?.length || 0 }).eq("id", charger.id);
    }
    setSubmittingReview(false);
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading charger details...</p>
        </div>
      </div>
    );
  }

  if (!charger) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Battery className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Charger not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/explore")}>Back to Explore</Button>
        </div>
      </div>
    );
  }

  const isAvailable = charger.is_active;
  const isFav = isFavorite(charger.id);

  return (
    <div className="pt-20 pb-12 min-h-screen">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Hero header */}
        <div className="glass-card rounded-3xl p-8 mb-6 border-glow relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/3 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge className={cn("rounded-lg px-3 py-1 font-semibold text-xs", isAvailable ? "bg-secondary/15 text-secondary" : "bg-destructive/15 text-destructive")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 inline-block", isAvailable ? "bg-secondary" : "bg-destructive")} />
                  {isAvailable ? "Available Now" : "Currently Occupied"}
                </Badge>
                <Badge variant="outline" className="rounded-lg px-3 py-1 text-xs"><Plug className="w-3 h-3 mr-1" />{charger.charger_type || "Type 2"}</Badge>
                {charger.parking_available && <Badge variant="outline" className="rounded-lg px-3 py-1 text-xs"><Car className="w-3 h-3 mr-1" />Parking</Badge>}
              </div>
              {user && (
                <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => toggleFavorite(charger.id)}>
                  <Heart className={cn("w-5 h-5", isFav ? "text-destructive fill-destructive" : "text-muted-foreground")} />
                </Button>
              )}
            </div>

            <h1 className="font-heading text-3xl md:text-4xl font-extrabold mb-2">{charger.title}</h1>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-4">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{charger.address}</span>
            </div>

            {/* Quick info chips */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold">
                <Zap className="w-4 h-4" />{charger.power} kW
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-sm">
                <IndianRupee className="w-4 h-4" />₹{charger.price_per_kwh}/kWh
              </div>
              {charger.rating != null && charger.rating > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/10 text-secondary text-sm font-semibold">
                  <Star className="w-4 h-4 fill-secondary" />{charger.rating} ({charger.review_count} reviews)
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pricing Card */}
          <Card className="glass-card border-none rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading flex items-center gap-2 text-lg"><IndianRupee className="w-5 h-5 text-primary" />Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-accent/50">
                <span className="text-sm text-muted-foreground">Standard Rate</span>
                <span className="font-heading font-bold text-lg">₹{charger.price_per_kwh}/kWh</span>
              </div>
              {charger.peak_price_per_kwh && (
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-accent/50">
                  <span className="text-sm text-muted-foreground">Peak (6–10 PM)</span>
                  <span className="font-heading font-bold text-lg text-secondary">₹{charger.peak_price_per_kwh}/kWh</span>
                </div>
              )}
              {charger.off_peak_price_per_kwh && (
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-accent/50">
                  <span className="text-sm text-muted-foreground">Off-Peak</span>
                  <span className="font-heading font-bold text-lg">₹{charger.off_peak_price_per_kwh}/kWh</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-2">Platform takes 20% commission. Host earns 80%.</p>
            </CardContent>
          </Card>

          {/* Booking Card */}
          <Card className="glass-card border-none rounded-2xl lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading flex items-center gap-2 text-lg"><CalendarIcon className="w-5 h-5 text-primary" />Book a Charging Slot</CardTitle>
            </CardHeader>
            <CardContent>
              {!isAvailable && !accessCode ? (
                <div className="text-center py-10">
                  <Battery className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Charger is currently offline</p>
                  <p className="text-xs text-muted-foreground mt-1">Booking is disabled. Try again later.</p>
                </div>
              ) : accessCode ? (
                <div className="text-center py-8 space-y-5">
                  <div className="w-20 h-20 rounded-2xl bg-secondary/15 flex items-center justify-center mx-auto">
                    <Shield className="w-10 h-10 text-secondary" />
                  </div>
                  <h3 className="font-heading text-2xl font-bold">Booking Confirmed!</h3>
                  <div className="glass-card rounded-2xl p-8 inline-block border-glow">
                    <p className="text-sm text-muted-foreground mb-3">Your Secure Access Code</p>
                    <p className="font-heading text-5xl font-black tracking-[0.3em] text-primary">{accessCode}</p>
                    <p className="text-xs text-muted-foreground mt-3">Show this to the host or use at the charger</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" className="rounded-xl" onClick={() => {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${charger.latitude},${charger.longitude}`, "_blank");
                    }}>
                      <Navigation className="w-4 h-4 mr-2" />Navigate
                    </Button>
                    <Button className="rounded-xl" onClick={() => navigate("/driver")}>View My Bookings</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold mb-2">Select Date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl h-11", !date && "text-muted-foreground")}>
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {date ? format(date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-2">Select Time Slot</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const isBooked = existingBookings.includes(slot);
                        const isStart = startSlot === slot;
                        const isEnd = endSlot === slot;
                        const inRange = startSlot && endSlot && slot > startSlot && slot < endSlot;
                        const hour = parseInt(slot.split(":")[0]);
                        const isPeak = hour >= 18 && hour < 22;
                        return (
                          <button
                            key={slot}
                            disabled={isBooked}
                            onClick={() => {
                              if (!startSlot || (startSlot && endSlot)) {
                                setStartSlot(slot); setEndSlot(null);
                              } else {
                                if (slot > startSlot) setEndSlot(slot);
                                else { setStartSlot(slot); setEndSlot(null); }
                              }
                            }}
                            className={cn(
                              "p-2.5 rounded-xl text-xs font-semibold transition-all border",
                              isBooked ? "opacity-25 cursor-not-allowed border-border bg-muted" :
                              isStart || isEnd ? "bg-primary text-primary-foreground border-primary glow-soft" :
                              inRange ? "bg-primary/15 text-primary border-primary/30" :
                              "border-border hover:border-primary/40 bg-accent/50"
                            )}
                          >
                            {slot}
                            {isPeak && !isBooked && <span className="block text-[9px] text-secondary mt-0.5">Peak</span>}
                            {isBooked && <span className="block text-[9px] mt-0.5">Booked</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {startSlot && endSlot && (
                    <div className="glass-card rounded-2xl p-5 flex items-center justify-between border-glow">
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Cost</p>
                        <p className="font-heading text-3xl font-extrabold">₹{getPrice()}</p>
                        <p className="text-xs text-muted-foreground mt-1">{startSlot} – {endSlot} · {charger.power} kW</p>
                      </div>
                      <Button size="lg" className="rounded-xl glow-primary font-semibold" onClick={handleBook} disabled={booking}>
                        {booking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                        Confirm Booking
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reviews */}
        <Card className="glass-card border-none rounded-2xl mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading flex items-center gap-2 text-lg">
              <Star className="w-5 h-5 text-secondary" />Reviews ({reviews.length})
            </CardTitle>
            {user && (
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowReviewForm(!showReviewForm)}>
                Write Review
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {showReviewForm && (
              <div className="glass-card rounded-2xl p-5 space-y-4 border-glow">
                <div>
                  <p className="text-sm font-semibold mb-2">Rating</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setReviewRating(n)} className="focus:outline-none">
                        <Star className={cn("w-7 h-7 transition-colors", n <= reviewRating ? "text-secondary fill-secondary" : "text-muted-foreground")} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Comment</p>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Safe parking and fast charging..."
                    className="w-full rounded-xl border border-border bg-accent/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
                  />
                </div>
                <Button onClick={handleSubmitReview} disabled={submittingReview} size="sm" className="rounded-xl">
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Review
                </Button>
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No reviews yet. Be the first to review!</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-accent/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{(r.profile?.display_name || "D")[0].toUpperCase()}</span>
                      </div>
                      <span className="font-semibold text-sm">{r.profile?.display_name || "Driver"}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("w-3 h-3", i < r.rating ? "text-secondary fill-secondary" : "text-muted-foreground/30")} />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground pl-[42px]">{r.comment}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChargerDetailPage;
