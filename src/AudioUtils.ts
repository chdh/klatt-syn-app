const offlineAudioContext = new OfflineAudioContext(1, 1, 44100);

export function createAudioBufferFromSamples (samples: Float64Array, sampleRate: number) : AudioBuffer {
   const buffer = offlineAudioContext.createBuffer(1, samples.length, sampleRate);
   const data = buffer.getChannelData(0);
   for (let i = 0; i < samples.length; i++) {
      data[i] = samples[i]; }
   return buffer; }
