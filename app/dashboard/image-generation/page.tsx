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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Wand2, Download } from "lucide-react";

interface GeneratedImage {
  imageUrl: string;
  prompt: string;
  provider: string;
  costUsd: number | null;
  timestamp: Date;
}

export default function ImageGenerationPage() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("dall-e-3");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, provider, model, size, quality }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      setGeneratedImages([
        {
          imageUrl: data.imageUrl,
          prompt,
          provider,
          costUsd: data.costUsd,
          timestamp: new Date(),
        },
        ...generatedImages,
      ]);
      toast.success("Image generated successfully");
      setPrompt("");
    } catch (error) {
      toast.error("Failed to generate image");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (imageUrl: string, prompt: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const modelsByProvider: Record<string, Array<{ label: string; value: string }>> = {
    openai: [
      { label: "DALL-E 3", value: "dall-e-3" },
      { label: "DALL-E 2", value: "dall-e-2" },
    ],
    "stability-ai": [
      { label: "Stable Diffusion 3", value: "sd3" },
      { label: "Stable Diffusion XL", value: "sd-xl" },
    ],
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Image Generation</h1>
        <p className="text-gray-500">Create images using AI models</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Image</CardTitle>
          <CardDescription>Describe the image you want to create</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="mt-2 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Provider</label>
                <Select value={provider} onValueChange={(value) => {
                  setProvider(value);
                  setModel(modelsByProvider[value]?.[0]?.value || "dall-e-3");
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="stability-ai">Stability AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Model</label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsByProvider[provider]?.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Size</label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024x1024">1024x1024</SelectItem>
                    <SelectItem value="1024x1792">1024x1792 (Portrait)</SelectItem>
                    <SelectItem value="1792x1024">1792x1024 (Landscape)</SelectItem>
                    <SelectItem value="512x512">512x512</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {provider === "openai" && (
                <div>
                  <label className="text-sm font-medium">Quality</label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="hd">HD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              <Wand2 className="mr-2 h-4 w-4" />
              {loading ? "Generating..." : "Generate Image"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {generatedImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedImages.map((img, i) => (
                <div key={i} className="space-y-2">
                  <div className="relative group overflow-hidden rounded-lg border bg-gray-100">
                    <img
                      src={img.imageUrl}
                      alt={img.prompt}
                      className="w-full aspect-square object-cover group-hover:opacity-75"
                    />
                    <Button
                      onClick={() => downloadImage(img.imageUrl, img.prompt)}
                      size="sm"
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{img.prompt}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="capitalize">{img.provider}</span>
                    {img.costUsd && <span>${img.costUsd.toFixed(4)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
