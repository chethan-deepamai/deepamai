import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ProcessingQueueProps {
  documents: Document[];
}

export default function ProcessingQueue({ documents }: ProcessingQueueProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case '.pdf':
        return 'fas fa-file-pdf text-red-600';
      case '.docx':
        return 'fas fa-file-word text-blue-600';
      case '.md':
        return 'fas fa-file-alt text-blue-600';
      case '.txt':
        return 'fas fa-file-alt text-gray-600';
      case '.html':
        return 'fas fa-globe text-purple-600';
      case '.json':
        return 'fas fa-file-code text-green-600';
      default:
        return 'fas fa-file text-gray-600';
    }
  };

  const getProcessingMessage = (status: Document['status']) => {
    switch (status) {
      case 'processing':
        return 'Processing embeddings...';
      case 'pending':
        return 'Waiting in queue...';
      case 'error':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  // Simulate progress for demonstration
  const getProgress = (document: Document) => {
    if (document.status === 'error') return 0;
    if (document.status === 'pending') return 10;
    return 65; // Simulated progress for processing documents
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Queue</h3>
      <div className="space-y-3">
        {documents.map((document) => (
          <div key={document.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <i className={getFileTypeIcon(document.fileType)}></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{document.originalName}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(document.fileSize)} • {getProcessingMessage(document.status)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-24">
                    <Progress 
                      value={getProgress(document)} 
                      className="h-2"
                    />
                  </div>
                  <span className="text-xs text-gray-600">{getProgress(document)}%</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-600"
                  title="Cancel"
                >
                  <i className="fas fa-times"></i>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
