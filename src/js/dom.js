export const $ = (sel) => document.querySelector(sel);

export function getEls(){
  return {
    wheelCanvas: $("#wheel"),
    spinBtn: $("#spinBtn"),
    resetResultBtn: $("#resetResultBtn"),
    centerGo: $("#centerGo"),

    // tabs + views
    tabWheel: $("#tabWheel"),
    tabTeams: $("#tabTeams"),
    viewWheel: $("#viewWheel"),
    viewTeams: $("#viewTeams"),
    mainInfo: $("#mainInfo"),

    // duration
    spinDurationRange: $("#spinDurationRange"),
    spinDurationValue: $("#spinDurationValue"),

    // names
    newNameInput: $("#newName"),
    addNameBtn: $("#addNameBtn"),
    clearNamesBtn: $("#clearNamesBtn"),
    shuffleNamesBtn: $("#shuffleNamesBtn"),
    namesListEl: $("#namesList"),

    // result + stats
    resultNameEl: $("#resultName"),
    statsPill: $("#statsPill"),

    // saved wheels
    wheelNameInput: $("#wheelName"),
    saveWheelBtn: $("#saveWheelBtn"),
    savedListEl: $("#savedList"),
    clearSavedBtn: $("#clearSavedBtn"),

    // sounds
    spinSoundSelect: $("#spinSoundSelect"),
    winSoundSelect: $("#winSoundSelect"),
    customSoundFile: $("#customSoundFile"),
    customSoundStatus: $("#customSoundStatus"),
    customSoundsListEl: $("#customSoundsList"),
    volumeRange: $("#volumeRange"),
    testSoundBtn: $("#testSoundBtn"),

    // zip
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

    // teams
    teamSizeInput: $("#teamSizeInput"),
    genTeamsBtn: $("#genTeamsBtn"),
    teamsBoard: $("#teamsBoard"),
    reshuffleTeamsBtn: $("#reshuffleTeamsBtn"),
    teamsHint: $("#teamsHint"),
    teamsAlert: $("#teamsAlert"),
  };
}
