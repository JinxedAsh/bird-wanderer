import React from 'react';
import { ScreenType } from '../types';

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const tabs: Array<{
    id: ScreenType;
    label: string;
    icon: string;
  }> = [
    { id: 'explore', label: 'Explore', icon: 'explore' },
    { id: 'community', label: 'Community', icon: 'group' },
    { id: 'hotspots', label: 'Hotspots', icon: 'pin_drop' },
    { id: 'journal', label: 'Journal', icon: 'menu_book' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#f7f9ff]/90 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto h-16 px-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 transition-all duration-150 rounded-lg ${
                isActive
                  ? 'text-[#2d5a27] font-semibold'
                  : 'text-[#42493e] hover:text-[#154212]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
