import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function main() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.list(); // Wait, let's see how list is done in the new SDK or just do a fetch
    // Actually, I'll just use fetch to be safe and avoid SDK version issues for listing
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    console.log(data.models.map((m: any) => m.name).join("\n"));
  } catch (e) {
    console.error(e);
  }
}
main();
