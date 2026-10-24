import React, { useState } from 'react';
import { useDialogFocus } from '../lib/useDialogFocus';
import { UserProfile, ScreenType, BirdSpecies, JournalEntry } from '../types';

interface ProfileScreenProps {
  entries?: JournalEntry[];
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<boolean | undefined> | void;
  onNavigate: (screen: ScreenType) => void;
  onSelectSpeciesByName: (name: string) => void;
  showToast: (message: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  entries = [],
  userProfile,
  onUpdateProfile,
  onNavigate,
  onSelectSpeciesByName,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'photos' | 'lifelist' | 'activity'>('photos');
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const dialogRef = useDialogFocus(isEditDrawerOpen, () => setIsEditDrawerOpen(false));

  // Edit form local state
  const [nameInput, setNameInput] = useState(userProfile.name);
  const [bioInput, setBioInput] = useState(userProfile.bio);
  const [gearInput, setGearInput] = useState(userProfile.primaryRig);

  const photoGrid = entries.map(entry => ({ name: entry.speciesName, image: entry.imageUrl }));
  const logged = entries.filter((entry,index,all) => entry.inLifeList && all.findIndex(other => other.inLifeList && other.scientificName === entry.scientificName) === index);

  const handleSaveProfile = async () => {
    if (nameInput.trim().length < 2 || nameInput.trim().length > 80) {
      showToast('Display name must be between 2 and 80 characters.');
      return;
    }
    const saved = await onUpdateProfile({
      name: nameInput.trim(),
      bio: bioInput,
      primaryRig: gearInput,
    });
    if(saved === false)return;
    setIsEditDrawerOpen(false);
    showToast('Profile saved');
  };

  return (
    <div className="flex flex-col w-full pb-28 pt-1">
      {/* Top Utility Context Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#f7f9ff]">
        <div className="flex items-center gap-1.5 text-[#42493e]">
          <span className="material-symbols-outlined text-[18px]">verified_user</span>
          <span className="text-[11px] font-bold uppercase tracking-wider">Field Naturalist</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('notifications')}
            aria-label="Notifications"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#f1f4f9] text-[#181c20] hover:bg-[#ebeef3] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            aria-label="Settings"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#f1f4f9] text-[#181c20] hover:bg-[#ebeef3] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-4 pt-1 pb-4 flex flex-col items-center text-center">
        <div className="relative mb-2.5">
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-sm bg-[#e0e3e8] ring-4 ring-white">
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2d5a27] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[14px]">eco</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <h2 className="text-[22px] font-bold text-[#181c20]">{userProfile.name}</h2>
          <span
            className="material-symbols-outlined text-[#fe932c] text-[18px]"
            title="Field Contributor"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>

        <span className="text-[12px] font-semibold text-[#42493e]">{userProfile.handle}</span>
        <div className="flex items-center gap-1 mt-1 text-[#42493e]">
          <span className="material-symbols-outlined text-[15px]">location_on</span>
          <span className="text-[12px]">{userProfile.location}</span>
        </div>

        <p className="text-[13px] text-[#42493e] max-w-[280px] mt-2 leading-relaxed">
          {userProfile.bio}
        </p>

        {/* Quick Action Row */}
        <div className="grid grid-cols-3 gap-2 w-full mt-4 max-w-sm">
          <button
            onClick={() => {
              setNameInput(userProfile.name);
              setBioInput(userProfile.bio);
              setGearInput(userProfile.primaryRig);
              setIsEditDrawerOpen(true);
            }}
            className="h-11 px-2 bg-[#2d5a27] hover:bg-[#154212] text-white rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1 shadow-xs active:scale-[0.98] transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>Edit profile</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="h-11 px-2 bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20] rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Settings</span>
          </button>

          <button
            onClick={() => onNavigate('notifications')}
            className="h-11 px-2 bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20] rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">notifications_none</span>
            <span>Alerts</span>
          </button>
          <button type="button" onClick={()=>onNavigate('messages')} className="col-span-3 min-h-11 px-3 bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20] rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">chat</span>Field Chats
          </button>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 bg-white rounded-2xl p-4 shadow-xs border border-[#f1f4f9]">
          <div className="flex flex-col items-center text-center">
            <span className="text-[28px] font-bold text-[#154212] leading-none">
              {userProfile.birdsCount}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#42493e] mt-1.5">
              Birds
            </span>
          </div>

          <div className="flex flex-col items-center text-center border-x border-[#f1f4f9]">
            <span className="text-[28px] font-bold text-[#181c20] leading-none">
              {userProfile.photosCount}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#42493e] mt-1.5">
              Photos
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="text-[28px] font-bold text-[#904d00] leading-none">
              {userProfile.tripsCount}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#42493e] mt-1.5">
              Trips
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="px-4 mb-3">
        <div className="flex p-1 bg-[#ebeef3] rounded-xl">
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex-1 py-2 text-center rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'photos'
                ? 'bg-white text-[#181c20] shadow-xs'
                : 'text-[#42493e] hover:text-[#181c20]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">photo_library</span>
            <span>Photos</span>
          </button>

          <button
            onClick={() => setActiveTab('lifelist')}
            className={`flex-1 py-2 text-center rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'lifelist'
                ? 'bg-white text-[#181c20] shadow-xs'
                : 'text-[#42493e] hover:text-[#181c20]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">checklist</span>
            <span>Life List</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-2 text-center rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'activity'
                ? 'bg-white text-[#181c20] shadow-xs'
                : 'text-[#42493e] hover:text-[#181c20]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">timeline</span>
            <span>Activity</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Photos Grid */}
      {activeTab === 'photos' && (
        <div className="px-4">
          <div className="grid grid-cols-3 gap-2">
            {photoGrid.map((photo, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSpeciesByName(photo.name);
                  }
                }}
                onClick={() => onSelectSpeciesByName(photo.name)}
                className="group relative aspect-square rounded-xl overflow-hidden bg-[#ebeef3] shadow-xs cursor-pointer"
              >
                <img
                  src={photo.image}
                  alt={photo.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                  <span className="text-white text-[11px] font-bold truncate">{photo.name}</span>
                </div>
              </div>
            ))}
          </div>

          {!photoGrid.length && <p className="text-[13px]">Your uploaded photographs will appear here.</p>}
          {/* Field Rig Card */}
          <div className="mt-4 p-4 bg-white rounded-2xl shadow-xs flex items-center justify-between border border-[#f1f4f9]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#f1f4f9] flex items-center justify-center text-[#154212] flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">camera</span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#181c20] truncate">Primary Field Rig</p>
                <p className="text-[12px] text-[#42493e] truncate">{userProfile.primaryRig}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#904d00] px-2 py-0.5 rounded bg-[#ffdcc3]">
              Active
            </span>
          </div>
        </div>
      )}

      {/* Life list and activity use the same persisted observations as Journal. */}
      {activeTab === 'lifelist' && <div className="px-4 space-y-2">
        {logged.slice(0,3).map(entry => <div key={entry.id} className="p-3 bg-white rounded-xl shadow-xs flex items-center justify-between gap-2">
          <div><p className="text-[13px] font-bold">{entry.speciesName}</p><p className="text-[11px] italic">{entry.scientificName}</p></div><span className="text-[11px]">{entry.date.slice(0,10)}</span>
        </div>)}
        {!logged.length && <p className="text-[13px]">No life-list entries yet.</p>}
        <button type="button" onClick={() => onNavigate('life-list')} className="w-full min-h-11 rounded-xl bg-[#ebeef3] text-[#154212] font-bold text-[12px]">View Full Life List ({logged.length})</button>
      </div>}
      {activeTab === 'activity' && <div className="px-4 space-y-2">
        {entries.slice(0,10).map(entry => <div key={entry.id} className="p-4 bg-white rounded-2xl border border-[#f1f4f9]"><p className="font-bold text-[13px]">{entry.speciesName}</p><p className="text-[12px]">{entry.location} - {entry.date}</p></div>)}
        {!entries.length && <p className="text-[13px]">No field activity yet.</p>}
      </div>}

      {/* Quick Edit Profile Bottom Sheet Drawer */}
      {isEditDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsEditDrawerOpen(false)}></div>

          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Quick edit profile" tabIndex={-1} className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl max-h-[85dvh] overflow-y-auto flex flex-col p-5 z-10 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1.5 rounded-full bg-[#e0e3e8] mx-auto mb-3"></div>

            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#154212] text-[20px]">badge</span>
                <span className="text-[17px] font-bold text-[#181c20]">Quick Edit Profile</span>
              </div>
              <button
                aria-label="Close quick edit profile"
                onClick={() => setIsEditDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#42493e]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 pb-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#42493e] block mb-1">
                  Display Name
                </label>
                <div className="flex items-center bg-[#f1f4f9] rounded-xl px-3 h-11">
                  <span className="material-symbols-outlined text-[#72796e] text-[18px] mr-2">
                    person
                  </span>
                  <input
                    aria-label="Display name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-transparent text-[13px] text-[#181c20] font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#42493e] block mb-1">
                  Field Bio
                </label>
                <div className="flex items-center bg-[#f1f4f9] rounded-xl px-3 h-11">
                  <span className="material-symbols-outlined text-[#72796e] text-[18px] mr-2">
                    description
                  </span>
                  <input
                    aria-label="Bio"
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full bg-transparent text-[13px] text-[#181c20] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#42493e] block mb-1">
                  Primary Gear
                </label>
                <div className="flex items-center bg-[#f1f4f9] rounded-xl px-3 h-11">
                  <span className="material-symbols-outlined text-[#72796e] text-[18px] mr-2">
                    photo_camera
                  </span>
                  <input
                    aria-label="Primary gear"
                    value={gearInput}
                    onChange={(e) => setGearInput(e.target.value)}
                    className="w-full bg-transparent text-[13px] text-[#181c20] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                aria-label="Close quick edit profile"
                onClick={() => setIsEditDrawerOpen(false)}
                className="flex-1 h-11 bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20] font-semibold text-[13px] rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 h-11 bg-[#154212] hover:bg-[#2d5a27] text-white font-semibold text-[13px] rounded-xl shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
