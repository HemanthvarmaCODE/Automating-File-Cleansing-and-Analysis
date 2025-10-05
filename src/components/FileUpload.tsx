import { useState, useEffect } from "react";
import { Upload, FileText, Image, FileSpreadsheet, FileType, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import api from '@/lib/api';

interface UploadedFile {
  _id: string;
  originalFileName: string;
  type: string;
  fileSize: number;
  status: "uploading" | "processing" | "completed" | "error";
}

const FileUpload = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      files.forEach(async (file) => {
        if (file.status === 'processing') {
          try {
            const response = await api.get(`/files/${file._id}/status`);
            if (response.data.status !== 'processing') {
              setFiles((prev) =>
                prev.map((f) =>
                  f._id === file._id ? { ...f, status: response.data.status } : f
                )
              );
            }
          } catch (error) {
            console.error("Error fetching file status:", error);
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [files]);

  const getFileIcon = (type: string) => {
    if (!type) return FileText;
    if (type.includes("image")) return Image;
    if (type.includes("sheet") || type.includes("csv")) return FileSpreadsheet;
    if (type.includes("pdf")) return FileType;
    return FileText;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };

  const processFiles = async (fileList: File[]) => {
    const formData = new FormData();
    fileList.forEach((file) => formData.append('files', file));

    try {
      const uploadResponse = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedFiles = uploadResponse.data.uploadedFiles;
      
      const newFiles = uploadedFiles.map(f => ({
        _id: f._id,
        originalFileName: f.originalFileName,
        type: f.fileType,
        fileSize: f.fileSize,
        status: 'processing',
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${fileList.length} file(s) added for processing`);

      for (const file of uploadedFiles) {
        await api.post(`/process/${file._id}`);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("File upload failed.");
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file._id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Upload Files for Cleansing
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload CSV, PDF, PPTX, or image files to remove PII and extract insights
          </p>
        </div>
        <Card
          className={`border-2 border-dashed rounded-2xl p-12 mb-8 transition-all ${
            isDragging
              ? "border-primary bg-primary/5 scale-105"
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Drag & drop files here
            </h3>
            <p className="text-muted-foreground mb-6">
              or click to browse
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
              accept=".csv,.pdf,.pptx,.xlsx,.jpg,.jpeg,.png"
            />
            <label htmlFor="file-input">
              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <span>Select Files</span>
              </Button>
            </label>
            <p className="text-sm text-muted-foreground mt-4">
              Supported formats: CSV, PDF, PPTX, XLSX, JPG, PNG
            </p>
          </div>
        </Card>
        {files.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Processing Queue</h3>
            {files.map((file) => {
              const Icon = getFileIcon(file.type);
              return (
                <Card
                  key={file._id}
                  className="p-4 border-border hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.originalFileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.fileSize)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {file.status === "uploading" && (
                        <div className="flex items-center gap-2 text-accent">
                          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                          <span className="text-sm">Uploading...</span>
                        </div>
                      )}
                      {file.status === "processing" && (
                        <div className="flex items-center gap-2 text-secondary">
                          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                          <span className="text-sm">Processing...</span>
                        </div>
                      )}
                      {file.status === "completed" && (
                        <div className="flex items-center gap-2 text-primary">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm">Completed</span>
                        </div>
                      )}
                      {file.status === "error" && (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="w-5 h-5" />
                          <span className="text-sm">Error</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file._id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
            {files.some(f => f.status === "completed") && (
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
                size="lg"
              >
                View Analysis Results
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;