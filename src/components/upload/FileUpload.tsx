import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const { uploadData, validation, detectedColumns } = usePortfolio();
  const { toast } = useToast();

  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const MAX_ROW_COUNT = 10_000;

  const handleFile = useCallback(async (file: File) => {
    setFileError(null);
    
    // Check file type
    const isCSV = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
    if (!isCSV) {
      const errorMsg = `Invalid file type: "${file.name}". Please upload a CSV file.`;
      setFileError(errorMsg);
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file exported from Collectr.",
        variant: "destructive",
      });
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const errorMsg = `File too large (${sizeMB} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`;
      setFileError(errorMsg);
      toast({
        title: "File too large",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);

    try {
      const content = await file.text();

      // Check row count
      const lineCount = content.split('\n').filter(line => line.trim().length > 0).length - 1; // subtract header
      if (lineCount > MAX_ROW_COUNT) {
        setFileError(`Too many rows (${lineCount.toLocaleString()}). Maximum allowed is ${MAX_ROW_COUNT.toLocaleString()} items.`);
        toast({
          title: "Too many rows",
          description: `Your file has ${lineCount.toLocaleString()} rows. Maximum is ${MAX_ROW_COUNT.toLocaleString()}.`,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      uploadData(content);
      toast({
        title: "File uploaded",
        description: "Processing your portfolio data...",
      });
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
  }, [uploadData, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
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
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer",
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

        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
            isDragging ? "bg-primary/20" : "bg-secondary"
          )}>
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className={cn(
                "w-7 h-7 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              {isProcessing ? 'Processing...' : 'Drop your Collectr export here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse • CSV files supported
            </p>
            <p className="text-xs text-muted-foreground mt-3 max-w-md leading-relaxed">
              You can upload with or without cost basis. Profit analysis is only available when cost basis is provided. Please consider reviewing and updating your data before uploading — the more accurate it is, the more helpful the insights.
            </p>
          </div>

          {fileName && !isProcessing && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{fileName}</span>
            </div>
          )}
        </div>
      </div>

      {/* File Type Error */}
      {fileError && (
        <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{fileError}</p>
        </div>
      )}

      {/* Validation Results */}
      {validation && (
        <div className="mt-6 space-y-3 animate-fade-in">
          {validation.isValid ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">Data validated successfully</p>
                <p className="text-xs text-success/80 mt-0.5">
                  All numeric fields parsed and totals verified
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {validation.errors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20"
                >
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              ))}

              {/* Show detected columns for debugging */}
              {detectedColumns && detectedColumns.headers.length > 0 && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Column Detection</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      <span className="text-foreground font-medium">Your columns: </span>
                      {detectedColumns.headers.join(', ')}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
                      {Object.entries(detectedColumns.detected).map(([field, column]) => (
                        <div key={field} className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            column ? "bg-success" : "bg-destructive"
                          )} />
                          <span className="text-muted-foreground capitalize">
                            {field.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className={column ? "text-foreground" : "text-destructive"}>
                            {column || 'Not found'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    Check that your CSV has columns for Product Name, Quantity, and Market Price.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
