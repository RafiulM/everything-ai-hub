'use client';

import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { MarkdownEditor } from './MarkdownEditor';
import { AIChatPanel } from './AIChatPanel';

interface AICanvasLayoutProps {}

export function AICanvasLayout({}: AICanvasLayoutProps) {
  const [markdownContent, setMarkdownContent] = useState('# Welcome to AI Canvas\n\nStart creating your document with AI assistance!');

  const handleContentUpdate = (newContent: string) => {
    setMarkdownContent(newContent);
  };

  const handleStreamContent = (streamedContent: string) => {
    setMarkdownContent(prev => prev + streamedContent);
  };

  return (
    <div className="container mx-auto py-8 h-[calc(100vh-8rem)]">
      <div className="h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          <ResizablePanel defaultSize={60} minSize={30}>
            <MarkdownEditor 
              content={markdownContent}
              onChange={handleContentUpdate}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={40} minSize={30}>
            <AIChatPanel onStreamContent={handleStreamContent} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}