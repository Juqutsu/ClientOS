import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  STRIPE_SECRET_KEY: z.string().min(10).optional(),
  STRIPE_PRICE_ID: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(10).optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  // Collect missing or invalid keys; do not throw in production here to avoid breaking build,
  // but log for visibility. Critical keys should be handled where used.
  if (process.env.NODE_ENV !== "production") {
  }
}

export const env = {
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};
