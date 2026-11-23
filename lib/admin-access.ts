import {requestOrigin} from "@/lib/request-origin";
import { env } from "cloudflare:workers";
import { isSameOriginMutation, voteResponse } from "@/lib/voting-server";
const HOURS = 8;
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
export const SITE_HOSTNAME = "yuntwear.netlify.app";
export function authConfigured() { return !!env.YUNT_ADMIN_PASSWORD_HASH && (env.YUNT_SESSION_SECRET?.length ?? 0) >= 32; }
export function secureRequest(request: Request) { return requestOrigin(request) !== null; }
const encoder = new TextEncoder();
export async function hashToken(token: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))), b => b.toString(16).padStart(2,"0")).join(""); }
export async function privateKey(value: string) {
 const key = await crypto.subtle.importKey("raw", encoder.encode(env.YUNT_SESSION_SECRET ?? ""), {name:"HMAC", hash:"SHA-256"}, false,["sign"]);
 return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(value))), b=>b.toString(16).padStart(2,"0")).join("");
}
export function sessionCookie(request: Request, value: string, expired = false) { const secure = requestOrigin(request)?.startsWith("https:") ?? false; return `${secure ? "__Host-yunt_admin" : "yunt_admin"}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${expired ? 0 : HOURS*3600}${secure ? "; Secure" : ""}`; }
function sessionToken(request: Request) { const name = requestOrigin(request)?.startsWith("https:") ? "__Host-yunt_admin" : "yunt_admin"; return request.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith(name+"="))?.slice(name.length+1); }
export async function hasAdminAccess(request: Request): Promise<boolean> {
 if (!secureRequest(request) || !authConfigured() || !env.DB) return false;
 const token = sessionToken(request); if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
 try { const row = await env.DB.prepare("SELECT expires_at, credential_version FROM admin_sessions WHERE token_hash = ?").bind(await hashToken(token)).first<{expires_at:number;credential_version:string}>(); return !!row && row.expires_at > Date.now() && row.credential_version === await hashToken(env.YUNT_ADMIN_PASSWORD_HASH!); } catch { return false; }
}
export async function adminGuard(request: Request, mutation = false): Promise<Response | null> {
 if (!await hasAdminAccess(request)) return voteResponse({error:"Oturumun sona ermiş olabilir. Yönetim paneline yeniden giriş yap."},401);
 if (mutation && !isSameOriginMutation(request)) return voteResponse({error:"Bu kaynaktan değişiklik yapılamıyor."},403);
 return null;
}
export function adminRequestFromHeaders(headers: Headers): Request {
 const host = headers.get("host") ?? SITE_HOSTNAME;
 const hostname = host.split(":")[0];
 return new Request(`${localHosts.has(hostname) ? "http:" : "https:"}//${host}/yonetim`, {headers});
}
export async function verifyPassword(password: string) {
 const [algorithm,iterations,salt,expected] = (env.YUNT_ADMIN_PASSWORD_HASH ?? "").split("$");
 // This format is reserved for a generated 256-bit base64url credential.
 if (algorithm === "sha256-random-v1") {
  if (!/^[a-f0-9]{64}$/.test(iterations) || !/^[A-Za-z0-9_-]{43}$/.test(password)) return false;
  const actual = await hashToken(password);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ iterations.charCodeAt(i);
  return difference === 0;
 }
 if (algorithm !== "pbkdf2-sha256" || iterations !== "600000" || !salt || !expected) return false;
 const decode = (s: string) => Uint8Array.from(atob(s), c=>c.charCodeAt(0));
 const key = await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 const actual = new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt:decode(salt),iterations:600000,hash:"SHA-256"},key,256));
 const wanted = decode(expected); let difference = actual.length ^ wanted.length;
 for(let i=0;i<actual.length;i++) difference |= actual[i] ^ (wanted[i] ?? 0);
 return difference === 0;
}
export async function createSession(request: Request) {
 const token = Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
 await env.DB!.prepare("INSERT INTO admin_sessions (token_hash, expires_at, credential_version) VALUES (?, ?, ?)").bind(await hashToken(token),Date.now()+HOURS*3600000,await hashToken(env.YUNT_ADMIN_PASSWORD_HASH!)).run();
 await env.DB!.prepare("DELETE FROM admin_sessions WHERE expires_at < ?").bind(Date.now()).run();
 return sessionCookie(request,token);
}
export async function revokeSession(request: Request) { const token = sessionToken(request); if(token && env.DB) await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await hashToken(token)).run(); }
export async function loginAllowed(request: Request) {
 if (!env.DB) return false;
 // Netlify owns this connection header; local previews use a shared bucket.
 const ip = new URL(request.url).hostname === SITE_HOSTNAME ? request.headers.get("x-nf-client-connection-ip") ?? "unknown" : "local";
 const now=Date.now();
 for(const [key,limit] of [[await privateKey("login-ip:"+ip),20],["login-global",150]] as const) {
  const row=await env.DB.prepare("INSERT INTO login_limits (key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN login_limits.expires_at < ? THEN 1 ELSE login_limits.attempts + 1 END, expires_at = CASE WHEN login_limits.expires_at < ? THEN ? ELSE login_limits.expires_at END RETURNING attempts").bind(key,now+900000,now,now,now+900000).first<{attempts:number}>();
  if(!row || row.attempts > limit) return false;
 }
 await env.DB.prepare("DELETE FROM login_limits WHERE expires_at < ?").bind(now).run();
 return true;
}
