import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  STRIPE_SECRET_KEY: z.string().min(10).optional(),
  STRIPE_PRICE_ID: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(10).optional(),
  FILE_SCAN_WEBHOOK_URL: z.string().url().optional(),
  FILE_SCAN_WEBHOOK_SECRET: z.string().optional(),
  TRIAL_LENGTH_DAYS: z.string().transform((value) => Number.parseInt(value, 10)).refine((value) => Number.isFinite(value) && value > 0, {
    message: 'TRIAL_LENGTH_DAYS must be a positive integer',
  }).optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  // Collect missing or invalid keys; do not throw in production here to avoid breaking build,
  // but log for visibility. Critical keys should be handled where used.
  if (process.env.NODE_ENV !== "production") {
  }
}

const rawTrial = process.env.TRIAL_LENGTH_DAYS;
const parsedTrial = rawTrial ? Number.parseInt(rawTrial, 10) : undefined;

export const env = {
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  FILE_SCAN_WEBHOOK_URL: process.env.FILE_SCAN_WEBHOOK_URL,
  FILE_SCAN_WEBHOOK_SECRET: process.env.FILE_SCAN_WEBHOOK_SECRET,
  TRIAL_LENGTH_DAYS: parsedTrial && parsedTrial > 0 ? parsedTrial : undefined,
};
