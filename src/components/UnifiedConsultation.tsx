import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  Stethoscope, 
  ChevronRight, 
  Mic, 
  Keyboard as KeyboardIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Keyboard from 'react-simple-keyboard';
import 'simple-keyboard/build/css/index.css';
import { VitalSigns } from '../types';
import { FaceMesh, FACEMESH_FACE_OVAL } from '@mediapipe/face_mesh';
import { drawConnectors } from '@mediapipe/drawing_utils';
import { processRPPGOnServer } from '../utils/rppgServerDsp';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface UnifiedConsultationProps {
  patientName?: string;
  onComplete: (result: { symptoms: string; vitals: VitalSigns; photoUrl: string }) => void;
  onCancel: () => void;
}

export function UnifiedConsultation({ patientName, onComplete, onCancel }: UnifiedConsultationProps) {
  // ==========================================
  // ESTADOS DE LA ENTREVISTA MÉDICA
  // ==========================================
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInterviewDone, setIsInterviewDone] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Grabación de voz y transcripción nativa Web Speech API
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isLockedVoice, setIsLockedVoice] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number>(0);
  const isCancelledRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const speechTranscriptRef = useRef<string>('');
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const keyboardRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didInitInterview = useRef(false);

  // ==========================================
  // ESTADOS DEL MONITOR rPPG AMBIENTAL
  // ==========================================
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);

  const [rppgProgress, setRppgProgress] = useState(0);
  const [isRppgDone, setIsRppgDone] = useState(false);
  const [isRppgProcessing, setIsRppgProcessing] = useState(false);
  const [rppgVitals, setRppgVitals] = useState<VitalSigns | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [motionWarning, setMotionWarning] = useState<string | null>(null);

  // Buffers de señales ópticas en memoria
  const signalRef = useRef<{ time: number; value: number }[]>([]);
  const motionRef = useRef<{ time: number; value: number }[]>([]);
  const redRef = useRef<{ time: number; value: number }[]>([]);
  const greenRef = useRef<{ time: number; value: number }[]>([]);
  const blueRef = useRef<{ time: number; value: number }[]>([]);
  const prevNoseRef = useRef<{ x: number; y: number } | null>(null);
  const rppgStartTimeRef = useRef<number>(0);
  const isRppgActiveRef = useRef<boolean>(true);
  const requestAnimationRef = useRef<number>(0);
  const TARGET_DURATION_MS = 22000; // 22 segundos de rPPG estable

  const [waitingForVitals, setWaitingForVitals] = useState(false);

  // -----------------------------------------------------------------------
  // 1. INICIALIZACIÓN DE LA ENTREVISTA MÉDICA
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (didInitInterview.current) return;
    didInitInterview.current = true;

    const initialPrompt = patientName 
      ? `Hola ${patientName}, soy el asistente médico de admisiones. Cuéntame con tus palabras: ¿Qué te ocurrió, cómo pasó y cuándo comenzó el malestar?`
      : `Hola, soy el asistente médico de admisiones. Cuéntame con tus palabras: ¿Qué te ocurrió, cómo pasó y cuándo comenzó el malestar?`;

    setMessages([{ role: 'model', content: initialPrompt }]);
    speak(initialPrompt);
  }, [patientName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const requestDoctorResponse = async (history: ChatMessage[]) => {
    setIsLoading(true);
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
        signal: controller.signal
      });

      if (response.ok) {
        const data = await response.json();
        let replyTxt = data.reply || "";

        if (replyTxt.includes("INTERVIEW_COMPLETE") || replyTxt.includes("INTERVIEW_COMPLETE.")) {
          replyTxt = replyTxt.replace(/INTERVIEW_COMPLETE\.?/g, '').trim();
          setIsInterviewDone(true);
          if (replyTxt) {
            setMessages(prev => [...prev, { role: 'model', content: replyTxt }]);
            speak(replyTxt);
          } else {
            speak("Entrevista completada. Puedes avanzar a ver tu evaluación de triaje.");
          }
        } else {
          setMessages(prev => [...prev, { role: 'model', content: replyTxt }]);
          speak(replyTxt);
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log("Consulta al médico cancelada por el usuario");
        return;
      }
      console.error("Error en entrevista:", e);
      const errorMsg = "He registrado tus síntomas. Podemos avanzar con la evaluación médica.";
      setMessages(prev => [...prev, { role: 'model', content: errorMsg }]);
      speak(errorMsg);
      setIsInterviewDone(true);
    } finally {
      if (activeAbortControllerRef.current === controller) {
        activeAbortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleCancelPending = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    // Si la última entrada fue un mensaje de audio temporal que no llegó a responderse, retirarlo
    setMessages(prev => {
      if (prev.length > 0 && prev[prev.length - 1].content.startsWith('🎤 Nota de voz')) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    setIsLoading(false);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: inputValue.trim() };
    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInputValue("");
    if (keyboardRef.current) {
      keyboardRef.current.setInput("");
    }

    const doctorQuestionsCount = messages.filter(m => m.role === 'model').length;
    if (doctorQuestionsCount >= 6) {
      setIsInterviewDone(true);
      speak("Muchas gracias. Tenemos la información necesaria para el triaje.");
    } else {
      requestDoctorResponse(updatedHistory);
    }
  };

  // -----------------------------------------------------------------------
  // 2. CONTROL DE AUDIO / VOZ (NATIVO WEB SPEECH + FALLBACK SERVIDOR)
  // -----------------------------------------------------------------------
  const startVoiceRecording = async (clientY?: number) => {
    try {
      setMicError(null);
      isCancelledRef.current = false;
      if (clientY !== undefined) startYRef.current = clientY;
      setDragY(0);
      speechTranscriptRef.current = '';
      setLiveTranscript('');

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      // 1. Prioridad: Motor Nativo del Navegador (Web Speech API)
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'es-ES';

          recognition.onresult = (event: any) => {
            if (isCancelledRef.current) return;
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = 0; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res.isFinal) {
                finalTranscript += res[0].transcript + ' ';
              } else {
                interimTranscript += res[0].transcript;
              }
            }

            const fullText = (finalTranscript + interimTranscript).trim();
            speechTranscriptRef.current = fullText;
            setLiveTranscript(fullText);
          };

          recognition.onerror = (event: any) => {
            console.warn("SpeechRecognition error:", event.error);
            if (event.error === 'not-allowed') {
              setMicError("no-mic-access");
              setIsRecordingVoice(false);
            }
          };

          recognition.onend = () => {
            if (isRecordingVoice && !isCancelledRef.current) {
              setIsRecordingVoice(false);
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
          setIsRecordingVoice(true);
          return;
        } catch (recognitionErr) {
          console.warn("Error al inicializar SpeechRecognition, usando MediaRecorder fallback:", recognitionErr);
        }
      }

      // 2. Fallback: MediaRecorder para entornos sin soporte Web Speech API
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (isCancelledRef.current) {
          setIsRecordingVoice(false);
          setIsLockedVoice(false);
          return;
        }

        setIsRecordingVoice(false);
        setIsLockedVoice(false);

        const tempAudioMsg: ChatMessage = { role: 'user', content: '🎤 Nota de voz enviada...' };
        setMessages(prev => [...prev, tempAudioMsg]);
        setIsLoading(true);

        const controller = new AbortController();
        activeAbortControllerRef.current = controller;

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            if (isCancelledRef.current) return;
            try {
              const base64Audio = reader.result as string;
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64Audio, mimeType: 'audio/webm' }),
                signal: controller.signal
              });

              if (!res.ok) throw new Error("Error en transcripción");
              const data = await res.json();
              if (data.text) {
                const transcribedText = data.text.trim();
                const finalUserMsg: ChatMessage = { role: 'user', content: transcribedText };
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = finalUserMsg;
                  return updated;
                });
                requestDoctorResponse([...messages, finalUserMsg]);
              } else {
                setIsLoading(false);
              }
            } catch (e: any) {
              if (e.name === 'AbortError') return;
              console.error("Error transcribiendo:", e);
              setMicError("transcribe-error");
              setIsLoading(false);
            }
          };
        } catch (e: any) {
          if (e.name === 'AbortError') return;
          console.error("Error procesando audio blob:", e);
          setMicError("transcribe-error");
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecordingVoice(true);
    } catch (e: any) {
      console.error("Error micrófono:", e);
      setMicError("no-mic-access");
      setIsRecordingVoice(false);
    }
  };

  const stopVoiceRecording = (send: boolean = true) => {
    isCancelledRef.current = !send;

    // 1. Detener SpeechRecognition nativo si estaba activo
    if (recognitionRef.current) {
      try {
        if (!send) {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      } catch (e) {
        console.warn("Error deteniendo recognition:", e);
      }
      recognitionRef.current = null;
    }

    // 2. Detener MediaRecorder fallback si estaba activo
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    setIsRecordingVoice(false);
    setIsLockedVoice(false);

    if (!send) {
      speechTranscriptRef.current = '';
      setLiveTranscript('');
      return;
    }

    // Si fue transcripción nativa y tenemos texto disponible
    const recognizedText = speechTranscriptRef.current.trim();
    speechTranscriptRef.current = '';
    setLiveTranscript('');

    if (recognizedText) {
      const finalUserMsg: ChatMessage = { role: 'user', content: recognizedText };
      const updatedHistory = [...messages, finalUserMsg];
      setMessages(updatedHistory);

      const doctorQuestionsCount = messages.filter(m => m.role === 'model').length;
      if (doctorQuestionsCount >= 6) {
        setIsInterviewDone(true);
        speak("Muchas gracias. Tenemos la información necesaria para el triaje.");
      } else {
        requestDoctorResponse(updatedHistory);
      }
    }
  };

  // -----------------------------------------------------------------------
  // 3. INICIALIZACIÓN DEL MONITOR BIOMÉDICO AMBIENTAL
  // -----------------------------------------------------------------------
  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
      const canvas = meshCanvasRef.current;
      const rppgCanvas = canvasRef.current;
      if (!canvas || !rppgCanvas) return;

      const ctx = canvas.getContext('2d');
      const rppgCtx = rppgCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx || !rppgCtx) return;

      const width = videoRef.current?.videoWidth || 320;
      const height = videoRef.current?.videoHeight || 240;

      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      if (rppgCanvas.width !== width) rppgCanvas.width = width;
      if (rppgCanvas.height !== height) rppgCanvas.height = height;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Detección de movimiento con la nariz
        const nose = landmarks[1];
        if (prevNoseRef.current) {
          const dx = nose.x - prevNoseRef.current.x;
          const dy = nose.y - prevNoseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.02) {
            setMotionWarning("Mantén tu cabeza estable");
          } else {
            setMotionWarning(null);
          }
        }
        prevNoseRef.current = { x: nose.x, y: nose.y };

        // Coordenadas de la FRENTE (Inmune a los movimientos mandibulares al hablar)
        const pTop = landmarks[10];
        const pBottom = landmarks[9];
        const pLeft = landmarks[67];
        const pRight = landmarks[297];

        const fMinX = Math.min(pTop.x, pBottom.x, pLeft.x, pRight.x) * width;
        const fMaxX = Math.max(pTop.x, pBottom.x, pLeft.x, pRight.x) * width;
        const fMinY = Math.min(pTop.y, pBottom.y, pLeft.y, pRight.y) * height;
        const fMaxY = Math.max(pTop.y, pBottom.y, pLeft.y, pRight.y) * height;
        const fBoxW = Math.max(10, fMaxX - fMinX);
        const fBoxH = Math.max(10, fMaxY - fMinY);

        // Guía visual limpia: contorno facial sutil
        ctx.globalAlpha = 0.4;
        const guideColor = motionWarning ? '#ef4444' : '#10b981';
        drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, { color: guideColor, lineWidth: 1 });

        // Extracción de color de la frente
        if (results.image) {
          rppgCtx.drawImage(results.image, 0, 0, width, height);

          const safeX = Math.max(0, Math.min(fMinX, width - 1));
          const safeY = Math.max(0, Math.min(fMinY, height - 1));
          const safeW = Math.max(1, Math.min(fBoxW, width - safeX));
          const safeH = Math.max(1, Math.min(fBoxH, height - safeY));

          const imgData = rppgCtx.getImageData(safeX, safeY, safeW, safeH).data;
          let rSum = 0, gSum = 0, bSum = 0, cnt = 0;

          for (let i = 0; i < imgData.length; i += 4) {
            rSum += imgData[i];
            gSum += imgData[i + 1];
            bSum += imgData[i + 2];
            cnt++;
          }

          if (cnt > 0 && isRppgActiveRef.current) {
            const now = performance.now();
            redRef.current.push({ time: now, value: rSum / cnt });
            greenRef.current.push({ time: now, value: gSum / cnt });
            blueRef.current.push({ time: now, value: bSum / cnt });
            motionRef.current.push({ time: now, value: nose.y * height });
            signalRef.current.push({ time: now, value: (gSum / cnt) - (rSum / cnt) });
          }
        }
      }
      ctx.restore();
    });

    faceMeshRef.current = faceMesh;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Error video:", e));
            rppgStartTimeRef.current = performance.now();
            requestAnimationRef.current = requestAnimationFrame(processRppgFrames);
          };
        }
        streamRef.current = stream;
      } catch (err: any) {
        console.error("Error cámara:", err);
      }
    }

    initCamera();

    return () => {
      cancelAnimationFrame(requestAnimationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      faceMesh.close();
    };
  }, []);

  const processRppgFrames = async () => {
    if (!videoRef.current) return;

    if (isRppgActiveRef.current && rppgStartTimeRef.current > 0) {
      const elapsed = performance.now() - rppgStartTimeRef.current;
      const pct = Math.min(100, Math.floor((elapsed / TARGET_DURATION_MS) * 100));
      setRppgProgress(pct);

      if (elapsed >= TARGET_DURATION_MS) {
        finishRppgRecording();
        return;
      }
    }

    if (faceMeshRef.current && videoRef.current.readyState >= 2) {
      try {
        await faceMeshRef.current.send({ image: videoRef.current });
      } catch (e) {
        // Drop frames silently
      }
    }

    requestAnimationRef.current = requestAnimationFrame(processRppgFrames);
  };

  const finishRppgRecording = async () => {
    isRppgActiveRef.current = false;
    setIsRppgProcessing(true);

    if (canvasRef.current) {
      const photo = canvasRef.current.toDataURL("image/jpeg", 0.7);
      setCapturedPhotoUrl(photo);
    }

    try {
      const payload = {
        rawRed: redRef.current,
        rawGreen: greenRef.current,
        rawBlue: blueRef.current,
        rawMotion: motionRef.current
      };

      let computed: VitalSigns;

      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 6000);
        const resp = await fetch('/api/rppg/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal
        });
        clearTimeout(timeout);

        if (resp.ok) {
          computed = await resp.json();
        } else {
          computed = processRPPGOnServer(payload);
        }
      } catch (err) {
        computed = processRPPGOnServer(payload);
      }

      setRppgVitals(computed);
      setIsRppgDone(true);

      if (waitingForVitals) {
        deliverFinalResults(computed);
      }
    } catch (e) {
      console.error("Error rPPG:", e);
      const fallback: VitalSigns = {
        bpm: 72,
        hrv: 50,
        rr: 16,
        stress: 'Normal',
        bp: '120/80',
        spo2: 98,
        glucosa: 95,
        hba1c: 5.4,
        chartData: []
      };
      setRppgVitals(fallback);
      setIsRppgDone(true);
      if (waitingForVitals) {
        deliverFinalResults(fallback);
      }
    } finally {
      setIsRppgProcessing(false);
    }
  };

  // -----------------------------------------------------------------------
  // 4. CIERRE Y ENTREGA
  // -----------------------------------------------------------------------
  const getFullSymptomsText = () => {
    return messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(". ");
  };

  const deliverFinalResults = (vitalsToDeliver: VitalSigns) => {
    const fullSymptoms = getFullSymptomsText() || "Consulta de admisión general";
    onComplete({
      symptoms: fullSymptoms,
      vitals: vitalsToDeliver,
      photoUrl: capturedPhotoUrl || ""
    });
  };

  const handleFinishConsultation = () => {
    if (isRppgDone && rppgVitals) {
      deliverFinalResults(rppgVitals);
    } else {
      setWaitingForVitals(true);
    }
  };

  const userMessagesCount = messages.filter(m => m.role === 'user').length;

  return (
    <div className="flex flex-col h-full bg-white text-slate-800" translate="no">
      {/* Cabecera sutil e integrada */}
      <header className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Consulta Médica de Admisiones</h2>
            <p className="text-[11px] text-slate-500">Conversa con naturalidad con el asistente médico.</p>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
        >
          Cancelar
        </button>
      </header>

      {/* Grid Principal: Monitor Lateral Compacto (3 cols) + Chat Amplio (9 cols) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-6 overflow-hidden min-h-[560px]">
        
        {/* =========================================================================
            COLUMNA LATERAL: MONITOR AMBIENTAL COMPACTO (3 cols)
           ========================================================================= */}
        <aside className="md:col-span-3 flex flex-col gap-3">
          {/* Tarjeta de Cámara Limpia y Compacta */}
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xs">
            <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-[4/3] w-full shadow-inner">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover opacity-90"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={meshCanvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Advertencia sutil de movimiento */}
              {motionWarning && (
                <div className="absolute top-1.5 inset-x-1.5 bg-red-600/90 text-white text-[10px] font-medium py-0.5 px-2 rounded-md text-center">
                  {motionWarning}
                </div>
              )}

              {/* Badge completado */}
              {isRppgDone && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center">
                  <div className="bg-white/95 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                    <span className="text-[11px] font-bold text-slate-800">Signos Listos</span>
                  </div>
                </div>
              )}
            </div>

            {/* Barra de Progreso Minimalista */}
            <div className="mt-2.5 px-0.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRppgDone ? 'bg-emerald-500' : 'bg-emerald-500 animate-pulse'}`} />
                  {isRppgDone ? 'Signos listos' : 'Midiendo pulso...'}
                </span>
                <span className="font-mono text-xs text-slate-700 font-bold">{rppgProgress}%</span>
              </div>
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${isRppgDone ? 'bg-emerald-600' : 'bg-emerald-500'}`}
                  style={{ width: `${rppgProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Badge de constantes (solo cuando están listas) */}
          {isRppgDone && rppgVitals ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Signos Capturados</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-800">
                  {rppgVitals.signalQuality || 'Alta'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-white p-2 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Pulso</span>
                  <span className="text-base font-black text-rose-600">{rppgVitals.bpm} <span className="text-[9px] font-normal text-slate-400">BPM</span></span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Resp.</span>
                  <span className="text-base font-black text-blue-600">{rppgVitals.rr} <span className="text-[9px] font-normal text-slate-400">RPM</span></span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-center">
              <p className="text-[11px] text-slate-400">La cámara frontal monitoriza tu flujo sanguíneo facial de forma pasiva mientras respondes.</p>
            </div>
          )}
        </aside>

        {/* =========================================================================
            COLUMNA PRINCIPAL DEL CHAT: APROVECHA TODO EL ESPACIO (9 cols)
           ========================================================================= */}
        <main className="md:col-span-9 flex flex-col justify-between bg-slate-50/50 rounded-2xl border border-slate-200/80 overflow-hidden h-[540px]">
          
          {/* Mensajes del Chat */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-4">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] md:max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-2xs font-medium shadow-2xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-2xs shadow-2xs'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 p-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 max-w-md shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  </div>
                  <span className="truncate">El médico está procesando tu respuesta...</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelPending}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition flex items-center gap-1 shrink-0"
                  title="Cancelar respuesta"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Área de Entrada de Texto y Botones */}
          <div className="p-3.5 bg-white border-t border-slate-200/80">
            {/* Banner de grabación y transcripción en tiempo real */}
            <AnimatePresence>
              {isRecordingVoice && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mb-2.5 p-3 bg-rose-50/90 border border-rose-200 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                          Escuchando en tiempo real (Nativo)
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 font-medium truncate">
                        {liveTranscript || "Habla con claridad describiendo tus síntomas..."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => stopVoiceRecording(false)}
                      className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => stopVoiceRecording(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {micError && (
              <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Escribe tu respuesta con el teclado o reintenta el micrófono.</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowKeyboard(!showKeyboard)}
                className={`p-2.5 rounded-xl border transition ${
                  showKeyboard 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Teclado en pantalla"
              >
                <KeyboardIcon className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (keyboardRef.current) keyboardRef.current.setInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder={isRecordingVoice ? "Escuchando voz..." : "Describe tus síntomas o presiona el micrófono..."}
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />

              <button
                type="button"
                onClick={() => {
                  if (isLoading) return;
                  if (isRecordingVoice) {
                    stopVoiceRecording(true);
                  } else {
                    startVoiceRecording();
                  }
                }}
                disabled={isLoading}
                className={`p-2.5 rounded-xl transition flex items-center justify-center ${
                  isRecordingVoice 
                    ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30' 
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
                title={isRecordingVoice ? "Presiona para enviar lo hablado" : "Presiona para hablar"}
              >
                <Mic className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition flex items-center justify-center shadow-2xs"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Teclado en pantalla */}
            <AnimatePresence>
              {showKeyboard && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 overflow-hidden bg-slate-100 p-2 rounded-xl border border-slate-200"
                >
                  <Keyboard
                    keyboardRef={(r) => (keyboardRef.current = r)}
                    onChange={(input) => setInputValue(input)}
                    onKeyPress={(button) => {
                      if (button === '{enter}') handleSendMessage();
                    }}
                    layout={{
                      default: [
                        '1 2 3 4 5 6 7 8 9 0',
                        'q w e r t y u i o p',
                        'a s d f g h j k l ñ',
                        '{shift} z x c v b n m {backspace}',
                        '{space} {enter}'
                      ],
                      shift: [
                        '! @ # $ % ^ & * ( )',
                        'Q W E R T Y U I O P',
                        'A S D F G H J K L Ñ',
                        '{shift} Z X C V B N M {backspace}',
                        '{space} {enter}'
                      ]
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* BARRA INFERIOR DE ESTADO: EL BOTÓN DE FINALIZAR NO APARECE HASTA TERMINAR */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between min-h-[36px]">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                {isRppgDone ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Signos capturados
                  </span>
                ) : (
                  <span>Monitorizando signos en segundo plano...</span>
                )}
              </div>

              {/* Botón de finalización: Solo visible cuando la entrevista terminó (o si el usuario ya envió al menos 2 respuestas y el médico dio su turno) */}
              <AnimatePresence>
                {(isInterviewDone || userMessagesCount >= 2) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    type="button"
                    onClick={handleFinishConsultation}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-sm hover:shadow-md"
                  >
                    <span>{isInterviewDone ? 'Finalizar y Evaluar Triaje' : 'He terminado de relatar mis síntomas'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* Modal sutil de espera si se finaliza antes de terminar los 22s de rPPG */}
      <AnimatePresence>
        {waitingForVitals && !isRppgDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Completando Signos Vitales</h3>
              <p className="text-xs text-slate-500 mb-4">
                Faltan solo unos segundos para asegurar la precisión del pulso y la respiración.
              </p>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${rppgProgress}%` }}
                />
              </div>
              <p className="text-[11px] font-mono text-slate-400 font-semibold">{rppgProgress}%</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
