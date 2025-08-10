import * as Utils from "./Utils.ts";
import * as AudioUtils from "./AudioUtils.ts";
import * as DomUtils from "./DomUtils.ts";
import * as AppParmsMod from "./AppParmsMod.ts";
import {AppParms} from "./AppParmsMod.ts";
import InternalAudioPlayer from "./InternalAudioPlayer.ts";
import * as ApiModeMod from "./ApiModeMod.ts";
import * as KlattSyn from "klatt-syn";
import * as FunctionCurveViewer from "function-curve-viewer";
import * as WavFileEncoder from "wav-file-encoder";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";
import * as PolyReal from "dsp-collection/math/PolyReal";
import MutableComplex from "dsp-collection/math/MutableComplex";
import * as DspUtils from "dsp-collection/utils/DspUtils";

var audioPlayer:                       InternalAudioPlayer;
var urlDirty:                          boolean = false;

// GUI components:
var synthesizeButtonElement:           HTMLButtonElement;
var playButtonElement:                 HTMLButtonElement;
var wavFileButtonElement:              HTMLButtonElement;
var resetButtonElement:                HTMLButtonElement;
var signalViewerCanvas:                HTMLCanvasElement;
var signalViewerWidget:                FunctionCurveViewer.Widget | undefined;
var spectrumViewerCanvas:              HTMLCanvasElement;
var spectrumViewerWidget:              FunctionCurveViewer.Widget | undefined;

// Current synthesized signal:
var signalSamples:                     Float64Array | undefined;
var signalSampleRate:                  number;
var signalSpectrum:                    Float64Array | undefined;     // logarithmic amplitude spectrum
var vocalTractSpectrumFunction:        (f: number) => number;

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

function removeSpectrumViewer() {
   if (!spectrumViewerWidget) {
      return; }
   spectrumViewerWidget.setConnected(false);
   spectrumViewerWidget = undefined;
   clearCanvas(spectrumViewerCanvas); }

function setSignalViewer() {
   removeSignalViewer();
   signalViewerWidget = new FunctionCurveViewer.Widget(signalViewerCanvas);
   const viewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(signalSamples!, signalSampleRate);
   const viewerState: Partial<FunctionCurveViewer.ViewerState> = {
      viewerFunction:  viewerFunction,
      xMin:            0,
      xMax:            signalSamples!.length / signalSampleRate,
      yMin:            -1,
      yMax:            1,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "s",
      focusShield:     true };
   signalViewerWidget.setViewerState(viewerState); }

function setSpectrumViewer() {
   removeSpectrumViewer();
   spectrumViewerWidget = new FunctionCurveViewer.Widget(spectrumViewerCanvas);
   const signalSpectrumViewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(signalSpectrum!, signalSamples!.length / signalSampleRate, 0, true);
   const viewerFunction = (x: number, sampleWidth: number, channel: number) => {
      switch (channel) {
         case 0:  return signalSpectrumViewerFunction(x, sampleWidth, 0);
         case 1:  return vocalTractSpectrumFunction(x);
         default: throw new Error(); }};
   const viewerState: Partial<FunctionCurveViewer.ViewerState> = {
      viewerFunction:  viewerFunction,
      channels:        2,
      xMin:            0,
      xMax:            5500,
      yMin:            -100,
      yMax:            0,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "Hz",
      yAxisUnit:       "dB",
      focusShield:     true };
   spectrumViewerWidget.setViewerState(viewerState); }

function createVocalTractSpectrumFunction (appParms: AppParms) : (f: number) => number {
   const fParms = appParms.fParmsA[0];
   const trans = KlattSyn.getVocalTractTransferFunctionCoefficients(appParms.mParms, fParms);
   const fScaling = 2 * Math.PI / appParms.mParms.sampleRate;
   const z = new MutableComplex();
   const absVocalTractSpectrumFunction = (f: number) => {
      const w = f * fScaling;
      if (w < 0 || w >= Math.PI) {
         return NaN; }
      z.setExpj(w);
      const r = PolyReal.evaluateFractionComplex(trans, z);
      const a = r.abs();
      const db = DspUtils.convertAmplitudeToDb(a);
      return db; };
   const maxDb = Utils.findMaxFunctionValue(absVocalTractSpectrumFunction, [0, ...fParms.oralFormantFreq]);
   return (f: number) => absVocalTractSpectrumFunction(f) - maxDb - 5; }

function synthesizeSignal (appParms: AppParms) {           // (this function is also used in API mode)
   signalSamples = KlattSyn.generateSound(appParms.mParms, appParms.fParmsA);
   signalSampleRate = appParms.mParms.sampleRate;
   signalSpectrum = Utils.genSpectrum(signalSamples, appParms.windowFunctionId);
   AudioUtils.fadeAudioSignalInPlace(signalSamples, appParms.fadingDuration * signalSampleRate); }

function synthesize() {
   resetSignal();
   const appParms = getUiParms();
   synthesizeSignal(appParms);
   vocalTractSpectrumFunction = createVocalTractSpectrumFunction(appParms);
   setSignalViewer();
   setSpectrumViewer(); }

function resetSignal() {
   removeSignalViewer();
   removeSpectrumViewer();
   signalSamples = undefined;
   signalSpectrum = undefined; }

//--- UI parameters ------------------------------------------------------------

function setUiParms (appParms: AppParms) {

   // Main parameters:
   const mParms = appParms.mParms;
   DomUtils.setValueNum("sampleRate",            mParms.sampleRate);
   DomUtils.setValue("glottalSourceType",        KlattSyn.glottalSourceTypeEnumNames[mParms.glottalSourceType]);

   // Frame parameters:
   const fParms = appParms.fParmsA[0];                     // temporary solution for a single frame
   DomUtils.setValueNum("duration",              fParms.duration);
   DomUtils.setValueNum("f0",                    fParms.f0);
   DomUtils.setValueNum("flutterLevel",          fParms.flutterLevel);
   DomUtils.setValueNum("openPhaseRatio",        fParms.openPhaseRatio);
   DomUtils.setValueNum("breathinessDb",         fParms.breathinessDb);
   DomUtils.setValueNum("tiltDb",                fParms.tiltDb);
   DomUtils.setValueNum("gainDb",                fParms.gainDb);
   DomUtils.setValueNum("agcRmsLevel",           fParms.agcRmsLevel);
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

   DomUtils.setValueNum("fadingDuration",        appParms.fadingDuration);
   DomUtils.setValue("windowFunction",           appParms.windowFunctionId);
   DomUtils.setValue("reference",                appParms.reference ?? ""); }

function getUiParms() : AppParms {
   const appParms = <AppParms>{};

   // Main parameters:
   const mParms = <KlattSyn.MainParms>{};
   appParms.mParms = mParms;
   mParms.sampleRate            = DomUtils.getValueNum("sampleRate");
   mParms.glottalSourceType     = AppParmsMod.decodeGlottalSourceType(DomUtils.getValue("glottalSourceType"));

   // Frame parameters:
   const fParms = <KlattSyn.FrameParms>{};
   appParms.fParmsA = [fParms];                            // temporary solution for a single frame
   fParms.duration              = DomUtils.getValueNum("duration");
   fParms.f0                    = DomUtils.getValueNum("f0");
   fParms.flutterLevel          = DomUtils.getValueNum("flutterLevel");
   fParms.openPhaseRatio        = DomUtils.getValueNum("openPhaseRatio");
   fParms.breathinessDb         = DomUtils.getValueNum("breathinessDb");
   fParms.tiltDb                = DomUtils.getValueNum("tiltDb");
   fParms.gainDb                = DomUtils.getValueNum("gainDb");
   fParms.agcRmsLevel           = DomUtils.getValueNum("agcRmsLevel");
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

   appParms.fadingDuration      = DomUtils.getValueNum("fadingDuration");
   appParms.windowFunctionId    = DomUtils.getValue("windowFunction");
   appParms.reference           = DomUtils.getValue("reference");

   return appParms; }

//--- URL parameters -----------------------------------------------------------

function recodeUrlParms_ignoreErr (urlParmsString: string) : string {
   try {
      return AppParmsMod.encodeUrlParms(AppParmsMod.decodeUrlParms(urlParmsString)); }
     catch (_e) {
       return ""; }}

function refreshUrl (commit = false) {
   const appParms = getUiParms();
   const urlParmsString = AppParmsMod.encodeUrlParms(appParms);
   if (urlParmsString == recodeUrlParms_ignoreErr(window.location.hash.substring(1))) {
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
   const appParms = AppParmsMod.decodeUrlParms(urlParmsString);
   setUiParms(appParms);
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
   setUiParms(AppParmsMod.defaultAppParms);
   resetSignal();
   refreshButtons();
   refreshUrl(); }

function inputParms_change() {
   audioPlayer.stop();
   signalSamples = undefined;
   refreshButtons(); }

function synthesizeButton_click() {
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
   const wavFileData = WavFileEncoder.encodeWavFile2([signalSamples!], signalSampleRate, WavFileEncoder.WavFileType.float32);
   const reference = DomUtils.getValue("reference");
   const fileName = "klattSyn" + (reference ? "-" + reference : "") + ".wav";
   Utils.openSaveAsDialog(wavFileData, fileName, "audio/wav", "wav", "WAV audio file"); }

function resetButton_click() {
   restoreAppState("dummy=1"); }

function initGuiMode() {
   audioPlayer = new InternalAudioPlayer();
   audioPlayer.addEventListener("stateChange", refreshButtons);
   const windowFunctionSelectElement = <HTMLSelectElement>document.getElementById("windowFunction")!;
   for (const d of WindowFunctions.windowFunctionIndex) {
      windowFunctionSelectElement.add(new Option(d.name, d.id)); }
   document.getElementById("inputParms")!.addEventListener("change", inputParms_change);
   signalViewerCanvas = <HTMLCanvasElement>document.getElementById("signalViewer")!;
   spectrumViewerCanvas = <HTMLCanvasElement>document.getElementById("spectrumViewer")!;
   synthesizeButtonElement = <HTMLButtonElement>document.getElementById("synthesizeButton")!;
   synthesizeButtonElement.addEventListener("click", () => Utils.catchError(synthesizeButton_click));
   playButtonElement = <HTMLButtonElement>document.getElementById("playButton")!;
   playButtonElement.addEventListener("click", () => Utils.catchError(playButton_click));
   wavFileButtonElement = <HTMLButtonElement>document.getElementById("wavFileButton")!;
   wavFileButtonElement.addEventListener("click", () => Utils.catchError(wavFileButton_click));
   resetButtonElement = <HTMLButtonElement>document.getElementById("resetButton")!;
   resetButtonElement.addEventListener("click", () => Utils.catchError(resetButton_click));
   window.onpopstate = () => Utils.catchError(restoreAppStateFromUrl_withErrorHandling);
   restoreAppStateFromUrl_withErrorHandling();
   synthesize(); }

function init() {
   const apiMode = !document.body.classList.contains("klattSynApp");  // API-only mode without GUI
   if (apiMode) {
      ApiModeMod.init(); }
    else {
      initGuiMode(); }}

function startup() {
   try {
      init(); }
    catch (e) {
      console.log(e);
      alert("Error: " + e); }}

document.addEventListener("DOMContentLoaded", startup);
