import React, { useState } from 'react';
import { ScanLine, RotateCcw, AlertCircle, FileText, Camera, Activity, HeartPulse, Check, UserPlus, Wind, ActivitySquare, MessageCircle, Keyboard as KeyboardIcon, ArrowLeft, ExternalLink, LayoutDashboard, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { DataField } from './components/DataField';
import { LiveCamera } from './components/LiveCamera';
import { RPPGCamera } from './components/RPPGCamera';
import { SymptomInterview } from './components/SymptomInterview';
import { EmergencyLetter } from './components/EmergencyLetter';
import { LandingPage } from './components/LandingPage';
import { Dashboard, RegisteredPatient } from './components/Dashboard';
import type { IDData, VitalSigns } from './types';

export default function App() {
  const [view, setView] = useState<'landing' | 'kiosk'>('landing');
  const [activeTab, setActiveTab] = useState<'pretriage' | 'dashboard'>('pretriage');
  const [registeredPatients, setRegisteredPatients] = useState<RegisteredPatient[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);



  // Stage 1: ID
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<IDData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stage 2: rPPG Vitals
  const [isRPPGActive, setIsRPPGActive] = useState(false);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>(null);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);

  // Stage 3: Unified Interview
  const [symptoms, setSymptoms] = useState("");
  const [isAnalyzingTriage, setIsAnalyzingTriage] = useState(false);
  const [triageResult, setTriageResult] = useState<any | null>(null);

  const [isLetterOpen, setIsLetterOpen] = useState(false);

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

      // Registrar paciente en lista local
      if (extractedData) {
        setRegisteredPatients(prev => [
          {
            id: `PAT-${Date.now().toString().slice(-4)}`,
            timestamp: 'Justo ahora',
            idData: extractedData,
            vitals: currentVitals,
            symptoms: dictatedSymptoms,
            triageCategory: data.triage?.triageLevel?.includes('Naranja') ? 'Naranja' : 'Verde',
            priorityLevel: 3,
            status: 'En Espera'
          },
          ...prev
        ]);
      }
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
    setIsManualEntry(false);
    setIsLetterOpen(false);
    setCurrentStep(1);
  };

  if (view === 'landing') {
    return <LandingPage onStartDemo={() => setView('kiosk')} />;
  }

  if (isLetterOpen) {
    return (
      <EmergencyLetter 
        idData={extractedData} 
        vitals={vitalSigns}
        symptoms={symptoms}
        onFinish={() => setIsLetterOpen(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 font-sans text-slate-900 pb-12 w-full relative">
      {/* Top Banner Navigation back to Landing */}
      <div className="w-full max-w-4xl flex items-center justify-between py-3 px-4 mb-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <button 
          onClick={() => setView('landing')} 
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-600" />
          <span>Volver a la Presentación</span>
        </button>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('pretriage')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'pretriage'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Pre-Triage</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Pacientes</span>
          </button>
        </div>

        <div className="flex items-center gap-2 hidden sm:flex">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">En Línea</span>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <Dashboard registeredPatients={registeredPatients} />
      ) : (
        <>
          {/* Header & Stepper */}
          <div className="w-full max-w-3xl mb-8 mt-2 flex flex-col items-center">
            <img src="/logo.png" alt="Logo Pre-Triage" className="h-16 w-auto mb-4 object-contain drop-shadow-sm" />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6 text-center font-poppins">
              Estación Pre-Triage Autónoma
            </h1>
        <div className="flex items-center justify-between relative px-2 w-full">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-600 -z-10 rounded-full transition-all duration-500" 
            style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '33%' : currentStep === 3 ? '66%' : '100%' }}></div>
          
          <div className={`flex flex-col items-center gap-2 ${currentStep >= 1 ? 'text-emerald-700' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 1 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <ScanLine className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Identidad</span>
          </div>

          
          <div className={`flex flex-col items-center gap-2 ${currentStep >= 2 ? 'text-emerald-700' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 2 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Signos Vitales</span>
          </div>

          <div className={`flex flex-col items-center gap-2 ${currentStep >= 3 ? 'text-emerald-700' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 3 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Entrevista IA</span>
          </div>

          <div className={`flex flex-col items-center gap-2 ${currentStep >= 4 ? 'text-emerald-700' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 4 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <Check className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Resultados</span>
          </div>
        </div>
      </div>

      {/* Content Step Container */}
      <motion.div 
        layout 
        className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden flex flex-col min-h-[500px]"
      >
        <AnimatePresence mode="wait">
          
          {/* STAGE 1: ID Registration */}
          {currentStep === 1 && (

              <div className="p-6 md:p-8">
                <AnimatePresence mode="wait">
                  {!selectedImage && !isCameraActive && !isManualEntry && (
                    <motion.div 
                      key="start-prompt"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50"
                    >
                      <div className="flex gap-4 mb-4">
                        <button 
                          onClick={() => setIsCameraActive(true)}
                          className="flex flex-col items-center justify-center w-40 h-40 rounded-2xl bg-white border-2 border-emerald-100 shadow-md shadow-emerald-50 hover:border-emerald-500 hover:shadow-lg transition-all group cursor-pointer text-center p-4"
                        >
                          <Camera className="w-10 h-10 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-semibold text-slate-800 mb-1">Abrir Cámara</span>
                        </button>
                        <button 
                          onClick={() => {
                            setIsManualEntry(true);
                            setExtractedData({ names: '', surnames: '', idNumber: '', dateOfBirth: '', maritalStatus: '', issueDate: '', expiryDate: '' });
                          }}
                          className="flex flex-col items-center justify-center w-40 h-40 rounded-2xl bg-white border-2 border-blue-100 shadow-md shadow-blue-50 hover:border-blue-500 hover:shadow-lg transition-all group cursor-pointer text-center p-4"
                        >
                          <KeyboardIcon className="w-10 h-10 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-semibold text-slate-800 mb-1">Registro Manual</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 font-mono text-center">
                        Requiere buena iluminación para OCR o ingreso manual.
                      </p>
                    </motion.div>
                  )}

                  {isCameraActive && (
                    <motion.div key="camera-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <LiveCamera onCapture={handleCapture} onCancel={() => setIsCameraActive(false)} />
                    </motion.div>
                  )}

                  {(selectedImage || isManualEntry) && !isCameraActive && (
                    <motion.div key="processing-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
                      {!isManualEntry && selectedImage && (
                        <div className="relative rounded-xl overflow-hidden shadow-inner border border-slate-200 bg-slate-100 flex justify-center items-center min-h-[220px]">
                          <img src={selectedImage} alt="ID Preview" className="max-w-full max-h-[300px] object-contain rounded-lg" />
                          {isProcessing && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                              <ScanLine className="w-12 h-12 animate-pulse mb-4" />
                              <p className="font-mono text-sm tracking-wider">EJECUTANDO OCR...</p>
                            </div>
                          )}
                        </div>
                      )}

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
                            {isManualEntry ? (
                              <>
                                <div className="mb-4 bg-white border border-emerald-100 rounded-lg p-3">
                                  <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider mb-1">Nombres</span>
                                  <input type="text" className="w-full text-sm font-semibold text-slate-700 font-mono bg-transparent outline-none" placeholder="EJ. JUAN" value={extractedData.names} onChange={e => setExtractedData({...extractedData, names: e.target.value})} />
                                </div>
                                <div className="mb-4 bg-white border border-emerald-100 rounded-lg p-3">
                                  <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider mb-1">Apellidos</span>
                                  <input type="text" className="w-full text-sm font-semibold text-slate-700 font-mono bg-transparent outline-none" placeholder="EJ. PÉREZ" value={extractedData.surnames} onChange={e => setExtractedData({...extractedData, surnames: e.target.value})} />
                                </div>
                                <div className="mb-4 bg-white border border-emerald-100 rounded-lg p-3">
                                  <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider mb-1">Cédula</span>
                                  <input type="text" className="w-full text-sm font-semibold text-slate-700 font-mono bg-transparent outline-none" placeholder="EJ. V 12.345.678" value={extractedData.idNumber} onChange={e => setExtractedData({...extractedData, idNumber: e.target.value})} />
                                </div>
                                <div className="mb-4 bg-white border border-emerald-100 rounded-lg p-3">
                                  <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider mb-1">Fecha Nac.</span>
                                  <input type="text" className="w-full text-sm font-semibold text-slate-700 font-mono bg-transparent outline-none" placeholder="EJ. 01/01/1990" value={extractedData.dateOfBirth} onChange={e => setExtractedData({...extractedData, dateOfBirth: e.target.value})} />
                                </div>
                              </>
                            ) : (
                              <>
                                <DataField label="Nombres" value={extractedData.names} />
                                <DataField label="Apellidos" value={extractedData.surnames} />
                                <DataField label="Cédula" value={extractedData.idNumber} />
                                <DataField label="Fecha Nac." value={extractedData.dateOfBirth} />
                              </>
                            )}
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
                             <button onClick={() => { setIsManualEntry(false); handleReset(); }} disabled={isProcessing} className="flex-1 py-3 border border-slate-300 font-medium text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                               Reintentar OCR
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
                       <button onClick={() => setCurrentStep(1)} className="flex-[0.5] py-3 text-slate-600 font-medium border border-slate-300 rounded-xl hover:bg-white text-sm">
                         Volver
                       </button>
                       <button onClick={() => setCurrentStep(3)} className="flex-[0.5] py-3 text-rose-600 font-bold border-2 border-rose-200 rounded-xl hover:bg-rose-100 text-sm">
                         Omitir
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
                      setCurrentStep(3); // Go to insurance interview
                    }} 
                    onCancel={() => setIsRPPGActive(false)} 
                  />
                )}
              </div>
            </div>
          )}

          {/* STAGE 3: Unified Interview */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full bg-slate-50">
               <SymptomInterview 
                 onComplete={(collectedSymptoms) => {
                   setSymptoms(collectedSymptoms);
                   const vitalsToUse = vitalSigns || {
                     bpm: 75,
                     bp: "120/80",
                     spo2: 98,
                     rr: 16,
                     stress: "Bajo",
                     hrv: 45,
                     glucosa: 95,
                     hba1c: 5.4,
                     chartData: []
                   };
                   handleAnalyzeTriage(collectedSymptoms, vitalsToUse, patientPhoto || "");
                 }}
               />
               <div className="p-4 bg-white border-t border-slate-200">
                 <button 
                   onClick={() => {
                     const vitalsToUse = vitalSigns || {
                       bpm: 75,
                       bp: "120/80",
                       spo2: 98,
                       rr: 16,
                       stress: "Bajo",
                       hrv: 45,
                       glucosa: 95,
                       hba1c: 5.4,
                       chartData: []
                     };
                     handleAnalyzeTriage(symptoms || "Sin síntomas reportados explícitamente", vitalsToUse, patientPhoto || "");
                   }} 
                   className="w-full py-2 text-sm text-slate-500 font-medium hover:underline"
                 >
                   Saltar paso (omitir entrevista)
                 </button>
               </div>
            </motion.div>
          )}

          {/* STAGE 4: Resumen Final y Triage */}
          {currentStep === 4 && (
             <div className="flex flex-col h-full w-full" key="step4">
               {isAnalyzingTriage ? (
                  <div className="flex flex-col h-full items-center justify-center p-12 py-24 text-center">
                     <ScanLine className="w-16 h-16 text-emerald-600 animate-pulse mb-6" />
                     <h2 className="text-2xl font-bold text-slate-900 mb-2 font-poppins">Analizando Datos Clínicos</h2>
                     <p className="text-slate-600 text-sm max-w-sm">La inteligencia artificial está evaluando la biometría y los síntomas del paciente...</p>
                  </div>
               ) : error ? (
                   <div className="p-8 flex flex-col h-full items-center justify-center text-center">
                     <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
                     <h2 className="text-2xl font-bold text-slate-900 mb-2">Error de Análisis</h2>
                     <p className="text-slate-600 text-sm mb-6">{error}</p>
                     <button onClick={() => setCurrentStep(2)} className="py-3 px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">
                       Volver a intentar
                     </button>
                   </div>
               ) : (
                 <div className="flex flex-col w-full">
                   {/* Banner Nivel de Triage */}
                   <div className={`p-6 md:p-8 text-white text-center ${
                     triageResult?.triageLevel?.toLowerCase().includes('rojo') ? 'bg-rose-600' :
                     triageResult?.triageLevel?.toLowerCase().includes('naranja') ? 'bg-orange-500' :
                     triageResult?.triageLevel?.toLowerCase().includes('amarillo') ? 'bg-amber-500' :
                     'bg-emerald-600'
                   }`}>
                     <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/40 shadow-inner">
                       <AlertCircle className="w-8 h-8 text-white" />
                     </div>
                     <h2 className="text-2xl font-extrabold tracking-tight font-poppins">
                       Triage: {triageResult?.triageLevel || "Nivel Verde (Bajo Riesgo)"}
                     </h2>
                     <p className="font-bold text-lg mt-1 tracking-wide">{triageResult?.destination || "Consultorio de Atención Primaria"}</p>
                     <p className="text-white/90 mt-2 font-mono text-xs max-w-xs mx-auto bg-black/20 px-4 py-1.5 rounded-full inline-block">
                       Tiempo estimado de espera: {triageResult?.waitTime || "< 15 minutos"}
                     </p>
                   </div>

                   {/* Resumen e Identidad */}
                   <div className="p-6 md:p-8 flex flex-col gap-6 bg-white">
                     
                     {symptoms && (
                       <div className="border border-amber-200 rounded-2xl p-5 bg-amber-50 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                         <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">
                           Motivo de Consulta (Sintomatología)
                         </h3>
                         <p className="text-sm text-slate-700 italic">
                           "{symptoms}"
                         </p>
                       </div>
                     )}

                     <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
                       <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-2">
                         <FileText className="w-4 h-4 text-slate-700" /> Resumen Clínico IA
                       </h3>
                       <p className="text-sm text-slate-700 leading-relaxed">
                         {triageResult?.clinicalSummary || "Paciente evaluado mediante la estación de pre-triaje autónoma. Parámetros biométricos y signos vitales estables. Se emite reporte formal para valoración médica."}
                       </p>
                     </div>

                     {extractedData && (
                       <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
                         <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center gap-2">
                           <UserPlus className="w-4 h-4 text-emerald-600" /> Datos de Identidad Registrados
                         </h3>
                         <div className="grid grid-cols-2 gap-4 text-xs">
                           <div>
                             <span className="text-slate-400 block mb-1 font-mono">NOMBRES Y APELLIDOS</span>
                             <span className="font-bold text-slate-900 text-sm">{extractedData.names} {extractedData.surnames}</span>
                           </div>
                           <div>
                             <span className="text-slate-400 block mb-1 font-mono">CÉDULA / ID</span>
                             <span className="font-bold text-slate-900 text-sm">{extractedData.idNumber}</span>
                           </div>
                         </div>
                       </div>
                     )}

                     {/* Carta de Sucesos PDF Box */}
                     <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                       <div>
                         <div className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                           <FileText className="w-4 h-4 text-emerald-600" /> Carta de Sucesos (Formato Oficial)
                         </div>
                         <div className="text-xs text-slate-600 mt-0.5">Declaración jurada y carta de reclamo para seguro médico en PDF.</div>
                       </div>
                       <button
                         onClick={() => setIsLetterOpen(true)}
                         className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 flex items-center gap-2 shrink-0"
                       >
                         <FileText className="w-4 h-4" /> Generar / Descargar PDF
                       </button>
                     </div>

                     <button 
                        onClick={resetAll}
                        className="mt-2 py-4 w-full rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 text-sm shadow-md"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Registrar Nuevo Paciente
                      </button>
                   </div>
                 </div>
               )}
             </div>
           )}

         </AnimatePresence>
      </motion.div>
    </>
  )}
</div>
  );
}
