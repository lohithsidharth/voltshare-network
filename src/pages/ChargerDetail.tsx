import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  MapPin, Star, Calendar as CalendarIcon, Navigation, Loader2, Lock, Heart, CreditCard,
} from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function useRazorpayScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, []);
  return loaded;
}

interface ChargerDetail {
  id: string; title: string; address: string; latitude: number; longitude: number;
  power: number; price_per_kwh: number; peak_price_per_kwh: number | null;
  off_peak_price_per_kwh: number | null; availability: string | null;
  rating: number | null; review_count: number | null; images: string[] | null;
  is_active: boolean | null; charger_type: string | null; parking_available: boolean | null; host_id: string;
}

interface Review {
  id: string; rating: number; comment: string | null; created_at: string;
  driver_id: string; profile?: { display_name: string | null };
}

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

const ChargerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const razorpayReady = useRazorpayScript();
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
      } else { setReviews([]); }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!id || !date) return;
    const fetchBookings = async () => {
      const dateStr = format(date, "yyyy-MM-dd");
      const { data } = await supabase.from("bookings").select("start_time, end_time").eq("charger_id", id).eq("booking_date", dateStr).in("status", ["pending", "confirmed"]);
      const booked: string[] = [];
      (data || []).forEach((b) => {
        const start = b.start_time.substring(0, 5);
        const end = b.end_time.substring(0, 5);
        TIME_SLOTS.forEach((slot) => { if (slot >= start && slot < end) booked.push(slot); });
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
      const price = isPeak && charger.peak_price_per_kwh ? charger.peak_price_per_kwh : charger.off_peak_price_per_kwh || charger.price_per_kwh;
      total += price * charger.power;
    }
    return Math.round(total);
  };

  const handleBook = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!charger || !date || !startSlot || !endSlot) return;
    const estimatedPrice = getPrice();
    if (estimatedPrice <= 0) { toast.error("Select valid time slots"); return; }
    if (!razorpayReady) { toast.error("Payment gateway loading, please wait..."); return; }

    setBooking(true);

    try {
      // Step 1: Create booking with pending status
      const { data: bookingData, error: bookingError } = await supabase.from("bookings").insert({
        charger_id: charger.id, driver_id: user.id, booking_date: format(date, "yyyy-MM-dd"),
        start_time: startSlot, end_time: endSlot, estimated_price: estimatedPrice,
        status: "pending", payment_status: "pending",
      }).select("id").single();

      if (bookingError) {
        toast.error(bookingError.message.includes("just booked") ? "Slot just booked. Try another." : "Booking failed");
        setBooking(false);
        return;
      }

      // Step 2: Create Razorpay order via Edge Function
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: estimatedPrice, booking_id: bookingData.id, charger_title: charger.title },
      });

      if (orderError || !orderData?.order_id) {
        toast.error("Failed to create payment order. Please try again.");
        // Cancel the pending booking
        await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingData.id);
        setBooking(false);
        return;
      }

      // Step 3: Open Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "VoltShare",
        description: `${charger.title} — ${startSlot} to ${endSlot}`,
        order_id: orderData.order_id,
        prefill: {
          email: user.email || "",
          name: profile?.display_name || "",
        },
        theme: {
          color: "#22c55e",
        },
        handler: async (response: any) => {
          // Step 4: Verify payment on server
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: bookingData.id,
              },
            });

            if (verifyError || !verifyData?.success) {
              toast.error("Payment verification failed. Contact support.");
              return;
            }

            toast.success("Payment successful! Booking confirmed.");
            // Fetch access code
            setTimeout(async () => {
              const { data: ac } = await supabase.from("access_codes").select("code, valid_until").eq("booking_id", bookingData.id).single();
              if (ac) setAccessCode(ac.code);
            }, 1500);
          } catch (err) {
            toast.error("Payment verification error. Contact support.");
          }
        },
        modal: {
          ondismiss: async () => {
            // User closed checkout without paying — cancel booking
            await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingData.id);
            toast("Payment cancelled. Booking was not confirmed.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", async (response: any) => {
        console.error("Payment failed:", response.error);
        await supabase.from("bookings").update({ status: "cancelled", payment_status: "failed" }).eq("id", bookingData.id);
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err) {
      console.error("Booking error:", err);
      toast.error("Something went wrong. Please try again.");
    }

    setBooking(false);
  };

  const handleSubmitReview = async () => {
    if (!user || !charger) { toast.error("Please sign in"); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({ charger_id: charger.id, driver_id: user.id, rating: reviewRating, comment: reviewComment || null });
    if (error) { toast.error(error.message); }
    else {
      toast.success("Review submitted!");
      setShowReviewForm(false); setReviewComment("");
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

  if (loading) return <div className="pt-12 min-h-screen flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!charger) return (
    <div className="pt-12 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="font-mono text-[11px] text-muted-foreground">CHARGER NOT FOUND</p>
        <Button variant="outline" size="sm" className="mt-4 rounded-sm font-mono text-[10px]" onClick={() => navigate("/explore")}>BACK TO MAP</Button>
      </div>
    </div>
  );

  const isAvailable = charger.is_active;
  const isFav = isFavorite(charger.id);

  return (
    <div className="pt-12 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl py-8">
        {/* Header */}
        <div className="border-b border-border pb-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={cn("font-mono text-[10px] tracking-wider font-semibold", isAvailable ? "text-primary" : "text-destructive")}>
                  {isAvailable ? "● ONLINE" : "● OFFLINE"}
                </span>
                <span className="font-mono text-[10px] tracking-wider text-muted-foreground">{charger.charger_type || "TYPE 2"}</span>
                {charger.parking_available && <span className="font-mono text-[10px] tracking-wider text-muted-foreground">PARKING</span>}
              </div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold">{charger.title}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{charger.address}</p>
            </div>
            {user && (
              <button onClick={() => toggleFavorite(charger.id)} className="p-1">
                <Heart className={cn("w-5 h-5", isFav ? "text-destructive fill-destructive" : "text-muted-foreground")} />
              </button>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-px bg-border mt-6">
            <div className="bg-background p-4">
              <p className="font-mono text-[10px] tracking-wider text-muted-foreground">POWER</p>
              <p className="font-heading text-xl font-bold mt-1">{charger.power} kW</p>
            </div>
            <div className="bg-background p-4">
              <p className="font-mono text-[10px] tracking-wider text-muted-foreground">PRICE</p>
              <p className="font-heading text-xl font-bold mt-1">₹{charger.price_per_kwh}/kWh</p>
            </div>
            {charger.peak_price_per_kwh && (
              <div className="bg-background p-4">
                <p className="font-mono text-[10px] tracking-wider text-muted-foreground">PEAK (6-10PM)</p>
                <p className="font-heading text-xl font-bold mt-1 text-primary">₹{charger.peak_price_per_kwh}</p>
              </div>
            )}
            {charger.rating != null && charger.rating > 0 && (
              <div className="bg-background p-4">
                <p className="font-mono text-[10px] tracking-wider text-muted-foreground">RATING</p>
                <p className="font-heading text-xl font-bold mt-1">{charger.rating} <span className="text-sm text-muted-foreground">({charger.review_count})</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Booking */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h2 className="font-mono text-[11px] tracking-wider text-muted-foreground mb-4">BOOK A SLOT</h2>
            {!isAvailable && !accessCode ? (
              <div className="border border-border p-8 text-center">
                <p className="font-mono text-[11px] text-muted-foreground">CHARGER OFFLINE — BOOKING DISABLED</p>
              </div>
            ) : accessCode ? (
              <div className="border border-primary/30 p-8 text-center space-y-4">
                <p className="font-mono text-[11px] tracking-wider text-primary">BOOKING CONFIRMED</p>
                <p className="font-heading text-4xl font-bold tracking-[0.3em] text-primary">{accessCode}</p>
                <p className="font-mono text-[10px] text-muted-foreground">SHOW THIS CODE AT THE CHARGER</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" className="rounded-sm font-mono text-[10px]" onClick={() => {
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${charger.latitude},${charger.longitude}`, "_blank");
                  }}>
                    <Navigation className="w-3 h-3 mr-1" />NAVIGATE
                  </Button>
                  <Button size="sm" className="rounded-sm font-mono text-[10px]" onClick={() => navigate("/driver")}>MY BOOKINGS</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Date</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start font-normal rounded-sm h-9 text-sm", !date && "text-muted-foreground")}>
                        <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Time</p>
                  <div className="grid grid-cols-5 sm:grid-cols-7 gap-px bg-border">
                    {TIME_SLOTS.map((slot) => {
                      const isBooked = existingBookings.includes(slot);
                      const isStart = startSlot === slot;
                      const isEnd = endSlot === slot;
                      const inRange = startSlot && endSlot && slot > startSlot && slot < endSlot;
                      const hour = parseInt(slot.split(":")[0]);
                      const isPeak = hour >= 18 && hour < 22;
                      return (
                        <button key={slot} disabled={isBooked}
                          onClick={() => {
                            if (!startSlot || (startSlot && endSlot)) { setStartSlot(slot); setEndSlot(null); }
                            else { if (slot > startSlot) setEndSlot(slot); else { setStartSlot(slot); setEndSlot(null); } }
                          }}
                          className={cn(
                            "p-2 text-center font-mono text-[11px]",
                            isBooked ? "opacity-20 cursor-not-allowed bg-muted" :
                            isStart || isEnd ? "bg-primary text-primary-foreground" :
                            inRange ? "bg-primary/15 text-primary" :
                            "bg-background hover:bg-accent"
                          )}
                        >
                          {slot}
                          {isPeak && !isBooked && <span className="block text-[8px] text-primary mt-0.5">PEAK</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {startSlot && endSlot && (
                  <div className="border border-border p-4 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground">ESTIMATED COST</p>
                      <p className="font-heading text-2xl font-bold">₹{getPrice()}</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{startSlot} – {endSlot} · {charger.power} kW</p>
                    </div>
                    <Button className="rounded-sm font-mono text-[11px] tracking-wider" onClick={handleBook} disabled={booking}>
                      {booking ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CreditCard className="w-3.5 h-3.5 mr-1" />}
                      PAY & BOOK
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Platform takes 20% commission. Host earns 80%.</p>
          </div>
        </div>

        {/* Reviews */}
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-[11px] tracking-wider text-muted-foreground">REVIEWS ({reviews.length})</h2>
            {user && (
              <Button variant="outline" size="sm" className="rounded-sm font-mono text-[10px]" onClick={() => setShowReviewForm(!showReviewForm)}>
                WRITE REVIEW
              </Button>
            )}
          </div>

          {showReviewForm && (
            <div className="border border-border p-4 mb-4 space-y-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setReviewRating(n)}>
                    <Star className={cn("w-5 h-5", n <= reviewRating ? "text-primary fill-primary" : "text-muted-foreground")} />
                  </button>
                ))}
              </div>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Your experience..." className="w-full border border-border bg-background p-3 text-sm rounded-sm resize-none h-16 focus:outline-none focus:ring-1 focus:ring-ring" />
              <Button size="sm" className="rounded-sm font-mono text-[10px]" onClick={handleSubmitReview} disabled={submittingReview}>
                {submittingReview ? "..." : "SUBMIT"}
              </Button>
            </div>
          )}

          <div className="divide-y divide-border">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No reviews yet.</p>
            ) : reviews.map((r) => (
              <div key={r.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.profile?.display_name || "Driver"}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("w-3 h-3", i < r.rating ? "text-primary fill-primary" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargerDetailPage;
