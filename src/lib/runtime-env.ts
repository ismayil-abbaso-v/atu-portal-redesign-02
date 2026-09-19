// Serverdə (Vercel / Cloudflare) `process.env.SUPABASE_URL` və `SUPABASE_PUBLISHABLE_KEY`
// təyin olunmaya bilər. Bu dəyərlər public-dir və build zamanı VITE_* olaraq bundle-a düşür,
// ona görə server tərəfdə də eyni dəyərlərlə doldururuq — əks halda auth middleware və
// server function-lar "Missing Supabase environment variable" xətası ilə 500 qaytarır.
const PUBLIC_SERVER_ENV: Record<string, string | undefined> = {
  SUPABASE_URL: import.meta.env["VITE_SUPABASE_URL"] as string | undefined,
  SUPABASE_PUBLISHABLE_KEY: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined,
  SUPABASE_PROJECT_ID: import.meta.env["VITE_SUPABASE_PROJECT_ID"] as string | undefined,
};

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;

if (env) {
  for (const [key, value] of Object.entries(PUBLIC_SERVER_ENV)) {
    if (value && !env[key]) env[key] = value;
  }
}

export {};
