import React, { useState, useEffect } from 'react';
import { ScanLine, RotateCcw, AlertCircle, FileText, Camera, Activity, HeartPulse, Check, UserPlus, Wind, ActivitySquare, MessageCircle, Keyboard as KeyboardIcon, ArrowLeft, ExternalLink, LayoutDashboard, Stethoscope, ShieldCheck, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { DataField } from './components/DataField';
import { LiveCamera } from './components/LiveCamera';
import { RPPGCamera } from './components/RPPGCamera';
import { SymptomInterview } from './components/SymptomInterview';
import { UnifiedConsultation } from './components/UnifiedConsultation';
import { EmergencyLetter } from './components/EmergencyLetter';
import { LandingPage } from './components/LandingPage';
import { Dashboard, RegisteredPatient } from './components/Dashboard';
import type { IDData, VitalSigns } from './types';

export default function App() {
  const [view, setView] = useState<'landing' | 'kiosk'>('landing');
  const [activeTab, setActiveTab] = useState<'pretriage' | 'dashboard'>('pretriage');
  const [registeredPatients, setRegisteredPatients] = useState<RegisteredPatient[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);



  // Stage 1: ID & Insurance Verification
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualCedulaInput, setManualCedulaInput] = useState<string>("");
  const [isSearchingCedula, setIsSearchingCedula] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<IDData | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<string>("Seguros Caracas");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [patientAddress, setPatientAddress] = useState<string>("");
  const [incidentType, setIncidentType] = useState<"Clinico" | "Traumatico">("Clinico");
  const [error, setError] = useState<string | null>(null);

  const [editableSummary, setEditableSummary] = useState<string>("");
  const [isSendingTicket, setIsSendingTicket] = useState(false);
  
  const handleSendTicket = () => {
    setIsSendingTicket(true);
    const payload = {
      patientInfo: {
        isTitular,
        idData: extractedData,
        phone: patientPhone,
        email: patientEmail,
        missingIdPhysical: needsReception
      },
      vitals: vitalSigns,
      symptoms: symptoms,
      triage: {
        ...triageResult,
        clinicalSummary: editableSummary || triageResult?.clinicalSummary
      },
      pdfAttached: "EmergencyLetter_Generated.pdf" // Placeholder since window.print() handles PDF natively
    };
    
    console.log("=== ENVIANDO TICKET AL SISTEMA INTERNO ===");
    console.log(JSON.stringify(payload, null, 2));
    
    setTimeout(() => {
      alert("Ticket enviado con éxito al sistema interno.");
      setIsSendingTicket(false);
    }, 1500);
  };


  const [isTitular, setIsTitular] = useState<string>("titular");
  const [titularImage, setTitularImage] = useState<string | null>(null);
  const [needsReception, setNeedsReception] = useState<boolean>(false);
  const [isCameraActiveTitular, setIsCameraActiveTitular] = useState<boolean>(false);
  const [titularData, setTitularData] = useState<any>(null);
  const [isProcessingTitular, setIsProcessingTitular] = useState<boolean>(false);
  
  const [isCameraActivePaciente, setIsCameraActivePaciente] = useState<boolean>(false);
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [pacienteImage, setPacienteImage] = useState<string | null>(null);
  const [isProcessingPaciente, setIsProcessingPaciente] = useState<boolean>(false);

  const [role, setRole] = useState<'titular' | 'representante' | null>('titular');
  const [attentionFor, setAttentionFor] = useState<'mi' | 'menor'>('mi');
  const [titularBypassed, setTitularBypassed] = useState<boolean>(false);
  const [pacienteBypassed, setPacienteBypassed] = useState<boolean>(false);
  const [showBypassModal, setShowBypassModal] = useState<'titular' | 'paciente' | null>(null);
  const [bypassPin, setBypassPin] = useState<string>('');


  const handleLookupCedula = () => {
    if (!manualCedulaInput.trim()) return;
    setIsSearchingCedula(true);
    setTimeout(() => {
      setExtractedData({
        names: 'CARLOS ENRIQUE',
        surnames: 'MENDOZA ROJAS',
        idNumber: manualCedulaInput.toUpperCase().startsWith('V') ? manualCedulaInput.toUpperCase() : `V-${manualCedulaInput}`,
        dateOfBirth: '14/08/1985',
        maritalStatus: 'SOLTERO',
        issueDate: '10/05/2015',
        expiryDate: '10/05/2025'
      });
      setPatientPhone('+58 414 789 0123');
      setPatientEmail('carlos.mendoza@email.com');
      setPatientAddress('Av. Francisco de Miranda, Edif. Galipán, Piso 4, Chacao, Caracas');
      setIsSearchingCedula(false);
    }, 800);
  };

  // Stage 2: rPPG Vitals
  const [isRPPGActive, setIsRPPGActive] = useState(false);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>(null);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);

  // Stage 3: Unified Interview
  const [symptoms, setSymptoms] = useState("");
  const [isAnalyzingTriage, setIsAnalyzingTriage] = useState(false);
  const [triageResult, setTriageResult] = useState<any | null>(null);

  const [isLetterOpen, setIsLetterOpen] = useState(false);

  const handleCapturePaciente = async (base64Image: string) => {
    setPacienteImage(base64Image);
    setIsCameraActivePaciente(false);
    setError(null);
    setIsProcessingPaciente(true);

    try {
      const match = base64Image.match(/^data:(image\/\w+);base64,/);
      const mimeType = match ? match[1] : 'image/jpeg';
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, mimeType }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setPacienteData(result.data);
    } catch (err: any) {
      setError("Error escaneando cédula del paciente.");
    } finally {
      setIsProcessingPaciente(false);
    }
  };

  const handleCaptureTitular = async (base64Image: string) => {
    setTitularImage(base64Image);
    setIsCameraActiveTitular(false);
    setError(null);
    setIsProcessingTitular(true);

    try {
      const match = base64Image.match(/^data:(image\/\w+);base64,/);
      const mimeType = match ? match[1] : 'image/jpeg';

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, mimeType }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setTitularData(result.data);
    } catch (err: any) {
      setError("Error escaneando cédula del titular.");
    } finally {
      setIsProcessingTitular(false);
    }
  };

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
      console.log("=== DATOS EXTRAÍDOS OCR (CEDULA) ===", result.data);
      setExtractedData(result.data);
    } catch (err: any) {
      setError(err.message || "Error inesperado durante la extracción.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeTriage = async (dictatedSymptoms: string, currentVitals: VitalSigns, currentPhotoUrl: string) => {
    setIsAnalyzingTriage(true);
    setCurrentStep(3);
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
      console.log("=== RESULTADO DE TRIAGE (VITALES + SÍNTOMAS) ===", data.triage);
      setTriageResult(data.triage);
        setEditableSummary(data.triage.clinicalSummary);

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
    setTitularImage(null);
    setPacienteImage(null);
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
        idData={attentionFor === 'menor' && pacienteData && (pacienteData.names || pacienteData.surnames) ? pacienteData : (extractedData || pacienteData)} 
        vitals={vitalSigns}
        symptoms={editableSummary || symptoms}
        idImage={selectedImage}
        titularImage={titularImage}
        pacienteImage={pacienteImage}
        insurerName={selectedInsurer}
        phone={patientPhone}
        email={patientEmail}
        isTitular={role === 'titular' ? 'titular' : 'representante'}
        titularData={role === 'titular' ? extractedData : titularData} 
        mainUserData={extractedData}
        onFinish={() => setIsLetterOpen(false)} 
      />

    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 font-sans text-slate-900 pb-12 w-full relative">
      {/* Top Banner Navigation back to Landing */}
      {/* Modal Bypass (Recepción) */}
      <AnimatePresence>
        {showBypassModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <div className="bg-amber-50 border-4 border-amber-500 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
              <button 
                onClick={() => { setShowBypassModal(null); setBypassPin(''); }}
                className="absolute top-4 right-4 text-amber-700 hover:text-amber-900"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-amber-200 text-amber-600 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-amber-900">Validación en Recepción</h2>
                <p className="text-sm text-amber-800">
                  Para omitir este documento, un funcionario de recepción debe ingresar su clave de autorización.
                </p>
                
                <input 
                  type="password"
                  maxLength={4}
                  value={bypassPin}
                  onChange={(e) => {
                    const pin = e.target.value;
                    setBypassPin(pin);
                    if (pin === '1234') {
                      if (showBypassModal === 'titular') setTitularBypassed(true);
                      if (showBypassModal === 'paciente') setPacienteBypassed(true);
                      setShowBypassModal(null);
                      setBypassPin('');
                    }
                  }}
                  placeholder="****"
                  className="w-full text-center tracking-[1em] font-mono text-2xl p-4 rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-200 outline-none bg-white"
                  autoFocus
                />
                {bypassPin.length > 0 && bypassPin !== '1234' && (
                  <p className="text-xs text-red-600 font-bold">Clave incorrecta.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <div className="flex items-center justify-between relative px-2 w-full max-w-xl mx-auto">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-600 -z-10 rounded-full transition-all duration-500" 
            style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}></div>
          
          <div className={`flex flex-col items-center gap-2 ${currentStep >= 1 ? 'text-emerald-700' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 1 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <ScanLine className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">1. Identidad</span>
          </div>

          <div className={`flex flex-col items-center gap-2 ${currentStep >= 2 ? 'text-emerald-700' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 2 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">2. Consulta & Signos</span>
          </div>

          <div className={`flex flex-col items-center gap-2 ${currentStep >= 3 ? 'text-emerald-700' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 transition-colors ${currentStep >= 3 ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
              <Check className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">3. Triaje Clínico</span>
          </div>
        </div>
      </div>

      {/* Content Step Container */}
      <motion.div 
        layout 
        className={`w-full ${currentStep === 2 ? 'max-w-6xl' : 'max-w-3xl'} bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden flex flex-col min-h-[560px] transition-all duration-300`}
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
                          <span className="text-sm font-semibold text-slate-800 mb-1">Escanear Cédula</span>
                        </button>
                        <button 
                          onClick={() => {
                            setIsManualEntry(true);
                            setManualCedulaInput('');
                            setExtractedData(null);
                          }}
                          className="flex flex-col items-center justify-center w-40 h-40 rounded-2xl bg-white border-2 border-blue-100 shadow-md shadow-blue-50 hover:border-blue-500 hover:shadow-lg transition-all group cursor-pointer text-center p-4"
                        >
                          <KeyboardIcon className="w-10 h-10 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-semibold text-slate-800 mb-1">Registro Manual</span>
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setNeedsReception(true);
                          setIsManualEntry(true);
                          setManualCedulaInput('V-00000000'); // Dummy para avanzar
                        }}
                        className="mt-4 px-6 py-2 bg-rose-100 text-rose-700 font-bold rounded-lg hover:bg-rose-200 transition-colors text-xs flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" /> <span>No poseo documento físico (Validar en Recepción)</span>
                      </button>
                    </motion.div>

                  )}

                  {isCameraActive && (
                    <motion.div key="camera-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <LiveCamera onCapture={handleCapture} onCancel={() => setIsCameraActive(false)} />
                    </motion.div>
                  )}

                  {isCameraActiveTitular && (
                    <motion.div key="camera-titular-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <LiveCamera onCapture={handleCaptureTitular} onCancel={() => setIsCameraActiveTitular(false)} />
                    </motion.div>
                  )}

                  {isCameraActivePaciente && (
                    <motion.div key="camera-paciente-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <LiveCamera onCapture={handleCapturePaciente} onCancel={() => setIsCameraActivePaciente(false)} />
                    </motion.div>
                  )}

                  {isManualEntry && !extractedData && (
                    <motion.div key="manual-entry-input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 p-6 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                        <KeyboardIcon className="w-6 h-6 text-blue-600" />
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">Consulta por Cédula</h3>
                          <p className="text-xs text-slate-500">Introduce únicamente la Cédula de Identidad para simular la búsqueda en la Base de Datos del Seguro.</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Número de Cédula de Identidad</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={manualCedulaInput}
                            onChange={e => setManualCedulaInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLookupCedula()}
                            placeholder="Ej. V-22.222.222"
                            className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-base font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleLookupCedula}
                            disabled={!manualCedulaInput.trim() || isSearchingCedula}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
                          >
                            {isSearchingCedula ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <span>Buscar</span>
                                <ScanLine className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => setIsManualEntry(false)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline self-center mt-2"
                      >
                        Cancelar y volver a opciones
                      </button>
                    </motion.div>
                  )}

                  {(selectedImage || (isManualEntry && extractedData)) && !isCameraActive && !isCameraActiveTitular && !isCameraActivePaciente && (
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
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-5 h-5 text-emerald-700" />
                              <h3 className="font-semibold text-emerald-900">Paciente e Historial de Pólizas</h3>
                            </div>
                            <span className="bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Cédula Validada</span>
                          </div>

                          {/* Datos personales extraídos */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-white/70 p-3 rounded-lg border border-emerald-100">
                            <DataField label="Nombres" value={extractedData.names} />
                            <DataField label="Apellidos" value={extractedData.surnames} />
                            <DataField label="Cédula" value={extractedData.idNumber} />
                            <DataField label="Fecha Nac." value={extractedData.dateOfBirth} />
                          </div>

                          {/* Rol y Cédulas Faltantes */}
                          <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-4">
                            <div className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                              👤 Mi Identidad en la Póliza
                            </div>
                            <div className="flex gap-4">
                              <button
                                onClick={() => { setRole('titular'); setAttentionFor('mi'); }}
                                className={`px-4 py-3 rounded-lg font-bold text-sm uppercase border-2 transition-colors flex-1 ${
                                  role === 'titular' 
                                    ? 'bg-emerald-600 text-white border-emerald-600' 
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300'
                                }`}
                              >
                                Soy Titular
                              </button>
                              <button
                                onClick={() => { setRole('representante'); setAttentionFor('menor'); }}
                                className={`px-4 py-3 rounded-lg font-bold text-sm uppercase border-2 transition-colors flex-1 ${
                                  role === 'representante' 
                                    ? 'bg-emerald-600 text-white border-emerald-600' 
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300'
                                }`}
                              >
                                Soy Representante
                              </button>
                            </div>

                            {role === 'titular' && (
                              <div className="space-y-3 pt-3 border-t border-slate-100 mt-3">
                                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block">¿Para quién es la atención médica?</span>
                                <div className="flex gap-4">
                                  <button 
                                    onClick={() => setAttentionFor('mi')}
                                    className={`px-4 py-3 rounded-lg font-bold text-sm uppercase border-2 transition-colors flex-1 ${attentionFor === 'mi' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                  >
                                    Para Mí
                                  </button>
                                  <button 
                                    onClick={() => setAttentionFor('menor')}
                                    className={`px-4 py-3 rounded-lg font-bold text-sm uppercase border-2 transition-colors flex-1 ${attentionFor === 'menor' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                  >
                                    Atención médica para menor / tercero
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Cédulas Faltantes */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                              {role === 'representante' && (
                                <div className="space-y-2">
                                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Cédula del Titular del Seguro (Requerida)</span>
                                  {isProcessingTitular ? (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-2 font-bold text-slate-500 animate-pulse">
                                      <ScanLine className="w-5 h-5" /> <span>Procesando Cédula Titular...</span>
                                    </div>
                                  ) : titularBypassed ? (
                                     <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                                       <div>
                                         <div className="text-sm font-bold text-amber-900">Documento Omitido</div>
                                         <div className="text-xs text-amber-700">Se validará el documento del titular en recepción</div>
                                       </div>
                                       <button onClick={() => setTitularBypassed(false)} className="text-slate-400 hover:text-red-500">
                                         <X className="w-5 h-5" />
                                       </button>
                                     </div>
                                  ) : titularData ? (
                                     <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                                       <div>
                                         <div className="text-sm font-bold text-emerald-900">{titularData.names} {titularData.surnames}</div>
                                         <div className="text-xs text-emerald-700">C.I: {titularData.idNumber}</div>
                                       </div>
                                       <button onClick={() => setTitularData(null)} className="text-slate-400 hover:text-red-500">
                                         <X className="w-5 h-5" />
                                       </button>
                                     </div>
                                  ) : (
                                     <div className="flex flex-col sm:flex-row gap-2">
                                       <button 
                                         onClick={() => setIsCameraActiveTitular(true)}
                                         className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-emerald-500 hover:bg-emerald-50 transition-colors text-slate-600 hover:text-emerald-600 font-bold"
                                       >
                                         <Camera className="w-6 h-6" /> <span>Escanear Cédula</span>
                                       </button>
                                       <button 
                                         onClick={() => setShowBypassModal('titular')}
                                         className="flex-[0.5] flex flex-col items-center justify-center gap-1 py-2 px-2 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50 hover:border-amber-500 hover:bg-amber-100 transition-colors text-amber-700 font-bold text-xs text-center"
                                       >
                                         <AlertCircle className="w-5 h-5" />
                                         <span>No tengo el documento</span>
                                       </button>
                                     </div>
                                  )}
                                </div>
                              )}

                              {attentionFor === 'menor' && (
                                <div className="space-y-2">
                                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Cédula del Paciente / Menor (Requerida)</span>
                                  {isProcessingPaciente ? (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-2 font-bold text-slate-500 animate-pulse">
                                      <ScanLine className="w-5 h-5" /> <span>Procesando Cédula Paciente...</span>
                                    </div>
                                  ) : pacienteBypassed ? (
                                     <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                                       <div>
                                         <div className="text-sm font-bold text-amber-900">Documento Omitido</div>
                                         <div className="text-xs text-amber-700">Se validará el documento del paciente en recepción</div>
                                       </div>
                                       <button onClick={() => setPacienteBypassed(false)} className="text-slate-400 hover:text-red-500">
                                         <X className="w-5 h-5" />
                                       </button>
                                     </div>
                                  ) : pacienteData ? (
                                     <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                                       <div>
                                         <div className="text-sm font-bold text-emerald-900">{pacienteData.names} {pacienteData.surnames}</div>
                                         <div className="text-xs text-emerald-700">C.I: {pacienteData.idNumber}</div>
                                       </div>
                                       <button onClick={() => setPacienteData(null)} className="text-slate-400 hover:text-red-500">
                                         <X className="w-5 h-5" />
                                       </button>
                                     </div>
                                  ) : (
                                     <div className="flex flex-col sm:flex-row gap-2">
                                       <button 
                                         onClick={() => setIsCameraActivePaciente(true)}
                                         className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-emerald-500 hover:bg-emerald-50 transition-colors text-slate-600 hover:text-emerald-600 font-bold"
                                       >
                                         <Camera className="w-6 h-6" /> <span>Escanear Cédula</span>
                                       </button>
                                       <button 
                                         onClick={() => setShowBypassModal('paciente')}
                                         className="flex-[0.5] flex flex-col items-center justify-center gap-1 py-2 px-2 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50 hover:border-amber-500 hover:bg-amber-100 transition-colors text-amber-700 font-bold text-xs text-center"
                                       >
                                         <AlertCircle className="w-5 h-5" />
                                         <span>No tengo el documento</span>
                                       </button>
                                     </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Escaneo automático de Pólizas por Cédula y Nombre */}
                          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                🛡️ Pólizas de Seguro Vinculadas
                              </span>
                              <span className="text-[10px] text-emerald-600 font-mono font-semibold">Base de Datos Conectada</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              {/* Póliza Seguros Caracas (Favorita / Última Usada) */}
                              <div 
                                onClick={() => setSelectedInsurer("Seguros Caracas")}
                                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${selectedInsurer === "Seguros Caracas" ? "border-emerald-600 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-500" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
                              >
                                <div>
                                  <div className="font-bold text-slate-800 flex items-center gap-1">
                                    <span>Seguros Caracas</span>
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-amber-300">★ FAVORITA (Última Usada)</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono">Póliza: CAR-884920</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedInsurer === "Seguros Caracas" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>
                                  {selectedInsurer === "Seguros Caracas" && <Check className="w-3 h-3" />}
                                </div>
                              </div>

                              {/* Póliza Seguros Mercantil */}
                              <div 
                                onClick={() => setSelectedInsurer("Seguros Mercantil")}
                                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${selectedInsurer === "Seguros Mercantil" ? "border-emerald-600 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-500" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
                              >
                                <div>
                                  <div className="font-bold text-slate-800">Seguros Mercantil</div>
                                  <div className="text-[11px] text-slate-500 font-mono">Póliza: MER-401923</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedInsurer === "Seguros Mercantil" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>
                                  {selectedInsurer === "Seguros Mercantil" && <Check className="w-3 h-3" />}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Integrar Correo, Teléfono y Dirección */}
                          <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-4">
                            <div className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                              📍 Datos de Contacto y Residencia (Para completar en caso de no estar llenos)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Teléfono Móvil</label>
                                <input 
                                  type="text" 
                                  value={patientPhone}
                                  onChange={e => setPatientPhone(e.target.value)}
                                  placeholder="+58 412 000 0000"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-lg font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Correo Electrónico</label>
                                <input 
                                  type="email" 
                                  value={patientEmail}
                                  onChange={e => setPatientEmail(e.target.value)}
                                  placeholder="paciente@ejemplo.com"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-lg font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">Dirección donde vive</label>
                                <input 
                                  type="text" 
                                  value={patientAddress}
                                  onChange={e => setPatientAddress(e.target.value)}
                                  placeholder="Ej. Av. Principal de Las Mercedes, Edif. Centro, Ap. 4B, Caracas"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-lg font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Tipo de Caso: Traumático o Clínico */}
                          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              🏥 Indique el Origen de la Atención:
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setIncidentType("Clinico")}
                                className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-2 ${incidentType === "Clinico" ? "bg-emerald-600 text-white border-emerald-600 shadow-md" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"}`}
                              >
                                🩺 Caso Clínico / Médico
                              </button>
                              <button
                                type="button"
                                onClick={() => setIncidentType("Traumatico")}
                                className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-2 ${incidentType === "Traumatico" ? "bg-amber-600 text-white border-amber-600 shadow-md" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"}`}
                              >
                                🚑 Traumático / Accidente
                              </button>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => setCurrentStep(2)}
                            disabled={!patientPhone.trim() || !patientEmail.trim() || !patientEmail.includes('@')}
                            className="mt-4 w-full py-3.5 px-4 rounded-xl bg-emerald-600 font-bold text-white shadow-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {!patientPhone.trim() || !patientEmail.trim() || !patientEmail.includes('@') ? 'Complete sus datos de contacto para avanzar' : 'Continuar a Consulta Médica'}
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

          {/* STAGE 2: Consulta Médica de Admisiones (Entrevista + rPPG simultáneo) */}
          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
              <UnifiedConsultation
                patientName={extractedData?.names}
                onComplete={({ symptoms: collectedSymptoms, vitals: computedVitals, photoUrl: computedPhoto }) => {
                  setSymptoms(collectedSymptoms);
                  setVitalSigns(computedVitals);
                  setPatientPhoto(computedPhoto);
                  handleAnalyzeTriage(collectedSymptoms, computedVitals, computedPhoto);
                }}
                onCancel={() => setCurrentStep(1)}
              />
            </motion.div>
          )}

          {/* STAGE 3: Resumen Final y Triage */}
          {currentStep === 3 && (
             <div className="flex flex-col h-full w-full" key="step3">
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
                           "{triageResult?.doctorSummary || symptoms}"
                         </p>
                       </div>
                     )}

                     
                     <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
                       <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-2">
                         <FileText className="w-4 h-4 text-slate-700" /> <span>Hechos Narrados</span>
                       </h3>
                       <textarea
                         className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-700 leading-relaxed outline-none focus:ring-1 focus:ring-emerald-500"
                         rows={4}
                         value={editableSummary}
                         onChange={(e) => setEditableSummary(e.target.value)}
                         placeholder="Resumen clínico de la enfermedad actual..."
                       ></textarea>
                     </div>


                     {extractedData && (
                       <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
                         <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center gap-2">
                           <UserPlus className="w-4 h-4 text-emerald-600" /> <span>Datos de Identidad Registrados</span>
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
                           <FileText className="w-4 h-4 text-emerald-600" /> <span>Carta de Sucesos (Formato Oficial)</span>
                         </div>
                         <div className="text-xs text-slate-600 mt-0.5">Declaración jurada y carta de reclamo para seguro médico en PDF.</div>
                       </div>
                       <button
                         onClick={() => setIsLetterOpen(true)}
                         className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 flex items-center gap-2 shrink-0"
                       >
                         <FileText className="w-4 h-4" /> <span>Generar / Descargar PDF</span>
                       </button>
                     </div>

                     
                     <div className="flex gap-4 mt-2">
                       <button 
                         onClick={handleSendTicket}
                         disabled={isSendingTicket}
                         className="py-4 flex-1 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50"
                       >
                         {isSendingTicket ? "Enviando..." : "Enviar Ticket al Sistema Interno"}
                       </button>
                       <button 
                          onClick={resetAll}
                          className="py-4 w-1/3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 text-sm shadow-md"
                        >
                          <RotateCcw className="w-5 h-5" />
                          Finalizar
                        </button>
                     </div>

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
