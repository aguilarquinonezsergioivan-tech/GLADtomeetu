import {
  MusicTrack,
  SongConfig,
  SynthParams,
  OscillatorType,
  TrackType,
  StepNote,
} from '../types/mediaStudio';

// Note frequency map
const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

export function noteToFreq(note: string): number {
  const match = note.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 440;
  const name = match[1];
  const oct = parseInt(match[2], 10);
  const semi = NOTE_SEMITONES[name] ?? 0;
  // A4 is octave 4, semi 9 => 440Hz
  const midi = (oct + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Procedural scales for algorithmic generation
export const MUSICAL_SCALES: Record<string, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  pentatonic_minor: [0, 3, 5, 7, 10],
  hirajoshi: [0, 2, 3, 7, 8], // Cyberpunk / Anime dark vibe
};

export class AudioSynthEngine {
  private ctx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private isPlaying = false;
  private currentStep = 0;
  private timerId: number | null = null;
  private stepCallbacks: ((step: number) => void)[] = [];
  private songConfig: SongConfig | null = null;

  constructor() {
    // Lazily initialized on first user interaction
  }

  public getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupMasterChain();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private setupMasterChain() {
    if (!this.ctx) return;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Optional delay send bus
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.setValueAtTime(0.28, this.ctx.currentTime);
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.delayNode);
    this.delayGain.connect(this.masterGain);

    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);
  }

  public getAnalyser(): AnalyserNode | null {
    if (!this.analyserNode && !this.ctx) {
      this.getAudioContext();
    }
    return this.analyserNode;
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array as unknown as Uint8Array<ArrayBuffer>);
    } else {
      array.fill(0);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteTimeDomainData(array as unknown as Uint8Array<ArrayBuffer>);
    } else {
      array.fill(128);
    }
  }

  public onStep(cb: (step: number) => void) {
    this.stepCallbacks.push(cb);
  }

  public setSong(song: SongConfig) {
    this.songConfig = song;
  }

  public startPlayback(song: SongConfig) {
    this.songConfig = song;
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;

    const stepDurationMs = (60 / song.bpm / 4) * 1000; // 16th note in ms

    const runLoop = () => {
      if (!this.isPlaying || !this.songConfig) return;
      this.playStep(this.currentStep, this.songConfig);
      this.stepCallbacks.forEach((cb) => cb(this.currentStep));
      this.currentStep = (this.currentStep + 1) % 16;
      this.timerId = window.setTimeout(runLoop, stepDurationMs);
    };

    runLoop();
  }

  public stopPlayback() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
    this.stepCallbacks.forEach((cb) => cb(-1));
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  // Plays a single 16th step across all unmuted tracks
  private playStep(stepIndex: number, song: SongConfig) {
    const ctx = this.getAudioContext();
    const hasSolo = song.tracks.some((t) => t.solo);

    song.tracks.forEach((track) => {
      if (track.muted) return;
      if (hasSolo && !track.solo) return;

      const note = track.steps[stepIndex % track.steps.length];
      if (note && note.active) {
        this.triggerTrackNote(track, note.pitch, note.velocity, ctx.currentTime);
      }
    });
  }

  // Synthesizes individual track sounds natively
  public triggerTrackNote(
    track: MusicTrack,
    pitch: string,
    velocity: number = 0.8,
    time?: number
  ) {
    const ctx = this.getAudioContext();
    const startTime = time ?? ctx.currentTime;
    const p = track.synthParams;

    if (track.type === 'drums_kick') {
      this.synthesizeKick(startTime, velocity * track.volume * p.volume);
    } else if (track.type === 'drums_snare') {
      this.synthesizeSnare(startTime, velocity * track.volume * p.volume);
    } else if (track.type === 'drums_hihat') {
      this.synthesizeHiHat(startTime, velocity * track.volume * p.volume);
    } else {
      this.synthesizeSynthNote(track, pitch, velocity, startTime);
    }
  }

  // 808-Style Analog Kick drum (Oscillator pitch drop + click)
  private synthesizeKick(time: number, gainLevel: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Frequency drop from 160Hz to 35Hz
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gain.gain.setValueAtTime(gainLevel * 1.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.38);
  }

  // Analog Snare (Noise burst + Body tone)
  private synthesizeSnare(time: number, gainLevel: number) {
    if (!this.ctx || !this.masterGain) return;

    // Body tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
    oscGain.gain.setValueAtTime(gainLevel * 0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.16);

    // Noise component
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.2);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(gainLevel * 0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.2);
  }

  // Analog Hi-Hat (Bandpassed metallic noise with crisp decay)
  private synthesizeHiHat(time: number, gainLevel: number) {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(9500, time);
    filter.Q.setValueAtTime(3.0, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainLevel * 0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(time);
    source.stop(time + 0.08);
  }

  // Melodic Synth Voice with ADSR envelope, filter, and distortion
  private synthesizeSynthNote(
    track: MusicTrack,
    pitch: string,
    velocity: number,
    time: number
  ) {
    if (!this.ctx || !this.masterGain) return;
    const p = track.synthParams;
    const freq = noteToFreq(pitch);

    const osc = this.ctx.createOscillator();
    osc.type = p.oscType;
    osc.frequency.setValueAtTime(freq, time);

    // Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(p.cutoff, time);
    filter.Q.setValueAtTime(p.resonance, time);

    // Gain (ADSR)
    const gainNode = this.ctx.createGain();
    const effectiveVol = velocity * track.volume * p.volume * 0.6;
    const attackEnd = time + Math.max(p.attack, 0.005);
    const decayEnd = attackEnd + Math.max(p.decay, 0.01);
    const noteDuration = 0.22; // default 16th note hold
    const releaseEnd = time + noteDuration + Math.max(p.release, 0.02);

    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.linearRampToValueAtTime(effectiveVol, attackEnd);
    gainNode.gain.exponentialRampToValueAtTime(
      Math.max(effectiveVol * p.sustain, 0.0001),
      decayEnd
    );
    gainNode.gain.setValueAtTime(Math.max(effectiveVol * p.sustain, 0.0001), time + noteDuration);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

    // Wire: Osc -> Filter -> Gain -> Master
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Connect to delay bus if delay feedback > 0.05
    if (this.delayNode && p.delayFeedback > 0.05) {
      const sendGain = this.ctx.createGain();
      sendGain.gain.setValueAtTime(p.delayFeedback * 0.5, time);
      gainNode.connect(sendGain);
      sendGain.connect(this.delayNode);
    }

    osc.start(time);
    osc.stop(releaseEnd + 0.05);
  }

  // Render whole song offline into a playable WAV Blob
  public async exportSongToWavBlob(song: SongConfig, loops = 2): Promise<Blob> {
    const sampleRate = 44100;
    const stepDuration = 60 / song.bpm / 4;
    const totalSteps = 16 * loops;
    const totalSeconds = totalSteps * stepDuration + 1.5; // tail

    const offlineCtx = new OfflineAudioContext(2, Math.floor(sampleRate * totalSeconds), sampleRate);
    const master = offlineCtx.createGain();
    master.gain.setValueAtTime(0.85, 0);
    master.connect(offlineCtx.destination);

    for (let step = 0; step < totalSteps; step++) {
      const stepTime = step * stepDuration;
      const step16 = step % 16;

      song.tracks.forEach((track) => {
        if (track.muted) return;
        const note = track.steps[step16];
        if (!note || !note.active) return;

        const p = track.synthParams;
        const vel = note.velocity * track.volume * p.volume;

        if (track.type === 'drums_kick') {
          const osc = offlineCtx.createOscillator();
          const g = offlineCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(160, stepTime);
          osc.frequency.exponentialRampToValueAtTime(38, stepTime + 0.12);
          g.gain.setValueAtTime(vel * 1.2, stepTime);
          g.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.35);
          osc.connect(g);
          g.connect(master);
          osc.start(stepTime);
          osc.stop(stepTime + 0.38);
        } else if (track.type === 'drums_snare') {
          const osc = offlineCtx.createOscillator();
          const og = offlineCtx.createGain();
          osc.frequency.setValueAtTime(180, stepTime);
          osc.frequency.exponentialRampToValueAtTime(80, stepTime + 0.1);
          og.gain.setValueAtTime(vel * 0.7, stepTime);
          og.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.15);
          osc.connect(og);
          og.connect(master);
          osc.start(stepTime);
          osc.stop(stepTime + 0.16);

          const noiseLen = Math.floor(sampleRate * 0.2);
          const nBuf = offlineCtx.createBuffer(1, noiseLen, sampleRate);
          const out = nBuf.getChannelData(0);
          for (let i = 0; i < noiseLen; i++) out[i] = Math.random() * 2 - 1;
          const nSrc = offlineCtx.createBufferSource();
          nSrc.buffer = nBuf;
          const f = offlineCtx.createBiquadFilter();
          f.type = 'highpass';
          f.frequency.setValueAtTime(1000, stepTime);
          const ng = offlineCtx.createGain();
          ng.gain.setValueAtTime(vel * 0.8, stepTime);
          ng.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.18);
          nSrc.connect(f);
          f.connect(ng);
          ng.connect(master);
          nSrc.start(stepTime);
          nSrc.stop(stepTime + 0.2);
        } else if (track.type === 'drums_hihat') {
          const noiseLen = Math.floor(sampleRate * 0.08);
          const nBuf = offlineCtx.createBuffer(1, noiseLen, sampleRate);
          const out = nBuf.getChannelData(0);
          for (let i = 0; i < noiseLen; i++) out[i] = Math.random() * 2 - 1;
          const src = offlineCtx.createBufferSource();
          src.buffer = nBuf;
          const f = offlineCtx.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.setValueAtTime(9500, stepTime);
          f.Q.setValueAtTime(3.0, stepTime);
          const g = offlineCtx.createGain();
          g.gain.setValueAtTime(vel * 0.6, stepTime);
          g.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.07);
          src.connect(f);
          f.connect(g);
          g.connect(master);
          src.start(stepTime);
          src.stop(stepTime + 0.08);
        } else {
          const osc = offlineCtx.createOscillator();
          osc.type = p.oscType;
          osc.frequency.setValueAtTime(noteToFreq(note.pitch), stepTime);

          const f = offlineCtx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.setValueAtTime(p.cutoff, stepTime);
          f.Q.setValueAtTime(p.resonance, stepTime);

          const g = offlineCtx.createGain();
          const eff = vel * 0.6;
          const aEnd = stepTime + Math.max(p.attack, 0.005);
          const dEnd = aEnd + Math.max(p.decay, 0.01);
          const rEnd = stepTime + 0.22 + Math.max(p.release, 0.02);

          g.gain.setValueAtTime(0.0001, stepTime);
          g.gain.linearRampToValueAtTime(eff, aEnd);
          g.gain.exponentialRampToValueAtTime(Math.max(eff * p.sustain, 0.0001), dEnd);
          g.gain.setValueAtTime(Math.max(eff * p.sustain, 0.0001), stepTime + 0.22);
          g.gain.exponentialRampToValueAtTime(0.0001, rEnd);

          osc.connect(f);
          f.connect(g);
          g.connect(master);

          osc.start(stepTime);
          osc.stop(rEnd + 0.05);
        }
      });
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWavBlob(renderedBuffer);
  }

  // Export song to Standard MIDI File Type 0/1 binary blob
  public exportSongToMidiBlob(song: SongConfig): Blob {
    // Generate valid MIDI file with Header chunk and Track chunks
    const ticksPerQuarter = 480;
    const mpqn = Math.round(60000000 / song.bpm); // Microseconds per quarter note

    // Helper: encode Variable Length Quantity
    const encodeVLQ = (value: number): number[] => {
      const bytes: number[] = [];
      let val = value;
      bytes.push(val & 0x7f);
      val >>= 7;
      while (val > 0) {
        bytes.unshift((val & 0x7f) | 0x80);
        val >>= 7;
      }
      return bytes;
    };

    const tracksBytes: number[][] = [];

    // Track 0: Tempo and Time Signature
    const tempoTrack: number[] = [
      0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x24, 0x08, // 4/4 time
      0x00, 0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff, // tempo
      0x00, 0xff, 0x2f, 0x00 // End of track
    ];
    tracksBytes.push(tempoTrack);

    // Note to MIDI note number helper
    const noteToMidiNumber = (n: string): number => {
      const match = n.match(/^([A-G][#b]?)(-?\d+)$/);
      if (!match) return 60;
      const semi = NOTE_SEMITONES[match[1]] ?? 0;
      const oct = parseInt(match[2], 10);
      return (oct + 1) * 12 + semi;
    };

    // Build tracks
    song.tracks.forEach((track, tIdx) => {
      const trackData: number[] = [];
      const channel = track.type.startsWith('drums') ? 9 : Math.min(tIdx, 15);

      // Track Name meta
      const nameBytes = Array.from(new TextEncoder().encode(track.name));
      trackData.push(0x00, 0xff, 0x03, nameBytes.length, ...nameBytes);

      let lastTick = 0;
      const ticksPerStep = ticksPerQuarter / 4; // 16th note

      track.steps.forEach((step, sIdx) => {
        if (!step.active) return;
        const startTick = sIdx * ticksPerStep;
        const midiNote = track.type.startsWith('drums')
          ? track.type === 'drums_kick'
            ? 36
            : track.type === 'drums_snare'
            ? 38
            : 42
          : noteToMidiNumber(step.pitch);

        const deltaOn = startTick - lastTick;
        trackData.push(...encodeVLQ(deltaOn));
        trackData.push(0x90 | channel, midiNote, Math.round(step.velocity * 120));

        const noteLen = Math.round(ticksPerStep * 0.9);
        trackData.push(...encodeVLQ(noteLen));
        trackData.push(0x80 | channel, midiNote, 0);

        lastTick = startTick + noteLen;
      });

      trackData.push(0x00, 0xff, 0x2f, 0x00); // End of Track
      tracksBytes.push(trackData);
    });

    // Write File: MThd + MTrk chunks
    const fileBytes: number[] = [
      // MThd
      0x4d, 0x54, 0x68, 0x64,
      0x00, 0x00, 0x00, 0x06,
      0x00, 0x01, // Format 1 (multi-track)
      (tracksBytes.length >> 8) & 0xff, tracksBytes.length & 0xff,
      (ticksPerQuarter >> 8) & 0xff, ticksPerQuarter & 0xff,
    ];

    tracksBytes.forEach((t) => {
      fileBytes.push(0x4d, 0x54, 0x72, 0x6b); // MTrk
      const len = t.length;
      fileBytes.push((len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff);
      fileBytes.push(...t);
    });

    return new Blob([new Uint8Array(fileBytes)], { type: 'audio/midi' });
  }
}

// Convert AudioBuffer to 16-bit PCM RIFF WAV format
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Interleave and write 16-bit PCM samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Algorithmic Euclidean Rhythm Generator (used in TidalCycles / Strudel / modular synths)
export function generateEuclideanSteps(hits: number, totalSteps = 16): boolean[] {
  const result: boolean[] = new Array(totalSteps).fill(false);
  if (hits <= 0) return result;
  if (hits >= totalSteps) return result.fill(true);

  for (let i = 0; i < hits; i++) {
    const idx = Math.floor((i * totalSteps) / hits);
    result[idx] = true;
  }
  return result;
}

// Generates cohesive procedural tracks based on musical theory
export function createAlgorithmicSong(
  genre: string,
  bpm: number,
  scaleKey: string,
  scaleMode: keyof typeof MUSICAL_SCALES = 'pentatonic_minor'
): SongConfig {
  const scale = MUSICAL_SCALES[scaleMode] || MUSICAL_SCALES.pentatonic_minor;
  const rootMidi = 60; // C4

  const makeNoteName = (midiDiff: number, octOffset = 0): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const total = 12 + midiDiff + octOffset * 12;
    const name = noteNames[total % 12];
    const oct = Math.floor(total / 12) + 2;
    return `${name}${oct}`;
  };

  // Drum patterns
  const kickSteps: StepNote[] = generateEuclideanSteps(4, 16).map((active) => ({
    active,
    pitch: 'C1',
    velocity: 0.9,
  }));

  const snareSteps: StepNote[] = new Array(16).fill(null).map((_, i) => ({
    active: i === 4 || i === 12, // 2 and 4 beat
    pitch: 'D1',
    velocity: 0.85,
  }));

  const hihatSteps: StepNote[] = generateEuclideanSteps(genre.includes('Trap') ? 12 : 8, 16).map(
    (active, i) => ({
      active,
      pitch: 'F#1',
      velocity: i % 2 === 0 ? 0.75 : 0.5,
    })
  );

  // Bassline
  const bassRhythm = generateEuclideanSteps(7, 16);
  const bassSteps: StepNote[] = bassRhythm.map((active, i) => {
    const scaleDegree = scale[i % scale.length];
    return {
      active,
      pitch: makeNoteName(scaleDegree, 0), // Lower octave bass
      velocity: 0.8,
    };
  });

  // Lead melody
  const leadRhythm = generateEuclideanSteps(6, 16);
  const leadSteps: StepNote[] = leadRhythm.map((active, i) => {
    const deg = scale[(i * 2 + 1) % scale.length];
    return {
      active,
      pitch: makeNoteName(deg, 2), // High octave lead
      velocity: 0.75,
    };
  });

  // Arp pattern
  const arpSteps: StepNote[] = new Array(16).fill(null).map((_, i) => {
    const active = i % 2 === 0 || i % 4 === 3;
    const deg = scale[(i + 2) % scale.length];
    return {
      active,
      pitch: makeNoteName(deg, 1),
      velocity: 0.65,
    };
  });

  const defaultSynthParams: SynthParams = {
    oscType: 'sawtooth',
    attack: 0.01,
    decay: 0.15,
    sustain: 0.5,
    release: 0.2,
    cutoff: 3500,
    resonance: 3.5,
    distortion: 0.1,
    delayTime: 0.25,
    delayFeedback: 0.25,
    volume: 0.8,
  };

  return {
    id: `song_${Date.now()}`,
    title: `${genre} Procedural Flow`,
    genre,
    bpm,
    scaleKey,
    scaleMode: scaleMode as SongConfig['scaleMode'],
    tracks: [
      {
        id: 'track_kick',
        name: 'Kick 808',
        type: 'drums_kick',
        color: '#f43f5e',
        muted: false,
        solo: false,
        volume: 0.95,
        steps: kickSteps,
        synthParams: { ...defaultSynthParams, oscType: 'sine', decay: 0.35, cutoff: 800 },
      },
      {
        id: 'track_snare',
        name: 'Snare Punch',
        type: 'drums_snare',
        color: '#fb923c',
        muted: false,
        solo: false,
        volume: 0.85,
        steps: snareSteps,
        synthParams: { ...defaultSynthParams, oscType: 'triangle', decay: 0.18, cutoff: 5000 },
      },
      {
        id: 'track_hihat',
        name: 'Hi-Hat Crisp',
        type: 'drums_hihat',
        color: '#facc15',
        muted: false,
        solo: false,
        volume: 0.7,
        steps: hihatSteps,
        synthParams: { ...defaultSynthParams, decay: 0.06, cutoff: 10000 },
      },
      {
        id: 'track_bass',
        name: 'Sub/Acid Bass',
        type: 'bass',
        color: '#06b6d4',
        muted: false,
        solo: false,
        volume: 0.85,
        steps: bassSteps,
        synthParams: {
          ...defaultSynthParams,
          oscType: 'sawtooth',
          cutoff: 1200,
          resonance: 6.0,
          decay: 0.22,
          sustain: 0.3,
        },
      },
      {
        id: 'track_lead',
        name: 'Cyber Lead',
        type: 'lead',
        color: '#a855f7',
        muted: false,
        solo: false,
        volume: 0.8,
        steps: leadSteps,
        synthParams: {
          ...defaultSynthParams,
          oscType: 'square',
          attack: 0.02,
          decay: 0.25,
          sustain: 0.6,
          cutoff: 4200,
          resonance: 4.0,
        },
      },
      {
        id: 'track_arp',
        name: 'Neon Arp',
        type: 'arp',
        color: '#10b981',
        muted: false,
        solo: false,
        volume: 0.75,
        steps: arpSteps,
        synthParams: {
          ...defaultSynthParams,
          oscType: 'triangle',
          attack: 0.005,
          decay: 0.12,
          sustain: 0.2,
          cutoff: 2800,
          delayFeedback: 0.4,
        },
      },
    ],
  };
}

export const globalAudioSynth = new AudioSynthEngine();
