import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";

const offlineAudioContext = new OfflineAudioContext(1, 1, 44100);

export function createAudioBufferFromSamples (samples: Float64Array, sampleRate: number) : AudioBuffer {
   const buffer = offlineAudioContext.createBuffer(1, samples.length, sampleRate);
   const data = buffer.getChannelData(0);
   for (let i = 0; i < samples.length; i++) {
      data[i] = samples[i]; }
   return buffer; }

export function fadeAudioSignalInPlace (samples: Float64Array, fadeMargin: number) {
   const windowFunction = WindowFunctions.hannWindow;
   const d = Math.min(samples.length, 2 * fadeMargin);
   for (let i = 0; i < d / 2; i++) {
      const w = windowFunction(i / d);
      samples[i] *= w;
      samples[samples.length - 1 - i] *= w; }}
