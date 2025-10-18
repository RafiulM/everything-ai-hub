'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Key, Eye, EyeOff, Edit, Trash2 } from 'lucide-react';
import { getUserApiKeys, createApiKey, updateApiKey, deleteApiKey } from '@/lib/api-keys';

interface ApiKey {
  id: string;
  provider: string;
  keyName: string;
  isActive: string;
  createdAt: string;
  updatedAt: string;
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', description: 'For GPT models and DALL-E' },
  { value: 'anthropic', label: 'Anthropic', description: 'For Claude models' },
  { value: 'firecrawl', label: 'Firecrawl', description: 'For web scraping' },
  { value: 'stability', label: 'Stability AI', description: 'For image generation' },
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Form states
  const [createForm, setCreateForm] = useState({
    provider: '',
    keyName: '',
    apiKey: '',
  });

  const [editForm, setEditForm] = useState({
    keyName: '',
    apiKey: '',
    isActive: 'true',
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const result = await getUserApiKeys();
      if (result.success) {
        setApiKeys(result.data || []);
      } else {
        toast.error(result.error || 'Failed to fetch API keys');
      }
    } catch (error) {
      toast.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!createForm.provider || !createForm.keyName || !createForm.apiKey) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const result = await createApiKey(createForm);
      if (result.success) {
        toast.success('API key created successfully');
        setIsCreateDialogOpen(false);
        setCreateForm({ provider: '', keyName: '', apiKey: '' });
        fetchApiKeys();
      } else {
        toast.error(result.error || 'Failed to create API key');
      }
    } catch (error) {
      toast.error('Failed to create API key');
    }
  };

  const handleUpdateKey = async () => {
    if (!editingKey) return;

    try {
      const updateData: any = {
        id: editingKey.id,
      };

      if (editForm.keyName !== editingKey.keyName) {
        updateData.keyName = editForm.keyName;
      }

      if (editForm.apiKey) {
        updateData.apiKey = editForm.apiKey;
      }

      if (editForm.isActive !== editingKey.isActive) {
        updateData.isActive = editForm.isActive;
      }

      const result = await updateApiKey(updateData);
      if (result.success) {
        toast.success('API key updated successfully');
        setIsEditDialogOpen(false);
        setEditingKey(null);
        setEditForm({ keyName: '', apiKey: '', isActive: 'true' });
        fetchApiKeys();
      } else {
        toast.error(result.error || 'Failed to update API key');
      }
    } catch (error) {
      toast.error('Failed to update API key');
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const result = await deleteApiKey(id);
      if (result.success) {
        toast.success('API key deleted successfully');
        fetchApiKeys();
      } else {
        toast.error(result.error || 'Failed to delete API key');
      }
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const openEditDialog = (key: ApiKey) => {
    setEditingKey(key);
    setEditForm({
      keyName: key.keyName,
      apiKey: '',
      isActive: key.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const getProviderLabel = (provider: string) => {
    return PROVIDERS.find(p => p.value === provider)?.label || provider;
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading API keys...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage your AI service API keys</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New API Key</DialogTitle>
              <DialogDescription>
                Add a new API key for an AI service provider
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={createForm.provider}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, provider: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        <div>
                          <div className="font-medium">{provider.label}</div>
                          <div className="text-sm text-muted-foreground">{provider.description}</div>
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
                  value={createForm.keyName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, keyName: e.target.value }))}
                  placeholder="e.g., My OpenAI Key"
                />
              </div>
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={createForm.apiKey}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Enter your API key"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateKey}>
                  Add Key
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No API keys yet</h3>
              <p className="text-muted-foreground mb-4">Add your first API key to start using AI services</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add API Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {key.keyName}
                      <Badge variant={key.isActive === 'true' ? 'default' : 'secondary'}>
                        {key.isActive === 'true' ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {getProviderLabel(key.provider)} • Created {new Date(key.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(key)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>Active</Label>
                    <Switch
                      checked={key.isActive === 'true'}
                      disabled
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Last updated: {new Date(key.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update your API key settings
            </DialogDescription>
          </DialogHeader>
          {editingKey && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editKeyName">Key Name</Label>
                <Input
                  id="editKeyName"
                  value={editForm.keyName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, keyName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="editApiKey">New API Key (optional)</Label>
                <Input
                  id="editApiKey"
                  type="password"
                  value={editForm.apiKey}
                  onChange={(e) => setEditForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Leave empty to keep current key"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="editActive">Active</Label>
                <Switch
                  id="editActive"
                  checked={editForm.isActive === 'true'}
                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isActive: checked ? 'true' : 'false' }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateKey}>
                  Update Key
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
