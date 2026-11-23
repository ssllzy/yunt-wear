"use client";
import {useState,type FormEvent} from "react";
import {BrandMark} from "@/components/brand-mark";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Field,FieldGroup,FieldLabel} from "@/components/ui/field";
export function AdminAccessNotice() {
 const [pending,setPending]=useState(false); const [error,setError]=useState("");
 async function login(event:FormEvent<HTMLFormElement>) {event.preventDefault(); const form=event.currentTarget; const values=new FormData(form); setPending(true);setError(""); try {const response=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:values.get("username"),password:values.get("password")})}); const body=await response.json() as {error?:string}; if(!response.ok) throw new Error(body.error ?? "Giriş yapılamadı."); form.reset(); window.location.replace("/yonetim");} catch(cause){setError(cause instanceof Error ? cause.message : "Bağlantı kurulamadı.");}finally{setPending(false);}}
 return <main className="admin-access"><BrandMark/><p>YUNT / YÖNETİM</p><h1>Yönetici girişi</h1><form onSubmit={login} className="admin-login-form"><FieldGroup><Field><FieldLabel htmlFor="admin-username">Kullanıcı adı</FieldLabel><Input id="admin-username" name="username" autoComplete="username" required maxLength={64} autoCapitalize="none" spellCheck={false}/></Field><Field><FieldLabel htmlFor="admin-password">Şifre</FieldLabel><Input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={256}/></Field></FieldGroup>{error && <p role="alert">{error}</p>}<Button type="submit" disabled={pending}>{pending ? "Giriş yapılıyor…" : "Giriş yap"}</Button></form><a href="/">Siteye dön</a></main>;
}
