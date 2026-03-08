import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Home, Phone, Mail, ArrowLeft } from "lucide-react";
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
      <Label className="mb-2 block font-mono text-[11px] tracking-wider">ROLE</Label>
      <div className="grid grid-cols-2 gap-px bg-border">
        <button type="button" onClick={() => setRole("driver")}
          className={`p-4 text-center ${role === "driver" ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground"}`}>
          <Car className="w-5 h-5 mx-auto mb-1.5" />
          <p className="font-mono text-[10px] tracking-wider">DRIVER</p>
        </button>
        <button type="button" onClick={() => setRole("host")}
          className={`p-4 text-center ${role === "host" ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground"}`}>
          <Home className="w-5 h-5 mx-auto mb-1.5" />
          <p className="font-mono text-[10px] tracking-wider">HOST</p>
        </button>
      </div>
    </div>
  );

  const phoneOTPFlow = (
    <div className="space-y-4">
      {!otpSent ? (
        <>
          {tab === "signup" && (
            <div><Label className="font-mono text-[11px] tracking-wider">NAME</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 rounded-sm bg-card" placeholder="Your name" /></div>
          )}
          <div>
            <Label className="font-mono text-[11px] tracking-wider">PHONE</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 rounded-sm bg-card" placeholder="+919876543210" />
          </div>
          {tab === "signup" && roleSelector}
          <Button className="w-full rounded-sm font-mono text-[11px] tracking-wider" onClick={handleSendOTP} disabled={loading}>
            {loading ? "SENDING..." : "SEND OTP"}
          </Button>
        </>
      ) : (
        <>
          <button onClick={resetPhone} className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" /> CHANGE NUMBER
          </button>
          <p className="text-sm text-muted-foreground">Code sent to <span className="text-foreground font-mono">{phone}</span></p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full rounded-sm font-mono text-[11px] tracking-wider" onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}>
            {loading ? "VERIFYING..." : "VERIFY"}
          </Button>
          <Button variant="ghost" size="sm" className="w-full font-mono text-[10px]" onClick={handleSendOTP} disabled={loading}>RESEND</Button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pt-12 flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-border bg-card">
        <div className="border-b border-border p-6 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] text-primary mb-2">VOLTSHARE</p>
          <h1 className="font-heading text-xl font-bold">Welcome</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in or create an account</p>
        </div>
        <div className="p-6">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as "login" | "signup"); resetPhone(); }}>
            <TabsList className="grid w-full grid-cols-2 mb-4 rounded-sm">
              <TabsTrigger value="login" className="rounded-sm font-mono text-[11px] tracking-wider">LOGIN</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-sm font-mono text-[11px] tracking-wider">SIGN UP</TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-2 gap-px bg-border mb-5">
              <button onClick={() => { setMethod("email"); resetPhone(); }}
                className={`flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono tracking-wider ${method === "email" ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground"}`}>
                <Mail className="w-3 h-3" /> EMAIL
              </button>
              <button onClick={() => setMethod("phone")}
                className={`flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono tracking-wider ${method === "phone" ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground"}`}>
                <Phone className="w-3 h-3" /> PHONE
              </button>
            </div>

            <TabsContent value="login">
              {method === "email" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div><Label className="font-mono text-[11px] tracking-wider">EMAIL</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 rounded-sm bg-background" /></div>
                  <div><Label className="font-mono text-[11px] tracking-wider">PASSWORD</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 rounded-sm bg-background" /></div>
                  <Button type="submit" className="w-full rounded-sm font-mono text-[11px] tracking-wider" disabled={loading}>{loading ? "..." : "SIGN IN"}</Button>
                </form>
              ) : phoneOTPFlow}
            </TabsContent>

            <TabsContent value="signup">
              {method === "email" ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div><Label className="font-mono text-[11px] tracking-wider">NAME</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="mt-1 rounded-sm bg-background" /></div>
                  <div><Label className="font-mono text-[11px] tracking-wider">EMAIL</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 rounded-sm bg-background" /></div>
                  <div><Label className="font-mono text-[11px] tracking-wider">PASSWORD</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 rounded-sm bg-background" /></div>
                  {roleSelector}
                  <Button type="submit" className="w-full rounded-sm font-mono text-[11px] tracking-wider" disabled={loading}>{loading ? "..." : "CREATE ACCOUNT"}</Button>
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
