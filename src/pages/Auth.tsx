import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const DIRECT_ACCESS_EMAILS = ["mayordomo@duthchas.ltd", "mayordomo@recaste.com"];

type AuthMode = "signin" | "signup" | "forgot";

const Auth = () => {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (mode === "forgot") {
      const { error } = await resetPassword(email);
      setIsSubmitting(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We sent you a password reset link." });
        setMode("signin");
      }
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      setIsSubmitting(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account created!", description: "Check your email to confirm, then sign in." });
        setMode("signin");
      }
      return;
    }

    // Check for direct access emails
    if (DIRECT_ACCESS_EMAILS.includes(email.toLowerCase())) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('simple-auth', {
          body: { email: email.toLowerCase() }
        });
        if (fnError || data?.error) {
          toast({ title: "Error", description: data?.error || fnError?.message, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'magiclink',
        });
        setIsSubmitting(false);
        if (verifyError) {
          toast({ title: "Error", description: verifyError.message, variant: "destructive" });
        } else {
          navigate("/");
        }
      } catch (err: any) {
        setIsSubmitting(false);
        toast({ title: "Error", description: err.message || "Login failed", variant: "destructive" });
      }
      return;
    }

    // Sign in with password
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {mode === "signin" && "Welcome Back"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Reset Password"}
          </CardTitle>
          <CardDescription>
            {mode === "signin" && "Sign in with your email and password"}
            {mode === "signup" && "Sign up to get started"}
            {mode === "forgot" && "Enter your email to receive a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== "forgot" && !DIRECT_ACCESS_EMAILS.includes(email.toLowerCase()) && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Please wait...</>
              ) : DIRECT_ACCESS_EMAILS.includes(email.toLowerCase()) ? "Direct Access" : mode === "signin" ? "Sign In" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm space-y-2">
            {mode === "signin" && (
              <>
                <button onClick={() => setMode("forgot")} className="text-primary hover:underline block w-full">
                  Forgot password?
                </button>
                <p className="text-muted-foreground">
                  Don't have an account?{" "}
                  <button onClick={() => setMode("signup")} className="text-primary hover:underline">
                    Sign up
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="text-primary hover:underline">
                  Sign in
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("signin")} className="text-primary hover:underline">
                Back to sign in
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
