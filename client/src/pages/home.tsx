import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ChatInterface from "@/components/chat/chat-interface";
import ConfigurationPanel from "@/components/config/configuration-panel";
import DocumentManager from "@/components/documents/document-manager";
import FileViewer from "@/components/file-viewer/file-viewer";
import ChatHistory from "@/components/history/chat-history";
import { TabType } from "@/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface />;
      case 'config':
        return <ConfigurationPanel />;
      case 'documents':
        return <DocumentManager />;
      case 'file-viewer':
        return <FileViewer />;
      case 'history':
        return <ChatHistory />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="lg:hidden">
          <div 
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-full max-w-xs">
            <Sidebar 
              activeTab={activeTab} 
              onTabChange={(tab) => {
                setActiveTab(tab);
                setSidebarOpen(false);
              }} 
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header 
          activeTab={activeTab} 
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-hidden">
          <div className="h-full scrollable-full">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
