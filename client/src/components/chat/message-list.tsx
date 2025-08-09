import { useCurrentChatMessages } from "@/hooks/use-chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/types";
import { format } from "date-fns";
import { useEffect } from "react";

export default function MessageList() {
  const { data: messages = [], isLoading } = useCurrentChatMessages();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      const element = document.getElementById('messages-end');
      if (element && messages.length > 0) {
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    };
    
    // Small delay to ensure DOM is updated
    setTimeout(scrollToBottom, 100);
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <i className="fas fa-robot text-4xl text-blue-600 mb-4"></i>
            <h3 className="text-lg font-medium text-blue-900 mb-2">Welcome to AI Chat Platform</h3>
            <p className="text-sm text-blue-800">
              Your RAG system is ready. Ask me anything about your documents!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full mobile-spacing scrollable-full">
      <div className="space-y-4 responsive-container-lg">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {/* Auto-scroll anchor */}
        <div className="h-1" id="messages-end" />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'max-w-3xl' : 'max-w-4xl'}`}>
        <div className={`rounded-lg px-4 py-3 ${
          isUser 
            ? 'bg-primary text-white' 
            : 'bg-white border border-gray-200 shadow-sm'
        }`}>
          <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}>
            <p className={isUser ? 'text-white' : 'text-gray-800'}>{message.content}</p>
          </div>
          
          {/* Citations for assistant messages */}
          {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 mb-2">Sources:</h4>
              <div className="flex flex-wrap gap-2">
                {message.metadata.sources.map((source, index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    <i className="fas fa-file-alt mr-1"></i>
                    {source.metadata?.filename || `Source ${index + 1}`}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {format(new Date(message.createdAt), 'h:mm a')}
          {message.metadata?.usage && !isUser && (
            <span className="ml-2">
              • Generated in {((message.metadata.usage.totalTokens || 0) / 1000).toFixed(1)}s
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
