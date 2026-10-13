import { SongConfig, VideoSceneConfig, VideoStyle } from '../types/mediaStudio';
import { createAlgorithmicSong } from './audioSynthService';

export interface GeneratedStudioProject {
  song: SongConfig;
  video: VideoSceneConfig;
  explanation: string;
  sourceEngine: string;
}

export async function generateStudioFromPrompt(prompt: string): Promise<GeneratedStudioProject> {
  try {
    const res = await fetch('/api/media/generate-studio-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.song && data.video) {
        return data as GeneratedStudioProject;
      }
    }
  } catch (err) {
    console.warn('API call to /api/media/generate-studio-prompt failed, using algorithmic fallback:', err);
  }

  // Autonomous Algorithmic Engine (No external API needed)
  return fallbackAlgorithmicGeneration(prompt);
}

function fallbackAlgorithmicGeneration(prompt: string): GeneratedStudioProject {
  const p = prompt.toLowerCase();

  let bpm = 120;
  let genre = 'Electronic Synthesizer';
  let style: VideoStyle = 'cyberpunk_grid';
  let scaleMode: 'minor' | 'dorian' | 'phrygian' | 'pentatonic_minor' | 'hirajoshi' = 'minor';
  let primaryColor = '#00f0ff';
  let secondaryColor = '#ff007f';
  let accentColor = '#facc15';

  if (p.includes('lofi') || p.includes('lo-fi') || p.includes('chill') || p.includes('relaj') || p.includes('estudio')) {
    bpm = 82;
    genre = 'Lo-Fi Chillhop';
    style = 'lofi_retro_crt';
    scaleMode = 'dorian';
    primaryColor = '#ff90e8';
    secondaryColor = '#ffb300';
    accentColor = '#4deeea';
  } else if (p.includes('cyberpunk') || p.includes('matrix') || p.includes('acid') || p.includes('hack')) {
    bpm = 138;
    genre = 'Dark Cyberpunk';
    style = 'matrix_digital_rain';
    scaleMode = 'hirajoshi';
    primaryColor = '#00ff66';
    secondaryColor = '#00ffff';
    accentColor = '#ff0055';
  } else if (p.includes('8bit') || p.includes('8-bit') || p.includes('retro') || p.includes('juego') || p.includes('game') || p.includes('chiptune')) {
    bpm = 146;
    genre = 'Arcade Chiptune';
    style = 'audio_spectrum';
    scaleMode = 'pentatonic_minor';
    primaryColor = '#facc15';
    secondaryColor = '#f43f5e';
    accentColor = '#38bdf8';
  } else if (p.includes('ambient') || p.includes('espacio') || p.includes('space') || p.includes('medita')) {
    bpm = 74;
    genre = 'Cosmic Ambient';
    style = 'tunnel_hypnotic';
    scaleMode = 'phrygian';
    primaryColor = '#c084fc';
    secondaryColor = '#38bdf8';
    accentColor = '#f43f5e';
  }

  const song = createAlgorithmicSong(genre, bpm, 'C', scaleMode);
  song.title = prompt.length > 30 ? `${prompt.slice(0, 30)}...` : prompt;

  const video: VideoSceneConfig = {
    id: `v_${Date.now()}`,
    title: song.title,
    style,
    aspectRatio: '16:9',
    fps: 30,
    durationSeconds: 15,
    mainTitle: prompt.slice(0, 24).toUpperCase() || 'AUDIOVISUAL SEQUENCE',
    subTitle: `GENERADO CON WEBAUDIO & CANVAS // ${bpm} BPM`,
    primaryColor,
    secondaryColor,
    accentColor,
    reactiveSensitivity: 1.5,
    overlayScanlines: true,
    overlayVignette: true,
    overlayGlitch: p.includes('cyber') || p.includes('glitch'),
    overlayBloom: true,
    overlayNoise: p.includes('lofi'),
    cameraSpeed: bpm > 130 ? 1.5 : 1.0,
  };

  return {
    song,
    video,
    explanation: `Sintetizada secuencia musical en escala ${scaleMode} a ${bpm} BPM con instrumentación ${genre} y escena visual procedimental "${style}".`,
    sourceEngine: 'Algoritmo Git: tidalcycles/strudel + tonejs + canvas-reactive',
  };
}
