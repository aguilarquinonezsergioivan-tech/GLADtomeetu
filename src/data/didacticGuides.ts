import { DidacticGuide } from '../types/glados';

export const DIDACTIC_GUIDES: DidacticGuide[] = [
  {
    topic: 'mcp-rea',
    title: 'Bucle Agéntico e Ingeniería Inversa con Protocolo MCP (REA)',
    whatItDoes:
      'Orquesta a la IA para que actúe como investigadora y no como adivina. Cuando el modelo detecta que necesita desensamblar una función o escanear un archivo, emite una llamada a herramienta {"tool": "nombre", "args": {...}}, GLaDOS ejecuta el script localmente en tu PC y le devuelve el resultado exacto en el bloque EVIDENCE.',
    whyItMatters:
      'Ninguna IA puede predecir de memoria los offsets de un binario sin compilar o de un mod de juego. Si la IA inventa direcciones de memoria, tu programa crasheará de inmediato. El bucle MCP fundamenta las respuestas en datos duros del disco duro.',
    exampleSnippet: `// 1. Detección de intención en la IA:
{"tool": "scan_folder", "args": {"path": "C:/Mods/Fallout4"}}

// 2. Respuesta devuelta por el Orquestador local:
EVIDENCE [scan_folder]:
Archivos encontrados: PlasmaCarbine.nif, Physics.hkx
Extensiones: [.nif, .hkx, .dds, .esp]`,
    explanation:
      'Paso 1: El usuario hace una pregunta.\nPaso 2: GLaDOS inyecta el contrato de herramientas en el prompt del sistema.\nPaso 3: Si se requiere código o disco, la IA genera un JSON estructurado.\nPaso 4: El orquestador ejecuta la herramienta de forma segura en un hilo secundario y devuelve la evidencia.\nPaso 5: La IA sintetiza la respuesta con pruebas reales.',
    reverseEngineeringInsight:
      'Permite conectar descompiladores como Ghidra o debuggers dinámicos como Frida sin exponer las herramientas al exterior ni requerir dependencias complejas.',
  },
  {
    topic: 'ps1-mips',
    title: 'Arquitectura Bare-Metal de PlayStation 1 (MIPS R3000A & GPU GTE)',
    whatItDoes:
      'Ejecuta código máquina directamente sobre los registros del microprocesador LSI R3000A a 33.8688 MHz, sin capas de sistema operativo (Windows o Linux). Mapea la memoria física en KSEG0 ($80010000) y procesa gráficos 3D mediante el Geometry Transformation Engine (GTE).',
    whyItMatters:
      'La PlayStation 1 solo cuenta con 2 MB de RAM principal y 1 MB de VRAM. Para que los juegos corrieran a 30/60 FPS, los programadores debían manipular directamente las tablas de ordenamiento (Ordering Tables) y empaquetar texturas en formato TIM con paletas de 16 colores (4-bit CLUT).',
    exampleSnippet: `// MIPS R3000A Assembly - Salto de arranque y configuración de pila:
.section .text
.globl _start
_start:
    lui   $sp, 0x8020      # Inicializar Stack Pointer en 0x801FFFF0 (fin de RAM 2MB)
    ori   $sp, $sp, 0xFFF0
    jal   main             # Saltar a función principal en C
    nop                    # Branch delay slot obligatorio en MIPS`,
    explanation:
      'En la arquitectura MIPS, cada instrucción ocupa exactamente 32 bits (4 bytes). Además, cuenta con el fenómeno del "Branch Delay Slot": la instrucción inmediatamente posterior a un salto (JAL/JR) se ejecuta siempre antes de que el procesador cambie el contador de programa.',
    reverseEngineeringInsight:
      'Al realizar ingeniería inversa de ROMs de PS1 (.BIN/.CUE), el desensamblador debe identificar los retardos de salto para no desfasar el flujo de control del código descompilado.',
  },
  {
    topic: 'nif-geometry',
    title: 'Geometría Binaria de Fallout 4 & Filtro Anti-Basura (BSTriShape)',
    whatItDoes:
      'Lee la jerarquía binaria de Gamebryo/Creation Engine. Extrae matrices de rotación 3x3 de 36 bytes y aplica la fórmula de "Matemática Inversa" para calcular el tamaño exacto de los vértices restando los triángulos desde el final del bloque de datos.',
    whyItMatters:
      'Skyrim utilizaba bloques NiTriShapeData con Quaternions de 16 bytes. Fallout 4 cambió a BSTriShape con matrices 3x3 y vértices compactos en half-floats (16 bits). Si intentas leer un NIF de Fallout 4 con código de Skyrim, el puntero se desfasa por 20 bytes y se produce el error crítico "IndexError: index 65408 out of bounds".',
    exampleSnippet: `# Fórmula Matemática Inversa en Python Puro:
idx_size = 12 if num_verts > 65535 else 6
tri_bytes = num_tris * idx_size
vertex_buffer_size = len(geom_data) - tri_bytes
vsize = vertex_buffer_size // num_verts  # Tamaño exacto del vértice sin adivinar bits

# Sanitizador Anti-Basura:
if np.isnan(vx) or np.isinf(vx):
    vx = 0.0  # Evita que el visor 3D colapse en un lienzo blanco`,
    explanation:
      '1. Cabecera: Identifica el string "Gamebryo File Format, Version 20.2.0.7".\n2. Bloques: Mapea la tabla de offsets y tipos de nodos.\n3. SceneGraph: Multiplica las transformaciones de padres a hijos usando álgebra matricial 3x3.\n4. Extracción: Aplica la matemática inversa y envía los arrays NumPy limpios a Trimesh o WebGL.',
    reverseEngineeringInsight:
      'Los videojuegos comerciales suelen meter "padding" (bytes vacíos de alineación de memoria) al final de las estructuras para acelerar la carga en la GPU. El parser debe filtrar este padding para no interpretar basura como coordenadas.',
  },
  {
    topic: 'cad-brep',
    title: 'Modelado Sólido B-Rep vs Mallas Poligonales (DesignAI / OpenCASCADE)',
    whatItDoes:
      'Representa piezas mecánicas mediante curvas matemáticas exactas, planos analíticos y relaciones topológicas (Vértice -> Arista -> Bucle -> Cara -> Cáscara -> Sólido) en lugar de triángulos planos aproximados.',
    whyItMatters:
      'Una malla STL o OBJ de un cilindro es solo una aproximación con cientos de caras planas. En ingeniería, una máquina de mecanizado CNC o una cortadora láser necesita saber el radio analítico exacto y el centro matemático para taladrar una rosca precisa.',
    exampleSnippet: `# Código Paramétrico CadQuery (B-Rep Sólido):
import cadquery as cq

# Crear sólido y taladrar 4 barrenos analíticos con un solo comando:
placa = (
    cq.Workplane("XY")
    .box(160, 110, 6)
    .edges("|Z").fillet(8)
    .faces(">Z").workplane()
    .rect(124, 74, forConstruction=True)
    .vertices().hole(10)
)`,
    explanation:
      'Al modificar un parámetro (ej. cambiar espesor de 6mm a 12mm), el kernel CAD (OpenCASCADE) recalcula la geometría sólida sin reconstruir la pieza desde cero. Esto permite simulaciones estructurales de elementos finitos (FEA) con valores de tensión Von Mises físicamente válidos.',
    reverseEngineeringInsight:
      'La ingeniería inversa de piezas físicas suele comenzar con un escaneo 3D (malla de nube de puntos) que luego la IA debe convertir a un modelo paramétrico B-Rep editable.',
  },
];
