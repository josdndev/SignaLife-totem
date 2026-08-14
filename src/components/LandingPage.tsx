import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Brain, 
  Eye, 
  Network, 
  TrendingUp, 
  Globe, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  UserCheck, 
  Stethoscope, 
  Sparkles, 
  MapPin, 
  Mail, 
  ExternalLink,
  Layers,
  Zap,
  Award,
  HeartPulse
} from 'lucide-react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface LandingPageProps {
  onStartDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartDemo }) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Parallax transform for hero background
  const yHero = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.25], [1, 0.2]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 z-50 origin-left"
        style={{ scaleX }}
      />

      {/* Navigation */}
      <nav className="fixed w-full z-40 bg-slate-950/80 backdrop-blur-xl border-b border-emerald-500/10 shadow-2xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
                <HeartPulse className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent font-poppins">
                  Signa<span className="text-emerald-400">Life</span>
                </span>
                <span className="text-[10px] tracking-widest text-emerald-400/80 uppercase font-semibold -mt-1">
                  Engidea Ecosystem
                </span>
              </div>
            </motion.div>
            
            {/* Desktop Navigation */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="hidden lg:flex items-center space-x-8 font-medium text-slate-300 text-sm"
            >
              <a href="#inicio" className="hover:text-emerald-400 transition-colors">Inicio</a>
              <a href="#arquitectura" className="hover:text-emerald-400 transition-colors">Arquitectura 5G</a>
              <a href="#beneficios" className="hover:text-emerald-400 transition-colors">Ecosistema 360°</a>
              <a href="#equipo" className="hover:text-emerald-400 transition-colors">Equipo</a>
              <a href="#contacto" className="hover:text-emerald-400 transition-colors">Contacto</a>
            </motion.div>

            {/* Action CTA */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <button 
                onClick={onStartDemo}
                className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-slate-950 transition-all duration-300 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                <span>Iniciar Totem Demo</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section id="inicio" className="relative pt-32 lg:pt-44 pb-24 overflow-hidden min-h-screen flex items-center">
        {/* Animated Background Grids and Blurs */}
        <motion.div style={{ y: yHero, opacity: opacityHero }} className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content Column */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-7 space-y-8 text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <Activity className="w-4 h-4 mr-1 text-emerald-400" />
                Ecosistema Edge-to-Cloud 5G • v.1.0_VZLA
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] font-poppins">
                Sistematización <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Inteligente</span> para la Atención de Urgencias.
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl">
                Revolucionamos la recepción hospitalaria mediante Inteligencia Artificial, Fotopletismografía Remota (rPPG) sin contacto y el Sistema de Triaje de Manchester. Eliminamos filas a ciegas y priorizamos vidas en tiempo real.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                <button
                  onClick={onStartDemo}
                  className="px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:scale-105 transition-all duration-300 flex items-center gap-3 text-base"
                >
                  <Sparkles className="w-5 h-5 text-slate-950" />
                  <span>Probar Totem Interactivo</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <a
                  href="#arquitectura"
                  className="px-8 py-4 rounded-2xl font-bold bg-slate-900/80 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-emerald-500/30 transition-all duration-300 flex items-center gap-2 text-base backdrop-blur-sm"
                >
                  <span>Explorar Tecnología</span>
                  <ChevronDown className="w-4 h-4" />
                </a>
              </div>

              {/* Stat Highlights */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-800/80">
                <div>
                  <div className="text-3xl font-extrabold text-emerald-400 font-poppins">&lt; 5 min</div>
                  <div className="text-xs text-slate-400 font-medium">Clasificación Completa</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-teal-400 font-poppins">-75%</div>
                  <div className="text-xs text-slate-400 font-medium">Tiempo de Espera</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-cyan-400 font-poppins">100%</div>
                  <div className="text-xs text-slate-400 font-medium">Objetividad Médica</div>
                </div>
              </div>
            </motion.div>

            {/* Right Interactive Mockup / Hero Image */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="lg:col-span-5 relative"
            >
              <div className="relative rounded-3xl p-1 bg-gradient-to-b from-emerald-500/30 via-slate-800 to-slate-900 shadow-2xl shadow-emerald-500/10">
                <div className="relative rounded-[22px] overflow-hidden bg-slate-900 aspect-[4/3] border border-white/10 group">
                  <img 
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200" 
                    alt="Totem Telemetría SignaLife" 
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  
                  {/* Floating Overlay Card */}
                  <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md shadow-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                        <Activity className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white uppercase tracking-wider">Monitoreo rPPG Activo</div>
                        <div className="text-[11px] text-slate-400">FC: 75 BPM • SpO2: 98% • Temp: 36.8°C</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      En Línea
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SECCIÓN 2: EL PROBLEMA (EL CICLO SIN FIN DEL TRIAJE) */}
      <section className="py-24 bg-slate-900/50 border-y border-slate-800/80 relative">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-3">Diagnóstico del Sector</h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white font-poppins">El Ciclo Sin Fin del Triaje Tradicional</h3>
            <p className="text-slate-400 mt-4 text-base">
              La saturación en salas de emergencia genera cuellos de botella críticos que desgastan tanto al personal de salud como a los pacientes en momentos de máxima vulnerabilidad.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 transition-all duration-300 relative group"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Atención por Orden de Llegada</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                El triaje acaba atendiéndose como un banco debido a que el personal humano no se da abasto para evaluar a cada paciente inmediatamente.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 transition-all duration-300 relative group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Sobresaturación y Burnout</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                El personal clínico sufre las consecuencias del desgaste administrativo constante, impidiendo una dedicación focalizada a emergencias reales.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 transition-all duration-300 relative group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Incertidumbre en Espera</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Los pacientes se sienten desatendidos en la sala de espera sin saber si su estado está empeorando o cuándo recibirán atención.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: LA SOLUCIÓN (ARQUITECTURA TECNOLÓGICA 3 PASOS) */}
      <section id="arquitectura" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-4 py-1.5 rounded-full text-xs uppercase tracking-wider mb-4">
              Arquitectura del Sistema: Del Caos al Dato
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white font-poppins">Plataforma de Pre-Triaje Definitiva</h2>
            <p className="text-slate-400 mt-4 text-base">
              Combinamos visión artificial, fotopletismografía y modelos LLM optimizados con el Sistema de Triaje de Manchester.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 relative flex flex-col justify-between group hover:border-emerald-500/40 transition-all shadow-xl"
            >
              <div>
                <div className="text-5xl font-extrabold text-slate-800 group-hover:text-emerald-500/20 transition-colors font-poppins mb-6">01</div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                  <Eye className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Registro Inteligente</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Visión artificial escanea cédulas de identidad o pasaportes. Extracción automatizada OCR sin burocracia humana ni errores de transcripción.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-800 text-xs font-semibold text-emerald-400 flex items-center justify-between">
                <span>Extracción OCR IA</span>
                <span>Cero Papel</span>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 relative flex flex-col justify-between group hover:border-teal-500/40 transition-all shadow-xl"
            >
              <div>
                <div className="text-5xl font-extrabold text-slate-800 group-hover:text-teal-500/20 transition-colors font-poppins mb-6">02</div>
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-6">
                  <Activity className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Fotopletismografía rPPG</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Sensores y cámaras de video capturan la variación micro-vascular del rostro para obtener Frecuencia Cardíaca, Frecuencia Respiratoria y SpO2 a distancia en segundos. Cero contacto.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-800 text-xs font-semibold text-teal-400 flex items-center justify-between">
                <span>Sin Invasión Física</span>
                <span>Telemetría Médica</span>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 relative flex flex-col justify-between group hover:border-cyan-500/40 transition-all shadow-xl"
            >
              <div>
                <div className="text-5xl font-extrabold text-slate-800 group-hover:text-cyan-500/20 transition-colors font-poppins mb-6">03</div>
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
                  <Brain className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Asistente Virtual LLM</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Entrevista conversacional adaptable impulsada por modelos médicos especializados. Clasifica el motivo de consulta según el estándar de Manchester y genera informe estructurado para el médico.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-800 text-xs font-semibold text-cyan-400 flex items-center justify-between">
                <span>Escala Manchester</span>
                <span>Priorización Real</span>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SECCIÓN 4: MATRIZ DE COMPARACIÓN */}
      <section className="py-24 bg-slate-900/70 border-y border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-3">El Cambio de Paradigma</h2>
            <h3 className="text-3xl font-bold text-white font-poppins">De la Espera a la Sanación</h3>
          </motion.div>

          <div className="rounded-3xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl">
            <div className="grid grid-cols-12 bg-slate-900/90 p-6 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
              <div className="col-span-4">Criterio</div>
              <div className="col-span-4 text-rose-400">Triaje Tradicional</div>
              <div className="col-span-4 text-emerald-400">SignaLife Ecosystem</div>
            </div>

            <div className="divide-y divide-slate-800 text-sm">
              <div className="grid grid-cols-12 p-6 items-center hover:bg-slate-900/40 transition">
                <div className="col-span-4 font-semibold text-white">Atención del Paciente</div>
                <div className="col-span-4 text-slate-400">Estricto orden de llegada</div>
                <div className="col-span-4 text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Filtro por Gravedad Vital
                </div>
              </div>

              <div className="grid grid-cols-12 p-6 items-center hover:bg-slate-900/40 transition">
                <div className="col-span-4 font-semibold text-white">Captura de Datos</div>
                <div className="col-span-4 text-slate-400">Manual, tedioso y propenso a error</div>
                <div className="col-span-4 text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Automatización OCR e IA
                </div>
              </div>

              <div className="grid grid-cols-12 p-6 items-center hover:bg-slate-900/40 transition">
                <div className="col-span-4 font-semibold text-white">Signos Vitales</div>
                <div className="col-span-4 text-slate-400">Toma física secuencial lenta</div>
                <div className="col-span-4 text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> rPPG Óptico Instantáneo
                </div>
              </div>

              <div className="grid grid-cols-12 p-6 items-center hover:bg-slate-900/40 transition">
                <div className="col-span-4 font-semibold text-white">Tiempo Estimado</div>
                <div className="col-span-4 text-slate-400">Largas esperas e incertidumbre</div>
                <div className="col-span-4 text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Clasificación en &lt; 5 min
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 5: EQUIPO Y RESPALDO (ENGIDEA) */}
      <section id="equipo" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-3">Liderazgo & Desarrollo</h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white font-poppins">Los Arquitectos del Cambio</h3>
            <p className="text-slate-400 mt-4 text-base">
              Desarrolladores de tecnología de vanguardia orientados a erradicar tiempos de espera y devolver la humanidad al triaje desde el primer contacto.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
            {/* Diego Quintana */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex items-start gap-6 hover:border-emerald-500/30 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-bold text-2xl shrink-0 font-poppins shadow-lg">
                DQ
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">Diego Quintana</h4>
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">[CEO] Leadership & Strategy</div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Liderazgo estratégico y visión de producto. Orientado a la implementación eficiente de sistemas médicos en el ecosistema andino.
                </p>
              </div>
            </motion.div>

            {/* José Naranjo */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex items-start gap-6 hover:border-emerald-500/30 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-700 flex items-center justify-center text-slate-950 font-bold text-2xl shrink-0 font-poppins shadow-lg">
                JN
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">José Naranjo</h4>
                <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">[CTO] System Architecture & AI</div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Arquitectura tecnológica, Inteligencia Artificial y despliegue de sistemas Edge-to-Cloud 5G.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Engidea Backing */}
          <div className="p-10 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 text-center max-w-4xl mx-auto relative overflow-hidden">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Respaldado institucionalmente por</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <a href="https://engidea.com.ve/" target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform">
                <img 
                  src="https://i.ibb.co/LXKGqxJ1/cropped-cropped-Logo-Marca-Nueva-horizontal-2-e1703691014904.png" 
                  alt="Engidea MakerSpace Logo" 
                  className="h-14 w-auto brightness-120"
                />
              </a>
              <div className="flex items-center gap-6">
                <a href="https://proyectos.engidea.com.ve/index.php/portfolio/signalife/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-300 hover:text-emerald-400 transition flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-emerald-400" /> Portafolio SignaLife
                </a>
                <a href="https://engidea.com.ve/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-300 hover:text-emerald-400 transition flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" /> MakerSpace UNIMET
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 6: CONTACTO */}
      <section id="contacto" className="py-24 bg-slate-900/40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden grid md:grid-cols-2">
            
            <div className="p-10 bg-gradient-to-br from-emerald-600 to-teal-700 text-slate-950 flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-extrabold font-poppins mb-4">Únete a la Revolución Digital</h3>
                <p className="text-slate-950/80 text-sm leading-relaxed mb-8">
                  ¿Representas a un centro de salud público o privado? Contáctanos para conocer cómo nuestra arquitectura Edge-to-Cloud puede optimizar tu sala de urgencias.
                </p>
              </div>

              <div className="space-y-4 text-xs font-bold">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 shrink-0" />
                  <span>Zona Rental UNIMET, Edificio 1, Piso 1. Caracas, Venezuela.</span>
                </div>
                <div class="flex items-center gap-3">
                  <Mail className="w-5 h-5 shrink-0" />
                  <span>signalife@engidea.com.ve</span>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-900">
              <form action="mailto:signalife@engidea.com.ve" method="post" enctype="text/plain" class="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre / Organización</label>
                  <input type="text" name="nombre" required className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none" placeholder="Tu nombre o clínica" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Correo Electrónico</label>
                  <input type="email" name="email" required className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none" placeholder="email@institucion.com" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mensaje</label>
                  <textarea name="mensaje" rows={3} required className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none" placeholder="¿Cómo podemos colaborar?" />
                </div>
                <button type="submit" className="w-full py-3.5 rounded-xl bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300 transition text-sm">
                  Solicitar Información
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-slate-900 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-white">SignaLife</span>
            <span>• Engidea Ecosystem</span>
          </div>
          <div>
            &copy; 2026 SignaLife. Diego Quintana [CEO] &amp; José Naranjo [CTO]. Todos los derechos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
};
