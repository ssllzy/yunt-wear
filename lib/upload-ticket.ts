import {env} from "cloudflare:workers";
export type UploadTicket={id:string;name:string;type:string;size:number;expires:number};
const encoder=new TextEncoder();
const encode=(bytes:Uint8Array)=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join("")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const decode=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
async function key(){return crypto.subtle.importKey("raw",encoder.encode(env.YUNT_SESSION_SECRET!),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);}
export async function signTicket(ticket:UploadTicket){const payload=encode(encoder.encode(JSON.stringify(ticket)));return payload+"."+encode(new Uint8Array(await crypto.subtle.sign("HMAC",await key(),encoder.encode(payload))));}
export async function readTicket(value:string):Promise<UploadTicket|null>{try{const [payload,signature,...extra]=value.split(".");if(extra.length || value.length>2048 || !await crypto.subtle.verify("HMAC",await key(),decode(signature),encoder.encode(payload)))return null;const ticket=JSON.parse(new TextDecoder().decode(decode(payload))) as UploadTicket;return ticket.expires>Date.now()?ticket:null;}catch{return null;}}
export const UPLOAD_CHUNK=3*1024*1024;
