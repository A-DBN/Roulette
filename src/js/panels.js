import { saveStorage } from "./storage.js";

export function initCollapsibles(storageRef){
  document.querySelectorAll(".collapsible-hd").forEach(hd => {
    const key = hd.getAttribute("data-panel");

    hd.addEventListener("click", (e) => {
      if(e.target.closest("button, input, select, a, label")) return;
      togglePanel(storageRef, key);
    });

    hd.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        togglePanel(storageRef, key);
      }
    });
  });
}

export function applyPanelState(storage){
  const panels = storage.settings?.panels || {};
  document.querySelectorAll(".card.collapsible").forEach(card => {
    const key = card.getAttribute("data-panel");
    const open = panels[key] !== false;
    card.classList.toggle("collapsed", !open);
    const hd = card.querySelector(".collapsible-hd");
    if(hd) hd.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function togglePanel(storageRef, key){
  storageRef.value.settings = storageRef.value.settings || {};
  storageRef.value.settings.panels = storageRef.value.settings.panels || {};
  const current = storageRef.value.settings.panels[key] !== false;
  storageRef.value.settings.panels[key] = !current;
  saveStorage(storageRef.value);
  applyPanelState(storageRef.value);
}
