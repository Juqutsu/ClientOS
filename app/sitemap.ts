import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/auth/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
