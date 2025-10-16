"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Copy } from "lucide-react";

interface ScrapeResult {
  url: string;
  content: string;
  metadata: any;
  links: string[];
  timestamp: Date;
}

export default function WebScraperPage() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("markdown");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ScrapeResult | null>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), format }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to scrape URL");
      }

      const data = await response.json();
      const result: ScrapeResult = {
        url: data.url,
        content: data.content,
        metadata: data.metadata,
        links: data.links || [],
        timestamp: new Date(),
      };

      setResults([result, ...results]);
      setSelectedResult(result);
      toast.success("Page scraped successfully");
      setUrl("");
    } catch (error: any) {
      toast.error(error.message || "Failed to scrape URL");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadContent = (content: string, filename: string) => {
    const element = document.createElement("a");
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute("download", filename || "scraped-content.txt");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Web Scraper</h1>
        <p className="text-gray-500">Extract content from web pages using Firecrawl</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scrape Web Page</CardTitle>
          <CardDescription>Enter a URL to extract its content</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScrape} className="space-y-4">
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="raw">Raw</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Scraping..." : "Scrape Page"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {selectedResult && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle>Scraped Content</CardTitle>
                <CardDescription>{selectedResult.url}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(selectedResult.content)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadContent(
                      selectedResult.content,
                      `${new URL(selectedResult.url).hostname}-scraped.${format}`
                    )
                  }
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="content" className="w-full">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="links">Links ({selectedResult.links?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm font-mono">
                  {selectedResult.content}
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4">
                <pre className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96 text-sm">
                  {JSON.stringify(selectedResult.metadata, null, 2)}
                </pre>
              </TabsContent>

              <TabsContent value="links" className="space-y-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedResult.links?.length > 0 ? (
                    selectedResult.links.map((link, i) => (
                      <div key={i} className="p-2 bg-gray-50 rounded text-sm break-all hover:bg-gray-100">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                          {link}
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No links found</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {results.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.slice(1).map((result, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedResult(result)}
                  className="w-full text-left p-3 border rounded hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium line-clamp-1">{result.url}</p>
                  <p className="text-sm text-gray-500">{result.timestamp.toLocaleString()}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
