import React, { useState } from 'react';
import { FileText, Printer, ArrowLeft, Download, ShieldCheck } from 'lucide-react';
import type { IDData, VitalSigns } from '../types';

interface EmergencyLetterProps {
  idData: IDData | null;
  vitals?: VitalSigns | null;
  symptoms?: string;
  onFinish: () => void;
}

export function EmergencyLetter({ idData, vitals, symptoms, onFinish }: EmergencyLetterProps) {
  const [formData, setFormData] = useState({
    city: "Caracas",
    date: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }),
    time: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
    insurerName: "Seguro Prueba C.A.",
    policyNumber: "POL-994820-2026",
    fullName: idData ? `${idData.names} ${idData.surnames}` : "JOSE D. NARANJO M.",
    idNumber: idData ? idData.idNumber : "V-31901967",
    eventLocation: "Caracas, Venezuela (Residencia habitual / Vía pública)",
    eventRelato: symptoms || "Sintomatología aguda de inicio repentino caracterizada por dolor de estómago fuerte, náuseas y malestar generalizado que requirió atención urgente en pre-triaje.",
    representativeName: idData ? `${idData.names} ${idData.surnames}` : "JOSE D. NARANJO M.",
    phone: "+58 412 000 0000",
    email: "paciente@ejemplo.com"
  });

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

      {/* Formato Oficial de Carta de Exposición de Motivos / Relato de Hechos */}
      <div className="w-full max-w-4xl bg-white p-8 md:p-14 rounded-2xl shadow-xl border border-slate-200 font-sans leading-relaxed text-sm md:text-base text-slate-900 print:shadow-none print:border-none print:p-0">
        
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
              <div className="font-bold text-emerald-900 uppercase text-[11px] mb-1 tracking-wider">Anexo: Constancia de Registro Biométrico (SignaLife Pre-Triage):</div>
              <div className="grid grid-cols-3 gap-2 text-emerald-800">
                <div><span>Frecuencia Cardíaca:</span> <span className="font-bold">{vitals.bpm} BPM</span></div>
                <div><span>SpO2:</span> <span className="font-bold">{vitals.spo2}%</span></div>
                <div><span>Frecuencia Resp.:</span> <span className="font-bold">{vitals.rr} RPM</span></div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Declaro bajo fe de juramento que la información aquí contenida es fiel a la realidad y refleja con exactitud la ocurrencia de los hechos. Solicito formalmente la procedencia y cobertura de los gastos médicos derivados conforme a las condiciones de la póliza contratada.
          </p>

        </div>

        {/* Firmas y Fecha */}
        <div className="mt-16 pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 font-sans">
          <div>
            <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">Firma del Paciente / Declarante:</p>
            <div className="h-16 border-b border-dashed border-slate-400"></div>
            <p className="font-bold text-slate-900 mt-2 text-sm">{formData.fullName}</p>
            <p className="text-xs text-slate-600">C.I / ID: {formData.idNumber}</p>
          </div>

          <div className="text-right">
            <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">Recepción del Seguro / Centro Médico:</p>
            <div className="h-16 border-b border-dashed border-slate-400"></div>
            <p className="text-xs text-slate-500 font-mono mt-2">{formData.insurerName} - Sello y Firma</p>
          </div>
        </div>

      </div>
    </div>
  );
}


