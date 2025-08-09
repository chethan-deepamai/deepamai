import { Document } from "@/types";
import { useDocuments } from "@/hooks/use-documents";
import { format } from "date-fns";

interface DocumentListProps {
  selectedDocument: Document | null;
  onSelectDocument: (document: Document) => void;
}

export default function DocumentList({ selectedDocument, onSelectDocument }: DocumentListProps) {
  const { data: documents = [] } = useDocuments();

  const indexedDocuments = documents.filter(doc => doc.status === 'indexed' || doc.status === 'processing');
  
  // Debug logging removed

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (indexedDocuments.length === 0) {
    return (
      <div className="w-80 bg-white border border-gray-200 rounded-lg p-6 text-center">
        <i className="fas fa-file-alt text-4xl text-gray-400 mb-4"></i>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
        <p className="text-sm text-gray-500">Upload and index some documents to view them here</p>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-80 xl:w-96 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full max-h-96 lg:max-h-full">
      <div className="p-3 md:p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="responsive-body font-medium text-gray-900">Documents</h3>
      </div>
      <div className="flex-1 scrollable-area visible-scrollbar">
        {indexedDocuments.map((document) => (
          <div
            key={document.id}
            onClick={() => onSelectDocument(document)}
            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
              selectedDocument?.id === document.id 
                ? 'bg-blue-50 border-l-4 border-l-primary' 
                : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <i className={getFileTypeIcon(document.fileType)}></i>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {document.originalName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {document.status === 'processing' 
                    ? `Processing... • ${formatFileSize(document.fileSize)}`
                    : `${document.chunks?.length || 0} chunks • ${formatFileSize(document.fileSize)}`
                  }
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedDocument?.id === document.id 
                    ? 'Currently viewing'
                    : `Last accessed ${format(new Date(document.uploadedAt), 'MMM d')}`
                  }
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
