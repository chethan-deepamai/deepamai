import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface ContentViewerProps {
  document: Document | null;
}

export default function ContentViewer({ document }: ContentViewerProps) {
  const [viewMode, setViewMode] = useState<'chunks' | 'raw'>('chunks');

  if (!document) {
    return (
      <div className="flex-1 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-file-alt text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Selected</h3>
          <p className="text-gray-500">Select a document from the list to view its content</p>
        </div>
      </div>
    );
  }

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

  const copyChunk = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Document Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <i className={getFileTypeIcon(document.fileType)}></i>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{document.originalName}</h3>
              <p className="text-xs text-gray-500">
                {document.chunks?.length || 0} chunks • Last modified {new Date(document.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" title="Download">
              <i className="fas fa-download"></i>
            </Button>
            <Button variant="ghost" size="sm" title="Share">
              <i className="fas fa-share-alt"></i>
            </Button>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-xs text-gray-500">View:</span>
            <Button
              variant={viewMode === 'chunks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chunks')}
              className="text-xs"
            >
              Chunks
            </Button>
            <Button
              variant={viewMode === 'raw' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('raw')}
              className="text-xs"
            >
              Raw
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-full p-6 custom-scrollbar">
        {viewMode === 'chunks' ? (
          <div className="space-y-4">
            {document.chunks && document.chunks.length > 0 ? (
              document.chunks.map((chunk, index) => (
                <div key={chunk.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">Chunk #{index + 1}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {chunk.content.split(' ').length} words
                      </span>
                      <span className="text-xs text-gray-500">
                        Position: {chunk.metadata?.startChar}-{chunk.metadata?.endChar}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyChunk(chunk.content)}
                        className="text-xs text-primary hover:text-blue-700"
                      >
                        <i className="fas fa-copy mr-1"></i>Copy
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-800 whitespace-pre-wrap">{chunk.content}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <i className="fas fa-exclamation-triangle text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Chunks Available</h3>
                <p className="text-gray-500">This document hasn't been processed into chunks yet</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="prose prose-sm max-w-none">
              {document.chunks && document.chunks.length > 0 ? (
                <pre className="whitespace-pre-wrap text-gray-800 font-mono text-sm">
                  {document.chunks.map(chunk => chunk.content).join('\n\n')}
                </pre>
              ) : (
                <p className="text-gray-600">No content available for this document.</p>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
