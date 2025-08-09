import DocumentList from "./document-list";
import ContentViewer from "./content-viewer";
import { useState } from "react";
import { Document } from "@/types";

export default function FileViewer() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  return (
    <div className="mobile-spacing responsive-container-xl h-full flex flex-col">
      <div className="mb-4 md:mb-6 flex-shrink-0">
        <div className="responsive-flex-row items-start md:items-center justify-between mobile-gap">
          <div>
            <h2 className="responsive-subheading font-semibold text-gray-900">File Viewer</h2>
            <p className="responsive-body text-gray-600 mt-1">Browse and view embedded documents with chunk visualization</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search content..." 
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-48 md:w-64"
              />
              <i className="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
            </div>
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option>All Documents</option>
              <option>Recently Viewed</option>
              <option>Most Referenced</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 responsive-flex-col mobile-gap overflow-hidden">
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
          <DocumentList 
            selectedDocument={selectedDocument}
            onSelectDocument={setSelectedDocument}
          />
        </div>
        <div className="flex-1 min-h-0">
          <ContentViewer document={selectedDocument} />
        </div>
      </div>
    </div>
  );
}
