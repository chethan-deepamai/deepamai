import MessageList from "./message-list";
import ChatInput from "./chat-input";
import ContextPanel from "./context-panel";

export default function ChatInterface() {
  return (
    <div className="flex-1 flex h-full responsive-flex-col">
      <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
        <div className="flex-1 scrollable-full">
          <MessageList />
        </div>
        <div className="flex-shrink-0">
          <ChatInput />
        </div>
      </div>
      <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
        <ContextPanel />
      </div>
    </div>
  );
}
