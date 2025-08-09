import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { useUploadDocuments } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";

export default function UploadArea() {
  const { mutate: uploadDocuments, isPending } = useUploadDocuments();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const formData = new FormData();
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('userId', 'default');

    uploadDocuments(formData, {
      onSuccess: (data) => {
        toast({
          title: "Upload Successful",
          description: `${data.documents.length} file(s) uploaded and queued for processing`,
        });
      },
      onError: (error) => {
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }, [uploadDocuments, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html'],
      'application/json': ['.json'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
    disabled: isPending,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
        isDragActive 
          ? 'border-primary bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      
      <div className="mx-auto max-w-md">
        <i className={`fas fa-cloud-upload-alt text-4xl mb-4 ${
          isDragActive ? 'text-primary' : 'text-gray-400'
        }`}></i>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isPending ? 'Uploading...' : 'Upload Documents'}
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          {isDragActive 
            ? 'Drop the files here...'
            : 'Drag and drop files here, or click to browse'
          }
        </p>
        
        {!isPending && (
          <Button 
            className="bg-primary text-white hover:bg-blue-700"
            type="button"
          >
            Choose Files
          </Button>
        )}
        
        <p className="text-xs text-gray-500 mt-3">
          Supports: PDF, DOCX, TXT, MD, HTML, JSON (Max 50MB per file)
        </p>
      </div>
    </div>
  );
}
