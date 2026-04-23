import React, { useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle2, GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useToast } from '@/hooks/use-toast';

interface ComparisonUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComparisonUpload({ open, onOpenChange }: ComparisonUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const { uploadNewDataForComparison, validation } = usePortfolio();
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    setFileError(null);
    
    const isCSV = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
    if (!isCSV) {
      setFileError('Please upload a CSV file.');
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file exported from Collectr.",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);

    try {
      const content = await file.text();
      uploadNewDataForComparison(content);
      toast({
        title: "Comparison data uploaded",
        description: "Your new portfolio is being compared to the previous one.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error reading file:', error);
      setFileError('Failed to read file. Please try again.');
      toast({
        title: "Upload failed",
        description: "Failed to read file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [uploadNewDataForComparison, toast, onOpenChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Upload New Portfolio for Comparison</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-2">
            Upload your updated portfolio CSV. We'll compare it to your current data and highlight what changed.
          </DialogDescription>
        </DialogHeader>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer mt-4",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-secondary/30",
            isProcessing && "pointer-events-none opacity-70"
          )}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />

          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
              isDragging ? "bg-primary/20" : "bg-secondary"
            )}>
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className={cn(
                  "w-6 h-6 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {isProcessing ? 'Processing...' : 'Drop your new CSV here'}
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
            </div>

            {fileName && !isProcessing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 text-xs">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground">{fileName}</span>
              </div>
            )}
          </div>
        </div>

        {fileError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mt-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{fileError}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
