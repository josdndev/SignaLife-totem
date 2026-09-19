import Tesseract from "tesseract.js";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { processRPPGOnServer } from "./src/utils/rppgServerDsp.ts";
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

  const RESIDENT_MODEL = "gemma4:e2b";
  const SPECIALIST_MODEL = "gemma4:e2b"; // Especialista médico estricto

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
      gender: { type: Type.STRING, description: "Sexo/Género inferido a partir de los nombres o del estado civil (e.g. MASCULINO o FEMENINO)" },
      issueDate: { type: Type.STRING, description: "Fecha de Expedición (e.g. 08-05-17)" },
      expiryDate: { type: Type.STRING, description: "Fecha de Vencimiento (e.g. 05-2027)" }
    },
    required: ["idNumber", "names", "surnames", "dateOfBirth", "maritalStatus", "gender", "issueDate", "expiryDate"]
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
        num_ctx: 4096
      }
    };
  }

  
  async function callDeepSeek(contents: any, config: any) {
    const apiKey = process.env.DEEPSEEK_API_KEY || "";
    
    // Extract text from contents
    let promptText = "";
    const extractText = (items: any[]) => {
      for (const item of items) {
        if (typeof item === 'string') {
          promptText += item + "\n";
        } else if (item.text) {
          promptText += item.text + "\n";
        } else if (item.parts) {
          extractText(item.parts);
        } else if (item.role && item.parts) {
          promptText += `${item.role}: `;
          extractText(item.parts);
        }
      }
    };
    if (Array.isArray(contents)) extractText(contents);
    else extractText([contents]);

    if (config.responseSchema) {
       promptText += "\n\nYou MUST return ONLY valid JSON matching this schema:\n" + JSON.stringify(config.responseSchema, null, 2);
    }

    console.log("LLamando a DeepSeek-Chat...");
    
    const payload: any = {
      model: "deepseek-chat",
      messages: [{ role: "user", content: promptText }],
      temperature: config.temperature || 0.1,
    };
    
    if (config.responseMimeType === "application/json") {
      payload.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
       const err = await response.text();
       throw new Error(`DeepSeek Error: ${err}`);
    }

    const data = await response.json();
    let reply = data.choices[0].message.content;
    
    if (config.responseMimeType === "application/json") {
       reply = reply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    return { text: reply };
  }

  async function generateContentWithFallback(contents: any, config: any, modelName: string = RESIDENT_MODEL) {
    // 1. Prioridad Absoluta: DeepSeek
    try {
      return await callDeepSeek(contents, config);
    } catch (error: any) {
      console.error("Error en llamada a DeepSeek:", error?.message || error);
      if (process.env.USE_OLLAMA_FALLBACK !== "true") {
        throw error;
      }
    }

    if (process.env.GEMINI_API_KEY) {
      console.log(`Llamando a Gemini (gemini-1.5-flash-8b) en lugar de ${modelName}`);
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

      let lastError;
      for (let attempt = 1; attempt <= 8; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
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
           console.error(`Error conectando con Gemini (Intento ${attempt}/8):`, error);
           lastError = error;
           if (attempt === 8) {
             throw lastError;
           }
        }
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
        let response;
        let lastError;
        for (let attempt = 1; attempt <= 8; attempt++) {
          try {
            response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
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
            break;
          } catch (error: any) {
            console.error(`Error transcribiendo con Gemini (Intento ${attempt}/8):`, error);
            lastError = error;
            if (attempt === 8) throw lastError;
          }
        }
        let text = response?.text || "";
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

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      
      console.log("Iniciando Tesseract OCR...");
      const buffer = Buffer.from(base64Data, 'base64');
      const { data: { text: ocrText } } = await Tesseract.recognize(buffer, 'spa');
      console.log("Texto OCR extraído:", ocrText);

      console.log("Enviando texto OCR a DeepSeek para estructurar en JSON...");
      const prompt = `Analiza este texto extraído por OCR de una Cédula de Identidad venezolana:
"""
${ocrText}
"""

REGLAS DE EXTRACCIÓN PARA CÉDULAS DE VENEZUELA:
1. 'names': Nombres de pila completos (ej. "JOSE DAVID").
2. 'surnames': Apellidos completos (ej. "NARANJO MALDONADO"). En las cédulas de Venezuela los APELLIDOS van arriba de los nombres (frecuentemente precedidos por 'APELLIDOS', 'apellidos' o 'amunos'). NUNCA dejes surnames vacío si hay palabras correspondientes en el texto.
3. 'idNumber': Número de Cédula con formato (ej. "V-31.901.967").
4. 'dateOfBirth': Fecha de nacimiento DD/MM/AAAA.
5. 'maritalStatus': Estado civil (SOLTERO, CASADO, VIUDO, DIVORCIADO).
6. 'gender': MASCULINO o FEMENINO según los nombres o sufijo civil.

Devuélvelo estrictamente en el formato JSON esperado.`;
      
      const response = await generateContentWithFallback(
        [ prompt ],
        {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.1,
        }
      );

      let text = response.text;
      if (!text) {
        throw new Error("No data returned from AI");
      }
      
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const extractedData = JSON.parse(text);
      if (extractedData.names) extractedData.names = extractedData.names.trim().toUpperCase();
      if (extractedData.surnames) extractedData.surnames = extractedData.surnames.trim().toUpperCase();
      
      // Si por alguna razón el OCR colocó todos los nombres y apellidos en un solo campo:
      if (extractedData.names && (!extractedData.surnames || extractedData.surnames.length === 0)) {
        const words = extractedData.names.split(/\s+/);
        if (words.length >= 4) {
          extractedData.names = `${words[0]} ${words[1]}`;
          extractedData.surnames = words.slice(2).join(' ');
        }
      }
      
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

  // Procesamiento seguro de rPPG con algoritmo POS y análisis espectral en servidor
  app.post("/api/rppg/process", async (req, res) => {
    try {
      const { rawRed, rawGreen, rawBlue, rawMotion } = req.body;
      if (!rawRed || !rawGreen || !rawBlue) {
        return res.status(400).json({ error: "Faltan las series de canales cromáticos (R, G, B)." });
      }

      const result = processRPPGOnServer({ rawRed, rawGreen, rawBlue, rawMotion });
      res.json(result);
    } catch (error: any) {
      console.error("Error en procesamiento rPPG del servidor:", error);
      res.status(500).json({ error: error.message || "Error procesando rPPG en servidor" });
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
          clinicalSummary: { type: Type.STRING, description: "Carta Narrativa redactada en primera persona, corrigiendo errores ortográficos del paciente. Debe tener al menos 40 palabras y ser formal." },
          doctorSummary: { type: Type.STRING, description: "Resumen médico técnico del motivo de consulta orientado a un doctor (Sintomatología médica, terminología profesional, conciso y objetivo)." }
        },
        required: ["triageLevel", "destination", "waitTime", "clinicalSummary", "doctorSummary"]
      };

      const parts: any[] = [
        {
          text: `Eres un experto en triage médico. Analiza lo siguiente:\n\nSíntomas reportados por el paciente: "${symptoms || 'Ninguno'}"\n\nSignos Vitales: ${JSON.stringify(vitals, null, 2)}\n\n1. Proporciona el nivel de triage adecuado.\n2. En el campo \'clinicalSummary\', DEBES redactar una \'Carta Narrativa\' formal en PRIMERA PERSONA (Ej. "Yo, el paciente, declaro que me encontraba..."). Corrige todos los errores ortográficos del relato original y expande la redacción para que suene profesional, coherente y detallada, garantizando que tenga MÍNIMO 40 PALABRAS. NUNCA menciones ni incluyas los signos vitales en esta carta narrativa.\n3. En el campo \'doctorSummary\', elabora un resumen clínico técnico objetivo orientado a un médico tratante utilizando terminología médica apropiada.`
        }
      ];

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

1. Si es correcto, devuelve score 10 y NO incluyas 'correctedTriage'.
2. Si tiene fallas, devuelve un score menor a 10 y proporciona un 'correctedTriage'.
IMPORTANTE: Si corriges el triage, DEBES mantener el campo 'clinicalSummary' como una Carta Narrativa redactada en PRIMERA PERSONA, con buena ortografía y de MÍNIMO 40 palabras, y SIN mencionar los signos vitales. También DEBES incluir el campo 'doctorSummary' con un resumen clínico técnico y objetivo orientado al médico tratante. Si el score es <= 8, completa obligatoriamente 'correctedTriage' con el triage corregido.
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
        Eres un Médico Orientador de Admisiones. Tu rol es realizar una breve entrevista clínica para documentar la Enfermedad Actual del paciente.
        
        Objetivos de la entrevista:
        - Determinar el motivo de consulta principal (CÓMO ocurrió o qué síntomas tiene).
        - Determinar CUÁNDO ocurrió de forma relativa o absoluta (ej. "hace 2 días", "ayer por la tarde"). No pidas horas o minutos exactos.
        - Determinar DÓNDE ocurrió en términos generales (ej. "en mi casa", "jugando fútbol en la calle"). NUNCA exijas una dirección exacta, municipio o calle.
        
        Reglas:
        1. Haz UNA sola pregunta corta y empática a la vez. No agobies al paciente.
        2. El tono debe ser muy profesional, compasivo y directo (sin formalismos excesivos).
        3. No preguntes datos administrativos como cédula, póliza, sede o aseguradora (esos datos ya se recolectan automáticamente en otra pantalla).
        4. Transforma mentalmente fechas relativas ("ayer") a tu comprensión del caso, no exijas que te digan la fecha exacta con formato de calendario.
        5. La primera pregunta debe ser únicamente: "Hola, soy el asistente médico de admisiones. Por favor cuéntame: ¿Qué te ocurrió, cómo pasó, dónde estabas y cuándo ocurrió?".
        6. Si el paciente menciona dolor, indaga brevemente su intensidad (del 1 al 10) y si se irradia.
        7. Cuando tengas claro el panorama básico de lo sucedido (qué, cómo, cuándo, dónde), finaliza INMEDIATAMENTE tu turno respondiendo ÚNICAMENTE con la palabra: "INTERVIEW_COMPLETE". No agregues nada más a ese mensaje final.
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
