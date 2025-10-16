'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Download, Image as ImageIcon, Wand2, History, Settings, Loader2, Copy, Trash2 } from 'lucide-react';

// Available image generation models
const MODELS = [
  {
    provider: 'openai',
    id: 'dall-e-3',
    name: 'DALL-E 3',
    description: 'High quality images with detailed understanding',
    supportedSizes: ['1024x1024', '1792x1024', '1024x1792'],
    supportedQualities: ['standard', 'hd'],
    supportedStyles: ['vivid', 'natural'],
    cost: 0.04,
  },
  {
    provider: 'openai',
    id: 'dall-e-2',
    name: 'DALL-E 2',
    description: 'Fast and cost-effective image generation',
    supportedSizes: ['256x256', '512x512', '1024x1024'],
    supportedQualities: ['standard'],
    supportedStyles: [],
    cost: 0.018,
  },
  {
    provider: 'stability',
    id: 'stable-diffusion-xl',
    name: 'Stable Diffusion XL',
    description: 'Open source high-quality image generation',
    supportedSizes: ['512x512', '768x768', '1024x1024', '1152x896', '896x1152'],
    supportedQualities: ['standard'],
    supportedStyles: [],
    cost: 0.02,
  },
];

interface ImageGeneration {
  id: string;
  prompt: string;
  provider: string;
  model: string;
  size: string;
  quality?: string;
  style?: string;
  imageUrl: string | null;
  status: string;
  cost: string;
  createdAt: string;
  completedAt?: string;
}

export default function ImageGenerationPage() {
  const [history, setHistory] = useState<ImageGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedModel, setSelectedModel] = useState('dall-e-3');
  const [formData, setFormData] = useState({
    prompt: '',
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid',
    n: 1,
  });

  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    // Reset form when model changes
    const model = MODELS.find(m => m.id === selectedModel);
    if (model) {
      setFormData(prev => ({
        ...prev,
        size: model.supportedSizes[0],
        quality: model.supportedQualities[0] || 'standard',
        style: model.supportedStyles[0] || 'vivid',
      }));
    }
  }, [selectedModel]);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/image');
      const result = await response.json();
      
      if (result.success) {
        setHistory(result.data || []);
      } else {
        toast.error('Failed to fetch image history');
      }
    } catch (error) {
      toast.error('Failed to fetch image history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          provider: currentModel.provider,
          model: selectedModel,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Image generated successfully!');
        setFormData(prev => ({ ...prev, prompt: '' }));
        fetchHistory();
      } else {
        toast.error(result.error || 'Failed to generate image');
      }
    } catch (error) {
      toast.error('Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Image downloaded successfully');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const formatCost = (cost: string) => {
    return `$${parseFloat(cost).toFixed(4)}`;
  };

  return (
    <div className="container mx-auto py-8 h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-6">
        {/* Generation Form */}
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Image Generation
            </CardTitle>
            <CardDescription>
              Create images with AI models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Describe the image you want to generate..."
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="model">Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {model.description} • {formatCost(model.cost.toString())}/image
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="size">Size</Label>
                <Select 
                  value={formData.size} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentModel.supportedSizes.map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentModel.supportedQualities.length > 0 && (
                <div>
                  <Label htmlFor="quality">Quality</Label>
                  <Select 
                    value={formData.quality} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, quality: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentModel.supportedQualities.map((quality) => (
                        <SelectItem key={quality} value={quality}>
                          {quality.charAt(0).toUpperCase() + quality.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {currentModel.supportedStyles.length > 0 && (
                <div>
                  <Label htmlFor="style">Style</Label>
                  <Select 
                    value={formData.style} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, style: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentModel.supportedStyles.map((style) => (
                        <SelectItem key={style} value={style}>
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !formData.prompt.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Generation History
            </CardTitle>
            <CardDescription>
              Your previously generated images
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-full">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-lg">Loading history...</div>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No images generated yet</h3>
                  <p className="text-sm text-center max-w-md">
                    Create your first AI-generated image using the form on the left
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.map((item) => {
                    const model = MODELS.find(m => m.id === item.model);
                    
                    return (
                      <Card key={item.id} className="overflow-hidden">
                        <div className="aspect-square bg-muted flex items-center justify-center relative">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.prompt}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-4">
                              {item.status === 'pending' ? (
                                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                              ) : (
                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              )}
                              <p className="text-sm">
                                {item.status === 'pending' ? 'Generating...' : 'Failed'}
                              </p>
                            </div>
                          )}
                          
                          {item.imageUrl && (
                            <div className="absolute top-2 right-2 flex gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => downloadImage(item.imageUrl!, `${item.id}.png`)}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <CardContent className="p-3 space-y-2">
                          <div className="text-sm">
                            <p className="font-medium line-clamp-2">{item.prompt}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {model && (
                              <Badge variant="outline" className="text-xs">
                                {model.name}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {item.size}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {formatCost(item.cost)}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(item.prompt)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
