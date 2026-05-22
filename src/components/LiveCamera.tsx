import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, Circle } from 'lucide-react';
import { motion } from 'motion/react';

interface LiveCameraProps {
  onCapture: (base64Image: string) => void;
  onCancel: () => void;
}

export function LiveCamera({ onCapture, onCancel }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        let stream: MediaStream;
        try {
          // Intentar cámara trasera primero
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
        } catch (e) {
          console.warn("No se pudo acceder a la cámara trasera, intentando cualquier cámara...", e);
          // Fallback a cualquier cámara disponible (ej. webcams en PC)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Error al reproducir video:", e));
          };
        }
        streamRef.current = stream;
      } catch (err: any) {
        console.error("Error accessing camera:", err);
        setError(`No se pudo iniciar la cámara (${err.message || 'Timeout o bloqueada'}). Si estás en un iframe, intenta abrir la aplicación en una nueva pestaña, o verifica que ninguna otra app esté usando la cámara.`);
      }
    }

    startCamera();

    return () => {
      // Cleanup stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        
        // Stop stream before returning
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        onCapture(imageData);
      }
    }
  };

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onCancel();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-red-50 text-red-800 rounded-xl border border-red-100 text-center">
        <p className="mb-4">{error}</p>
        <button 
          onClick={handleCancel}
          className="px-4 py-2 bg-white rounded-lg border border-red-200 hover:bg-red-50 font-medium"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-black flex flex-col min-h-[300px] md:min-h-[400px]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover flex-1"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Overlay to help align the ID */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
         <div className="w-full max-w-sm aspect-[1.6/1] border-2 border-white/50 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] bg-transparent flex items-center justify-center">
           <span className="text-white/50 font-medium text-sm tracking-wider uppercase bg-black/40 px-3 py-1 rounded backdrop-blur-sm">
             Alinea tu cédula aquí
           </span>
         </div>
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent">
        <button 
          onClick={handleCancel}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <button 
          onClick={handleCapture}
          className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 backdrop-blur-sm transition-colors border-2 border-white/50"
        >
          <Circle className="w-12 h-12 text-white fill-white" />
        </button>
        
        <div className="w-12" /> {/* Empty spacer for layout balance */}
      </div>
    </div>
  );
}
