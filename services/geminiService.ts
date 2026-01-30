
import { GoogleGenAI, Type } from "@google/genai";
import { TrainingData } from "../types";

export const processVideoWithGemini = async (
  base64Video: string,
  mimeType: string,
  userMetadata: { title: string; speakerName: string; category: string }
): Promise<TrainingData> => {
  // Get API key from environment variable (exposed via vite.config.ts)
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error('GEMINI_API_KEY is not set. Please add it to your .env.local file. Get your API key from: https://aistudio.google.com/apikey');
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze this video for AI Avatar training and Vector Database (RAG) indexing.
    
    SPECIAL INSTRUCTION FOR MULTI-LINGUAL CONTENT:
    This video may contain multiple languages or code-switching (shifting between languages mid-conversation). 
    1. Provide a verbatim, word-for-word transcript in the ORIGINAL language spoken for every segment. 
    2. Do NOT translate the spoken words; capture them exactly as uttered (e.g., if a speaker says a sentence in English then switches to Spanish, the transcript should reflect that shift exactly).
    3. In the metadata, list all detected languages used in the video.

    CRITICAL REQUIREMENT: 
    Provide a highly granular transcript where each entry is a single sentence or a short phrase. 
    Each entry MUST have an accurate start timestamp (format MM:SS).

    Provided Context:
    - Project Title: ${userMetadata.title}
    - Primary Speaker: ${userMetadata.speakerName}
    - Domain/Category: ${userMetadata.category}

    Please extract:
    1. Metadata:
       - A concise summary optimized for vector search.
       - A set of 10-15 high-relevance keywords/tags.
       - Language(s): Identify all languages used (e.g., "English, Spanish, Mandarin").
    2. Granular Transcript:
       - Timestamp: Accurate start time.
       - Speaker: Identified speaker.
       - Text: Verbatim text in the original language.
       - Tone: Emotional state.
       - Intent: Functional purpose.

    Return the result in JSON format strictly following the schema.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { inlineData: { data: base64Video, mimeType } },
          { text: prompt }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metadata: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              speakerName: { type: Type.STRING },
              category: { type: Type.STRING },
              language: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING }
            },
            required: ["title", "speakerName", "category", "language", "tags", "summary"]
          },
          transcript: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.STRING },
                speaker: { type: Type.STRING },
                text: { type: Type.STRING },
                tone: { type: Type.STRING },
                intent: { type: Type.STRING }
              },
              required: ["timestamp", "speaker", "text", "tone", "intent"]
            }
          }
        },
        required: ["metadata", "transcript"]
      }
    }
  });

  const data = JSON.parse(response.text);
  return data as TrainingData;
};
