import { VideoSceneConfig, VideoStyle } from '../types/mediaStudio';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  time: number; // seconds
  freqData: Uint8Array;
  timeData: Uint8Array;
  bpm: number;
  config: VideoSceneConfig;
}

export class VideoRenderEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private startTime = 0;
  private isRendering = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private onRecordProgress?: (percent: number) => void;

  public init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
  }

  public renderFrame(
    time: number,
    freqData: Uint8Array,
    timeData: Uint8Array,
    bpm: number,
    config: VideoSceneConfig
  ) {
    if (!this.canvas || !this.ctx) return;
    const { width, height } = this.canvas;

    const renderCtx: RenderContext = {
      canvas: this.canvas,
      ctx: this.ctx,
      time,
      freqData,
      timeData,
      bpm,
      config,
    };

    // Calculate audio energy metrics
    let bassEnergy = 0;
    for (let i = 0; i < 8 && i < freqData.length; i++) {
      bassEnergy += freqData[i];
    }
    bassEnergy = (bassEnergy / (8 * 255)) * config.reactiveSensitivity;

    let midEnergy = 0;
    for (let i = 8; i < 32 && i < freqData.length; i++) {
      midEnergy += freqData[i];
    }
    midEnergy = (midEnergy / (24 * 255)) * config.reactiveSensitivity;

    // Clear background
    this.ctx.fillStyle = '#06080e';
    this.ctx.fillRect(0, 0, width, height);

    // Style-specific renderer
    switch (config.style) {
      case 'cyberpunk_grid':
        this.renderCyberpunkGrid(renderCtx, bassEnergy, midEnergy);
        break;
      case 'audio_spectrum':
        this.renderAudioSpectrum(renderCtx, bassEnergy, midEnergy);
        break;
      case 'particle_galaxy':
        this.renderParticleGalaxy(renderCtx, bassEnergy, midEnergy);
        break;
      case 'matrix_digital_rain':
        this.renderMatrixRain(renderCtx, bassEnergy, midEnergy);
        break;
      case 'lofi_retro_crt':
        this.renderLofiCrt(renderCtx, bassEnergy, midEnergy);
        break;
      case 'tunnel_hypnotic':
        this.renderTunnelHypnotic(renderCtx, bassEnergy, midEnergy);
        break;
      case 'kinetic_typography':
      default:
        this.renderKineticTypography(renderCtx, bassEnergy, midEnergy);
        break;
    }

    // Title & Overlays
    this.renderTextOverlays(renderCtx, bassEnergy);
    this.renderPostProcessing(renderCtx, bassEnergy);
  }

  // 1. Cyberpunk 3D Retro Grid & Synthwave Sun
  private renderCyberpunkGrid(
    { ctx, canvas, time, config }: RenderContext,
    bassEnergy: number,
    midEnergy: number
  ) {
    const { width, height } = canvas;
    const horizonY = height * 0.55;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, '#0a001a');
    skyGrad.addColorStop(0.7, '#240046');
    skyGrad.addColorStop(1, '#ff0055');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY);

    // Synthwave Sun
    const sunRadius = Math.min(width, height) * (0.2 + bassEnergy * 0.05);
    const sunX = width * 0.5;
    const sunY = horizonY - sunRadius * 0.4;

    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
    sunGrad.addColorStop(0, '#ffea00');
    sunGrad.addColorStop(0.6, '#ff007f');
    sunGrad.addColorStop(1, '#7928ca');

    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = sunGrad;
    ctx.fill();

    // Horizontal sun cut lines (retro synthwave blinds)
    ctx.fillStyle = '#0a001a';
    const numBars = 7;
    for (let i = 0; i < numBars; i++) {
      const barY = sunY + (sunRadius * (i / numBars)) * 0.9;
      const barH = 2 + i * 2.5;
      ctx.fillRect(sunX - sunRadius, barY, sunRadius * 2, barH);
    }
    ctx.restore();

    // Floor Ground Gradient
    const floorGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    floorGrad.addColorStop(0, '#05010d');
    floorGrad.addColorStop(1, '#1f0038');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // 3D Perspective Wireframe Grid
    ctx.save();
    ctx.strokeStyle = config.primaryColor || '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = config.primaryColor || '#00f0ff';
    ctx.shadowBlur = 8 + bassEnergy * 15;

    // Perspective lines emanating from center horizon
    const numPerspLines = 28;
    for (let i = -numPerspLines; i <= numPerspLines; i++) {
      const bottomX = width * 0.5 + i * (width / 14);
      ctx.beginPath();
      ctx.moveTo(width * 0.5, horizonY);
      ctx.lineTo(bottomX, height);
      ctx.stroke();
    }

    // Moving horizontal grid lines (scrolling towards camera)
    const speed = (time * 120 * config.cameraSpeed) % 40;
    const numHorizLines = 14;
    for (let i = 1; i <= numHorizLines; i++) {
      const progress = (i * 40 - speed) / (numHorizLines * 40);
      if (progress <= 0 || progress > 1) continue;
      // Exponential curve for 3D depth perception
      const lineY = horizonY + Math.pow(progress, 2.2) * (height - horizonY);
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(width, lineY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Audio Spectrum & Circular Oscilloscope
  private renderAudioSpectrum(
    { ctx, canvas, time, freqData, config }: RenderContext,
    bassEnergy: number,
    midEnergy: number
  ) {
    const { width, height } = canvas;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const baseRadius = Math.min(width, height) * 0.22 + bassEnergy * 30;

    // Background radial glow
    const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, baseRadius * 1.8);
    glow.addColorStop(0, `${config.primaryColor}22`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Circular Bars
    const numBars = 64;
    const angleStep = (Math.PI * 2) / numBars;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.2);

    for (let i = 0; i < numBars; i++) {
      const dataIdx = Math.floor((i / numBars) * (freqData.length * 0.7));
      const val = (freqData[dataIdx] || 0) / 255;
      const barLen = val * (height * 0.22) * config.reactiveSensitivity;

      const angle = i * angleStep;
      const x1 = Math.cos(angle) * baseRadius;
      const y1 = Math.sin(angle) * baseRadius;
      const x2 = Math.cos(angle) * (baseRadius + barLen);
      const y2 = Math.sin(angle) * (baseRadius + barLen);

      ctx.strokeStyle = i % 2 === 0 ? config.primaryColor : config.secondaryColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = config.primaryColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Inner pulsing core
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = `${config.accentColor || '#ff007f'}33`;
    ctx.fill();
    ctx.strokeStyle = config.accentColor || '#ff007f';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  // 3. Particle Galaxy Swarm
  private renderParticleGalaxy(
    { ctx, canvas, time, config }: RenderContext,
    bassEnergy: number,
    midEnergy: number
  ) {
    const { width, height } = canvas;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const numParticles = 140;

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < numParticles; i++) {
      const angle = i * 0.18 + time * (0.3 + (i % 3) * 0.1);
      const dist = (i * 3 + time * 40 * config.cameraSpeed) % (Math.min(width, height) * 0.45);
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist * 0.7; // elliptical perspective

      const size = (1.5 + (dist / 120)) * (1 + bassEnergy * 0.8);
      ctx.fillStyle = i % 3 === 0 ? config.primaryColor : i % 3 === 1 ? config.secondaryColor : '#ffffff';
      ctx.shadowColor = config.primaryColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Matrix Digital Rain
  private renderMatrixRain(
    { ctx, canvas, time, config }: RenderContext,
    bassEnergy: number,
    midEnergy: number
  ) {
    const { width, height } = canvas;
    const cols = 36;
    const colWidth = width / cols;
    const chars = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';

    ctx.font = '14px monospace';
    ctx.fillStyle = config.primaryColor || '#00ff66';
    ctx.shadowColor = config.primaryColor || '#00ff66';
    ctx.shadowBlur = 4;

    for (let i = 0; i < cols; i++) {
      const speed = 80 + (i * 37) % 120;
      const yPos = ((time * speed * config.cameraSpeed) + i * 50) % (height + 100) - 50;
      const char = chars[(Math.floor(time * 10) + i) % chars.length];

      ctx.fillStyle = i % 4 === 0 ? '#ffffff' : config.primaryColor;
      ctx.fillText(char, i * colWidth + 5, yPos);

      // Tail trail
      for (let t = 1; t <= 5; t++) {
        const trailChar = chars[(i + t * 3) % chars.length];
        ctx.fillStyle = `${config.primaryColor}${Math.floor(255 * (1 - t / 6)).toString(16).padStart(2, '0')}`;
        ctx.fillText(trailChar, i * colWidth + 5, yPos - t * 18);
      }
    }
  }

  // 5. Lo-Fi Retro VHS CRT
  private renderLofiCrt(
    { ctx, canvas, time, timeData, config }: RenderContext,
    bassEnergy: number,
    midEnergy: number
  ) {
    const { width, height } = canvas;

    // Gradient retro background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#120b1e');
    bgGrad.addColorStop(1, '#2c1538');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Audio Oscilloscope Wave in center
    ctx.save();
    ctx.strokeStyle = config.primaryColor || '#ff90e8';
    ctx.lineWidth = 3;
    ctx.shadowColor = config.primaryColor || '#ff90e8';
    ctx.shadowBlur = 12;
    ctx.beginPath();

    const sliceWidth = width / timeData.length;
    let x = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * (height * 0.2)) + height * 0.45;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.restore();

    // Vintage Cassette Frame
    const boxW = width * 0.7;
    const boxH = height * 0.45;
    const boxX = (width - boxW) / 2;
    const boxY = (height - boxH) / 2;

    ctx.strokeStyle = '#4a3359';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Spools
    const spoolR = boxH * 0.22;
    const spool1X = boxX + boxW * 0.3;
    const spool2X = boxX + boxW * 0.7;
    const spoolY = boxY + boxH * 0.5;

    ctx.save();
    ctx.translate(spool1X, spoolY);
    ctx.rotate(time * 1.5);
    ctx.strokeStyle = '#ffb300';
    ctx.strokeRect(-spoolR / 2, -spoolR / 2, spoolR, spoolR);
    ctx.restore();

    ctx.save();
    ctx.translate(spool2X, spoolY);
    ctx.rotate(time * 1.5);
    ctx.strokeStyle = '#ffb300';
    ctx.strokeRect(-spoolR / 2, -spoolR / 2, spoolR, spoolR);
    ctx.restore();
  }

  // 6. Hypnotic Tunnel
  private renderTunnelHypnotic(
    { ctx, canvas, time, config }: RenderContext,
    bassEnergy: number,
    midEnergy: number
  ) {
    const { width, height } = canvas;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const numRings = 18;

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = numRings; i >= 1; i--) {
      const progress = ((time * 0.8 * config.cameraSpeed + i / numRings) % 1);
      const r = Math.pow(progress, 2.5) * (Math.max(width, height) * 0.75);
      const rot = progress * Math.PI * 2;

      ctx.save();
      ctx.rotate(rot);
      ctx.strokeStyle = i % 2 === 0 ? config.primaryColor : config.secondaryColor;
      ctx.lineWidth = 2 + bassEnergy * 4;
      ctx.shadowColor = config.primaryColor;
      ctx.shadowBlur = 8;

      // Hexagonal tunnel
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = (s * Math.PI * 2) / 6;
        const hx = Math.cos(a) * r;
        const hy = Math.sin(a) * r;
        if (s === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 7. Kinetic Typography & Titles
  private renderKineticTypography(
    { ctx, canvas, time, config }: RenderContext,
    bassEnergy: number,
    midEnergy: number
  ) {
    const { width, height } = canvas;
    const cx = width * 0.5;
    const cy = height * 0.5;

    // Glowing background grid
    ctx.strokeStyle = '#182030';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Dynamic Central Crosshair
    ctx.strokeStyle = config.primaryColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = config.primaryColor;
    ctx.shadowBlur = 10;

    const crossSize = 40 + bassEnergy * 20;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();
  }

  // Text Title & Subtitle overlay
  private renderTextOverlays({ ctx, canvas, config }: RenderContext, bassEnergy: number) {
    const { width, height } = canvas;

    if (config.mainTitle) {
      ctx.save();
      const fontSize = Math.max(16, Math.floor(width * 0.045 * (1 + bassEnergy * 0.08)));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = config.primaryColor || '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.fillText(config.mainTitle.toUpperCase(), width * 0.5, height * 0.28);
      ctx.restore();
    }

    if (config.subTitle) {
      ctx.save();
      const subFontSize = Math.max(11, Math.floor(width * 0.022));
      ctx.font = `500 ${subFontSize}px monospace`;
      ctx.fillStyle = config.accentColor || '#facc15';
      ctx.textAlign = 'center';
      ctx.fillText(config.subTitle, width * 0.5, height * 0.35);
      ctx.restore();
    }

    // Bottom Timecode / GLaDOS watermark
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText('REC // GLaDOS OS AUDIOVISUAL ENGINE', 16, height - 16);
    ctx.textAlign = 'right';
    ctx.fillText(`${config.fps} FPS · ${config.aspectRatio}`, width - 16, height - 16);
    ctx.restore();
  }

  // Post-processing: Scanlines, Vignette, Glitch
  private renderPostProcessing({ ctx, canvas, time, config }: RenderContext, bassEnergy: number) {
    const { width, height } = canvas;

    // Scanlines
    if (config.overlayScanlines) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }
    }

    // Vignette
    if (config.overlayVignette) {
      const vGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.4,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      vGrad.addColorStop(0, 'transparent');
      vGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Occasional bass-reactive glitch slice
    if (config.overlayGlitch && (bassEnergy > 1.2 || Math.random() < 0.03)) {
      const sliceY = Math.random() * height;
      const sliceH = 10 + Math.random() * 30;
      const shiftX = (Math.random() - 0.5) * 20;

      ctx.save();
      ctx.drawImage(canvas, 0, sliceY, width, sliceH, shiftX, sliceY, width, sliceH);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.fillRect(0, sliceY, width, sliceH);
      ctx.restore();
    }
  }

  // Record direct WebM video with synchronized audio in-browser!
  public async recordVideoClip(
    audioStreamDestination: MediaStreamAudioDestinationNode,
    durationSeconds = 10,
    fps = 30,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    if (!this.canvas) throw new Error('Canvas no inicializado');

    this.recordedChunks = [];
    this.onRecordProgress = onProgress;

    // Get Canvas video stream
    const canvasStream = this.canvas.captureStream(fps);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStreamDestination.stream.getAudioTracks(),
    ]);

    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    let selectedMime = 'video/webm';
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    return new Promise((resolve, reject) => {
      try {
        this.mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType: selectedMime,
          videoBitsPerSecond: 4_500_000,
        });

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: selectedMime });
          resolve(blob);
        };

        this.mediaRecorder.onerror = (e) => reject(e);

        this.mediaRecorder.start(250); // Slice chunks every 250ms

        const startTime = Date.now();
        const interval = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          const pct = Math.min(100, Math.round((elapsed / durationSeconds) * 100));
          if (this.onRecordProgress) this.onRecordProgress(pct);

          if (elapsed >= durationSeconds) {
            clearInterval(interval);
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
              this.mediaRecorder.stop();
            }
          }
        }, 100);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Generates complete Remotion (React Video) repository export files
  public generateRemotionProjectFiles(config: VideoSceneConfig): Record<string, string> {
    return {
      'package.json': JSON.stringify(
        {
          name: 'glados-remotion-video',
          version: '1.0.0',
          scripts: {
            start: 'remotion preview src/Root.tsx',
            build: 'remotion render src/Root.tsx MainComposition out/video.mp4',
          },
          dependencies: {
            remotion: '^4.0.0',
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
        },
        null,
        2
      ),
      'src/Root.tsx': `import React from 'react';
import { Composition } from 'remotion';
import { VideoScene } from './VideoScene';

export const Root: React.FC = () => {
  return (
    <Composition
      id="MainComposition"
      component={VideoScene}
      durationInFrames={${config.durationSeconds * config.fps}}
      fps={${config.fps}}
      width={${config.aspectRatio === '9:16' ? 1080 : config.aspectRatio === '1:1' ? 1080 : 1920}}
      height={${config.aspectRatio === '9:16' ? 1920 : config.aspectRatio === '1:1' ? 1080 : 1080}}
      defaultProps={{
        title: '${config.mainTitle}',
        subtitle: '${config.subTitle}',
        primaryColor: '${config.primaryColor}',
      }}
    />
  );
};
`,
      'src/VideoScene.tsx': `import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const VideoScene: React.FC<{ title: string; subtitle: string; primaryColor: string }> = ({
  title,
  subtitle,
  primaryColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const scale = interpolate(frame, [0, 30, 90], [0.8, 1.05, 1], {
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(frame, [0, 20], [0, 1]);

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#070a13',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
        fontFamily: 'monospace',
      }}
    >
      <h1
        style={{
          fontSize: width * 0.06,
          color: primaryColor,
          transform: \`scale(\${scale})\`,
          opacity,
          textShadow: \`0 0 30px \${primaryColor}\`,
          margin: 0,
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: width * 0.025, color: '#94a3b8', marginTop: 16 }}>{subtitle}</p>
    </div>
  );
};
`,
    };
  }

  // Generates FFmpeg CLI filter graph command
  public generateFfmpegCommand(config: VideoSceneConfig): string {
    const w = config.aspectRatio === '9:16' ? 1080 : config.aspectRatio === '1:1' ? 1080 : 1920;
    const h = config.aspectRatio === '9:16' ? 1920 : config.aspectRatio === '1:1' ? 1080 : 1080;

    return `# Comando FFmpeg generado por GLaDOS OS Video Engine
ffmpeg -y -f lavfi -i color=c=0x070a13:s=${w}x${h}:r=${config.fps}:d=${config.durationSeconds} \\
  -i audio_track.wav \\
  -filter_complex "[1:a]showwaves=s=${w}x${Math.round(h * 0.25)}:mode=line:colors=${config.primaryColor.replace('#', '0x')}[wave]; \\
  [0:v][wave]overlay=(W-w)/2:(H-h)/2[v1]; \\
  [v1]drawtext=text='${config.mainTitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h*0.25, \\
  drawtext=text='${config.subTitle}':fontcolor=${config.accentColor.replace('#', '0x')}:fontsize=24:x=(w-text_w)/2:y=h*0.35[outv]" \\
  -map "[outv]" -map 1:a -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k glados_render.mp4`;
  }
}
