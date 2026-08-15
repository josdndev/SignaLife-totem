import React, { useState } from 'react';
import { 
  Users, 
  Activity, 
  Clock, 
  AlertTriangle, 
  HeartPulse, 
  Search, 
  Filter, 
  FileText, 
  CheckCircle2,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import type { IDData, VitalSigns } from '../types';

export interface RegisteredPatient {
  id: string;
  timestamp: string;
  idData: IDData;
  vitals: VitalSigns | null;
  symptoms: string;
  triageCategory: 'Roja' | 'Naranja' | 'Amarilla' | 'Verde' | 'Azul';
  priorityLevel: number;
  status: 'En Espera' | 'En Atención' | 'Alta';
}

// Mock inicial de pacientes para demostración inmediata
const MOCK_PATIENTS: RegisteredPatient[] = [
  {
    id: 'PAT-001',
    timestamp: 'Hace 5 min',
    idData: {
      names: 'Carlos Eduardo',
      surnames: 'Mendoza Pérez',
      idNumber: 'V-19.458.921',
      dateOfBirth: '14/05/1988',
      maritalStatus: 'Soltero',
      issueDate: '10/02/2018',
      expiryDate: '10/02/2028'
    },
    vitals: {
      bpm: 112,
      hrv: 45,
      rr: 24,
      stress: 'Elevado',
      bp: '135/88',
      spo2: 93,
      glucosa: 110,
      hba1c: 5.6,
      chartData: []
    },
    symptoms: 'Dolor torácico agudo con disnea progresiva de 2 horas de evolución.',
    triageCategory: 'Naranja',
    priorityLevel: 2,
    status: 'En Espera'
  },
  {
    id: 'PAT-002',
    timestamp: 'Hace 18 min',
    idData: {
      names: 'María Alejandra',
      surnames: 'Rojas Silva',
      idNumber: 'V-22.109.340',
      dateOfBirth: '22/09/1994',
      maritalStatus: 'Casada',
      issueDate: '15/06/2019',
      expiryDate: '15/06/2029'
    },
    vitals: {
      bpm: 78,
      hrv: 62,
      rr: 16,
      stress: 'Normal',
      bp: '120/80',
      spo2: 98,
      glucosa: 95,
      hba1c: 5.2,
      chartData: []
    },
    symptoms: 'Malestar general y cefalea leve posterior a jornada laboral.',
    triageCategory: 'Verde',
    priorityLevel: 4,
    status: 'En Atención'
  },
  {
    id: 'PAT-003',
    timestamp: 'Hace 35 min',
    idData: {
      names: 'José Luis',
      surnames: 'Gómez Hernández',
      idNumber: 'V-15.890.112',
      dateOfBirth: '03/11/1979',
      maritalStatus: 'Casado',
      issueDate: '20/01/2016',
      expiryDate: '20/01/2026'
    },
    vitals: {
      bpm: 95,
      hrv: 50,
      rr: 20,
      stress: 'Moderado',
      bp: '128/84',
      spo2: 96,
      glucosa: 102,
      hba1c: 5.4,
      chartData: []
    },
    symptoms: 'Fiebre persistente de 38°C y odinofagia intensa.',
    triageCategory: 'Amarilla',
    priorityLevel: 3,
    status: 'En Espera'
  }
];

interface DashboardProps {
  registeredPatients: RegisteredPatient[];
}

export const Dashboard: React.FC<DashboardProps> = ({ registeredPatients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');

  // Combinar los mock con los registrados durante la sesión actual del Tótem
  const allPatients = [...registeredPatients, ...MOCK_PATIENTS];

  const filteredPatients = allPatients.filter(patient => {
    const matchesSearch = 
      patient.idData.names.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.idData.surnames.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.idData.idNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = 
      selectedCategory === 'TODAS' || patient.triageCategory === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'Roja': return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'Naranja': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'Amarilla': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'Verde': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      
      {/* Metric Cards Top Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Total Pacientes</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-poppins">{allPatients.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +100% recepción digital
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Prioridad Alta</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-3xl font-extrabold text-orange-400 font-poppins">
            {allPatients.filter(p => p.triageCategory === 'Roja' || p.triageCategory === 'Naranja').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Requieren atención inmediata</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Tiempo Promedio</span>
            <Clock className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold text-teal-400 font-poppins">3.5 min</div>
          <div className="text-[11px] text-teal-400 mt-1">Pre-triaje automatizado</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>En Sala de Espera</span>
            <UserCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-400 font-poppins">
            {allPatients.filter(p => p.status === 'En Espera').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Monitoreados rPPG</div>
        </div>
      </div>

      {/* Filters and Search Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por Nombre o Cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {['TODAS', 'Naranja', 'Amarilla', 'Verde'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedCategory === cat 
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Paciente</th>
                <th className="p-4">Cédula</th>
                <th className="p-4">Signos Vitales rPPG</th>
                <th className="p-4">Triaje Manchester</th>
                <th className="p-4">Estatus</th>
                <th className="p-4 text-right">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-semibold text-white">
                    <div>{patient.idData.names} {patient.idData.surnames}</div>
                    <div className="text-[10px] text-slate-500 font-normal">F.Nac: {patient.idData.dateOfBirth}</div>
                  </td>
                  <td className="p-4 text-slate-300 font-mono">{patient.idData.idNumber}</td>
                  <td className="p-4">
                    {patient.vitals ? (
                      <div className="space-y-0.5 font-mono text-[11px]">
                        <span className="text-emerald-400 font-bold">FC: {patient.vitals.bpm} BPM</span> • 
                        <span className="text-teal-400 font-bold ml-1">SpO2: {patient.vitals.spo2}%</span> • 
                        <span className="text-cyan-400 font-bold ml-1">PA: {patient.vitals.bp}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No registrado</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${getBadgeColor(patient.triageCategory)}`}>
                      {patient.triageCategory} (Nivel {patient.priorityLevel})
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {patient.status}
                    </span>
                  </td>
                  <td className="p-4 text-right text-slate-500 text-[11px] font-mono">{patient.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
