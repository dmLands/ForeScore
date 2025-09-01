import { Button } from "@/components/ui/button";
import { Users, Layers, Trophy, BookOpen, Hash } from "lucide-react";

interface BottomNavigationProps {
  currentTab: 'games' | 'deck' | 'scoreboard' | 'rules' | 'points';
  onTabChange: (tab: 'games' | 'deck' | 'scoreboard' | 'rules' | 'points') => void;
}

export function BottomNavigation({ currentTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'games' as const, label: 'Games', icon: Users },
    { id: 'points' as const, label: '2/9/16', icon: Hash },
    { id: 'deck' as const, label: 'Cards', icon: Layers },
    { id: 'scoreboard' as const, label: 'Payouts', icon: Trophy },
    { id: 'rules' as const, label: 'Rules', icon: BookOpen },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-6 py-2 backdrop-blur-sm bg-opacity-95">
      <div className="flex justify-around">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center py-2 px-4 h-auto tab-interactive btn-interactive transition-all duration-200 ease-out ${
              currentTab === id 
                ? 'text-emerald-600 scale-110' 
                : 'text-gray-400 hover:text-gray-600 hover:scale-105'
            }`}
          >
            <Icon className={`h-5 w-5 mb-1 transition-all duration-200 ${currentTab === id ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">{label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}
