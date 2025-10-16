import { getSession } from "@/lib/auth";
import { getApiKeyForProvider } from "@/app/actions/api-keys";
import { logWebScrape } from "@/app/actions/ai-services";
import FirecrawlApp from "firecrawl";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { url, format } = await request.json();

    if (!url) {
      return new Response("Missing URL", { status: 400 });
    }

    let apiKey = await getApiKeyForProvider("firecrawl");

    if (!apiKey) {
      apiKey = process.env.FIRECRAWL_API_KEY;
    }

    if (!apiKey) {
      return new Response("Firecrawl API key not configured", { status: 400 });
    }

    const app = new FirecrawlApp({ apiKey });

    try {
      const scrapeResult = await app.scrapeUrl(url, {
        formats: [format || "markdown"],
      });

      if (!scrapeResult.success) {
        return new Response(JSON.stringify({ error: "Failed to scrape URL" }), {
          status: 400,
        });
      }

      // Log the scrape
      await logWebScrape(url, "firecrawl", format || "markdown", scrapeResult.markdown || "", {
        links: scrapeResult.links,
        metadata: scrapeResult.metadata,
      }, null);

      return new Response(
        JSON.stringify({
          success: true,
          url,
          content: scrapeResult.markdown,
          metadata: scrapeResult.metadata,
          links: scrapeResult.links,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      console.error("Firecrawl error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Scraping failed" }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Scrape API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
