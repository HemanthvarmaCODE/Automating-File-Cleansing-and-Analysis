import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, AlertTriangle } from "lucide-react";
import api from '@/lib/api';

const ResultsView = () => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatestResults = async () => {
      try {
        const response = await api.get('/results/latest');
        setResults(response.data);
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLatestResults();
  }, []);

  const handleDownload = async (resultId: string, fileName: string) => {
    try {
      const response = await api.get(`/results/${resultId}/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };


  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading results...</div>;
  if (results.length === 0) return <div className="p-8 text-center">No results found for the latest session.</div>;

  return (
    <div className="py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Analysis Report</h1>
        <Card className="bg-card/50 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">File Name</TableHead>
                <TableHead>File Description</TableHead> {/* New Column */}
                <TableHead>Vulnerabilities Found</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result._id}>
                  <TableCell className="font-medium">{result.originalFileName}</TableCell>
                  <TableCell className="text-muted-foreground">{result.summary}</TableCell> {/* New Data */}
                  <TableCell>
                    {result.vulnerabilities?.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {result.vulnerabilities.map((vuln, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 mt-1 text-yellow-500" />
                            <div>
                               <p>{vuln.description}</p>
                               <Badge variant={getSeverityBadge(vuln.severity)}>{vuln.severity}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No specific vulnerabilities found.</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" onClick={() => handleDownload(result._id, `cleansed_${result.originalFileName}`)}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default ResultsView;