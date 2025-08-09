import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSendMessage } from "@/hooks/use-chat";
import { useToast } from "@/hooks/use-toast";

export default function ChatInput() {
  const [message, setMessage] = useState("");
  const { mutate: sendMessage, isPending } = useSendMessage();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!message.trim()) return;

    sendMessage({ message: message.trim() }, {
      onSuccess: () => {
        setMessage("");
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 p-6">
      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              className="resize-none pr-12"
              rows={3}
              disabled={isPending}
            />
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || isPending}
              className="absolute bottom-3 right-3 p-2 h-8 w-8"
              size="sm"
            >
              <i className="fas fa-paper-plane"></i>
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span><i className="fas fa-database mr-1"></i>Vector search enabled</span>
              <span><i className="fas fa-history mr-1"></i>Context: Last 5 messages</span>
            </div>
            <div className="text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Shift + Enter</kbd> to send
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
