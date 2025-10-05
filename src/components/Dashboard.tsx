import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { FileCheck, Shield, AlertTriangle, Clock, TrendingUp, Database, CheckCircle2 } from "lucide-react";
import api from '@/lib/api';

const Dashboard = () => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [apiStatus, setApiStatus] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setDashboardStats(response.data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setApiStatus(false);
      }
    };
    fetchStats();
  }, []);

  if (!dashboardStats) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Loading dashboard...</p>
        </div>
    );
  }

  const storagePercentage = dashboardStats.storageLimit > 0
    ? (dashboardStats.storageUsed / dashboardStats.storageLimit) * 100
    : 0;

  const stats = [
    {
      icon: FileCheck,
      label: "Files Processed",
      value: dashboardStats.totalFilesProcessed,
    },
    {
      icon: Shield,
      label: "PII Instances Redacted",
      value: dashboardStats.totalPIIRedacted,
    },
    {
      icon: AlertTriangle,
      label: "Critical Findings",
      value: dashboardStats.criticalFindings,
    },
    {
      icon: Clock,
      label: "Avg Processing Time",
      value: `${(dashboardStats.avgProcessingTime / 1000).toFixed(1)}s`,
    }
  ];

  return (
    <div className="py-12 px-6">
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
              className="p-6 border-border hover:border-primary/50 transition-all bg-card/50 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Recent Files</h2>
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-4">
              {dashboardStats.recentFiles.map((file) => (
                <div
                  key={file._id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                >
                  <div className="flex-1">
                    <p className="font-medium mb-1 truncate">{file.originalFileName}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {file.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{new Date(file.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {dashboardStats.recentFiles.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No recent files found.</p>
              )}
            </div>
          </Card>
          <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">System Health</h2>
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">API Status</span>
                  <span className={`text-sm font-medium ${apiStatus ? 'text-primary' : 'text-destructive'}`}>
                    {apiStatus ? 'Operational' : 'Offline'}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${apiStatus ? 'bg-primary' : 'bg-destructive'}`} style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Processing Queue</span>
                  <span className="text-sm font-medium">{dashboardStats.queueCount} files</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(dashboardStats.queueCount * 10, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Storage Used</span>
                  <span className="text-sm font-medium">{storagePercentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: `${storagePercentage}%` }} />
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                  All systems operational
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;