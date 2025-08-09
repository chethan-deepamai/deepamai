import { useState, useRef } from "react";
import UploadArea from "./upload-area";
import ProcessingQueue from "./processing-queue";
import DocumentList from "./document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useDocuments, useUploadDocuments } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";

export default function DocumentManager() {
  const { data: documents = [] } = useDocuments();
  const { mutate: uploadDocuments, isPending } = useUploadDocuments();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const bulkUploadRef = useRef<HTMLInputElement>(null);

  const handleBulkUpload = () => {
    bulkUploadRef.current?.click();
  };

  const handleBulkFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    formData.append('userId', 'default');

    uploadDocuments(formData, {
      onSuccess: (data) => {
        toast({
          title: "Bulk Upload Successful",
          description: `${data.documents.length} file(s) uploaded and queued for processing`,
        });
        // Reset input
        if (bulkUploadRef.current) {
          bulkUploadRef.current.value = '';
        }
      },
      onError: (error) => {
        toast({
          title: "Bulk Upload Failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const processingDocs = documents.filter(doc => doc.status === 'processing');
  const totalDocs = documents.length;
  const indexedDocs = documents.filter(doc => doc.status === 'indexed').length;
  const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="mobile-spacing responsive-container-xl h-full flex flex-col">
      <div className="mb-4 md:mb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Document Manager</h2>
            <p className="text-sm text-gray-600 mt-1">Upload and manage documents for RAG processing</p>
          </div>
          <div className="flex items-center space-x-3">
            <input
              ref={bulkUploadRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.html,.json"
              onChange={handleBulkFileSelect}
              className="hidden"
            />
            <Button 
              className="bg-primary text-white hover:bg-blue-700"
              onClick={handleBulkUpload}
              disabled={isPending}
            >
              <i className="fas fa-upload mr-2"></i>
              {isPending ? 'Uploading...' : 'Bulk Upload'}
            </Button>
            <Button variant="outline">
              <i className="fas fa-sync-alt mr-2"></i>Reindex All
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload and Document Library */}
        <div className="lg:col-span-2 space-y-6">
          <UploadArea />
          
          {processingDocs.length > 0 && (
            <ProcessingQueue documents={processingDocs} />
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Document Library</h3>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                  <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                </div>
                <select 
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value=".pdf">PDF</option>
                  <option value=".md">Markdown</option>
                  <option value=".docx">Word</option>
                  <option value=".txt">Text</option>
                </select>
              </div>
            </div>

            <DocumentList 
              searchTerm={searchTerm}
              fileTypeFilter={fileTypeFilter}
            />
          </div>
        </div>

        {/* Statistics and Settings Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Storage Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Documents</span>
                <span className="text-sm font-medium">{totalDocs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Indexed Documents</span>
                <span className="text-sm font-medium">{indexedDocs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Storage Used</span>
                <span className="text-sm font-medium">{formatFileSize(totalSize)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Processing Queue</span>
                <span className="text-sm font-medium">{processingDocs.length}</span>
              </div>

              {processingDocs.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Processing Progress</span>
                    <span className="text-sm font-medium">
                      {Math.round((indexedDocs / totalDocs) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(indexedDocs / totalDocs) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processing Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="chunkSize">Chunk Size</Label>
                <Input
                  id="chunkSize"
                  type="number"
                  defaultValue={512}
                />
              </div>
              <div>
                <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
                <Input
                  id="chunkOverlap"
                  type="number"
                  defaultValue={50}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="autoReindex" defaultChecked />
                <Label htmlFor="autoReindex" className="text-sm">Auto-reindex on update</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="extractMetadata" />
                <Label htmlFor="extractMetadata" className="text-sm">Extract metadata</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <i className="fas fa-trash-alt mr-2"></i>Clear Index
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <i className="fas fa-download mr-2"></i>Export Index
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <i className="fas fa-cogs mr-2"></i>Optimize Index
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
