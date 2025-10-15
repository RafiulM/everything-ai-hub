"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    MessageSquare, 
    Image as ImageIcon, 
    Globe, 
    DollarSign, 
    Cpu, 
    TrendingUp,
    Calendar,
    Activity
} from "lucide-react";

interface AnalyticsData {
    summary: {
        totalRequests: number;
        totalCost: number;
        chatRequests: number;
        imageRequests: number;
        scrapingRequests: number;
        chatSessions: number;
        activeSessions: number;
    };
    providerBreakdown: Array<{
        provider: string;
        requests: number;
        cost: number;
        tokens: number;
    }>;
    modelBreakdown: Array<{
        model: string;
        provider: string;
        requests: number;
        cost: number;
        tokens: number;
    }>;
    dailyUsage: Array<{
        date: string;
        chat: number;
        image_generation: number;
        web_scraping: number;
        totalCost: number;
        totalTokens: number;
    }>;
    recentActivity: Array<{
        id: string;
        serviceType: string;
        provider: string;
        model: string;
        cost: number;
        createdAt: string;
        metadata: any;
    }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const providerInfo = {
    openai: { name: "OpenAI", color: "bg-green-500" },
    anthropic: { name: "Anthropic", color: "bg-blue-500" },
    google: { name: "Google AI", color: "bg-yellow-500" },
    cohere: { name: "Cohere", color: "bg-purple-500" },
    mistral: { name: "Mistral", color: "bg-orange-500" },
    firecrawl: { name: "Firecrawl", color: "bg-red-500" },
};

const serviceIcons = {
    chat: MessageSquare,
    image_generation: ImageIcon,
    web_scraping: Globe,
};

export default function DashboardPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("30");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/analytics?period=${period}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }
            
            const analyticsData = await response.json();
            setData(analyticsData);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center gap-2 mb-6">
                    <Activity className="h-6 w-6" />
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                </div>
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading analytics data...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center gap-2 mb-6">
                    <Activity className="h-6 w-6" />
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                </div>
                <div className="text-center py-12">
                    <p className="text-destructive">Error: {error || 'No data available'}</p>
                    <Button onClick={fetchAnalytics} className="mt-4">
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    const pieData = data.providerBreakdown.map(stat => ({
        name: providerInfo[stat.provider as keyof typeof providerInfo]?.name || stat.provider,
        value: stat.requests,
        cost: stat.cost,
    }));

    const serviceTypeData = [
        { name: "Chat", value: data.summary.chatRequests, color: "#0088FE" },
        { name: "Image Generation", value: data.summary.imageRequests, color: "#00C49F" },
        { name: "Web Scraping", value: data.summary.scrapingRequests, color: "#FFBB28" },
    ];

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="h-6 w-6" />
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                </div>
                <div className="flex items-center gap-4">
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
                    <Button variant="outline" onClick={fetchAnalytics}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.totalRequests.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Last {period} days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.summary.totalCost.toFixed(4)}</div>
                        <p className="text-xs text-muted-foreground">
                            Last {period} days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.chatSessions.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {data.summary.activeSessions} active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Provider</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.providerBreakdown[0] ? 
                                providerInfo[data.providerBreakdown[0].provider as keyof typeof providerInfo]?.name || data.providerBreakdown[0].provider 
                                : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data.providerBreakdown[0]?.requests || 0} requests
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Usage Over Time */}
                <Card>
                    <CardHeader>
                        <CardTitle>Usage Over Time</CardTitle>
                        <CardDescription>
                            Daily usage breakdown by service type
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={data.dailyUsage}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                />
                                <YAxis />
                                <Tooltip 
                                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="chat" 
                                    stackId="1" 
                                    stroke="#0088FE" 
                                    fill="#0088FE" 
                                    name="Chat"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="image_generation" 
                                    stackId="1" 
                                    stroke="#00C49F" 
                                    fill="#00C49F" 
                                    name="Image Generation"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="web_scraping" 
                                    stackId="1" 
                                    stroke="#FFBB28" 
                                    fill="#FFBB28" 
                                    name="Web Scraping"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Provider Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Provider Distribution</CardTitle>
                        <CardDescription>
                            Requests by AI provider
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Model Usage */}
                <Card>
                    <CardHeader>
                        <CardTitle>Model Usage</CardTitle>
                        <CardDescription>
                            Most used AI models
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-80">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Model</TableHead>
                                        <TableHead>Provider</TableHead>
                                        <TableHead>Requests</TableHead>
                                        <TableHead>Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.modelBreakdown.map((model, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{model.model}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {providerInfo[model.provider as keyof typeof providerInfo]?.name || model.provider}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{model.requests.toLocaleString()}</TableCell>
                                            <TableCell>${model.cost.toFixed(4)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Latest API requests
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-80">
                            <div className="space-y-4">
                                {data.recentActivity.map((activity, index) => {
                                    const IconComponent = serviceIcons[activity.serviceType as keyof typeof serviceIcons];
                                    return (
                                        <div key={index} className="flex items-center gap-3">
                                            <div className="flex-shrink-0">
                                                <IconComponent className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium capitalize">
                                                        {activity.serviceType.replace('_', ' ')}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {providerInfo[activity.provider as keyof typeof providerInfo]?.name || activity.provider}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {activity.model || 'Default'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">${activity.cost.toFixed(4)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(activity.createdAt).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}