import Groq from "groq-sdk";
import { Question } from "../types/database";

// Initialize Groq client with the API key from environment variables
// Note: In a real production app, this should ideally be called from a backend Edge Function to protect the key.
// Since the key is explicitly requested to be used here on the client-side Admin Panel, we expose it via VITE_.
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true, // Required to run Groq SDK in the browser
});

// The user prefers the best free model without expiration. 
// LLaMA 3 70B is incredibly powerful and fast for JSON extraction.
const MODEL = "llama3-70b-8192";

export interface ExtractedQuestion {
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
  year: number | null;
  topic: string; // Smart Topic Detection
}

/**
 * Extracts structured questions from raw unstructured text (e.g. from PDFs, DOCX, or copy-paste).
 * It instructs the AI to return a strict JSON array.
 */
export async function extractQuestionsFromText(rawText: string): Promise<ExtractedQuestion[]> {
  const prompt = `
You are an expert educational AI assistant. Your task is to extract multiple-choice questions from the provided raw text.
The raw text might be messy, copied from a PDF, or poorly formatted.

Extract each question into a strict JSON array of objects. Each object MUST have the following keys exactly:
- "text": The main question text. (string)
- "option_a": First option. (string)
- "option_b": Second option. (string)
- "option_c": Third option. (string)
- "option_d": Fourth option. (string)
- "correct_answer": The correct option letter, MUST be strictly one of: "A", "B", "C", or "D". (string)
- "explanation": A brief, helpful explanation of why the answer is correct. (string)
- "year": The year of the past question if mentioned in the text (number), otherwise null.
- "topic": Smart Topic Detection - detect the specific academic topic (e.g., "Organic Chemistry", "Calculus", "Lexis and Structure") the question belongs to. (string)

Rules:
1. ONLY output valid JSON. Do not include markdown blocks like \`\`\`json. Output the raw array starting with [ and ending with ].
2. Ensure options do NOT contain the letter prefix (e.g. instead of "A. Apple", just output "Apple").
3. If the correct answer is not explicitly stated in the text, intelligently figure it out based on your vast knowledge.

Raw Text to process:
-------------------
${rawText}
-------------------
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a JSON-only extraction bot. You output nothing but valid, parseable JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: MODEL,
      temperature: 0.1, // Low temperature for highly deterministic output
      response_format: { type: "json_object" } // Ensure JSON output (Note: some Groq models require specific prompt tuning for this)
    });

    let content = chatCompletion.choices[0]?.message?.content || "[]";
    
    // Sometimes the AI might wrap it in a root object if we forced json_object, 
    // let's try to parse and extract the array
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Clean up potential markdown formatting just in case
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(content);
    }

    // If the AI returned { "questions": [...] }, extract the array
    if (parsed && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed);
      for (const key of keys) {
        if (Array.isArray(parsed[key])) {
          return parsed[key] as ExtractedQuestion[];
        }
      }
      return []; // Failed to find array
    }

    return parsed as ExtractedQuestion[];

  } catch (error) {
    console.error("Error extracting questions via Groq AI:", error);
    throw new Error("Failed to extract questions. Please check your API key and try again.");
  }
}

/**
 * Generates a personalized 2-paragraph summary of exam performance.
 */
export async function getAIExamSummary(params: {
  subjectName: string;
  scorePercentage: number;
  correctCount: number;
  totalCount: number;
  weakTopics: string[];
  strongTopics: string[];
}): Promise<string> {
  const prompt = `
You are a supportive and highly intelligent UTME/JAMB/Post-UTME prep tutor.
The student has just completed a mock exam for ${params.subjectName}.
Their score was ${params.scorePercentage}% (${params.correctCount} out of ${params.totalCount} correct).
Their strong topics are: ${params.strongTopics.join(", ") || "None identified yet"}.
Their weak topics are: ${params.weakTopics.join(", ") || "None identified yet"}.

Write a personalized, encouraging 2-paragraph summary of their performance.
In the first paragraph, praise their effort and highlight their overall score and strong areas.
In the second paragraph, gently point out their weak topics and give actionable advice on how to improve.
Keep the tone professional, friendly, and motivating. DO NOT use Markdown bolding/headings, just plain text.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an encouraging educational tutor."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: MODEL,
      temperature: 0.7,
    });

    return chatCompletion.choices[0]?.message?.content?.trim() || "Great effort on your exam! Keep practicing to improve your scores.";
  } catch (error) {
    console.error("Error generating exam summary via Groq AI:", error);
    throw new Error("Failed to generate AI summary.");
  }
}

