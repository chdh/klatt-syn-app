import * as AppParmsMod from "./AppParmsMod";
import InternalAudioPlayer from "./InternalAudioPlayer";
import * as KlattSyn from "klatt-syn";

var delayedInitDone                    = false;
var pendingAudioStoppedCallback:       Function | undefined;
var audioPlayer:                       InternalAudioPlayer;

function fireAudioStoppedCallback() {
   if (!pendingAudioStoppedCallback) {
      return; }
   const temp = pendingAudioStoppedCallback;
   pendingAudioStoppedCallback = undefined;
   temp(); }

function audioPlayer_stateChange() {
   if (!audioPlayer.isPlaying()) {
      fireAudioStoppedCallback(); }}

function delayedInit() {
   if (delayedInitDone) {
      return; }
   const audioContext = new ((<any>window).AudioContext || (<any>window).webkitAudioContext)();
   audioPlayer = new InternalAudioPlayer(audioContext);
   audioPlayer.addEventListener("stateChange", audioPlayer_stateChange);
   delayedInitDone = true; }

function play (urlParmsString: string, audioStoppedCallback: Function) {
   delayedInit();
   audioPlayer.stop();
   fireAudioStoppedCallback();
   pendingAudioStoppedCallback = audioStoppedCallback;
   const appParms = AppParmsMod.decodeUrlParms(urlParmsString);
   const signalSamples = KlattSyn.generateSound(appParms.mParms, appParms.fParmsA);
   void audioPlayer.playSamples(signalSamples, appParms.mParms.sampleRate); }

function stop() {
   if (!delayedInitDone) {
      return; }
   audioPlayer.stop(); }

export function init() {
   (<any>window).klattSynAppApi = {play, stop}; }
