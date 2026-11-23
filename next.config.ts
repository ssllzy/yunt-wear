import type {NextConfig} from "next";
import path from "node:path";
const root=process.cwd();
const nextConfig:NextConfig = {
 outputFileTracingRoot:root,
 poweredByHeader:false,
 reactStrictMode:true,
 webpack(config, {webpack}) {
  config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/, (resource: {request:string}) => {resource.request=path.join(root,"lib/netlify/runtime.ts");}));
  config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^@\/db$/, path.join(root,"lib/netlify/database.ts")));
  config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^@\/db\/schema$/, path.join(root,"lib/netlify/schema.ts")));
  config.resolve.alias["cloudflare:workers"]=path.join(root,"lib/netlify/runtime.ts");
  config.resolve.alias["@/db$"]=path.join(root,"lib/netlify/database.ts");
  config.resolve.alias["@/db/schema$"]=path.join(root,"lib/netlify/schema.ts");
  return config;
 },
 async headers() {return [
  {source:"/:path*",headers:[
   {key:"X-Content-Type-Options",value:"nosniff"},
   {key:"X-Frame-Options",value:"SAMEORIGIN"},
   {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
   {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=()"},
   {key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"},
   {key:"Content-Security-Policy",value:"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; media-src 'self' https: blob:; font-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests"}
  ]},
  {source:"/yonetim/:path*",headers:[{key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"},{key:"Cache-Control",value:"private, no-store"}]},
  {source:"/api/:path*",headers:[{key:"X-Robots-Tag",value:"noindex, nofollow"}]},
  {source:"/media/:path*",headers:[{key:"Cache-Control",value:"public, max-age=86400, stale-while-revalidate=604800"}]}
 ];}
};
export default nextConfig;
