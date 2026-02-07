import { Button } from "@/components/ui/button";
import { Users, Flag, Trophy, BookOpen } from "lucide-react";

interface BottomNavigationProps {
  currentTab: 'groups' | 'games' | 'scoreboard' | 'rules';
  onTabChange: (tab: 'groups' | 'games' | 'scoreboard' | 'rules') => void;
}

export function BottomNavigation({ currentTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'groups' as const, label: 'Groups', icon: Users },
    { id: 'games' as const, label: 'Games', icon: Flag },
    { id: 'scoreboard' as const, label: 'Payouts', icon: Trophy },
    { id: 'rules' as const, label: 'Rules', icon: BookOpen },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md md:max-w-2xl lg:max-w-4xl bg-white border-t border-gray-200 px-6 py-2 backdrop-blur-sm bg-opacity-95">
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
