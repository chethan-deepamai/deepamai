import { ChatSession } from "@/types";
import { useChatMessages } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface ConversationDetailsProps {
  session: ChatSession | null;
}

export default function ConversationDetails({ session }: ConversationDetailsProps) {
  const { data: messages = [] } = useChatMessages(session?.id);

  if (!session) {
    return (
      <div className="flex-1 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-comments text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversation Selected</h3>
          <p className="text-gray-500">Select a conversation from the list to view its details</p>
        </div>
      </div>
    );
  }

  const userMessages = messages.filter(m => m.role === 'user').length;
  const assistantMessages = messages.filter(m => m.role === 'assistant').length;

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Conversation Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{session.title}</h3>
            <p className="text-xs text-gray-500">
              Started {format(new Date(session.createdAt), 'MMM d, yyyy')} • {messages.length} messages
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" title="Export conversation">
              <i className="fas fa-download"></i>
            </Button>
            <Button variant="ghost" size="sm" title="Continue conversation">
              <i className="fas fa-play"></i>
            </Button>
            <Button variant="ghost" size="sm" title="Delete conversation" className="text-red-600 hover:text-red-700">
              <i className="fas fa-trash-alt"></i>
            </Button>
          </div>
        </div>
      </div>

      {/* Conversation Messages */}
      <ScrollArea className="h-full p-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-comment-slash text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Messages</h3>
            <p className="text-gray-500">This conversation appears to be empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              
              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl ${isUser ? 'max-w-3xl' : 'max-w-4xl'}`}>
                    <div className={`rounded-lg px-4 py-3 ${
                      isUser 
                        ? 'bg-primary text-white' 
                        : 'bg-white border border-gray-200 shadow-sm'
                    }`}>
                      <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}>
                        <p className={isUser ? 'text-white' : 'text-gray-800'}>
                          {message.content}
                        </p>
                      </div>
                      
                      {/* Citations for assistant messages */}
                      {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <h4 className="text-xs font-medium text-gray-500 mb-2">Sources:</h4>
                          <div className="flex flex-wrap gap-2">
                            {message.metadata.sources.map((source, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                              >
                                <i className="fas fa-file-alt mr-1"></i>
                                {source.metadata?.filename || `Source ${index + 1}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
                      {format(new Date(message.createdAt), 'h:mm a')}
                      {message.metadata?.usage && !isUser && (
                        <span className="ml-2">
                          • {message.metadata.usage.totalTokens} tokens
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
