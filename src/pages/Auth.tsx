import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Home, Phone, Mail, ArrowLeft, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import voltIcon from "@/assets/volt-icon.png";

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
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) { toast({ variant: "destructive", title: "Login failed", description: error }); }
    else { navigate("/"); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { toast({ variant: "destructive", title: "Name required" }); return; }
    setLoading(true);
    const { error } = await signUp(email, password, displayName, role);
    setLoading(false);
    if (error) { toast({ variant: "destructive", title: "Signup failed", description: error }); }
    else { toast({ title: "Account created!" }); navigate(role === "host" ? "/host" : "/driver"); }
  };

  const handleSendOTP = async () => {
    const formatted = phone.startsWith("+") ? phone : `+91${phone}`;
    if (!/^\+\d{10,15}$/.test(formatted)) { toast({ variant: "destructive", title: "Invalid phone" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-otp", { body: { action: "send", phone: formatted } });
      if (error) throw error;
      if (data?.error) { toast({ variant: "destructive", title: "Failed", description: data.error }); }
      else { setOtpSent(true); setPhone(formatted); toast({ title: "OTP sent" }); }
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { toast({ variant: "destructive", title: "Enter 6-digit code" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-otp", {
        body: { action: "verify", phone, code: otp, display_name: displayName || phone, role: tab === "signup" ? role : undefined },
      });
      if (error) throw error;
      if (data?.error) { toast({ variant: "destructive", title: "Failed", description: data.error }); }
      else if (data?.verification_url) {
        const url = new URL(data.verification_url);
        const token = url.searchParams.get("token");
        if (token) {
          const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: token, type: "magiclink" });
          if (verifyError) { toast({ variant: "destructive", title: "Session error", description: verifyError.message }); }
          else { toast({ title: "Welcome!" }); navigate("/"); }
        }
      }
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    setLoading(false);
  };

  const resetPhone = () => { setOtpSent(false); setOtp(""); };

  const roleSelector = (
    <div>
      <Label className="mb-2 block text-sm font-medium">I want to</Label>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setRole("driver")}
          className={`p-4 rounded-xl border text-center transition-all ${role === "driver" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"}`}>
          <Car className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-semibold">Find Chargers</p>
          <p className="text-xs text-muted-foreground mt-0.5">I'm an EV driver</p>
        </button>
        <button type="button" onClick={() => setRole("host")}
          className={`p-4 rounded-xl border text-center transition-all ${role === "host" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"}`}>
          <Home className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-semibold">Host a Charger</p>
          <p className="text-xs text-muted-foreground mt-0.5">I own a charger</p>
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
              <Label className="text-sm font-medium">Your Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 rounded-xl bg-background h-11" placeholder="Enter your name" />
            </div>
          )}
          <div>
            <Label className="text-sm font-medium">Phone Number</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 rounded-xl bg-background h-11" placeholder="+91 98765 43210" />
          </div>
          {tab === "signup" && roleSelector}
          <Button className="w-full rounded-xl font-medium h-11" onClick={handleSendOTP} disabled={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </Button>
        </>
      ) : (
        <>
          <button onClick={resetPhone} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Change number
          </button>
          <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to <span className="text-foreground font-medium">{phone}</span></p>
          <div className="flex justify-center py-2">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full rounded-xl font-medium h-11" onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-sm" onClick={handleSendOTP} disabled={loading}>Resend Code</Button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={voltIcon} alt="VoltShare" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold">Welcome to VoltShare</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in or create an account to continue</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as "login" | "signup"); resetPhone(); }}>
            <TabsList className="grid w-full grid-cols-2 mb-5 rounded-xl h-11">
              <TabsTrigger value="login" className="rounded-xl text-sm font-medium">Log In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl text-sm font-medium">Sign Up</TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button onClick={() => { setMethod("email"); resetPhone(); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${method === "email" ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground border border-transparent"}`}>
                <Mail className="w-4 h-4" /> Email
              </button>
              <button onClick={() => setMethod("phone")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${method === "phone" ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground border border-transparent"}`}>
                <Phone className="w-4 h-4" /> Phone
              </button>
            </div>

            <TabsContent value="login">
              {method === "email" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 rounded-xl bg-background h-11" placeholder="you@example.com" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5 rounded-xl bg-background h-11" placeholder="••••••••" />
                  </div>
                  <Button type="submit" className="w-full rounded-xl font-medium h-11" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
                </form>
              ) : phoneOTPFlow}
            </TabsContent>

            <TabsContent value="signup">
              {method === "email" ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="mt-1.5 rounded-xl bg-background h-11" placeholder="Your full name" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 rounded-xl bg-background h-11" placeholder="you@example.com" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5 rounded-xl bg-background h-11" placeholder="Min 6 characters" />
                  </div>
                  {roleSelector}
                  <Button type="submit" className="w-full rounded-xl font-medium h-11" disabled={loading}>{loading ? "Creating account..." : "Create Account"}</Button>
                </form>
              ) : phoneOTPFlow}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
