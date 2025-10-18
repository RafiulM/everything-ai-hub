'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { Send, MessageSquare, Settings, History, Plus, Trash2, ChevronLeft, ChevronRight, Menu, Bot } from 'lucide-react';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedModel, setSelectedModel] = useState('openai-gpt-4');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSessionsPanelOpen, setIsSessionsPanelOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sessionsPanelOpen');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  
  const [panelSizes, setPanelSizes] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatPanelSizes');
      return saved ? JSON.parse(saved) : [25, 75];
    }
    return [25, 75];
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get current session ID from URL search parameters
  const currentSessionId = searchParams.get('sessionId');

  const [messages, setMessages] = useState<Array<{id: string; role: string; content: string; createdAt: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
  
  // Update URL when session changes
  const updateSessionInURL = (sessionId: string | null) => {
    if (sessionId) {
      router.replace(`/dashboard/chat?sessionId=${sessionId}`);
    } else {
      router.replace('/dashboard/chat');
    }
  };
  
  // Handle sessions panel toggle
  const toggleSessionsPanel = () => {
    const newState = !isSessionsPanelOpen;
    setIsSessionsPanelOpen(newState);
    localStorage.setItem('sessionsPanelOpen', JSON.stringify(newState));
  };
  
  // Handle panel resize
  const handlePanelResize = (sizes: number[]) => {
    setPanelSizes(sizes);
    localStorage.setItem('chatPanelSizes', JSON.stringify(sizes));
  };
  
  // Check if mobile screen
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768 && isSessionsPanelOpen) {
        setIsSessionsPanelOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isSessionsPanelOpen]);

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
    updateSessionInURL(null);
    setMessages([]);
  };

  const loadSession = (sessionId: string) => {
    updateSessionInURL(sessionId);
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
      <ResizablePanelGroup 
        direction="horizontal" 
        className="h-full rounded-lg border"
        onLayout={handlePanelResize}
      >
        {/* Sessions Panel */}
        <ResizablePanel 
          defaultSize={isSessionsPanelOpen ? panelSizes[0] : 5} 
          minSize={isSessionsPanelOpen ? (isMobile ? 25 : 15) : 5} 
          maxSize={isMobile ? 90 : 40}
          className={`transition-all duration-300 ${isSessionsPanelOpen ? '' : 'min-w-16'}`}
        >
          <Collapsible open={isSessionsPanelOpen} onOpenChange={setIsSessionsPanelOpen}>
            <Card className={`h-full flex flex-col border-0 rounded-none ${isSessionsPanelOpen ? '' : 'w-16'}`}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1" onClick={toggleSessionsPanel}>
                  {isSessionsPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              {isSessionsPanelOpen && (
                <>
                  <CardTitle className="flex items-center gap-2 flex-1">
                    <MessageSquare className="w-5 h-5" />
                    Chat Sessions
                  </CardTitle>
                  <Button size="sm" onClick={createNewSession}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            {isSessionsPanelOpen && (
              <CardDescription>
                Your conversation history
              </CardDescription>
            )}
          </CardHeader>
          <CollapsibleContent className="flex-1 overflow-hidden">
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
            </CollapsibleContent>
            </Card>
          </Collapsible>
        </ResizablePanel>
        
        <ResizableHandle withHandle className="w-2" />
        
        {/* Main Chat Area */}
        <ResizablePanel defaultSize={panelSizes[1]} minSize={50}>
          <div className="h-full flex flex-col gap-4 p-4">
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
              </div>
            </CardHeader>
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
            
            {/* Enhanced Input Area */}
            <Separator />
            <div className="p-4 space-y-4">
              {/* Controls Row */}
              <div className="flex items-center gap-3">
                {/* Model Selector */}
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-muted-foreground" />
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
                
                {/* Settings Popover */}
                <Popover open={showSettings} onOpenChange={setShowSettings}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Chat Settings</h4>
                        <p className="text-sm text-muted-foreground">
                          Configure your chat preferences
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="systemPrompt">System Prompt</Label>
                        <Textarea
                          id="systemPrompt"
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          placeholder="Enter system prompt..."
                          rows={4}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Input Form */}
              <form onSubmit={handleSubmit}>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your message... Press Shift+Enter for new line, Enter to send"
                      disabled={isLoading}
                      rows={3}
                      className="min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="px-6 h-auto"
                    size="lg"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
              </div>
            </Card>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
