'use client';

import { useState, useEffect, useRef } from 'react';
// Import implemented manually for now
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
import { Send, MessageSquare, Settings, History, Plus, Trash2 } from 'lucide-react';

// Available models
const MODELS = [
  { id: 'openai-gpt-4', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Most capable, best for complex tasks' },
  { id: 'openai-gpt-3.5', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Fast and cost-effective' },
  { id: 'anthropic-claude-3', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Highly capable for complex reasoning' },
  { id: 'anthropic-claude-3.5', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Balanced performance and speed' },
  { id: 'google-gemini-pro', name: 'Gemini Pro', provider: 'Google', description: 'Multimodal capabilities' },
];

interface ChatSession {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  createdAt: string;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('openai-gpt-4');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Array<{id: string; role: string; content: string; createdAt: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const userMessage = { id: Date.now().toString(), role: 'user', content: input, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, userMessage]);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          modelId: selectedModel,
          systemPrompt,
          sessionId: currentSessionId,
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

      // Refresh sessions to get latest updates
      fetchSessions();
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

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/chat');
      const result = await response.json();
      
      if (result.success) {
        setSessions(result.data || []);
      } else {
        toast.error('Failed to fetch sessions');
      }
    } catch (error) {
      toast.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat?sessionId=${sessionId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const chatMessages = result.data.map((msg: {id: string; role: string; content: string; createdAt: string}) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
        }));
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const loadSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading chat sessions...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-6">
        {/* Sidebar */}
        <Card className="w-80 flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Chat Sessions
              </CardTitle>
              <Button size="sm" onClick={createNewSession}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>
              Your conversation history
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a new chat to begin</p>
                  </div>
                ) : (
                  sessions.map((session) => {
                    const modelInfo = getModelInfo(session.model);
                    const isSelected = currentSessionId === session.id;
                    
                    return (
                      <div
                        key={session.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => loadSession(session.id)}
                      >
                        <div className="font-medium text-sm line-clamp-1">
                          {session.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={isSelected ? "secondary" : "outline"} className="text-xs">
                            {modelInfo.shortName || modelInfo.name}
                          </Badge>
                          <span className="text-xs opacity-70">
                            {new Date(session.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>AI Chat</CardTitle>
                  <CardDescription>
                    Chat with multiple AI models
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
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
                </div>
              </div>
            </CardHeader>
            
            {showSettings && (
              <>
                <Separator />
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="systemPrompt">System Prompt</Label>
                    <Textarea
                      id="systemPrompt"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Enter system prompt..."
                      rows={3}
                    />
                  </div>
                </CardContent>
                <Separator />
              </>
            )}
          </Card>

          {/* Messages */}
          <Card className="flex-1 flex flex-col">
            <CardContent className="flex-1 p-4">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        {currentSessionId ? 'Continue the conversation' : 'Start a new conversation'}
                      </h3>
                      <p className="text-sm text-center max-w-md">
                        {currentSessionId 
                          ? 'Type a message below to continue chatting'
                          : 'Ask me anything! I can help with a wide range of tasks including writing, analysis, coding, and creative thinking.'
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
                          <div className="whitespace-pre-wrap">{message.content}</div>
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
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            
            {/* Input */}
            <Separator />
            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="min-h-12"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading || !input.trim()}
                  className="px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
