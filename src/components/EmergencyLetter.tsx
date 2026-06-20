import React, { useState } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import type { IDData } from '../types';

interface EmergencyLetterProps {
  idData: IDData | null;
  onFinish: () => void;
}

export function EmergencyLetter({ idData, onFinish }: EmergencyLetterProps) {
  const [formData, setFormData] = useState({
    city: "",
    date: new Date().toLocaleDateString(),
    fullName: idData ? `${idData.names} ${idData.surnames}` : "",
    idNumber: idData ? idData.idNumber : "",
    patientName: "",
    eventDate: "",
    eventTime: "",
    location: "",
    relato: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
           <FileText className="w-5 h-5" /> Carta de Manifestación de Derechos
        </h2>

        <div className="space-y-4 text-sm text-slate-700 font-mono">
          <div className="grid grid-cols-2 gap-4">
             <input type="text" name="city" placeholder="Ciudad" value={formData.city} onChange={handleChange} className="border-b border-slate-300 p-1" />
             <input type="text" name="date" placeholder="Fecha" value={formData.date} onChange={handleChange} className="border-b border-slate-300 p-1" />
          </div>
          
          <p>A quien corresponda:</p>
          
          <p>Por medio de la presente, yo, <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="border-b border-slate-300 p-1 w-48" />, titular de la cédula de identidad <input type="text" name="idNumber" value={formData.idNumber} onChange={handleChange} className="border-b border-slate-300 p-1 w-24" />, actuando como asegurado / representante del paciente <input type="text" name="patientName" placeholder="Nombre paciente" value={formData.patientName} onChange={handleChange} className="border-b border-slate-300 p-1 w-48" />, expongo de manera cronológica y veraz los hechos relacionados con la emergencia médica ocurrida:</p>
          
          <p>Fecha y Hora: El evento ocurrió el día <input type="text" name="eventDate" placeholder="DD/MM/AAAA" value={formData.eventDate} onChange={handleChange} className="border-b border-slate-300 p-1 w-24" /> a aproximadamente las <input type="text" name="eventTime" placeholder="HH:MM" value={formData.eventTime} onChange={handleChange} className="border-b border-slate-300 p-1 w-16" />.</p>
          
          <p>Ubicación: El incidente tuvo lugar en <input type="text" name="location" placeholder="Dirección" value={formData.location} onChange={handleChange} className="border-b border-slate-300 p-1 w-full" />.</p>
          
          <p>Relato de los hechos: <textarea name="relato" placeholder="Redacta el relato aquí..." value={formData.relato} onChange={handleChange} className="border border-slate-300 p-2 w-full rounded" rows={4} /></p>
          
          <p>Declaro que la información descrita es auténtica y fiel a la realidad. Quedo a su disposición para cualquier aclaración o entrega de soportes médicos adicionales.</p>
          
          <p>Atentamente,<br/>
          <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="border-b border-slate-300 p-1 w-48" /><br/>
          C.I: <input type="text" name="idNumber" value={formData.idNumber} onChange={handleChange} className="border-b border-slate-300 p-1 w-24" /><br/>
          Teléfono: _______________<br/>
          Correo: _______________</p>
        </div>

        <div className="mt-8 flex gap-4">
           <button onClick={handlePrint} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
             <Printer className="w-5 h-5" /> Imprimir / Guardar PDF
           </button>
           <button onClick={onFinish} className="py-3 px-6 bg-slate-200 text-slate-800 rounded-xl font-bold">
             Cerrar
           </button>
        </div>
      </div>
    </div>
  );
}
