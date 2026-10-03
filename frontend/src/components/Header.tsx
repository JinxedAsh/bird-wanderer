import React from 'react';
import { ScreenType } from '../types';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onBack: () => void;
  unreadCount?: number;
  titleOverride?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  onBack,
  unreadCount = 3,
  titleOverride,
}) => {
  const isStackScreen = [
    'species-detail',
    'log-observation',
    'hotspot-detail',
    'life-list',
    'quiz',
    'messages',
    'search',
    'notifications',
    'settings',
  ].includes(currentScreen);

  const getScreenTitle = () => {
    if (titleOverride) return titleOverride;
    switch (currentScreen) {
      case 'explore':
        return 'Explore';
      case 'community':
        return 'Community';
      case 'hotspots':
        return 'Hotspots';
      case 'journal':
        return 'Journal';
      case 'profile':
        return 'Profile';
      case 'species-detail':
        return 'Species Detail';
      case 'log-observation':
        return 'Log Observation';
      case 'hotspot-detail':
        return 'Hotspot Map Detail';
      case 'life-list':
        return 'Species Index';
      case 'quiz':
        return 'Bird Quiz';
      case 'messages':
        return 'Field Chats';
      case 'search':
        return 'Global Search';
      case 'notifications':
        return 'Notifications';
      case 'settings':
        return 'Settings';
      default:
        return 'Bird Wanderer';
    }
  };

  const logoUrl =
    'https://lh3.googleusercontent.com/aida/AEtjO1W8yln5EatqNnqKbQzoUitk58-CzWZFsehpZ_GK_zrmrGN3Rf6DRUAAPQOWkobP98hENh3t1gmnVPXejRTXiM2TGKjiQekU3Rg-unebzUWBRENy0VWqkTuIh1Sn-JG2oOC0nXRl1mcsPKuw3fjC_1M72Xv5uLfUz_I-MVJCbPW9iGgR4qgONFxTYDeymWN81E-fZkTP47jwWhru75_7Y-Xh7gyI3W3itKbKoEGU6949uH_m1ajz26fkPFI';

  const avatarUrl =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBilIfqeqGZqxiuK6vxRyu_VanbSPnlYC5UaLKlYlFqvr6hT1yyFB_Fg7KCmdxldB02SZVzoKxBFtWeD5VF6oLjLT6b4s3--fjiBFA8DXvuDeyNfHe9Z4rqo9qzO7qswlZXVySE3EqnD_uiKwDKd7XjL9d5-UN2BEDEUkHMMFqB2Sn7aZIP3shqFP4qEhe9oSuBUYnIcEahlDaPIWpYXSW1JXkXJQO8VY6UHlpPDxI4iN11eppj5PWiaQ';

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-[#f7f9ff]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-all">
      <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
        {/* Left: Back button or Logo + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {isStackScreen ? (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="w-10 h-10 -ml-1 flex items-center justify-center rounded-xl text-[#181c20] hover:bg-[#ebeef3] active:bg-[#e0e3e8] transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          ) : null}

          <img
            src={logoUrl}
            alt="Bird Wanderer Logo"
            className="h-8 w-auto object-contain flex-shrink-0 cursor-pointer"
            onClick={() => onNavigate('explore')}
          />

          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-[#42493e] truncate">
              Bird Wanderer
            </span>
            <h1 className="text-[17px] font-semibold text-[#181c20] truncate leading-tight">
              {getScreenTitle()}
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isStackScreen ? (
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Bird Wanderer',
                    text: 'Explore avian observations with Bird Wanderer',
                    url: window.location.href,
                  }).catch(() => {});
                }
              }}
              aria-label="Share observation"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[#42493e] hover:text-[#181c20] hover:bg-[#ebeef3] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">share</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('notifications')}
              aria-label="Notifications and field alerts"
              className="relative w-10 h-10 flex items-center justify-center rounded-xl text-[#42493e] hover:text-[#181c20] hover:bg-[#ebeef3] transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#fe932c] ring-2 ring-[#f7f9ff]"></span>
              )}
            </button>
          )}

          <button
            onClick={() => onNavigate('profile')}
            aria-label="Profile details"
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#ebeef3] transition-colors"
          >
            <img
              src={avatarUrl}
              alt="Sourabh profile"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#e0e3e8]"
            />
          </button>
        </div>
      </div>
    </header>
  );
};
