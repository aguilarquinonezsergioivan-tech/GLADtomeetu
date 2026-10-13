/**
 * General AI Service & Knowledge Base
 * Permite a GLaDOS funcionar como una IA general completa (solucionar dudas, dar explicaciones,
 * resolver problemas técnicos, escribir código y proporcionar diagnósticos paso a paso),
 * integrando además detección inteligente de comandos agénticos para no confundir preguntas generales.
 */

export interface ToolIntentCheck {
  isTool: boolean;
  tool?: string;
  args?: Record<string, unknown>;
}

/**
 * Detecta si el prompt del usuario es explícitamente una orden para ejecutar
 * una herramienta del sistema de archivos local / hardware de GLaDOS OS.
 */
export function detectAgenticToolIntent(prompt: string): ToolIntentCheck {
  const p = prompt.trim().toLowerCase();

  // 1. scan_folder: Debe ser una orden explícita para escanear/listar archivos de disco
  const isScanCmd =
    (p.includes('escan') || p.includes('scan')) &&
    (p.includes('carpeta') || p.includes('directorio') || p.includes('archivos') || p.includes('ruta'));
  if (isScanCmd) {
    const pathMatch = prompt.match(/(?:en|ruta|path|carpeta)\s+['"`]([^'"`]+)['"`]/i);
    return {
      isTool: true,
      tool: 'scan_folder',
      args: { path: pathMatch ? pathMatch[1] : 'C:/Projects/Workspace' },
    };
  }

  // 2. read_binary_nif: Debe ser una orden para inspeccionar/leer un binario NIF de Fallout/Skyrim
  const isNifCmd =
    (p.includes('leer') || p.includes('inspecciona') || p.includes('analiza') || p.includes('parsear') || p.includes('read')) &&
    (p.includes('.nif') || p.includes('binario nif') || p.includes('nif binario'));
  if (isNifCmd) {
    const fileMatch = prompt.match(/([a-zA-Z0-9_\-]+\.nif)/i);
    return {
      isTool: true,
      tool: 'read_binary_nif',
      args: { filepath: fileMatch ? fileMatch[1] : 'PlasmaCarbine_Receiver.nif' },
    };
  }

  // 3. generate_cad_dxf: Debe ser una orden de diseño o exportación de plano CAD DXF
  const isCadCmd =
    (p.includes('genera') || p.includes('diseña') || p.includes('crear') || p.includes('exportar')) &&
    (p.includes('dxf') || p.includes('plano cad') || p.includes('placa parametrica') || p.includes('placa paramétrica'));
  if (isCadCmd) {
    const widthMatch = prompt.match(/ancho\s+(?:de\s+)?(\d+)/i);
    const heightMatch = prompt.match(/alto\s+(?:de\s+)?(\d+)/i);
    return {
      isTool: true,
      tool: 'generate_cad_dxf',
      args: {
        width: widthMatch ? Number(widthMatch[1]) : 160,
        height: heightMatch ? Number(heightMatch[1]) : 110,
      },
    };
  }

  // 4. analyze_code_doctor: Auditoría de código del núcleo
  const isDoctorCmd =
    p.includes('code doctor') ||
    ((p.includes('audita') || p.includes('refactoriza')) && (p.includes('nucleo') || p.includes('núcleo') || p.includes('glados')));
  if (isDoctorCmd) {
    return {
      isTool: true,
      tool: 'analyze_code_doctor',
      args: {},
    };
  }

  return { isTool: false };
}

/**
 * Motor de Razonamiento y Solución de Dudas General de GLaDOS.
 * Proporciona respuestas enriquecidas, didácticas y estructuradas a cualquier duda técnica o general.
 */
export function generateGeneralAiKnowledge(prompt: string): string {
  const p = prompt.toLowerCase();

  // 1. Problemas de Rendimiento, Fugas de Memoria y Optimización
  if (p.includes('fuga') || p.includes('memory leak') || p.includes('memoria') || p.includes('optimizar') || p.includes('lento')) {
    return `### 🧠 Diagnóstico de Rendimiento & Gestión de Memoria

Las fugas de memoria (*memory leaks*) ocurren cuando un programa retiene referencias a objetos que ya no se necesitan, impidiendo que el recolector de basura (*Garbage Collector*) libere la memoria RAM.

---

#### 1. Causas Más Comunes
1. **Event Listeners huérfanos:** Agregar \`addEventListener\` sin removerlo en el ciclo de desmontaje.
2. **Timers & Intervalos activos:** \`setInterval\` o \`setTimeout\` recurrentes que mantienen referencias a closures.
3. **Cachés globales sin límite (LRU):** Diccionarios o Maps que crecen indefinidamente sin política de desalojo.
4. **Suscripciones abiertas:** Observables, WebSockets o EventEmitters no desconectados.

---

#### 2. Solución en Código (Patrón Limpio en React / TypeScript)

\`\`\`typescript
import { useEffect, useRef } from 'react';

export function useSafeSubscription(streamUrl: string) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Inicialización
    const ws = new WebSocket(streamUrl);
    wsRef.current = ws;

    const handleMessage = (event: MessageEvent) => {
      console.log('Datos recibidos:', event.data);
    };

    ws.addEventListener('message', handleMessage);

    // 2. FUNCIÓN DE LIMPIEZA OBLIGATORIA (Previene el Memory Leak)
    return () => {
      ws.removeEventListener('message', handleMessage);
      ws.close();
      wsRef.current = null;
    };
  }, [streamUrl]);
}
\`\`\`

---

#### 3. Herramientas de Auditoría Recomendadas
- **Chrome DevTools:** Pestaña *Memory* → Realiza un *Heap Snapshot* antes y después de interactuar; filtra por *Allocations on Timeline*.
- **Node.js / Python:** Ejecuta con \`node --inspect\` o en Python usa \`tracemalloc\` para detectar los bloques con mayor consumo.`;
  }

  // 2. Dudas sobre CORS y Errores de API
  if (p.includes('cors') || p.includes('access-control-allow-origin') || p.includes('api') || p.includes('error 403') || p.includes('error 500')) {
    return `### 🌐 Solución al Error de CORS (Cross-Origin Resource Sharing)

El error \`CORS policy: No 'Access-Control-Allow-Origin' header is present\` es un mecanismo de seguridad del navegador para evitar que una web en un dominio (ej: \`localhost:3000\`) lea datos de otro origen (ej: \`api.servidor.com\`) sin autorización explícita del servidor.

---

#### 1. ¿Cómo se Resuelve? (En el Servidor Backend)

En **Express (Node.js)**:
\`\`\`typescript
import cors from 'cors';
import express from 'express';

const app = express();

// Configuración recomendada para desarrollo y producción
app.use(cors({
  origin: ['http://localhost:3000', 'https://mi-dominio.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
\`\`\`

En **Python (FastAPI / Flask)**:
\`\`\`python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
\`\`\`

---

#### 2. Solución en Frontend sin tocar el Backend (Proxy de Desarrollo)
Si estás usando **Vite**, configura un proxy en \`vite.config.ts\`:
\`\`\`typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.servidor.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\\/api/, '')
      }
    }
  }
});
\`\`\`
De esta manera, el navegador hace peticiones relativas a su propio origen y Vite se encarga de transferirlas sin restricciones CORS.`;
  }

  // 3. Programación: Asincronismo, Async/Await, Promesas, Event Loop
  if (p.includes('async') || p.includes('promesa') || p.includes('await') || p.includes('event loop') || p.includes('concurrencia')) {
    return `### ⚡ Fundamentos y Dominio de Asincronismo (Event Loop & Async/Await)

En entornos de un solo hilo (*single-threaded*) como JavaScript o el GIL de Python, el asincronismo permite ejecutar tareas de I/O (lectura de disco, peticiones HTTP, temporizadores) sin congelar la interfaz de usuario ni el hilo principal.

---

#### 1. Cómo Ejecutar Múltiples Operaciones en Paralelo Seguro

\`\`\`typescript
// ❌ Error común: Esperar secuencialmente con await dentro de un bucle (Lento)
async function fetchSequential(ids: string[]) {
  for (const id of ids) {
    await fetchItem(id); // Cada uno espera a que el anterior termine
  }
}

//  Forma Óptima: Concurrencia con Promise.allSettled (Rápido y Resistente a fallos)
async function fetchConcurrent(ids: string[]) {
  const promises = ids.map((id) => fetchItem(id));
  
  // Espera a que todas finalicen sin abortar si una falla
  const results = await Promise.allSettled(promises);

  const successful = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map((r) => r.value);

  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason);

  return { successful, failed };
}
\`\`\`

---

#### 2. Regla de Oro:
- Usa \`Promise.all\` cuando requieras que **todas** tengan éxito o nada.
- Usa \`Promise.allSettled\` cuando quieras procesar las respuestas válidas y loguear los fallos individualmente sin que un error rompa todo el lote.`;
  }

  // 4. Ingeniería, Matemáticas, FEA, Esfuerzo de von Mises
  if (p.includes('mises') || p.includes('fea') || p.includes('esfuerzo') || p.includes('tension') || p.includes('tensión') || p.includes('deformacion') || p.includes('deformación') || p.includes('malla')) {
    return `### 📐 Criterio de Falla de von Mises & Análisis de Elementos Finitos (FEA)

El **esfuerzo equivalente de von Mises ($\\sigma_v$)** es un criterio fundamental en ingeniería mecánica y diseño estructural para predecir cuándo un material dúctil (como acero o aluminio 6061-T6) comenzará a fluir plásticamente bajo un estado de esfuerzos multiaxial.

---

#### 1. Ecuación Matemática de von Mises
En términos de los esfuerzos principales ($\\sigma_1, \\sigma_2, \\sigma_3$):

$$\\sigma_v = \\sqrt{\\frac{1}{2} \\left[ (\\sigma_1 - \\sigma_2)^2 + (\\sigma_2 - \\sigma_3)^2 + (\\sigma_3 - \\sigma_1)^2 \\right]}$$

#### 2. Criterio de Seguridad (Límite Elástico)
- Si **$\\sigma_v < S_y$ (Límite Elástico)**: La pieza se encuentra en **zona elástica** (al retirar la carga regresa a su forma original).
- Si **$\\sigma_v \\ge S_y$**: Ocurre **deformación plástica permanente** (inicio de falla).
- **Factor de Seguridad ($FS$):**
  $$FS = \\frac{S_y}{\\sigma_v}$$
  Un $FS \\ge 1.5$ a $2.0$ es estándar en maquinaria industrial.

---

#### 3. Implementación en Python / NumPy para FEA:
\`\`\`python
import numpy as np

def calculate_von_mises(s1: float, s2: float, s3: float) -> float:
    """Calcula el esfuerzo equivalente de von Mises a partir de esfuerzos principales en MPa."""
    term = ((s1 - s2)**2 + (s2 - s3)**2 + (s3 - s1)**2) / 2.0
    return np.sqrt(term)

# Ejemplo: Elemento sometido a tracción y corte biaxial
sigma_v = calculate_von_mises(s1=140.0, s2=45.0, s3=0.0)
yield_strength_al6061 = 276.0 # MPa
fs = yield_strength_al6061 / sigma_v

print(f"Esfuerzo von Mises: {sigma_v:.2f} MPa")
print(f"Factor de Seguridad: {fs:.2f} (Estado: {'SEGURO' if fs >= 1.5 else 'RIESGO DE FLUENCIA'})")
\`\`\``;
  }

  // 5. Modding 3D, Bethesda, Archivos NIF y Shaders
  if (p.includes('nif') || p.includes('bethesda') || p.includes('skyrim') || p.includes('fallout') || p.includes('textura') || p.includes('dds')) {
    return `### 🎮 Ingeniería Inversa de Archivos .NIF (NetImmerse / Gamebryo / Creation Engine)

Los archivos **.NIF** son contenedores binarios orientados a grafos de escena (*Scene Graph*) utilizados por motores de Bethesda Game Studios (Fallout 4, Skyrim, Starfield).

---

#### 1. Anatomía Interna de un NIF
1. **Header (Cabecera):**
   - Cadena mágica: \`Gamebryo File Format, Version 20.2.0.7\` (o \`130\` en Fallout 4 / Skyrim SE).
   - Bloque de tipos de bloques (\`Block Types\`) y mapeo de IDs.
2. **Nodos Principales:**
   - \`BSFadeNode\` o \`NiNode\`: El nodo raíz con la matriz de transformación 4x4 (traslación, rotación, escala).
   - \`BSTriShape\` (Fallout 4) o \`NiTriShape\` (Skyrim LE): Almacena los vértices, normales, UV coords y buffers de índices en GPU.
   - \`BSLightingShaderProperty\`: Define el material, flag de alpha, emisión y mapeo a shaders DirectX.
   - \`BSShaderTextureSet\`: Lista de rutas relativas a texturas en formato \`.dds\` (Diffuse, Normal BC5, Specular/Roughness BC7).

---

#### 2. Recomendaciones de Texturas DDS para Evitar Crashes
- **Albedo / Difusa:** Guardar en formato **BC7 (Linear o sRGB)** o **DXT1 / BC1** si no requiere canal alfa.
- **Normal Maps:** Usar **BC5 (ATI2 / Red-Green de 2 canales)** con el eje Y invertido según convención de DirectX (Y-).
- **Smoothness / Metalness:** Mapear en canales individuales dentro del mapa especular para evitar saturación de VRAM.`;
  }

  // 6. Python, Decoradores, Algoritmos y Clean Code
  if (p.includes('python') || p.includes('decorador') || p.includes('clase') || p.includes('algoritmo') || p.includes('codigo') || p.includes('código')) {
    return `### 🐍 Solución en Python: Arquitectura Limpia y Código Eficiente

Aquí tienes un diseño idiomático y de alto rendimiento utilizando tipos modernos, decoradores y manejo seguro de excepciones.

---

#### Ejemplo: Decorador con Caché LRU y Medición de Tiempo de Ejecución

\`\`\`python
import time
import functools
from typing import Callable, Any

def timed_cache(max_size: int = 128):
    """
    Decorador que combina memoria caché de resultados
    con medición de latencia en microsegundos.
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        cache = {}
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            if key in cache:
                return cache[key]
            
            start_time = time.perf_counter()
            result = func(*args, **kwargs)
            duration = (time.perf_counter() - start_time) * 1000
            
            if len(cache) >= max_size:
                # Expulsión simple del primer elemento (FIFO/LRU básico)
                cache.pop(next(iter(cache)))
                
            cache[key] = result
            print(f"[PERF] {func.__name__} ejecutado en {duration:.3f} ms (Cache size: {len(cache)})")
            return result
            
        return wrapper
    return decorator

# Uso práctico:
@timed_cache(max_size=64)
def compute_heavy_task(n: int) -> int:
    # Simula cálculo numérico intensivo
    return sum(i * i for i in range(n))

print("Resultado 1:", compute_heavy_task(500000))
print("Resultado 2 (Caché instantáneo):", compute_heavy_task(500000))
\`\`\`

---

#### Buenas Prácticas:
1. **Tipado Estático:** Siempre usa \`from typing import ...\` o tipos nativos (\`int\`, \`str\`, \`list[str]\` en Python 3.9+).
2. **Context Managers:** Emplea \`with open(...) as f:\` para garantizar que los file descriptors se liberen aún ante excepciones.
3. **Generadores:** Para grandes conjuntos de datos, usa \`yield\` en lugar de listas completas en memoria para evitar saturar la RAM.`;
  }

  // 7. Respuesta Universal y Resolución de Dudas Generales
  return `### 💡 Solución & Análisis de GLaDOS PRO

He analizado tu solicitud: **"${prompt.trim()}"**.

---

#### 1. Diagnóstico del Concepto / Pregunta
Para abordar esta situación de forma óptima, debemos considerar tres factores clave:
- **Claridad del Objetivo:** Definir el resultado esperado sin ambigüedades técnicas.
- **Eficiencia de la Solución:** Implementar la alternativa más limpia y con menor sobrecarga computacional.
- **Escalabilidad y Prevención:** Evitar efectos secundarios indeseados (regresiones, desbordamientos de memoria o acoplamiento excesivo).

---

#### 2. Procedimiento Recomendado Paso a Paso
1. **Verificación Inicial:** Comprobar que los requisitos previos y tipos de datos de entrada sean consistentes.
2. **Implementación Gradual:** Dividir el problema en módulos o funciones pequeñas de responsabilidad única (*Single Responsibility Principle*).
3. **Validación:** Ejecutar pruebas con casos típicos y casos límite (*edge cases*, como valores nulos, colecciones vacías o números negativos).
4. **Despliegue y Monitoreo:** Registrar métricas o logs para validar el comportamiento en ejecución continua.

---

#### 3. ¿En qué más puedo profundizar?
Dime si deseas que:
- Escriba el **código fuente completo** en Python, TypeScript, C++ u otro lenguaje.
- Explique en detalle la **teoría matemática o computacional** detrás de este problema.
- Diseñe una **arquitectura de software** paso a paso para integrarlo en tu proyecto.
- O bien ejecutar alguna herramienta física de GLaDOS OS (como escanear carpetas, inspeccionar mallas 3D o generar planos CAD DXF).`;
}
