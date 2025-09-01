import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InsertGroup } from "@shared/schema";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (group?: any) => void;
}

export function CreateGroupModal({ open, onOpenChange, onSuccess }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const { toast } = useToast();

  const createGroupMutation = useMutation({
    mutationFn: async (data: InsertGroup) => {
      const response = await apiRequest('POST', '/api/groups', data);
      return response.json();
    },
    onSuccess: (group) => {
      resetForm();
      onOpenChange(false);
      onSuccess?.(group);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create group", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const resetForm = () => {
    setGroupName("");
    setPlayerNames(["", "", "", ""]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validPlayerNames = playerNames.filter(name => name.trim() !== "");
    
    if (!groupName.trim()) {
      toast({ title: "Group name is required", variant: "destructive" });
      return;
    }
    
    if (validPlayerNames.length < 2) {
      toast({ title: "At least 2 players are required", variant: "destructive" });
      return;
    }

    // Predefined colors for players
    const playerColors = [
      "#0EA5E9", // Sky blue
      "#10B981", // Emerald green  
      "#F59E0B", // Amber
      "#EF4444", // Red
    ];

    const players = validPlayerNames.map((name, index) => ({
      id: `player-${Date.now()}-${index}`,
      name: name.trim(),
      initials: name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3),
      color: playerColors[index] || "#6B7280" // Default gray if more than 4 players
    }));

    createGroupMutation.mutate({
      name: groupName.trim(),
      players,
      cardValues: {
        camel: 2,
        fish: 2,
        roadrunner: 2,
        ghost: 2,
        skunk: 2,
        snake: 2,
        yeti: 2
      },
      customCards: [],
      groupPhoto: null
    });
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    const newPlayerNames = [...playerNames];
    newPlayerNames[index] = value;
    setPlayerNames(newPlayerNames);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-800">Create New Group</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </Label>
            <Input
              id="groupName"
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full"
              required
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Add Players
            </Label>
            <div className="space-y-2">
              {playerNames.map((name, index) => (
                <Input
                  key={index}
                  type="text"
                  placeholder={`Player ${index + 1} name${index < 2 ? ' (required)' : ''}`}
                  value={name}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                  className="w-full"
                  required={index < 2}
                />
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createGroupMutation.isPending}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}