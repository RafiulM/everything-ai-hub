"use client";

import { useState, useEffect } from "react";
import { Plus, Key, Trash2, Edit, Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getUserApiKeys, addApiKey, updateApiKey, deleteApiKey } from "@/lib/api-keys";

interface ApiKey {
    id: string;
    provider: string;
    keyName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const providerInfo = {
    openai: { name: "OpenAI", color: "bg-green-500" },
    anthropic: { name: "Anthropic", color: "bg-blue-500" },
    google: { name: "Google AI", color: "bg-yellow-500" },
    cohere: { name: "Cohere", color: "bg-purple-500" },
    mistral: { name: "Mistral", color: "bg-orange-500" },
    firecrawl: { name: "Firecrawl", color: "bg-red-500" },
};

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

    const [formData, setFormData] = useState({
        provider: "",
        apiKey: "",
        keyName: "",
        isActive: true,
    });

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        try {
            const result = await getUserApiKeys();
            setKeys(result);
        } catch (error) {
            toast.error("Failed to load API keys");
        } finally {
            setLoading(false);
        }
    };

    const handleAddKey = async () => {
        if (!formData.provider || !formData.apiKey || !formData.keyName) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            await addApiKey(formData);
            toast.success("API key added successfully");
            setShowAddDialog(false);
            setFormData({ provider: "", apiKey: "", keyName: "", isActive: true });
            loadKeys();
        } catch (error: any) {
            toast.error(error.message || "Failed to add API key");
        }
    };

    const handleUpdateKey = async () => {
        if (!editingKey || !formData.apiKey || !formData.keyName) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            await updateApiKey({
                id: editingKey.id,
                provider: formData.provider,
                apiKey: formData.apiKey,
                keyName: formData.keyName,
                isActive: formData.isActive,
            });
            toast.success("API key updated successfully");
            setShowEditDialog(false);
            setEditingKey(null);
            setFormData({ provider: "", apiKey: "", keyName: "", isActive: true });
            loadKeys();
        } catch (error: any) {
            toast.error(error.message || "Failed to update API key");
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        try {
            await deleteApiKey(keyId);
            toast.success("API key deleted successfully");
            loadKeys();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete API key");
        }
    };

    const startEdit = (key: ApiKey) => {
        setEditingKey(key);
        setFormData({
            provider: key.provider,
            apiKey: "",
            keyName: key.keyName,
            isActive: key.isActive,
        });
        setShowEditDialog(true);
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center gap-2 mb-6">
                    <Key className="h-6 w-6" />
                    <h1 className="text-3xl font-bold">API Keys</h1>
                </div>
                <div className="text-center py-8">Loading API keys...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Key className="h-6 w-6" />
                    <h1 className="text-3xl font-bold">API Keys</h1>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add API Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New API Key</DialogTitle>
                            <DialogDescription>
                                Add a new API key for AI services. Your keys will be encrypted and stored securely.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="provider">Provider</Label>
                                <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
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
                                <Label htmlFor="keyName">Key Name</Label>
                                <Input
                                    id="keyName"
                                    value={formData.keyName}
                                    onChange={(e) => setFormData({ ...formData, keyName: e.target.value })}
                                    placeholder="e.g., My OpenAI Key"
                                />
                            </div>
                            <div>
                                <Label htmlFor="apiKey">API Key</Label>
                                <Input
                                    id="apiKey"
                                    type="password"
                                    value={formData.apiKey}
                                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                    placeholder="Enter your API key"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddKey}>
                                Add Key
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {keys.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Key className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                Add your first API key to start using AI services. You can add keys for multiple providers.
                            </p>
                            <Button onClick={() => setShowAddDialog(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First API Key
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    keys.map((key) => (
                        <Card key={key.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full ${providerInfo[key.provider as keyof typeof providerInfo].color}`} />
                                        <div>
                                            <CardTitle className="text-lg">{key.keyName}</CardTitle>
                                            <CardDescription>
                                                {providerInfo[key.provider as keyof typeof providerInfo].name}
                                            </CardDescription>
                                        </div>
                                        <Badge variant={key.isActive ? "default" : "secondary"}>
                                            {key.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => startEdit(key)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete "{key.keyName}"? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteKey(key.id)}>
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    Created: {new Date(key.createdAt).toLocaleDateString()}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit API Key</DialogTitle>
                        <DialogDescription>
                            Update your API key settings.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-provider">Provider</Label>
                            <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
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
                            <Label htmlFor="edit-keyName">Key Name</Label>
                            <Input
                                id="edit-keyName"
                                value={formData.keyName}
                                onChange={(e) => setFormData({ ...formData, keyName: e.target.value })}
                                placeholder="e.g., My OpenAI Key"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-apiKey">New API Key</Label>
                            <Input
                                id="edit-apiKey"
                                type="password"
                                value={formData.apiKey}
                                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                placeholder="Enter new API key (leave empty to keep current)"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                            <Label htmlFor="edit-isActive">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateKey}>
                            Update Key
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}