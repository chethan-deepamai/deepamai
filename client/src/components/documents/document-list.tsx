import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { useDocuments, useDeleteDocument, useReindexDocument } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DocumentListProps {
  searchTerm: string;
  fileTypeFilter: string;
}

export default function DocumentList({ searchTerm, fileTypeFilter }: DocumentListProps) {
  const { data: documents = [] } = useDocuments();
  const { mutate: deleteDocument } = useDeleteDocument();
  const { mutate: reindexDocument } = useReindexDocument();
  const { toast } = useToast();

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || doc.fileType === fileTypeFilter;
    return matchesSearch && matchesType;
  });

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'indexed':
        return 'fas fa-check-circle text-green-600';
      case 'processing':
        return 'fas fa-spinner fa-spin text-blue-600';
      case 'error':
        return 'fas fa-exclamation-circle text-red-600';
      default:
        return 'fas fa-clock text-yellow-600';
    }
  };

  const getStatusLabel = (status: Document['status']) => {
    switch (status) {
      case 'indexed':
        return 'Indexed';
      case 'processing':
        return 'Processing';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDelete = (document: Document) => {
    if (confirm(`Are you sure you want to delete "${document.originalName}"?`)) {
      deleteDocument(document.id, {
        onSuccess: () => {
          toast({
            title: "Document Deleted",
            description: `${document.originalName} has been deleted`,
          });
        },
        onError: (error) => {
          toast({
            title: "Delete Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleReindex = (document: Document) => {
    reindexDocument(document.id, {
      onSuccess: () => {
        toast({
          title: "Reindexing Started",
          description: `${document.originalName} is being reindexed`,
        });
      },
      onError: (error) => {
        toast({
          title: "Reindex Failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  if (filteredDocuments.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <i className="fas fa-folder-open text-4xl text-gray-400 mb-4"></i>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
        <p className="text-gray-500">
          {searchTerm || fileTypeFilter !== 'all' 
            ? 'No documents match your current filters'
            : 'Upload some documents to get started'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
      <div className="flex-1 scrollable-full visible-scrollbar">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Document
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Chunks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDocuments.map((document) => (
              <tr key={document.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center mr-3">
                      <i className={getFileTypeIcon(document.fileType)}></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{document.originalName}</p>
                      <p className="text-xs text-gray-500">
                        Uploaded {format(new Date(document.uploadedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatFileSize(document.fileSize)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {document.chunks?.length || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    document.status === 'indexed' ? 'bg-green-100 text-green-800' :
                    document.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    document.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    <i className={`${getStatusIcon(document.status)} mr-1`}></i>
                    {getStatusLabel(document.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-blue-700"
                      title="View"
                    >
                      <i className="fas fa-eye"></i>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-gray-600"
                      title="Reindex"
                      onClick={() => handleReindex(document)}
                    >
                      <i className="fas fa-sync-alt"></i>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-600"
                      title="Delete"
                      onClick={() => handleDelete(document)}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
