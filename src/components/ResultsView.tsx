import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, FileText, Image, AlertCircle, CheckCircle2 } from "lucide-react";
import api from '@/lib/api';

const ResultsView = () => {
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const fetchResults = async () => {
          try {
              const response = await api.get('/results');
              setAnalysisResults(response.data);
          } catch (error) {
              console.error("Error fetching results:", error);
          } finally {
              setIsLoading(false);
          }
      };
      fetchResults();
  }, []);

  if (isLoading) {
    return (
        <div className="min-h-screen py-12 px-6 text-center">
            <p>Loading analysis results...</p>
        </div>
    );
  }

  if (!analysisResults.length) {
    return (
        <div className="min-h-screen py-12 px-6 text-center">
            <p>No analysis results found yet. Upload some files to get started!</p>
        </div>
    );
  }

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
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {analysisResults.map((result) => (
              <Card key={result._id} className="p-6 border-border hover:border-primary/50 transition-all">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      {result.fileId?.fileType?.includes("image") ? (
                        <Image className="w-6 h-6 text-primary" />
                      ) : (
                        <FileText className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">{result.fileId?.originalFileName || 'File Name Unavailable'}</h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {result.fileId?.fileType || 'N/A'}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-sm text-primary">Processing Complete</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-start sm:self-center">
                    {/* FIX: Implement View button with a Dialog modal */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Analysis for: {result.fileId?.originalFileName}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 mt-4">
                            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                                <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="w-5 h-5 text-destructive" />
                                <h4 className="font-semibold">PII Detected & Redacted</h4>
                                </div>
                                <ul className="space-y-2">
                                {Object.entries(result.piiDetected || {}).map(([key, value]) => (
                                    value > 0 && <li key={key} className="text-sm text-muted-foreground">{`${key}: ${value}`}</li>
                                ))}
                                {Object.keys(result.piiDetected || {}).length === 0 && <li className="text-sm text-muted-foreground">No PII was detected.</li>}
                                </ul>
                            </div>
                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                                <h4 className="font-semibold">Key Insights</h4>
                                </div>
                                <ul className="space-y-2">
                                {(result.keyFindings || []).map((insight, i) => (
                                    <li key={i} className="text-sm text-muted-foreground">{insight}</li>
                                ))}
                                {(result.keyFindings || []).length === 0 && <li className="text-sm text-muted-foreground">No specific insights were generated.</li>}
                                </ul>
                            </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* FIX: Correctly structure the download button */}
                    <Button asChild variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">
                      <a href={`/api/results/${result.fileId?._id}/download`} download>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ResultsView;