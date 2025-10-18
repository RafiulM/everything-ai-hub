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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Globe, Search, History, Loader2, Copy, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react';

interface WebScrape {
  id: string;
  url: string;
  format: string;
  content: string | null;
  metadata: any;
  status: string;
  cost: string;
  createdAt: string;
  completedAt?: string;
}

export default function WebScraperPage() {
  const [history, setHistory] = useState<WebScrape[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedScrape, setSelectedScrape] = useState<WebScrape | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('markdown');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [url, setUrl] = useState('');

  const formats = [
    { value: 'markdown', label: 'Markdown', description: 'Clean, formatted text content' },
    { value: 'html', label: 'HTML', description: 'Raw HTML content' },
    { value: 'raw', label: 'Raw', description: 'Unprocessed content' },
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/scrape');
      const result = await response.json();
      
      if (result.success) {
        setHistory(result.data || []);
      } else {
        toast.error('Failed to fetch scraping history');
      }
    } catch (error) {
      toast.error('Failed to fetch scraping history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          format: selectedFormat,
          includeMetadata,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Website scraped successfully!');
        setUrl('');
        fetchHistory();
        
        // Select the new scrape for viewing
        setTimeout(() => {
          fetchHistory(); // Fetch again to get the latest record
        }, 1000);
      } else {
        toast.error(result.error || 'Failed to scrape website');
      }
    } catch (error) {
      toast.error('Failed to scrape website');
    } finally {
      setLoading(false);
    }
  };

  const selectScrape = (scrape: WebScrape) => {
    setSelectedScrape(scrape);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary';
    const text = status.charAt(0).toUpperCase() + status.slice(1);
    return <Badge variant={variant}>{text}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="container mx-auto py-8 h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-6">
        {/* Scraper Form */}
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Web Scraper
            </CardTitle>
            <CardDescription>
              Extract content from websites
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="format">Output Format</Label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        <div>
                          <div className="font-medium">{format.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {format.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="metadata"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  disabled={loading}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="metadata" className="text-sm">
                  Include metadata (title, description, etc.)
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !url.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Scrape Website
                  </>
                )}
              </Button>
            </form>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Recent Scrapes</Label>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {history.slice(0, 10).map((item) => {
                    const domain = new URL(item.url).hostname;
                    return (
                      <div
                        key={item.id}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedScrape?.id === item.id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => selectScrape(item)}
                      >
                        <div className="flex items-start gap-2">
                          {getStatusIcon(item.status)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm line-clamp-1">
                              {domain}
                            </div>
                            <div className="text-xs opacity-70">
                              {formatDate(item.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {history.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No websites scraped yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Scraping Results
              </div>
              {selectedScrape && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openUrl(selectedScrape.url)}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedScrape.content || '')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              Website content and metadata
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {!selectedScrape ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Globe className="w-12 h-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a scraped website</h3>
                <p className="text-sm text-center max-w-md">
                  Choose a website from the recent scrapes list or scrape a new URL to view its content
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="space-y-2 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{selectedScrape.url}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getStatusBadge(selectedScrape.status)}
                        <span>{formatDate(selectedScrape.createdAt)}</span>
                        <span>Format: {selectedScrape.format}</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedScrape.metadata && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedScrape.metadata.title && (
                        <div>
                          <span className="font-medium">Title:</span> {selectedScrape.metadata.title}
                        </div>
                      )}
                      {selectedScrape.metadata.description && (
                        <div>
                          <span className="font-medium">Description:</span> {selectedScrape.metadata.description}
                        </div>
                      )}
                      {selectedScrape.metadata.author && (
                        <div>
                          <span className="font-medium">Author:</span> {selectedScrape.metadata.author}
                        </div>
                      )}
                      {selectedScrape.metadata.language && (
                        <div>
                          <span className="font-medium">Language:</span> {selectedScrape.metadata.language}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 mt-4">
                  {selectedScrape.status === 'pending' ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                        <p>Scraping website...</p>
                      </div>
                    </div>
                  ) : selectedScrape.status === 'failed' ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                        <h3 className="text-lg font-medium mb-2">Scraping Failed</h3>
                        <p className="text-muted-foreground max-w-md">
                          {selectedScrape.metadata?.error || 'An error occurred while scraping this website'}
                        </p>
                      </div>
                    </div>
                  ) : selectedScrape.content ? (
                    <ScrollArea className="h-full">
                      <Tabs defaultValue="content" className="h-full">
                        <TabsList>
                          <TabsTrigger value="content">Content</TabsTrigger>
                          <TabsTrigger value="raw">Raw</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="content" className="mt-4">
                          <ScrollArea className="h-96 border rounded p-4">
                            <div className="whitespace-pre-wrap text-sm">
                              {selectedScrape.content}
                            </div>
                          </ScrollArea>
                        </TabsContent>
                        
                        <TabsContent value="raw" className="mt-4">
                          <ScrollArea className="h-96 border rounded p-4">
                            <pre className="text-xs whitespace-pre-wrap">
                              {JSON.stringify(selectedScrape, null, 2)}
                            </pre>
                          </ScrollArea>
                        </TabsContent>
                      </Tabs>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <p>No content available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
