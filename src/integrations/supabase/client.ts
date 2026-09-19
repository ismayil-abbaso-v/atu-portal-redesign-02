// Supabase browser client. The URL and publishable key are public by design.
// No Vercel environment variable is required for the browser client.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./live-database";
import { brokeredPreviewStorage } from "./previewAuthStorage";

const SUPABASE_URL = "https://tdxrpbrcgricqqfdytyg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DxVw_ue2_Z4J15wUqh2CEA_azeOdzYc";

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (
      (supabaseKey.startsWith("sb_publishable_") || supabaseKey.startsWith("sb_secret_")) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) headers.delete("Authorization");
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY) },
    auth: { storage: brokeredPreviewStorage(), persistSession: true, autoRefreshToken: true },
  });
}

type BaseSupabaseBrowserClient = ReturnType<typeof createSupabaseClient>;
type BaseStorageClient = BaseSupabaseBrowserClient["storage"];
type BaseBucketClient = ReturnType<BaseStorageClient["from"]>;
type UploadParameters = Parameters<BaseBucketClient["upload"]>;
type UploadBody = UploadParameters[1];
type OriginalUploadOptions = Exclude<UploadParameters[2], undefined>;
type ExactOptionalUploadOptions = Omit<OriginalUploadOptions, "contentType"> & {
  contentType?: string | undefined;
};
type BucketClient = Omit<BaseBucketClient, "upload"> & {
  upload(
    path: string,
    fileBody: UploadBody,
    fileOptions?: ExactOptionalUploadOptions,
  ): ReturnType<BaseBucketClient["upload"]>;
};
type StorageClient = Omit<BaseStorageClient, "from"> & {
  from(bucketId: string): BucketClient;
};
type SupabaseBrowserClient = Omit<BaseSupabaseBrowserClient, "storage"> & {
  storage: StorageClient;
};

/**
 * UI-də `student-submissions` semantik bucket adı saxlanılır, amma real obyektlər
 * mövcud private `course-materials` bucket-ində course-scope qovluğa yazılır:
 *   studentId/courseId/kind/file
 *     -> courseId/student-submissions/studentId/kind/file
 *
 * DB trigger-i saxlanılan file_url-u `course-materials/...` canonical formaya çevirir.
 * Beləliklə tələbə və müəllim eyni private faylı mövcud course-materials RLS ilə oxuyur.
 */
function mapStudentSubmissionPath(path: string) {
  const normalized = path.replace(/^\/+/, "");
  if (normalized.startsWith("course-materials/")) {
    return normalized.slice("course-materials/".length);
  }

  const [studentId, courseId, ...rest] = normalized.split("/");
  if (studentId && courseId && rest.length > 0) {
    return `${courseId}/student-submissions/${studentId}/${rest.join("/")}`;
  }
  return normalized;
}

function studentSubmissionBucketAlias(storage: BaseStorageClient): BaseBucketClient {
  const bucket = storage.from("course-materials");
  return new Proxy(bucket, {
    get(target, prop, receiver) {
      if (prop === "upload") {
        return (path: string, ...args: Parameters<BaseBucketClient["upload"]> extends [string, ...infer R] ? R : never) =>
          target.upload(mapStudentSubmissionPath(path), ...args);
      }
      if (prop === "createSignedUrl") {
        return (path: string, ...args: Parameters<BaseBucketClient["createSignedUrl"]> extends [string, ...infer R] ? R : never) =>
          target.createSignedUrl(mapStudentSubmissionPath(path), ...args);
      }
      if (prop === "remove") {
        return (paths: string[]) => target.remove(paths.map(mapStudentSubmissionPath));
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

let _supabase: BaseSupabaseBrowserClient | undefined;
let _storageProxy: StorageClient | undefined;

export const supabase = new Proxy({} as SupabaseBrowserClient, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();

    if (prop === "storage") {
      if (!_storageProxy) {
        const storage = _supabase.storage;
        const storageProxy = new Proxy(storage, {
          get(target, storageProp, storageReceiver) {
            if (storageProp === "from") {
              return (bucketId: string) =>
                bucketId === "student-submissions"
                  ? studentSubmissionBucketAlias(target)
                  : target.from(bucketId);
            }
            const value = Reflect.get(target, storageProp, storageReceiver);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
        _storageProxy = storageProxy as unknown as StorageClient;
      }
      return _storageProxy;
    }

    return Reflect.get(_supabase, prop, receiver);
  },
});
