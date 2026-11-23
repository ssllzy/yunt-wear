import {adminGuard} from "@/lib/admin-access";
import {getMediaBucket,mediaTypes,IMAGE_LIMIT,VIDEO_LIMIT,readUpload,matchesMediaSignature} from "@/lib/media-server";
import {readSmallJson,voteResponse} from "@/lib/voting-server";
import {readTicket,signTicket,UPLOAD_CHUNK} from "@/lib/upload-ticket";
import {getDb} from "@/db";
import {mediaAssets} from "@/db/schema";
import {eq} from "drizzle-orm";
export async function POST(request:Request){
 const denied=await adminGuard(request,true);if(denied)return denied;
 try{
  const data=await readSmallJson(request,4096) as Record<string,unknown>;
  if(data.action==="start"){
   const type=typeof data.type==="string" ? data.type : "";const format=mediaTypes[type];
   if(!format || typeof data.name!=="string" || typeof data.size!=="number" || !Number.isSafeInteger(data.size) || data.size<1 || data.size>(format.kind==="video"?VIDEO_LIMIT:IMAGE_LIMIT))return voteResponse({error:"Dosya biçimini ve boyutunu kontrol et."},400);
   const ticket={id:crypto.randomUUID()+"."+format.extension,name:data.name.replace(/[\u0000-\u001f\u007f]/g,"").slice(0,120),type,size:data.size,expires:Date.now()+20*60000};
   return voteResponse({ticket:await signTicket(ticket),chunkSize:UPLOAD_CHUNK});
  }
  if(data.action!=="complete" || typeof data.ticket!=="string")return voteResponse({error:"Geçersiz yükleme."},400);
  const ticket=await readTicket(data.ticket);if(!ticket)return voteResponse({error:"Yükleme süresi doldu. Tekrar dene."},400);
  const [existing]=await getDb().select().from(mediaAssets).where(eq(mediaAssets.id,ticket.id)).limit(1);
  if(existing)return voteResponse({asset:{...existing,src:`/api/media/${existing.id}`}});
  const bucket=getMediaBucket();const bytes=new Uint8Array(ticket.size);const count=Math.ceil(ticket.size/UPLOAD_CHUNK);
  for(let index=0;index<count;index++){
   const part=await bucket.get(`pending/${ticket.id}/${index}`);if(!part)return voteResponse({error:"Yükleme eksik kaldı. Tekrar dene."},400);
   const chunk=new Uint8Array(await part.arrayBuffer());const expected=Math.min(UPLOAD_CHUNK,ticket.size-index*UPLOAD_CHUNK);
   if(chunk.length!==expected)return voteResponse({error:"Dosya parçaları uyuşmuyor."},400);bytes.set(chunk,index*UPLOAD_CHUNK);
  }
  if(!matchesMediaSignature(bytes,ticket.type))return voteResponse({error:"Dosyanın içeriği seçilen biçimle eşleşmiyor."},400);
  const asset={id:ticket.id,name:ticket.name,kind:mediaTypes[ticket.type].kind,contentType:ticket.type,size:ticket.size,createdAt:new Date().toISOString()};
  await bucket.put(ticket.id,bytes,{httpMetadata:{contentType:ticket.type,cacheControl:"public, max-age=31536000, immutable"}});
  await getDb().insert(mediaAssets).values(asset).onConflictDoNothing();
  await Promise.all(Array.from({length:count},(_,index)=>bucket.delete(`pending/${ticket.id}/${index}`)));
  return voteResponse({asset:{...asset,src:`/api/media/${ticket.id}`}},201);
 }catch{return voteResponse({error:"Dosya yüklenemedi. Lütfen tekrar dene."},503);}
}
export async function PUT(request:Request){
 const denied=await adminGuard(request,true);if(denied)return denied;
 try{
  const url=new URL(request.url);const ticket=await readTicket(request.headers.get("x-upload-ticket")??"");const index=Number(url.searchParams.get("part"));
  if(!ticket || !Number.isInteger(index) || index<0 || index>=Math.ceil(ticket.size/UPLOAD_CHUNK))return voteResponse({error:"Geçersiz yükleme parçası."},400);
  const bytes=await readUpload(request,UPLOAD_CHUNK);if(bytes.length!==Math.min(UPLOAD_CHUNK,ticket.size-index*UPLOAD_CHUNK))return voteResponse({error:"Eksik yükleme parçası."},400);
  await getMediaBucket().put(`pending/${ticket.id}/${index}`,bytes);return voteResponse({ok:true});
 }catch{return voteResponse({error:"Yükleme parçası kaydedilemedi."},503);}
}
