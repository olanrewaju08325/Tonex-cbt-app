export async function getAIExplanation(params: {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  userAnswer?: string | null;
  registryExplanation?: string | null;
}): Promise<{ success: boolean; text?: string; comingSoon?: boolean; message?: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      comingSoon: true,
      message: "AI Study Assistant is coming soon! Please check back later."
    };
  }

  try {
    const prompt = `You are a supportive and highly intelligent UTME/JAMB/Post-UTME prep tutor.
Explain the following examination question in a clear, easy-to-understand step-by-step manner. Keep your explanation focused, pedagogical, and encouraging.

[Question]
${params.questionText}

[Options]
A: ${params.optionA}
B: ${params.optionB}
C: ${params.optionC}
D: ${params.optionD}

Correct Answer: Option ${params.correctAnswer}
User's Selection: ${params.userAnswer ? `Option ${params.userAnswer}` : "Skipped/No response"}
${params.registryExplanation ? `Hint/Registry Explanation: ${params.registryExplanation}` : ""}

Please write a structured explanation in Markdown. Avoid overly complex jargon and explain the underlying formulas, rules, or core concepts clearly.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error("Empty response received from AI model.");
    }

    return {
      success: true,
      text: generatedText,
    };
  } catch (err: any) {
    console.error("AI explanation error:", err);
    return {
      success: false,
      message: err.message || "Failed to generate AI explanation. Please try again.",
    };
  }
}
