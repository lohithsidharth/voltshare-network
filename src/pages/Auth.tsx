import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Car, Home, Phone, Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"driver" | "host">("driver");
  const [loading, setLoading] = useState(false);

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Login failed", description: error });
    } else {
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast({ variant: "destructive", title: "Name required", description: "Please enter your name." });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, displayName, role);
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Signup failed", description: error });
    } else {
      toast({ title: "Account created!", description: "You're now logged in." });
      navigate(role === "host" ? "/host" : "/driver");
    }
  };

  const handleSendOTP = async () => {
    const formatted = phone.startsWith("+") ? phone : `+91${phone}`;
    if (!/^\+\d{10,15}$/.test(formatted)) {
      toast({ variant: "destructive", title: "Invalid phone", description: "Enter a valid phone number (e.g. +919876543210)" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-otp", {
        body: { action: "send", phone: formatted },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ variant: "destructive", title: "Failed", description: data.error });
      } else {
        setOtpSent(true);
        setPhone(formatted);
        toast({ title: "OTP Sent!", description: `A 6-digit code was sent to ${formatted}` });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to send OTP" });
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid OTP", description: "Enter the 6-digit code" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-otp", {
        body: {
          action: "verify",
          phone,
          code: otp,
          display_name: displayName || phone,
          role: tab === "signup" ? role : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ variant: "destructive", title: "Verification failed", description: data.error });
      } else if (data?.verification_url) {
        // Use the magic link to establish a real Supabase session
        const url = new URL(data.verification_url);
        const token = url.searchParams.get("token");
        if (token) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: "magiclink",
          });
          if (verifyError) {
            toast({ variant: "destructive", title: "Session error", description: verifyError.message });
          } else {
            toast({ title: "Welcome!", description: "You're now logged in." });
            navigate("/");
          }
        }
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Verification failed" });
    }
    setLoading(false);
  };

  const resetPhone = () => {
    setOtpSent(false);
    setOtp("");
    
  };

  const roleSelector = (
    <div>
      <Label className="mb-2 block">I want to...</Label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole("driver")}
          className={`p-4 rounded-xl border-2 text-center transition-all ${
            role === "driver" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <Car className={`w-8 h-8 mx-auto mb-2 ${role === "driver" ? "text-primary" : "text-muted-foreground"}`} />
          <p className="font-heading font-semibold text-sm">Find Chargers</p>
          <p className="text-xs text-muted-foreground mt-1">EV Driver</p>
        </button>
        <button
          type="button"
          onClick={() => setRole("host")}
          className={`p-4 rounded-xl border-2 text-center transition-all ${
            role === "host" ? "border-secondary bg-secondary/10" : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <Home className={`w-8 h-8 mx-auto mb-2 ${role === "host" ? "text-secondary" : "text-muted-foreground"}`} />
          <p className="font-heading font-semibold text-sm">Share Charger</p>
          <p className="text-xs text-muted-foreground mt-1">Host</p>
        </button>
      </div>
    </div>
  );

  const phoneOTPFlow = (
    <div className="space-y-4">
      {!otpSent ? (
        <>
          {tab === "signup" && (
            <div>
              <Label>Full Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" placeholder="Your name" />
            </div>
          )}
          <div>
            <Label>Phone Number</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
              placeholder="+919876543210"
            />
            <p className="text-xs text-muted-foreground mt-1">Include country code (e.g. +91 for India)</p>
          </div>
          {tab === "signup" && roleSelector}
          <Button className="w-full" onClick={handleSendOTP} disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP"}
          </Button>
        </>
      ) : (
        <>
          <button onClick={resetPhone} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Change number
          </button>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to <span className="text-foreground font-medium">{phone}</span>
          </p>

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button className="w-full" onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify & Sign In"}
          </Button>

          <Button variant="ghost" size="sm" className="w-full" onClick={handleSendOTP} disabled={loading}>
            Resend OTP
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <Card className="w-full max-w-md glass border-border relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center glow-primary mb-4">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-heading text-2xl">
            Welcome to Volt<span className="text-secondary">Share</span>
          </CardTitle>
          <CardDescription>Sign in or create an account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => { setTab(v as "login" | "signup"); resetPhone(); }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Method toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setMethod("email"); resetPhone(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  method === "email" ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                <Mail className="w-4 h-4" /> Email
              </button>
              <button
                onClick={() => setMethod("phone")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  method === "phone" ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                <Phone className="w-4 h-4" /> Phone OTP
              </button>
            </div>

            <TabsContent value="login">
              {method === "email" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" placeholder="you@email.com" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" placeholder="••••••••" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              ) : (
                phoneOTPFlow
              )}
            </TabsContent>

            <TabsContent value="signup">
              {method === "email" ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="mt-1" placeholder="Your name" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" placeholder="you@email.com" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1" placeholder="Min 6 characters" />
                  </div>
                  {roleSelector}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              ) : (
                phoneOTPFlow
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
