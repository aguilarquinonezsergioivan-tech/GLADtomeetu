export type MediaStudioTab = 'images' | 'video' | 'music';

// 1. Image Generation Types (Git: Diffusers / ComfyUI / Flux / SDXL)
export interface ImagePromptConfig {
  prompt: string;
  negativePrompt: string;
  style:
    | 'photorealistic'
    | 'cyberpunk'
    | 'anime_manga'
    | 'concept_art'
    | '3d_render'
    | 'oil_painting'
    | 'retro_pixel';
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3';
  guidanceScale: number; // CFG 1.0 - 20.0
  steps: number; // 20 - 50
  seed: number;
  sampler: 'Euler a' | 'DPM++ 2M Karras' | 'DDIM' | 'UniPC';
  pipeline: 'flux1-dev' | 'sdxl-base-1.0' | 'sd-1.5' | 'comfyui-lora';
}

export interface GeneratedImageResult {
  id: string;
  imageUrl: string; // Base64 data URL or SVG data URL
  prompt: string;
  style: string;
  aspectRatio: string;
  seed: number;
  gitRepo: string;
  pythonScript: string;
  comfyUiWorkflowJson: string;
  timestamp: string;
}

// 2. Video Generation Types (Git: AnimateDiff / CogVideoX / Wan2.1 / Remotion)
export interface VideoPromptConfig {
  prompt: string;
  cameraMotion:
    | 'zoom_in'
    | 'zoom_out'
    | 'pan_horizontal'
    | 'orbit_360'
    | 'fpv_drone'
    | 'static_tripod';
  durationSeconds: number; // 5, 10, 15
  fps: 24 | 30 | 60;
  motionStrength: number; // 1 - 10
  resolution: '1080p_16:9' | 'vertical_9:16' | 'square_1:1';
  pipeline: 'cogvideox-5b' | 'animatediff-sd15' | 'wan2.1-t2v' | 'svd-xt';
  primaryColor: string;
  secondaryColor: string;
}

export interface GeneratedVideoResult {
  id: string;
  title: string;
  prompt: string;
  cameraMotion: string;
  durationSeconds: number;
  fps: number;
  gitRepo: string;
  pythonScript: string;
  ffmpegCommand: string;
  remotionScript: string;
  timestamp: string;
}

// 3. Music Generation Types (Git: Meta AudioCraft MusicGen / Transformers / WebAudio)
export interface MusicPromptConfig {
  prompt: string;
  genre:
    | 'synthwave'
    | 'cyberpunk'
    | 'lofi_hiphop'
    | 'cinematic_trailer'
    | 'chiptune_8bit'
    | 'trap_dark'
    | 'ambient_drone';
  bpm: number;
  durationSeconds: number;
  scaleMode: 'minor' | 'dorian' | 'phrygian' | 'pentatonic_minor' | 'hirajoshi';
  scaleKey: string;
  pipeline: 'facebook/audiocraft-musicgen-medium' | 'audiocraft-melody' | 'audiocraft-stereo-large';
}

export interface GeneratedMusicResult {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  bpm: number;
  scaleKey: string;
  scaleMode: string;
  gitRepo: string;
  pythonScript: string;
  instrumentsUsed: string[];
  explanation: string;
  timestamp: string;
}

export interface GitPipelineReference {
  id: string;
  name: string;
  repo: string;
  category: 'images' | 'video' | 'music';
  description: string;
  stars: string;
  installCommand: string;
  minimalSnippet: string;
}

// ================= Shared WebAudio / Video Canvas Types =================
export type TrackType = 'drums_kick' | 'drums_snare' | 'drums_hihat' | 'bass' | 'lead' | 'chords' | 'arp';

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export type VideoStyle =
  | 'cyberpunk_grid'
  | 'audio_spectrum'
  | 'particle_galaxy'
  | 'lofi_retro_crt'
  | 'matrix_digital_rain'
  | 'kinetic_typography'
  | 'tunnel_hypnotic';

export interface SynthParams {
  oscType: OscillatorType;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  cutoff: number;
  resonance: number;
  distortion: number;
  delayTime: number;
  delayFeedback: number;
  volume: number;
}

export interface StepNote {
  active: boolean;
  pitch: string;
  velocity: number;
}

export interface MusicTrack {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  steps: StepNote[];
  synthParams: SynthParams;
}

export interface SongConfig {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  scaleKey: string;
  scaleMode: 'minor' | 'major' | 'dorian' | 'phrygian' | 'pentatonic_minor' | 'hirajoshi';
  tracks: MusicTrack[];
}

export interface VideoSceneConfig {
  id: string;
  title: string;
  style: VideoStyle;
  aspectRatio: '16:9' | '9:16' | '1:1';
  fps: 24 | 30 | 60;
  durationSeconds: number;
  mainTitle: string;
  subTitle: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  reactiveSensitivity: number;
  overlayScanlines: boolean;
  overlayVignette: boolean;
  overlayGlitch: boolean;
  overlayBloom: boolean;
  overlayNoise: boolean;
  cameraSpeed: number;
}

export interface GitEngineReference {
  name: string;
  repo: string;
  description: string;
  stars: string;
  techStack: string[];
  integrationType: 'webaudio' | 'canvas' | 'cli_export' | 'code_generation';
  exampleSnippet: string;
}

export interface MediaStudioPreset {
  id: string;
  name: string;
  genre: string;
  description: string;
  bpm: number;
  scaleKey: string;
  song: SongConfig;
  video: VideoSceneConfig;
  gitBasis: string;
}
