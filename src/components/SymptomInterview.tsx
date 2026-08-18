import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Stethoscope, ChevronRight, Mic, MicOff, Keyboard as KeyboardIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Keyboard from 'react-simple-keyboard';
import 'simple-keyboard/build/css/index.css';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface SymptomInterviewProps {
  onComplete: (collectedSymptoms: string) => void;
}

export function SymptomInterview({ onComplete }: SymptomInterviewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const keyboardRef = useRef<any>(null);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    requestDoctorResponse([]);
  }, []);

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
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      });
      if (response.ok) {
        const data = await response.json();
        
        let replyTxt = data.reply;
        if (replyTxt.includes("INTERVIEW_COMPLETE") || replyTxt.includes("INTERVIEW_COMPLETE.")) {
          replyTxt = replyTxt.replace(/INTERVIEW_COMPLETE\.?/g, '').trim();
          setIsDone(true);
          if (replyTxt) {
              setMessages(prev => [...prev, { role: 'model', content: replyTxt }]);
              speak(replyTxt);
          } else {
              speak("Entrevista completada, procesando resultados.");
          }
        } else {
          setMessages(prev => [...prev, { role: 'model', content: replyTxt }]);
          speak(replyTxt);
        }
      }
    } catch (e) {
      console.error(e);
      const errorMsg = "Hubo un error de conexión, pero continuemos. ¿Algo más?";
      setMessages(prev => [...prev, { role: 'model', content: errorMsg }]);
      speak(errorMsg);
    }
    setIsLoading(false);
  };

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: ChatMessage = { role: 'user', content: inputValue.trim() };
    const maxTriageQuestions = 10;
    const currentQCount = messages.filter(m => m.role === 'model').length;

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInputValue("");
    if (keyboardRef.current) {
        keyboardRef.current.setInput("");
    }

    if (currentQCount >= maxTriageQuestions) {
      setIsDone(true);
      speak("Entrevista completada, procesando resultados.");
    } else {
      requestDoctorResponse(updatedHistory);
    }
  };

  const calculateFullSymptoms = () => {
    return messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(". ");
  };

  const finishInterview = () => {
    onComplete(calculateFullSymptoms());
  };

  // Voice note recording states (WhatsApp style)
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [dragY, setDragY] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startYRef = useRef<number>(0);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startVoiceRecording = async (clientY?: number) => {
    try {
      setMicError(null);
      isCancelledRef.current = false;
      if (clientY !== undefined) startYRef.current = clientY;
      setDragY(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (isCancelledRef.current) {
          setIsRecording(false);
          setIsLocked(false);
          setRecordingSeconds(0);
          return;
        }

        setIsLoading(true);
        setMicError(null);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64Audio, mimeType: 'audio/webm' })
            });

            if (!res.ok) throw new Error("Error en transcripción");
            const data = await res.json();
            if (data.text) {
              const transcribedText = data.text.trim();
              // Enviar el mensaje transcrito directamente
              const userMessage: ChatMessage = { role: 'user', content: transcribedText };
              setMessages(prev => [...prev, userMessage]);
              requestDoctorResponse([...messages, userMessage]);
            }
          };
        } catch (e: any) {
          console.error("Error transcribiendo audio:", e);
          setMicError("transcribe-error");
        } finally {
          setIsLoading(false);
          setIsRecording(false);
          setIsLocked(false);
          setRecordingSeconds(0);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (e: any) {
      console.error("Error al acceder al micrófono:", e);
      setMicError("no-mic-access");
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = (send: boolean = true) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    isCancelledRef.current = !send;
    mediaRecorderRef.current.stop();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isLoading || isDone) return;
    startVoiceRecording(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isRecording || isLocked) return;
    const deltaY = startYRef.current - e.clientY;
    setDragY(deltaY);
    if (deltaY > 60) {
      // Bloquear grabación (deslizó hacia arriba)
      setIsLocked(true);
    }
  };

  const handlePointerUp = () => {
    if (!isRecording || isLocked) return;
    stopVoiceRecording(true);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleKeyboardChange = (input: string) => {
    setInputValue(input);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-[500px]">
      <div className="p-4 md:p-8 bg-emerald-600 text-white flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-16 w-auto mb-3 object-contain drop-shadow-md bg-white rounded-xl p-2" />
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Entrevista Clínica y de Seguro</h2>
        <p className="text-emerald-100 mt-2 font-mono text-sm max-w-sm text-center">
          Responde estas breves preguntas para el triage médico y la declaración del siniestro.
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
              </div>
            )}
            
            <div className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
            
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 rounded-tl-none flex gap-2 items-center h-[46px]">
              <span className="text-xs font-mono text-emerald-700 font-bold">Transcribiendo audio...</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200 relative">
        <AnimatePresence mode="wait">
          {isDone ? (
            <motion.div
               key="done"
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
               className="flex flex-col items-center"
            >
              <p className="text-sm text-slate-500 mb-3 text-center">Entrevista completada. Procesando síntomas...</p>
              <button 
                onClick={finishInterview}
                className="w-full py-4 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                Continuar al Análisis Final
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          ) : (
            <motion.div
               key="input"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }}
               className="flex flex-col gap-2"
            >
              {/* Barra de entrada o Barra de grabación WhatsApp */}
              {isRecording ? (
                <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-full px-4 py-2.5 shadow-inner">
                  {/* Timer y pulso de grabación */}
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                    <span className="font-mono text-sm font-bold text-red-700">{formatTimer(recordingSeconds)}</span>
                  </div>

                  {/* Slider / Estado de bloqueo */}
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                    {isLocked ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">🔒 Grabación bloqueada</span>
                    ) : (
                      <span className="animate-pulse">Desliza ⇡ para bloquear</span>
                    )}
                  </div>

                  {/* Acciones de enviar/cancelar */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => stopVoiceRecording(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-full transition"
                    >
                      Cancelar
                    </button>
                    {isLocked && (
                      <button
                        onClick={() => stopVoiceRecording(true)}
                        className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-md transition"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowKeyboard(!showKeyboard)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition ${showKeyboard ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    <KeyboardIcon className="w-5 h-5" />
                  </button>

                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => {
                        setInputValue(e.target.value);
                        if (keyboardRef.current) keyboardRef.current.setInput(e.target.value);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={isLoading}
                    placeholder={micError ? `Error Mic: ${micError}` : "Escribe o mantén el micrófono..."}
                    className={`flex-1 bg-slate-50 border ${micError ? 'border-red-400' : 'border-slate-200'} rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50`}
                  />

                  {inputValue.trim() ? (
                    <button
                      onClick={handleSend}
                      disabled={isLoading}
                      className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center shrink-0 cursor-pointer text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  ) : (
                    /* Botón Estilo WhatsApp: Mantener presionado y deslizar arriba */
                    <button
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      disabled={isLoading}
                      title="Mantén presionado para grabar audio. Desliza hacia arriba para bloquear."
                      className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-md hover:bg-emerald-700 transition active:scale-110 select-none touch-none"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {showKeyboard && (
                 <div className="mt-2 text-slate-800 border border-slate-200 p-1 bg-slate-100 rounded-xl">
                    <Keyboard
                      keyboardRef={r => (keyboardRef.current = r)}
                      onChange={handleKeyboardChange}
                      onKeyPress={button => {
                        if (button === "{enter}" && !isLoading) handleSend();
                      }}
                      layout={{
                        default: [
                          "q w e r t y u i o p",
                          "a s d f g h j k l {bksp}",
                          "{shift} z x c v b n m {enter}",
                          "{space}"
                        ],
                        shift: [
                          "Q W E R T Y U I O P",
                          "A S D F G H J K L {bksp}",
                          "{shift} Z X C V B N M {enter}",
                          "{space}"
                        ]
                      }}
                      display={{
                        "{bksp}": "⌫",
                        "{enter}": "Enviar",
                        "{shift}": "⇧",
                        "{space}": "Espacio"
                      }}
                    />
                 </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
