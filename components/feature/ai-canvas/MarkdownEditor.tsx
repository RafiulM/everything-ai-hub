'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Download } from 'lucide-react';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function MarkdownEditor({ content, onChange }: MarkdownEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromStream = useRef(false);

  // Update local content when content prop changes (from AI streaming)
  useEffect(() => {
    if (content !== localContent) {
      isUpdatingFromStream.current = true;
      setLocalContent(content);
      // Reset the flag after a short delay to allow user typing to resume
      setTimeout(() => {
        isUpdatingFromStream.current = false;
      }, 100);
    }
  }, [content, localContent]);

  const handleContentChange = useCallback((val?: string) => {
    if (!isUpdatingFromStream.current && val !== undefined) {
      setLocalContent(val);
      onChange(val);
    }
  }, [onChange]);

  const handleDownload = () => {
    const blob = new Blob([localContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const togglePreviewMode = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Markdown Editor
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePreviewMode}
            >
              <Eye className="w-4 h-4" />
              {isPreviewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 overflow-hidden">
        <div className="h-full" ref={editorRef}>
          <MDEditor
            value={localContent}
            onChange={handleContentChange}
            preview={isPreviewMode ? 'preview' : 'edit'}
            hideToolbar={isPreviewMode}
            visibleDragBar={false}
            textareaProps={{
              placeholder: 'Start writing your markdown document here...',
              style: {
                fontSize: 14,
                lineHeight: 1.5,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", monospace',
              }
            }}
            height="100%"
            style={{
              backgroundColor: 'transparent',
            }}
            data-color-mode="auto"
          />
        </div>
      </CardContent>
    </Card>
  );
}