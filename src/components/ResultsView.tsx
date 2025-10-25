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
import { Download, AlertTriangle } from "lucide-react";
import api from '@/lib/api';

// Define the structure of your result objects based on the Python script
interface Vulnerability {
  description: string;
  severity: string;
}

interface AnalysisResult {
  _id: string;
  originalFileName: string;
  fileType: string;
  summary: string; // This is the "File Description"
  keyFindings: string[]; // The new array from Gemini
  vulnerabilities: Vulnerability[]; // The specific PII list
  cleansedFilePath: string;
}

const ResultsView = () => {
  // Use the new interface for type safety
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatestResults = async () => {
      try {
        const response = await api.get('/results/latest');
        // Assuming response.data is an array of sessions,
        // and we need the 'files' from the latest session.
        // If response.data is already the array of files, this is correct.
        setResults(response.data); 
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLatestResults();
  }, []);

  const handleDownload = async (result: AnalysisResult) => {
    // We need the *cleansed* file path from the result object,
    // which the Python script provides.
    // The server needs an endpoint to serve this file.
    // This is a more robust download handler:
    try {
      // Assuming you have an endpoint that serves the file by its path or ID
      // This implementation assumes the button will trigger a download
      // by *path* which is more complex. Let's stick to your original
      // logic but use the correct cleansed file name.
      
      // Let's assume your original download logic by ID is correct
      // and the backend knows which file to send.
      const cleansedFileName = result.cleansedFilePath ? 
                                 result.cleansedFilePath.split(/\/|\\/).pop() // Get basename
                                 : `cleansed_${result.originalFileName}`;
                                 
      const response = await api.get(`/results/${result._id}/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", cleansedFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };


  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading results...</div>;
  if (!results || results.length === 0) return <div className="p-8 text-center">No results found for the latest session.</div>;

  return (
    <div className="py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Analysis Report</h1>
        
        {/* Removed the Card wrapper for a full-width table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">File Name</TableHead>
              <TableHead className="w-[80px]">File Type</TableHead>
              <TableHead className="w-[40%]">File Description</TableHead>
              <TableHead>Key Findings & Vulnerabilities</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result._id}>
                
                {/* File Name */}
                <TableCell className="font-medium">{result.originalFileName}</TableCell>
                
                {/* File Type */}
                <TableCell>
                  <Badge variant="outline">{result.fileType}</Badge>
                </TableCell>
                
                {/* File Description (from Gemini) */}
                <TableCell className="text-sm text-muted-foreground">
                  {result.summary}
                </TableCell>
                
                {/* Key Findings & Vulnerabilities Cell */}
                <TableCell>
                  {/* 1. Render Key Findings (from Gemini) */}
                  {result.keyFindings && result.keyFindings.length > 0 ? (
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                      {result.keyFindings.map((finding, index) => (
                        <li key={index} className="text-sm">
                          {finding}
                        </li>
                      ))}
                    </ul>
                  ) : (
                     <p className="text-muted-foreground text-sm mb-2">No high-level findings reported.</p>
                  )}
                  
                  {/* 2. Render Specific Vulnerabilities (from NER/Regex) */}
                  {result.vulnerabilities && result.vulnerabilities.length > 0 ? (
                    <div className="flex flex-col gap-2 border-t pt-2">
                      {result.vulnerabilities.map((vuln, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <AlertTriangle className={`w-4 h-4 mt-0.5 ${vuln.severity === 'High' ? 'text-red-500' : 'text-yellow-500'}`} />
                          <div>
                            <p className="text-sm">{vuln.description}</p>
                            <Badge variant={getSeverityBadge(vuln.severity)}>{vuln.severity}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm border-t pt-2">No specific PII vulnerabilities found.</p>
                  )}
                </TableCell>
                
                {/* Actions Button */}
                <TableCell className="text-right">
                  {/* Removed 'asChild' prop, it was incorrect here */}
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(result)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ResultsView;