import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { REF_CODE_STORAGE_KEY } from "@/app/config/routes";
import { Button } from "@/app/components/ui/button";
import klineoIcon from "@/assets/klineo-icon-64.png";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface LoginPageProps {
  onNavigate: (view: string) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { login } = useAuth();
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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }
    try {
      await login(email, password);
      onNavigate("dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const devEmail = import.meta.env.VITE_DEV_LOGIN_EMAIL ?? "";
  const devPassword = import.meta.env.VITE_DEV_LOGIN_PASSWORD ?? "";
  const showQuickDevLogin = !import.meta.env.PROD && !!devEmail && !!devPassword;

  const handleDevLogin = () => {
    if (!showQuickDevLogin) return;
    setLoading(true);
    setError("");
    login(devEmail, devPassword)
      .then(() => onNavigate("dashboard"))
      .catch((err) => setError(err?.message ?? "Quick Dev Login failed"))
      .finally(() => setLoading(false));
  };

  const handleGoogleLogin = async () => {
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
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Log in to your KLINEO terminal</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-accent hover:underline"
                  onClick={() => alert("Password reset feature coming soon")}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
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

            <Button
              type="submit"
              className="w-full bg-accent text-background hover:bg-accent/90"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log In"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading || oauthLoading}
            >
              {oauthLoading ? "Redirecting..." : "Continue with Google"}
            </Button>

            {showQuickDevLogin && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-accent/30 text-accent hover:bg-accent/10"
                onClick={handleDevLogin}
                disabled={loading}
              >
                Quick Dev Login
              </Button>
            )}
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button onClick={() => onNavigate("signup")} className="text-accent hover:underline font-medium">
              Sign up
            </button>
          </div>
        </Card>

        <p className="mt-6 text-xs text-center text-muted-foreground">
          Trading cryptocurrencies involves substantial risk of loss. Only invest what you can afford to lose.
        </p>
      </div>
    </div>
  );
}
