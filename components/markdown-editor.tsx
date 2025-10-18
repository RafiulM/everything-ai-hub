'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, Eye, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then(mod => mod.default),
  { ssr: false }
);

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    language?: string;
    [key: string]: any;
  };
  url: string;
}

export function MarkdownEditor({ content, onChange, metadata, url }: MarkdownEditorProps) {
  const [isEditing, setIsEditing] = useState(true);
  const [localContent, setLocalContent] = useState(content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Debounced content update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localContent !== content) {
        onChange(localContent);
        setHasUnsavedChanges(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localContent, content, onChange]);

  // Update local content when prop changes
  useEffect(() => {
    if (content !== localContent && !hasUnsavedChanges) {
      setLocalContent(content);
    }
  }, [content, localContent, hasUnsavedChanges]);

  const handleContentChange = useCallback((value?: string) => {
    const newContent = value || '';
    setLocalContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(localContent).then(() => {
      toast.success('Content copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy content');
    });
  };

  const downloadAsFile = () => {
    const blob = new Blob([localContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraped-content-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">
              {metadata?.title || getDomainFromUrl(url)}
            </h3>
            {metadata?.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                {metadata.description}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant={!isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(false)}
            >
              <Eye className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Metadata */}
        {metadata && (
          <div className="flex flex-wrap gap-2">
            {metadata.author && (
              <Badge variant="secondary" className="text-xs">
                {metadata.author}
              </Badge>
            )}
            {metadata.language && (
              <Badge variant="outline" className="text-xs">
                {metadata.language}
              </Badge>
            )}
            {hasUnsavedChanges && (
              <Badge variant="destructive" className="text-xs">
                Unsaved changes
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyToClipboard}>
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button size="sm" variant="outline" onClick={downloadAsFile}>
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full" style={{ minHeight: '400px' }}>
          <MDEditor
            value={localContent}
            onChange={handleContentChange}
            preview={isEditing ? 'edit' : 'preview'}
            hideToolbar={!isEditing}
            visibleDragBar={false}
            data-color-mode="auto"
            height="100%"
          />
        </div>
      </div>
    </div>
  );
}