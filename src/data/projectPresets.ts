import { ProjectPreset } from '../types/glados';

export const PROJECT_PRESETS: ProjectPreset[] = [
  {
    id: 'psretrox-ps1',
    name: 'PSRetroX: PS1 Hardware Reverse Engineering',
    description: 'Repositorio de ingeniería inversa para consolas PlayStation 1 (MIPS R3000A, TIM textures, VAB audio).',
    rootPath: 'https://github.com/cualquiercosa327/psretrox',
    repoUrl: 'https://github.com/cualquiercosa327/psretrox',
    detectedExtensions: ['.bin', '.cue', '.c', '.h', '.s', '.tim', '.vab', '.ld'],
    architectureSummary: `CÓMO FUNCIONA ESTE PROGRAMA:
1. ARQUITECTURA BARE-METAL:
   - Se ejecuta sobre el hardware del PlayStation 1 sin sistema operativo intermedio.
   - El procesador MIPS R3000A (33.8688 MHz) arranca desde la dirección KSEG0 ($80010000) definida en 'psx_rom.ld'.
2. PROCESAMIENTO GRÁFICO (GPU + GTE):
   - 'gpu_draw.c' envía paquetes de comandos DMA a la GPU para renderizar primitivas 2D y polígonos 3D.
   - Las imágenes y sprites están empaquetados en archivos .tim con tablas CLUT (Color Look-Up Table) de 4 bits (16 colores) o 8 bits (256 colores) para ahorrar los escasos 1MB de VRAM del PS1.
3. MOTOR DE AUDIO (SPU):
   - 'sfx_bank.vab' almacena samples de sonido comprimidos en 16 bloques ADPCM (4:1) procesados por el chip SPU de 24 voces.
4. COMPILACIÓN:
   - Se compila con GCC cruzado MIPS (mipsel-unknown-elf) generando un binario ejecutable que se empaqueta en una imagen ISO / BIN-CUE ejecutable en emuladores o hardware real.`,
    files: [
      {
        name: 'psretrox',
        path: 'psretrox',
        type: 'dir',
        children: [
          {
            name: 'src',
            path: 'psretrox/src',
            type: 'dir',
            children: [
              {
                name: 'main.c',
                path: 'psretrox/src/main.c',
                type: 'file',
                extension: '.c',
                lines: 54,
                content: `/**
 * PSRetroX - PlayStation 1 Main Entrypoint
 * Bare-metal initialisation for MIPS R3000A & GPU
 */
#include <sys/types.h>
#include <libetc.h>
#include <libgte.h>
#include <libgpu.h>

#define OT_LENGTH 256
static u_long ot[2][OT_LENGTH];
static char prim_buffer[2][32768];
static int db = 0;

void init_psx_hardware(void) {
    ResetGraph(0);
    SetGraphDebug(0);
    InitGeom();
    
    // Configurar resolución de framebuffer estándar NTSC (320x240)
    SetDefDrawEnv(&db[0], 0, 0, 320, 240);
    SetDefDispEnv(&db[0], 0, 0, 320, 240);
    
    // Cargar fuente del BIOS de PS1 en VRAM
    FntLoad(960, 256);
    SetDumpFnt(FntOpen(16, 16, 256, 200, 0, 512));
}

int main(void) {
    init_psx_hardware();
    
    while (1) {
        FntPrint("GLaDOS PS1 CORE - REVERSE ENG ACTIVE\\n");
        FntPrint("MIPS R3000A @ 33.86 MHz\\n");
        FntPrint("VRAM 1MB: TIM Textures Mapped\\n");
        FntFlush(-1);
        
        VSync(0); // Sincronización vertical 60Hz
    }
    return 0;
}`,
              },
              {
                name: 'gpu_draw.c',
                path: 'psretrox/src/gpu_draw.c',
                type: 'file',
                extension: '.c',
                lines: 48,
                content: `/**
 * PSRetroX GPU Drawing Subsystem
 * Handling Ordering Tables & DMA Packet Transfers
 */
#include <libgpu.h>
#include <libgte.h>

void draw_textured_quad(u_long *ot, int x, int y, int w, int h, u_short tpage, u_short clut) {
    POLY_FT4 *poly = (POLY_FT4 *)GetNextPrim();
    setPolyFT4(poly);
    
    // Coordenadas en pantalla
    setXY4(poly, x, y, x + w, y, x, y + h, x + w, y + h);
    
    // Coordenadas UV en VRAM
    setUV4(poly, 0, 0, w, 0, 0, h, w, h);
    
    poly->tpage = tpage;
    poly->clut = clut;
    setRGB0(poly, 128, 128, 128); // Color neutro sin tinte
    
    addPrim(ot, poly);
}`,
              },
              {
                name: 'boot_trampoline.s',
                path: 'psretrox/src/boot_trampoline.s',
                type: 'file',
                extension: '.s',
                lines: 32,
                content: `# MIPS R3000A Bootloader Trampoline for PS1
.section .text
.globl _start
.set noreorder

_start:
    # 1. Configurar puntero de pila (Stack Pointer en 2MB RAM)
    lui     $sp, 0x8020
    ori     $sp, $sp, 0xFFF0
    
    # 2. Limpiar registros de interrupción
    mtc0    $zero, $12      # Status register
    nop
    
    # 3. Saltar al punto de entrada en C
    jal     main
    nop                     # Branch delay slot

infinite_loop:
    j       infinite_loop
    nop`,
              },
              {
                name: 'cdrom_loader.c',
                path: 'psretrox/src/cdrom_loader.c',
                type: 'file',
                extension: '.c',
                lines: 38,
                content: `/**
 * PS1 ISO 9660 CD-ROM Sector Loader
 */
#include <libcd.h>

int load_file_from_cd(char *filename, void *destination) {
    CdlFILE file_info;
    if (CdSearchFile(&file_info, filename) == 0) {
        return -1; // Archivo no encontrado en imagen ISO
    }
    CdControl(CdlSetloc, (u_char *)&file_info.pos, 0);
    CdRead((file_info.size + 2047) / 2048, (u_long *)destination, CdlModeSpeed);
    CdReadSync(0, 0);
    return file_info.size;
}`,
              },
            ],
          },
          {
            name: 'assets',
            path: 'psretrox/assets',
            type: 'dir',
            children: [
              { name: 'title_splash.tim', path: 'psretrox/assets/title_splash.tim', type: 'file', extension: '.tim', size: 65536 },
              { name: 'font_8x8.tim', path: 'psretrox/assets/font_8x8.tim', type: 'file', extension: '.tim', size: 16384 },
              { name: 'sfx_bank.vab', path: 'psretrox/assets/sfx_bank.vab', type: 'file', extension: '.vab', size: 131072 },
            ],
          },
          {
            name: 'iso_build',
            path: 'psretrox/iso_build',
            type: 'dir',
            children: [
              { name: 'GAME.BIN', path: 'psretrox/iso_build/GAME.BIN', type: 'file', extension: '.bin', size: 34500000 },
              { name: 'GAME.CUE', path: 'psretrox/iso_build/GAME.CUE', type: 'file', extension: '.cue', lines: 8, content: `FILE "GAME.BIN" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n` },
            ],
          },
          { name: 'Makefile', path: 'psretrox/Makefile', type: 'file', lines: 25, content: `CC = mipsel-unknown-elf-gcc\nCFLAGS = -O2 -Wall -fno-builtin\nLDFLAGS = -T psx_rom.ld\n\nall:\n\t$(CC) $(CFLAGS) $(LDFLAGS) src/boot_trampoline.s src/main.c src/gpu_draw.c -o psx_game.exe\n` },
          { name: 'psx_rom.ld', path: 'psretrox/psx_rom.ld', type: 'file', extension: '.ld', lines: 22, content: `MEMORY {\n    ram(rwx) : ORIGIN = 0x80010000, LENGTH = 2M\n}\nSECTIONS {\n    .text : { *(.text) } > ram\n    .data : { *(.data) } > ram\n    .bss : { *(.bss) } > ram\n}\n` },
        ],
      },
    ],
  },
  {
    id: 'rea-mcp',
    name: 'REA: Reverse Engineer Anything (MCP Agent)',
    description: 'Framework MCP para agentes de ciberseguridad, Ghidra headless, Frida hooks y bucle de evidencias.',
    rootPath: 'https://github.com/morluto/rea',
    repoUrl: 'https://github.com/morluto/rea',
    detectedExtensions: ['.ts', '.json', '.py', '.ghidra', '.js', '.mcp'],
    architectureSummary: `CÓMO FUNCIONA ESTE PROGRAMA:
1. PROTOCOLO MCP (Model Context Protocol):
   - Separa el razonamiento del LLM de la ejecución física de herramientas binarias en la PC.
   - En lugar de que la IA 'adivine' qué hace un ejecutable, actúa como planificadora.
2. BUCLE AGÉNTICO DE EVIDENCIAS:
   - La IA invoca una herramienta enviando JSON: {"tool": "ghidra_decompile", "args": {"func": "main"}}.
   - El servidor local corre Ghidra en modo headless, desensambla la función y devuelve EVIDENCE [ghidra_decompile]: {código C}.
   - La IA lee la evidencia real y toma la siguiente decisión en bucle.
3. INSTRUMENTACIÓN DINÁMICA CON FRIDA:
   - 'frida_interceptor.js' se inyecta en el proceso en memoria para inspeccionar argumentos de funciones en caliente.
4. CONTRATOS ESTRICTOS:
   - 'contracts.json' define qué parámetros acepta cada script para impedir que la IA genere comandos inválidos o destructivos.`,
    files: [
      {
        name: 'rea-mcp',
        path: 'rea-mcp',
        type: 'dir',
        children: [
          {
            name: 'mcp-server',
            path: 'rea-mcp/mcp-server',
            type: 'dir',
            children: [
              {
                name: 'orchestrator.ts',
                path: 'rea-mcp/mcp-server/orchestrator.ts',
                type: 'file',
                extension: '.ts',
                lines: 62,
                content: `/**
 * REA MCP Server - Core Agentic Orchestrator
 */
import { ToolContract, EvidenceResult } from './contracts';

export class AgenticLoopOrchestrator {
  private maxIterations = 4;
  private toolsCatalog: Map<string, Function> = new Map();

  constructor() {
    this.registerBuiltInTools();
  }

  public registerTool(name: string, fn: Function) {
    this.toolsCatalog.set(name, fn);
  }

  public async runLoop(taskPrompt: string, history: any[]): Promise<string> {
    let iteration = 0;
    while (iteration < this.maxIterations) {
      iteration++;
      // Interceptar comandos de herramientas desde el modelo
      const toolCall = this.detectToolCall(history);
      if (!toolCall) {
        return history[history.length - 1].content; // Respuesta final sintetizada
      }

      const handler = this.toolsCatalog.get(toolCall.tool);
      if (handler) {
        const evidence = await handler(toolCall.args);
        history.push({
          role: 'system',
          content: \`EVIDENCE [\${toolCall.tool}]:\\n\${JSON.stringify(evidence)}\`,
        });
      }
    }
    return "Límite agéntico alcanzado con seguridad.";
  }

  private detectToolCall(history: any[]): { tool: string; args: any } | null {
    const last = history[history.length - 1]?.content || '';
    const match = last.match(/\\{[\\s\\S]*?"tool"[\\s\\S]*?\\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}`,
              },
              {
                name: 'evidence_collector.ts',
                path: 'rea-mcp/mcp-server/evidence_collector.ts',
                type: 'file',
                extension: '.ts',
                lines: 36,
                content: `/**
 * Evidence Collector for Reverse Engineering Sessions
 */
export class EvidenceCollector {
  private evidenceLog: Array<{ timestamp: string; tool: string; payload: string }> = [];

  public logEvidence(toolName: string, output: string) {
    this.evidenceLog.push({
      timestamp: new Date().toISOString(),
      tool: toolName,
      payload: output.substring(0, 2048), // Truncar para prevenir fugas de VRAM
    });
  }

  public getSummary(): string {
    return this.evidenceLog
      .map(e => \`[\${e.timestamp}] \${e.tool}: \${e.payload.slice(0, 80)}...\`)
      .join('\\n');
  }
}`,
              },
              {
                name: 'contracts.json',
                path: 'rea-mcp/mcp-server/contracts.json',
                type: 'file',
                extension: '.json',
                lines: 24,
                content: `{\n  "schema_version": "1.0",\n  "tools": [\n    {\n      "name": "ghidra_decompile",\n      "description": "Desensambla funciones binarias a pseudocódigo C",\n      "args": { "binary_path": "string", "function_name": "string" }\n    },\n    {\n      "name": "frida_trace",\n      "description": "Engancha llamadas a API en memoria",\n      "args": { "target_process": "string", "symbol": "string" }\n    }\n  ]\n}`,
              },
            ],
          },
          {
            name: 'plugins',
            path: 'rea-mcp/plugins',
            type: 'dir',
            children: [
              {
                name: 'ghidra_bridge.py',
                path: 'rea-mcp/plugins/ghidra_bridge.py',
                type: 'file',
                extension: '.py',
                lines: 42,
                content: `"""
Headless Ghidra Decompilation Script for REA MCP
"""
import sys
import os

def run_headless_analysis(binary_path, symbol_target="main"):
    print(f"[*] Analizando binario en Ghidra: {binary_path}")
    # Simulación de extracción de pseudocódigo C de Ghidra
    decompiled_c = f"""// Decompiled by Ghidra Headless Engine
int {symbol_target}(int argc, char** argv) {{
    int return_code = 0;
    if (argc < 2) return -1;
    // Buffer verificado sin vulnerabilidad de overflow
    return return_code;
}}"""
    return decompiled_c

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(run_headless_analysis(sys.argv[1]))`,
              },
              {
                name: 'frida_interceptor.js',
                path: 'rea-mcp/plugins/frida_interceptor.js',
                type: 'file',
                extension: '.js',
                lines: 28,
                content: `/**
 * Dynamic Memory Hook with Frida
 */
Interceptor.attach(Module.findExportByName(null, "open"), {
  onEnter: function (args) {
    var path = Memory.readUtf8String(args[0]);
    console.log("[FRIDA] Archivo abierto en memoria: " + path);
  },
  onLeave: function (retval) {
    // Descriptor de archivo devuelto
  }
});`,
              },
            ],
          },
          { name: 'package.json', path: 'rea-mcp/package.json', type: 'file', extension: '.json', lines: 18, content: `{\n  "name": "rea-mcp",\n  "version": "1.0.0",\n  "type": "module",\n  "dependencies": {\n    "@modelcontextprotocol/sdk": "^1.0.0"\n  }\n}` },
          { name: 'README.md', path: 'rea-mcp/README.md', type: 'file', lines: 15, content: `# Reverse Engineer Anything (REA)\nFramework agéntico para análisis de software e ingeniería inversa con evidencias.` },
        ],
      },
    ],
  },
  {
    id: 'fallout4-mod',
    name: 'Fallout 4 Mod: Plasma Carbine Overhaul',
    description: 'Entorno de modding de armas de Bethesda con modelos 3D Gamebryo, scripts y físicas Havok.',
    rootPath: 'C:/Games/Modding/Fallout4/Mods/PlasmaCarbine_Overhaul',
    detectedExtensions: ['.nif', '.hkx', '.esp', '.ba2', '.dds', '.pex', '.psc'],
    architectureSummary: `CÓMO FUNCIONA ESTE PROGRAMA:
1. MOTOR CREATION ENGINE (BETHESDA):
   - El plugin .esp define registros de base de datos relacional (Armas, Daño, Tipos de Munición, FormIDs).
2. MODELOS 3D (.nif) & SHADERS:
   - A diferencia de Skyrim, Fallout 4 empaqueta los vértices y triángulos dentro de BSTriShape (BSTR).
   - Utiliza matrices de rotación 3x3 de 36 bytes y shaders PBR con mapas de texturas Diffuse (_d), Normal (_n) y Specular (_s) en formato DirectDraw Surface (.dds).
3. LÓGICA PAPYRUS:
   - Scripts en código fuente .psc compilados a bytecode .pex ejecutados en la máquina virtual del juego.
4. COLISIONES HAVOK:
   - Archivos .hkx empaquetan primitivas de colisión rígida y físicas balísticas.`,
    files: [
      {
        name: 'PlasmaCarbine_Overhaul',
        path: 'PlasmaCarbine_Overhaul',
        type: 'dir',
        children: [
          {
            name: 'Meshes',
            path: 'PlasmaCarbine_Overhaul/Meshes',
            type: 'dir',
            children: [
              {
                name: 'Weapons',
                path: 'PlasmaCarbine_Overhaul/Meshes/Weapons',
                type: 'dir',
                children: [
                  { name: 'PlasmaCarbine_Receiver.nif', path: 'PlasmaCarbine_Overhaul/Meshes/Weapons/PlasmaCarbine_Receiver.nif', type: 'file', extension: '.nif', size: 148520 },
                  { name: 'PlasmaCarbine_Barrel.nif', path: 'PlasmaCarbine_Overhaul/Meshes/Weapons/PlasmaCarbine_Barrel.nif', type: 'file', extension: '.nif', size: 94230 },
                  { name: 'PlasmaCarbine_Scope.nif', path: 'PlasmaCarbine_Overhaul/Meshes/Weapons/PlasmaCarbine_Scope.nif', type: 'file', extension: '.nif', size: 68140 },
                ],
              },
              {
                name: 'Physics',
                path: 'PlasmaCarbine_Overhaul/Meshes/Physics',
                type: 'dir',
                children: [
                  { name: 'Carbine_EjectorPhysics.hkx', path: 'PlasmaCarbine_Overhaul/Meshes/Physics/Carbine_EjectorPhysics.hkx', type: 'file', extension: '.hkx', size: 32140 },
                ],
              },
            ],
          },
          {
            name: 'Scripts',
            path: 'PlasmaCarbine_Overhaul/Scripts',
            type: 'dir',
            children: [
              {
                name: 'PlasmaCarbineScript.psc',
                path: 'PlasmaCarbine_Overhaul/Scripts/PlasmaCarbineScript.psc',
                type: 'file',
                extension: '.psc',
                lines: 34,
                content: `; Bethesda Papyrus Script for Fallout 4
Scriptname PlasmaCarbineScript extends ObjectReference

Sound Property PlasmaBurstSound Auto
Projectile Property OverchargedPlasmaBolt Auto

Event OnEquipped(Actor akActor)
    Debug.Notification("Carabina de Plasma Modificada Armada.")
EndEvent

Event OnFire(Weapon akWeapon, Projectile akProjectile)
    ; Activar emisión de luz en bobinas NIF
    Self.PlayAnimation("PlayGlow")
    PlasmaBurstSound.Play(Self)
EndEvent`,
              },
              { name: 'PlasmaCarbineScript.pex', path: 'PlasmaCarbine_Overhaul/Scripts/PlasmaCarbineScript.pex', type: 'file', extension: '.pex', size: 4096 },
            ],
          },
          { name: 'PlasmaCarbine.esp', path: 'PlasmaCarbine_Overhaul/PlasmaCarbine.esp', type: 'file', extension: '.esp', size: 84200 },
          { name: 'PlasmaCarbine - Main.ba2', path: 'PlasmaCarbine_Overhaul/PlasmaCarbine - Main.ba2', type: 'file', extension: '.ba2', size: 8420000 },
        ],
      },
    ],
  },
  {
    id: 'munsa-erp',
    name: 'Munsa ERP Enterprise Backend',
    description: 'Sistema ERP industrial con módulos de inventarios, órdenes de fabricación y API REST.',
    rootPath: 'C:/Munsa/Software/ERP_Core',
    detectedExtensions: ['.py', '.sql', '.yaml', '.dxf', '.env'],
    architectureSummary: `CÓMO FUNCIONA ESTE PROGRAMA:
1. SERVICIOS BACKEND EN PYTHON:
   - FastAPI / SQLAlchemy orquestando transacciones de inventario y pedidos de planta.
2. INTEGRACIÓN CAD Y PLANOS (.dxf):
   - 'manufacturing_cad.py' genera planos de corte y troquelado para máquinas CNC a partir de órdenes de trabajo.
3. BASE DE DATOS:
   - PostgreSQL con migraciones relacionales para consistencia contable.`,
    files: [
      {
        name: 'ERP_Core',
        path: 'ERP_Core',
        type: 'dir',
        children: [
          {
            name: 'services',
            path: 'ERP_Core/services',
            type: 'dir',
            children: [
              {
                name: 'manufacturing_cad.py',
                path: 'ERP_Core/services/manufacturing_cad.py',
                type: 'file',
                extension: '.py',
                lines: 36,
                content: `"""
CNC Manufacturing & Laser Cutting CAD Generation
"""
import ezdxf

def export_sheet_metal_blueprint(width_mm=200, height_mm=120, thickness_mm=4):
    doc = ezdxf.new('R2010')
    msp = doc.modelspace()
    
    # Capa de corte perimetral
    msp.add_lwpolyline([
        (0, 0), (width_mm, 0), (width_mm, height_mm), (0, height_mm), (0, 0)
    ], dxfattribs={'layer': 'CUT_OUTER'})
    
    # Barrenos de montaje
    for x, y in [(20, 20), (width_mm - 20, 20), (width_mm - 20, height_mm - 20), (20, height_mm - 20)]:
        msp.add_circle((x, y), radius=5.0, dxfattribs={'layer': 'HOLES_DRILL'})
        
    doc.saveas("plano_corte_cnc.dxf")
    print(f"[+] Plano DXF generado para espesor {thickness_mm}mm")`,
              },
            ],
          },
          { name: 'requirements.txt', path: 'ERP_Core/requirements.txt', type: 'file', lines: 12, content: `fastapi>=0.110.0\nsqlalchemy>=2.0.0\nezdxf>=1.1.0\nuvicorn>=0.28.0\n` },
        ],
      },
    ],
  },
];

export function getFreshPresetClone(presetId: string): ProjectPreset {
  const preset = PROJECT_PRESETS.find((p) => p.id === presetId) || PROJECT_PRESETS[0];
  const clone = JSON.parse(JSON.stringify(preset)) as ProjectPreset;
  clone.baselineFiles = JSON.parse(JSON.stringify(preset.files));
  clone.hasModifications = false;
  return clone;
}

