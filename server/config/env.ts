import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  APP_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().optional().default(""),
  PGLITE_DATA_DIR: z.string().default("./.local/pgdata"),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-change-in-production-32chars"),
  MFA_ENCRYPTION_KEY: z.string().min(16).default("dev-mfa-key-change-in-production-32chars"),
  ENABLE_DEV_SEED: z.string().optional().default("true"),
  DEV_ADMIN_EMAIL: z.string().email().default("admin@beticrom.jp"),
  DEV_ADMIN_PASSWORD: z.string().default("ChangeMe!2026"),
  SUPABASE_URL: z.string().optional().default(""),
  SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_JWT_SECRET: z.string().optional().default(""),
  MEDIA_STORAGE_PROVIDER: z.enum(["local", "r2"]).default("local"),
  R2_ACCOUNT_ID: z.string().optional().default(""),
  R2_ACCESS_KEY_ID: z.string().optional().default(""),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(""),
  R2_BUCKET: z.string().optional().default(""),
  R2_PUBLIC_BASE_URL: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("noreply@beticrom.jp"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  PAYPAY_API_KEY: z.string().optional().default(""),
  PAYPAY_WEBHOOK_SECRET: z.string().optional().default(""),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}

export function isDevSeedEnabled(): boolean {
  const env = getEnv();
  return env.NODE_ENV === "development" && env.ENABLE_DEV_SEED === "true";
}
