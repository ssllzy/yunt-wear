const localHosts=new Set(["localhost","127.0.0.1","[::1]"]);
// Next's internal Request URL can use localhost behind a proxy. Only accept
// explicitly configured public hosts; never trust arbitrary forwarded headers.
export function requestOrigin(request:Request):string|null {
 const internal=new URL(request.url);const host=request.headers.get("host") ?? internal.host;
 let parsed:URL;try{parsed=new URL("http://"+host);}catch{return null;}
 if(parsed.host!==host || parsed.username || parsed.password)return null;
 if(localHosts.has(parsed.hostname) && internal.protocol==="http:")return "http://"+host;
 const allowed=new Set(["yuntwear.netlify.app","legacy-preview.example.invalid"]);
 for(const value of [process.env.YUNT_PUBLIC_ORIGIN, process.env.URL,process.env.DEPLOY_URL,process.env.DEPLOY_PRIME_URL]){if(value)try{const url=new URL(value);if(url.protocol==="https:")allowed.add(url.host);}catch{}}
 return allowed.has(host)?"https://"+host:null;
}
