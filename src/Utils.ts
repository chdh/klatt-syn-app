import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";
import * as Fft from "dsp-collection/signal/Fft";
import * as DspUtils from "dsp-collection/utils/DspUtils";
import ComplexArray from "dsp-collection/math/ComplexArray";

const dummyResolvedPromise = Promise.resolve();

export function nextTick (callback: () => void) {
   void dummyResolvedPromise.then(callback); }

export function openSaveAsDialog (data: ArrayBuffer, fileName: string, mimeType: string, fileNameExtension: string, fileTypeDescription: string) {
   if ((<any>window).showSaveFilePicker) {
      catchError(openSaveAsDialog_new, data, fileName, mimeType, fileNameExtension, fileTypeDescription); }
    else {
      openSaveAsDialog_old(data, fileName, mimeType); }}

async function openSaveAsDialog_new (data: ArrayBuffer, fileName: string, mimeType: string, fileNameExtension: string, fileTypeDescription: string) {
   const fileTypeDef: any = {};
   fileTypeDef[mimeType] = ["." + fileNameExtension];
   const pickerOpts = {
      suggestedName: fileName,
      types: [{
         description: fileTypeDescription,
         accept: fileTypeDef }]};
   let fileHandle: FileSystemFileHandle;
   try {
      fileHandle = await (<any>window).showSaveFilePicker(pickerOpts); }
    catch (e) {
      if (e.name == "AbortError") {
         return; }
      throw e; }
   const stream /* : FileSystemWritableFileStream */ = await (<any>fileHandle).createWritable();
   await stream.write(data);
   await stream.close(); }

function openSaveAsDialog_old (data: ArrayBuffer, fileName: string, mimeType: string) {
   const blob = new Blob([data], {type: mimeType});
   const url = URL.createObjectURL(blob);
   const element = document.createElement("a");
   element.href = url;
   element.download = fileName;
   const clickEvent = new MouseEvent("click");
   element.dispatchEvent(clickEvent);
   setTimeout(() => URL.revokeObjectURL(url), 60000);
   (<any>document).dummySaveAsElementHolder = element; }   // to prevent garbage collection

export function catchError (f: Function, ...args: any[]) {
   void catchErrorAsync(f, ...args); }

async function catchErrorAsync (f: Function, ...args: any[]) {
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

export function genSpectrum (samples: Float64Array, windowFunctionId: string) : Float64Array {
   const evenSamples = samples.subarray(0, 2 * Math.floor(samples.length / 2)); // make event length to enable optimization
   const windowedSamples = WindowFunctions.applyWindowById(evenSamples, windowFunctionId);
   const complexSpectrum = Fft.fftRealSpectrum(windowedSamples);
   const logSpectrum = genLogSpectrum(complexSpectrum);
   return logSpectrum; }

function genLogSpectrum (complexSpectrum: ComplexArray) : Float64Array {
   const n = complexSpectrum.length;
   const a = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a[i] = DspUtils.convertAmplitudeToDb(complexSpectrum.getAbs(i)); }
   return a; }

export function findMaxFunctionValue (f: (x: number) => number, xVals: number[]) : number {
   let max = -Infinity;
   for (const x of xVals) {
      if (!isNaN(x)) {
         max = Math.max(max, f(x)); }}
   return max; }
