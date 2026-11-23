import {ImageResponse} from "next/og";
export const alt="YUNT WEAR — Kendi izini bırak";
export const size={width:1200,height:630};
export const contentType="image/png";
export default function Image(){return new ImageResponse(<div style={{width:"100%",height:"100%",background:"#080808",color:"white",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:220,fontWeight:900,letterSpacing:-12}}>YUNT</div><div style={{fontSize:23,letterSpacing:9,marginTop:24}}>KENDİ İZİNİ BIRAK.</div></div>,size);}
