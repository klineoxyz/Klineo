import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { REF_CODE_STORAGE_KEY } from "@/app/config/routes";
import { Button } from "@/app/components/ui/button";
import klineoIcon from "@/assets/klineo-icon-64.png";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { GoogleIcon } from "@/app/components/auth/GoogleIcon";

interface SignUpPageProps {
  onNavigate: (view: string) => void;
}

export function SignUpPage({ onNavigate }: SignUpPageProps) {
  const { signup } = useAuth();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get("ref")?.trim();
    if (ref) {
      try {
        localStorage.setItem(REF_CODE_STORAGE_KEY, ref.toUpperCase());
      } catch {
        /* ignore */
      }
    }
  }, [searchParams]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!email || !fullName || !password || !confirmPassword) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (!agreedToTerms) {
      setError("You must agree to the Terms of Service");
      setLoading(false);
      return;
    }
    try {
      await signup(email, password, fullName);
      onNavigate("dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setOauthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (error) setError(error.message);
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </button>

        <Card className="p-8">
          <div className="flex items-center justify-center mb-8">
            <img
              src={klineoIcon}
              alt="KLINEO"
              className="size-12 object-contain"
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
            <p className="text-sm text-muted-foreground">Start copying profitable traders in minutes</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="trader@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                disabled={loading}
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{" "}
                <button type="button" onClick={() => onNavigate("terms-of-service")} className="text-accent hover:underline">
                  Terms of Service
                </button>{" "}
                and{" "}
                <button type="button" onClick={() => onNavigate("privacy-policy")} className="text-accent hover:underline">
                  Privacy Policy
                </button>
                . I understand trading involves risk and accept the{" "}
                <button type="button" onClick={() => onNavigate("risk-disclosure")} className="text-accent hover:underline">
                  Risk Disclaimer
                </button>
                .
              </label>
            </div>

            <Button type="submit" className="w-full bg-accent text-background hover:bg-accent/90" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 hover:border-gray-400 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-800 dark:border-gray-300"
              onClick={handleGoogleSignUp}
              disabled={loading || oauthLoading}
            >
              <span className="flex items-center justify-center gap-3">
                <GoogleIcon className="size-5 shrink-0" />
                {oauthLoading ? "Redirecting..." : "Create account with Google"}
              </span>
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => onNavigate("login")} className="text-accent hover:underline font-medium">
              Log in
            </button>
          </div>
        </Card>

        <p className="mt-6 text-xs text-center text-muted-foreground">
          KLINEO is not a financial advisor. You are responsible for your own trading decisions.
        </p>
      </div>
    </div>
  );
}
