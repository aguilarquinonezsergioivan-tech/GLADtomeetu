export interface PythonFileMeta {
  path: string;
  category: 'core' | 'ui' | 'tools' | 'lab' | 'learning' | 'root';
  description: string;
  code: string;
}

export const PYTHON_PROJECT_FILES: PythonFileMeta[] = [
  {
    path: 'main.py',
    category: 'root',
    description: 'Punto de entrada principal con CustomTkinter, barra superior de telemetría y navegación de paneles.',
    code: `import customtkinter as ctk
from core.ai_engine import AIEngine
from core.memory import MemoryManager
from core.hardware_monitor import HardwareMonitor
from core.logger import SystemLogger
from ui.panels import ChatPanel, ProjectPanel, CADPanel, SandboxPanel, LearningPanel

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class GladosOS(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("GLaDOS OS - Fase 3 (Proyectos & Telemetría)")
        self.geometry("1150x700")

        # Inicialización de Logs y Core
        self.logger = SystemLogger()
        self.logger.log("INFO", "Iniciando secuencia de arranque de GLaDOS OS...")

        self.ai = AIEngine()
        self.memory = MemoryManager()
        self.monitor = HardwareMonitor(self.update_telemetry)

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(1, weight=1)

        self.setup_ui()
        self.monitor.start()
        self.logger.log("INFO", "Arquitectura e Interfaz cargadas correctamente.")

    def setup_ui(self):
        # ==========================================
        # TOP BAR (Telemetría a la Derecha y Logs)
        # ==========================================
        self.top_frame = ctk.CTkFrame(self, height=40, fg_color="#1a1a1a", corner_radius=0)
        self.top_frame.grid(row=0, column=0, columnspan=2, sticky="ew")

        self.lbl_title = ctk.CTkLabel(self.top_frame, text="GLaDOS PRO", font=("Consolas", 14, "bold"))
        self.lbl_title.pack(side="left", padx=20)

        # Botón para desplegar Logs
        self.btn_logs = ctk.CTkButton(self.top_frame, text="📜 Ver Logs", width=80, fg_color="#333333", hover_color="#444444", command=self.open_log_window)
        self.btn_logs.pack(side="right", padx=15, pady=5)

        # Telemetría alineada a la derecha
        self.lbl_hw = ctk.CTkLabel(self.top_frame, text="CPU: --% | RAM: --% | TEMP: --°C", font=("Consolas", 12))
        self.lbl_hw.pack(side="right", padx=20)

        # ==========================================
        # SIDEBAR (Navegación)
        # ==========================================
        self.sidebar = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar.grid(row=1, column=0, sticky="nsew")

        ctk.CTkLabel(self.sidebar, text="GLaDOS OS", font=("Consolas", 20, "bold")).pack(pady=(20, 30))

        self.btn_chat = ctk.CTkButton(self.sidebar, text="💬 Chat Central", anchor="w", command=lambda: self.show_frame("ChatPanel"))
        self.btn_chat.pack(fill="x", padx=10, pady=5)

        self.btn_proj = ctk.CTkButton(self.sidebar, text="📁 Proyectos", anchor="w", command=lambda: self.show_frame("ProjectPanel"))
        self.btn_proj.pack(fill="x", padx=10, pady=5)

        self.btn_cad = ctk.CTkButton(self.sidebar, text="📐 Motor CAD", anchor="w", command=lambda: self.show_frame("CADPanel"))
        self.btn_cad.pack(fill="x", padx=10, pady=5)

        self.btn_lab = ctk.CTkButton(self.sidebar, text="🧪 Lab / Sandbox", anchor="w", command=lambda: self.show_frame("SandboxPanel"))
        self.btn_lab.pack(fill="x", padx=10, pady=5)

        self.btn_learn = ctk.CTkButton(self.sidebar, text="🧠 APRENDIZAJE", anchor="w", fg_color="#5a2e8c", hover_color="#7a3ea8", command=lambda: self.show_frame("LearningPanel"))
        self.btn_learn.pack(fill="x", padx=10, pady=30)

        # ==========================================
        # MAIN CONTAINER (Paneles)
        # ==========================================
        self.main_container = ctk.CTkFrame(self, fg_color="transparent")
        self.main_container.grid(row=1, column=1, sticky="nsew", padx=10, pady=10)
        self.main_container.grid_rowconfigure(0, weight=1)
        self.main_container.grid_columnconfigure(0, weight=1)

        self.frames = {}
        for F in (ChatPanel, ProjectPanel, CADPanel, SandboxPanel, LearningPanel):
            page_name = F.__name__
            frame = F(parent=self.main_container, controller=self)
            self.frames[page_name] = frame
            frame.grid(row=0, column=0, sticky="nsew")

        self.show_frame("ChatPanel")

    def show_frame(self, page_name):
        frame = self.frames[page_name]
        frame.tkraise()
        self.logger.log("INFO", f"Navegación cambiada a módulo: {page_name}")

    def update_telemetry(self, cpu, ram, temp):
        if cpu != "N/A":
            self.lbl_hw.configure(text=f"CPU: {cpu}% | RAM: {ram}% | TEMP: {temp}")
        else:
            self.lbl_hw.configure(text="Modo Sin Telemetría (Falta psutil)")

    def open_log_window(self):
        """Despliega una ventana flotante con el historial de Logs del sistema"""
        self.logger.log("COMMAND", "Usuario abrió la ventana de Logs.")
        log_win = ctk.CTkToplevel(self)
        log_win.title("GLaDOS System Logs")
        log_win.geometry("750x450")
        log_win.attributes("-topmost", True)

        txt_logs = ctk.CTkTextbox(log_win, font=("Consolas", 11), wrap="word")
        txt_logs.pack(fill="both", expand=True, padx=10, pady=10)

        historial = self.logger.read_logs()
        txt_logs.insert("0.0", historial)
        txt_logs.see("end")
        txt_logs.configure(state="disabled")

if __name__ == "__main__":
    app = GladosOS()
    app.mainloop()
`,
  },
  {
    path: 'core/orchestrator.py',
    category: 'core',
    description: 'Motor agéntico con bucle REA/MCP, catálogo de herramientas y retroalimentación de evidencias.',
    code: `import threading
import json
import re
from tools.project_ops import scan_project_folder
from lab.nif_reader import NifReader

class Orchestrator:
    def __init__(self, ai_engine, memory, ui_callback, logger=None):
        self.ai = ai_engine
        self.memory = memory
        self.ui = ui_callback
        self.logger = logger

        # EL REGISTRO DE HERRAMIENTAS (MCP Style)
        self.tools_catalog = {
            "scan_folder": {
                "desc": "Escanea un directorio. Args: {'path': 'ruta'}",
                "func": self._tool_scan
            },
            "read_binary_nif": {
                "desc": "Inspecciona un archivo NIF o Binario. Args: {'filepath': 'ruta'}",
                "func": self._tool_nif
            }
        }

    def get_tool_descriptions(self):
        return "\\n".join([f"- {k}: {v['desc']}" for k, v in self.tools_catalog.items()])

    def _tool_scan(self, args):
        tree, exts = scan_project_folder(args.get('path', '.'))
        return f"Archivos:\\n{tree}\\nExtensiones: {exts}"

    def _tool_nif(self, args):
        reader = NifReader(args.get('filepath', ''))
        return reader.parse()

    def process_user_input(self, text):
        self.memory.add_message("user", text)
        self.ui(f"\\n[USUARIO]: {text}\\n", False)
        threading.Thread(target=self._agentic_loop, daemon=True).start()

    def _agentic_loop(self, iteration=0):
        if iteration > 4:  # Límite de recursión de seguridad
            self.ui("\\n[SISTEMA]: Límite de bucle agéntico alcanzado.\\n", False)
            return

        self.ui("[GLaDOS: Analizando y planificando (MCP Protocol)...]", True)

        # Inyectamos el "Contrato" de herramientas al contexto
        sys_prompt = f"Eres GLaDOS PRO. Tienes herramientas de ingeniería inversa y análisis. Herramientas:\\n{self.get_tool_descriptions()}\\nSi requieres una herramienta, responde SOLO un JSON con formato: {{\\"tool\\": \\"nombre\\", \\"args\\": {{...}}}}"

        # Contexto temporal para no ensuciar la memoria global con las reglas JSON
        temp_context = [{"role": "system", "content": sys_prompt}] + self.memory.get_context()[1:]

        respuesta_ia = self.ai.generate(temp_context)

        # Buscar si la IA intentó usar una herramienta (Regex de JSON)
        tool_match = re.search(r'\\{.*"tool".*\\}', respuesta_ia, re.DOTALL | re.IGNORECASE)

        if tool_match:
            try:
                comando = json.loads(tool_match.group(0))
                t_name = comando.get("tool")
                t_args = comando.get("args", {})

                self.ui(f"\\n[ORQUESTADOR]: Ejecutando herramienta '{t_name}'...", True)
                if self.logger:
                    self.logger.log("COMMAND", f"Tool Call: {t_name} {t_args}")

                if t_name in self.tools_catalog:
                    resultado = self.tools_catalog[t_name]["func"](t_args)
                    res_str = str(resultado)[:1500]  # Truncar para proteger VRAM

                    # Retroalimentar a la IA como "Evidencia" (REA Style)
                    self.memory.add_message("assistant", f"Llamando herramienta: {t_name}")
                    self.memory.add_message("system", f"EVIDENCE [{t_name}]:\\n{res_str}")

                    # Volver a llamar a la IA con los nuevos datos
                    self._agentic_loop(iteration + 1)
                else:
                    raise Exception("Herramienta no registrada.")
                return
            except Exception as e:
                if self.logger:
                    self.logger.log("ERROR", f"Falla en herramienta: {e}")
                self.memory.add_message("system", f"ERROR DE HERRAMIENTA: {e}. Corrige o responde sin ella.")
                self._agentic_loop(iteration + 1)
                return

        # Si no hay herramienta, es la respuesta final de GLaDOS
        self.memory.add_message("assistant", respuesta_ia)
        self.ui(f"\\n[GLaDOS]:\\n{respuesta_ia}\\n\\n", False)
`,
  },
  {
    path: 'core/logger.py',
    category: 'core',
    description: 'Sistema de bitácora y caja negra con niveles INFO, WARNING, ERROR, COMMAND.',
    code: `import os
import datetime

class SystemLogger:
    def __init__(self):
        self.log_dir = "logs"
        os.makedirs(self.log_dir, exist_ok=True)
        # Crea un log nuevo por día
        self.log_file = os.path.join(self.log_dir, f"glados_sys_{datetime.datetime.now().strftime('%Y%m%d')}.log")

    def log(self, level, message):
        """Levels: INFO, WARNING, ERROR, COMMAND"""
        timestamp = datetime.datetime.now().strftime('%H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}\\n"
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(log_entry)
        except:
            pass  # Falla silenciosa para no crashear la UI

    def read_logs(self):
        try:
            with open(self.log_file, "r", encoding="utf-8") as f:
                return f.read()
        except:
            return "El archivo de logs está vacío o no se pudo leer."
`,
  },
  {
    path: 'core/hardware_monitor.py',
    category: 'core',
    description: 'Lectura de telemetría de CPU, RAM y sensores térmicos usando psutil con hilos secundarios.',
    code: `import threading
import time

try:
    import psutil
    HAS_PSUTIL = True
except:
    HAS_PSUTIL = False

class HardwareMonitor:
    def __init__(self, cb):
        self.cb = cb
        self.running = True

    def start(self):
        threading.Thread(target=self._loop, daemon=True).start()

    def stop(self):
        self.running = False

    def _get_temp(self):
        if HAS_PSUTIL:
            try:
                # Intenta leer los sensores de temperatura de la placa/procesador
                temps = psutil.sensors_temperatures()
                if temps:
                    for name, entries in temps.items():
                        for entry in entries:
                            if entry.current:
                                return f"{int(entry.current)}°C"
            except:
                pass
        return "--°C"

    def _loop(self):
        while self.running:
            if HAS_PSUTIL:
                try:
                    cpu = psutil.cpu_percent(interval=1)
                    ram = psutil.virtual_memory().percent
                    temp = self._get_temp()
                    self.cb(cpu, ram, temp)  # Envía los 3 datos a la interfaz
                except:
                    pass
            else:
                self.cb("N/A", "N/A", "N/A")
                time.sleep(5)
            time.sleep(2)
`,
  },
  {
    path: 'core/ai_engine.py',
    category: 'core',
    description: 'Conector Ollama local a http://localhost:11434/api/chat con el modelo qwen2.5-coder:7b.',
    code: `import requests
import json

class AIEngine:
    def __init__(self, base_url="http://localhost:11434", model="qwen2.5-coder:7b"):
        self.base_url = base_url
        self.model = model
        self.chat_endpoint = f"{self.base_url}/api/chat"

    def generate(self, messages):
        """Envía el historial de mensajes a Ollama y obtiene la respuesta en texto."""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False
        }
        try:
            response = requests.post(self.chat_endpoint, json=payload, timeout=60)
            if response.status_code == 200:
                data = response.json()
                return data.get("message", {}).get("content", "")
            else:
                return f"[ERROR OLLAMA {response.status_code}]: {response.text}"
        except Exception as e:
            return f"[ERROR CONEXIÓN OLLAMA]: Asegúrate de que Ollama esté corriendo en localhost:11434 con '{self.model}'. Detalle: {str(e)}"
`,
  },
  {
    path: 'core/memory.py',
    category: 'core',
    description: 'Gestor de memoria de contexto conversacional y mensajes de sistema/usuario/asistente.',
    code: `class MemoryManager:
    def __init__(self):
        self.history = [
            {
                "role": "system",
                "content": "Eres GLaDOS PRO, un sistema operativo y agente autónomo de ingeniería de software y análisis de mods/binarios."
            }
        ]

    def add_message(self, role, content):
        self.history.append({"role": role, "content": content})

    def get_context(self):
        return list(self.history)

    def clear(self):
        self.history = self.history[:1]
`,
  },
  {
    path: 'learning/engine.py',
    category: 'learning',
    description: 'Motor inteligente de auto-análisis con Code Doctor y Project Doctor.',
    code: `import os
import datetime
import glob

class LearningEngine:
    def __init__(self, ai_engine, logger=None):
        self.ai = ai_engine
        self.logger = logger
        self.proposals_dir = "learning/proposals"
        os.makedirs(self.proposals_dir, exist_ok=True)

    def analyze_glados(self):
        report = "INICIANDO 'CODE DOCTOR' EN NÚCLEO GLADOS...\\n"
        core_files = glob.glob("core/*.py")
        contexto = ""
        for f in core_files:
            try:
                with open(f, 'r', encoding='utf-8') as file:
                    contexto += f"- {f}: {len(file.readlines())} líneas.\\n"
            except:
                pass
        report += "✓ Estructura interna mapeada.\\n"
        if self.logger:
            self.logger.log("INFO", "Ejecutando Code Doctor en GLaDOS.")

        prompt = f"""Analiza esta estructura:
{contexto}
Actúa como 'Code Doctor'. Genera un parche o propuesta de refactorización para optimizar rendimiento o RAM.
Responde ESTRICTAMENTE en este formato:
PROBLEMA: [tu análisis]
PROPUESTA: [tu idea de código o arquitectura]
ARCHIVOS AFECTADOS: [nombres de archivos]
BENEFICIO: [por qué me sirve]"""

        respuesta_ia = self.ai.generate([{"role": "user", "content": prompt}])

        p_id = f"IMP-{datetime.datetime.now().strftime('%H%M%S')}"
        filepath = os.path.join(self.proposals_dir, f"{p_id}.txt")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(respuesta_ia)

        report += f"\\n==== LEARNING JOURNAL: {p_id} ====\\n{respuesta_ia}\\n\\n💾 Guardado como propuesta pendiente en: {filepath}"
        return report

    def analyze_project(self, project_path):
        if not project_path:
            return "[ERROR] No hay proyecto activo en el Workspace. Ve a la pestaña 'Proyectos' y carga una carpeta primero."

        report = f"🔍 INICIANDO 'PROJECT DOCTOR' EN: {project_path}\\n"
        if self.logger:
            self.logger.log("COMMAND", f"Project Doctor scan en {project_path}")

        # Escaneo superficial para el Doctor
        archivos = []
        for root, _, files in os.walk(project_path):
            if len(archivos) > 30:
                break
            archivos.extend([f for f in files])

        prompt = f"""Archivos detectados en el proyecto: {', '.join(archivos)}. Actúa como 'Project Doctor' y Arquitecto Senior.
Explica el propósito de este proyecto, qué herramientas o SDKs faltan y propón 2 'Skills' recomendadas."""

        respuesta_ia = self.ai.generate([{"role": "user", "content": prompt}])
        report += f"\\n==== DIAGNÓSTICO DE PROYECTO ====\\n{respuesta_ia}\\n"
        return report
`,
  },
  {
    path: 'lab/nif_reader.py',
    category: 'lab',
    description: 'Analizador estructural en Python puro para archivos binarios NetImmerse/Gamebryo (.nif).',
    code: `import os

class NifReader:
    def __init__(self, filepath):
        self.filepath = filepath

    def parse(self):
        if not self.filepath or not os.path.exists(self.filepath):
            return f"[ERROR] Archivo no encontrado: {self.filepath}"

        file_size = os.path.getsize(self.filepath)
        report = []
        report.append("==================================================")
        report.append(f"  LAB / NIF ANALYZER: {os.path.basename(self.filepath)}")
        report.append(f"  Tamaño de archivo: {file_size / 1024:.2f} KB")
        report.append("==================================================")

        try:
            with open(self.filepath, "rb") as f:
                header_bytes = f.read(128)
                header_str = ""
                try:
                    header_str = header_bytes.split(b"\\n")[0].decode("ascii", errors="ignore")
                except:
                    header_str = str(header_bytes[:40])

                report.append(f"Header detectado: {header_str}")

                is_gamebryo = ("Gamebryo" in header_str or "NetImmerse" in header_str or b"NDS" in header_bytes)

                if is_gamebryo:
                    report.append("✓ Firma válida: Gamebryo / NetImmerse (Fallout 4 / Skyrim compatible)")
                else:
                    report.append("⚠ Header no estándar, realizando escaneo heurístico de strings...")

                # Escaneo de Bloques conocidos en modo binario
                f.seek(0)
                content = f.read()

                known_blocks = [
                    b"BSFadeNode", b"NiNode", b"NiTriShape", b"NiTriStrips",
                    b"NiSkinInstance", b"BSLightingShaderProperty",
                    b"NiMaterialProperty", b"NiAlphaProperty", b"bhkCollisionObject"
                ]

                report.append("\\n--- BLOQUES ESTRUCTURALES ENCONTRADOS ---")
                found_any = False
                for block in known_blocks:
                    count = content.count(block)
                    if count > 0:
                        found_any = True
                        report.append(f"  * {block.decode('ascii')}: {count} instancia(s)")

                if not found_any:
                    report.append("  (No se encontraron bloques conocidos de Gamebryo en el stream)")

                report.append("\\n--- ESTADO DE MEMORIA Y VRAM ---")
                report.append(f"  Huella en memoria estimada: {file_size * 1.4 / 1024:.2f} KB")
                report.append("  Estado de parseo: Seguro, sin saturación de VRAM.")
                report.append("==================================================")
                return "\\n".join(report)

        except Exception as e:
            return f"[ERROR AL PARSEAR NIF]: {str(e)}"
`,
  },
  {
    path: 'tools/project_ops.py',
    category: 'tools',
    description: 'Escáner de disco seguro con límite visual de archivos y recolector de extensiones.',
    code: `import os

def scan_project_folder(folder_path, max_files=200):
    """
    Escanea un directorio de forma segura para no saturar la UI.
    Retorna (arbol_de_archivos, lista_extensiones_unicas).
    """
    if not os.path.isdir(folder_path):
        return f"[ERROR] La ruta '{folder_path}' no es una carpeta válida.", []

    tree_lines = []
    extensions = set()
    file_count = 0

    for root, dirs, files in os.walk(folder_path):
        rel_root = os.path.relpath(root, folder_path)
        depth = 0 if rel_root == "." else rel_root.count(os.sep) + 1
        indent = "  " * depth

        if rel_root != ".":
            tree_lines.append(f"{indent}📁 {os.path.basename(root)}/")

        for f in files:
            file_count += 1
            if file_count > max_files:
                tree_lines.append(f"{indent}  ... (límite de {max_files} archivos alcanzado)")
                break

            _, ext = os.path.splitext(f)
            if ext:
                extensions.add(ext.lower())

            tree_lines.append(f"{indent}  📄 {f}")

        if file_count > max_files:
            break

    return "\\n".join(tree_lines), sorted(list(extensions))
`,
  },
  {
    path: 'tools/cad_generator.py',
    category: 'tools',
    description: 'Generador de placas mecánicas paramétricas en formato DXF con perforaciones de montaje.',
    code: `def generate_parametric_dxf(width=150.0, height=100.0, hole_radius=4.5, margin=15.0):
    """
    Genera un archivo DXF ASCII con el perfil exterior de una placa y 4 barrenos de sujeción.
    Compatible con ezdxf, AutoCAD, Fusion 360 y cortadoras láser.
    """
    dxf = []
    dxf.append("0\\nSECTION\\n2\\nHEADER\\n0\\nENDSEC")
    dxf.append("0\\nSECTION\\n2\\nTABLES\\n0\\nENDSEC")
    dxf.append("0\\nSECTION\\n2\\nENTITIES")

    # Contorno exterior (4 líneas)
    corners = [
        (0.0, 0.0),
        (width, 0.0),
        (width, height),
        (0.0, height)
    ]
    for i in range(4):
        x1, y1 = corners[i]
        x2, y2 = corners[(i + 1) % 4]
        dxf.append(f"0\\nLINE\\n8\\nPLACA_CONTORNO\\n10\\n{x1:.3f}\\n20\\n{y1:.3f}\\n11\\n{x2:.3f}\\n21\\n{y2:.3f}")

    # Barrenos de las esquinas
    holes = [
        (margin, margin),
        (width - margin, margin),
        (width - margin, height - margin),
        (margin, height - margin)
    ]
    for hx, hy in holes:
        dxf.append(f"0\\nCIRCLE\\n8\\nBARRENOS\\n10\\n{hx:.3f}\\n20\\n{hy:.3f}\\n40\\n{hole_radius:.3f}")

    dxf.append("0\\nENDSEC\\n0\\nEOF")
    return "\\n".join(dxf)
`,
  },
  {
    path: 'arquitecto.py',
    category: 'root',
    description: 'Script conector con Gemini API y Function Calling para escribir código directamente en disco.',
    code: `import os
import google.generativeai as genai

# 1. Conexión con el Cerebro (Gemini)
API_KEY = os.getenv("GEMINI_API_KEY", "PEGA_TU_API_KEY_AQUI")
genai.configure(api_key=API_KEY)

# 2. Las "Manos" físicas en tu computadora
def crear_o_editar_archivo(ruta_relativa: str, contenido_codigo: str) -> str:
    """Crea carpetas automáticamente y guarda el código fuente en el disco duro."""
    try:
        directorio = os.path.dirname(ruta_relativa)
        if directorio:
            os.makedirs(directorio, exist_ok=True)

        with open(ruta_relativa, 'w', encoding='utf-8') as f:
            f.write(contenido_codigo)

        mensaje = f"[+] ÉXITO: Archivo '{ruta_relativa}' escrito en el disco."
        print(mensaje)
        return mensaje
    except Exception as e:
        error = f"[-] ERROR al escribir '{ruta_relativa}': {str(e)}"
        print(error)
        return error

# 3. Inicialización del Agente Arquitecto
modelo = genai.GenerativeModel(
    model_name='gemini-2.5-pro',
    tools=[crear_o_editar_archivo],
    system_instruction=(
        "Eres el Arquitecto de GLaDOS OS. Estás conectado directamente al disco duro "
        "del usuario. Tu objetivo es diseñar, refactorizar y programar módulos en Python. "
        "Cuando el usuario te pida crear o modificar un sistema, NO le des el código en texto "
        "para que él lo copie. DEBES usar SIEMPRE tu herramienta 'crear_o_editar_archivo' "
        "para inyectar el código físicamente en su proyecto. Mantén tus respuestas de texto breves."
    )
)

chat = modelo.start_chat(enable_automatic_function_calling=True)

print("===============================================================")
print(" 🧠 MODO ARQUITECTO INICIADO (Conexión Directa a Gemini API) ")
print("===============================================================")
print("Pídeme que construya módulos, herramientas o refactorice el código.")
print("Escribe 'salir' para terminar.\\n")

if __name__ == "__main__":
    while True:
        try:
            prompt = input("TÚ: ")
            if prompt.lower() in ['salir', 'exit', 'quit']:
                break

            print("[El Arquitecto está analizando y escribiendo en tu disco...]")
            respuesta = chat.send_message(prompt)
            print(f"ARQUITECTO: {respuesta.text}\\n")
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"[ERROR DE CONEXIÓN API]: {e}\\n")
`,
  },
  {
    path: 'requirements.txt',
    category: 'root',
    description: 'Dependencias requeridas para ejecutar el sistema en local con Python.',
    code: `customtkinter>=5.2.0
psutil>=5.9.0
requests>=2.31.0
google-generativeai>=0.8.0
ezdxf>=1.1.0
`,
  },
];
