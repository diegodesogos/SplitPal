import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Plus } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  participants: string[];
  createdAt: string;
}

export default function Groups() {
  const { activeGroupId, setActiveGroupId, currentUserId } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [participantEmails, setParticipantEmails] = useState("");

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"], // FIX: Added /api prefix
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/users", currentUserId, "groups"], // FIX: Added /api prefix
  });

  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ["/api/groups", activeGroupId, "expenses"], // FIX: Added /api prefix
    enabled: !!activeGroupId,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/groups", data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUserId, "groups"] }); // FIX: Added /api prefix
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] }); // FIX: Added /api prefix
      toast({
        title: "Group created",
        description: "Your new group has been created successfully.",
      });
      setShowCreateDialog(false);
      setGroupName("");
      setGroupDescription("");
      setParticipantEmails("");
      
      // Switch to the new group
      if (response && typeof response === 'object' && 'id' in response) {
        setActiveGroupId(response.id as string);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getUserById = (id: string) => users.find(u => u.id === id);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group.",
        variant: "destructive",
      });
      return;
    }

    // Parse participant emails and find corresponding user IDs
    const emails = participantEmails
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);
    
    const participantIds = [currentUserId]; // Always include the creator
    
    emails.forEach(email => {
      const user = users.find(u => u.email.toLowerCase() === email);
      if (user && !participantIds.includes(user.id)) {
        participantIds.push(user.id);
      }
    });

    createGroupMutation.mutate({
      name: groupName.trim(),
      description: groupDescription.trim() || undefined,
      createdBy: currentUserId,
      participants: participantIds,
    });
  };

  const handleSwitchToGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    toast({
      title: "Group switched",
      description: "You've switched to this group.",
    });
  };

  const getTotalSpent = (groupId: string) => {
    if (groupId !== activeGroupId) return 0;
    return expenses.reduce((total: number, expense: any) => total + parseFloat(expense.amount), 0);
  };

  return (
    <div className="mx-4 mt-4" data-testid="groups-view">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Your Groups</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-group">
              <Plus className="w-4 h-4 mr-2" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid="modal-create-group">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  placeholder="e.g., Weekend Trip, Roommates, etc."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  data-testid="input-group-name"
                />
              </div>
              
              <div>
                <Label htmlFor="groupDescription">Description</Label>
                <Textarea
                  id="groupDescription"
                  placeholder="What's this group for?"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={2}
                  data-testid="textarea-group-description"
                />
              </div>
              
              <div>
                <Label htmlFor="participants">Invite Participants</Label>
                <Textarea
                  id="participants"
                  placeholder="Enter email addresses separated by commas (e.g., john@example.com, sarah@example.com)"
                  value={participantEmails}
                  onChange={(e) => setParticipantEmails(e.target.value)}
                  rows={3}
                  data-testid="textarea-participant-emails"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only existing users can be added. You will be added automatically.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="button-cancel-create-group"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createGroupMutation.isPending}
                  data-testid="button-submit-create-group"
                >
                  {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No groups yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first group to start splitting expenses with friends
              </p>
              <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-group">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => {
            const isActive = group.id === activeGroupId;
            const totalSpent = getTotalSpent(group.id);

            return (
              <Card key={group.id} className={isActive ? "ring-2 ring-primary" : ""} data-testid={`card-group-${group.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-foreground">{group.name}</h3>
                          {isActive && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {group.participants.length} members • 
                          Created {new Date(group.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center mt-2 space-x-1">
                          {group.participants.slice(0, 4).map((userId, index) => {
                            const user = getUserById(userId);
                            return user ? (
                              <div 
                                key={userId}
                                className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center -ml-1 border-2 border-background"
                                style={{ zIndex: 10 - index }}
                                title={user.name}
                              >
                                <span className="text-xs font-medium text-secondary-foreground">
                                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 1)}
                                </span>
                              </div>
                            ) : null;
                          })}
                          {group.participants.length > 4 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{group.participants.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        ${totalSpent.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Total spent</div>
                      {!isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-primary text-sm h-auto p-0"
                          onClick={() => handleSwitchToGroup(group.id)}
                          data-testid={`button-switch-to-group-${group.id}`}
                        >
                          Switch To
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
