import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Image, FileSpreadsheet, FileType, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import api from '@/lib/api';

interface QueuedFile {
  originalFileName: string;
  fileType: string;
  fileSize: number;
}

const FileUpload = () => {
  // This state will now hold the files selected from the user's computer
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return Image;
    if (['csv', 'xlsx', 'xls'].includes(extension)) return FileSpreadsheet;
    if (['pdf', 'docx'].includes(extension)) return FileType;
    return FileText;
  };

  const addFilesToQueue = (files: File[]) => {
    // Prevent duplicates and add new files
    const newFiles = files.filter(
      (file) => !selectedFiles.some((existingFile) => existingFile.name === file.name)
    );
    setSelectedFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFilesToQueue(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleProcessBatch = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload.");
      return;
    }
    setIsUploading(true);
    toast.info("Uploading and processing batch... This may take a moment.");

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      // Step 1: Upload all files and create a session
      const uploadResponse = await api.post('/files/upload', formData);
      const { sessionId } = uploadResponse.data;

      if (!sessionId) {
        throw new Error("Failed to create an analysis session.");
      }

      // Step 2: Trigger the processing for the entire session
      await api.post(`/process/${sessionId}`);
      
      // Step 3: On success, notify user and navigate to results
      toast.success("Batch processing complete! Navigating to results.");
      navigate('/results');

    } catch (error) {
      console.error("Error processing batch:", error);
      const errorMessage = error.response?.data?.msg || "An unexpected error occurred.";
      toast.error(`Processing failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setSelectedFiles([]); // Clear the queue after processing
    }
  };

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Upload File Batch</h1>
          <p className="text-muted-foreground text-lg">
            Add individual files or a zip archive to start a new analysis session.
          </p>
        </div>
        <Card
          className={`border-2 border-dashed rounded-2xl p-12 mb-8 transition-all ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Drag & drop files or a zip archive here</h3>
            <p className="text-muted-foreground mb-6">or click to browse</p>
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input">
              <Button asChild className="cursor-pointer">
                <span>Select Files</span>
              </Button>
            </label>
          </div>
        </Card>

        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Files to Process</h3>
            {selectedFiles.map((file, idx) => {
              const Icon = getFileIcon(file.name);
              return (
                <Card key={idx} className="p-4">
                  <div className="flex items-center gap-4">
                    <Icon className="w-6 h-6 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(idx)}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
            <Button
              className="w-full mt-6"
              size="lg"
              onClick={handleProcessBatch}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Analyze Batch"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;