import { Button } from "@/components/ui/button";
import { Users, Layers, Trophy, BookOpen, Hash, Flag } from "lucide-react";
import { useState } from "react";

interface BottomNavigationProps {
  currentTab: 'groups' | 'games' | 'deck' | 'scoreboard' | 'rules' | 'points' | 'bbb';
  onTabChange: (tab: 'groups' | 'games' | 'deck' | 'scoreboard' | 'rules' | 'points' | 'bbb') => void;
  gameSubmenuOpen?: boolean;
  onGameSubmenuToggle?: () => void;
}

export function BottomNavigation({ currentTab, onTabChange, gameSubmenuOpen = false, onGameSubmenuToggle }: BottomNavigationProps) {
  const tabs = [
    { id: 'groups' as const, label: 'Groups', icon: Users },
    { id: 'games' as const, label: 'Games', icon: Flag, hasSubmenu: true },
    { id: 'scoreboard' as const, label: 'Payouts', icon: Trophy },
    { id: 'rules' as const, label: 'Rules', icon: BookOpen },
  ];

  const gameSubmenuItems = [
    { id: 'deck' as const, label: 'Cards', icon: Layers },
    { id: 'points' as const, label: '2/9/16', icon: Hash },
    { id: 'bbb' as const, label: 'BBB', icon: Trophy },
  ];

  const isGameSubmenuActive = ['deck', 'points', 'bbb'].includes(currentTab);

  return (
    <>
      {/* Games Submenu Overlay */}
      {gameSubmenuOpen && (
        <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border border-gray-200 rounded-t-lg shadow-lg backdrop-blur-sm bg-opacity-95 z-50">
          <div className="p-3">
            <div className="flex justify-center text-xs text-gray-500 mb-2">Game Types</div>
            <div className="flex justify-around">
              {gameSubmenuItems.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant="ghost"
                  onClick={() => {
                    onTabChange(id);
                    onGameSubmenuToggle?.();
                  }}
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
          </div>
        </div>
      )}
      
      {/* Main Navigation */}
      <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-6 py-2 backdrop-blur-sm bg-opacity-95">
        <div className="flex justify-around">
          {tabs.map(({ id, label, icon: Icon, hasSubmenu }) => {
            const isActive = id === 'games' ? isGameSubmenuActive : currentTab === id;
            
            return (
              <Button
                key={id}
                variant="ghost"
                onClick={() => {
                  if (hasSubmenu) {
                    onGameSubmenuToggle?.();
                  } else {
                    onTabChange(id);
                  }
                }}
                className={`flex flex-col items-center py-2 px-4 h-auto tab-interactive btn-interactive transition-all duration-200 ease-out ${
                  isActive 
                    ? 'text-emerald-600 scale-110' 
                    : 'text-gray-400 hover:text-gray-600 hover:scale-105'
                }`}
              >
                <Icon className={`h-5 w-5 mb-1 transition-all duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
