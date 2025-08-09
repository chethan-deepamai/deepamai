import { TabType } from "@/types";
import { useSystemStatus } from "@/hooks/use-config";

interface HeaderProps {
  activeTab: TabType;
  onMenuClick?: () => void;
}

const tabTitles: Record<TabType, string> = {
  'chat': 'Chat Interface',
  'config': 'Configuration',
  'documents': 'Document Manager',
  'file-viewer': 'File Viewer',
  'history': 'Chat History',
};

export default function Header({ activeTab, onMenuClick }: HeaderProps) {
  const { data: systemStatus } = useSystemStatus();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <i className="fas fa-bars"></i>
          </button>
          <h2 className="responsive-subheading font-semibold text-gray-900 truncate">
            {tabTitles[activeTab]}
          </h2>
          <div className="flex items-center space-x-1 md:space-x-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-1 md:px-2.5 md:py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <i className="fas fa-database mr-1"></i>
              <span className="hidden sm:inline">{systemStatus?.documentCount || 0} docs</span>
              <span className="sm:hidden">{systemStatus?.documentCount || 0}</span>
            </span>
            {systemStatus?.hasActiveConfig && (
              <span className="inline-flex items-center px-2 py-1 md:px-2.5 md:py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <i className="fas fa-check-circle mr-1"></i>
                <span className="hidden sm:inline">RAG Enabled</span>
                <span className="sm:hidden">RAG</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md" title="Settings">
              <i className="fas fa-cog"></i>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md" title="Help">
              <i className="fas fa-question-circle"></i>
            </button>
          </div>
          <div className="hidden md:block h-8 w-px bg-gray-300"></div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <i className="fas fa-user text-xs md:text-sm text-gray-600"></i>
            </div>
            <span className="hidden sm:inline text-sm text-gray-700">Admin User</span>
          </div>
        </div>
      </div>
    </header>
  );
}
