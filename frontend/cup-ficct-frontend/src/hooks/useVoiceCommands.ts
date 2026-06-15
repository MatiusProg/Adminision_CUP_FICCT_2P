// Hook de comandos de voz para reportes (UC-20).
// Usa la Web Speech API nativa del navegador — sin librerías externas.
// Compatible con Chrome y Edge. No funciona en Firefox ni Safari.

import { useState, useCallback, useRef } from "react";

type TipoVoz = "postulantes" | "resultados" | "notas" | null;
type FormatoVoz = "pdf" | "excel" | null;

export interface ComandoVoz {
  tipo: TipoVoz;
  formato: FormatoVoz;
}

interface UseVoiceCommandsOptions {
  onComando: (comando: ComandoVoz) => void;
  onNoReconocido?: (texto: string) => void;
}

// Definición manual de los tipos de la Web Speech API
// para evitar dependencia de @types/dom-speech-recognition.
interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLocal extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEventLocal extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLocal) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLocal) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function useVoiceCommands({ onComando, onNoReconocido }: UseVoiceCommandsOptions) {
  const [escuchando, setEscuchando]       = useState(false);
  const [transcripcion, setTranscripcion] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Verificar soporte del navegador sin referencias a tipos globales.
  const soportado = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  function interpretarComando(texto: string): ComandoVoz {
    const t = texto.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "");

    let tipo: TipoVoz = null;
    if (/postulante|estudiante|inscrito|registrado/.test(t))      tipo = "postulantes";
    else if (/resultado|admitido|admision|ranking|cupo|carrera/.test(t)) tipo = "resultados";
    else if (/nota|calificacion|promedio|examen|materia/.test(t)) tipo = "notas";

    let formato: FormatoVoz = null;
    if (/pdf|pie/.test(t))                          formato = "pdf";
    else if (/excel|planilla|hoja|xlsx|tabla/.test(t)) formato = "excel";

    return { tipo, formato };
  }

  const iniciar = useCallback(() => {
    if (!soportado || escuchando) return;

    // Obtener el constructor sin usar el tipo global SpeechRecognition.
    const w = window as unknown as Record<string, unknown>;
    const Constructor = (w["SpeechRecognition"] || w["webkitSpeechRecognition"]) as SpeechRecognitionConstructor | undefined;
    if (!Constructor) return;

    const recognition = new Constructor();
    recognition.lang             = "es-BO";
    recognition.continuous       = false;
    recognition.interimResults   = false;
    recognition.maxAlternatives  = 1;

    recognition.onstart = () => {
      setEscuchando(true);
      setTranscripcion("");
    };

    recognition.onresult = (event: SpeechRecognitionEventLocal) => {
      const texto   = event.results[0][0].transcript;
      setTranscripcion(texto);
      const comando = interpretarComando(texto);
      if (comando.tipo && comando.formato) {
        onComando(comando);
      } else {
        onNoReconocido?.(texto);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLocal) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setTranscripcion(`Error: ${event.error}`);
      }
      setEscuchando(false);
    };

    recognition.onend = () => setEscuchando(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [soportado, escuchando, onComando, onNoReconocido]);

  const detener = useCallback(() => {
    recognitionRef.current?.stop();
    setEscuchando(false);
  }, []);

  return { escuchando, transcripcion, iniciar, detener, soportado };
}