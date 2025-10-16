import { streamText } from "ai";
import { getSession } from "@/lib/auth";
import { getApiKeyForProvider } from "@/app/actions/api-keys";
import { logUsageAnalytics, saveChatMessage } from "@/app/actions/chat";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

interface MessageParam {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, model, sessionId, systemPrompt } = await request.json();

    if (!messages || !model) {
      return new Response("Missing messages or model", { status: 400 });
    }

    // Determine provider from model name
    let provider = "openai";
    let modelName = model;

    if (model.includes("claude")) {
      provider = "anthropic";
    } else if (model.includes("gemini")) {
      provider = "google";
    }

    // Get user's API key
    let apiKey = await getApiKeyForProvider(provider);

    // Fallback to environment variable keys
    if (!apiKey) {
      if (provider === "openai") {
        apiKey = process.env.OPENAI_API_KEY;
      } else if (provider === "anthropic") {
        apiKey = process.env.ANTHROPIC_API_KEY;
      }
    }

    if (!apiKey) {
      return new Response(`API key not configured for ${provider}`, { status: 400 });
    }

    let selectedModel: any;

    if (provider === "openai") {
      const openai = createOpenAI({ apiKey });
      selectedModel = openai(model);
    } else if (provider === "anthropic") {
      const anthropic = createAnthropic({ apiKey });
      selectedModel = anthropic(model);
    } else {
      return new Response(`Unsupported provider: ${provider}`, { status: 400 });
    }

    const result = streamText({
      model: selectedModel,
      system: systemPrompt || "You are a helpful assistant.",
      messages: messages as MessageParam[],
    });

    // Log analytics in background
    (async () => {
      try {
        // Estimate tokens (rough approximation)
        const estimatedTokens = messages.reduce(
          (sum: number, msg: MessageParam) => sum + Math.ceil(msg.content.length / 4),
          0
        );

        await logUsageAnalytics("chat", provider, model, estimatedTokens, null);
      } catch (error) {
        console.error("Error logging analytics:", error);
      }
    })();

    // Return proper streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
