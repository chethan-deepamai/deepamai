import { useActiveConfiguration } from "@/hooks/use-config";
import { useCurrentChatMessages } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ContextPanel() {
  const { data: config } = useActiveConfiguration();
  const { data: messages = [] } = useCurrentChatMessages();

  const lastAssistantMessage = messages
    .filter(m => m.role === 'assistant')
    .pop();

  const relevantSources = lastAssistantMessage?.metadata?.sources || [];

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6">
      <div className="space-y-6">
        {/* Current Session Info */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Current Session</h3>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Model:</span>
              <span className="font-medium">{config?.llmConfig?.model || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Temperature:</span>
              <span className="font-medium">{config?.llmConfig?.temperature || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Max Tokens:</span>
              <span className="font-medium">{config?.llmConfig?.maxTokens || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Vector DB:</span>
              <span className="font-medium">{config?.vectorProvider.toUpperCase() || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Recent Context */}
        {relevantSources.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Retrieved Context</h3>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {relevantSources.slice(0, 3).map((source, index) => {
                  const relevanceLevel = source.score > 0.9 ? 'high' : source.score > 0.8 ? 'medium' : 'low';
                  const bgColor = relevanceLevel === 'high' ? 'bg-green-50 border-green-200' : 
                                relevanceLevel === 'medium' ? 'bg-blue-50 border-blue-200' : 
                                'bg-yellow-50 border-yellow-200';
                  const textColor = relevanceLevel === 'high' ? 'text-green-800' : 
                                  relevanceLevel === 'medium' ? 'text-blue-800' : 
                                  'text-yellow-800';
                  
                  return (
                    <div key={index} className={`border rounded p-2 ${bgColor}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${textColor}`}>
                          {relevanceLevel === 'high' ? 'High Relevance' : 
                           relevanceLevel === 'medium' ? 'Medium Relevance' : 
                           'Low Relevance'}
                        </span>
                        <span className={`text-xs ${textColor.replace('800', '600')}`}>
                          {source.score.toFixed(2)}
                        </span>
                      </div>
                      <p className={`text-xs ${textColor.replace('800', '700')} line-clamp-2`}>
                        {source.content.substring(0, 100)}...
                      </p>
                      <p className={`text-xs ${textColor.replace('800', '600')} mt-1`}>
                        {source.metadata?.filename || 'Unknown source'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {/* TODO: Implement clear chat */}}
            >
              <i className="fas fa-trash-alt mr-2"></i>Clear Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {/* TODO: Implement export */}}
            >
              <i className="fas fa-download mr-2"></i>Export Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {/* TODO: Implement regenerate */}}
            >
              <i className="fas fa-redo mr-2"></i>Regenerate Last
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
