import React, { useState } from 'react';
import { ScanLine, RotateCcw, AlertCircle, FileText, Camera, Activity, HeartPulse, Check, UserPlus, Wind, ActivitySquare, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { DataField } from './components/DataField';
import { LiveCamera } from './components/LiveCamera';
import { RPPGCamera } from './components/RPPGCamera';
import { SymptomInterview } from './components/SymptomInterview';
import type { IDData, VitalSigns } from './types';

export default function App() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Stage 1: ID
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<IDData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stage 2: rPPG Vitals
  const [isRPPGActive, setIsRPPGActive] = useState(false);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>(null);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);

  // Stage 3 & 4: Symptoms & Triage
  const [symptoms, setSymptoms] = useState("");
  const [isAnalyzingTriage, setIsAnalyzingTriage] = useState(false);
  const [triageResult, setTriageResult] = useState<any | null>(null);

  const handleCapture = async (base64Image: string) => {
    setSelectedImage(base64Image);
    setIsCameraActive(false);
    setError(null);
    setExtractedData(null);
    setIsProcessing(true);

    try {
      const match = base64Image.match(/^data:(image\/\w+);base64,/);
      const mimeType = match ? match[1] : 'image/jpeg';

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, mimeType }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setExtractedData(result.data);
    } catch (err: any) {
      setError(err.message || "Error inesperado durante la extracción.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeTriage = async (dictatedSymptoms: string, currentVitals: VitalSigns, currentPhotoUrl: string) => {
    setIsAnalyzingTriage(true);
    setCurrentStep(4);
    setError(null);
    try {
      const mimeType = currentPhotoUrl?.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           symptoms: dictatedSymptoms,
           vitals: currentVitals,
           imageBase64: currentPhotoUrl,
           mimeType
        })
      });
      if (!response.ok) {
         const errData = await response.json().catch(() => ({}));
         throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTriageResult(data.triage);
    } catch (e: any) {
      setError(e.message || "Error analizando el triage");
    } finally {
      setIsAnalyzingTriage(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setExtractedData(null);
    setError(null);
    setIsCameraActive(false);
  };

  const resetAll = () => {
    handleReset();
    setVitalSigns(null);
    setPatientPhoto(null);
    setSymptoms("");
    setTriageResult(null);
    setIsRPPGActive(false);
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 font-sans text-slate-900 pb-12 w-full">
      {/* Header & Stepper */}
      <div className="w-full max-w-3xl mb-8 mt-4 md:mt-8 flex flex-col items-center">
        <img src="/logo.png" alt="Logo Pre-Triage" className="h-16 w-auto mb-4 object-contain drop-shadow-md" />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6 text-center">
          Estación Pre-Triage Autónoma
        </h1>
        <div className="flex items-center justify-between relative px-2 w-full">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-600 -z-10 rounded-full transition-all duration-500" 
            style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '33%' : currentStep === 3 ? '66%' : '100%' }}></div>
          
          <div className={`flex flex-col items-center gap-2 ${currentStep >= 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 1 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <ScanLine className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Identidad</span>
          </div>
          
          <div className={`flex flex-col items-center gap-2 ${currentStep >= 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 2 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Signos Vitales</span>
          </div>

          <div className={`flex flex-col items-center gap-2 ${currentStep >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 3 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Síntomas</span>
          </div>

          <div className={`flex flex-col items-center gap-2 ${currentStep >= 4 ? 'text-emerald-600' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 4 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <Check className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Resultados</span>
          </div>
        </div>
      </div>

      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
      >
        <AnimatePresence mode="wait">
          
          {/* STAGE 1: Identificación (OCR) */}
          {currentStep === 1 && (
            <div className="flex flex-col h-full" key="step1">
              <div className="p-6 md:p-8 bg-slate-900 text-white text-center">
                <h2 className="text-2xl font-semibold tracking-tight">Registro de Paciente</h2>
                <p className="text-slate-400 mt-2 font-mono text-sm max-w-sm mx-auto">
                  Por favor, captura la Cédula de Identidad para iniciar el registro.
                </p>
              </div>

              <div className="p-6 md:p-8">
                <AnimatePresence mode="wait">
                  {!selectedImage && !isCameraActive && (
                    <motion.div 
                      key="start-prompt"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50"
                    >
                      <button 
                        onClick={() => setIsCameraActive(true)}
                        className="flex flex-col items-center justify-center w-48 h-48 rounded-2xl bg-white border-2 border-emerald-100 shadow-md shadow-emerald-50 hover:border-emerald-500 hover:shadow-lg transition-all group cursor-pointer text-center p-4 mb-4"
                      >
                        <Camera className="w-12 h-12 text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
                        <span className="text-base font-semibold text-slate-800 mb-1">Abrir Cámara</span>
                        <span className="text-xs text-slate-500 font-medium">Toca para capturar documento</span>
                      </button>
                      <p className="text-xs text-slate-400 font-mono text-center">
                        Requiere buena iluminación para OCR.
                      </p>
                    </motion.div>
                  )}

                  {isCameraActive && (
                    <motion.div key="camera-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <LiveCamera onCapture={handleCapture} onCancel={() => setIsCameraActive(false)} />
                    </motion.div>
                  )}

                  {selectedImage && !isCameraActive && (
                    <motion.div key="processing-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
                      <div className="relative rounded-xl overflow-hidden shadow-inner border border-slate-200 bg-slate-100 flex justify-center items-center min-h-[220px]">
                        <img src={selectedImage} alt="ID Preview" className="max-w-full max-h-[300px] object-contain rounded-lg" />
                        {isProcessing && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                            <ScanLine className="w-12 h-12 animate-pulse mb-4" />
                            <p className="font-mono text-sm tracking-wider">EJECUTANDO OCR...</p>
                          </div>
                        )}
                      </div>

                      {error && (
                        <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 text-red-800">
                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p className="text-sm">{error}</p>
                        </div>
                      )}

                      {extractedData ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm">
                          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-emerald-200">
                            <UserPlus className="w-5 h-5 text-emerald-700" />
                            <h3 className="font-semibold text-emerald-900">Paciente Identificado</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 mb-2">
                            <DataField label="Nombres" value={extractedData.names} />
                            <DataField label="Apellidos" value={extractedData.surnames} />
                            <DataField label="Cédula" value={extractedData.idNumber} />
                            <DataField label="Fecha Nac." value={extractedData.dateOfBirth} />
                          </div>
                          
                          <button 
                            onClick={() => setCurrentStep(2)}
                            className="mt-4 w-full py-3.5 px-4 rounded-xl bg-emerald-600 font-bold text-white shadow-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2 text-lg"
                          >
                            Continuar a Signos Vitales
                            <Activity className="w-5 h-5" />
                          </button>
                        </motion.div>
                      ) : (
                        <div className="flex gap-3">
                           {error && !isProcessing && (
                             <button onClick={handleReset} disabled={isProcessing} className="flex-1 py-3 border border-slate-300 font-medium text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                               Reintentar
                             </button>
                           )}
                           {isProcessing && (
                             <div className="flex-1 py-3 bg-slate-100 rounded-lg text-slate-500 text-center font-medium opacity-70">
                               Procesando datos...
                             </div>
                           )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* STAGE 2: Signos Vitales (rPPG) */}
          {currentStep === 2 && (
            <div className="flex flex-col h-full" key="step2">
              <div className="p-6 md:p-8 bg-rose-600 text-white text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-rose-50">Lectura de Signos Vitales</h2>
                <p className="text-rose-200 mt-2 font-mono text-sm max-w-sm mx-auto">
                  Medición óptica no invasiva de fotopletismografía remota (rPPG).
                </p>
              </div>
              
              <div className="p-6 md:p-8">
                {!isRPPGActive && vitalSigns === null ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-rose-200 rounded-xl bg-rose-50">
                     <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6">
                       <HeartPulse className="w-10 h-10 text-rose-500" />
                     </div>
                     <h3 className="text-lg font-bold text-rose-900 mb-2">Fotopletismografía Remota</h3>
                     <p className="text-sm text-rose-700 text-center mb-8 max-w-xs">
                       Calcularemos el ritmo cardíaco, respiratorio y VFC analizando el cambio de color de la piel durante 30 segundos.
                     </p>
                     
                     <div className="flex w-full gap-3">
                       <button onClick={() => setCurrentStep(1)} className="flex-1 py-3 text-slate-600 font-medium border border-slate-300 rounded-xl hover:bg-white">
                         Volver
                       </button>
                       <button 
                         onClick={() => setIsRPPGActive(true)}
                         className="flex-[2] py-3 bg-rose-600 text-white rounded-xl shadow-md shadow-rose-200 hover:bg-rose-700 font-bold transition flex justify-center items-center gap-2"
                       >
                         <Camera className="w-5 h-5" />
                         Iniciar Cámara
                       </button>
                     </div>
                  </div>
                ) : null}

                {isRPPGActive && (
                  <RPPGCamera 
                    onComplete={({vitals, photoUrl}) => {
                      setVitalSigns(vitals);
                      setPatientPhoto(photoUrl);
                      setIsRPPGActive(false);
                      setCurrentStep(3); // Go to symptom interview
                    }} 
                    onCancel={() => setIsRPPGActive(false)} 
                  />
                )}
              </div>
            </div>
          )}

          {/* STAGE 3: Encuesta de Síntomas */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full bg-slate-50">
               <SymptomInterview 
                 onComplete={(collectedSymptoms) => {
                   setSymptoms(collectedSymptoms);
                   if (vitalSigns && patientPhoto) {
                     handleAnalyzeTriage(collectedSymptoms, vitalSigns, patientPhoto);
                   }
                 }}
               />
            </motion.div>
          )}

          {/* STAGE 4: Resumen Final y Triage */}
          {currentStep === 4 && (
             <div className="flex flex-col h-full" key="step4">
               {isAnalyzingTriage ? (
                  <div className="flex flex-col h-full items-center justify-center p-12 py-24">
                     <ScanLine className="w-16 h-16 text-emerald-500 animate-pulse mb-6" />
                     <h2 className="text-2xl font-bold text-slate-800 mb-2">Analizando Datos Clínicos</h2>
                     <p className="text-slate-500 text-center max-w-sm">La inteligencia artificial está evaluando los signos vitales y los síntomas del paciente...</p>
                  </div>
               ) : error ? (
                   <div className="p-8 flex flex-col h-full items-center justify-center text-center">
                     <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                     <h2 className="text-2xl font-bold text-slate-800 mb-2">Error de Análisis</h2>
                     <p className="text-slate-600 mb-6">{error}</p>
                     <button onClick={() => setCurrentStep(2)} className="py-3 px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">
                       Volver a intentar
                     </button>
                   </div>
               ) : triageResult && extractedData && vitalSigns ? (
                 <>
                   <div className={`p-6 md:p-8 text-white text-center ${
                     triageResult.triageLevel.toLowerCase().includes('rojo') ? 'bg-red-600' :
                     triageResult.triageLevel.toLowerCase().includes('naranja') ? 'bg-orange-500' :
                     triageResult.triageLevel.toLowerCase().includes('amarillo') ? 'bg-amber-500' :
                     triageResult.triageLevel.toLowerCase().includes('verde') ? 'bg-green-500' :
                     'bg-emerald-600'
                   }`}>
                     <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/40">
                       <AlertCircle className="w-8 h-8 text-white" />
                     </div>
                     <h2 className="text-2xl font-semibold tracking-tight">Triage: Nivel {triageResult.triageLevel}</h2>
                     <p className="font-bold text-lg mt-1 tracking-wide">{triageResult.destination}</p>
                     <p className="text-white/80 mt-1 font-mono text-sm max-w-sm mx-auto bg-black/20 px-4 py-2 rounded-lg">
                       Espera aprox: {triageResult.waitTime}
                     </p>
                   </div>
                   
                   <div className="p-6 md:p-8 flex flex-col gap-6">
                     
                     {symptoms && (
                       <div className="border border-amber-200 rounded-xl p-5 bg-amber-50 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                         <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-2">
                           Motivo de Consulta (Dictado)
                         </h3>
                         <p className="text-sm text-slate-700 italic">
                           "{symptoms}"
                         </p>
                       </div>
                     )}

                     <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-slate-800"></div>
                       <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-2">
                         <FileText className="w-4 h-4" /> Resumen Clínico IA
                       </h3>
                       <p className="text-sm text-slate-700 leading-relaxed">
                         {triageResult.clinicalSummary}
                       </p>
                     </div>

                     <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                       <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                         <UserPlus className="w-4 h-4" /> Datos de Identidad
                       </h3>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <span className="text-xs text-slate-400 block mb-1 font-mono">NOMBRES Y APELLIDOS</span>
                           <span className="font-semibold text-slate-800">{extractedData.names} {extractedData.surnames}</span>
                         </div>
                         <div>
                           <span className="text-xs text-slate-400 block mb-1 font-mono">CÉDULA</span>
                           <span className="font-semibold text-slate-800">{extractedData.idNumber}</span>
                         </div>
                         <div>
                           <span className="text-xs text-slate-400 block mb-1 font-mono">FECHA NACIMIENTO</span>
                           <span className="font-semibold text-slate-800">{extractedData.dateOfBirth}</span>
                         </div>
                       </div>
                     </div>

                     <div className="border border-slate-200 rounded-xl p-5 bg-rose-50 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                       <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500 mb-4 flex items-center gap-2">
                         <HeartPulse className="w-4 h-4" /> Signos Vitales (rPPG)
                       </h3>
                       
                       <div className="grid grid-cols-2 gap-3 mb-6">
                         <div className="bg-white p-3 rounded-lg border border-rose-100 flex flex-col items-center">
                           <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                              <HeartPulse className="w-3 h-3"/> Ritmo Cardíaco
                           </span>
                           <div className="flex items-baseline gap-1">
                             <span className="text-2xl font-extrabold text-rose-600">{vitalSigns.bpm}</span>
                             <span className="text-xs font-bold text-rose-400">BPM</span>
                           </div>
                         </div>
                         
                         <div className="bg-white p-3 rounded-lg border border-blue-100 flex flex-col items-center">
                           <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                              <Wind className="w-3 h-3"/> Respiración
                           </span>
                           <div className="flex items-baseline gap-1">
                             <span className="text-2xl font-extrabold text-blue-600">{vitalSigns.rr}</span>
                             <span className="text-xs font-bold text-blue-400">RPM</span>
                           </div>
                         </div>

                         <div className="bg-white p-3 rounded-lg border border-purple-100 flex flex-col items-center">
                           <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                              <ActivitySquare className="w-3 h-3"/> Var. (HRV)
                           </span>
                           <div className="flex items-baseline gap-1">
                             <span className="text-2xl font-extrabold text-purple-600">{vitalSigns.hrv}</span>
                             <span className="text-xs font-bold text-purple-400">MS</span>
                           </div>
                         </div>

                         <div className="bg-white p-3 rounded-lg border border-amber-100 flex flex-col items-center">
                           <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                              <Activity className="w-3 h-3"/> Estrés
                           </span>
                           <div className="flex items-baseline gap-1 mt-1">
                             <span className="text-lg font-extrabold text-amber-600">{vitalSigns.stress}</span>
                           </div>
                         </div>
                       </div>

                       {/* Graficado en Resumen utilizando Recharts */}
                       <div className="w-full h-32 bg-white rounded-lg border border-slate-200 flex flex-col justify-center relative overflow-hidden">
                          <p className="absolute top-2 left-3 text-[10px] font-bold text-slate-400 z-10 uppercase">Onda de Pulso Óptico (Últimos 5s)</p>
                          <ResponsiveContainer width="100%" height="100%" minHeight={128} minWidth={200}>
                            <LineChart data={vitalSigns.chartData} margin={{ top: 25, right: 5, left: 5, bottom: 5 }}>
                              <YAxis domain={['auto', 'auto']} hide />
                              <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                labelStyle={{ display: 'none' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#e11d48" 
                                strokeWidth={2} 
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                       </div>
                     </div>

                     <button 
                        onClick={resetAll}
                        className="mt-4 py-4 w-full rounded-xl bg-slate-900 font-bold text-white shadow-md hover:bg-slate-800 transition flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Registrar Nuevo Paciente
                      </button>
                   </div>
                 </>
               ) : null}
             </div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
