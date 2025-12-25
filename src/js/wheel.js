import { clamp, ellipsize } from "./utils.js";

export function drawWheel(ctx, canvas, names, rotation){
  const clean = names.map(x => (x||"").trim()).filter(Boolean);
  const total = clean.length;

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const cx = W/2, cy = H/2;
  const r = Math.min(W,H)*0.46;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  if(total === 0){
    ctx.beginPath();
    ctx.arc(0,0,r,0,Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = "rgba(233,236,241,.9)";
    ctx.font = "700 44px ui-sans-serif, system-ui";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("Ajoute des noms", 0, 0);
    ctx.restore();
    return;
  }

  const slice = (Math.PI*2) / total;
  for(let i=0;i<total;i++){
    const start = i*slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,r,start,end);
    ctx.closePath();

    ctx.fillStyle = hashColor(i, total);
    ctx.globalAlpha = 0.92;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(0,0,0,.25)";
    ctx.lineWidth = 4;
    ctx.stroke();

    const mid = start + slice/2;
    ctx.save();
    ctx.rotate(mid);
    ctx.translate(r*0.62, 0);

    const txt = clean[i];
    const base = clamp(44 - total*1.2, 18, 40);
    ctx.font = `900 ${base}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const padX = 14, padY = 10;
    const metrics = ctx.measureText(txt);
    const bw = clamp(metrics.width + padX*2, 80, r*1.0);
    const bh = base + padY*2;

    ctx.fillStyle = "rgba(255,255,255,.78)";
    roundRect(ctx, -bw/2, -bh/2, bw, bh, 18);
    ctx.fill();

    ctx.fillStyle = "rgba(10,12,18,.92)";
    ctx.fillText(ellipsize(txt, 16), 0, 0);

    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 10;
  ctx.stroke();

  const grad = ctx.createRadialGradient(-r*0.3, -r*0.35, r*0.1, 0, 0, r);
  grad.addColorStop(0, "rgba(255,255,255,.22)");
  grad.addColorStop(0.6, "rgba(255,255,255,.05)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function hashColor(i, total){
  const hue = Math.round((i / Math.max(1,total)) * 360);
  return `hsl(${hue}, 70%, 55%)`;
}

function roundRect(c,x,y,w,h,r){
  const rr = Math.min(r, w/2, h/2);
  c.beginPath();
  c.moveTo(x+rr, y);
  c.arcTo(x+w, y, x+w, y+h, rr);
  c.arcTo(x+w, y+h, x, y+h, rr);
  c.arcTo(x, y+h, x, y, rr);
  c.arcTo(x, y, x+w, y, rr);
  c.closePath();
}

export function getWinnerIndex(cleanNames, finalRotation){
  const total = cleanNames.length;
  const slice = (Math.PI*2)/total;

  let a = (-Math.PI/2 - finalRotation) % (Math.PI*2);
  if(a < 0) a += Math.PI*2;

  const idx = Math.floor(a / slice);
  return clamp(idx, 0, total-1);
}
