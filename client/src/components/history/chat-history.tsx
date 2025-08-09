import { useState } from "react";
import ConversationList from "./conversation-list";
import ConversationDetails from "./conversation-details";
import { ChatSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatHistory() {
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("30days");

  return (
    <div className="mobile-spacing responsive-container-xl h-full flex flex-col">
      <div className="mb-4 md:mb-6 flex-shrink-0">
        <div className="responsive-flex-row items-start md:items-center justify-between mobile-gap">
          <div>
            <h2 className="responsive-subheading font-semibold text-gray-900">Chat History</h2>
            <p className="responsive-body text-gray-600 mt-1">Browse and manage conversation history</p>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48 md:w-64"
              />
              <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            </div>
            <select 
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full md:w-auto"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="30days">Last 30 days</option>
              <option value="7days">Last 7 days</option>
              <option value="today">Today</option>
              <option value="all">All time</option>
            </select>
            <Button 
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 w-full md:w-auto"
            >
              <i className="fas fa-trash mr-2"></i>Clear All
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 responsive-flex-col mobile-gap overflow-hidden">
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
          <ConversationList
            selectedSession={selectedSession}
            onSelectSession={setSelectedSession}
            searchTerm={searchTerm}
            timeFilter={timeFilter}
          />
        </div>
        <div className="flex-1 min-h-0">
          <ConversationDetails session={selectedSession} />
        </div>
      </div>
    </div>
  );
}
