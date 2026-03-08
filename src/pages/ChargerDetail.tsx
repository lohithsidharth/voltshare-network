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
  Car, Shield, Navigation, Loader2, Lock, ChevronRight,
} from "lucide-react";

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
  const [charger, setCharger] = useState<ChargerDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startSlot, setStartSlot] = useState<string | null>(null);
  const [endSlot, setEndSlot] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [existingBookings, setExistingBookings] = useState<string[]>([]);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from("chargers").select("*").eq("id", id).single(),
        supabase.from("reviews").select("id, rating, comment, created_at, driver_id").eq("charger_id", id).order("created_at", { ascending: false }),
      ]);
      setCharger(c as any);
      // Fetch profiles for reviews
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
    fetch();
  }, [id]);

  // Fetch existing bookings for the selected date
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
    const hours = endHour - startHour;
    if (hours <= 0) return 0;
    // Dynamic pricing: peak 6pm-10pm
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
      toast.error("Booking failed: " + error.message);
    } else {
      toast.success("Booking confirmed!");
      // Fetch access code
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
      // Refresh reviews
      const { data: r } = await supabase.from("reviews").select("id, rating, comment, created_at, driver_id").eq("charger_id", charger.id).order("created_at", { ascending: false });
      if (r) {
        const driverIds = [...new Set(r.map(rv => rv.driver_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", driverIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setReviews(r.map(rv => ({ ...rv, profile: profileMap.get(rv.driver_id) || { display_name: null } })));
      }
      // Update charger rating
      const avgRating = r ? (r.reduce((sum, rv) => sum + rv.rating, 0) / r.length) : 0;
      await supabase.from("chargers").update({ rating: Math.round(avgRating * 10) / 10, review_count: r?.length || 0 }).eq("id", charger.id);
    }
    setSubmittingReview(false);
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!charger) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Charger not found</p>
      </div>
    );
  }

  const isAvailable = charger.is_active;

  return (
    <div className="pt-20 pb-12 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={isAvailable ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
              {isAvailable ? "Available" : "Occupied"}
            </Badge>
            <Badge variant="outline">{charger.charger_type || "Type 2"}</Badge>
            {charger.parking_available && <Badge variant="outline"><Car className="w-3 h-3 mr-1" />Parking</Badge>}
          </div>
          <h1 className="font-heading text-3xl font-bold">{charger.title}</h1>
          <div className="flex items-center gap-1 text-muted-foreground mt-1">
            <MapPin className="w-4 h-4" />
            <span>{charger.address}</span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-primary"><Zap className="w-4 h-4" />{charger.power} kW</span>
            {charger.rating && (
              <span className="flex items-center gap-1 text-secondary">
                <Star className="w-4 h-4 fill-secondary" />{charger.rating} ({charger.review_count} reviews)
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pricing Card */}
          <Card className="glass-light border-border lg:col-span-1">
            <CardHeader><CardTitle className="font-heading flex items-center gap-2"><IndianRupee className="w-5 h-5" />Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Standard Rate</span>
                <span className="font-heading font-bold">₹{charger.price_per_kwh}/kWh</span>
              </div>
              {charger.peak_price_per_kwh && (
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Peak (6–10 PM)</span>
                  <span className="font-heading font-bold text-secondary">₹{charger.peak_price_per_kwh}/kWh</span>
                </div>
              )}
              {charger.off_peak_price_per_kwh && (
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Off-Peak</span>
                  <span className="font-heading font-bold">₹{charger.off_peak_price_per_kwh}/kWh</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Platform takes 20% commission. Host earns 80%.</p>
            </CardContent>
          </Card>

          {/* Booking Card */}
          <Card className="glass-light border-border lg:col-span-2">
            <CardHeader><CardTitle className="font-heading flex items-center gap-2"><CalendarIcon className="w-5 h-5" />Book a Slot</CardTitle></CardHeader>
            <CardContent>
              {accessCode ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <Shield className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="font-heading text-xl font-bold">Booking Confirmed!</h3>
                  <div className="glass rounded-xl p-6 inline-block">
                    <p className="text-sm text-muted-foreground mb-2">Your Access Code</p>
                    <p className="font-heading text-4xl font-bold tracking-widest text-primary">{accessCode}</p>
                    <p className="text-xs text-muted-foreground mt-2">Show this to the host or use at the charger</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${charger.latitude},${charger.longitude}`;
                      window.open(url, "_blank");
                    }}>
                      <Navigation className="w-4 h-4 mr-2" />Navigate
                    </Button>
                    <Button onClick={() => navigate("/driver")}>View Bookings</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Select Date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
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
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Select Time Slot</p>
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
                                setStartSlot(slot);
                                setEndSlot(null);
                              } else {
                                if (slot > startSlot) setEndSlot(slot);
                                else { setStartSlot(slot); setEndSlot(null); }
                              }
                            }}
                            className={cn(
                              "p-2 rounded-lg text-xs font-medium transition-all border",
                              isBooked ? "opacity-30 cursor-not-allowed border-border bg-muted" :
                              isStart || isEnd ? "bg-primary text-primary-foreground border-primary" :
                              inRange ? "bg-primary/20 text-primary border-primary/30" :
                              "border-border hover:border-primary/50 bg-muted/50"
                            )}
                          >
                            {slot}
                            {isPeak && !isBooked && <span className="block text-[9px] text-secondary">Peak</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {startSlot && endSlot && (
                    <div className="glass rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Cost</p>
                        <p className="font-heading text-2xl font-bold">₹{getPrice()}</p>
                        <p className="text-xs text-muted-foreground">{startSlot} – {endSlot} · {charger.power} kW</p>
                      </div>
                      <Button size="lg" onClick={handleBook} disabled={booking}>
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

        {/* Reviews Section */}
        <Card className="glass-light border-border mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading flex items-center gap-2">
              <Star className="w-5 h-5" />Reviews ({reviews.length})
            </CardTitle>
            {user && (
              <Button size="sm" variant="outline" onClick={() => setShowReviewForm(!showReviewForm)}>
                Write Review
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {showReviewForm && (
              <div className="glass rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Rating</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setReviewRating(n)} className="focus:outline-none">
                        <Star className={cn("w-6 h-6 transition-colors", n <= reviewRating ? "text-secondary fill-secondary" : "text-muted-foreground")} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Comment</p>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Safe parking and fast charging..."
                    className="w-full rounded-lg border border-border bg-muted p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
                  />
                </div>
                <Button onClick={handleSubmitReview} disabled={submittingReview} size="sm">
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Review
                </Button>
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No reviews yet. Be the first!</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{r.profile?.display_name || "Driver"}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("w-3 h-3", i < r.rating ? "text-secondary fill-secondary" : "text-muted-foreground")} />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
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
