const STORAGE_KEY = "simple_wheel_storage_v1";

export function freshStorage(){
  return {
    version:1,
    wheels:[],
    settings:{
      spinSound:"tick",
      winSound:"chime",
      volume:65,
      customSounds:[],
      panels:{ names:true, sound:true, saved:true }
    }
  };
}

export function loadStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return freshStorage();
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== "object") throw new Error("bad json");
    if(!Array.isArray(parsed.wheels)) parsed.wheels = [];
    parsed.settings = parsed.settings || {};
    parsed.settings.customSounds = Array.isArray(parsed.settings.customSounds) ? parsed.settings.customSounds : [];
    parsed.settings.panels = parsed.settings.panels || { names:true, sound:true, saved:true };
    if(!parsed.settings.spinSound) parsed.settings.spinSound = "tick";
    if(!parsed.settings.winSound) parsed.settings.winSound = "chime";
    if(parsed.settings.volume == null) parsed.settings.volume = 65;
    return parsed;
  }catch{
    return freshStorage();
  }
}

export function saveStorage(storage){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}
