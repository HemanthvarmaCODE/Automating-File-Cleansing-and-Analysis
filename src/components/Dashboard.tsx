import { Card } from "@/components/ui/card";
import { FileCheck, Shield, AlertTriangle, Clock, TrendingUp, Database } from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      icon: FileCheck,
      label: "Files Processed",
      value: "1,247",
      change: "+12.5%",
      positive: true
    },
    {
      icon: Shield,
      label: "PII Instances Redacted",
      value: "8,432",
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
      value: "2.4s",
      change: "-22.1%",
      positive: true
    }
  ];

  const recentFiles = [
    { name: "employee_records.csv", status: "Completed", piiFound: 145, time: "2m ago" },
    { name: "security_audit.pdf", status: "Completed", piiFound: 67, time: "15m ago" },
    { name: "client_presentation.pptx", status: "Processing", piiFound: 0, time: "Just now" },
    { name: "network_diagram.png", status: "Completed", piiFound: 23, time: "1h ago" },
    { name: "access_logs.xlsx", status: "Completed", piiFound: 289, time: "2h ago" }
  ];

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time monitoring of file cleansing operations
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => (
            <Card 
              key={idx}
              className="p-6 border-border hover:border-primary/50 transition-all bg-gradient-card"
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

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Files */}
          <Card className="lg:col-span-2 p-6 border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Recent Files</h2>
              <Database className="w-6 h-6 text-primary" />
            </div>
            
            <div className="space-y-4">
              {recentFiles.map((file, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                >
                  <div className="flex-1">
                    <p className="font-medium mb-1">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {file.piiFound > 0 ? `${file.piiFound} PII instances found` : 'Processing...'}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-1 ${
                      file.status === "Completed" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-secondary/10 text-secondary"
                    }`}>
                      {file.status}
                    </span>
                    <p className="text-xs text-muted-foreground">{file.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* System Health */}
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
                  <span className="text-sm font-medium">3 files</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Storage Used</span>
                  <span className="text-sm font-medium">64%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '64%' }} />
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Last System Check</p>
                <p className="text-sm font-medium">5 minutes ago</p>
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
