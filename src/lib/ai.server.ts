import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export async function generate(instructions: string, prompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: instructions,
    prompt,
    onError: ({ error }) => {
      failure = error;
    },
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  if (failure || !text) {
    const status = (failure as { statusCode?: number })?.statusCode;
    if (status === 429) throw new Error("Too many requests right now. Please wait a moment and try again.");
    if (status === 402) throw new Error("AI credits have run out. Add credits in your workspace to continue.");
    if (status === 403) throw new Error("AI access is blocked for this workspace.");
    throw new Error("The AI couldn't produce a result. Please try again.");
  }
  return text;
}
