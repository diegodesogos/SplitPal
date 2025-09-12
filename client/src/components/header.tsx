import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/app-context";
import { Bell } from "lucide-react";
import GroupSwitcherModal from "./group-switcher-modal";
import { useState } from "react";

interface Group {
  id: string;
  name: string;
  participants: string[];
}

export default function Header() {
  const { activeGroupId } = useAppContext();
  const [showGroupSwitcher, setShowGroupSwitcher] = useState(false);

  const { data: group } = useQuery<Group>({
    queryKey: ["/api/groups", activeGroupId],
    enabled: !!activeGroupId,
  });

  return (
    <>
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-40" data-testid="header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <i className="fas fa-users text-primary-foreground text-sm"></i>
            </div>
            <div>
              <button 
                onClick={() => setShowGroupSwitcher(true)}
                className="text-left"
                data-testid="button-switch-group"
              >
                <h1 className="text-lg font-semibold text-foreground">
                  {group?.name || "Loading..."}
                </h1>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span data-testid="text-participant-count">
                    {group?.participants.length || 0} people
                  </span>
                  <i className="fas fa-chevron-down ml-1 text-xs"></i>
                </div>
              </button>
            </div>
          </div>
          <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" data-testid="button-notifications">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <GroupSwitcherModal 
        isOpen={showGroupSwitcher} 
        onClose={() => setShowGroupSwitcher(false)} 
      />
    </>
  );
}
