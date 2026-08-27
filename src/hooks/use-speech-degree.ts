import { useCallback, useEffect, useRef, useState } from "react";
import { parseDegreeFromSpeech } from "@/lib/milk";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

export function useSpeechDegree(onDegree: (degree: number, transcript: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onDegree);
  callbackRef.current = onDegree;

  useEffect(() => {
    const w = window as any;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setSupported(Boolean(Ctor));
  }, []);

  const start = useCallback((lang: string) => {
    const w = window as any;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Voice input is not supported in this browser. Use Chrome on Android or desktop.");
      return;
    }
    setError(null);
    setTranscript("");
    const rec: SpeechRecognitionLike = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
      const isFinal = event.results[event.results.length - 1].isFinal;
      if (isFinal) {
        const degree = parseDegreeFromSpeech(text);
        if (degree === null) {
          setError(`Could not find a number in: "${text.trim()}"`);
        } else {
          callbackRef.current(degree, text.trim());
        }
      }
    };
    rec.onerror = (event: any) => {
      setError(
        event?.error === "not-allowed"
          ? "Microphone permission was blocked. Allow the mic and try again."
          : `Voice error: ${event?.error ?? "unknown"}`,
      );
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, transcript, error, start, stop };
}
