import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";

export function openSaveAsDialog (blob: Blob, fileName: string) {
   const url = URL.createObjectURL(blob);
   const element = document.createElement("a");
   element.href = url;
   element.download = fileName;
   const clickEvent = new MouseEvent("click");
   element.dispatchEvent(clickEvent);
   setTimeout(() => URL.revokeObjectURL(url), 60000);
   (<any>document).dummySaveAsElementHolder = element; }   // to prevent garbage collection

export async function catchError (f: Function, ...args: any[]) {
   try {
      const r = f(...args);
      if (r instanceof Promise) {
         await r; }}
    catch (error) {
      console.log(error);
      alert("Error: " + error); }}

export function createAudioBufferFromSamples (samples: Float64Array, sampleRate: number, audioContext: AudioContext) : AudioBuffer {
   const buffer = audioContext.createBuffer(1, samples.length, sampleRate);
   const data = buffer.getChannelData(0);
   for (let i = 0; i < samples.length; i++) {
      data[i] = samples[i]; }
   return buffer; }

export function fadeAudioSignalInPlace (samples: Float64Array, fadeMargin: number, windowFunction: WindowFunctions.WindowFunction) {
   const d = Math.min(samples.length, 2 * fadeMargin);
   for (let i = 0; i < d / 2; i++) {
      const w = windowFunction(i / d);
      samples[i] *= w;
      samples[samples.length - 1 - i] *= w; }}

export function adjustSignalGain (samples: Float64Array, targetLevel = 0.9) {
   const n = samples.length;
   if (!n) {
      return; }
   let maxAbs = Math.abs(samples[0]);
   for (let i = 1; i < n; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > maxAbs) {
         maxAbs = abs; }}
   if (!maxAbs) {
      return; }
   const r = targetLevel / maxAbs;
   for (let i = 0; i < n; i++) {
      samples[i] *= r; }}
