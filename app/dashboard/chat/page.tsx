"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { Send, Settings, MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getChatSessions, createChatSession, deleteChatSession, getChatSession, updateChatSession } from "@/lib/chat-sessions";
import { toast } from "sonner";
import { ChatSession } from "@/db/schema/ai-services";

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
}

const availableModels = {
    openai: [
        { id: "gpt-4o", name: "GPT-4o", description: "Most capable model" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and efficient" },
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Classic model" },
    ],
    anthropic: [
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "Most balanced" },
        { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", description: "Fastest" },
        { id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "Most capable" },
    ],
    google: [
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Advanced model" },
        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast and efficient" },
        { id: "gemini-1.0-pro", name: "Gemini 1.0 Pro", description: "Classic model" },
    ],
};

const providerInfo = {
    openai: { name: "OpenAI", color: "bg-green-500" },
    anthropic: { name: "Anthropic", color: "bg-blue-500" },
    google: { name: "Google AI", color: "bg-yellow-500" },
};

export default function ChatPage() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
    const [selectedProvider, setSelectedProvider] = useState("openai");
    const [selectedModel, setSelectedModel] = useState("gpt-4o");
    const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
    const [showSettings, setShowSettings] = useState(false);
    const [showNewChatDialog, setShowNewChatDialog] = useState(false);
    const [newChatTitle, setNewChatTitle] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        setMessages,
        error,
    } = useChat({
        api: "/api/chat",
        body: {
            provider: selectedProvider,
            model: selectedModel,
            systemPrompt: systemPrompt,
            sessionId: currentSession?.id,
        },
        onFinish: async () => {
            // Refresh sessions to update the latest message time
            await loadSessions();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to send message");
        },
    });

    useEffect(() => {
        loadSessions();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadSessions = async () => {
        try {
            const sessionData = await getChatSessions();
            setSessions(sessionData);
        } catch (error) {
            toast.error("Failed to load chat sessions");
        }
    };

    const loadSession = async (sessionId: string) => {
        try {
            const sessionData = await getChatSession(sessionId);
            setCurrentSession(sessionData);
            setSelectedProvider(sessionData.provider);
            setSelectedModel(sessionData.model);
            setSystemPrompt(sessionData.systemPrompt || "You are a helpful AI assistant.");
            
            // Load messages for this session
            const response = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
            if (response.ok) {
                const sessionMessages = await response.json();
                setMessages(sessionMessages.map((msg: any) => ({
                    id: msg.id,
                    role: msg.type,
                    content: msg.content,
                    createdAt: msg.createdAt,
                })));
            }
        } catch (error) {
            toast.error("Failed to load chat session");
        }
    };

    const createNewChat = async () => {
        if (!newChatTitle.trim()) {
            toast.error("Please enter a chat title");
            return;
        }

        try {
            const newSession = await createChatSession({
                title: newChatTitle,
                model: selectedModel,
                provider: selectedProvider,
                systemPrompt: systemPrompt,
            });
            
            await loadSessions();
            setCurrentSession(newSession);
            setMessages([]);
            setShowNewChatDialog(false);
            setNewChatTitle("");
            toast.success("New chat created");
        } catch (error) {
            toast.error("Failed to create chat");
        }
    };

    const deleteSession = async (sessionId: string) => {
        try {
            await deleteChatSession(sessionId);
            await loadSessions();
            if (currentSession?.id === sessionId) {
                setCurrentSession(null);
                setMessages([]);
            }
            toast.success("Chat deleted");
        } catch (error) {
            toast.error("Failed to delete chat");
        }
    };

    const startNewChat = () => {
        setCurrentSession(null);
        setMessages([]);
        setSelectedProvider("openai");
        setSelectedModel("gpt-4o");
        setSystemPrompt("You are a helpful AI assistant.");
    };

    const updateSessionSettings = async () => {
        if (currentSession) {
            try {
                await updateChatSession(currentSession.id, {
                    title: currentSession.title,
                    systemPrompt: systemPrompt,
                });
                toast.success("Chat settings updated");
            } catch (error) {
                toast.error("Failed to update settings");
            }
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <div className="w-80 border-r bg-background">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Chat History</h2>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowNewChatDialog(true)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={startNewChat}
                            >
                                <MessageSquare className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    
                    <ScrollArea className="h-[calc(100vh-10rem)]">
                        <div className="space-y-2">
                            {sessions.map((session) => (
                                <Card
                                    key={session.id}
                                    className={`cursor-pointer transition-colors ${
                                        currentSession?.id === session.id ? "bg-accent" : ""
                                    }`}
                                    onClick={() => loadSession(session.id)}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className={`w-2 h-2 rounded-full ${providerInfo[session.provider as keyof typeof providerInfo].color}`} />
                                                    <h3 className="font-medium truncate">{session.title}</h3>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {providerInfo[session.provider as keyof typeof providerInfo].name}
                                                    </Badge>
                                                    <span>{session.model}</span>
                                                </div>
                                            </div>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete "{session.title}"? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteSession(session.id)}>
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {new Date(session.updatedAt).toLocaleDateString()}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">
                                {currentSession?.title || "New Chat"}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {currentSession 
                                    ? `${providerInfo[currentSession.provider as keyof typeof providerInfo].name} - ${currentSession.model}`
                                    : `${providerInfo[selectedProvider as keyof typeof providerInfo].name} - ${selectedModel}`
                                }
                            </p>
                        </div>
                        <Dialog open={showSettings} onOpenChange={setShowSettings}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Settings
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Chat Settings</DialogTitle>
                                    <DialogDescription>
                                        Configure your AI model and system prompt
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="provider">AI Provider</Label>
                                        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select provider" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(providerInfo).map(([key, info]) => (
                                                    <SelectItem key={key} value={key}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-3 h-3 rounded-full ${info.color}`} />
                                                            {info.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="model">Model</Label>
                                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableModels[selectedProvider as keyof typeof availableModels]?.map((model) => (
                                                    <SelectItem key={model.id} value={model.id}>
                                                        <div>
                                                            <div className="font-medium">{model.name}</div>
                                                            <div className="text-sm text-muted-foreground">{model.description}</div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="systemPrompt">System Prompt</Label>
                                        <Textarea
                                            id="systemPrompt"
                                            value={systemPrompt}
                                            onChange={(e) => setSystemPrompt(e.target.value)}
                                            placeholder="You are a helpful AI assistant."
                                            className="min-h-[100px]"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowSettings(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={updateSessionSettings}>
                                        {currentSession ? "Update" : "Apply Settings"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4 max-w-4xl mx-auto">
                        {messages.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                                <p className="text-muted-foreground">
                                    Type a message below to begin chatting with AI
                                </p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${
                                        message.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-4 ${
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap">{message.content}</div>
                                        <div className="text-xs opacity-70 mt-2">
                                            {new Date(message.createdAt || Date.now()).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                        <span>AI is thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input */}
                <div className="border-t p-4">
                    <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
                        <Input
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Type your message..."
                            className="flex-1"
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>

            {/* New Chat Dialog */}
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Chat</DialogTitle>
                        <DialogDescription>
                            Start a new conversation with AI
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="chatTitle">Chat Title</Label>
                            <Input
                                id="chatTitle"
                                value={newChatTitle}
                                onChange={(e) => setNewChatTitle(e.target.value)}
                                placeholder="e.g., Brainstorming Session"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={createNewChat}>
                            Create Chat
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}