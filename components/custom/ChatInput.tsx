'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Send, Settings, Sparkles } from 'lucide-react';

// Available models
const MODELS = [
  { id: 'openai-gpt-4', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Most capable, best for complex tasks' },
  { id: 'openai-gpt-3.5', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Fast and cost-effective' },
  { id: 'anthropic-claude-3', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Highly capable for complex reasoning' },
  { id: 'anthropic-claude-3.5', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Balanced performance and speed' },
  { id: 'google-gemini-pro', name: 'Gemini Pro', provider: 'Google', description: 'Multimodal capabilities' },
];

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function ChatInput({
  input,
  onInputChange,
  selectedModel,
  onModelChange,
  systemPrompt,
  onSystemPromptChange,
  onSubmit,
  isLoading
}: ChatInputProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  const selectedModelInfo = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  return (
    <div className="border-t p-4 space-y-3">
      {/* Model Selection and System Prompt Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="w-48">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {model.description}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                System Prompt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Configure System Prompt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="system-prompt">System Prompt</Label>
                  <Textarea
                    id="system-prompt"
                    value={systemPrompt}
                    onChange={(e) => onSystemPromptChange(e.target.value)}
                    placeholder="Enter system prompt to define the AI's behavior..."
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground">
                    The system prompt defines how the AI should behave and respond to your messages.
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="text-sm text-muted-foreground">
          Using {selectedModelInfo.name}
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="min-h-12 max-h-32 resize-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && input.trim()) {
                    handleSubmit(e);
                  }
                }
              }}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="px-6 self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </form>
    </div>
  );
}