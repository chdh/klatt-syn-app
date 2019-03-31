import * as Utils from "./Utils";
import EventTargetPolyfill from "./EventTargetPolyfill";

export default class InternalAudioPlayer {

   private audioContext:          AudioContext;
   private activeAudioSourceNode: AudioBufferSourceNode | undefined;   // (TODO: change to AudioScheduledSourceNode when defined in TypeScript)
   private eventTarget:           EventTarget;

   public constructor (audioContext: AudioContext) {
      this.audioContext = audioContext;
      this.eventTarget = new EventTargetPolyfill(); }

   public addEventListener (type: string, listener: EventListener) {
      this.eventTarget.addEventListener(type, listener); }

   public async playAudioBuffer (buffer: AudioBuffer) {
      this.disposeActiveAudioSource();
      await this.resumeAudioContext();
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.connect(this.audioContext.destination);
      sourceNode.addEventListener("ended", this.audioEndedEventHandler);
      sourceNode.start();
      this.activeAudioSourceNode = sourceNode;
      this.fireEvent("stateChange"); }

   public async playSamples (samples: Float64Array, sampleRate: number) {
      const buffer = Utils.createAudioBufferFromSamples(samples, sampleRate, this.audioContext);
      await this.playAudioBuffer(buffer); }

   public isPlaying() : boolean {
      return !!this.activeAudioSourceNode; }

   public stop() {
      this.disposeActiveAudioSource(); }

   private audioEndedEventHandler = () => {
      this.disposeActiveAudioSource(); }

   private disposeActiveAudioSource() {
      if (!this.activeAudioSourceNode) {
         return; }
      const sourceNode = this.activeAudioSourceNode;
      this.activeAudioSourceNode = undefined;
      sourceNode.stop();
      sourceNode.disconnect();
      sourceNode.removeEventListener("ended", this.audioEndedEventHandler);
      this.fireEvent("stateChange"); }

   private async resumeAudioContext() {
      if (this.audioContext.state == "suspended") {
         await this.audioContext.resume(); }}

   private fireEvent (type: string) {
      const event = new CustomEvent(type);
      this.eventTarget.dispatchEvent(event); }

   }
