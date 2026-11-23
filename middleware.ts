import {NextResponse,type NextRequest} from "next/server";
export function middleware(request:NextRequest){
 const nonce=btoa(crypto.randomUUID());
 const development=process.env.NODE_ENV!=="production";
 const policy=`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; media-src 'self' https: blob:; font-src 'self'; connect-src 'self'${development ? " ws: wss:" : ""}; frame-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'${development ? "" : "; upgrade-insecure-requests"}`;
 const headers=new Headers(request.headers);headers.set("x-nonce",nonce);headers.set("Content-Security-Policy",policy);
 const response=NextResponse.next({request:{headers}});response.headers.set("Content-Security-Policy",policy);
 if(request.nextUrl.pathname.startsWith("/yonetim")){response.headers.set("Cache-Control","private, no-store");response.headers.set("X-Robots-Tag","noindex, nofollow, noarchive");}
 return response;
}
export const config={matcher:["/((?!api|_next|media|favicon.svg|robots.txt|sitemap.xml|opengraph-image).*)"]};
