import React, { useState } from 'react';
import { UserProfile, ScreenType } from '../types';

interface SettingsScreenProps {
  email: string;
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onLogout: () => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (message: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  email,
  userProfile,
  onUpdateProfile,
  onLogout,
  onNavigate,
  showToast,
}) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'approximate' | 'hide' | 'private'>(
    userProfile.locationPrivacy
  );

  const [sensitiveProtection, setSensitiveProtection] = useState(
    userProfile.sensitiveSpeciesProtection
  );
  const [profileVis, setProfileVis] = useState<'public' | 'followers'>(
    userProfile.profileVisibility
  );

  const optionLabels = {
    approximate: 'Show approximate location (Recommended)',
    hide: 'Hide exact location',
    private: 'Keep private',
  };

  const handleSavePrivacy = () => {
    onUpdateProfile({ locationPrivacy: selectedOption });
    setIsSheetOpen(false);
    showToast('Preferences saved to field log');
  };

  const handleToggleSensitive = (val: boolean) => {
    setSensitiveProtection(val);
    onUpdateProfile({ sensitiveSpeciesProtection: val });
    showToast(val ? 'Sensitive species protection enabled' : 'Protection disabled');
  };

  const handleSetVisibility = (mode: 'public' | 'followers') => {
    setProfileVis(mode);
    onUpdateProfile({ profileVisibility: mode });
    showToast(`Profile visibility set to ${mode}`);
  };

  return (
    <div className="flex flex-col w-full pb-28 pt-1">
      {/* Field Naturalist Identity Snippet */}
      <div className="px-4 pt-2 pb-2">
        <div className="bg-[#f1f4f9] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs border border-[#e0e3e8]">
          <div className="relative flex-shrink-0">
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name}
              className="w-14 h-14 rounded-full object-cover shadow-sm"
            />
            <span className="absolute -bottom-1 -right-1 bg-[#154212] text-white rounded-full p-1 flex items-center justify-center">
              <span className="material-symbols-outlined text-[12px]">eco</span>
            </span>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold text-[#181c20] truncate">{userProfile.name}</h2>
              <span className="bg-[#bcf0ae] text-[#002201] px-2 py-0.5 rounded font-semibold text-[10px]">
                {userProfile.title}
              </span>
            </div>
            <p className="text-[12px] text-[#42493e] truncate">sourabh@wanderer.in</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#154212] animate-pulse"></span>
              <span className="text-[11px] font-medium text-[#42493e]">
                Live telemetry sync active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4 mt-2">
        {/* SECTION: ACCOUNT */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#42493e]">
              Account
            </span>
            <span className="text-[11px] text-[#72796e]">Journal ID #4092</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xs flex flex-col overflow-hidden border border-[#f1f4f9]">
            <button
              onClick={() => onNavigate('profile')}
              className="w-full px-4 py-3 flex items-center justify-between text-left active:bg-[#f1f4f9] transition-colors border-b border-[#f1f4f9]"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#42493e] text-[20px]">badge</span>
                <span className="text-[13px] font-bold text-[#181c20]">Edit profile</span>
              </div>
              <span className="material-symbols-outlined text-[#72796e] text-[18px]">
                chevron_right
              </span>
            </button>

            <button
              onClick={() => showToast('Password recovery is not connected yet. No email was sent.')}
              className="w-full px-4 py-3 flex items-center justify-between text-left active:bg-[#f1f4f9] transition-colors border-b border-[#f1f4f9]"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#42493e] text-[20px]">password</span>
                <span className="text-[13px] font-bold text-[#181c20]">Change password</span>
              </div>
              <span className="material-symbols-outlined text-[#72796e] text-[18px]">
                chevron_right
              </span>
            </button>

            <div className="w-full px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#42493e] text-[20px]">mail</span>
                <span className="text-[13px] font-bold text-[#181c20]">Email</span>
              </div>
              <span className="text-[12px] text-[#42493e] truncate max-w-[180px]">
                sourabh@wanderer.in
              </span>
            </div>
          </div>
        </div>

        {/* SECTION: PRIVACY & ETHICS */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#42493e]">
              Privacy & Ethics
            </span>
            <span className="text-[11px] text-[#154212] font-bold">Habitat Protection Active</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xs flex flex-col overflow-hidden border border-[#f1f4f9]">
            {/* Location Privacy */}
            <button
              onClick={() => setIsSheetOpen(true)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left bg-[#f1f4f9]/80 active:bg-[#ebeef3] transition-colors border-b border-[#f1f4f9]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#2d5a27] text-white flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-[#181c20]">Location privacy</span>
                    <span className="bg-[#ffdcc3] text-[#6e3900] px-1.5 py-0.2 rounded text-[10px] font-bold">
                      Active
                    </span>
                  </div>
                  <span className="text-[11px] text-[#42493e] truncate">
                    {optionLabels[userProfile.locationPrivacy || 'approximate']}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[#154212] flex-shrink-0">
                <span className="text-[11px] font-bold">Configure</span>
                <span className="material-symbols-outlined text-[18px]">expand_less</span>
              </div>
            </button>

            {/* Profile Visibility */}
            <div className="w-full px-4 py-3 flex items-center justify-between border-b border-[#f1f4f9]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-[#42493e] text-[20px]">
                  visibility
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-bold text-[#181c20]">Profile visibility</span>
                  <span className="text-[11px] text-[#72796e]">Public naturalist registry</span>
                </div>
              </div>

              <div className="flex items-center bg-[#ebeef3] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => handleSetVisibility('public')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    profileVis === 'public'
                      ? 'bg-white text-[#181c20] shadow-xs'
                      : 'text-[#42493e]'
                  }`}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => handleSetVisibility('followers')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    profileVis === 'followers'
                      ? 'bg-white text-[#181c20] shadow-xs'
                      : 'text-[#42493e]'
                  }`}
                >
                  Followers
                </button>
              </div>
            </div>

            {/* Sensitive Species Protection */}
            <div className="w-full px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="material-symbols-outlined text-[#42493e] text-[20px]">shield</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-bold text-[#181c20]">
                    Sensitive species protection
                  </span>
                  <span className="text-[11px] text-[#42493e] leading-tight">
                    Auto-obfuscate coordinates on nesting alerts
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={sensitiveProtection}
                  onChange={(e) => handleToggleSensitive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#e0e3e8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#154212]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION: NOTIFICATIONS */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#42493e]">
              Notifications
            </span>
            <span className="text-[11px] text-[#72796e]">Field Alerts</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xs flex flex-col overflow-hidden border border-[#f1f4f9]">
            <div className="w-full px-4 py-3 flex items-center justify-between border-b border-[#f1f4f9]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#42493e] text-[20px]">
                  notifications_active
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#181c20]">Bird alerts</span>
                  <span className="text-[11px] text-[#42493e]">Rare vagrant sightings nearby</span>
                </div>
              </div>
              <span className="bg-[#ebeef3] text-[#154212] text-[10px] font-bold px-2 py-1 rounded">
                Push enabled
              </span>
            </div>

            <div className="w-full px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#42493e] text-[20px]">forum</span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#181c20]">Community activity</span>
                  <span className="text-[11px] text-[#42493e]">Weekly sightings digest</span>
                </div>
              </div>
              <span className="text-[12px] text-[#42493e]">Digest weekly</span>
            </div>
          </div>
        </div>

        {/* SECTION: APP & LOGOUT */}
        <div className="flex flex-col">
          <div className="bg-white rounded-2xl shadow-xs flex flex-col overflow-hidden border border-[#f1f4f9]">
            <button
              onClick={() => showToast('Bird Wanderer v1.0.4 • Designed for naturalists')}
              className="w-full px-4 py-3 flex items-center justify-between text-left active:bg-[#f1f4f9] transition-colors border-b border-[#f1f4f9]"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#42493e] text-[20px]">info</span>
                <span className="text-[13px] font-bold text-[#181c20]">About Bird Wanderer</span>
              </div>
              <span className="text-[11px] text-[#72796e]">v1.0.4</span>
            </button>

            <button
              onClick={() => showToast('Opening Field Guidelines & Ethics...')}
              className="w-full px-4 py-3 flex items-center justify-between text-left active:bg-[#f1f4f9] transition-colors border-b border-[#f1f4f9]"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#42493e] text-[20px]">menu_book</span>
                <span className="text-[13px] font-bold text-[#181c20]">Help & Field Guidelines</span>
              </div>
              <span className="material-symbols-outlined text-[#72796e] text-[18px]">
                chevron_right
              </span>
            </button>

            <button
              onClick={onLogout}
              className="w-full px-4 py-3 flex items-center justify-between text-left active:bg-[#ffdad6]/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">logout</span>
                <span className="text-[13px] font-bold text-[#ba1a1a]">Log out</span>
              </div>
              <span className="text-[11px] text-[#ba1a1a]/70">{email}</span>
            </button>
          </div>
        </div>

        {/* Mindful Observation Code */}
        <div className="rounded-2xl p-4 bg-[#c7ecce]/40 flex items-start gap-3 mb-4">
          <span className="material-symbols-outlined text-[#20402b] text-[22px] flex-shrink-0 mt-0.5">
            nature_people
          </span>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-[#01210f]">Mindful Observation Code</span>
            <p className="text-[12px] text-[#2e4e37] mt-0.5 leading-relaxed">
              Bird Wanderer enforces the American Birding Association and IUCN code of ethics. Never
              flush birds for photographs or reveal fragile raptor nesting roosts.
            </p>
          </div>
        </div>
      </div>

      {/* INTERACTIVE BOTTOM SHEET: LOCATION PRIVACY */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsSheetOpen(false)}></div>

          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl flex flex-col p-5 z-10 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1.5 rounded-full bg-[#e0e3e8] mx-auto mb-3"></div>

            <div className="flex items-start justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#154212]/10 text-[#154212] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">nest_protect</span>
                </div>
                <h3 className="text-[17px] font-bold text-[#181c20]">Protect sensitive species</h3>
              </div>
              <button
                onClick={() => setIsSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#42493e]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-[13px] text-[#42493e] leading-relaxed pb-4">
              Exact locations of sensitive species can be hidden from public viewers to prevent
              disturbances.
            </p>

            {/* Radio Options */}
            <div className="flex flex-col gap-2.5 pb-5">
              {/* Option 1: Approximate */}
              <div
                onClick={() => setSelectedOption('approximate')}
                className={`cursor-pointer p-3.5 rounded-2xl transition-all flex items-start gap-3 border ${
                  selectedOption === 'approximate'
                    ? 'bg-[#f1f4f9] border-[#154212]'
                    : 'bg-[#f1f4f9]/40 border-transparent'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      selectedOption === 'approximate' ? 'bg-[#154212]' : 'bg-[#e0e3e8]'
                    }`}
                  >
                    {selectedOption === 'approximate' && (
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[#181c20]">
                      Show approximate location
                    </span>
                    <span className="bg-[#154212] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      Default
                    </span>
                  </div>
                  <span className="text-[12px] text-[#42493e] mt-0.5 leading-snug">
                    Recommended. Obfuscates coordinates within a 5km naturalist grid block.
                  </span>
                </div>
              </div>

              {/* Option 2: Hide exact */}
              <div
                onClick={() => setSelectedOption('hide')}
                className={`cursor-pointer p-3.5 rounded-2xl transition-all flex items-start gap-3 border ${
                  selectedOption === 'hide'
                    ? 'bg-[#f1f4f9] border-[#154212]'
                    : 'bg-[#f1f4f9]/40 border-transparent'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      selectedOption === 'hide' ? 'bg-[#154212]' : 'bg-[#e0e3e8]'
                    }`}
                  >
                    {selectedOption === 'hide' && (
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[14px] font-bold text-[#181c20]">Hide exact location</span>
                  <span className="text-[12px] text-[#42493e] mt-0.5 leading-snug">
                    Pins report to county or district level only.
                  </span>
                </div>
              </div>

              {/* Option 3: Keep private */}
              <div
                onClick={() => setSelectedOption('private')}
                className={`cursor-pointer p-3.5 rounded-2xl transition-all flex items-start gap-3 border ${
                  selectedOption === 'private'
                    ? 'bg-[#f1f4f9] border-[#154212]'
                    : 'bg-[#f1f4f9]/40 border-transparent'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      selectedOption === 'private' ? 'bg-[#154212]' : 'bg-[#e0e3e8]'
                    }`}
                  >
                    {selectedOption === 'private' && (
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[14px] font-bold text-[#181c20]">Keep private</span>
                  <span className="text-[12px] text-[#42493e] mt-0.5 leading-snug">
                    Observations visible only to your personal life list and research exports.
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSavePrivacy}
              className="w-full h-12 rounded-xl bg-[#2d5a27] hover:bg-[#154212] active:scale-[0.99] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">lock_clock</span>
              <span>Save Privacy Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
