import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.4,
  },
  systemInstruction: `You are an expert full-stack developer with 10+ years of MERN experience.
Always write modular, clean, well-commented code following best practices.
Handle errors and edge cases. Write scalable, maintainable code.

IMPORTANT: Always respond ONLY with valid JSON. No markdown fences. No extra text.

Response format:
{
  "text": "Your explanation here",
  "fileTree": {                          // include ONLY when generating code files
    "filename.js": {
      "file": {
        "contents": "// full file content here"
      }
    }
  },
  "buildCommand": { "mainItem": "npm", "commands": ["install"] },  // optional
  "startCommand": { "mainItem": "node", "commands": ["app.js"] }   // optional
}

For non-code questions, respond:
{ "text": "Your answer here" }

Rules:
- Never use filenames like routes/index.js
- Always include all imports in generated code
- Always handle async/await errors
`,
});

// ──────────────────────────────────────────────
// Generate a response from Gemini AI
// ──────────────────────────────────────────────
export const generateResult = async (prompt) => {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};