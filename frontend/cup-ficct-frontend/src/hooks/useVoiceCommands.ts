// Hook de comandos de voz para reportes (UC-20).
// Usa la Web Speech API nativa del navegador — sin librerías externas.
// Compatible con Chrome y Edge. No funciona en Firefox ni Safari.
//
// Comandos reconocidos (en español):
//   "reporte de postulantes en PDF"
//   "reporte de admitidos en PDF"
//   "reporte de notas en Excel"
//   "reporte de resultados en Excel"
//   ... y variaciones naturales del español
//
// El hook devuelve:
//   - escuchando: boolean — si el micrófono está activo
//   - transcripcion: string — lo que se escuchó
//   - iniciar/detener: funciones de control
//   - soportado: boolean — si el navegador soporta la API

import { useState, useCallback, useRef } from "react";

// Tipos de reporte y formato detectables por voz.
type TipoVoz = "postulantes" | "resultados" | "notas" | null;
type FormatoVoz = "pdf" | "excel" | null;

export interface ComandoVoz {
  tipo: TipoVoz;
  formato: FormatoVoz;
}

interface UseVoiceCommandsOptions {
  /** Callback que se ejecuta cuando se detecta un comando válido. */
  onComando: (comando: ComandoVoz) => void;
  /** Callback cuando se detecta texto pero no es un comando reconocido. */
  onNoReconocido?: (texto: string) => void;
}

export function useVoiceCommands({ onComando, onNoReconocido }: UseVoiceCommandsOptions) {
  const [escuchando, setEscuchando] = useState(false);
  const [transcripcion, setTranscripcion] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Verificar soporte del navegador.
  const soportado = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  /**
   * Interpreta el texto transcripto y extrae tipo de reporte y formato.
   * Normaliza el texto para manejar variaciones del español hablado.
   */
  function interpretarComando(texto: string): ComandoVoz {
    const t = texto.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quitar acentos
      .replace(/[^a-z0-9\s]/g, "");    // quitar puntuación

    // ── Detectar tipo de reporte ──────────────────────────────────────────────
    let tipo: TipoVoz = null;

    // Postulantes
    if (/postulante|estudiante|inscrito|registrado/.test(t)) {
      tipo = "postulantes";
    }
    // Resultados / admitidos
    else if (/resultado|admitido|admision|ranking|cupo|carrera/.test(t)) {
      tipo = "resultados";
    }
    // Notas / calificaciones
    else if (/nota|calificacion|promedio|examen|materia/.test(t)) {
      tipo = "notas";
    }

    // ── Detectar formato ──────────────────────────────────────────────────────
    let formato: FormatoVoz = null;

    if (/pdf|pié|pie/.test(t)) {
      formato = "pdf";
    } else if (/excel|planilla|hoja|xlsx|tabla/.test(t)) {
      formato = "excel";
    }

    return { tipo, formato };
  }

  /**
   * Inicia el reconocimiento de voz.
   * Configura la API para español latinoamericano.
   */
  const iniciar = useCallback(() => {
    if (!soportado || escuchando) return;

    const SpeechRecognitionAPI =
      (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang          = "es-BO"; // Español Bolivia — fallback a es-ES
    recognition.continuous    = false;   // Detener al primer resultado
    recognition.interimResults = false;  // Solo resultados finales
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setEscuchando(true);
      setTranscripcion("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const texto = event.results[0][0].transcript;
      setTranscripcion(texto);

      const comando = interpretarComando(texto);

      if (comando.tipo && comando.formato) {
        // Comando completo reconocido.
        onComando(comando);
      } else {
        // Texto reconocido pero no es un comando válido.
        onNoReconocido?.(texto);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setTranscripcion(`Error: ${event.error}`);
      }
      setEscuchando(false);
    };

    recognition.onend = () => {
      setEscuchando(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [soportado, escuchando, onComando, onNoReconocido]);

  /**
   * Detiene el reconocimiento de voz.
   */
  const detener = useCallback(() => {
    recognitionRef.current?.stop();
    setEscuchando(false);
  }, []);

  return { escuchando, transcripcion, iniciar, detener, soportado };
}
