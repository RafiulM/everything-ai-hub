"use client";

import { useState } from "react";
import { Download, Globe, Search, Copy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ScrapeResult {
    id: string;
    url: string;
    data: any;
    markdown: string;
    cost: number;
    status: string;
    createdAt: string;
}

export default function WebScraperPage() {
    const [url, setUrl] = useState("");
    const [provider, setProvider] = useState("firecrawl");
    const [includeRawHtml, setIncludeRawHtml] = useState(false);
    const [onlyMainContent, setOnlyMainContent] = useState(true);
    const [selectedFormats, setSelectedFormats] = useState<string[]>(["markdown"]);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapeResults, setScrapeResults] = useState<ScrapeResult[]>([]);

    const formatOptions = [
        { id: "markdown", label: "Markdown", description: "Simplified text content" },
        { id: "html", label: "HTML", description: "Raw HTML content" },
        { id: "raw", label: "Raw", description: "Unprocessed content" },
        { id: "screenshot", label: "Screenshot", description: "Page screenshot" },
    ];

    const handleScrape = async () => {
        if (!url.trim()) {
            toast.error("Please enter a URL");
            return;
        }

        // Validate URL format
        try {
            new URL(url);
        } catch {
            toast.error("Please enter a valid URL");
            return;
        }

        setIsScraping(true);
        
        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url.trim(),
                    provider,
                    options: {
                        includeRawHtml,
                        onlyMainContent,
                        formats: selectedFormats,
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to scrape website');
            }

            const result = await response.json();
            
            const newResult: ScrapeResult = {
                id: result.id,
                url: result.url,
                data: result.data,
                markdown: result.markdown,
                cost: result.cost,
                status: 'completed',
                createdAt: new Date().toISOString(),
            };

            setScrapeResults(prev => [newResult, ...prev]);
            toast.success(`Website scraped successfully! Cost: $${result.cost.toFixed(4)}`);

        } catch (error: any) {
            toast.error(error.message || 'Failed to scrape website');
        } finally {
            setIsScraping(false);
        }
    };

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${type} copied to clipboard`);
    };

    const downloadContent = (content: string, filename: string, type: 'markdown' | 'json' | 'txt') => {
        const mimeTypes = {
            markdown: 'text/markdown',
            json: 'application/json',
            txt: 'text/plain',
        };
        
        const blob = new Blob([content], { type: mimeTypes[type] });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Content downloaded successfully");
    };

    const extractMetadata = (data: any) => {
        if (!data) return {};
        
        return {
            title: data.title || '',
            description: data.description || '',
            language: data.language || '',
            url: data.url || '',
            timestamp: data.timestamp || '',
        };
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center gap-2 mb-6">
                <Globe className="h-6 w-6" />
                <h1 className="text-3xl font-bold">Web Scraper</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scraper Panel */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Scrape Website</CardTitle>
                            <CardDescription>
                                Extract content from web pages using Firecrawl API
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="url">Website URL</Label>
                                <Input
                                    id="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="provider">Provider</Label>
                                    <Select value={provider} onValueChange={setProvider}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="firecrawl">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                                    Firecrawl
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label>Output Formats</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {formatOptions.map((format) => (
                                        <div key={format.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={format.id}
                                                checked={selectedFormats.includes(format.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedFormats(prev => [...prev, format.id]);
                                                    } else {
                                                        setSelectedFormats(prev => prev.filter(f => f !== format.id));
                                                    }
                                                }}
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <Label
                                                    htmlFor={format.id}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {format.label}
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    {format.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="onlyMainContent"
                                        checked={onlyMainContent}
                                        onCheckedChange={(checked) => setOnlyMainContent(checked as boolean)}
                                    />
                                    <Label htmlFor="onlyMainContent" className="text-sm">
                                        Extract only main content (skip navigation, ads, etc.)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="includeRawHtml"
                                        checked={includeRawHtml}
                                        onCheckedChange={(checked) => setIncludeRawHtml(checked as boolean)}
                                    />
                                    <Label htmlFor="includeRawHtml" className="text-sm">
                                        Include raw HTML in results
                                    </Label>
                                </div>
                            </div>

                            <Button 
                                onClick={handleScrape} 
                                disabled={isScraping || !url.trim()}
                                className="w-full"
                            >
                                {isScraping ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Scraping...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-4 w-4 mr-2" />
                                        Scrape Website
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Scrape Results */}
                    {scrapeResults.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Scrape Results</CardTitle>
                                <CardDescription>
                                    Recently scraped websites
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {scrapeResults.map((result) => (
                                        <div key={result.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="font-medium">{result.url}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-xs">
                                                            Firecrawl
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">${result.cost.toFixed(4)}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(result.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => downloadContent(result.markdown, `scraped-${result.id}.md`, 'markdown')}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <Tabs defaultValue="markdown" className="w-full">
                                                <TabsList className="grid w-full grid-cols-3">
                                                    <TabsTrigger value="markdown">Markdown</TabsTrigger>
                                                    <TabsTrigger value="metadata">Metadata</TabsTrigger>
                                                    <TabsTrigger value="raw">Raw</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="markdown" className="mt-2">
                                                    <div className="relative">
                                                        <ScrollArea className="h-64 w-full border rounded-md p-3">
                                                            <pre className="text-sm whitespace-pre-wrap">
                                                                {result.markdown || 'No markdown content available'}
                                                            </pre>
                                                        </ScrollArea>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="absolute top-2 right-2"
                                                            onClick={() => copyToClipboard(result.markdown, 'Markdown')}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TabsContent>
                                                <TabsContent value="metadata" className="mt-2">
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        {Object.entries(extractMetadata(result.data)).map(([key, value]) => (
                                                            <div key={key} className="col-span-2">
                                                                <Label className="font-medium capitalize">{key}:</Label>
                                                                <p className="text-muted-foreground mt-1">{value || 'Not available'}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TabsContent>
                                                <TabsContent value="raw" className="mt-2">
                                                    <div className="relative">
                                                        <ScrollArea className="h-64 w-full border rounded-md p-3">
                                                            <pre className="text-xs whitespace-pre-wrap">
                                                                {JSON.stringify(result.data, null, 2)}
                                                            </pre>
                                                        </ScrollArea>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="absolute top-2 right-2"
                                                            onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2), 'Raw Data')}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TabsContent>
                                            </Tabs>
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
                            <CardTitle>Tips for Better Scraping</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Use HTTPS</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Always use secure URLs for better compatibility and results.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Be Specific</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Direct links to specific pages or articles work better than homepages.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Check Permissions</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Ensure you have permission to scrape the target website.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Rate Limiting</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Space out your requests to avoid overwhelming target servers.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Data Usage</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Web scraping costs are based on page size and complexity.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Usage Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Total Scrapes:</span>
                                    <Badge variant="secondary">{scrapeResults.length}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Total Cost:</span>
                                    <Badge variant="secondary">
                                        ${scrapeResults.reduce((sum, result) => sum + result.cost, 0).toFixed(4)}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Provider:</span>
                                    <Badge variant="outline">Firecrawl</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}