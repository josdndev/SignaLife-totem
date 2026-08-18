import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
const Type = {
  STRING: "string",
  OBJECT: "object",
  ARRAY: "array",
  NUMBER: "number",
  BOOLEAN: "boolean"
};
type Schema = any;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  const RESIDENT_MODEL = "gemma3:4b"; // Gemma 4 light equivalent (supports vision)
  const SPECIALIST_MODEL = "medgemma"; // Especialista médico estricto

  // Increase payload size for base64 images
  app.use(express.json({ limit: '10mb' }));

  // API constraints for Venezuelan ID extraction
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      idNumber: { type: Type.STRING, description: "Cédula de Identidad number (e.g. V 22.222.222)" },
      names: { type: Type.STRING, description: "Nombres (Names)" },
      surnames: { type: Type.STRING, description: "Apellidos (Surnames)" },
      dateOfBirth: { type: Type.STRING, description: "Fecha de Nacimiento (e.g. 10-12-98)" },
      maritalStatus: { type: Type.STRING, description: "Estado Civil (e.g. SOLTERO)" },
      issueDate: { type: Type.STRING, description: "Fecha de Expedición (e.g. 08-05-17)" },
      expiryDate: { type: Type.STRING, description: "Fecha de Vencimiento (e.g. 05-2027)" }
    },
    required: ["idNumber", "names", "surnames", "dateOfBirth", "maritalStatus", "issueDate", "expiryDate"]
  };

  function buildOllamaPayload(contents: any, config: any, modelName: string = RESIDENT_MODEL) {
    let promptText = "";
    let images: string[] = [];

    const extractData = (items: any[]) => {
      for (const item of items) {
        if (typeof item === 'string') {
          promptText += item + "\n";
        } else if (item.text) {
          promptText += item.text + "\n";
        } else if (item.inlineData && item.inlineData.data) {
          images.push(item.inlineData.data);
        } else if (item.parts) {
          extractData(item.parts);
        }
      }
    };

    if (Array.isArray(contents)) {
      extractData(contents);
    } else {
      extractData([contents]);
    }

    if (config?.responseSchema) {
      promptText += "\n\nDEBES responder usando el siguiente formato JSON estricto: " + JSON.stringify(config.responseSchema);
    }

    return {
      model: modelName,
      prompt: promptText.trim(),
      images: images.length > 0 ? images : undefined,
      stream: false,
      format: config?.responseMimeType === "application/json" ? "json" : undefined,
      options: {
        temperature: config?.temperature ?? 0.7,
        num_ctx: 16384
      }
    };
  }

  async function generateContentWithFallback(contents: any, config: any, modelName: string = RESIDENT_MODEL) {
    if (process.env.GEMINI_API_KEY) {
      console.log(`Llamando a Gemini (gemini-3.1-flash-lite) en lugar de ${modelName}`);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let parts: any[] = [];
      const extractData = (items: any[]) => {
        for (const item of items) {
          if (typeof item === 'string') {
            parts.push({ text: item });
          } else if (item.text) {
            parts.push({ text: item.text });
          } else if (item.inlineData) {
            parts.push({ inlineData: item.inlineData });
          } else if (item.parts) {
            extractData(item.parts);
          } else if (item.role && item.parts) {
            extractData(item.parts);
          }
        }
      };

      if (Array.isArray(contents)) {
        extractData(contents);
      } else {
        extractData([contents]);
      }

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: [
            {
              role: 'user',
              parts: parts
            }
          ],
          config: {
            temperature: config?.temperature ?? 0.7,
            responseMimeType: config?.responseMimeType,
            responseSchema: config?.responseSchema
          }
        });
        return { text: response.text || "" };
      } catch (error: any) {
         console.error("Error conectando con Gemini:", error);
         throw error;
      }
    }

    const payload = buildOllamaPayload(contents, config, modelName);
    console.log(`Llamando a Ollama local (${modelName})`);
    
    try {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama Error ${res.status}: ${errText}`);
      }
      
      const data = await res.json();
      return { text: data.response };
    } catch (error: any) {
      console.error("Error conectando con Ollama:", error.message);
      throw error;
    }
  }

  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      const base64Data = audioBase64.replace(/^data:audio\/\w+(?:;\w+=[^;]+)*;base64,/, "");

      if (process.env.GEMINI_API_KEY) {
        console.log("Transcribiendo audio con Gemini...");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType || 'audio/webm'
                    }
                  },
                  {
                    text: "Transcribe el siguiente audio médico en español. Responde ÚNICAMENTE con el texto transcrito sin agregar comillas, saludos ni contexto."
                  }
                ]
              }
            ]
        });
        let text = response.text || "";
        return res.json({ text: text.trim() });
      }

      console.log("Transcribiendo audio con Ollama...");
      const response = await generateContentWithFallback([
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType || "audio/webm",
            }
          },
          "Transcribe el siguiente audio médico en español. Responde ÚNICAMENTE con el texto transcrito sin agregar comillas, saludos ni contexto."
        ],
        {
          temperature: 0.1,
        }
      );

      let text = response.text || "";
      res.json({ text: text.trim() });
    } catch (error: any) {
      console.error("/api/transcribe error:", error);
      res.status(500).json({ error: error.message || "Error al transcribir" });
    }
  });

  app.post("/api/extract", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "imageBase64 and mimeType are required." });
      }

      // Extract raw base64 data if it includes data URI wrapper
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const response = await generateContentWithFallback([
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            }
          },
          "Extract all the information from this ID card (Cédula de Identidad de Venezuela) and return it structured according to the expected JSON format."
        ],
        {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      );

      let text = response.text;
      if (!text) {
        throw new Error("No data returned from Gemini/Ollama");
      }
      
      // Limpiar markdown (ej. ```json ... ```)
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const extractedData = JSON.parse(text);
      res.json({ data: extractedData });
    } catch (error: any) {
      console.error("Extraction error:", error);
      res.status(500).json({ error: error.message || "Failed to extract data" });
    }
  });

  app.post("/api/vitals", async (req, res) => {
    try {
      const { bpm, hrv, lfPower, hfPower, spo2 } = req.body;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          sys: { type: Type.NUMBER, description: "Presión arterial sistólica estimada (mmHg)" },
          dia: { type: Type.NUMBER, description: "Presión arterial diastólica estimada (mmHg)" },
          glucosa: { type: Type.NUMBER, description: "Nivel de glucosa estimado en sangre (mg/dL)" },
          hba1c: { type: Type.NUMBER, description: "Porcentaje estimado de HbA1c" }
        },
        required: ["sys", "dia", "glucosa", "hba1c"]
      };

      const prompt = `
        Eres un modelo de Inteligencia Artificial clínica (Red Neuronal Profunda simulada).
        Tu objetivo es inferir estadísticamente la presión arterial y los niveles de glucosa basados en los siguientes biomarcadores extraídos por fotopletismografía (rPPG):
        
        - Ritmo Cardíaco (BPM): ${bpm}
        - Variabilidad del Ritmo Cardíaco (HRV): ${hrv} ms
        - Poder Baja Frecuencia (LF): ${lfPower}
        - Poder Alta Frecuencia (HF): ${hfPower}
        - Saturación de Oxígeno (SpO2): ${spo2}%
        
        Considera que una taquicardia severa post-ejercicio (ej. > 150 BPM) casi siempre se correlaciona con un pico hipertensivo fisiológico normal (ej. > 140/90). 
        El nivel de glucosa en esfuerzo intenso puede bajar ligeramente o mantenerse normal.
        Responde estrictamente con el JSON solicitado.
      `;

      const response = await generateContentWithFallback(
        [{ text: prompt }],
        {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.3,
        }
      );

      let text = response.text;
      if (!text) {
        throw new Error("No data returned from AI");
      }
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const predictedVitals = JSON.parse(text);
      res.json(predictedVitals);
    } catch (error: any) {
      console.error("Vitals prediction error:", error);
      res.status(500).json({ error: error.message || "Failed to predict vitals" });
    }
  });

  app.post("/api/triage", async (req, res) => {
    try {
      const { symptoms, vitals, imageBase64, mimeType } = req.body;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          triageLevel: { type: Type.STRING, description: "Nivel de Triage: Rojo, Naranja, Amarillo, Verde, o Azul" },
          destination: { type: Type.STRING, description: "Ubicación sugerida: Emergencia o Ambulatorio" },
          waitTime: { type: Type.STRING, description: "Tiempo de espera aproximado (ej. Inmediato, 10 min, 60 min...)" },
          clinicalSummary: { type: Type.STRING, description: "Resumen clínico y justificación de la clasificación" }
        },
        required: ["triageLevel", "destination", "waitTime", "clinicalSummary"]
      };

      const parts: any[] = [
        {
          text: `Eres un experto en triage médico (Sistema Manchester). Analiza lo siguiente:\n\nSíntomas reportados por el paciente: "${symptoms || 'Ninguno'}"\n\nSignos Vitales: ${JSON.stringify(vitals, null, 2)}\n\nTambién se adjunta una fotografía del paciente durante la lectura. Proporciona una clasificación de triage adecuada en el JSON.`
        }
      ];

      if (imageBase64 && mimeType) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.unshift({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      const residentResponse = await generateContentWithFallback(
        [{ role: "user", parts }],
        {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2,
        },
        RESIDENT_MODEL
      );

      const residentText = residentResponse.text;
      if (!residentText) {
        throw new Error("No data returned from Resident model");
      }

      let triageData = JSON.parse(residentText);

      // Paso 2: Evaluación del Especialista (MedGemma)
      const specialistSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Calidad médica del análisis de 1 a 10" },
          correctedTriage: responseSchema
        },
        required: ["score"]
      };

      const specialistPrompt = `
Eres un Médico Adjunto Especialista (MedGemma). Tu trabajo es evaluar críticamente el triage generado por un Residente.
Analiza si el triage propuesto es médicamente sólido o si viola algún principio médico o ignora señales de alarma (red flags).

=== DATOS DEL PACIENTE ===
Síntomas: "${symptoms || 'Ninguno'}"
Signos Vitales: ${JSON.stringify(vitals, null, 2)}

=== TRIAGE DEL RESIDENTE ===
${JSON.stringify(triageData, null, 2)}

Califica la calidad de 1 a 10. Si la calidad es mayor a 8, no necesitas llenar 'correctedTriage'. Si es <= 8, completa obligatoriamente 'correctedTriage' con el triage corregido.
      `;

      const specialistResponse = await generateContentWithFallback(
        [{ text: specialistPrompt }],
        {
          responseMimeType: "application/json",
          responseSchema: specialistSchema,
          temperature: 0.1,
        },
        SPECIALIST_MODEL
      );

      const specialistText = specialistResponse.text;
      let finalTriage = triageData;

      if (specialistText) {
        try {
          const specialistData = JSON.parse(specialistText);
          console.log(`Evaluación MedGemma - Score: ${specialistData.score}`);
          if (specialistData.score <= 8 && specialistData.correctedTriage) {
            console.log("Aplicando correcciones de MedGemma...");
            finalTriage = specialistData.correctedTriage;
          }
        } catch (e) {
          console.error("Error parseando respuesta de MedGemma, usando triage del Residente.", e);
        }
      }

      res.json({ triage: finalTriage });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/interview", async (req, res) => {
    try {
      const { history } = req.body;
      const prompt = `
        Eres un Asistente Clínico de Admisiones. Tu rol es doble: realizar un triage médico de urgencias y recolectar los datos para la carta de siniestro del seguro.
        
        Objetivo Médico:
        - Determinar el motivo principal de consulta y recabar síntomas relevantes.

        Objetivo de Seguro (Debes preguntar esto paso a paso):
        1. Ciudad de la declaración.
        2. Número de póliza.
        3. Fecha del suceso.
        4. Hora del suceso.
        5. Lugar del suceso.
        6. Descripción de los hechos (qué pasó).
        7. Daños o lesiones.

        Reglas:
        1. Debes hacer máximo 10 preguntas en total en la conversación.
        2. Haz siempre UNA pregunta a la vez (por ejemplo, no pidas la ciudad y la fecha al mismo tiempo).
        3. Mantén un tono profesional, compasivo y directo.
        4. El tipo de seguro es SIEMPRE "Salud". No lo preguntes.
        5. La primera pregunta de la conversación debe ser: "Hola, soy el asistente clínico de admisiones. Para tener el mayor contexto posible, por favor cuéntame: ¿Qué te sucedió (o cuál es tu síntoma), cómo ocurrió, cuándo comenzó y en dónde estabas o dónde te ocurrió?".
        6. Revisa estrictamente el historial. Una vez que tengas una idea clara de la emergencia médica Y hayas recopilado los 7 datos del seguro, tu ÚNICA respuesta debe ser la palabra exacta: "INTERVIEW_COMPLETE". No agregues nada más en esa respuesta final.
      `;

      const response = await generateContentWithFallback([
          { text: prompt },
          ...history.map((msg: any) => ({
             text: `${msg.role === 'user' ? 'Paciente' : 'Asistente'}: ${msg.content}`
          })),
          { text: 'Asistente:' }
        ],
        {
          temperature: 0.3,
        }
      );

      let reply = response.text || "";
      res.json({ reply: reply.trim() });
    } catch (error: any) {
      console.error("/api/interview error:", error);
      res.status(500).json({ error: error.message || "Error al generar entrevista unificada" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Since this is a SPA, we route all other requests to index.html
    const expressApp = app as any;
    expressApp.get('*all', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
