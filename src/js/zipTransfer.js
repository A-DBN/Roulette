import { uid, formatDate, safeFileName, dataUrlBytes } from "./utils.js";
import { saveStorage } from "./storage.js";

export function createZipTransfer(storageRef){
  function mimeFromDataUrl(dataUrl){
    const m = /^data:([^;]+);base64,/.exec(dataUrl || "");
    return m ? m[1] : "audio/mpeg";
  }
  function base64FromDataUrl(dataUrl){
    const comma = dataUrl.indexOf(",");
    return comma >= 0 ? dataUrl.slice(comma+1) : "";
  }
  function guessExtFromMime(mime){
    const m = (mime || "").toLowerCase();
    if(m.includes("ogg")) return "ogg";
    if(m.includes("wav")) return "wav";
    if(m.includes("mp4") || m.includes("aac")) return "m4a";
    if(m.includes("mpeg") || m.includes("mp3")) return "mp3";
    return "audio";
  }

  function downloadBlob(blob, filename){
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 500);
  }

  async function exportZip({ scope, includeSounds, currentNames, currentWheelName, selectedWheelIds }){
    if(typeof JSZip === "undefined"){
      alert("JSZip non chargé (réseau ?). Réessaie.");
      return;
    }

    const storage = storageRef.value;

    let wheelsToExport = [];

    if(scope === "current"){
      wheelsToExport = [{
        id: uid(),
        name: currentWheelName || "Roue",
        names: currentNames,
        updatedAt: Date.now()
      }];
    } else if(scope === "all"){
      wheelsToExport = (storage.wheels || []).map(w => ({
        id: w.id || uid(),
        name: (w.name || "Roue").toString(),
        names: Array.isArray(w.names) ? w.names.map(x => (x||"").toString()) : [],
        updatedAt: w.updatedAt || Date.now()
      }));
    } else {
      wheelsToExport = (storage.wheels || [])
        .filter(w => selectedWheelIds.includes(w.id))
        .map(w => ({
          id: w.id || uid(),
          name: (w.name || "Roue").toString(),
          names: Array.isArray(w.names) ? w.names.map(x => (x||"").toString()) : [],
          updatedAt: w.updatedAt || Date.now()
        }));

      if(!wheelsToExport.length){
        wheelsToExport = [{
          id: uid(),
          name: currentWheelName || "Roue",
          names: currentNames,
          updatedAt: Date.now()
        }];
      }
    }

    const settingsToExport = {
      spinSound: storage.settings?.spinSound || "tick",
      winSound: storage.settings?.winSound || "chime",
      volume: storage.settings?.volume ?? 65,
      panels: storage.settings?.panels || { names:true, sound:true, saved:true },
    };

    const soundsToExportMeta = [];
    if(includeSounds){
      const list = storage.settings?.customSounds || [];
      for(const s of list){
        if(!s?.dataUrl) continue;
        const mime = mimeFromDataUrl(s.dataUrl);
        soundsToExportMeta.push({
          id: s.id,
          name: s.name,
          bytes: s.bytes || dataUrlBytes(s.dataUrl),
          addedAt: s.addedAt || Date.now(),
          mime,
          ext: guessExtFromMime(mime)
        });
      }
    }

    const payload = {
      version: 1,
      exportedAt: Date.now(),
      scope,
      wheels: wheelsToExport,
      settings: settingsToExport,
      sounds: includeSounds ? soundsToExportMeta : [],
    };

    const zip = new JSZip();
    zip.folder("data").file("storage.json", JSON.stringify(payload, null, 2));

    if(includeSounds){
      const folder = zip.folder("sounds");
      const list = storage.settings?.customSounds || [];
      for(const s of list){
        if(!s?.dataUrl) continue;
        const mime = mimeFromDataUrl(s.dataUrl);
        const ext = guessExtFromMime(mime);
        const filename = `${safeFileName(s.name)}__${s.id}.${ext}`;
        folder.file(filename, base64FromDataUrl(s.dataUrl), { base64: true });
      }
    }

    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const dt = new Date();
    const fname = `wheel_transfer_${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}.zip`;
    downloadBlob(blob, fname);
  }

  async function importZip(file){
    if(typeof JSZip === "undefined"){
      alert("JSZip non chargé (réseau ?). Réessaie.");
      return null;
    }
    if(!file) return null;

    const zip = await JSZip.loadAsync(file);
    const storageFile = zip.file("data/storage.json");
    if(!storageFile){
      alert("ZIP invalide: data/storage.json manquant.");
      return null;
    }

    let payload;
    try{
      const txt = await storageFile.async("string");
      payload = JSON.parse(txt);
    }catch{
      alert("ZIP invalide: JSON illisible.");
      return null;
    }

    const importedWheels = Array.isArray(payload.wheels) ? payload.wheels : [];
    const importedSettings = payload.settings || {};
    const importedSoundsMeta = Array.isArray(payload.sounds) ? payload.sounds : [];

    const newCustomSounds = [];
    if(importedSoundsMeta.length){
      for(const meta of importedSoundsMeta){
        const id = meta.id;
        if(!id) continue;

        let foundPath = null;
        zip.forEach((path, entry) => {
          if(foundPath) return;
          if(entry.dir) return;
          if(!path.startsWith("sounds/")) return;
          if(path.includes(`__${id}.`)) foundPath = path;
        });

        if(!foundPath) continue;

        const mime = meta.mime || "audio/mpeg";
        const base64 = await zip.file(foundPath).async("base64");
        const dataUrl = `data:${mime};base64,${base64}`;
        const bytes = meta.bytes || dataUrlBytes(dataUrl);

        newCustomSounds.push({
          id,
          name: meta.name || "Son",
          dataUrl,
          bytes,
          addedAt: meta.addedAt || Date.now()
        });
      }
    }

    storageRef.value = {
      version: 1,
      wheels: importedWheels.map(w => ({
        id: w.id || uid(),
        name: (w.name || "Roue").toString(),
        names: Array.isArray(w.names) ? w.names.map(x => (x||"").toString()) : [],
        updatedAt: w.updatedAt || Date.now()
      })),
      settings: {
        spinSound: importedSettings.spinSound || "tick",
        winSound: importedSettings.winSound || "chime",
        volume: importedSettings.volume ?? 65,
        panels: importedSettings.panels || { names:true, sound:true, saved:true },
        customSounds: newCustomSounds
      }
    };

    // winSound cohérent
    const ws = storageRef.value.settings.winSound;
    if(ws && ws.startsWith("custom:")){
      const id = ws.slice("custom:".length);
      const ok = storageRef.value.settings.customSounds.some(s => s.id === id);
      if(!ok) storageRef.value.settings.winSound = "chime";
    }
    if(ws === "__add__") storageRef.value.settings.winSound = "chime";

    saveStorage(storageRef.value);
    alert("Import ZIP OK ✅");
    return storageRef.value;
  }

  return { exportZip, importZip };
}
