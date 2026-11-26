import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiRequest, setCsrfToken } from "../api/client";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  vendorId: string | null;
}

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  multiVendorEnabled: boolean;
  refreshSession: () => Promise<void>;
  refreshFeatureFlags: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm?: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [multiVendorEnabled, setMultiVendorEnabled] = useState(false);

  const refreshFeatureFlags = useCallback(async () => {
    try {
      const res = await apiRequest<{ data: { settings: Record<string, Record<string, unknown>> } }>(
        "/api/v1/storefront/bootstrap"
      );
      const flags = res.data?.settings?.feature_flags;
      setMultiVendorEnabled(Boolean(flags?.multi_vendor_enabled));
    } catch {
      // Ignore if API unavailable
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ data: { user: AdminUser; csrfToken: string } }>("/api/v1/auth/me");
      setUser(res.data.user);
      setCsrfToken(res.data.csrfToken);
      await refreshFeatureFlags();
    } catch {
      setUser(null);
      setCsrfToken(null);
    } finally {
      setLoading(false);
    }
  }, [refreshFeatureFlags]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    setUser(null);
    setCsrfToken(null);
  }, []);

  const hasPermission = useCallback(
    (perm?: string | string[]) => {
      if (!user) return false;
      if (!perm) return true;
      if (user.roles.includes("super_admin")) return true;
      const list = Array.isArray(perm) ? perm : [perm];
      return list.some((p) => user.permissions.includes(p));
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, multiVendorEnabled, refreshSession, refreshFeatureFlags, logout, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
