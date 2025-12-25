export const $ = (sel) => document.querySelector(sel);

export function getEls(){
  return {
    wheelCanvas: $("#wheel"),
    spinBtn: $("#spinBtn"),
    resetResultBtn: $("#resetResultBtn"),
    centerGo: $("#centerGo"),

    newNameInput: $("#newName"),
    addNameBtn: $("#addNameBtn"),
    clearNamesBtn: $("#clearNamesBtn"),
    shuffleNamesBtn: $("#shuffleNamesBtn"),

    namesListEl: $("#namesList"),
    resultNameEl: $("#resultName"),
    statsPill: $("#statsPill"),
    wheelInfo: $("#wheelInfo"),

    wheelNameInput: $("#wheelName"),
    saveWheelBtn: $("#saveWheelBtn"),
    savedListEl: $("#savedList"),
    clearSavedBtn: $("#clearSavedBtn"),

    spinSoundSelect: $("#spinSoundSelect"),
    winSoundSelect: $("#winSoundSelect"),
    customSoundFile: $("#customSoundFile"),
    customSoundStatus: $("#customSoundStatus"),
    customSoundsListEl: $("#customSoundsList"),
    volumeRange: $("#volumeRange"),
    testSoundBtn: $("#testSoundBtn"),

    exportZipBtn: $("#exportZipBtn"),
    importZipBtn: $("#importZipBtn"),
    exportBox: $("#exportBox"),
    cancelExportZipBtn: $("#cancelExportZipBtn"),
    doExportZipBtn: $("#doExportZipBtn"),
    zipFileInput: $("#zipFileInput"),

    zipScopeAll: $("#zipScopeAll"),
    zipScopeCurrent: $("#zipScopeCurrent"),
    zipScopeSelect: $("#zipScopeSelect"),
    zipIncludeSounds: $("#zipIncludeSounds"),

    wheelPickBox: $("#wheelPickBox"),
    wheelPickList: $("#wheelPickList"),
    pickAllBtn: $("#pickAllBtn"),
    pickNoneBtn: $("#pickNoneBtn"),
  };
}
