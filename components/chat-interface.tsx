'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Send, MessageSquare, Settings, Plus, Trash2 } from 'lucide-react';

// Available models (same as original)
const MODELS = [
  { id: 'openai-gpt-4', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Most capable, best for complex tasks' },
  { id: 'openai-gpt-3.5', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Fast and cost-effective' },
  { id: 'anthropic-claude-3', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Highly capable for complex reasoning' },
  { id: 'anthropic-claude-3.5', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Balanced performance and speed' },
  { id: 'google-gemini-pro', name: 'Gemini Pro', provider: 'Google', description: 'Multimodal capabilities' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  createdAt: string;
}

interface ChatInterfaceProps {
  context?: string;
  contextTitle?: string;
  className?: string;
  showModelSelector?: boolean;
  showSettings?: boolean;
  defaultSystemPrompt?: string;
  onNewSession?: () => void;
}

export function ChatInterface({ 
  context = '', 
  contextTitle = 'Context',
  className = '',
  showModelSelector = true,
  showSettings = true,
  defaultSystemPrompt = 'You are a helpful AI assistant.',
  onNewSession
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('openai-gpt-4');
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const createContextualSystemPrompt = useCallback(() => {
    if (!context.trim()) {
      return systemPrompt;
    }

    return `${systemPrompt}

You have been provided with the following context from a web page:

--- ${contextTitle} ---
${context}
--- End of ${contextTitle} ---

Please use this context to answer questions and provide relevant information. If the user asks about something not covered in the context, let them know and provide general information if appropriate.`;
  }, [systemPrompt, context, contextTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const userMessage: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        content: input, 
        createdAt: new Date().toISOString() 
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Prepare messages with contextual system prompt
      const contextualSystemPrompt = createContextualSystemPrompt();
      const messagesToSend = [
        { role: 'system', content: contextualSystemPrompt },
        ...messages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: input }
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
          modelId: selectedModel,
          systemPrompt: contextualSystemPrompt,
          sessionId: currentSessionId,
          context: context // Send context separately for potential API processing
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let assistantContent = '';
      const assistantId = Date.now().toString();
      
      // Add initial assistant message
      setMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: '', 
        createdAt: new Date().toISOString() 
      }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('0:')) {
              const content = line.slice(2);
              assistantContent += content;
              
              setMessages(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, content: assistantContent }
                  : msg
              ));
            }
          }
        }
      }

      setInput('');
      
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setError(null);
    if (onNewSession) {
      onNewSession();
    }
  };

  const getModelInfo = (modelId: string) => {
    return MODELS.find(m => m.id === modelId) || MODELS[0];
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const hasContext = context && context.trim().length > 0;
  const contextLength = context.length;

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-medium">AI Chat</h3>
            <p className="text-sm text-muted-foreground">
              {hasContext ? `Chat about the ${contextTitle.toLowerCase()} (${contextLength} chars)` : 'General AI chat'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleNewChat}>
              <Plus className="w-3 h-3" />
            </Button>
            {showSettings && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              >
                <Settings className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Model Selector */}
        {showModelSelector && (
          <div className="mb-3">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div>
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Context Info */}
        {hasContext && (
          <div className="flex gap-2 mb-3">
            <Badge variant="secondary" className="text-xs">
              Context: {contextLength} characters
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getModelInfo(selectedModel).name}
            </Badge>
          </div>
        )}

        {/* Settings Panel */}
        {showSettingsPanel && showSettings && (
          <>
            <Separator className="mb-3" />
            <div className="space-y-3">
              <div>
                <Label htmlFor="systemPrompt" className="text-xs">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter system prompt..."
                  className="text-xs"
                  rows={3}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm text-center">
                  {hasContext 
                    ? `Ask me anything about the ${contextTitle.toLowerCase()}`
                    : 'Start a conversation with AI'
                  }
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    <div className={`text-xs mt-1 opacity-70 ${
                      message.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}>
                      {formatMessageTime(message.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                Error: {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>
      
      {/* Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}