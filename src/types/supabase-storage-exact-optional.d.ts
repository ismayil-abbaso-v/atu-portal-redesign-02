import "@supabase/storage-js";

declare module "@supabase/storage-js" {
  interface FileOptions {
    contentType?: string | undefined;
  }
}
