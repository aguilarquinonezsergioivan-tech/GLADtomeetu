import { AIModelProfile, HardwareVramProfile } from '../types/glados';

export const AI_MODELS: AIModelProfile[] = [
  {
    id: 'qwen2.5-coder:1.5b',
    name: 'Qwen 2.5 Coder 1.5B (GGUF Q4)',
    provider: 'local-gguf',
    vramRequiredGb: 2.0,
    description: 'Ultra-ligero para laptops sin GPU dedicada (CPU/RAM compartida). Respuestas de código instantáneas.',
    recommendedHardware: 'Laptops básicas (Intel Iris / AMD iGPU / 8GB RAM)',
    specialty: 'code',
  },
  {
    id: 'qwen2.5-coder:7b',
    name: 'Qwen 2.5 Coder 7B (Ollama Default)',
    provider: 'ollama',
    vramRequiredGb: 5.5,
    description: 'El motor principal de GLaDOS OS. Gran equilibrio entre razonamiento técnico y velocidad.',
    recommendedHardware: 'Laptops gamers o PCs con RTX 3050/4050/3060 (6-8 GB VRAM)',
    specialty: 'code',
  },
  {
    id: 'llama-3.2:3b',
    name: 'Llama 3.2 3B Instruct',
    provider: 'ollama',
    vramRequiredGb: 3.2,
    description: 'Excelente para consultas generales, planificación de tareas y llamadas a herramientas ligeras.',
    recommendedHardware: 'Cualquier laptop moderna con 8GB+ RAM',
    specialty: 'general',
  },
  {
    id: 'qwen2.5-coder:14b',
    name: 'Qwen 2.5 Coder 14B (Cuantizado Q4/Q8)',
    provider: 'ollama',
    vramRequiredGb: 11.2,
    description: 'Nivel Senior Engineer. Capacidad profunda para refactorización de repositorios masivos y REA.',
    recommendedHardware: 'PCs con 12 a 16 GB VRAM (RTX 3060 12GB / RTX 4070 / RTX 4080)',
    specialty: 'code',
  },
  {
    id: 'deepseek-coder:14b',
    name: 'DeepSeek Coder 14B v1.5',
    provider: 'ollama',
    vramRequiredGb: 12.0,
    description: 'Especialista en desensamblado, ingeniería inversa MIPS/x86 y arquitecturas de bajo nivel.',
    recommendedHardware: 'PCs con 16 GB VRAM dedicada',
    specialty: 'reasoning',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (Cloud Router)',
    provider: 'gemini',
    vramRequiredGb: 0,
    description: 'Velocidad extrema en la nube. 0% consumo de VRAM en tu laptop. Multimodal con soporte de imágenes.',
    recommendedHardware: 'Cualquier dispositivo con conexión a internet',
    specialty: 'vision',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Arquitecto Principal)',
    provider: 'gemini',
    vramRequiredGb: 0,
    description: 'Máxima potencia de deducción lógica y síntesis para el Modo Arquitecto y Function Calling.',
    recommendedHardware: 'Cualquier dispositivo con conexión a internet',
    specialty: 'reasoning',
  },
];

export const VRAM_PROFILES: {
  id: HardwareVramProfile;
  label: string;
  vramRange: string;
  description: string;
  suggestedModels: string[];
}[] = [
  {
    id: 'laptop-4gb',
    label: 'Portátil Básica (4 - 6 GB VRAM / CPU)',
    vramRange: '4-6 GB',
    description: 'Optimizado para no saturar memoria ni congelar la pantalla. Modelos compactos y cuantizados.',
    suggestedModels: ['qwen2.5-coder:1.5b', 'llama-3.2:3b', 'qwen2.5-coder:7b'],
  },
  {
    id: 'desktop-8-12gb',
    label: 'PC Intermedia (8 - 12 GB VRAM)',
    vramRange: '8-12 GB',
    description: 'Flujo de trabajo fluido con Qwen 7B completo y render 3D sin throttling.',
    suggestedModels: ['qwen2.5-coder:7b', 'llama-3.2:3b', 'gemini-3.8-flash'],
  },
  {
    id: 'workstation-16gb',
    label: 'Workstation Pesada (16 GB VRAM)',
    vramRange: '16+ GB',
    description: 'Permite correr modelos de 14B parámetros directamente en GPU con simultaneidad FEA y CAD.',
    suggestedModels: ['qwen2.5-coder:14b', 'deepseek-coder:14b', 'gemini-3.8-flash'],
  },
  {
    id: 'cloud-api',
    label: 'Nube Directa / API (0 GB VRAM local)',
    vramRange: '0 GB (Cloud)',
    description: 'Toda la inferencia se procesa en servidores de Google. Tu laptop queda 100% fresca y libre.',
    suggestedModels: ['gemini-3.8-flash', 'gemini-3.1-pro-preview'],
  },
];
