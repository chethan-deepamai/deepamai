import { ChatSession } from "@/types";
import { useChatSessions, useDeleteChatSession } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday, isThisWeek, subDays } from "date-fns";

interface ConversationListProps {
  selectedSession: ChatSession | null;
  onSelectSession: (session: ChatSession) => void;
  searchTerm: string;
  timeFilter: string;
}

export default function ConversationList({ 
  selectedSession, 
  onSelectSession, 
  searchTerm, 
  timeFilter 
}: ConversationListProps) {
  const { data: sessions = [] } = useChatSessions();
  const { mutate: deleteSession } = useDeleteChatSession();
  const { toast } = useToast();

  const filterByTime = (session: ChatSession) => {
    const sessionDate = new Date(session.updatedAt);
    const now = new Date();

    switch (timeFilter) {
      case 'today':
        return isToday(sessionDate);
      case '7days':
        return sessionDate >= subDays(now, 7);
      case '30days':
        return sessionDate >= subDays(now, 30);
      case 'all':
      default:
        return true;
    }
  };

  const filteredSessions = sessions
    .filter(session => 
      session.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      filterByTime(session)
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const formatSessionDate = (date: string) => {
    const sessionDate = new Date(date);
    
    if (isToday(sessionDate)) {
      return format(sessionDate, 'h:mm a');
    } else if (isYesterday(sessionDate)) {
      return 'Yesterday';
    } else if (isThisWeek(sessionDate)) {
      return format(sessionDate, 'EEEE');
    } else {
      return format(sessionDate, 'MMM d');
    }
  };

  const handleDeleteSession = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirm(`Delete conversation "${session.title}"?`)) {
      deleteSession(session.id, {
        onSuccess: () => {
          if (selectedSession?.id === session.id) {
            onSelectSession(null as any);
          }
          toast({
            title: "Conversation Deleted",
            description: `"${session.title}" has been deleted`,
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

  if (filteredSessions.length === 0) {
    return (
      <div className="w-80 bg-white border border-gray-200 rounded-lg p-6 text-center">
        <i className="fas fa-comments text-4xl text-gray-400 mb-4"></i>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversations</h3>
        <p className="text-sm text-gray-500">
          {searchTerm || timeFilter !== '30days' 
            ? 'No conversations match your current filters'
            : 'Start a new chat to see conversations here'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Conversations</h3>
      </div>
      <div className="overflow-y-auto h-full custom-scrollbar">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session)}
            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
              selectedSession?.id === session.id 
                ? 'bg-blue-50 border-l-4 border-l-primary' 
                : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatSessionDate(session.updatedAt)}
                </p>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  Click to view conversation details
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleDeleteSession(session, e)}
                className="ml-2 text-gray-400 hover:text-red-600 p-1"
              >
                <i className="fas fa-times text-xs"></i>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
