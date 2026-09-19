// @lovable.dev/vite-tanstack-config already includes the TanStack Start, React, Tailwind,
// path-alias and Nitro plugins used by this project.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// These are public Supabase values. Vercel environment variables take precedence.
const PUBLIC_SUPABASE_URL = "https://tdxrpbrcgricqqfdytyg.supabase.co";
const PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DxVw_ue2_Z4J15wUqh2CEA_azeOdzYc";
const PUBLIC_SUPABASE_PROJECT_ID = "tdxrpbrcgricqqfdytyg";

process.env["VITE_SUPABASE_URL"] ||= PUBLIC_SUPABASE_URL;
process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||= PUBLIC_SUPABASE_PUBLISHABLE_KEY;
process.env["VITE_SUPABASE_PROJECT_ID"] ||= PUBLIC_SUPABASE_PROJECT_ID;
process.env["SUPABASE_URL"] ||= PUBLIC_SUPABASE_URL;
process.env["SUPABASE_PUBLISHABLE_KEY"] ||= PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isVercelBuild =
  Boolean(process.env["VERCEL"] && process.env["VERCEL"] !== "0") ||
  Boolean(process.env["VERCEL_URL"]);

export default defineConfig({
  tanstackStart: {
    // Keep the project's SSR entry. Nitro is configured at the top level below.
    server: {
      entry: "server",
    },
  },
  // @lovable.dev/vite-tanstack-config configures Nitro as a build plugin.
  // The Vercel preset must therefore be supplied through `nitro`, not
  // tanstackStart.server. This makes Nitro emit Vercel-compatible output.
  nitro: isVercelBuild ? { preset: "vercel" } : true,
});
