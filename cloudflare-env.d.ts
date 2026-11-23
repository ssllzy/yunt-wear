declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    YUNT_ADMIN_EMAIL?: string;
    YUNT_ADMIN_PASSWORD_HASH?: string;
    YUNT_SESSION_SECRET?: string;
  }
}
