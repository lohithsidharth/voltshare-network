import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Car, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"driver" | "host">("driver");
  const [loading, setLoading] = useState(false);

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
      toast({ title: "Account created!", description: "Check your email to confirm, then log in." });
      setTab("login");
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4">
      {/* Background glow */}
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
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
            </TabsContent>

            <TabsContent value="signup">
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

                {/* Role selection */}
                <div>
                  <Label className="mb-2 block">I want to...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("driver")}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        role === "driver"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground/30"
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
                        role === "host"
                          ? "border-secondary bg-secondary/10"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <Home className={`w-8 h-8 mx-auto mb-2 ${role === "host" ? "text-secondary" : "text-muted-foreground"}`} />
                      <p className="font-heading font-semibold text-sm">Share Charger</p>
                      <p className="text-xs text-muted-foreground mt-1">Host</p>
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
