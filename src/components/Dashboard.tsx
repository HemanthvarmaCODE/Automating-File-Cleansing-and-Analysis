import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { FileCheck, Shield, AlertTriangle, Clock, TrendingUp, Database } from "lucide-react";
import api from '@/lib/api';

const Dashboard = () => {
  const [dashboardStats, setDashboardStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setDashboardStats(response.data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };
    fetchStats();
  }, []);

  if (!dashboardStats) {
    return (
        <div className="min-h-screen py-12 px-6 flex items-center justify-center">
            <p>Loading dashboard...</p>
        </div>
    );
  }

  const stats = [
    {
      icon: FileCheck,
      label: "Files Processed",
      value: dashboardStats.totalFilesProcessed,
      change: "+12.5%",
      positive: true
    },
    {
      icon: Shield,
      label: "PII Instances Redacted",
      value: dashboardStats.totalPIIRedacted,
      change: "+8.2%",
      positive: true
    },
    {
      icon: AlertTriangle,
      label: "Critical Findings",
      value: "23",
      change: "-15.3%",
      positive: true
    },
    {
      icon: Clock,
      label: "Avg Processing Time",
      value: `${(dashboardStats.avgProcessingTime / 1000).toFixed(1)}s`,
      change: "-22.1%",
      positive: true
    }
  ];

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time monitoring of file cleansing operations
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => (
            <Card
              key={idx}
              className="p-6 border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <span className={`text-sm font-medium ${stat.positive ? 'text-primary' : 'text-destructive'}`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Recent Files</h2>
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-4">
              {dashboardStats.recentFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                >
                  <div className="flex-1">
                    <p className="font-medium mb-1">{file.originalFileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {file.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{new Date(file.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6 border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">System Health</h2>
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">API Status</span>
                  <span className="text-sm font-medium text-primary">Operational</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Processing Queue</span>
                  <span className="text-sm font-medium">Active</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: '10%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Storage Used</span>
                  <span className="text-sm font-medium">42%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '42%' }} />
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Last System Check</p>
                <p className="text-sm font-medium">1 minute ago</p>
                <p className="text-xs text-primary mt-1">All systems operational</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;