import React, { useState } from 'react';
import { UserProfile, ScreenType, BirdSpecies } from '../types';

interface ProfileScreenProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onNavigate: (screen: ScreenType) => void;
  onSelectSpeciesByName: (name: string) => void;
  showToast: (message: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userProfile,
  onUpdateProfile,
  onNavigate,
  onSelectSpeciesByName,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'photos' | 'lifelist' | 'activity'>('photos');
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  // Edit form local state
  const [nameInput, setNameInput] = useState(userProfile.name);
  const [bioInput, setBioInput] = useState(userProfile.bio);
  const [gearInput, setGearInput] = useState(userProfile.primaryRig);

  const photoGrid = [
    {
      name: 'Indian Roller',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBkShM7AHwEWnKOARwX6EjkonYacalNPd_unyxJmN2NGztwMl2-MZYHR-pi5-4dQOB8wnykrB56ll7RG74M6EJxBwG4yv1PVjalaryATPXvRo9bt1DG2Kp-SPKdIuv5Nrgf9RaMPbaABFPJYPokGXqnDCWD0BeRTUV_Ifs9j4DI8G2vqgLMCTnn6uKE_2gob6vIloi8FKzN3zZa-i6uSQO3vKQ45nhg9sNuz2UZ8bUfr3TToxFVf_zj0g',
    },
    {
      name: 'White-throated Kingfisher',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBUaF8RSGv3ncYIkcsMAIxXAssz-HxDPDFzmVewr1kcBeolqM7I7gMYAUIehhuY10xjGOpERFTfCxP-GaYpMvmBwHmQeVb5eF7bdjubb26SjxCFn-UqDq1KLoEBontqRUFUqazl5IwOi8Ky3yPcHww4jT8VgabBYo8DBgdseN-zpZSyCn3hEKVVTtP7h-ZsDJIp-n5DnlCmi1Mg9KckoCFy_ANhn5mWioMYgQEE5HEHDGvxXDkZMU_XYA',
    },
    {
      name: 'Rose-ringed Parakeet',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDiRRsPUP6iiro4zV8A9yhcX1mCZ7uXgCGY4pYFaZvOtfDX9MsrSYzUCLoZFPu35eYFRQ1LLO9JhKa5rcAKjjLObtbVv0R_04mmqHRIIkJRju86-LLgGwCRLWlTMFmUj_xLZd4rjvO0d4-UcW-JOC3Aop64A57NkUZrqmZHJYt9q5yanqAWn3e-dkyThvE8kMxU99F6Io1cmRbovMXaS7krqsCysDk5uRbM6nWm0bTeZmRekmEfxS-a3A',
    },
    {
      name: 'Indian Grey Hornbill',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCo49Fn5pKObFQ9KovIS9xbZQFGxwplq3KFIviNyUrEuBIRS67IAOnpEwk3moojY0XH-Dl8SX_GclgSp-jQNlyUiOeWCZhl7r5nHsFsf2H2t6eLyLovMS5SgcSbQMOT1oojjpV_9ydZJHWAgN-_uWaO0ZrMsSstJbibXCXCEBNcjkU44V1RL7Ya1daD0Hc5ys-fPzAx32REnTmGQCNgMwhq4qKbdJO9z-3GLMloL-BD_PXlN5n5Z7D0WQ',
    },
    {
      name: 'Little Egret',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCD-IYrJ9ExEt3_bK3lLxZOuDyUcGVPAHMePSb5SFr3xwTRRG_rGOTwu-8yCP0xBoJ6VNt1cURhnAFSJBx_5wNQXG63Uz7PNZ1Z1ee8qqFRuDr4tPlhiQTtI6Aex6wvthfSocDJK4PQOw-MjTlfRiHszs3kqJO-gwu2fjb1SDF-4OOzQcOWdJ_y2wNeQJZ-e6LTdiqtIgHwQw2VQsdXN2k758ypgS4XvsPing_69WQKQ-NWtda4ZrshuQ',
    },
    {
      name: 'Spotted Owlet',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDD-Sdzw7effmxbUQyJTRGW0gvTCv-Af1kJrvGZrtrOnyP6cxl3dNoeYS6UYpL1fhyx1lMcndixUzRoakdmGmVer2Qa39RdJ0OuWFjbM7I3k4XDl3_3saPfXl2_HptlVV1sWUAt--wwoGrzDzWA5OdEqvG8uxI0sqhQRl8alGCXz79Lnb3ZXYDQ8PujLWoXeIwe3-ikKer_xZvKa7AtRTCjecAMyUreLThlRlilsTY7nqRyocNnsO7fJw',
    },
  ];

  const handleSaveProfile = () => {
    onUpdateProfile({
      name: nameInput,
      bio: bioInput,
      primaryRig: gearInput,
    });
    setIsEditDrawerOpen(false);
    showToast('Profile updated successfully');
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
            onClick={() => setIsEditDrawerOpen(true)}
            className="h-10 px-2 bg-[#2d5a27] hover:bg-[#154212] text-white rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1 shadow-xs active:scale-[0.98] transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>Edit profile</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="h-10 px-2 bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20] rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Settings</span>
          </button>

          <button
            onClick={() => onNavigate('notifications')}
            className="h-10 px-2 bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20] rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">notifications_none</span>
            <span>Alerts</span>
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

      {/* Tab 2: Life List Snippet */}
      {activeTab === 'lifelist' && (
        <div className="px-4 space-y-2">
          <div className="p-3 bg-white rounded-xl shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#bcf0ae] flex items-center justify-center text-[#002201] font-bold text-xs">
                #47
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#181c20]">Black-winged Kite</p>
                <p className="text-[11px] italic text-[#42493e]">Elanus caeruleus</p>
              </div>
            </div>
            <span className="text-[11px] text-[#42493e]">Yesterday</span>
          </div>

          <div className="p-3 bg-white rounded-xl shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#bcf0ae] flex items-center justify-center text-[#002201] font-bold text-xs">
                #46
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#181c20]">Spotted Owlet</p>
                <p className="text-[11px] italic text-[#42493e]">Athene brama</p>
              </div>
            </div>
            <span className="text-[11px] text-[#42493e]">3d ago</span>
          </div>

          <div className="p-3 bg-white rounded-xl shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#bcf0ae] flex items-center justify-center text-[#002201] font-bold text-xs">
                #45
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#181c20]">Indian Grey Hornbill</p>
                <p className="text-[11px] italic text-[#42493e]">Ocyceros birostris</p>
              </div>
            </div>
            <span className="text-[11px] text-[#42493e]">1w ago</span>
          </div>

          <button
            onClick={() => onNavigate('life-list')}
            className="w-full py-2.5 mt-2 rounded-xl bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#154212] font-bold text-[12px] flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>View Full 47 Life List</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Tab 3: Activity */}
      {activeTab === 'activity' && (
        <div className="px-4 space-y-2.5">
          <div className="p-4 bg-white rounded-2xl shadow-xs border border-[#f1f4f9]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-bold text-[#154212]">
                Sultanpur Bird Sanctuary
              </span>
              <span className="text-[11px] text-[#72796e]">2 days ago</span>
            </div>
            <p className="text-[12px] text-[#42493e]">
              Logged 14 distinct sightings across shallow wetland trail.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow-xs border border-[#f1f4f9]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-bold text-[#154212]">
                Okhla Bird Sanctuary
              </span>
              <span className="text-[11px] text-[#72796e]">Last weekend</span>
            </div>
            <p className="text-[12px] text-[#42493e]">
              Uploaded 8 high-res frames to Delhi NCR Hotspot Checklist.
            </p>
          </div>
        </div>
      )}

      {/* Quick Edit Profile Bottom Sheet Drawer */}
      {isEditDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsEditDrawerOpen(false)}></div>

          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl flex flex-col p-5 z-10 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1.5 rounded-full bg-[#e0e3e8] mx-auto mb-3"></div>

            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#154212] text-[20px]">badge</span>
                <span className="text-[17px] font-bold text-[#181c20]">Quick Edit Profile</span>
              </div>
              <button
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
                    value={gearInput}
                    onChange={(e) => setGearInput(e.target.value)}
                    className="w-full bg-transparent text-[13px] text-[#181c20] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
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
