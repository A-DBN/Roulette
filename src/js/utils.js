export function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

export function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function shuffleInPlace(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

export function formatDate(ts){
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit"
  });
}

export function ellipsize(s, max){
  const t = (s||"").trim();
  if(t.length <= max) return t;
  return t.slice(0, max-1) + "…";
}

export function safeFileName(s){
  return (s||"sound").replace(/[^\w\- ]+/g, "").trim().slice(0, 40) || "sound";
}

export function makeSafeName(filename){
  const base = (filename || "Son").replace(/\.[^/.]+$/, "");
  const cleaned = base.replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "").trim();
  return cleaned.slice(0, 32) || "Son";
}

export function dataUrlBytes(dataUrl){
  const comma = dataUrl.indexOf(",");
  if(comma < 0) return dataUrl.length;
  const b64 = dataUrl.slice(comma + 1);
  const padding = (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

export function formatBytes(n){
  const v = Number(n) || 0;
  if(v < 1024) return `${v} o`;
  const kb = v/1024;
  if(kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb/1024;
  return `${mb.toFixed(2)} MB`;
}
