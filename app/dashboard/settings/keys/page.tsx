"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { addApiKey, updateApiKey, deleteApiKey, getApiKeys } from "@/app/actions/api-keys";
import { Trash2, Plus } from "lucide-react";

interface ApiKey {
  id: string;
  provider: string;
  keyName: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({
    provider: "openai",
    key: "",
    keyName: "",
  });

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const result = await getApiKeys();
      setKeys(result);
    } catch (error) {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddKey(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.key) {
      toast.error("API key is required");
      return;
    }

    setAdding(true);
    try {
      await addApiKey({
        provider: formData.provider as "openai" | "anthropic" | "google" | "stability-ai",
        key: formData.key,
        keyName: formData.keyName,
      });
      toast.success("API key added successfully");
      setFormData({ provider: "openai", key: "", keyName: "" });
      await loadKeys();
    } catch (error) {
      toast.error("Failed to add API key");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      await deleteApiKey(id);
      toast.success("API key deleted");
      await loadKeys();
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-gray-500">Manage your API keys for AI services</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New API Key</CardTitle>
          <CardDescription>Store your API keys securely. They are encrypted in our database.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddKey} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Provider</label>
                <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="stability-ai">Stability AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Key Name (Optional)</label>
                <Input
                  placeholder="e.g., Production OpenAI Key"
                  value={formData.keyName}
                  onChange={(e) => setFormData({ ...formData, keyName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="Enter your API key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={adding} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {adding ? "Adding..." : "Add API Key"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>Manage your stored API keys</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-gray-500">No API keys added yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <p className="font-medium capitalize">{key.provider}</p>
                    <p className="text-sm text-gray-500">{key.keyName}</p>
                    <p className="text-xs text-gray-400">Added {new Date(key.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
