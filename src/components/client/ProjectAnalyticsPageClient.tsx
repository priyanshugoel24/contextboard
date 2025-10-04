"use client";
import { Navbar } from '@/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Target, Activity } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ProjectAnalyticsPageClientProps } from '@/interfaces/ui-components';
import { ANALYTICS_CHART_COLORS } from '@/config/charts';

export default function ProjectAnalyticsPageClient({ analytics }: ProjectAnalyticsPageClientProps) {
  // Transform data for charts
  const cardTypeData = Object.entries(analytics.cardTypeDistribution).map(([type, count]) => ({
    name: type,
    value: count as number,
  }));

  const taskStatusData = Object.entries(analytics.taskStatusOverview).map(([status, count]) => ({
    name: status,
    value: count as number,
  }));

  const visibilityData = Object.entries(analytics.visibilityDistribution).map(([visibility, count]) => ({
    name: visibility,
    value: count as number,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <BackButton label="Back to Project" />
            <div>
              <h1 className="text-3xl font-bold">Project Analytics</h1>
              <p className="text-muted-foreground">Comprehensive project insights</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            <BarChart3 className="h-4 w-4 mr-1" />
            Analytics Dashboard
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalCards}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.totalTasks} tasks, {analytics.completedTasks} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.taskStatusOverview.ACTIVE + analytics.taskStatusOverview.CLOSED}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.taskStatusOverview.CLOSED} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contributors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.topContributors.length}</div>
              <p className="text-xs text-muted-foreground">Active contributors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.taskStatusOverview.ACTIVE + analytics.taskStatusOverview.CLOSED > 0 
                  ? Math.round((analytics.taskStatusOverview.CLOSED / (analytics.taskStatusOverview.ACTIVE + analytics.taskStatusOverview.CLOSED)) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Task completion rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Card Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Card Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={cardTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {cardTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ANALYTICS_CHART_COLORS[index % ANALYTICS_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Task Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Task Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Additional Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visibility Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Card Visibility Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={visibilityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#82ca9d"
                    dataKey="value"
                  >
                    {visibilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ANALYTICS_CHART_COLORS[index % ANALYTICS_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Contributors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topContributors.map((contributor, index: number) => (
                  <div key={contributor.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{contributor.userName}</p>
                        <p className="text-sm text-muted-foreground">{contributor.cardsCreated} cards</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{contributor.cardsCreated}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
