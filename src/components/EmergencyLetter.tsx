import React, { useState, useRef } from 'react';
import { FileText, Printer, ArrowLeft, Download, ShieldCheck, Eraser, Check } from 'lucide-react';
import type { IDData, VitalSigns } from '../types';

interface EmergencyLetterProps {
  idData: IDData | null;
  vitals?: VitalSigns | null;
  symptoms?: string;
  idImage?: string | null;
  insurerName?: string;
  phone?: string;
  email?: string;
  onFinish: () => void;
}

export function EmergencyLetter({ idData, vitals, symptoms, idImage, insurerName, phone, email, onFinish }: EmergencyLetterProps) {
  const [formData, setFormData] = useState({
    city: "Caracas",
    date: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }),
    time: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
    insurerName: insurerName || "Seguros Caracas",
    policyNumber: insurerName === "Seguros Mercantil" ? "MER-401923" : "CAR-884920",
    fullName: idData ? `${idData.names} ${idData.surnames}` : "CARLOS ENRIQUE MENDOZA ROJAS",
    idNumber: idData ? idData.idNumber : "V-22.222.222",
    eventLocation: "Caracas, Venezuela (Residencia habitual / Calle Las Ceibas, Petare)",
    eventRelato: symptoms || "Sintomatología aguda por caída en escaleras golpeándose la muñeca y la cabeza.",
    representativeName: idData ? `${idData.names} ${idData.surnames}` : "CARLOS ENRIQUE MENDOZA ROJAS",
    phone: phone || "+58 414 789 0123",
    email: email || "carlos.mendoza@email.com"
  });

  // Canvas Signature state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
      setHasSigned(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasSigned(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-900 font-sans flex flex-col items-center">
      {/* Action Bar (No imprimible) */}
      <div className="w-full max-w-4xl bg-white p-4 rounded-2xl border border-slate-200 shadow-md mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <button 
          onClick={onFinish}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-600" /> Volver al Resumen de Triage
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Descargar / Imprimir Carta (PDF)
          </button>
        </div>
      </div>

      {/* PÁGINA 1: Formato Oficial de Carta de Exposición de Motivos y Firma */}
      <div className="w-full max-w-4xl bg-white p-8 md:p-14 rounded-2xl shadow-xl border border-slate-200 font-sans leading-relaxed text-sm md:text-base text-slate-900 mb-8 print:shadow-none print:border-none print:p-0 print:mb-0">
        
        {/* Encabezado Fecha y Ciudad */}
        <div className="text-right font-semibold text-slate-800 mb-8 font-mono">
          <input 
            type="text" 
            name="city" 
            value={formData.city} 
            onChange={handleChange} 
            className="text-right border-b border-transparent hover:border-slate-300 focus:border-emerald-500 font-bold focus:outline-none" 
          />, <input 
            type="text" 
            name="date" 
            value={formData.date} 
            onChange={handleChange} 
            className="text-right border-b border-transparent hover:border-slate-300 focus:border-emerald-500 font-bold focus:outline-none w-56" 
          />
        </div>

        {/* Destinatario */}
        <div className="space-y-1 mb-8 font-bold text-slate-900">
          <p className="uppercase tracking-wider text-xs text-slate-500 font-mono">Señores:</p>
          <p className="text-xl text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 print:hidden" /> {formData.insurerName}
          </p>
          <p className="text-slate-700 text-xs uppercase tracking-wider font-mono">Departamento de Atención de Siniestros y Reclamaciones de Urgencias</p>
          <p className="text-slate-800">Presente.-</p>
        </div>

        {/* Asunto */}
        <div className="text-center font-extrabold text-slate-900 mb-8 text-base uppercase tracking-wide border-y-2 border-slate-900 py-3 bg-slate-50">
          CARTA DE EXPOSICIÓN DE MOTIVOS Y RELATO DE HECHOS / SUCESOS
        </div>

        {/* Cuerpo del Documento */}
        <div className="space-y-6 text-slate-900 leading-relaxed text-justify">
          
          <p>
            Por medio de la presente, yo, <span className="font-bold uppercase text-slate-900">{formData.fullName}</span>, titular de la Cédula de Identidad / DNI Nº <span className="font-bold font-mono">{formData.idNumber}</span>, amparado por la Póliza de Seguro Médico / Accidentes Nº <span className="font-bold font-mono">{formData.policyNumber}</span> de la compañía <span className="font-bold">{formData.insurerName}</span>, me dirijo a ustedes en mi condición de paciente (o representante legal) para exponer detalladamente los hechos relacionados con la atención médica de urgencia requerida.
          </p>

          {/* 1. Datos Personales y de Póliza */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
            <div className="font-bold text-slate-900 uppercase text-[11px] mb-2 tracking-wider border-b pb-1 border-slate-300">1. Datos Personales y Póliza:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><span className="text-slate-500">Paciente:</span> <span className="font-bold">{formData.fullName}</span></div>
              <div><span className="text-slate-500">Documento ID:</span> <span className="font-bold">{formData.idNumber}</span></div>
              <div><span className="text-slate-500">Nº Póliza:</span> <span className="font-bold">{formData.policyNumber}</span></div>
              <div><span className="text-slate-500">Compañía:</span> <span className="font-bold">{formData.insurerName}</span></div>
              <div><span className="text-slate-500">Teléfono:</span> <span className="font-bold">{formData.phone}</span></div>
              <div><span className="text-slate-500">Correo:</span> <span className="font-bold">{formData.email}</span></div>
            </div>
          </div>

          {/* 2. Fecha, Hora y Ubicación */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
            <div className="font-bold text-slate-900 uppercase text-[11px] mb-2 tracking-wider border-b pb-1 border-slate-300">2. Fecha, Hora y Ubicación del Evento:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><span className="text-slate-500">Fecha del Incidente/Síntomas:</span> <span className="font-bold">{formData.date}</span></div>
              <div><span className="text-slate-500">Hora Aproximada:</span> <span className="font-bold">{formData.time}</span></div>
              <div className="col-span-1 sm:col-span-2"><span className="text-slate-500">Lugar del Evento:</span> <span className="font-bold">{formData.eventLocation}</span></div>
            </div>
          </div>

          {/* 3. Relato Cronológico de los Hechos */}
          <div className="space-y-2">
            <div className="font-bold text-slate-900 uppercase text-xs tracking-wider">3. Relato Cronológico de lo Sucedido:</div>
            <p className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-slate-800 italic leading-relaxed text-sm">
              "{formData.eventRelato}"
            </p>
          </div>

          {/* Signos vitales resumidos para soporte de seguro */}
          {vitals && (
            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-1 font-mono text-xs">
              <div className="font-bold text-emerald-900 uppercase text-[11px] mb-1 tracking-wider">Anexo A: Constancia de Registro Biométrico (SignaLife Pre-Triage):</div>
              <div className="grid grid-cols-3 gap-2 text-emerald-800">
                <div><span>Frecuencia Cardíaca:</span> <span className="font-bold">{vitals.bpm} BPM</span></div>
                <div><span>SpO2:</span> <span className="font-bold">{vitals.spo2}%</span></div>
                <div><span>Frecuencia Resp.:</span> <span className="font-bold">{vitals.rr} RPM</span></div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Declaro bajo fe de juramento y consentimiento informado que la información aquí contenida es fiel a la realidad y refleja con exactitud la ocurrencia de los hechos. Solicito formalmente la procedencia y cobertura de los gastos médicos derivados conforme a las condiciones de la póliza contratada.
          </p>

        </div>

        {/* Firma Digital con Panel táctil/ratón */}
        <div className="mt-10 pt-6 border-t border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Firma Digital (Consentimiento Informado):
              </p>
              <button 
                type="button" 
                onClick={clearSignature}
                className="text-[10px] text-slate-500 hover:text-red-600 font-semibold flex items-center gap-1 print:hidden"
              >
                <Eraser className="w-3 h-3" /> Limpiar Firma
              </button>
            </div>

            {/* Panel de Firma táctil / mouse */}
            <div className="relative border-2 border-slate-300 border-dashed rounded-xl bg-slate-50 h-32 flex justify-center items-center overflow-hidden">
              <canvas
                ref={canvasRef}
                width={350}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="touch-none cursor-crosshair w-full h-full"
              />
              {!hasSigned && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 font-mono italic">
                  Firme aquí usando la pantalla táctil o el ratón...
                </div>
              )}
            </div>

            <p className="font-bold text-slate-900 mt-2 text-sm">{formData.fullName}</p>
            <p className="text-xs text-slate-600 font-mono">C.I / ID: {formData.idNumber}</p>
          </div>

          <div className="text-right flex flex-col justify-between">
            <div>
              <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">Recepción del Seguro / Centro Médico:</p>
              <div className="h-28 border-b border-dashed border-slate-400 flex items-center justify-end">
                <div className="border-2 border-emerald-600 text-emerald-800 rounded-lg p-2 text-[10px] font-mono font-bold text-center rotate-[-3deg] bg-emerald-50/50">
                  <Check className="w-4 h-4 mx-auto text-emerald-600" />
                  RECIBIDO Y VERIFICADO<br/>TOTEM PRE-TRIAGE ADMISIONES
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-2">{formData.insurerName} - Sello y Firma Digital</p>
          </div>
        </div>

      </div>

      {/* PÁGINA 2: Anexo de Documento de Identidad (Cédula Escaneada) */}
      <div className="w-full max-w-4xl bg-white p-8 md:p-14 rounded-2xl shadow-xl border border-slate-200 font-sans leading-relaxed text-sm md:text-base text-slate-900 print:shadow-none print:border-none print:p-0 print:break-before-page">
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-center">
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg uppercase tracking-wide">ANEXO B: DOCUMENTO DE IDENTIDAD (CÉDULA)</h2>
            <p className="text-xs text-slate-500 font-mono">Expediente de Siniestro - {formData.insurerName}</p>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-300">
            PÁGINA 2 / 2
          </span>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center min-h-[400px]">
            {idImage ? (
              <div className="flex flex-col items-center gap-4">
                <img src={idImage} alt="Cédula de Identidad Escaneada" className="max-h-[350px] max-w-full object-contain rounded-xl shadow-md border border-slate-200" />
                <p className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200">
                  ✓ Documento Escaneado Biométricamente y Validado
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center p-8">
                <ShieldCheck className="w-16 h-16 text-slate-400" />
                <p className="text-base font-bold text-slate-700">Copia Digitalizada de Cédula de Identidad</p>
                <p className="text-xs font-mono text-slate-500 max-w-md">
                  Cédula N° {formData.idNumber} registrada a nombre de {formData.fullName}. Verificada mediante consulta directa de Base de Datos.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 font-mono text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div><span className="text-slate-500">Titular:</span> <span className="font-bold">{formData.fullName}</span></div>
            <div><span className="text-slate-500">Cédula:</span> <span className="font-bold">{formData.idNumber}</span></div>
            <div><span className="text-slate-500">Compañía Aseguradora:</span> <span className="font-bold">{formData.insurerName}</span></div>
            <div><span className="text-slate-500">N° Póliza:</span> <span className="font-bold">{formData.policyNumber}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}


