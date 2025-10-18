'use client';

import { useState, useEffect, useRef } from 'react';
// Import implemented manually for now
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { MessageSquare, Plus, PanelLeftClose, PanelLeft } from 'lucide-react';
import { ChatInput } from '@/components/custom/ChatInput';

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
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Array<{id: string; role: string; content: string; createdAt: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


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
    // Scroll to bottom when new messages arrive
    if (isLoading) {
      scrollToBottom();
    }
  }, [isLoading]);

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
    <div className="h-screen flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sessions Panel */}
        {!sidebarCollapsed && (
          <>
            <ResizablePanel 
              defaultSize={20} 
              minSize={15} 
              maxSize={35}
              className="min-w-[280px]"
            >
              <Card className="h-full flex flex-col border-0 rounded-none">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Chat Sessions
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={createNewSession}>
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setSidebarCollapsed(true)}
                      >
                        <PanelLeftClose className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Your conversation history
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-4">
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
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Main Chat Panel */}
        <ResizablePanel defaultSize={sidebarCollapsed ? 100 : 80}>
          <div className="h-full flex flex-col">
            {/* Integrated Header */}
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {sidebarCollapsed && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setSidebarCollapsed(false)}
                    >
                      <PanelLeft className="w-4 h-4" />
                    </Button>
                  )}
                  <div>
                    <h1 className="text-lg font-semibold">
                      {currentSessionId ? 
                        sessions.find(s => s.id === currentSessionId)?.title || 'AI Chat' : 
                        'New Conversation'
                      }
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {currentSessionId ? 
                        `Using ${getModelInfo(selectedModel).name}` : 
                        'Start a new conversation below'
                      }
                    </p>
                  </div>
                </div>
                {currentSessionId && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {messages.length} messages
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground min-h-[60vh]">
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
              
              {/* Consolidated Chat Input */}
              <ChatInput
                input={input}
                onInputChange={setInput}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                systemPrompt={systemPrompt}
                onSystemPromptChange={setSystemPrompt}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
