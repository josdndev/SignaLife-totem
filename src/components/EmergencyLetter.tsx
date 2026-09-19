import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Download, ShieldCheck, Eraser, AlertTriangle } from 'lucide-react';
import type { IDData, VitalSigns } from '../types';

interface EmergencyLetterProps {
  idData: IDData | null;
  vitals?: VitalSigns | null;
  symptoms?: string;
  idImage?: string | null;
  titularImage?: string | null;
  pacienteImage?: string | null;
  insurerName?: string;
  phone?: string;
  email?: string;
  titularData?: IDData | null;
  mainUserData?: IDData | null;
  isTitular?: string; // 'titular', 'conyuge', 'menor'
  onFinish: () => void;
}

export function EmergencyLetter({ idData, vitals, symptoms, idImage, titularImage, pacienteImage, insurerName, phone, email, titularData, mainUserData, isTitular, onFinish }: EmergencyLetterProps) {
  
  // Extract checkboxes info
  const gender = (idData?.gender || mainUserData?.gender || '').toUpperCase();
  const isM = gender.startsWith('M') ? 'X' : ' ';
  const isF = gender.startsWith('F') ? 'X' : ' ';
  
  const ms = (idData?.maritalStatus || mainUserData?.maritalStatus || '').toUpperCase();
  const isS = ms.startsWith('S') ? 'X' : ' ';
  const isC = ms.startsWith('C') ? 'X' : ' ';
  const isV = ms.startsWith('V') ? 'X' : ' ';
  const isD = ms.startsWith('D') ? 'X' : ' ';

  // Helper para resolver nombres y apellidos completos sin pérdidas
  const resolveFullName = (primary: any, ...fallbacks: any[]) => {
    const extract = (d: any) => {
      if (!d) return { n: '', s: '' };
      let n = (d.names || d.name || d.nombre || d.nombres || '').trim();
      let s = (d.surnames || d.surname || d.apellidos || d.apellido || '').trim();
      // Si uno está vacío y el otro contiene más de 2 palabras (nombres + apellidos juntos)
      if (n && !s && n.includes(' ')) {
        const parts = n.split(/\s+/);
        if (parts.length >= 3) {
          n = parts.slice(0, 2).join(' ');
          s = parts.slice(2).join(' ');
        }
      } else if (s && !n && s.includes(' ')) {
        const parts = s.split(/\s+/);
        if (parts.length >= 3) {
          s = parts.slice(0, 2).join(' ');
          n = parts.slice(2).join(' ');
        }
      }
      return { n, s };
    };

    let { n, s } = extract(primary);
    for (const fb of fallbacks) {
      if (!fb) continue;
      const f = extract(fb);
      if (!n && f.n) n = f.n;
      if (!s && f.s) s = f.s;
      if (n && s) break;
    }
    return `${n} ${s}`.trim().toUpperCase();
  };

  // Calculate Age helper
  const calculateAge = (dob: string) => {
    if (!dob) return "";
    const parts = dob.split('-');
    let birthDate;
    if (parts.length === 3) {
       if (parts[2].length === 4) birthDate = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
       else birthDate = new Date(dob);
    } else {
       birthDate = new Date(dob);
    }
    
    if (isNaN(birthDate.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const todayStr = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  let resolvedPatientName = resolveFullName(idData, mainUserData, titularData);
  let resolvedTitularName = resolveFullName(titularData, mainUserData, idData);
  if (isTitular === 'titular') {
    const bestName = resolvedPatientName || resolvedTitularName;
    resolvedPatientName = bestName;
    resolvedTitularName = bestName;
  } else {
    if (!resolvedPatientName && resolvedTitularName) resolvedPatientName = resolvedTitularName;
    if (!resolvedTitularName && resolvedPatientName) resolvedTitularName = resolvedPatientName;
  }

  const resolvedDOB = (idData?.dateOfBirth || mainUserData?.dateOfBirth || titularData?.dateOfBirth || '').trim();
  const resolvedPatientId = (idData?.idNumber || mainUserData?.idNumber || titularData?.idNumber || '').trim();
  const resolvedTitularId = (titularData?.idNumber || mainUserData?.idNumber || idData?.idNumber || '').trim();

  const [formData, setFormData] = useState({
    patientName: resolvedPatientName,
    patientId: resolvedPatientId,
    patientAge: calculateAge(resolvedDOB),
    patientDOB: resolvedDOB,
    patientMarital: idData?.maritalStatus || mainUserData?.maritalStatus || "",
    titularName: resolvedTitularName,
    titularId: resolvedTitularId,
    insurerName: insurerName || "",
    sede: "Clínica Principal",
    date: todayStr,
    eventRelato: symptoms || "",
    phone: phone || "",
    email: email || "",
    policyType: "",
    collectiveName: "",
    cityEvent: "",
    locationEvent: ""
  });

  const showPlanillaSiniestro = true;
  const [hasConsented, setHasConsented] = useState(false);

  // Canvas Signature state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!hasConsented) {
      alert("Por favor valide el relato y otorgue su consentimiento primero (botón naranja arriba).");
      return;
    }
    setIsDrawing(true);
    setHasSigned(true);
    const coords = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && coords) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineWidth = 3; // Thicker line
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a';
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !hasConsented) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && coords) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-200 p-4 md:p-8 text-slate-900 font-sans flex flex-col items-center">
      {/* Action Bar (No imprimible) */}
      <div className="w-full max-w-4xl bg-white p-4 rounded-2xl border border-slate-300 shadow-md mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <button 
          onClick={onFinish}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-600" /> Volver al Triage
        </button>

        <div className="flex items-center gap-3">
          <select 
            name="insurerName" 
            value={formData.insurerName}
            onChange={handleChange}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-emerald-500 outline-none"
          >
            <option value="">Seleccione Aseguradora</option>
            <option value="Seguros Caracas">Seguros Caracas</option>
            <option value="Seguros Mercantil">Seguros Mercantil</option>
            <option value="Seguros Pirámide">Seguros Pirámide</option>
            <option value="Oceánica de Seguros">Oceánica de Seguros</option>
          </select>

          <button 
            onClick={handlePrint}
            disabled={!hasSigned}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Generar PDF Oficial
          </button>
        </div>
      </div>

      {/* Banner de ayuda para edición directa */}
      <div className="w-full max-w-[800px] mb-4 bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center gap-3 text-emerald-900 text-sm print:hidden shadow-sm">
        <span className="text-2xl flex-shrink-0">✏️</span>
        <div>
          <span className="font-bold">Campos Editables en Pantalla:</span> Puede hacer clic sobre el nombre, cédula, aseguradora, teléfono o correo directamente en la carta para ajustar cualquier dato antes de firmar o generar el PDF.
        </div>
      </div>

      {/* Pantalla de Confirmación y Consentimiento (No Imprimible) */}
      {!hasConsented && (
        <div className="w-full max-w-[800px] bg-amber-50 p-5 rounded-2xl border-2 border-amber-300 shadow-md mb-6 print:hidden">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-7 h-7 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-black text-amber-900 text-base uppercase">Validación de Relato Médico y Datos</h3>
              <p className="text-sm text-amber-800 mt-1 font-medium">
                Verifique que sus nombres, apellidos y relato clínico sean correctos en la carta abajo. Puede hacer clic sobre cualquier campo para corregirlo directamente.
              </p>
              
              <div className="mt-3 bg-white/90 p-3 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-amber-900 text-xs uppercase block">Paciente / Beneficiario:</span>
                  <span className="text-sm font-black text-slate-800">{formData.patientName || 'Por favor complete en la carta'}</span>
                </div>
                <div>
                  <span className="font-bold text-amber-900 text-xs uppercase block">Cédula:</span>
                  <span className="text-sm font-black text-slate-800">{formData.patientId || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-bold text-amber-900 text-xs uppercase block">Correo:</span>
                  <span className="text-sm font-black text-blue-900">{formData.email}</span>
                </div>
              </div>

              <button
                onClick={() => setHasConsented(true)}
                className="mt-4 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                Confirmo que los datos son exactos y habilitar firma digital ✍️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PÁGINA 1: CARTA NARRATIVA (Exactamente como la imagen 1 y 3) */}
      <div className="w-full max-w-[800px] bg-white p-10 shadow-xl border border-slate-300 font-sans text-sm text-slate-900 mb-8 print:shadow-none print:border-none print:p-0 print:mb-0 relative min-h-[1050px]">
        
        {/* Header Urgent Care / Carta Narrativa */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-4">
          <div className="flex flex-col">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center font-bold text-lg">V</div>
               <div>
                 <div className="font-extrabold text-xl leading-none tracking-tighter">URGENT</div>
                 <div className="font-extrabold text-xl leading-none tracking-tighter flex items-center gap-1">CARE <span className="text-xl">~</span></div>
               </div>
             </div>
             <div className="text-[10px] tracking-widest mt-1">venemergencia</div>
          </div>
          <div className="bg-slate-500 text-white font-bold text-xl px-12 py-2">
            CARTA NARRATIVA
          </div>
        </div>

        {/* Form Fields Table - EDITABLE IN-PLACE */}
        <div className="w-full border border-slate-800 mb-6 flex flex-col text-sm font-bold uppercase">
          {/* Row 1 */}
          <div className="flex border-b border-slate-800">
            <div className="w-1/4 p-2 bg-slate-100 border-r border-slate-800 flex items-center">NOMBRE PACIENTE</div>
            <div className="w-2/4 p-1 border-r border-slate-800 font-extrabold text-base flex items-center">
              <input 
                type="text" 
                value={formData.patientName} 
                onChange={e => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                className="w-full bg-transparent uppercase font-extrabold px-1.5 py-1 text-slate-900 focus:bg-amber-50 focus:outline-none rounded hover:bg-slate-50/70 transition-colors"
                placeholder="NOMBRES Y APELLIDOS DEL PACIENTE"
              />
            </div>
            <div className="w-1/12 p-2 bg-slate-100 border-r border-slate-800 text-center flex items-center justify-center">C.I</div>
            <div className="w-[16.66%] p-1 font-extrabold text-base flex items-center">
              <input 
                type="text" 
                value={formData.patientId} 
                onChange={e => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
                className="w-full bg-transparent uppercase font-extrabold px-1.5 py-1 text-slate-900 focus:bg-amber-50 focus:outline-none rounded hover:bg-slate-50/70 transition-colors"
                placeholder="V-00000000"
              />
            </div>
          </div>
          {/* Row 2 */}
          <div className="flex border-b border-slate-800">
            <div className="w-1/4 p-2 bg-slate-100 border-r border-slate-800 flex items-center">ASEGURADORA</div>
            <div className="w-2/4 p-1 border-r border-slate-800 font-extrabold text-base text-emerald-800 flex items-center">
              <input 
                type="text" 
                value={formData.insurerName} 
                onChange={e => setFormData(prev => ({ ...prev, insurerName: e.target.value }))}
                className="w-full bg-transparent uppercase font-extrabold px-1.5 py-1 text-emerald-800 focus:bg-amber-50 focus:outline-none rounded hover:bg-slate-50/70 transition-colors"
                placeholder="ASEGURADORA"
              />
            </div>
            <div className="w-1/12 p-2 bg-slate-100 border-r border-slate-800 text-center flex items-center justify-center">EDAD</div>
            <div className="w-[16.66%] p-1 font-extrabold text-base flex items-center">
              <input 
                type="text" 
                value={formData.patientAge} 
                onChange={e => setFormData(prev => ({ ...prev, patientAge: e.target.value }))}
                className="w-full bg-transparent uppercase font-extrabold px-1.5 py-1 text-slate-900 focus:bg-amber-50 focus:outline-none rounded hover:bg-slate-50/70 transition-colors"
                placeholder="EDAD"
              />
            </div>
          </div>
          {/* Row 3 */}
          <div className="flex border-b border-slate-800">
            <div className="w-1/4 p-2 bg-slate-100 border-r border-slate-800 flex items-center">SEDE ATENCIÓN</div>
            <div className="w-1/4 p-1 border-r border-slate-800 font-extrabold text-base flex items-center">
              <input 
                type="text" 
                value={formData.sede} 
                onChange={e => setFormData(prev => ({ ...prev, sede: e.target.value }))}
                className="w-full bg-transparent uppercase font-extrabold px-1.5 py-1 text-slate-900 focus:bg-amber-50 focus:outline-none rounded hover:bg-slate-50/70 transition-colors"
              />
            </div>
            <div className="w-1/4 p-2 bg-slate-100 border-r border-slate-800 text-center flex items-center justify-center">FECHA</div>
            <div className="w-1/4 p-1 font-extrabold text-base flex items-center">
              <input 
                type="text" 
                value={formData.date} 
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full bg-transparent uppercase font-extrabold px-1.5 py-1 text-slate-900 focus:bg-amber-50 focus:outline-none rounded hover:bg-slate-50/70 transition-colors"
              />
            </div>
          </div>
          {/* Row 4 */}
          <div className="flex border-b border-slate-800">
            <div className="w-1/4 p-2 bg-slate-100 border-r border-slate-800 flex items-center">REPRESENTANTE</div>
            <div className="w-2/4 p-1 border-r border-slate-800 font-extrabold text-base flex items-center">
              <input 
                type="text" 
                value={formData.titularName} 
                onChange={e => setFormData(prev => ({ ...prev, titularName: e.target.value }))}
                placeholder={isTitular === 'titular' ? 'MISMO ASEGURADO (Opcional)' : 'NOMBRES Y APELLIDOS DEL REPRESENTANTE'}
                className="w-full bg-transparent uppercase font-extrabold px-1.5 py-1 text-slate-900 focus:bg-amber-50 focus:outline-none rounded hover:bg-slate-50/70 transition-colors placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 placeholder:text-xs"
              />
            </div>
            <div className="w-1/12 p-2 bg-slate-100 border-r border-slate-800 text-center flex items-center justify-center">C.I</div>
            <div className="w-[16.66%] p-1 font-extrabold text-base flex items-center">
              <input 
                type="text" 
                value={formData.titularId} 
                onChange={e => setFormData(prev => ({ ...prev, titularId: e.target.value }))}
                placeholder="C.I."
                className="w-full bg-transparent uppercase font-extrabold px-1.5 py-1 text-slate-900 focus:bg-amber-50 focus:outline-none rounded hover:bg-slate-50/70 transition-colors placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 placeholder:text-xs"
              />
            </div>
          </div>
          {/* Row 5 - Contact Info */}
          <div className="flex">
            <div className="w-1/4 p-2 bg-slate-100 border-r border-slate-800 flex items-center">CORREO / TELÉFONO</div>
            <div className="w-3/4 p-1 font-extrabold text-base flex items-center gap-2">
              <input 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-1/2 bg-transparent lowercase font-extrabold px-1.5 py-1 text-blue-900 focus:bg-amber-50 focus:outline-none rounded hover:bg-slate-50/70 transition-colors"
                placeholder="correo@ejemplo.com"
              />
              <span className="text-slate-400 font-normal">|</span>
              <input 
                type="tel" 
                value={formData.phone} 
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-1/2 bg-transparent uppercase font-extrabold px-1.5 py-1 text-slate-900 focus:bg-amber-50 focus:outline-none rounded hover:bg-slate-50/70 transition-colors"
                placeholder="+58 412..."
              />
            </div>
          </div>
        </div>

        {/* Body Lines (Ruled Paper Effect) */}
        <div className="relative w-full flex-grow mt-4 min-h-[400px]">
          {/* We render the actual text overlapping the lines */}
          <div className="absolute inset-0 leading-[2.5rem] text-lg pt-1 text-slate-800 font-semibold z-10 break-words whitespace-pre-wrap">
            {formData.eventRelato}
          </div>
          {/* Background lines to look like the physical paper */}
          <div className="absolute inset-0 flex flex-col z-0 opacity-40">
             {Array.from({length: 16}).map((_, i) => (
               <div key={i} className="w-full border-b border-slate-600 h-[2.5rem]"></div>
             ))}
          </div>
        </div>

        {/* Footer (Boxes) */}
        <div className={`absolute bottom-10 left-10 right-10 ${!hasConsented ? 'pointer-events-none' : ''}`}>
           <div className="flex justify-between items-end gap-4 mb-2">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-28 border border-slate-800 mb-1 bg-slate-50"></div>
                  <div className="text-[10px] font-bold border-t border-slate-800 w-full text-center">PULGAR DER.</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-24 h-28 border border-slate-800 mb-1 bg-slate-50"></div>
                  <div className="text-[10px] font-bold border-t border-slate-800 w-full text-center">PULGAR IZQ.</div>
                </div>
              </div>
              
              <div className="flex flex-col items-center w-64 relative">
                <div className="w-full h-28 border-2 border-slate-800 mb-1 flex items-center justify-center relative bg-white shadow-inner">
                   <canvas
                      ref={canvasRef}
                      width={250}
                      height={110}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="touch-none cursor-crosshair absolute inset-0 z-20"
                    />
                    {!hasSigned && hasConsented && (
                      <span className="text-slate-400 font-bold text-sm z-10 print:hidden animate-pulse">Firme aquí (Dedo/Mouse)</span>
                    )}
                </div>
                <div className="text-[10px] font-bold border-t border-slate-800 w-full text-center flex justify-between">
                  <span>FIRMA</span>
                  <button type="button" onClick={clearSignature} className="text-red-500 print:hidden hover:underline font-bold">Limpiar</button>
                </div>
              </div>
           </div>
           <div className="text-[9px] font-bold text-center border-t border-slate-800 pt-1 mt-4">
              VENEURGENCIAS C.A | J-50331517-2 | WWW.VENEMERGENCIA.COM | INFO@URGENTCARE.COM
           </div>
        </div>
      </div>

      {/* PÁGINA CONDICIONAL: Declaración de siniestros salud (Pirámide) - Imagen 2 */}
      
      {/* PÁGINA 2: Declaración de siniestros salud (Pirámide / General) */}
      {showPlanillaSiniestro && (
        <div className={`w-full max-w-[800px] bg-white p-10 shadow-xl border border-slate-300 font-sans text-[11px] text-slate-900 mb-8 print:shadow-none print:border-none print:p-0 print:break-before-page min-h-[1050px] transition-opacity ${!hasConsented ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          
          <div className="flex items-center gap-4 mb-4 border-b-2 border-slate-300 pb-2">
             <div className="flex flex-col items-center justify-center w-24">
               <div className="w-12 h-12 bg-slate-200 rounded-lg shadow-inner mb-1"></div>
               <div className="font-black text-xs text-slate-700">{formData.insurerName || 'Pirámide'}</div>
               <div className="text-[8px] text-slate-500 uppercase">Seguros</div>
             </div>
             <div className="flex-1">
               <div className="bg-slate-300 text-slate-800 font-bold text-center py-2 uppercase text-lg w-full">
                 Declaración de siniestros salud
               </div>
               <div className="text-right mt-2 font-bold text-sm">
                 N de siniestro <span className="border-b border-slate-500 inline-block w-48"></span>
               </div>
             </div>
          </div>

          <div className="border border-slate-500 rounded-xl p-3 mb-4 text-[10px] leading-relaxed bg-slate-50">
            - Favor llenar con letra clara preferiblemente "molde"; puede ser diligenciada en una máquina de escribir o impresión digital.<br/>
            - Es requisito indispensable adjuntar todo original de comprobante de pago. (En caso de requerir la devolución de los mismos, favor anexar copias).<br/>
            - En caso de accidente, anexar carta narrativa elaborada por el asegurado de como ocurrió, informe de autoridades competentes si los amerita y estudios radiológicos en caso de fractura.
          </div>

          <div className="font-bold text-sm mb-1">1.- Datos del siniestro</div>
          <div className="border border-slate-500 mb-4 flex flex-col text-sm bg-white">
            <div className="border-b border-slate-500 p-2 flex items-center">
              <span className="w-full flex items-center">
                Apellidos y nombres del asegurado titular: 
                <input 
                  type="text"
                  value={formData.titularName}
                  onChange={e => setFormData(prev => ({ ...prev, titularName: e.target.value }))}
                  className="flex-1 ml-2 font-black text-base uppercase bg-transparent px-1.5 py-0.5 rounded focus:bg-amber-50 focus:outline-none hover:bg-slate-50/70 transition-colors"
                  placeholder="APELLIDOS Y NOMBRES"
                />
              </span>
            </div>
            <div className="border-b border-slate-500 flex">
              <div className="w-1/3 border-r border-slate-500 p-2 flex items-center text-xs">
                Cédula de Identidad: V: {formData.titularId.includes('V') ? 'X' : '_'} E: {formData.titularId.includes('E') ? 'X' : '_'} 
                <input 
                  type="text"
                  value={formData.titularId.replace(/[VE]-?/g, '')}
                  onChange={e => setFormData(prev => ({ ...prev, titularId: `V-${e.target.value}` }))}
                  className="w-28 ml-2 font-black text-sm uppercase bg-transparent px-1 py-0.5 rounded focus:bg-amber-50 focus:outline-none hover:bg-slate-50/70 transition-colors"
                  placeholder="31901967"
                />
              </div>
              <div className="w-1/3 border-r border-slate-500 p-2 flex items-center text-xs">
                Fecha de ocurrencia: 
                <input 
                  type="text"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-28 ml-2 font-black text-sm uppercase bg-transparent px-1 py-0.5 rounded focus:bg-amber-50 focus:outline-none hover:bg-slate-50/70 transition-colors"
                />
              </div>
              <div className="w-1/3 p-2 flex items-center text-xs">
                Fecha de declaración: 
                <input 
                  type="text"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-28 ml-2 font-black text-sm uppercase bg-transparent px-1 py-0.5 rounded focus:bg-amber-50 focus:outline-none hover:bg-slate-50/70 transition-colors"
                />
              </div>
            </div>
            <div className="border-b border-slate-500 flex">
              <div className="w-1/3 border-r border-slate-500 p-2">Tipo de póliza: Individual: ___ Colectivo: ___ <br/> Nombre colectivo: _________________</div>
              <div className="w-1/3 border-r border-slate-500 p-2">Ciudad y estado de ocurrencia del siniestro: <b className="text-base ml-2 block mt-1">{formData.sede}</b></div>
              <div className="w-1/3 p-2">Lugar/ Fecha/ Hora exacta del siniestro: <b className="text-sm block mt-1">{formData.sede} / {formData.date}</b></div>
            </div>
            <div className="flex">
               <div className="w-full p-2 flex items-center text-xs">
                 Teléfono para ubicación: 
                 <input 
                   type="tel"
                   value={formData.phone}
                   onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                   className="w-64 ml-2 font-black text-base uppercase bg-transparent px-1.5 py-0.5 rounded focus:bg-amber-50 focus:outline-none hover:bg-slate-50/70 transition-colors"
                   placeholder="+58 412..."
                 />
               </div>
            </div>
          </div>

          <div className="font-bold text-sm mb-1 mt-4">2._ Datos del asegurado siniestrado</div>
          <div className="border border-slate-500 mb-4 flex flex-col text-sm bg-white">
            <div className="border-b border-slate-500 p-2 flex items-center">
              <span className="w-full flex items-center">
                Apellidos y nombres del beneficiario: 
                <input 
                  type="text"
                  value={formData.patientName}
                  onChange={e => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                  className="flex-1 ml-2 font-black text-base uppercase bg-transparent px-1.5 py-0.5 rounded focus:bg-amber-50 focus:outline-none hover:bg-slate-50/70 transition-colors"
                  placeholder="APELLIDOS Y NOMBRES"
                />
              </span>
            </div>
            <div className="border-b border-slate-500 flex">
              <div className="w-1/3 border-r border-slate-500 p-2 flex items-center text-xs">
                Cédula de identidad: V {formData.patientId.includes('V') ? 'X' : ' '} E {formData.patientId.includes('E') ? 'X' : ' '} 
                <input 
                  type="text"
                  value={formData.patientId.replace(/[VE]-?/g, '')}
                  onChange={e => setFormData(prev => ({ ...prev, patientId: `V-${e.target.value}` }))}
                  className="w-28 ml-2 font-black text-sm uppercase bg-transparent px-1 py-0.5 rounded focus:bg-amber-50 focus:outline-none hover:bg-slate-50/70 transition-colors"
                  placeholder="31901967"
                />
              </div>
              <div className="w-1/4 border-r border-slate-500 p-2 flex items-center text-xs">
                Fecha de nacimiento: 
                <input 
                  type="text"
                  value={formData.patientDOB}
                  onChange={e => setFormData(prev => ({ ...prev, patientDOB: e.target.value }))}
                  className="w-24 ml-1 font-black text-sm uppercase bg-transparent px-1 py-0.5 rounded focus:bg-amber-50 focus:outline-none hover:bg-slate-50/70 transition-colors"
                  placeholder="DD-MM-YYYY"
                />
              </div>
              <div className="w-1/4 border-r border-slate-500 p-2">Parentesco con el titular: <b className="text-base ml-2">{isTitular === 'titular' ? 'MISMO' : isTitular === 'conyuge' ? 'CÓNYUGE' : 'HIJO/A'}</b></div>
              <div className="w-1/6 p-2 text-xs leading-tight">
                Sexo:<br/> M [{isM}] F [{isF}]
              </div>
            </div>
            <div className="border-b border-slate-500 flex">
              <div className="w-2/3 border-r border-slate-500 p-2 flex items-center">Dirección: <b className="ml-2 text-sm uppercase">Registrada en sistema</b></div>
              <div className="w-1/3 p-2 text-xs leading-tight">
                Estado civil:<br/> S [{isS}] C [{isC}] V [{isV}] D [{isD}]
              </div>
            </div>
            <div className="flex">
              <div className="w-2/3 border-r border-slate-500 p-2 h-10 flex items-center text-xs">
                Correo Electrónico: 
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="flex-1 ml-2 font-black text-base text-blue-900 lowercase bg-transparent px-1.5 py-0.5 rounded focus:bg-amber-50 focus:outline-none hover:bg-slate-50/70 transition-colors"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="w-1/3 p-2 flex items-center text-xs">
                Teléfono para ubicación: 
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="flex-1 ml-2 font-black text-base uppercase bg-transparent px-1.5 py-0.5 rounded focus:bg-amber-50 focus:outline-none hover:bg-slate-50/70 transition-colors"
                  placeholder="+58 412..."
                />
              </div>
            </div>
          </div>

          <div className="font-bold text-sm mb-1 mt-4">Autorización del asegurado</div>
          <div className="border border-slate-500 rounded-2xl p-4 mb-6 text-sm bg-white">
            <p className="text-justify mb-4">
              Autorizo sin reserva al médico que me hayan atendido y a la institución, proporcionar a la compañía de seguros la información que más adelante se especifica o cualquier otra que solicite la compañía de seguros con relación a esta reclamación.
            </p>
            <div className="flex items-end gap-2 mt-8">
              En <span className="border-b border-slate-500 w-40 font-bold text-center text-base">{formData.sede}</span> 
              a los <span className="border-b border-slate-500 w-12 text-center font-bold text-base">{new Date().getDate()}</span> 
              del mes de <span className="border-b border-slate-500 w-32 text-center font-bold text-base uppercase">{new Date().toLocaleString('es', {month:'long'})}</span> 
              del año <span className="border-b border-slate-500 w-16 text-center font-bold text-base">{new Date().getFullYear()}</span> 
              <span className="ml-8 font-bold">Firma</span> <span className="border-b-2 border-slate-800 flex-1 border-dashed"></span>
            </div>
          </div>

          <div className="font-bold text-sm mb-1 mt-6">3._ Para ser llenado y firmado únicamente por el médico tratante</div>
          <div className="border-t-2 border-slate-800 pt-4 text-xs space-y-4">
             <div className="flex gap-2">Apellidos y nombres del médico: <span className="border-b border-slate-500 flex-1"></span></div>
             <div className="flex gap-4">
               <div className="w-1/3 flex gap-2">N M.S.A.S: <span className="border-b border-slate-500 flex-1"></span></div>
               <div className="w-1/3 flex gap-2">N C.M: <span className="border-b border-slate-500 flex-1"></span></div>
               <div className="w-1/3 flex gap-2">Teléfonos: <span className="border-b border-slate-500 flex-1"></span></div>
             </div>
             <div className="flex gap-4 mt-2">
               <div className="w-1/2 flex gap-2">Institución hospitalaria: <span className="border-b border-slate-500 flex-1"></span></div>
               <div className="w-1/2 flex gap-2">Nº de historia médica: <span className="border-b border-slate-500 flex-1"></span></div>
             </div>
             <div className="flex items-center gap-4 mt-4">
               Motivo de la hospitalización: &nbsp;&nbsp;
               Enfermedad: <span className="border border-slate-800 w-3 h-3 inline-block"></span> &nbsp;
               Maternidad: <span className="border border-slate-800 w-3 h-3 inline-block"></span> &nbsp;
               Accidente: <span className="border border-slate-800 w-3 h-3 inline-block"></span> &nbsp;
               AMB: <span className="border border-slate-800 w-3 h-3 inline-block"></span> &nbsp;&nbsp;&nbsp;
               Fecha de ingreso: <span className="border-b border-slate-500 w-32 inline-block"></span>
             </div>
             
             <div className="font-bold mt-6 text-sm">3.1 Maternidad</div>
             <div className="flex items-center gap-4 text-xs">
               Fecha del evento: &nbsp;&nbsp;/&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
               Parto normal: <span className="border border-slate-800 w-3 h-3 inline-block"></span> &nbsp;
               Fórceps: <span className="border border-slate-800 w-3 h-3 inline-block"></span> &nbsp;
               Cesaría: <span className="border border-slate-800 w-3 h-3 inline-block"></span> &nbsp;
               Curetaje: <span className="border border-slate-800 w-3 h-3 inline-block"></span>
             </div>
          </div>
        </div>
      )}


      {/* PÁGINA: Anexos Cédula */}
      <div className={`w-full max-w-[800px] bg-white p-8 rounded-2xl shadow-xl border border-slate-300 font-sans text-sm text-slate-900 print:shadow-none print:border-none print:p-0 print:break-before-page transition-opacity ${!hasConsented ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <h2 className="font-extrabold text-slate-900 text-lg uppercase tracking-wide">ANEXOS: DOCUMENTOS DE IDENTIDAD</h2>
        </div>

        <div className="space-y-6">
          {idImage && (
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center">
              <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Documento de Identidad (Usuario Registrado)</p>
              <img src={idImage} alt="Cédula Principal" className="max-h-[500px] object-contain rounded-xl shadow-md border border-slate-200" />
            </div>
          )}

          {titularImage && (
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center mt-6">
              <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Documento de Identidad (Titular del Seguro)</p>
              <img src={titularImage} alt="Cédula Titular" className="max-h-[500px] object-contain rounded-xl shadow-md border border-slate-200" />
            </div>
          )}

          {pacienteImage && (
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center mt-6">
              <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Documento de Identidad (Paciente / Afectado)</p>
              <img src={pacienteImage} alt="Cédula Paciente" className="max-h-[500px] object-contain rounded-xl shadow-md border border-slate-200" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
