function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  };
}

function extractTextFromChoice(choice) {
  const content = choice?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => item?.text || "")
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

async function generateJsonWithOpenAI({ systemPrompt, userPrompt, temperature = 0.4 }) {
  const cfg = getOpenAIConfig();
  if (!cfg) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`OpenAI error ${response.status}`);
    error.status = response.status;
    error.details = details;
    throw error;
  }

  const data = await response.json();
  const text = extractTextFromChoice(data?.choices?.[0]);
  if (!text) {
    throw new Error("OpenAI returned empty content");
  }

  return JSON.parse(text);
}

module.exports = {
  getOpenAIConfig,
  generateJsonWithOpenAI,
};
