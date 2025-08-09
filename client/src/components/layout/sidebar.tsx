import { TabType } from "@/types";
import StatusIndicator from "@/components/shared/status-indicator";
import { useSystemStatus } from "@/hooks/use-config";

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { data: systemStatus } = useSystemStatus();

  const tabs = [
    { id: 'chat' as TabType, label: 'Chat Interface', icon: 'fas fa-comments' },
    { id: 'config' as TabType, label: 'Configuration', icon: 'fas fa-cog' },
    { id: 'documents' as TabType, label: 'Document Manager', icon: 'fas fa-file-alt' },
    { id: 'file-viewer' as TabType, label: 'File Viewer', icon: 'fas fa-eye' },
    { id: 'history' as TabType, label: 'Chat History', icon: 'fas fa-history' },
  ];

  return (
    <div className="w-64 lg:w-72 xl:w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col h-screen">
      {/* Logo and Title */}
      <div className="p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-robot text-white text-sm md:text-lg"></i>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm md:text-lg font-semibold text-gray-900 truncate">AI Chat Platform</h1>
            <p className="text-xs text-gray-500 truncate">RAG Configuration</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 md:p-4 scrollable-full">
        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'text-primary bg-blue-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <i className={`${tab.icon} flex-shrink-0`}></i>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Provider Status Panel */}
      <div className="p-3 md:p-4 border-t border-gray-200 flex-shrink-0">
        <h3 className="text-xs md:text-sm font-medium text-gray-900 mb-2 md:mb-3">System Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">LLM Provider</span>
            <StatusIndicator 
              status={systemStatus?.llmStatus ? 'success' : 'error'} 
              label={systemStatus?.llmStatus ? 'OpenAI Active' : 'Disconnected'} 
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Vector DB</span>
            <StatusIndicator 
              status={systemStatus?.vectorStatus ? 'success' : 'error'} 
              label={systemStatus?.vectorStatus ? 'FAISS Ready' : 'Disconnected'} 
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Documents</span>
            <StatusIndicator 
              status={systemStatus?.documentCount ? 'success' : 'warning'} 
              label={`${systemStatus?.documentCount || 0} docs`} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
