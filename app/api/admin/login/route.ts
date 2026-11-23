import { authConfigured, secureRequest, loginAllowed, verifyPassword, createSession } from "@/lib/admin-access";
import {isSameOriginMutation, readSmallJson, voteResponse} from "@/lib/voting-server";
export async function POST(request: Request) {
 if(!secureRequest(request) || !isSameOriginMutation(request)) return voteResponse({error:"Bu kaynaktan giriş yapılamıyor."},403);
 if(!authConfigured()) return voteResponse({error:"Yönetici girişi henüz yapılandırılmadı."},503);
 if(request.headers.get("content-type")?.split(";")[0] !== "application/json") return voteResponse({error:"JSON biçimi gerekli."},415);
 let body: unknown; try {body=await readSmallJson(request,1024);} catch {return voteResponse({error:"Giriş bilgileri okunamadı."},400);}
 const data=body as Record<string,unknown> | null;
 if(!data || typeof data.username !== "string" || typeof data.password !== "string" || data.username.length>64 || data.password.length>256) return voteResponse({error:"Giriş bilgilerini kontrol et."},400);
 try {
  if(!await loginAllowed(request)) {const response=voteResponse({error:"Çok fazla giriş denemesi. 15 dakika sonra tekrar dene."},429); response.headers.set("Retry-After","900"); return response;}
  const valid=await verifyPassword(data.password);
  if(!valid || data.username !== "admin") return voteResponse({error:"Kullanıcı adı veya şifre hatalı."},401);
  return voteResponse({ok:true},200,await createSession(request));
 } catch {return voteResponse({error:"Giriş şu anda tamamlanamıyor."},503);}
}
