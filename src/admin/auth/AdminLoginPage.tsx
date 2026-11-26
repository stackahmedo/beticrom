import React, { useState } from "react";
import { Lock, Mail, KeyRound, ShieldCheck, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { apiRequest, ApiError } from "../api/client";
import { useAdminAuth } from "./AuthContext";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export function AdminLoginPage({ onBackToStore }: { onBackToStore: () => void }) {
  const { refreshSession } = useAdminAuth();
  const [mode, setMode] = useState<"login" | "recover" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          totpCode: mfaRequired ? totpCode : undefined,
        }),
      });
      toast.success("Signed in to Admin Panel");
      await refreshSession();
    } catch (err) {
      if (err instanceof ApiError && err.code === "MFA_REQUIRED") {
        setMfaRequired(true);
        setError("Enter your 6-digit authenticator code to continue.");
      } else {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("/api/v1/auth/recover", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("If an account exists, a recovery token has been dispatched.");
      setMode("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recovery failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      toast.success("Password updated. You can now sign in.");
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm">
              B
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Beticrom Admin & CMS</h1>
              <p className="text-[11px] text-muted-foreground">Secure Operations Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onBackToStore} className="text-xs gap-1">
            <ArrowLeft size={13} />
            Storefront
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-xs">
                Work Email
              </Label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@beticrom.jp"
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-xs">
                Password
              </Label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>

            {mfaRequired && (
              <div className="space-y-1.5">
                <Label htmlFor="admin-totp" className="text-xs">
                  Authenticator Code (6 digits)
                </Label>
                <div className="relative">
                  <ShieldCheck size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    id="admin-totp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    className="pl-9 text-xs h-9 font-mono tracking-widest"
                  />
                </div>
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full h-9 text-xs font-medium">
              {submitting ? "Signing in..." : "Sign In"}
            </Button>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode("recover");
                }}
                className="hover:text-foreground underline cursor-pointer"
              >
                Forgot password?
              </button>
              {import.meta.env.DEV && (
                <span className="font-mono text-[10px]">Dev: admin@beticrom.jp / ChangeMe!2026</span>
              )}
            </div>
          </form>
        )}

        {mode === "recover" && (
          <form onSubmit={handleRecover} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Enter your administrator email address to receive a single-use recovery token.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@beticrom.jp"
                className="text-xs h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setMode("login")} className="flex-1 h-9 text-xs">
                Back
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 h-9 text-xs">
                Send Recovery Token
              </Button>
            </div>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Reset Token</Label>
              <div className="relative">
                <KeyRound size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste recovery token"
                  className="pl-9 text-xs h-9 font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New Password (min 8 chars)</Label>
              <Input
                type="password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setMode("login")} className="flex-1 h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 h-9 text-xs">
                Update Password
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
