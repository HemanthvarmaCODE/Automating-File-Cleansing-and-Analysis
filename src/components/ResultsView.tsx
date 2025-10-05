import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, FileText, Image, AlertCircle, CheckCircle2 } from "lucide-react";
import axios from 'axios';
import api from '@/lib/api';
const ResultsView = () => {
  const [analysisResults, setAnalysisResults] = useState([]);

  useEffect(() => {
      const fetchResults = async () => {
          try {
              const response = await api.get('/results');
              setAnalysisResults(response.data);
          } catch (error) {
              console.error("Error fetching results:", error);
          }
      };
      fetchResults();
  }, []);

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Analysis Results
          </h1>
          <p className="text-muted-foreground text-lg">
            Review cleansed files and extracted insights
          </p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="all">All Files</TabsTrigger>
            <TabsTrigger value="csv">CSV</TabsTrigger>
            <TabsTrigger value="pdf">Documents</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {analysisResults.map((result, idx) => (
              <Card key={idx} className="p-6 border-border hover:border-primary/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      {result.fileType === "Image" ? (
                        <Image className="w-6 h-6 text-primary" />
                      ) : (
                        <FileText className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold mb-1">{result.fileName}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{result.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {result.fileType}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-sm text-primary">Processing Complete</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10" onClick={() => window.location.href = `/api/results/${result.fileId}/download`}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  {/* PII Found */}
                  <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <h4 className="font-semibold">PII Detected & Redacted</h4>
                    </div>
                    <ul className="space-y-2">
                      {result.piiFound.map((pii, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                          {pii}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Key Insights */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">Key Insights</h4>
                    </div>
                    <ul className="space-y-2">
                      {result.insights.map((insight, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="csv">
            <p className="text-center text-muted-foreground py-12">
              CSV files will appear here
            </p>
          </TabsContent>

          <TabsContent value="pdf">
            <p className="text-center text-muted-foreground py-12">
              Document files will appear here
            </p>
          </TabsContent>

          <TabsContent value="images">
            <p className="text-center text-muted-foreground py-12">
              Image files will appear here
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ResultsView;