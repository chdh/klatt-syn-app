import * as UrlUtils from "./UrlUtils";
import * as KlattSyn from "klatt-syn";

export interface AppParms {
   mParms:                   KlattSyn.MainParms;
   fParmsA:                  KlattSyn.FrameParms[];
   fadingDuration:           number;
   windowFunctionId:         string;
   reference?:               string; }

//--- Defaults -----------------------------------------------------------------

const defaultMainParms: KlattSyn.MainParms = {
   sampleRate:               44100,
   glottalSourceType:        KlattSyn.GlottalSourceType.impulsive };

const defaultFrameParms = KlattSyn.demoFrameParms;

export const defaultAppParms: AppParms = {
   mParms:                   defaultMainParms,
   fParmsA:                  [defaultFrameParms],
   fadingDuration:           0.05,
   windowFunctionId:         "hann" };

//--- URL ----------------------------------------------------------------------

function setUrlResonator (usp: URLSearchParams, parmName: string, freq: number, bw: number, db: number) {
   if (!freq || isNaN(freq) || !bw || isNaN(bw)) {
      return; }
   let s = freq + "/" + bw;
   if (!isNaN(db)) {
      s += "/" + db; }
   usp.set(parmName, s); }

// Returns `undefined` on error.
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

export function decodeGlottalSourceType (s: string) : KlattSyn.GlottalSourceType {
   const i = KlattSyn.glottalSourceTypeEnumNames.indexOf(s);
   if (i < 0) {
      throw new Error(`Unknown glottal source type "${s}".`); }
   return i; }

export function encodeUrlParms (appParms: AppParms) : string {
   const usp = new URLSearchParams();

   // Main parameters:
   const mParms = appParms.mParms;
   const mParms2 = defaultMainParms;                       // default values
   UrlUtils.setNum(usp, "sampleRate", mParms.sampleRate, mParms2.sampleRate);
   if (mParms.glottalSourceType != mParms2.glottalSourceType) {
      usp.set("glottalSourceType", KlattSyn.glottalSourceTypeEnumNames[mParms.glottalSourceType]); }

   // Frame parameters:
   const fParms = appParms.fParmsA[0];                     // temporary solution for a single frame
   const fParms2 = defaultFrameParms;                      // default values
   UrlUtils.setNum(usp, "duration",        fParms.duration,       fParms2.duration);
   UrlUtils.setNum(usp, "f0",              fParms.f0);
   UrlUtils.setNum(usp, "flutterLevel",    fParms.flutterLevel,   fParms2.flutterLevel);
   UrlUtils.setNum(usp, "openPhaseRatio",  fParms.openPhaseRatio, fParms2.openPhaseRatio);
   UrlUtils.setNum(usp, "breathinessDb",   fParms.breathinessDb,  fParms2.breathinessDb);
   UrlUtils.setNum(usp, "tiltDb",          fParms.tiltDb,         fParms2.tiltDb);
   UrlUtils.setNum(usp, "gainDb",          fParms.gainDb);
   UrlUtils.setNum(usp, "agcRmsLevel",     fParms.agcRmsLevel,    fParms2.agcRmsLevel);

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

   const appParms2 = defaultAppParms;
   UrlUtils.setNum(usp, "fadingDuration", appParms.fadingDuration,   appParms2.fadingDuration);
   UrlUtils.set(   usp, "window",         appParms.windowFunctionId, appParms2.windowFunctionId);
   UrlUtils.set(   usp, "ref",            appParms.reference);

   let s = usp.toString();
   s = s.replace(/%2F/g, "/");                             // we don't need to and don't want to encode "/"
   return s; }

export function decodeUrlParms (urlParmsString: string) : AppParms {
   if (!urlParmsString) {
      return defaultAppParms; }
   const usp = new URLSearchParams(urlParmsString);
   const appParms = <AppParms>{};

   // Main parameters:
   const mParms = <KlattSyn.MainParms>{};
   const mParms2 = defaultMainParms;                       // default values
   appParms.mParms = mParms;
   mParms.sampleRate            = UrlUtils.getNum(usp, "sampleRate", mParms2.sampleRate);
   mParms.glottalSourceType     = decodeGlottalSourceType(UrlUtils.get(usp, "glottalSourceType", "impulsive"));

   // Frame parameters:
   const fParms = <KlattSyn.FrameParms>{};
   const fParms2 = defaultFrameParms;                      // default values
   appParms.fParmsA = [fParms];                            // temporary solution for a single frame
   fParms.duration              = UrlUtils.getNum(usp, "duration",       fParms2.duration);
   fParms.f0                    = UrlUtils.getNum(usp, "f0",             220);
   fParms.flutterLevel          = UrlUtils.getNum(usp, "flutterLevel",   fParms2.flutterLevel);
   fParms.openPhaseRatio        = UrlUtils.getNum(usp, "openPhaseRatio", fParms2.openPhaseRatio);
   fParms.breathinessDb         = UrlUtils.getNum(usp, "breathinessDb",  fParms2.breathinessDb);
   fParms.tiltDb                = UrlUtils.getNum(usp, "tiltDb",         fParms2.tiltDb);
   fParms.gainDb                = UrlUtils.getNum(usp, "gainDb");
   fParms.agcRmsLevel           = UrlUtils.getNum(usp, "agcRmsLevel",    fParms2.agcRmsLevel);

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

   const appParms2 = defaultAppParms;
   appParms.fadingDuration       = UrlUtils.getNum(usp, "fadingDuration", appParms2.fadingDuration);
   appParms.windowFunctionId     = UrlUtils.get(   usp, "window",         appParms2.windowFunctionId);
   appParms.reference            = UrlUtils.get(   usp, "ref");

   return appParms; }
