import * as Utils from "./Utils";
import * as DomUtils from "./DomUtils";
import * as UrlUtils from "./UrlUtils";
import InternalAudioPlayer from "./InternalAudioPlayer";
import * as KlattSyn from "klatt-syn";
import * as FunctionCurveViewer from "function-curve-viewer";
import * as WavFileEncoder from "wav-file-encoder";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";

var audioContext:                      AudioContext;
var audioPlayer:                       InternalAudioPlayer;
var urlDirty:                          boolean = false;

// GUI components:
var synthesizeButtonElement:           HTMLButtonElement;
var playButtonElement:                 HTMLButtonElement;
var wavFileButtonElement:              HTMLButtonElement;
var resetButtonElement:                HTMLButtonElement;
var signalViewerCanvas:                HTMLCanvasElement;
var signalViewerWidget:                FunctionCurveViewer.Widget | undefined;

// Current synthesized signal:
var signalSamples:                     Float64Array | undefined;
var signalSampleRate:                  number;

//--- Signal -------------------------------------------------------------------

function clearCanvas (canvas: HTMLCanvasElement) {
   const ctx = canvas.getContext('2d')!;
   ctx.clearRect(0, 0, canvas.width, canvas.height); }

function removeSignalViewer() {
   if (!signalViewerWidget) {
      return; }
   signalViewerWidget.setConnected(false);
   signalViewerWidget = undefined;
   clearCanvas(signalViewerCanvas); }

function setSignalViewer() {
   removeSignalViewer();
   signalViewerWidget = new FunctionCurveViewer.Widget(signalViewerCanvas);
   const viewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(signalSamples!, signalSampleRate);
   const viewerState : FunctionCurveViewer.ViewerState = {
      viewerFunction:  viewerFunction,
      xMin:            0,
      xMax:            signalSamples!.length / signalSampleRate,
      yMin:            -1.2,
      yMax:            1.2,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "s",
      focusShield:     true };
   signalViewerWidget.setViewerState(viewerState); }

function synthesize() {
   signalSamples = undefined;
   const uiParms = getUiParms();
   signalSamples = KlattSyn.generateSound(uiParms.mParms, uiParms.fParmsA);
   signalSampleRate = uiParms.mParms.sampleRate;
   Utils.fadeAudioSignalInPlace(signalSamples, uiParms.fadingDuration * signalSampleRate, WindowFunctions.hannWindow);
   setSignalViewer(); }

function resetSignal() {
   signalSamples = undefined;
   removeSignalViewer(); }

//--- UI parameters ------------------------------------------------------------

interface UiParms {
   mParms:                   KlattSyn.MainParms;
   fParmsA:                  KlattSyn.FrameParms[];
   fadingDuration:           number; }

const defaultMainParms: KlattSyn.MainParms = {
   sampleRate:               44100,
   glottalSourceType:        KlattSyn.GlottalSourceType.impulsive };

const defaultFrameParms: KlattSyn.FrameParms = {
   duration:                 1,
   f0:                       247,    // 220,
   flutterLevel:             0.25,
   openPhaseRatio:           0.7,
   breathinessDb:            -25,
   tiltDb:                   0,
   gainDb:                   -10,
   nasalFormantFreq:         NaN,
   nasalFormantBw:           NaN,
   oralFormantFreq:          [520, 1006, 2831, 3168, 4135, 5020],
   oralFormantBw:            [76,  102,  72,   102,  816,  596 ],

   // Cascade branch:
   cascadeEnabled:           true,
   cascadeVoicingDb:         0,
   cascadeAspirationDb:      -25,
   cascadeAspirationMod:     0.5,
   nasalAntiformantFreq:     NaN,
   nasalAntiformantBw:       NaN,

   // Parallel branch:
   parallelEnabled:          false,
   parallelVoicingDb:        0,
   parallelAspirationDb:     -25,
   parallelAspirationMod:    0.5,
   fricationDb:              -30,
   fricationMod:             0.5,
   parallelBypassDb:         -99,
   nasalFormantDb:           NaN,
   oralFormantDb:            [0, -8, -15, -19, -30, -35] };

const defaultUiParms: UiParms = {
   mParms:                   defaultMainParms,
   fParmsA:                  [defaultFrameParms],
   fadingDuration:           0.05 };

function setUiParms (uiParms: UiParms) {

   // Main parameters:
   const mParms = uiParms.mParms;
   DomUtils.setValueNum("sampleRate",            mParms.sampleRate);
   DomUtils.setValue("glottalSourceType",        KlattSyn.glottalSourceTypeEnumNames[mParms.glottalSourceType]);

   // Frame parameters:
   const fParms = uiParms.fParmsA[0];                      // temporary solution for a single frame
   DomUtils.setValueNum("duration",              fParms.duration);
   DomUtils.setValueNum("f0",                    fParms.f0);
   DomUtils.setValueNum("flutterLevel",          fParms.flutterLevel);
   DomUtils.setValueNum("openPhaseRatio",        fParms.openPhaseRatio);
   DomUtils.setValueNum("breathinessDb",         fParms.breathinessDb);
   DomUtils.setValueNum("tiltDb",                fParms.tiltDb);
   DomUtils.setValueNum("gainDb",                fParms.gainDb);
   DomUtils.setValueNum("nasalFormantFreq",      fParms.nasalFormantFreq);
   DomUtils.setValueNum("nasalFormantBw",        fParms.nasalFormantBw);
   for (let i = 0; i < KlattSyn.maxOralFormants; i++) {
      const f =  (i < fParms.oralFormantFreq.length) ? fParms.oralFormantFreq[i] : NaN;
      const bw = (i < fParms.oralFormantBw.length)   ? fParms.oralFormantBw[i]   : NaN;
      DomUtils.setValueNum("f" + (i + 1) + "Freq", f);
      DomUtils.setValueNum("f" + (i + 1) + "Bw", bw); }

   // Cascade branch:
   DomUtils.setChecked("cascadeEnabled",         fParms.cascadeEnabled);
   DomUtils.setValueNum("cascadeVoicingDb",      fParms.cascadeVoicingDb);
   DomUtils.setValueNum("cascadeAspirationDb",   fParms.cascadeAspirationDb);
   DomUtils.setValueNum("cascadeAspirationMod",  fParms.cascadeAspirationMod);
   DomUtils.setValueNum("nasalAntiformantFreq",  fParms.nasalAntiformantFreq);
   DomUtils.setValueNum("nasalAntiformantBw",    fParms.nasalAntiformantBw);

   // Parallel branch:
   DomUtils.setChecked("parallelEnabled",        fParms.parallelEnabled);
   DomUtils.setValueNum("parallelVoicingDb",     fParms.parallelVoicingDb);
   DomUtils.setValueNum("parallelAspirationDb",  fParms.parallelAspirationDb);
   DomUtils.setValueNum("parallelAspirationMod", fParms.parallelAspirationMod);
   DomUtils.setValueNum("fricationDb",           fParms.fricationDb);
   DomUtils.setValueNum("fricationMod",          fParms.fricationMod);
   DomUtils.setValueNum("parallelBypassDb",      fParms.parallelBypassDb);
   DomUtils.setValueNum("nasalFormantDb",        fParms.nasalFormantDb);
   for (let i = 0; i < KlattSyn.maxOralFormants; i++) {
      const db = (i < fParms.oralFormantDb.length) ? fParms.oralFormantDb[i] : NaN;
      DomUtils.setValueNum("f" + (i + 1) + "Db", db); }

   DomUtils.setValueNum("fadingDuration",        uiParms.fadingDuration); }

function getUiParms() : UiParms {
   const uiParms = <UiParms>{};

   // Main parameters:
   const mParms = <KlattSyn.MainParms>{};
   uiParms.mParms = mParms;
   mParms.sampleRate            = DomUtils.getValueNum("sampleRate");
   mParms.glottalSourceType     = decodeGlottalSourceType(DomUtils.getValue("glottalSourceType"));

   // Frame parameters:
   const fParms = <KlattSyn.FrameParms>{};
   uiParms.fParmsA = [fParms];                             // temporary solution for a single frame
   fParms.duration              = DomUtils.getValueNum("duration");
   fParms.f0                    = DomUtils.getValueNum("f0");
   fParms.flutterLevel          = DomUtils.getValueNum("flutterLevel");
   fParms.openPhaseRatio        = DomUtils.getValueNum("openPhaseRatio");
   fParms.breathinessDb         = DomUtils.getValueNum("breathinessDb");
   fParms.tiltDb                = DomUtils.getValueNum("tiltDb");
   fParms.gainDb                = DomUtils.getValueNum("gainDb");
   fParms.nasalFormantFreq      = DomUtils.getValueNum("nasalFormantFreq");
   fParms.nasalFormantBw        = DomUtils.getValueNum("nasalFormantBw");
   fParms.oralFormantFreq       = Array(KlattSyn.maxOralFormants);
   fParms.oralFormantBw         = Array(KlattSyn.maxOralFormants);
   for (let i = 0; i < KlattSyn.maxOralFormants; i++) {
      fParms.oralFormantFreq[i] = DomUtils.getValueNum("f" + (i + 1) + "Freq");
      fParms.oralFormantBw[i]   = DomUtils.getValueNum("f" + (i + 1) + "Bw"); }

   // Cascade branch:
   fParms.cascadeEnabled        = DomUtils.getChecked("cascadeEnabled");
   fParms.cascadeVoicingDb      = DomUtils.getValueNum("cascadeVoicingDb");
   fParms.cascadeAspirationDb   = DomUtils.getValueNum("cascadeAspirationDb");
   fParms.cascadeAspirationMod  = DomUtils.getValueNum("cascadeAspirationMod");
   fParms.nasalAntiformantFreq  = DomUtils.getValueNum("nasalAntiformantFreq");
   fParms.nasalAntiformantBw    = DomUtils.getValueNum("nasalAntiformantBw");

   // Parallel branch:
   fParms.parallelEnabled       = DomUtils.getChecked("parallelEnabled");
   fParms.parallelVoicingDb     = DomUtils.getValueNum("parallelVoicingDb");
   fParms.parallelAspirationDb  = DomUtils.getValueNum("parallelAspirationDb");
   fParms.parallelAspirationMod = DomUtils.getValueNum("parallelAspirationMod");
   fParms.fricationDb           = DomUtils.getValueNum("fricationDb");
   fParms.fricationMod          = DomUtils.getValueNum("fricationMod");
   fParms.parallelBypassDb      = DomUtils.getValueNum("parallelBypassDb");
   fParms.nasalFormantDb        = DomUtils.getValueNum("nasalFormantDb");
   fParms.oralFormantDb         = Array(KlattSyn.maxOralFormants);
   for (let i = 0; i < KlattSyn.maxOralFormants; i++) {
      fParms.oralFormantDb[i]   = DomUtils.getValueNum("f" + (i + 1) + "Db"); }

   uiParms.fadingDuration       = DomUtils.getValueNum("fadingDuration");

   return uiParms; }

//--- URL parameters -----------------------------------------------------------

function setUrlResonator (usp: URLSearchParams, parmName: string, freq: number, bw: number, db: number) {
   if (!freq || isNaN(freq) || !bw || isNaN(bw)) {
      return; }
   let s = freq + "/" + bw;
   if (!isNaN(db)) {
      s += "/" + db; }
   usp.set(parmName, s); }

// Returnd `undefined` on error.
function decodeResonatorSpec (s: string) {
   const a = s.split("/");
   if (a.length > 3) {
      return; }
   const freq = Number(a[0]);
   if (!isFinite(freq)) {
      return; }
   let bw: number;
   if (a.length >= 2) {
      bw = Number(a[1]);
      if (!isFinite(bw)) {
         return; }}
    else {
      bw = NaN; }
   let db: number;
   if (a.length >= 3) {
      db = Number(a[2]);
      if (!isFinite(db)) {
         return; }}
    else {
      db = NaN; }
   return {freq, bw, db}; }

function getUrlResonator (usp: URLSearchParams, parmName: string) : {freq: number; bw: number; db: number} {
   const s = usp.get(parmName);
   if (!s) {
      return {freq: NaN, bw: NaN, db: NaN}; }
   const r = decodeResonatorSpec(s);
   if (!r) {
      throw new Error(`Invalid resonator specification "${s}" for URL parameter "${parmName}".`); }
   return r; }

function decodeGlottalSourceType (s: string) : KlattSyn.GlottalSourceType {
   const i = KlattSyn.glottalSourceTypeEnumNames.indexOf(s);
   if (i < 0) {
      throw new Error(`Unknown glottal source type "${s}".`); }
   return i; }

function encodeUrlParms (uiParms: UiParms) : string {
   const usp = new URLSearchParams();

   // Main parameters:
   const mParms = uiParms.mParms;
   const mParms2 = defaultMainParms;                       // default values
   UrlUtils.setNum(usp, "sampleRate", mParms.sampleRate, mParms2.sampleRate);
   if (mParms.glottalSourceType != mParms2.glottalSourceType) {
      usp.set("glottalSourceType", KlattSyn.glottalSourceTypeEnumNames[mParms.glottalSourceType]); }

   // Frame parameters:
   const fParms = uiParms.fParmsA[0];                      // temporary solution for a single frame
   const fParms2 = defaultFrameParms;                      // default values
   UrlUtils.setNum(usp, "duration",        fParms.duration,       fParms2.duration);
   UrlUtils.setNum(usp, "f0",              fParms.f0);
   UrlUtils.setNum(usp, "flutterLevel",    fParms.flutterLevel,   fParms2.flutterLevel);
   UrlUtils.setNum(usp, "openPhaseRatio",  fParms.openPhaseRatio, fParms2.openPhaseRatio);
   UrlUtils.setNum(usp, "breathinessDb",   fParms.breathinessDb,  fParms2.breathinessDb);
   UrlUtils.setNum(usp, "tiltDb",          fParms.tiltDb,         fParms2.tiltDb);
   UrlUtils.setNum(usp, "gainDb",          fParms.gainDb,         fParms2.gainDb);

   // Resonators:
   setUrlResonator(usp, "nasalFormant",         fParms.nasalFormantFreq,     fParms.nasalFormantBw,     fParms.nasalFormantDb);
   setUrlResonator(usp, "nasalAntiformantFreq", fParms.nasalAntiformantFreq, fParms.nasalAntiformantBw, NaN);
   for (let i = 0; i < KlattSyn.maxOralFormants; i++) {
      const f =  (i < fParms.oralFormantFreq.length) ? fParms.oralFormantFreq[i] : NaN;
      const bw = (i < fParms.oralFormantBw.length)   ? fParms.oralFormantBw[i]   : NaN;
      const db = (i < fParms.oralFormantDb.length)   ? fParms.oralFormantDb[i]   : NaN;
      setUrlResonator(usp, "f" + (i + 1), f, bw, db); }

   // Cascade branch:
   UrlUtils.setBoolean(usp, "cascadeEnabled",        fParms.cascadeEnabled,        fParms2.cascadeEnabled);
   UrlUtils.setNum(    usp, "cascadeVoicingDb",      fParms.cascadeVoicingDb,      fParms2.cascadeVoicingDb);
   UrlUtils.setNum(    usp, "cascadeAspirationDb",   fParms.cascadeAspirationDb,   fParms2.cascadeAspirationDb);
   UrlUtils.setNum(    usp, "cascadeAspirationMod",  fParms.cascadeAspirationMod,  fParms2.cascadeAspirationMod);

   // Parallel branch:
   UrlUtils.setBoolean(usp, "parallelEnabled",       fParms.parallelEnabled,       fParms2.parallelEnabled);
   UrlUtils.setNum(    usp, "parallelVoicingDb",     fParms.parallelVoicingDb,     fParms2.parallelVoicingDb);
   UrlUtils.setNum(    usp, "parallelAspirationDb",  fParms.parallelAspirationDb,  fParms2.parallelAspirationDb);
   UrlUtils.setNum(    usp, "parallelAspirationMod", fParms.parallelAspirationMod, fParms2.parallelAspirationMod);
   UrlUtils.setNum(    usp, "fricationDb",           fParms.fricationDb,           fParms2.fricationDb);
   UrlUtils.setNum(    usp, "fricationMod",          fParms.fricationMod,          fParms2.fricationMod);
   UrlUtils.setNum(    usp, "parallelBypassDb",      fParms.parallelBypassDb,      fParms2.parallelBypassDb);

   const uiParms2 = defaultUiParms;
   UrlUtils.setNum(usp, "fadingDuration", uiParms.fadingDuration, uiParms2.fadingDuration);

   let s = usp.toString();
   s = s.replace(/%2F/g, "/");                             // we don't need to and don't want to encode "/"
   return s; }

function decodeUrlParms (urlParmsString: string) : UiParms {
   if (!urlParmsString) {
      return defaultUiParms; }
   const usp = new URLSearchParams(urlParmsString);
   const uiParms = <UiParms>{};

   // Main parameters:
   const mParms = <KlattSyn.MainParms>{};
   const mParms2 = defaultMainParms;                       // default values
   uiParms.mParms = mParms;
   mParms.sampleRate            = UrlUtils.getNum(usp, "sampleRate", mParms2.sampleRate);
   mParms.glottalSourceType     = decodeGlottalSourceType(UrlUtils.get(usp, "glottalSourceType", "impulsive"));

   // Frame parameters:
   const fParms = <KlattSyn.FrameParms>{};
   const fParms2 = defaultFrameParms;                      // default values
   uiParms.fParmsA = [fParms];                             // temporary solution for a single frame
   fParms.duration              = UrlUtils.getNum(usp, "duration",       fParms2.duration);
   fParms.f0                    = UrlUtils.getNum(usp, "f0",             220);
   fParms.flutterLevel          = UrlUtils.getNum(usp, "flutterLevel",   fParms2.flutterLevel);
   fParms.openPhaseRatio        = UrlUtils.getNum(usp, "openPhaseRatio", fParms2.openPhaseRatio);
   fParms.breathinessDb         = UrlUtils.getNum(usp, "breathinessDb",  fParms2.breathinessDb);
   fParms.tiltDb                = UrlUtils.getNum(usp, "tiltDb",         fParms2.tiltDb);
   fParms.gainDb                = UrlUtils.getNum(usp, "gainDb",         fParms2.gainDb);

   // Resonators:
   const nasalFormatRes         = getUrlResonator(usp,"nasalFormant");
   fParms.nasalFormantFreq      = nasalFormatRes.freq;
   fParms.nasalFormantBw        = nasalFormatRes.bw;
   fParms.nasalFormantDb        = nasalFormatRes.db;
   const nasalAntiformantRes    = getUrlResonator(usp, "nasalAntiformant");
   fParms.nasalAntiformantFreq  = nasalAntiformantRes.freq;
   fParms.nasalAntiformantBw    = nasalAntiformantRes.bw;
   fParms.oralFormantFreq       = Array(KlattSyn.maxOralFormants);
   fParms.oralFormantBw         = Array(KlattSyn.maxOralFormants);
   fParms.oralFormantDb         = Array(KlattSyn.maxOralFormants);
   for (let i = 0; i < KlattSyn.maxOralFormants; i++) {
      const r                   = getUrlResonator(usp, "f" + (i + 1));
      fParms.oralFormantFreq[i] = r.freq;
      fParms.oralFormantBw[i]   = r.bw;
      fParms.oralFormantDb[i]   = r.db; }

   // Cascade branch:
   fParms.cascadeEnabled        = UrlUtils.getBoolean(usp, "cascadeEnabled",    fParms2.cascadeEnabled);
   fParms.cascadeVoicingDb      = UrlUtils.getNum(usp, "cascadeVoicingDb",      fParms2.cascadeVoicingDb);
   fParms.cascadeAspirationDb   = UrlUtils.getNum(usp, "cascadeAspirationDb",   fParms2.cascadeAspirationDb);
   fParms.cascadeAspirationMod  = UrlUtils.getNum(usp, "cascadeAspirationMod",  fParms2.cascadeAspirationMod);

   // Parallel branch:
   fParms.parallelEnabled       = UrlUtils.getBoolean(usp, "parallelEnabled",   fParms2.parallelEnabled);
   fParms.parallelVoicingDb     = UrlUtils.getNum(usp, "parallelVoicingDb",     fParms2.parallelVoicingDb);
   fParms.parallelAspirationDb  = UrlUtils.getNum(usp, "parallelAspirationDb",  fParms2.parallelAspirationDb);
   fParms.parallelAspirationMod = UrlUtils.getNum(usp, "parallelAspirationMod", fParms2.parallelAspirationMod);
   fParms.fricationDb           = UrlUtils.getNum(usp, "fricationDb",           fParms2.fricationDb);
   fParms.fricationMod          = UrlUtils.getNum(usp, "fricationMod",          fParms2.fricationMod);
   fParms.parallelBypassDb      = UrlUtils.getNum(usp, "parallelBypassDb",      fParms2.parallelBypassDb);

   const uiParms2 = defaultUiParms;
   uiParms.fadingDuration       = UrlUtils.getNum(usp, "fadingDuration", uiParms2.fadingDuration);

   return uiParms; }

function refreshUrl (commit = false) {
   const uiParms = getUiParms();
   const urlParmsString = encodeUrlParms(uiParms);
   if (urlParmsString == window.location.hash.substring(1)) {
      if (commit) {
         urlDirty = false; }
      return; }
   if (urlDirty) {
      window.history.replaceState(null, "", "#" + urlParmsString); }
    else {
      window.history.pushState(null, "", "#" + urlParmsString); }
   urlDirty = !commit; }

function restoreAppState (urlParmsString: string) {
   audioPlayer.stop();
   const uiParms = decodeUrlParms(urlParmsString);
   setUiParms(uiParms);
   resetSignal();
   refreshButtons(); }

function restoreAppStateFromUrl() {
   const urlParmsString = window.location.hash.substring(1);
   restoreAppState(urlParmsString); }

function restoreAppStateFromUrl_withErrorHandling() {
   try {
      restoreAppStateFromUrl(); }
    catch (e) {
      alert("Unable to restore application state from URL. " + e);
      console.log(e);
      resetApplicationState(); }}

//--- Main ---------------------------------------------------------------------

function refreshButtons() {
   playButtonElement.textContent = audioPlayer.isPlaying() ? "Stop" : "Play"; }

function resetApplicationState() {
   audioPlayer.stop();
   setUiParms(defaultUiParms);
   resetSignal();
   refreshButtons();
   refreshUrl(); }

function inputParms_change() {
   audioPlayer.stop();
   signalSamples = undefined;
   refreshButtons(); }

async function synthesizeButton_click() {
   audioPlayer.stop();
   synthesize();
   refreshButtons();
   refreshUrl(true); }

async function playButton_click() {
   if (audioPlayer.isPlaying()) {
      audioPlayer.stop();
      return; }
   if (!signalSamples) {
      synthesize(); }
   refreshUrl(true);
   await audioPlayer.playSamples(signalSamples!, signalSampleRate); }

function wavFileButton_click() {
   audioPlayer.stop();
   if (!signalSamples) {
      synthesize(); }
   refreshUrl(true);
   const buffer = Utils.createAudioBufferFromSamples(signalSamples!, signalSampleRate, audioContext);
   const wavFileData = WavFileEncoder.encodeWavFile(buffer, WavFileEncoder.WavFileType.float32);
   const blob = new Blob([wavFileData], {type: "audio/wav"});
   Utils.openSaveAsDialog(blob, "klattSyn.wav"); }

function resetButton_click() {
   restoreAppState("dummy=1"); }

function startup2() {
   audioContext = new ((<any>window).AudioContext || (<any>window).webkitAudioContext)();
   audioPlayer = new InternalAudioPlayer(audioContext);
   audioPlayer.addEventListener("stateChange", refreshButtons);
   document.getElementById("inputParms")!.addEventListener("change", inputParms_change);
   signalViewerCanvas = <HTMLCanvasElement>document.getElementById("signalViewer")!;
   synthesizeButtonElement = <HTMLButtonElement>document.getElementById("synthesizeButton")!;
   synthesizeButtonElement.addEventListener("click", () => Utils.catchError(synthesizeButton_click));
   playButtonElement = <HTMLButtonElement>document.getElementById("playButton")!;
   playButtonElement.addEventListener("click", () => Utils.catchError(playButton_click));
   wavFileButtonElement = <HTMLButtonElement>document.getElementById("wavFileButton")!;
   wavFileButtonElement.addEventListener("click", () => Utils.catchError(wavFileButton_click));
   resetButtonElement = <HTMLButtonElement>document.getElementById("resetButton")!;
   resetButtonElement.addEventListener("click", () => Utils.catchError(resetButton_click));
   window.onpopstate = () => Utils.catchError(restoreAppStateFromUrl_withErrorHandling);
   restoreAppStateFromUrl_withErrorHandling(); }

async function startup() {
   try {
      startup2(); }
    catch (e) {
      alert("Error: " + e); }}

document.addEventListener("DOMContentLoaded", startup);
