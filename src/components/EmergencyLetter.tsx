import React, { useState } from 'react';
import { FileText, Printer, ArrowLeft, Download, CheckCircle2 } from 'lucide-react';
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
    recipientCompany: "Marsh de Venezuela C.A",
    subject: "Inconveniente Entrega de Vehículo / Declaración de Siniestro Médico",
    insuredName: idData ? `${idData.names} ${idData.surnames}` : "Nera Telecomunicaciones Latin América S.A",
    policyNo: "30980",
    certNo: "19",
    idNumber: idData ? idData.idNumber : "V-16.248.195",
    driverName: idData ? `${idData.names} ${idData.surnames}` : "JOSE MANUEL PARRA DE FREITAS",
    vehicleDetails: "Ford F-150, Placa: 83C-MAA, Motor: V6, 4.2i, 12V, Serial: 8YTEF1821Y8A27153, Año: 2000",
    eventLocation: "LA CALIFORNIA SUR, MUNICIPIO SUCRE, EDO MIRANDA",
    eventDate: "08 DE DICIEMBRE DEL 2007",
    incidentType: "CHOQUE POR DENUNCIA CON DAÑOS MATERIALES",
    workshopName: "Taller Latonería y Pintura Bomarca C.A",
    triageNotes: symptoms || "Atención inmediata por pre-triaje automatizado SignaLife. Evaluación biométrica y clasificación según protocolo de emergencia."
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-900 font-sans flex flex-col items-center">
      {/* Action Bar (Not visible in Print) */}
      <div className="w-full max-w-4xl bg-white p-4 rounded-2xl border border-slate-200 shadow-md mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <button 
          onClick={onFinish}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-600" /> Volver al Resumen
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Descargar / Imprimir Carta PDF
          </button>
        </div>
      </div>

      {/* Official Formal Document Form / Preview */}
      <div className="w-full max-w-4xl bg-white p-8 md:p-14 rounded-2xl shadow-xl border border-slate-200 font-serif leading-relaxed text-sm md:text-base text-slate-900 print:shadow-none print:border-none print:p-0">
        
        {/* Right Aligned Header Date */}
        <div className="text-right font-semibold text-slate-900 mb-8 font-mono">
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
            className="text-right border-b border-transparent hover:border-slate-300 focus:border-emerald-500 font-bold focus:outline-none w-60" 
          />
        </div>

        {/* Recipient Information */}
        <div className="space-y-1 mb-8 font-sans font-bold text-slate-900">
          <p className="uppercase tracking-wide text-xs text-slate-500">Señores:</p>
          <p className="text-lg text-slate-900">{formData.recipientCompany}</p>
          <p className="text-slate-800">Presente.-</p>
        </div>

        {/* Subject */}
        <div className="text-right font-bold text-slate-900 mb-8 text-base font-sans uppercase tracking-wide border-b-2 border-slate-900 pb-2">
          Asunto: {formData.subject}
        </div>

        {/* Document Body Paragraphs */}
        <div className="space-y-6 text-slate-900 font-sans leading-relaxed text-justify">
          <p>
            Sirva la presente para informarles que el vehículo <span className="font-bold underline uppercase">{formData.insuredName}</span>, amparado bajo la Póliza Nº <span className="font-bold">{formData.policyNo}</span>, Certificado Nº <span className="font-bold">{formData.certNo}</span>. Con las siguientes características: <span className="font-bold">{formData.vehicleDetails}</span>.
          </p>

          <p>
            Sirva la presente para informarles que este caso al igual que el anterior presenta características similares con respecto al tiempo de entrega, emisión de orden de reparación y chequeo exhaustivo de daños ocultos. Para el momento del siniestro se encontraba totalmente operativo realizando trabajos de servicio en el Área Metropolitana, el accidente de tipo: <span className="font-bold underline uppercase">{formData.incidentType}</span>, tuvo fecha de ocurrencia el día; <span className="font-bold uppercase">{formData.eventDate}</span>, en el sitio denominado: <span className="font-bold uppercase">{formData.eventLocation}</span>, CONDUCTIDO por el ciudadano: <span className="font-bold uppercase">{formData.driverName}</span>. Titular de la Cédula de Identidad Nº <span className="font-bold">{formData.idNumber}</span>.
          </p>

          <p>
            Para esta fecha {formData.date}, se le da ingreso en el {formData.workshopName}, para comenzar a ejecutar el procedimiento correspondiente (Trámites Legales para Efectos del Seguro), desde la fecha de ingreso hasta la fecha actual no hemos obtenido una respuesta de entrega. {formData.triageNotes}
          </p>
        </div>

        {/* Signature Area */}
        <div className="mt-16 pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 font-sans">
          <div>
            <p className="font-bold text-slate-900">Atentamente,</p>
            <div className="h-16"></div>
            <p className="font-bold text-slate-900">{formData.driverName}</p>
            <p className="text-xs text-slate-600">C.I: {formData.idNumber}</p>
            <p className="text-xs text-slate-600">Representante / Asegurado</p>
          </div>

          <div className="text-right">
            <p className="font-bold text-slate-900">Sello y Firma de Recepción:</p>
            <div className="h-16"></div>
            <p className="text-xs text-slate-500 font-mono">SignaLife Pre-Triage Validated</p>
          </div>
        </div>

      </div>
    </div>
  );
}

