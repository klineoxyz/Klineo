import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { setOnLogout } from "@/lib/authEvents";

interface AuthMe {
  id: string;
  email: string;
  role: "user" | "admin";
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (accessToken: string): Promise<"user" | "admin"> => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? "";
      if (!base) return "user";
      const res = await fetch(`${base.replace(/\/$/, "")}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
      });
      if (!res.ok) return "user";
      const data = (await res.json()) as AuthMe;
      return data.role === "admin" ? "admin" : "user";
    } catch {
      return "user";
    }
  }, []);

  const applySession = useCallback(
    async (s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setIsAdmin(false);
        return;
      }
      const role = await fetchRole(s.access_token);
      setIsAdmin(role === "admin");
    },
    [fetchRole]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      applySession(s).finally(() => setLoading(false));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      await applySession(s);
      if (!s) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [applySession]);

  const logout = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    setOnLogout(logout);
    return () => setOnLogout(() => {});
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signup = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
    },
    []
  );

  const value: AuthContextValue = {
    user,
    session,
    isAuthenticated: !!session,
    isAdmin,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
