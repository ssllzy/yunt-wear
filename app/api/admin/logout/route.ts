import {revokeSession, sessionCookie} from "@/lib/admin-access";
import {isSameOriginMutation,voteResponse} from "@/lib/voting-server";
export async function POST(request: Request) {if(!isSameOriginMutation(request)) return voteResponse({error:"Geçersiz kaynak."},403); try {await revokeSession(request); return voteResponse({ok:true},200,sessionCookie(request,"",true));} catch {return voteResponse({error:"Çıkış tamamlanamadı. Tekrar dene."},503);}}
