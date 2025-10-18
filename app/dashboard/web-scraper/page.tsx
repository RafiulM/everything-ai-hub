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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { MarkdownEditor } from '@/components/markdown-editor';
import { ChatInterface } from '@/components/chat-interface';
import { toast } from 'sonner';
import { Globe, Search, History, Loader2, Copy, ExternalLink, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

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
  const [markdownContent, setMarkdownContent] = useState('');
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentSyncStatus, setContentSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

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

  // Constants for content management
  const MAX_CONTEXT_LENGTH = 50000; // Max characters for AI context
  const CONTENT_WARNING_LENGTH = 30000; // Show warning at this length

  const selectScrape = (scrape: WebScrape) => {
    setIsContentLoading(true);
    setContentSyncStatus('syncing');
    
    setSelectedScrape(scrape);
    
    // Process content with a slight delay to show loading state
    setTimeout(() => {
      try {
        if (scrape.content) {
          if (scrape.format === 'markdown') {
            setMarkdownContent(scrape.content);
          } else {
            // Convert other formats to markdown for editing
            const convertedContent = `# Content from ${scrape.url}\n\n` +
              (scrape.format === 'html' 
                ? `\`\`\`html\n${scrape.content}\n\`\`\`` 
                : `\`\`\`\n${scrape.content}\n\`\`\``);
            setMarkdownContent(convertedContent);
          }
        } else {
          setMarkdownContent('# No content available\n\nThe selected scrape does not contain any content.');
        }
        setContentSyncStatus('synced');
      } catch (error) {
        console.error('Error processing content:', error);
        setContentSyncStatus('error');
        toast.error('Error loading content');
      } finally {
        setIsContentLoading(false);
      }
    }, 300);
  };

  // Handle markdown content changes with sync status
  const handleMarkdownChange = (content: string) => {
    setContentSyncStatus('syncing');
    setMarkdownContent(content);
    
    // Show notification if content is very large
    if (content.length > MAX_CONTEXT_LENGTH && markdownContent.length <= MAX_CONTEXT_LENGTH) {
      toast.info('Content is very large - AI context will be truncated for performance');
    }
    
    // Debounced sync status update
    setTimeout(() => {
      setContentSyncStatus('synced');
    }, 500);
  };

  // Get truncated content for AI context
  const getTruncatedContext = (content: string): string => {
    if (content.length <= MAX_CONTEXT_LENGTH) {
      return content;
    }
    
    const truncated = content.substring(0, MAX_CONTEXT_LENGTH);
    return truncated + '\n\n[Content truncated - original length: ' + content.length + ' characters]';
  };

  // Check if content is large
  const isLargeContent = markdownContent.length > CONTENT_WARNING_LENGTH;

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
        <Card className="w-80">
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

        {/* Main Content - Split Panel */}
        <div className="flex-1">
          {!selectedScrape ? (
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Web Scraper with AI Chat
                </CardTitle>
                <CardDescription>
                  Select a scraped website to edit its content and chat with AI
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Globe className="w-12 h-12 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a scraped website</h3>
                  <p className="text-sm text-center max-w-md">
                    Choose a website from the recent scrapes list or scrape a new URL to view its content
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : selectedScrape.status === 'pending' ? (
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </CardTitle>
                <CardDescription>
                  Scraping website content
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p>Scraping website...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedScrape.status === 'failed' ? (
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  Scraping Failed
                </CardTitle>
                <CardDescription>
                  Unable to scrape the selected website
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <h3 className="text-lg font-medium mb-2">Scraping Failed</h3>
                    <p className="text-muted-foreground max-w-md">
                      {selectedScrape.metadata?.error || 'An error occurred while scraping this website'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Panel - Markdown Editor */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Globe className="w-5 h-5" />
                          Markdown Editor
                        </CardTitle>
                        <CardDescription>
                          Edit the scraped content
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUrl(selectedScrape.url)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open Source
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    <MarkdownEditor 
                      content={markdownContent}
                      onChange={handleMarkdownChange}
                      metadata={selectedScrape.metadata}
                      url={selectedScrape.url}
                    />
                  </CardContent>
                </Card>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              {/* Right Panel - Chat Interface */}
              <ResizablePanel defaultSize={50} minSize={30}>
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      AI Chat
                      {contentSyncStatus === 'syncing' && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      Chat with AI about the scraped content
                      {isLargeContent && (
                        <Badge variant="outline" className="text-xs">
                          Large content - {markdownContent.length > MAX_CONTEXT_LENGTH ? 'Truncated' : 'Full'} context
                        </Badge>
                      )}
                      {contentSyncStatus === 'synced' && markdownContent && (
                        <Badge variant="secondary" className="text-xs">
                          {markdownContent.length.toLocaleString()} chars
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    {isContentLoading ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                          <p className="text-sm">Loading content...</p>
                        </div>
                      </div>
                    ) : contentSyncStatus === 'error' ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                          <p className="text-sm">Error loading content</p>
                        </div>
                      </div>
                    ) : (
                      <ChatInterface 
                        context={getTruncatedContext(markdownContent)} 
                        contextTitle="Scraped Content"
                        showModelSelector={true}
                        showSettings={true}
                        defaultSystemPrompt="You are a helpful AI assistant. You have been provided with scraped web content. Please answer questions about this content and help analyze or explain it."
                      />
                    )}
                  </CardContent>
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>
    </div>
  );
}

