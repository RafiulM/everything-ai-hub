'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { toast } from 'sonner';
import { 
  Bot, 
  Image as ImageIcon, 
  Globe, 
  MessageSquare, 
  TrendingUp, 
  DollarSign, 
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  CheckCircle
} from 'lucide-react';

interface AnalyticsData {
  period: number;
  summary: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    chatSessions: number;
    imageGenerations: number;
    webScrapes: number;
  };
  serviceTypeBreakdown: Record<string, { count: number; tokensUsed: number; cost: number }>;
  providerBreakdown: Record<string, { count: number; tokensUsed: number; cost: number }>;
  modelBreakdown: Record<string, { count: number; tokensUsed: number; cost: number; provider: string }>;
  chartData: Array<{ date: string; requests: number; cost: number; tokens: number }>;
  favoriteModels: Array<{ model: string; count: number; provider: string }>;
  recentActivity: Array<{
    id: string;
    serviceType: string;
    provider: string;
    model: string;
    cost: number;
    timestamp: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const SERVICE_ICONS = {
  chat: MessageSquare,
  image: ImageIcon,
  scraping: Globe,
};

const PROVIDER_COLORS = {
  openai: '#10a37f',
  anthropic: '#d97757',
  google: '#4285f4',
  firecrawl: '#ff6b6b',
  stability: '#8b5cf6',
};

export default function Page() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?period=${period}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        toast.error('Failed to fetch analytics');
      }
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateFromNow = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      chat: 'AI Chat',
      image: 'Image Generation',
      scraping: 'Web Scraping',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Failed to load analytics</div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const serviceTypeData = Object.entries(data.serviceTypeBreakdown).map(([type, stats]) => ({
    name: getServiceTypeLabel(type),
    value: stats.count,
    cost: stats.cost,
    tokens: stats.tokensUsed,
  }));

  const providerData = Object.entries(data.providerBreakdown).map(([provider, stats]) => ({
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    value: stats.count,
    cost: stats.cost,
    tokens: stats.tokensUsed,
  }));

  const modelData = Object.entries(data.modelBreakdown)
    .map(([model, stats]) => ({
      name: model.length > 20 ? model.substring(0, 17) + '...' : model,
      fullName: model,
      value: stats.count,
      cost: stats.cost,
      tokens: stats.tokensUsed,
      provider: stats.provider,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Your AI service usage and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.summary.totalRequests)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalCost)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.summary.totalTokens)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.summary.chatSessions)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Images Generated</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.summary.imageGenerations)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Web Scrapes</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.summary.webScrapes)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage Over Time</CardTitle>
            <CardDescription>Daily usage metrics for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#8884d8" 
                    name="Requests"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#82ca9d" 
                    name="Cost ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Type Distribution</CardTitle>
            <CardDescription>Breakdown by AI service type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">Top Models</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Most Used AI Models</CardTitle>
              <CardDescription>Your favorite models by usage count</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Usage Count</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelData.map((model, index) => (
                    <TableRow key={model.fullName + index}>
                      <TableCell className="font-medium" title={model.fullName}>
                        {model.name}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          style={{ 
                            borderColor: PROVIDER_COLORS[model.provider as keyof typeof PROVIDER_COLORS],
                            color: PROVIDER_COLORS[model.provider as keyof typeof PROVIDER_COLORS]
                          }}
                        >
                          {model.provider.charAt(0).toUpperCase() + model.provider.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatNumber(model.value)}</TableCell>
                      <TableCell>{formatNumber(model.tokens)}</TableCell>
                      <TableCell>{formatCurrency(model.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle>Provider Usage</CardTitle>
              <CardDescription>Usage breakdown by AI provider</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerData.map((provider, index) => (
                    <TableRow key={provider.name + index}>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>{formatNumber(provider.value)}</TableCell>
                      <TableCell>{formatNumber(provider.tokens)}</TableCell>
                      <TableCell>{formatCurrency(provider.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest API requests and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentActivity.map((activity, index) => {
                      const ServiceIcon = SERVICE_ICONS[activity.serviceType as keyof typeof SERVICE_ICONS] || Bot;
                      return (
                        <TableRow key={activity.id + index}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ServiceIcon className="w-4 h-4" />
                              {getServiceTypeLabel(activity.serviceType)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              style={{ 
                                borderColor: PROVIDER_COLORS[activity.provider as keyof typeof PROVIDER_COLORS],
                                color: PROVIDER_COLORS[activity.provider as keyof typeof PROVIDER_COLORS]
                              }}
                            >
                              {activity.provider.charAt(0).toUpperCase() + activity.provider.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {activity.model.length > 20 ? activity.model.substring(0, 17) + '...' : activity.model}
                          </TableCell>
                          <TableCell>{formatCurrency(activity.cost)}</TableCell>
                          <TableCell>{formatDateFromNow(activity.timestamp)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}