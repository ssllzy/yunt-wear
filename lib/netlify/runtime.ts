import {getNetlifyDatabase} from "./connection";
import {getStore} from "@netlify/blobs";
// The app's small raw auth queries use positional placeholders. Drizzle queries
// use the native Postgres schema/driver through a separate Next.js alias.
class Statement {
 constructor(private query:string, private values:unknown[] = []) {}
 bind(...values:unknown[]) {return new Statement(this.query,values);}
 async all() {let index=0; const sql=this.query.replace(/\?/g,()=>`$${++index}`); const results=await getNetlifyDatabase().sql.unsafe(sql,this.values); return {results};}
 async first<T>() {return (await this.all()).results[0] as T ?? null;}
 async run() {await this.all(); return {success:true};}
}
const PART=3*1024*1024;
const store=()=>getStore({name:"yunt-media",consistency:"strong"});
const bucket = {
 async put(id:string,bytes:Uint8Array,options?:{httpMetadata?:{contentType?:string;cacheControl?:string}}) {
  const hash=await crypto.subtle.digest("SHA-256",bytes as Uint8Array<ArrayBuffer>);
  const etag=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
  const parts=Math.ceil(bytes.length/PART);
  for(let i=0;i<parts;i++)await store().set(`${id}/part-${i}`,bytes.slice(i*PART,(i+1)*PART).buffer);
  await store().set(`${id}/manifest`,"",{metadata:{size:bytes.length,parts,etag,httpMetadata:options?.httpMetadata ?? {}}});
 },
 async head(id:string) {
  const result=await store().getMetadata(`${id}/manifest`);if(!result)return null;
  const meta=result.metadata as {size:number;parts:number;etag:string;httpMetadata:{contentType?:string;cacheControl?:string}};
  return {...meta,httpEtag:`"${meta.etag}"`};
 },
 async get(id:string,options?:{range?:{offset:number;length:number}}) {
  const meta=await this.head(id);if(!meta)return null;
  const offset=options?.range?.offset ?? 0;const length=options?.range?.length ?? meta.size;
  const first=Math.floor(offset/PART),last=Math.floor((offset+length-1)/PART);
  const buffers=await Promise.all(Array.from({length:last-first+1},(_,i)=>store().get(`${id}/part-${first+i}`,{type:"arrayBuffer"})));
  if(buffers.some(b=>!b))throw new Error("Incomplete media");
  const all=new Uint8Array(buffers.reduce((n,b)=>n+(b?.byteLength ?? 0),0));let position=0;
  for(const buffer of buffers){all.set(new Uint8Array(buffer!),position);position+=buffer!.byteLength;}
  const bytes=all.slice(offset-first*PART,offset-first*PART+length).buffer;
  return {body:new Blob([bytes]).stream(),arrayBuffer:async()=>bytes};
 },
 async delete(id:string) {const meta=await this.head(id);if(meta)await Promise.all(Array.from({length:meta.parts},(_,i)=>store().delete(`${id}/part-${i}`)));await store().delete(`${id}/manifest`);}
};
export const env = {
 DB:{prepare:(query:string)=>new Statement(query)}, BUCKET:bucket,
 get YUNT_ADMIN_PASSWORD_HASH(){return process.env.YUNT_ADMIN_PASSWORD_HASH;},
 get YUNT_SESSION_SECRET(){return process.env.YUNT_SESSION_SECRET;},
};
