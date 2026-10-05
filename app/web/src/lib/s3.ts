/* S3 media bucket base URL, from NEXT_PUBLIC_S3_BASE_URL. Next inlines
   NEXT_PUBLIC_* values at build time, so this works in server and client
   components alike. No trailing slash. */
export const S3_BASE_URL = (process.env.NEXT_PUBLIC_S3_BASE_URL || "").replace(/\/+$/, "");

/** Full URL for an S3 object key ("folder/file.ext"). */
export const s3Url = (key: string): string => `${S3_BASE_URL}/${key.replace(/^\/+/, "")}`;
