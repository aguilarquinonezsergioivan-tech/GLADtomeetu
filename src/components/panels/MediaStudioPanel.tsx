import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  Play,
  Pause,
  Square,
  Radio,
  FileCode,
  Terminal,
  ExternalLink,
  Sliders,
  Layers,
  Code2,
  RefreshCw,
  Cpu,
  Flame,
  GitBranch,
} from 'lucide-react';
import {
  MediaStudioTab,
  ImagePromptConfig,
  GeneratedImageResult,
  VideoPromptConfig,
  GeneratedVideoResult,
  MusicPromptConfig,
  GeneratedMusicResult,
} from '../../types/mediaStudio';
import {
  TOP_GIT_PIPELINES,
  generateProceduralImageFromPrompt,
  generateVideoPlanFromPrompt,
  generateMusicPlanFromPrompt,
} from '../../services/mediaPromptEngines';
import {
  AudioSynthEngine,
  globalAudioSynth,
  createAlgorithmicSong,
} from '../../services/audioSynthService';
import { VideoRenderEngine } from '../../services/videoRenderService';
import { loggerService } from '../../services/loggerService';

export const MediaStudioPanel: React.FC = () => {
  // Exactly 3 Tabs as requested by user
  const [activeTab, setActiveTab] = useState<MediaStudioTab>('images');

  // ================= TAB 1: IMAGES STATE =================
  const [imageConfig, setImageConfig] = useState<ImagePromptConfig>({
    prompt: 'Cyberpunk street market in neo-Tokyo with holographic neon signs and reflective wet asphalt',
    negativePrompt: 'blurry, low quality, deformed, artifacts, watermark',
    style: 'cyberpunk',
    aspectRatio: '16:9',
    guidanceScale: 4.5,
    steps: 28,
    seed: 42069,
    sampler: 'Euler a',
    pipeline: 'flux1-dev',
  });
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageResult>(() =>
    generateProceduralImageFromPrompt({
      prompt: 'Cyberpunk street market in neo-Tokyo with holographic neon signs and reflective wet asphalt',
      negativePrompt: 'blurry, low quality, deformed',
      style: 'cyberpunk',
      aspectRatio: '16:9',
      guidanceScale: 4.5,
      steps: 28,
      seed: 42069,
      sampler: 'Euler a',
      pipeline: 'flux1-dev',
    })
  );
  const [imageActiveSubView, setImageActiveSubView] = useState<'preview' | 'python_git' | 'comfyui'>(
    'preview'
  );

  // ================= TAB 2: VIDEO STATE =================
  const [videoConfig, setVideoConfig] = useState<VideoPromptConfig>({
    prompt: 'Cinematic FPV drone flight soaring over neon cyberpunk skyscrapers into purple volumetric fog',
    cameraMotion: 'fpv_drone',
    durationSeconds: 10,
    fps: 30,
    motionStrength: 7,
    resolution: '1080p_16:9',
    pipeline: 'cogvideox-5b',
    primaryColor: '#00f0ff',
    secondaryColor: '#ff007f',
  });
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideoResult>(() =>
    generateVideoPlanFromPrompt({
      prompt: 'Cinematic FPV drone flight soaring over neon cyberpunk skyscrapers into purple volumetric fog',
      cameraMotion: 'fpv_drone',
      durationSeconds: 10,
      fps: 30,
      motionStrength: 7,
      resolution: '1080p_16:9',
      pipeline: 'cogvideox-5b',
      primaryColor: '#00f0ff',
      secondaryColor: '#ff007f',
    })
  );
  const [videoActiveSubView, setVideoActiveSubView] = useState<'preview' | 'python_git' | 'ffmpeg'>(
    'preview'
  );
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordProgress, setRecordProgress] = useState<number>(0);

  // ================= TAB 3: MUSIC STATE =================
  const [musicConfig, setMusicConfig] = useState<MusicPromptConfig>({
    prompt: 'Synthwave 1984 high speed night drive with heavy 808 bass, punchy drums and retro neon arpeggios at 124 bpm',
    genre: 'synthwave',
    bpm: 124,
    durationSeconds: 15,
    scaleMode: 'minor',
    scaleKey: 'A',
    pipeline: 'facebook/audiocraft-musicgen-medium',
  });
  const [isGeneratingMusic, setIsGeneratingMusic] = useState<boolean>(false);
  const [generatedMusic, setGeneratedMusic] = useState<GeneratedMusicResult>(() =>
    generateMusicPlanFromPrompt({
      prompt: 'Synthwave 1984 high speed night drive with heavy 808 bass, punchy drums and retro neon arpeggios at 124 bpm',
      genre: 'synthwave',
      bpm: 124,
      durationSeconds: 15,
      scaleMode: 'minor',
      scaleKey: 'A',
      pipeline: 'facebook/audiocraft-musicgen-medium',
    })
  );
  const [musicActiveSubView, setMusicActiveSubView] = useState<'player' | 'python_git'>('player');
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isExportingWav, setIsExportingWav] = useState<boolean>(false);

  // References & Clocks
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoEngineRef = useRef<VideoRenderEngine | null>(null);
  const synthRef = useRef<AudioSynthEngine>(globalAudioSynth);
  const animFrameRef = useRef<number | null>(null);
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(128));
  const timeDataRef = useRef<Uint8Array>(new Uint8Array(128));
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Init Video Canvas
  useEffect(() => {
    if (videoCanvasRef.current) {
      const engine = new VideoRenderEngine();
      engine.init(videoCanvasRef.current);
      videoEngineRef.current = engine;
    }
  }, [activeTab]);

  // Canvas Render Loop for Video Tab
  useEffect(() => {
    if (activeTab !== 'video') return;

    let startTime = performance.now();
    const loop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      synthRef.current.getFrequencyData(freqDataRef.current);
      synthRef.current.getTimeDomainData(timeDataRef.current);

      if (videoEngineRef.current && videoCanvasRef.current) {
        videoEngineRef.current.renderFrame(
          elapsed,
          freqDataRef.current,
          timeDataRef.current,
          120,
          {
            id: 'v_preview',
            title: generatedVideo.title,
            style:
              videoConfig.cameraMotion === 'fpv_drone'
                ? 'cyberpunk_grid'
                : videoConfig.cameraMotion === 'orbit_360'
                ? 'particle_galaxy'
                : videoConfig.cameraMotion === 'zoom_in'
                ? 'tunnel_hypnotic'
                : 'matrix_digital_rain',
            aspectRatio: '16:9',
            fps: videoConfig.fps,
            durationSeconds: videoConfig.durationSeconds,
            mainTitle: generatedVideo.title.toUpperCase(),
            subTitle: `MOTION: ${videoConfig.cameraMotion.toUpperCase()} // PIPELINE: ${videoConfig.pipeline}`,
            primaryColor: videoConfig.primaryColor,
            secondaryColor: videoConfig.secondaryColor,
            accentColor: '#facc15',
            reactiveSensitivity: 1.5,
            overlayScanlines: true,
            overlayVignette: true,
            overlayGlitch: true,
            overlayBloom: true,
            overlayNoise: false,
            cameraSpeed: 1.3,
          }
        );
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab, generatedVideo, videoConfig]);

  // ================= ACTION HANDLERS =================
  // 1. Generate Image from Prompt
  const handleGenerateImage = () => {
    if (!imageConfig.prompt.trim()) return;
    setIsGeneratingImage(true);
    loggerService.log('COMMAND', `Generando imagen para prompt: "${imageConfig.prompt}"...`);

    setTimeout(() => {
      const res = generateProceduralImageFromPrompt(imageConfig);
      setGeneratedImage(res);
      setIsGeneratingImage(false);
      setImageActiveSubView('preview');
      loggerService.log('INFO', `Imagen generada con pipeline ${imageConfig.pipeline} (Seed: ${res.seed}).`);
    }, 400);
  };

  // 2. Generate Video from Prompt
  const handleGenerateVideo = () => {
    if (!videoConfig.prompt.trim()) return;
    setIsGeneratingVideo(true);
    loggerService.log('COMMAND', `Generando video para prompt: "${videoConfig.prompt}"...`);

    setTimeout(() => {
      const res = generateVideoPlanFromPrompt(videoConfig);
      setGeneratedVideo(res);
      setIsGeneratingVideo(false);
      setVideoActiveSubView('preview');
      loggerService.log('INFO', `Video planificado con pipeline ${videoConfig.pipeline} (${videoConfig.cameraMotion}).`);
    }, 450);
  };

  // 3. Generate Music from Prompt
  const handleGenerateMusic = () => {
    if (!musicConfig.prompt.trim()) return;
    setIsGeneratingMusic(true);
    loggerService.log('COMMAND', `Generando música para prompt: "${musicConfig.prompt}"...`);

    setTimeout(() => {
      const res = generateMusicPlanFromPrompt(musicConfig);
      setGeneratedMusic(res);
      const song = createAlgorithmicSong(
        res.genre,
        res.bpm,
        res.scaleKey,
        res.scaleMode as 'minor' | 'dorian' | 'phrygian' | 'pentatonic_minor' | 'hirajoshi'
      );
      song.title = res.title;
      synthRef.current.setSong(song);
      setIsGeneratingMusic(false);
      setMusicActiveSubView('player');
      loggerService.log('INFO', `Música compilada: ${res.title} a ${res.bpm} BPM.`);
    }, 400);
  };

  // Play/Pause Music
  const togglePlayMusic = () => {
    if (isMusicPlaying) {
      synthRef.current.stopPlayback();
      setIsMusicPlaying(false);
    } else {
      const song = createAlgorithmicSong(
        generatedMusic.genre,
        generatedMusic.bpm,
        generatedMusic.scaleKey,
        generatedMusic.scaleMode as 'minor' | 'dorian' | 'phrygian' | 'pentatonic_minor' | 'hirajoshi'
      );
      synthRef.current.startPlayback(song);
      setIsMusicPlaying(true);
    }
  };

  // Download Master WAV
  const handleDownloadWav = async () => {
    setIsExportingWav(true);
    try {
      const song = createAlgorithmicSong(
        generatedMusic.genre,
        generatedMusic.bpm,
        generatedMusic.scaleKey,
        generatedMusic.scaleMode as 'minor' | 'dorian' | 'phrygian' | 'pentatonic_minor' | 'hirajoshi'
      );
      const blob = await synthRef.current.exportSongToWavBlob(song, 2);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedMusic.title.replace(/\s+/g, '_')}_master.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      loggerService.log('INFO', 'Descargado master WAV de música generado por prompt.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingWav(false);
    }
  };

  // Download MIDI
  const handleDownloadMidi = () => {
    const song = createAlgorithmicSong(
      generatedMusic.genre,
      generatedMusic.bpm,
      generatedMusic.scaleKey,
      generatedMusic.scaleMode as 'minor' | 'dorian' | 'phrygian' | 'pentatonic_minor' | 'hirajoshi'
    );
    const blob = synthRef.current.exportSongToMidiBlob(song);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedMusic.title.replace(/\s+/g, '_')}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    loggerService.log('INFO', 'Archivo Standard MIDI (.mid) descargado.');
  };

  // Record Real Video WebM in Browser
  const handleRecordVideoClip = async () => {
    if (!videoCanvasRef.current || !videoEngineRef.current) return;
    setIsRecordingVideo(true);
    setRecordProgress(0);

    try {
      const audioCtx = synthRef.current.getAudioContext();
      const mediaDest = audioCtx.createMediaStreamDestination();
      const analyser = synthRef.current.getAnalyser();
      if (analyser) analyser.connect(mediaDest);

      const blob = await videoEngineRef.current.recordVideoClip(
        mediaDest,
        videoConfig.durationSeconds,
        videoConfig.fps,
        (pct) => setRecordProgress(pct)
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedVideo.title.replace(/\s+/g, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      loggerService.log('INFO', 'Video WebM grabado y descargado exitosamente.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecordingVideo(false);
      setRecordProgress(0);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090b10] text-slate-100 font-mono select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-14 px-4 bg-[#0d1017] border-b border-[#1c2433] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-100 tracking-wider">
                ESTUDIO MULTIMEDIA GENERATIVO // GIT PIPELINES
              </h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold">
                100% Por Prompt
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Generación de Imágenes, Video y Música por prompt con pipelines de Diffusers, CogVideoX y AudioCraft
            </p>
          </div>
        </div>

        {/* 3 Main Tabs Selection */}
        <div className="flex items-center p-1 bg-[#06080e] rounded-lg border border-[#1b2333]">
          <button
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'images'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> 1. Imágenes (FLUX/SDXL)
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'video'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <VideoIcon className="w-3.5 h-3.5" /> 2. Video (CogVideo/AnimateDiff)
          </button>

          <button
            onClick={() => setActiveTab('music')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'music'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MusicIcon className="w-3.5 h-3.5" /> 3. Música (Meta AudioCraft)
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ======================================================== */}
        {/* PESTAÑA 1: GENERACIÓN DE IMÁGENES (IMAGE GEN)            */}
        {/* ======================================================== */}
        {activeTab === 'images' && (
          <div className="flex-1 flex min-h-0">
            {/* Left Column: Prompt Input & Parameters */}
            <div className="w-96 bg-[#0c0f16] border-r border-[#1a2230] p-4 flex flex-col justify-between overflow-y-auto text-xs shrink-0">
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 font-bold block mb-1.5 flex items-center justify-between">
                    <span>Prompt de Imagen</span>
                    <span className="text-[10px] text-cyan-400 font-mono">huggingface/diffusers</span>
                  </label>
                  <textarea
                    rows={4}
                    value={imageConfig.prompt}
                    onChange={(e) => setImageConfig((prev) => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Describe detalladamente la imagen que deseas generar..."
                    className="w-full bg-[#121622] border border-[#232c3d] rounded p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-400 resize-none"
                  />
                </div>

                {/* Inspiration Chips */}
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Inspiración rápida:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Samurai cibernético bajo lluvia de neón con reflejos',
                      'Retrato fotorealista de astronauta en Marte con casco reflectante',
                      'Ilustración anime estilo Makoto Shinkai de templo flotante',
                      'Vehículo militar conceptual en desierto postapocalíptico',
                      'Castillo medieval de fantasía sobre acantilado cubierto de niebla',
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => setImageConfig((prev) => ({ ...prev, prompt: chip }))}
                        className="text-[9px] px-2 py-0.5 rounded bg-[#161d2b] hover:bg-[#1d273a] text-cyan-300 border border-[#243044] cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Prompt Negativo</label>
                  <input
                    type="text"
                    value={imageConfig.negativePrompt}
                    onChange={(e) =>
                      setImageConfig((prev) => ({ ...prev, negativePrompt: e.target.value }))
                    }
                    className="w-full bg-[#121622] border border-[#232c3d] rounded px-2.5 py-1 text-slate-300 text-xs focus:outline-hidden"
                  />
                </div>

                {/* Pipeline & Style */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Pipeline Git</label>
                    <select
                      value={imageConfig.pipeline}
                      onChange={(e) =>
                        setImageConfig((prev) => ({
                          ...prev,
                          pipeline: e.target.value as ImagePromptConfig['pipeline'],
                        }))
                      }
                      className="w-full bg-[#121622] border border-[#232c3d] rounded px-2 py-1 text-xs text-cyan-300 cursor-pointer"
                    >
                      <option value="flux1-dev">FLUX.1-dev (SOTA)</option>
                      <option value="sdxl-base-1.0">Stable Diffusion XL</option>
                      <option value="sd-1.5">Stable Diffusion 1.5</option>
                      <option value="comfyui-lora">ComfyUI + LoRA</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Estilo Visual</label>
                    <select
                      value={imageConfig.style}
                      onChange={(e) =>
                        setImageConfig((prev) => ({
                          ...prev,
                          style: e.target.value as ImagePromptConfig['style'],
                        }))
                      }
                      className="w-full bg-[#121622] border border-[#232c3d] rounded px-2 py-1 text-xs text-slate-200 cursor-pointer"
                    >
                      <option value="cyberpunk">Cyberpunk / Neon</option>
                      <option value="photorealistic">Fotorealista</option>
                      <option value="anime_manga">Anime / Manga</option>
                      <option value="concept_art">Concept Art</option>
                      <option value="retro_pixel">Pixel Art Retro</option>
                    </select>
                  </div>
                </div>

                {/* Aspect Ratio & Steps */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Formato</label>
                    <div className="flex gap-1">
                      {(['16:9', '1:1', '9:16'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setImageConfig((prev) => ({ ...prev, aspectRatio: ratio }))}
                          className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer ${
                            imageConfig.aspectRatio === ratio
                              ? 'bg-cyan-500 text-black'
                              : 'bg-[#141a24] text-slate-400'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">
                      Pasos (Steps): {imageConfig.steps}
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="50"
                      value={imageConfig.steps}
                      onChange={(e) =>
                        setImageConfig((prev) => ({ ...prev, steps: parseInt(e.target.value, 10) }))
                      }
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="pt-4 border-t border-[#1a2230]">
                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !imageConfig.prompt.trim()}
                  className="w-full py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGeneratingImage ? 'Iniciando Inferencia...' : 'Generar Imagen por Prompt'}
                </button>
              </div>
            </div>

            {/* Right Column: Visual Result / Python Git Code / ComfyUI */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#06080e] overflow-hidden">
              {/* Sub-header view switcher */}
              <div className="h-10 px-4 bg-[#0a0d14] border-b border-[#18202d] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImageActiveSubView('preview')}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                      imageActiveSubView === 'preview'
                        ? 'bg-[#182233] text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    🖼️ Renderizado de Imagen
                  </button>
                  <button
                    onClick={() => setImageActiveSubView('python_git')}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                      imageActiveSubView === 'python_git'
                        ? 'bg-[#182233] text-purple-300 border border-purple-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" /> Código Python (Diffusers PyTorch)
                  </button>
                  <button
                    onClick={() => setImageActiveSubView('comfyui')}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                      imageActiveSubView === 'comfyui'
                        ? 'bg-[#182233] text-amber-300 border border-amber-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" /> Grafo ComfyUI (JSON)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={generatedImage.imageUrl}
                    download="glados_generated_image.svg"
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#16202e] hover:bg-[#1f2c3f] text-cyan-300 text-xs border border-cyan-500/30"
                  >
                    <Download className="w-3 h-3" /> Descargar Imagen
                  </a>
                </div>
              </div>

              {/* View 1: Image Canvas */}
              {imageActiveSubView === 'preview' && (
                <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
                  <div className="relative max-h-full max-w-full rounded-lg overflow-hidden border border-[#20293b] shadow-2xl bg-black">
                    <img
                      src={generatedImage.imageUrl}
                      alt={generatedImage.prompt}
                      className="max-h-[75vh] max-w-[80vw] object-contain block"
                    />
                  </div>
                </div>
              )}

              {/* View 2: Python Script for Diffusers */}
              {imageActiveSubView === 'python_git' && (
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-purple-400" /> Script PyTorch listo para ejecutar en GPU o Google Colab:
                    </span>
                    <button
                      onClick={() => handleCopy(generatedImage.pythonScript, 'img_py')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#141a24] text-xs text-slate-300 hover:text-white border border-[#222c3d] cursor-pointer"
                    >
                      {copiedKey === 'img_py' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'img_py' ? 'Copiado' : 'Copiar Código'}
                    </button>
                  </div>
                  <pre className="p-4 rounded-lg bg-[#0a0d13] border border-[#1b2333] text-xs text-slate-300 overflow-x-auto leading-relaxed">
                    {generatedImage.pythonScript}
                  </pre>
                </div>
              )}

              {/* View 3: ComfyUI JSON */}
              {imageActiveSubView === 'comfyui' && (
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-amber-400" /> Workflow JSON compatible con ComfyUI (Arrastrar y Soltar):
                    </span>
                    <button
                      onClick={() => handleCopy(generatedImage.comfyUiWorkflowJson, 'img_json')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#141a24] text-xs text-slate-300 hover:text-white border border-[#222c3d] cursor-pointer"
                    >
                      {copiedKey === 'img_json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'img_json' ? 'Copiado' : 'Copiar JSON'}
                    </button>
                  </div>
                  <pre className="p-4 rounded-lg bg-[#0a0d13] border border-[#1b2333] text-xs text-amber-300/90 overflow-x-auto leading-relaxed">
                    {generatedImage.comfyUiWorkflowJson}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 2: GENERACIÓN DE VIDEO (VIDEO GEN)               */}
        {/* ======================================================== */}
        {activeTab === 'video' && (
          <div className="flex-1 flex min-h-0">
            {/* Left Column: Video Prompt & Camera Motion Controls */}
            <div className="w-96 bg-[#0c0f16] border-r border-[#1a2230] p-4 flex flex-col justify-between overflow-y-auto text-xs shrink-0">
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 font-bold block mb-1.5 flex items-center justify-between">
                    <span>Prompt de Video (Text-to-Video)</span>
                    <span className="text-[10px] text-rose-400 font-mono">THUDM/CogVideoX</span>
                  </label>
                  <textarea
                    rows={4}
                    value={videoConfig.prompt}
                    onChange={(e) => setVideoConfig((prev) => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Describe la escena, acción cinemática y trayectoria de cámara..."
                    className="w-full bg-[#121622] border border-[#232c3d] rounded p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-rose-400 resize-none"
                  />
                </div>

                {/* Quick Video Inspiration Chips */}
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Inspiración de video:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Vuelo dron FPV atravesando rascacielos cyberpunk con niebla púrpura',
                      'Cámara en órbita 360 alrededor de un agujero negro con disco de acreción',
                      'Travelling frontal hacia portal dimensional brillante en templo antiguo',
                      'Timelapse hiperbólico de atardecer cósmico en planeta alienígena',
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => setVideoConfig((prev) => ({ ...prev, prompt: chip }))}
                        className="text-[9px] px-2 py-0.5 rounded bg-[#161d2b] hover:bg-[#1d273a] text-rose-300 border border-[#243044] cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Camera Motion Type */}
                <div>
                  <label className="text-slate-400 block mb-1.5 text-[11px] font-bold">
                    Cinemática de Cámara (Motion Path)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'fpv_drone', label: 'Vuelo Dron FPV' },
                        { id: 'zoom_in', label: 'Zoom Hacia Adentro' },
                        { id: 'zoom_out', label: 'Zoom Hacia Afuera' },
                        { id: 'orbit_360', label: 'Órbita 360°' },
                        { id: 'pan_horizontal', label: 'Panorámica Pan' },
                        { id: 'static_tripod', label: 'Trípode Estático' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setVideoConfig((prev) => ({ ...prev, cameraMotion: m.id }))}
                        className={`px-2 py-1.5 rounded text-[10px] text-left border transition-all cursor-pointer ${
                          videoConfig.cameraMotion === m.id
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                            : 'bg-[#121620] border-[#1f2838] text-slate-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration & FPS */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Duración</label>
                    <div className="flex gap-1">
                      {([5, 10, 15] as const).map((sec) => (
                        <button
                          key={sec}
                          onClick={() => setVideoConfig((prev) => ({ ...prev, durationSeconds: sec }))}
                          className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer ${
                            videoConfig.durationSeconds === sec
                              ? 'bg-rose-500 text-white'
                              : 'bg-[#141a24] text-slate-400'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Cuadros / FPS</label>
                    <div className="flex gap-1">
                      {([24, 30, 60] as const).map((fps) => (
                        <button
                          key={fps}
                          onClick={() => setVideoConfig((prev) => ({ ...prev, fps }))}
                          className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer ${
                            videoConfig.fps === fps
                              ? 'bg-amber-400 text-black'
                              : 'bg-[#141a24] text-slate-400'
                          }`}
                        >
                          {fps}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate Video Button */}
              <div className="pt-4 border-t border-[#1a2230]">
                <button
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo || !videoConfig.prompt.trim()}
                  className="w-full py-2.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGeneratingVideo ? 'Procesando Video...' : 'Generar Video por Prompt'}
                </button>
              </div>
            </div>

            {/* Right Column: Video Canvas Playback / Python Git Code / FFmpeg */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#06080e] overflow-hidden">
              <div className="h-10 px-4 bg-[#0a0d14] border-b border-[#18202d] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVideoActiveSubView('preview')}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                      videoActiveSubView === 'preview'
                        ? 'bg-[#182233] text-rose-300 border border-rose-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    🎬 Visualizador de Video (60 FPS)
                  </button>
                  <button
                    onClick={() => setVideoActiveSubView('python_git')}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                      videoActiveSubView === 'python_git'
                        ? 'bg-[#182233] text-purple-300 border border-purple-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" /> Código Python (CogVideoX / AnimateDiff)
                  </button>
                  <button
                    onClick={() => setVideoActiveSubView('ffmpeg')}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                      videoActiveSubView === 'ffmpeg'
                        ? 'bg-[#182233] text-amber-300 border border-amber-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" /> Comando FFmpeg CLI
                  </button>
                </div>

                {/* Direct Video Recorder */}
                <button
                  onClick={handleRecordVideoClip}
                  disabled={isRecordingVideo}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    isRecordingVideo
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  {isRecordingVideo ? `Grabando (${recordProgress}%)` : 'Grabar Video WebM'}
                </button>
              </div>

              {/* View 1: Video Canvas */}
              {videoActiveSubView === 'preview' && (
                <div className="flex-1 flex items-center justify-center p-6 bg-black">
                  <div className="relative aspect-video max-h-[80vh] max-w-[85vw] w-full rounded border border-[#202838] shadow-2xl overflow-hidden bg-black flex items-center justify-center">
                    <canvas ref={videoCanvasRef} width={1280} height={720} className="w-full h-full object-contain block" />
                  </div>
                </div>
              )}

              {/* View 2: Python Script for CogVideoX */}
              {videoActiveSubView === 'python_git' && (
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-rose-400" /> Script Text-to-Video con CogVideoX & Diffusers:
                    </span>
                    <button
                      onClick={() => handleCopy(generatedVideo.pythonScript, 'vid_py')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#141a24] text-xs text-slate-300 hover:text-white border border-[#222c3d] cursor-pointer"
                    >
                      {copiedKey === 'vid_py' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'vid_py' ? 'Copiado' : 'Copiar Código'}
                    </button>
                  </div>
                  <pre className="p-4 rounded-lg bg-[#0a0d13] border border-[#1b2333] text-xs text-slate-300 overflow-x-auto leading-relaxed">
                    {generatedVideo.pythonScript}
                  </pre>
                </div>
              )}

              {/* View 3: FFmpeg CLI */}
              {videoActiveSubView === 'ffmpeg' && (
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-amber-400" /> Comando FFmpeg para renderizar en terminal:
                    </span>
                    <button
                      onClick={() => handleCopy(generatedVideo.ffmpegCommand, 'vid_ff')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#141a24] text-xs text-slate-300 hover:text-white border border-[#222c3d] cursor-pointer"
                    >
                      {copiedKey === 'vid_ff' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'vid_ff' ? 'Copiado' : 'Copiar Comando'}
                    </button>
                  </div>
                  <pre className="p-4 rounded-lg bg-[#0a0d13] border border-[#1b2333] text-xs text-amber-300/90 overflow-x-auto leading-relaxed">
                    {generatedVideo.ffmpegCommand}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 3: GENERACIÓN DE MÚSICA (MUSIC GEN)              */}
        {/* ======================================================== */}
        {activeTab === 'music' && (
          <div className="flex-1 flex min-h-0">
            {/* Left Column: Music Prompt & Musical Theory Controls */}
            <div className="w-96 bg-[#0c0f16] border-r border-[#1a2230] p-4 flex flex-col justify-between overflow-y-auto text-xs shrink-0">
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 font-bold block mb-1.5 flex items-center justify-between">
                    <span>Prompt de Música (Text-to-Music)</span>
                    <span className="text-[10px] text-amber-400 font-mono">Meta AudioCraft</span>
                  </label>
                  <textarea
                    rows={4}
                    value={musicConfig.prompt}
                    onChange={(e) => setMusicConfig((prev) => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Describe el estilo musical, tempo, instrumentos y ambiente..."
                    className="w-full bg-[#121622] border border-[#232c3d] rounded p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-400 resize-none"
                  />
                </div>

                {/* Quick Music Inspiration Chips */}
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Inspiración musical:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Synthwave 1984 con bajo 808 analógico y arpegios retro a 124 bpm',
                      'Trap oscuro con 808 distorsionado, hi-hat rolls y flauta melancólica a 140 bpm',
                      'Lo-fi relajante para estudiar con piano Rhodes y sonido de vinilo a 82 bpm',
                      'Chiptune arcade 8-bit de combate contra jefe final a 150 bpm',
                      'Trailer cinematográfico de ciencia ficción con pads espaciales a 74 bpm',
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => setMusicConfig((prev) => ({ ...prev, prompt: chip }))}
                        className="text-[9px] px-2 py-0.5 rounded bg-[#161d2b] hover:bg-[#1d273a] text-amber-300 border border-[#243044] cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Genre & Pipeline */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Género / Estilo</label>
                    <select
                      value={musicConfig.genre}
                      onChange={(e) =>
                        setMusicConfig((prev) => ({
                          ...prev,
                          genre: e.target.value as MusicPromptConfig['genre'],
                        }))
                      }
                      className="w-full bg-[#121622] border border-[#232c3d] rounded px-2 py-1 text-xs text-amber-300 cursor-pointer"
                    >
                      <option value="synthwave">Synthwave 1984</option>
                      <option value="cyberpunk">Cyberpunk Acid</option>
                      <option value="lofi_hiphop">Lo-Fi Chillhop</option>
                      <option value="trap_dark">Trap Oscuro 808</option>
                      <option value="chiptune_8bit">Chiptune 8-Bit</option>
                      <option value="ambient_drone">Ambient Espacial</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Tempo: {musicConfig.bpm} BPM</label>
                    <input
                      type="range"
                      min="70"
                      max="160"
                      value={musicConfig.bpm}
                      onChange={(e) =>
                        setMusicConfig((prev) => ({ ...prev, bpm: parseInt(e.target.value, 10) }))
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Scale & Key */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Tonalidad (Key)</label>
                    <select
                      value={musicConfig.scaleKey}
                      onChange={(e) => setMusicConfig((prev) => ({ ...prev, scaleKey: e.target.value }))}
                      className="w-full bg-[#121622] border border-[#232c3d] rounded px-2 py-1 text-xs text-slate-200 cursor-pointer"
                    >
                      {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Modo Armónico</label>
                    <select
                      value={musicConfig.scaleMode}
                      onChange={(e) =>
                        setMusicConfig((prev) => ({
                          ...prev,
                          scaleMode: e.target.value as MusicPromptConfig['scaleMode'],
                        }))
                      }
                      className="w-full bg-[#121622] border border-[#232c3d] rounded px-2 py-1 text-xs text-slate-200 cursor-pointer"
                    >
                      <option value="minor">Menor Natural</option>
                      <option value="dorian">Dórico (Lo-Fi)</option>
                      <option value="hirajoshi">Hirajoshi (Cyberpunk)</option>
                      <option value="pentatonic_minor">Pentatónica</option>
                      <option value="phrygian">Frigio (Oscuro)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Generate Music Button */}
              <div className="pt-4 border-t border-[#1a2230]">
                <button
                  onClick={handleGenerateMusic}
                  disabled={isGeneratingMusic || !musicConfig.prompt.trim()}
                  className="w-full py-2.5 rounded bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGeneratingMusic ? 'Sintetizando Pista...' : 'Generar Música por Prompt'}
                </button>
              </div>
            </div>

            {/* Right Column: Audio Player & Waveform / Python AudioCraft Script */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#06080e] overflow-hidden">
              <div className="h-10 px-4 bg-[#0a0d14] border-b border-[#18202d] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMusicActiveSubView('player')}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                      musicActiveSubView === 'player'
                        ? 'bg-[#182233] text-amber-300 border border-amber-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    🎵 Reproductor & Master (Web Audio)
                  </button>
                  <button
                    onClick={() => setMusicActiveSubView('python_git')}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                      musicActiveSubView === 'python_git'
                        ? 'bg-[#182233] text-purple-300 border border-purple-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" /> Código Python (Meta AudioCraft MusicGen)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadWav}
                    disabled={isExportingWav}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#16202e] hover:bg-[#1f2c3f] text-cyan-300 text-xs border border-cyan-500/30 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    {isExportingWav ? 'Render...' : 'Descargar Master WAV'}
                  </button>
                  <button
                    onClick={handleDownloadMidi}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#16202e] hover:bg-[#1f2c3f] text-amber-300 text-xs border border-amber-500/30 cursor-pointer"
                  >
                    <MusicIcon className="w-3 h-3" /> Descargar MIDI (.mid)
                  </button>
                </div>
              </div>

              {/* View 1: Audio Player Card */}
              {musicActiveSubView === 'player' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="w-full max-w-xl bg-[#0e121a] border border-[#1e2637] rounded-xl p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                          Pista Generada por Prompt
                        </span>
                        <h3 className="text-base font-bold text-slate-100">{generatedMusic.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {generatedMusic.genre.toUpperCase()} &middot; {generatedMusic.bpm} BPM &middot; Escala {generatedMusic.scaleKey} {generatedMusic.scaleMode}
                        </p>
                      </div>

                      {/* Play/Pause Button */}
                      <button
                        onClick={togglePlayMusic}
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-transform hover:scale-105 cursor-pointer shadow-xl ${
                          isMusicPlaying
                            ? 'bg-amber-400 text-black shadow-amber-400/30'
                            : 'bg-cyan-500 text-black shadow-cyan-500/30'
                        }`}
                      >
                        {isMusicPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
                      </button>
                    </div>

                    {/* Simulated Animated Equalizer Bars */}
                    <div className="h-20 bg-[#07090e] rounded-lg p-3 flex items-end gap-1 mb-4 border border-[#18202d]">
                      {Array.from({ length: 32 }).map((_, i) => {
                        const hPct = isMusicPlaying
                          ? 20 + Math.sin(i * 0.4 + Date.now() * 0.005) * 35 + Math.random() * 30
                          : 15;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-t transition-all"
                            style={{
                              height: `${hPct}%`,
                              backgroundColor: i % 2 === 0 ? '#facc15' : '#06b6d4',
                              opacity: isMusicPlaying ? 0.9 : 0.3,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Instrumental Layers Used */}
                    <div className="pt-3 border-t border-[#18202d]">
                      <span className="text-[10px] text-slate-400 block mb-1.5">Capas e Instrumentos Sintetizados:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedMusic.instrumentsUsed.map((inst) => (
                          <span
                            key={inst}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#141a24] text-slate-300 border border-[#222c3d]"
                          >
                            {inst}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: Python Script for Meta AudioCraft */}
              {musicActiveSubView === 'python_git' && (
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-amber-400" /> Script oficial de Meta AudioCraft (MusicGen):
                    </span>
                    <button
                      onClick={() => handleCopy(generatedMusic.pythonScript, 'mus_py')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#141a24] text-xs text-slate-300 hover:text-white border border-[#222c3d] cursor-pointer"
                    >
                      {copiedKey === 'mus_py' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'mus_py' ? 'Copiado' : 'Copiar Código'}
                    </button>
                  </div>
                  <pre className="p-4 rounded-lg bg-[#0a0d13] border border-[#1b2333] text-xs text-slate-300 overflow-x-auto leading-relaxed">
                    {generatedMusic.pythonScript}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
