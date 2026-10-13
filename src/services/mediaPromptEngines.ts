import {
  ImagePromptConfig,
  GeneratedImageResult,
  VideoPromptConfig,
  GeneratedVideoResult,
  MusicPromptConfig,
  GeneratedMusicResult,
  GitPipelineReference,
} from '../types/mediaStudio';

// Top Git repositories across Image, Video, and Music
export const TOP_GIT_PIPELINES: GitPipelineReference[] = [
  // 1. Image
  {
    id: 'flux-diffusers',
    name: 'FLUX.1-dev / Diffusers',
    repo: 'black-forest-labs/flux & huggingface/diffusers',
    category: 'images',
    description: 'El modelo open-source de generación de imágenes con mayor fidelidad a prompts, texto legible y renderizado fotorealista.',
    stars: '24.8k',
    installCommand: 'pip install diffusers torch transformers accelerate sentencepiece',
    minimalSnippet: `import torch
from diffusers import FluxPipeline

pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-dev", torch_dtype=torch.bfloat16)
pipe.enable_model_cpu_offload()

image = pipe(
    prompt="Cyberpunk city with neon lights and reflective wet asphalt",
    height=1024,
    width=1024,
    guidance_scale=3.5,
    num_inference_steps=28,
    max_sequence_length=512,
    generator=torch.Generator("cuda").manual_seed(42)
).images[0]
image.save("flux_output.png")`,
  },
  {
    id: 'comfyui-engine',
    name: 'ComfyUI Nodal Graph',
    repo: 'comfyanonymous/ComfyUI',
    category: 'images',
    description: 'La arquitectura modular basada en grafos más eficiente para inferencia local de Stable Diffusion y FLUX.',
    stars: '54.2k',
    installCommand: 'git clone https://github.com/comfyanonymous/ComfyUI && pip install -r requirements.txt',
    minimalSnippet: `python main.py --listen 0.0.0.0 --port 8188 --preview-method auto`,
  },
  // 2. Video
  {
    id: 'cogvideox',
    name: 'CogVideoX (THUDM)',
    repo: 'THUDM/CogVideoX',
    category: 'video',
    description: 'SOTA de generación de video a partir de texto (Text-to-Video) de código abierto con comprensión de movimiento 3D.',
    stars: '8.9k',
    installCommand: 'pip install diffusers torch transformers accelerate imageio[ffmpeg]',
    minimalSnippet: `import torch
from diffusers import CogVideoXPipeline
from diffusers.utils import export_to_video

pipe = CogVideoXPipeline.from_pretrained("THUDM/CogVideoX-5b", torch_dtype=torch.bfloat16)
pipe.enable_model_cpu_offload()

video = pipe(
    prompt="Cinematic drone flight through futuristic neo-tokyo skyscrapers, volumetric fog, 4k",
    num_frames=49,
    guidance_scale=6.0,
    generator=torch.Generator("cuda").manual_seed(42),
).frames[0]
export_to_video(video, "cogvideo_render.mp4", fps=8)`,
  },
  {
    id: 'animatediff',
    name: 'AnimateDiff',
    repo: 'guoyww/AnimateDiff',
    category: 'video',
    description: 'Módulo de movimiento temporal adaptable a cualquier checkpoint de Stable Diffusion para generar animación fluida.',
    stars: '10.5k',
    installCommand: 'pip install diffusers torch transformers',
    minimalSnippet: `from diffusers import AnimateDiffPipeline, MotionAdapter, DDIMScheduler
adapter = MotionAdapter.from_pretrained("guoyww/animatediff-motion-adapter-v1-5-2")
pipe = AnimateDiffPipeline.from_pretrained("runwayml/stable-diffusion-v1-5", motion_adapter=adapter)
output = pipe(prompt="neon samurai walking under rain", num_frames=16, guidance_scale=7.5)`,
  },
  // 3. Music
  {
    id: 'audiocraft-musicgen',
    name: 'AudioCraft / MusicGen (Meta)',
    repo: 'facebookresearch/audiocraft',
    category: 'music',
    description: 'El referente mundial de código abierto para generar música estéreo de alta fidelidad condicionada por texto y BPM.',
    stars: '20.6k',
    installCommand: 'pip install git+https://github.com/facebookresearch/audiocraft.git',
    minimalSnippet: `from audiocraft.models import MusicGen
from audiocraft.data.audio import audio_write

model = MusicGen.get_pretrained('facebook/musicgen-medium')
model.set_generation_params(duration=15) # 15 segundos

descriptions = ['synthwave 1984 driving music with analog 808 drums and 120 bpm arpeggios']
wav = model.generate(descriptions) # tensor [1, 1, 32000*15]

for idx, one_wav in enumerate(wav):
    audio_write(f'musicgen_track_{idx}', one_wav.cpu(), model.sample_rate, strategy="loudness")`,
  },
  {
    id: 'transformers-music',
    name: 'HuggingFace MusicGen',
    repo: 'huggingface/transformers',
    category: 'music',
    description: 'Pipeline integrado en transformers para inferencia ultraligera en PyTorch con soporte para GPU y CPU.',
    stars: '135k',
    installCommand: 'pip install transformers scipy torch',
    minimalSnippet: `from transformers import AutoProcessor, MusicgenForConditionalGeneration
import scipy

processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")

inputs = processor(text=["lo-fi study chill beats with rain sound"], padding=True, return_tensors="pt")
audio_values = model.generate(**inputs, max_new_tokens=256)
scipy.io.wavfile.write("musicgen_hf.wav", rate=32000, data=audio_values[0, 0].numpy())`,
  },
];

// Helper to generate aesthetic procedural image data based on prompt
export function generateProceduralImageFromPrompt(
  config: ImagePromptConfig
): GeneratedImageResult {
  const p = config.prompt.toLowerCase();
  const seed = config.seed || Math.floor(Math.random() * 999999);

  // Palette based on style/prompt
  let c1 = '#090d16';
  let c2 = '#1e1b4b';
  let accent = '#06b6d4';
  let glow = '#3b82f6';

  if (config.style === 'cyberpunk' || p.includes('cyber') || p.includes('neon')) {
    c1 = '#050014';
    c2 = '#3b0764';
    accent = '#00f0ff';
    glow = '#ff007f';
  } else if (config.style === 'anime_manga' || p.includes('anime')) {
    c1 = '#0f172a';
    c2 = '#4c1d95';
    accent = '#f43f5e';
    glow = '#fb923c';
  } else if (config.style === 'photorealistic' || p.includes('nature') || p.includes('real')) {
    c1 = '#06130d';
    c2 = '#134e4a';
    accent = '#10b981';
    glow = '#34d399';
  } else if (config.style === 'retro_pixel' || p.includes('pixel') || p.includes('retro')) {
    c1 = '#18181b';
    c2 = '#27272a';
    accent = '#facc15';
    glow = '#ef4444';
  }

  // Dimensions
  const w = config.aspectRatio === '16:9' ? 960 : config.aspectRatio === '9:16' ? 540 : 768;
  const h = config.aspectRatio === '16:9' ? 540 : config.aspectRatio === '9:16' ? 960 : 768;

  // Generate SVG Image Content
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="60%" stop-color="${c2}" />
        <stop offset="100%" stop-color="${c1}" />
      </linearGradient>
      <radialGradient id="sunGlow" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stop-color="${glow}" stop-opacity="0.9" />
        <stop offset="50%" stop-color="${accent}" stop-opacity="0.4" />
        <stop offset="100%" stop-color="transparent" stop-opacity="0" />
      </radialGradient>
      <filter id="neonBlur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="16" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    
    <rect width="${w}" height="${h}" fill="url(#bg)" />
    
    <!-- Sun / Focal Celestial Core -->
    <circle cx="${w * 0.5}" cy="${h * 0.42}" r="${Math.min(w, h) * 0.24}" fill="url(#sunGlow)" />
    <circle cx="${w * 0.5}" cy="${h * 0.42}" r="${Math.min(w, h) * 0.12}" fill="${accent}" opacity="0.8" filter="url(#neonBlur)" />
    
    <!-- Perspective Horizon Grid -->
    <g stroke="${accent}" stroke-width="1.2" opacity="0.6">
      ${Array.from({ length: 18 })
        .map((_, i) => {
          const x = (w / 18) * i;
          return `<line x1="${x}" y1="${h}" x2="${w * 0.5}" y2="${h * 0.55}" />`;
        })
        .join('')}
      ${Array.from({ length: 8 })
        .map((_, i) => {
          const y = h * 0.55 + (h * 0.45) * Math.pow(i / 8, 1.8);
          return `<line x1="0" y1="${y}" x2="${w}" y2="${y}" />`;
        })
        .join('')}
    </g>
    
    <!-- Foreground Elements & Cyberpunk Skyline / Shards -->
    <polygon points="${w * 0.2},${h} ${w * 0.28},${h * 0.48} ${w * 0.36},${h}" fill="#080b12" stroke="${glow}" stroke-width="1" />
    <polygon points="${w * 0.65},${h} ${w * 0.74},${h * 0.42} ${w * 0.82},${h}" fill="#0a0d16" stroke="${accent}" stroke-width="1" />
    <polygon points="${w * 0.44},${h} ${w * 0.5},${h * 0.35} ${w * 0.56},${h}" fill="#05070d" stroke="${glow}" stroke-width="1.5" />
    
    <!-- Prompt Watermark Overlay -->
    <rect x="24" y="${h - 60}" width="${w - 48}" height="42" rx="6" fill="#030712" fill-opacity="0.85" stroke="#1f2937" />
    <text x="40" y="${h - 35}" fill="#f3f4f6" font-family="monospace" font-size="13" font-weight="bold">${escapeXml(
    config.prompt.toUpperCase().slice(0, 70)
  )}</text>
    <text x="${w - 40}" y="${h - 35}" fill="${accent}" font-family="monospace" font-size="11" text-anchor="end">${config.pipeline.toUpperCase()} // SEED: ${seed}</text>
  </svg>`;

  const svgBase64 = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  // Generate Python Diffusers script
  const pythonScript = `# Generador de Imagen generado por GLaDOS OS via GitHub: huggingface/diffusers
import torch
from diffusers import FluxPipeline, AutoencoderKL

print("Inicializando pipeline ${config.pipeline}...")
pipe = FluxPipeline.from_pretrained(
    "black-forest-labs/FLUX.1-dev",
    torch_dtype=torch.bfloat16
)
pipe.enable_model_cpu_offload()

generator = torch.Generator(device="cuda").manual_seed(${seed})

image = pipe(
    prompt="${config.prompt.replace(/"/g, '\\"')}",
    negative_prompt="${config.negativePrompt.replace(/"/g, '\\"')}",
    height=${h},
    width=${w},
    guidance_scale=${config.guidanceScale},
    num_inference_steps=${config.steps},
    generator=generator
).images[0]

image.save("glados_image_${seed}.png")
print("Imagen guardada exitosamente en glados_image_${seed}.png")
`;

  // ComfyUI Workflow JSON format
  const comfyUiWorkflowJson = JSON.stringify(
    {
      "3": {
        "inputs": {
          "seed": seed,
          "steps": config.steps,
          "cfg": config.guidanceScale,
          "sampler_name": config.sampler.toLowerCase().replace(/\s+/g, '_'),
          "scheduler": "karras",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": { "ckpt_name": "flux1-dev.safetensors" },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": { "width": w, "height": h, "batch_size": 1 },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": { "text": config.prompt, "clip": ["4", 1] },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": { "text": config.negativePrompt, "clip": ["4", 1] },
        "class_type": "CLIPTextEncode"
      }
    },
    null,
    2
  );

  return {
    id: `img_${Date.now()}`,
    imageUrl: svgBase64,
    prompt: config.prompt,
    style: config.style,
    aspectRatio: config.aspectRatio,
    seed,
    gitRepo: 'black-forest-labs/flux & huggingface/diffusers',
    pythonScript,
    comfyUiWorkflowJson,
    timestamp: new Date().toLocaleTimeString(),
  };
}

// Helper to escape XML
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

// Helper for Video Generation from Prompt
export function generateVideoPlanFromPrompt(config: VideoPromptConfig): GeneratedVideoResult {
  const pythonScript = `# Script de Generación de Video Text-to-Video generado por GLaDOS OS
# Repositorio oficial: https://github.com/THUDM/CogVideoX & huggingface/diffusers
import torch
from diffusers import CogVideoXPipeline
from diffusers.utils import export_to_video

prompt = "${config.prompt.replace(/"/g, '\\"')}"
print(f"Cargando modelo CogVideoX-5B para movimiento: ${config.cameraMotion}...")

pipe = CogVideoXPipeline.from_pretrained(
    "THUDM/CogVideoX-5b",
    torch_dtype=torch.bfloat16
)
pipe.enable_model_cpu_offload()

video_frames = pipe(
    prompt=prompt,
    num_videos_per_prompt=1,
    num_inference_steps=50,
    num_frames=49,
    guidance_scale=6.0,
    generator=torch.Generator(device="cuda").manual_seed(42)
).frames[0]

export_to_video(video_frames, "output_video.mp4", fps=${config.fps})
print("Video renderizado exitosamente a output_video.mp4")
`;

  const ffmpegCommand = `# Comando de renderizado con aceleración por hardware
ffmpeg -y -f lavfi -i color=c=0x06080e:s=1280x720:r=${config.fps}:d=${config.durationSeconds} \\
  -filter_complex "drawtext=text='${config.prompt.slice(0, 40)}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2" \\
  -c:v libx264 -pix_fmt yuv420p output.mp4`;

  const remotionScript = `import { Composition } from 'remotion';
import { CameraScene } from './CameraScene';

export const VideoComposition = () => (
  <Composition
    id="AIVideo"
    component={CameraScene}
    durationInFrames={${config.durationSeconds * config.fps}}
    fps={${config.fps}}
    width={1280}
    height={720}
    defaultProps={{
      prompt: "${config.prompt}",
      cameraMotion: "${config.cameraMotion}"
    }}
  />
);`;

  return {
    id: `vid_${Date.now()}`,
    title: config.prompt.slice(0, 32) || 'Video Text-to-Video',
    prompt: config.prompt,
    cameraMotion: config.cameraMotion,
    durationSeconds: config.durationSeconds,
    fps: config.fps,
    gitRepo: 'THUDM/CogVideoX & guoyww/AnimateDiff',
    pythonScript,
    ffmpegCommand,
    remotionScript,
    timestamp: new Date().toLocaleTimeString(),
  };
}

// Helper for Music Generation from Prompt
export function generateMusicPlanFromPrompt(config: MusicPromptConfig): GeneratedMusicResult {
  const p = config.prompt.toLowerCase();

  let bpm = config.bpm || 120;
  if (p.includes('140')) bpm = 140;
  else if (p.includes('130')) bpm = 130;
  else if (p.includes('80') || p.includes('lofi') || p.includes('chill')) bpm = 84;
  else if (p.includes('150') || p.includes('chiptune') || p.includes('arcade')) bpm = 150;

  const instrumentsUsed = [
    'Sub-Bass 808',
    'Analog Acid Filter Lead',
    'Stereo Hi-Hat Rolls',
    'Punchy Snare Noise',
    'Arpeggiated Polyphonic Synth',
  ];

  const pythonScript = `# Script de Generación Musical con Meta AudioCraft / MusicGen
# Repositorio oficial: https://github.com/facebookresearch/audiocraft
from audiocraft.models import MusicGen
from audiocraft.data.audio import audio_write

print("Descargando checkpoint facebook/musicgen-medium de HuggingFace...")
model = MusicGen.get_pretrained('facebook/musicgen-medium')
model.set_generation_params(duration=${config.durationSeconds})

prompt = "${config.prompt.replace(/"/g, '\\"')}"
print(f"Generando pista a {${bpm}} BPM con prompt: '{prompt}'...")

wav = model.generate([prompt])

for idx, one_wav in enumerate(wav):
    audio_write(f"generated_track_{idx}", one_wav.cpu(), model.sample_rate, strategy="loudness")
print("Archivo generado exitosamente en generated_track_0.wav")
`;

  return {
    id: `mus_${Date.now()}`,
    title: config.prompt.slice(0, 32) || 'Procedural Audio Track',
    prompt: config.prompt,
    genre: config.genre,
    bpm,
    scaleKey: config.scaleKey,
    scaleMode: config.scaleMode,
    gitRepo: 'facebookresearch/audiocraft (Meta MusicGen)',
    pythonScript,
    instrumentsUsed,
    explanation: `Pista sintetizada mediante escala ${config.scaleMode} en tono ${config.scaleKey} a ${bpm} BPM. Orquestada con capas rítmicas euclidianas y síntesis sustractiva inspirada en MusicGen.`,
    timestamp: new Date().toLocaleTimeString(),
  };
}
