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
  const [showKeyboard, setShowKeyboard] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const keyboardRef = useRef<any>(null);

  useEffect(() => {
    // Initial fetch to start conversation
    requestDoctorResponse([]);
    
    // Setup Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false; // Solo resultados finales para evitar duplicados en el teclado
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => {
            const newVal = prev + (prev.endsWith(" ") ? "" : " ") + finalTranscript.trim();
            if (keyboardRef.current) keyboardRef.current.setInput(newVal);
            return newVal;
          });
        }
      };
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      
      recognitionRef.current = recognition;
    }
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
        if (replyTxt.includes("TRIAGE_COMPLETE") || replyTxt.includes("TRIAGE_COMPLETE.")) {
          replyTxt = replyTxt.replace(/TRIAGE_COMPLETE\.?/g, '').trim();
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
    const maxTriageQuestions = 7;
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

  const toggleDictation = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const handleKeyboardChange = (input: string) => {
    setInputValue(input);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-[500px]">
      <div className="p-4 md:p-8 bg-emerald-600 text-white flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-16 w-auto mb-3 object-contain drop-shadow-md bg-white rounded-xl p-2" />
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Evaluación Médica Automatizada</h2>
        <p className="text-emerald-100 mt-2 font-mono text-sm max-w-sm text-center">
          Responde estas breves preguntas para que la IA determine su triage.
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
            <div className="p-4 rounded-2xl bg-white border border-slate-200 rounded-tl-none flex gap-1 items-center h-[46px]">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKeyboard(!showKeyboard)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition ${showKeyboard ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  <KeyboardIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleDictation}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700'}`}
                >
                  {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
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
                  placeholder={isListening ? "Escuchando..." : "Escribe o usa el micrófono..."}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                  autoFocus
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center shrink-0 cursor-pointer text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

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
