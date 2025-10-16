import { getSession } from "@/lib/auth";
import { getApiKeyForProvider } from "@/app/actions/api-keys";
import { logImageGeneration } from "@/app/actions/ai-services";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { prompt, provider, model, size, style, quality } = await request.json();

    if (!prompt || !provider || !model) {
      return new Response("Missing required fields", { status: 400 });
    }

    let apiKey = await getApiKeyForProvider(provider);

    if (!apiKey) {
      if (provider === "openai") {
        apiKey = process.env.OPENAI_API_KEY;
      } else if (provider === "stability-ai") {
        apiKey = process.env.STABILITY_AI_API_KEY;
      }
    }

    if (!apiKey) {
      return new Response(`API key not configured for ${provider}`, { status: 400 });
    }

    let imageUrl: string;
    let costUsd: number | null = null;

    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          model,
          size: size || "1024x1024",
          quality: quality || "standard",
          n: 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return new Response(JSON.stringify(error), { status: response.status });
      }

      const data = await response.json();
      imageUrl = data.data[0].url;
      
      // Pricing for OpenAI DALL-E 3
      if (model === "dall-e-3") {
        costUsd = quality === "hd" ? 0.08 : 0.04;
      }
    } else if (provider === "stability-ai") {
      const response = await fetch(
        "https://api.stability.ai/v1/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            prompt,
            model_id: model,
            steps: 30,
            cfg_scale: 7.0,
            width: parseInt(size?.split("x")[0] || "1024"),
            height: parseInt(size?.split("x")[1] || "1024"),
            samples: 1,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return new Response(JSON.stringify(error), { status: response.status });
      }

      const data = await response.json();
      imageUrl = `data:image/png;base64,${data.artifacts[0].base64}`;
      costUsd = 0.015; // Approximate cost
    } else {
      return new Response(`Unsupported provider: ${provider}`, { status: 400 });
    }

    // Log the generation
    await logImageGeneration(
      prompt,
      provider,
      model,
      imageUrl,
      size || "1024x1024",
      style || null,
      costUsd
    );

    return new Response(JSON.stringify({ imageUrl, costUsd }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
