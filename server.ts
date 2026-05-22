import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size for base64 images
  app.use(express.json({ limit: '10mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

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

  async function generateContentWithFallback(contents: any, config: any) {
    const models = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    let lastError: any;

    for (const model of models) {
      try {
        console.log(`Intentando con el modelo: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents,
          config
        });
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(`Error con el modelo ${model}:`, error.message || error);
        // Si el error es por cuota, intentamos con el siguiente
        if (error.status === 'RESOURCE_EXHAUSTED' || error.status === 429 || (error.message && error.message.includes('429'))) {
           continue;
        }
        // Si es otro error, lo lanzamos
        throw error;
      }
    }
    throw lastError;
  }

  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      const base64Data = audioBase64.replace(/^data:audio\/\w+(?:;\w+=[^;]+)*;base64,/, "");

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

      const text = response.text;
      if (!text) {
        throw new Error("No data returned from Gemini");
      }

      const extractedData = JSON.parse(text);
      res.json({ data: extractedData });
    } catch (error: any) {
      console.error("Extraction error:", error);
      res.status(500).json({ error: error.message || "Failed to extract data" });
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

      const response = await generateContentWithFallback(
        [{ role: "user", parts }],
        {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2,
        }
      );

      const text = response.text;
      if (!text) {
        throw new Error("No data returned from Gemini");
      }

      let triageData = JSON.parse(text);
      res.json({ triage: triageData });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/interview", async (req, res) => {
    try {
      const { history } = req.body;
      const prompt = `
        Eres un médico experto realizando el triage en urgencias. Tu objetivo es hacer UNA pregunta a la vez al paciente para recolectar información sobre su motivo de consulta. 
        Reglas:
        1. Debes hacer máximo 7 preguntas en total en la conversación.
        2. Siempre haz solo UNA pregunta por turno.
        3. Mantén un tono compasivo pero directo y breve.
        4. Si después de algunas preguntas (o máximo 7) ya tienes una idea clara de la emergencia, responde SOLAMENTE con la palabra "TRIAGE_COMPLETE".
        5. La primera pregunta debe ser "Hola, ¿cuál es el motivo de tu consulta hoy?".
      `;

      const response = await generateContentWithFallback([
          { text: prompt },
          ...history.map((msg: any) => ({
             text: `${msg.role === 'user' ? 'Paciente' : 'Doctor'}: ${msg.content}`
          })),
          { text: 'Doctor:' }
        ],
        {
          temperature: 0.3,
        }
      );

      let reply = response.text || "";
      res.json({ reply: reply.trim() });
    } catch (error: any) {
      console.error("/api/interview error:", error);
      res.status(500).json({ error: error.message || "Error al generar entrevista" });
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
