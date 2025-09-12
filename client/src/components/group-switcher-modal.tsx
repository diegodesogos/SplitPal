import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/app-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Check, Plus } from "lucide-react";
import { useLocation } from "wouter";

interface Group {
  id: string;
  name: string;
  participants: string[];
}

interface GroupSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GroupSwitcherModal({ isOpen, onClose }: GroupSwitcherModalProps) {
  const { activeGroupId, setActiveGroupId, currentUserId } = useAppContext();
  const [, setLocation] = useLocation();

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/users", currentUserId, "groups"],
  });

  const handleSelectGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    onClose();
  };

  const handleCreateNewGroup = () => {
    onClose();
    setLocation("/groups");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-group-switcher">
        <DialogHeader>
          <DialogTitle className="text-center">Switch Group</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleSelectGroup(group.id)}
              className="w-full p-4 bg-secondary rounded-lg text-left hover:bg-accent transition-colors"
              data-testid={`button-select-group-${group.id}`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{group.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {group.participants.length} members
                  </p>
                </div>
                {group.id === activeGroupId && (
                  <div className="text-right">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <Button
          onClick={handleCreateNewGroup}
          className="w-full mt-6"
          data-testid="button-create-new-group"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Group
        </Button>
      </DialogContent>
    </Dialog>
  );
}
