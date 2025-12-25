import { clamp, dataUrlBytes, makeSafeName, formatBytes } from "./utils.js";
import { saveStorage } from "./storage.js";

export const LIMITS = {
  MAX_CUSTOM_SOUNDS: 10,
  MAX_CUSTOM_SOUND_BYTES: 1_800_000,
  MAX_TOTAL_CUSTOM_BYTES: 6_000_000,
};

export function createAudioController(storageRef){
  let audioCtx = null;
  let masterGain = null;

  const customPlayers = new Map(); // id -> Audio

  function ensureAudio(){
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = getVolume();
      masterGain.connect(audioCtx.destination);
    }
    if(audioCtx.state === "suspended"){
      audioCtx.resume().catch(()=>{});
    }
  }

  function getVolume(){
    const v = Number((storageRef.value.settings?.volume ?? 65));
    return clamp(v, 0, 100) / 100;
  }

  function setVolume(v){
    storageRef.value.settings = storageRef.value.settings || {};
    storageRef.value.settings.volume = v;
    saveStorage(storageRef.value);

    if(masterGain) masterGain.gain.value = getVolume();
    for(const a of customPlayers.values()) a.volume = getVolume();
  }

  function playTone({type="sine", freq=440, dur=0.08, gain=0.25, attack=0.005, release=0.04, detune=0}){
    ensureAudio();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain * getVolume(), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);

    osc.connect(g);
    g.connect(masterGain);

    osc.start(t0);
    osc.stop(t0 + dur + release + 0.02);
  }

  function soundTick(){ playTone({ type:"square", freq: 1200, dur:0.02, gain:0.20, attack:0.002, release:0.03 }); }
  function soundRoulette(){ playTone({ type:"triangle", freq: 860, dur:0.03, gain:0.20, attack:0.003, release:0.05, detune: -20 }); }
  function soundChime(){
    playTone({ type:"sine", freq: 880, dur:0.10, gain:0.25, attack:0.005, release:0.14 });
    playTone({ type:"sine", freq: 1320, dur:0.10, gain:0.18, attack:0.005, release:0.18 });
  }
  function soundPop(){
    playTone({ type:"sine", freq: 260, dur:0.05, gain:0.28, attack:0.001, release:0.08 });
    playTone({ type:"square", freq: 520, dur:0.02, gain:0.10, attack:0.001, release:0.05 });
  }

  function playSpinSound(){
    const mode = storageRef.value.settings?.spinSound || "tick";
    if(mode === "tick") soundTick();
    else if(mode === "roulette") soundRoulette();
  }

  function getCustomSounds(){
    storageRef.value.settings = storageRef.value.settings || {};
    storageRef.value.settings.customSounds = Array.isArray(storageRef.value.settings.customSounds)
      ? storageRef.value.settings.customSounds
      : [];
    return storageRef.value.settings.customSounds;
  }

  function rebuildCustomPlayers(){
    customPlayers.clear();
    for(const s of getCustomSounds()){
      const a = new Audio();
      a.preload = "auto";
      a.src = s.dataUrl;
      a.volume = getVolume();
      customPlayers.set(s.id, a);
    }
  }

  function getEffectiveWinSoundValue(winSelectValue, winSelectOptions){
    let v = winSelectValue;
    if(v === "__add__"){
      return winSelectOptions?.[0]?.value || "none";
    }
    if(v.startsWith("custom:")){
      const id = v.slice("custom:".length);
      const exists = getCustomSounds().some(s => s.id === id);
      if(!exists){
        return winSelectOptions?.[0]?.value || "none";
      }
    }
    return v;
  }

  function playWinSound(winSelectValue, winSelectOptions){
    const mode = getEffectiveWinSoundValue(winSelectValue, winSelectOptions);
    if(mode === "none") return;
    if(mode === "chime") return soundChime();
    if(mode === "pop") return soundPop();
    if(mode.startsWith("custom:")){
      const id = mode.slice("custom:".length);
      const audio = customPlayers.get(id);
      if(audio?.src){
        audio.currentTime = 0;
        audio.volume = getVolume();
        audio.play().catch(()=>{});
      }else{
        soundChime();
      }
    }
  }

  function getTotalCustomBytes(){
    return getCustomSounds().reduce((sum, s) => sum + (Number(s.bytes) || dataUrlBytes(s.dataUrl || "")), 0);
  }

  async function addCustomSoundFromFile(file){
    const list = getCustomSounds();

    if(list.length >= LIMITS.MAX_CUSTOM_SOUNDS){
      return { ok:false, msg:`Limite atteinte: ${LIMITS.MAX_CUSTOM_SOUNDS} sons.` };
    }

    const dataUrl = await readAsDataUrl(file);
    const bytes = dataUrlBytes(dataUrl);

    if(bytes > LIMITS.MAX_CUSTOM_SOUND_BYTES){
      return { ok:false, msg:`Son trop gros: ${formatBytes(bytes)} (max ${formatBytes(LIMITS.MAX_CUSTOM_SOUND_BYTES)}).` };
    }

    const totalAfter = getTotalCustomBytes() + bytes;
    if(totalAfter > LIMITS.MAX_TOTAL_CUSTOM_BYTES){
      return { ok:false, msg:`Taille totale dépassée: ${formatBytes(totalAfter)} (max ${formatBytes(LIMITS.MAX_TOTAL_CUSTOM_BYTES)}).` };
    }

    const id = (Math.random().toString(16).slice(2) + Date.now().toString(16));
    const name = makeSafeName(file.name);

    list.push({ id, name, dataUrl, bytes, addedAt: Date.now() });
    storageRef.value.settings.customSounds = list;
    saveStorage(storageRef.value);

    rebuildCustomPlayers();
    return { ok:true, id, name };
  }

  function deleteCustomSound(id){
    const list = getCustomSounds().filter(x => x.id !== id);
    storageRef.value.settings.customSounds = list;
    saveStorage(storageRef.value);
    rebuildCustomPlayers();
  }

  return {
    ensureAudio,
    setVolume,
    getVolume,
    playSpinSound,
    playWinSound,
    rebuildCustomPlayers,
    getCustomSounds,
    addCustomSoundFromFile,
    deleteCustomSound,
    getTotalCustomBytes,
    getEffectiveWinSoundValue,
  };
}

function readAsDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
