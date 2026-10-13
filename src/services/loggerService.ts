import { LogEntry, LogLevel } from '../types/glados';

type LogSubscriber = (entries: LogEntry[]) => void;

class SystemLoggerService {
  private logs: LogEntry[] = [];
  private subscribers: Set<LogSubscriber> = new Set();

  constructor() {
    // Initial boot sequence matching GLaDOS OS main.py
    this.log('INFO', 'Iniciando secuencia de arranque de GLaDOS OS (Fase 3)...');
    this.log('INFO', 'Cargando módulos de núcleo: AIEngine, MemoryManager, HardwareMonitor, SystemLogger');
    this.log('INFO', 'Arquitectura e Interfaz cargadas correctamente.');
    this.log('INFO', 'Conexión lista: Ollama qwen2.5-coder:7b & Gemini API Fallback.');
  }

  public log(level: LogLevel, message: string): void {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      level,
      message,
    };

    this.logs.push(entry);
    this.notify();
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public readLogsAsText(): string {
    if (this.logs.length === 0) {
      return 'El archivo de logs está vacío o no se pudo leer.';
    }
    return this.logs
      .map((entry) => `[${entry.timestamp}] [${entry.level}] ${entry.message}`)
      .join('\n');
  }

  public clear(): void {
    this.logs = [];
    this.notify();
  }

  public subscribe(cb: LogSubscriber): () => void {
    this.subscribers.add(cb);
    cb(this.getLogs());
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify(): void {
    const snapshot = this.getLogs();
    this.subscribers.forEach((cb) => cb(snapshot));
  }
}

export const loggerService = new SystemLoggerService();
