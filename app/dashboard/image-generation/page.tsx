"use client";

import { useState } from "react";
import { Download, Image as ImageIcon, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface GeneratedImage {
    id: string;
    prompt: string;
    negativePrompt?: string;
    provider: string;
    model: string;
    imageUrl: string;
    cost: number;
    status: string;
    createdAt: string;
}

const imageModels = {
    openai: [
        { id: "dall-e-3", name: "DALL-E 3", description: "Best quality, higher cost", maxPixels: 1024 * 1024 },
        { id: "dall-e-2", name: "DALL-E 2", description: "Good quality, lower cost", maxPixels: 1024 * 1024 },
    ],
    stability: [
        { id: "stable-diffusion-xl", name: "Stable Diffusion XL", description: "High quality open source", maxPixels: 1024 * 1024 },
        { id: "stable-diffusion-v2-1", name: "Stable Diffusion v2.1", description: "Balanced quality", maxPixels: 768 * 768 },
    ],
};

const imageSizes = [
    { label: "Square (1024x1024)", width: 1024, height: 1024 },
    { label: "Portrait (1024x1792)", width: 1024, height: 1792 },
    { label: "Landscape (1792x1024)", width: 1792, height: 1024 },
];

const styles = [
    { id: "vivid", name: "Vivid", description: "More creative and expressive" },
    { id: "natural", name: "Natural", description: "More realistic and grounded" },
];

export default function ImageGenerationPage() {
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [selectedProvider, setSelectedProvider] = useState("openai");
    const [selectedModel, setSelectedModel] = useState("dall-e-3");
    const [selectedSize, setSelectedSize] = useState(imageSizes[0]);
    const [selectedStyle, setSelectedStyle] = useState("vivid");
    const [steps, setSteps] = useState([20]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }

        setIsGenerating(true);
        
        try {
            const response = await fetch('/api/image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    negativePrompt: negativePrompt.trim() || undefined,
                    provider: selectedProvider,
                    model: selectedModel,
                    width: selectedSize.width,
                    height: selectedSize.height,
                    steps: steps[0],
                    style: selectedStyle,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate image');
            }

            const result = await response.json();
            
            const newImage: GeneratedImage = {
                id: result.id,
                prompt,
                negativePrompt,
                provider: selectedProvider,
                model: selectedModel,
                imageUrl: result.imageUrl,
                cost: result.cost,
                status: 'completed',
                createdAt: new Date().toISOString(),
            };

            setGeneratedImages(prev => [newImage, ...prev]);
            toast.success(`Image generated successfully! Cost: $${result.cost.toFixed(4)}`);

        } catch (error: any) {
            toast.error(error.message || 'Failed to generate image');
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadImage = async (imageUrl: string, filename: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("Image downloaded successfully");
        } catch (error) {
            toast.error("Failed to download image");
        }
    };

    const getProviderInfo = (provider: string) => {
        const info = {
            openai: { name: "OpenAI", color: "bg-green-500" },
            stability: { name: "Stability AI", color: "bg-purple-500" },
        };
        return info[provider as keyof typeof info] || { name: provider, color: "bg-gray-500" };
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center gap-2 mb-6">
                <ImageIcon className="h-6 w-6" />
                <h1 className="text-3xl font-bold">Image Generation</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Generation Panel */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create Image</CardTitle>
                            <CardDescription>
                                Generate images using AI models like DALL-E and Stable Diffusion
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="prompt">Prompt</Label>
                                <Textarea
                                    id="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="A serene landscape with mountains and a lake at sunset..."
                                    className="min-h-[100px]"
                                />
                            </div>

                            <div>
                                <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
                                <Textarea
                                    id="negativePrompt"
                                    value={negativePrompt}
                                    onChange={(e) => setNegativePrompt(e.target.value)}
                                    placeholder="text, watermark, signature, blurry..."
                                    className="min-h-[60px]"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="provider">Provider</Label>
                                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="openai">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                                    OpenAI
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="stability">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                                                    Stability AI
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="model">Model</Label>
                                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {imageModels[selectedProvider as keyof typeof imageModels]?.map((model) => (
                                                <SelectItem key={model.id} value={model.id}>
                                                    <div>
                                                        <div className="font-medium">{model.name}</div>
                                                        <div className="text-sm text-muted-foreground">{model.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="size">Size</Label>
                                    <Select value={`${selectedSize.width}x${selectedSize.height}`} onValueChange={(value) => {
                                        const size = imageSizes.find(s => `${s.width}x${s.height}` === value);
                                        if (size) setSelectedSize(size);
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select size" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {imageSizes.map((size) => (
                                                <SelectItem key={`${size.width}x${size.height}`} value={`${size.width}x${size.height}`}>
                                                    {size.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="style">Style</Label>
                                    <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select style" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {styles.map((style) => (
                                                <SelectItem key={style.id} value={style.id}>
                                                    <div>
                                                        <div className="font-medium">{style.name}</div>
                                                        <div className="text-sm text-muted-foreground">{style.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Advanced Settings */}
                            <div>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full"
                                >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Advanced Settings
                                </Button>
                                
                                {showAdvanced && (
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <Label htmlFor="steps">Steps: {steps[0]}</Label>
                                            <Slider
                                                id="steps"
                                                min={10}
                                                max={50}
                                                step={1}
                                                value={steps}
                                                onValueChange={setSteps}
                                                className="mt-2"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button 
                                onClick={handleGenerate} 
                                disabled={isGenerating || !prompt.trim()}
                                className="w-full"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Generate Image
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Generated Images Gallery */}
                    {generatedImages.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Generated Images</CardTitle>
                                <CardDescription>
                                    Your recently generated images
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {generatedImages.map((image) => (
                                        <div key={image.id} className="relative group">
                                            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                                                <img
                                                    src={image.imageUrl}
                                                    alt={image.prompt}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => downloadImage(image.imageUrl, `generated-image-${image.id}.png`)}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="mt-2">
                                                <p className="text-sm font-medium truncate">{image.prompt}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {getProviderInfo(image.provider).name}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">${image.cost.toFixed(4)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar with Tips */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tips for Better Images</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Be Specific</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Include details about style, mood, lighting, and composition for better results.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Use References</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Mention artists, styles, or time periods to influence the output.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Negative Prompts</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Specify what you don't want to see (text, watermarks, people, etc.).
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Iterate</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Don't hesitate to refine your prompt and try multiple variations.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}