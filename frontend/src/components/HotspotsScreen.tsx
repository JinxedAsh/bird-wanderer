import React, { useState } from 'react';
import { Hotspot, ScreenType } from '../types';

interface HotspotsScreenProps {
  hotspots: Hotspot[];
  onSelectHotspot: (hotspot: Hotspot) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (message: string) => void;
}

export const HotspotsScreen: React.FC<HotspotsScreenProps> = ({
  hotspots,
  onSelectHotspot,
  onNavigate,
  showToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<'nearby' | 'popular' | 'saved'>('nearby');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePinId, setActivePinId] = useState<string | null>(null);

  const filteredHotspots = hotspots.filter((h) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matches = (
        h.name.toLowerCase().includes(q) ||
        h.region.toLowerCase().includes(q) ||
        h.trailDifficulty.toLowerCase().includes(q)
      );
      if (!matches) return false;
    }
    if (activeFilter === 'popular') {
      return h.speciesCount >= 15;
    }
    if (activeFilter === 'saved') {
      return h.isSaved;
    }
    return true;
  });

  const handlePinClick = (id: string) => {
    setActivePinId(id);
    const target = hotspots.find((h) => h.id === id);
    if (target) {
      showToast(`Selected ${target.name}`);
      const el = document.getElementById(`hotspot-card-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="flex flex-col w-full pb-28 pt-1">
      {/* Search and Filters */}
      <div className="px-4 pt-2 pb-1">
        <div className="relative flex items-center w-full">
          <span className="material-symbols-outlined absolute left-4 text-[#42493e] pointer-events-none text-[20px]">
            search
          </span>
          <input
            aria-label="Search hotspots"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations"
            className="w-full h-12 pl-12 pr-11 bg-white rounded-full text-[14px] text-[#181c20] placeholder:text-[#42493e]/70 focus:outline-none focus:ring-2 focus:ring-[#154212] shadow-sm transition-all"
            type="text"
          />
          <button
            onClick={() => showToast('Nearby locations are sample data. Live GPS is not connected yet.')}
            aria-label="Current location"
            className="absolute right-3 w-8 h-8 flex items-center justify-center rounded-full text-[#42493e] hover:text-[#154212] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">near_me</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-2.5 pb-1 overflow-x-auto no-scrollbar">
          {(['nearby', 'popular', 'saved'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold capitalize transition-all active:scale-95 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#154212] text-white shadow-sm'
                    : 'bg-[#f1f4f9] text-[#42493e] hover:bg-[#ebeef3]'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Stage */}
      <div className="px-4 my-2">
        <div className="relative w-full h-60 rounded-2xl overflow-hidden bg-[#ebeef3] shadow-sm border border-[#e0e3e8]">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYCLW4O-VpotfLtQjSzbP881hkudRW2F-Cz5OTlz5qWB2-YtqSDwyEbnv5DjLGgo8dEgBFh1PMWNppQ-ythe0OXVVa46KIfY-1Td2FXsLyPizYHMblBoJnbT1Et5ubzR5dp_74y_PeeKZz_Md2rHggMarwul09J03eTq4-_yoWnBPFRPGB2jUAehrVsaGUxAQ-mx6WLF6lCCz0iJSKDmzTV9p1fEk2to48vS2HgaRHwjX_XQCrmXDjEQ"
            alt="Delhi Map View"
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#154212]/20 via-transparent to-transparent"></div>

          {/* Map Pin: Yamuna */}
          <button
            onClick={() => handlePinClick('yamuna')}
            className={`absolute top-10 right-14 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md transition-transform hover:scale-105 ${
              activePinId === 'yamuna' ? 'scale-110 ring-2 ring-[#154212]' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#154212] animate-pulse"></span>
            <span className="text-[11px] font-bold text-[#181c20]">Yamuna</span>
          </button>

          {/* Map Pin: Okhla */}
          <button
            onClick={() => handlePinClick('okhla')}
            className={`absolute bottom-12 right-8 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md transition-transform hover:scale-105 ${
              activePinId === 'okhla' ? 'scale-110 ring-2 ring-[#154212]' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#154212]"></span>
            <span className="text-[11px] font-bold text-[#181c20]">Okhla</span>
          </button>

          {/* Map Pin: Sanjay Van */}
          <button
            onClick={() => handlePinClick('sanjay-van')}
            className={`absolute bottom-16 left-12 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md transition-transform hover:scale-105 ${
              activePinId === 'sanjay-van' ? 'scale-110 ring-2 ring-[#154212]' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#154212]"></span>
            <span className="text-[11px] font-bold text-[#181c20]">Sanjay Van</span>
          </button>

          {/* Map Pin: Sultanpur */}
          <button
            onClick={() => handlePinClick('sultanpur')}
            className={`absolute top-14 left-6 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md transition-transform hover:scale-105 ${
              activePinId === 'sultanpur' ? 'scale-110 ring-2 ring-[#154212]' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#154212]"></span>
            <span className="text-[11px] font-bold text-[#181c20]">Sultanpur</span>
          </button>

          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-[#42493e] flex items-center gap-1 shadow-xs">
            <span className="material-symbols-outlined text-[13px] text-[#154212]">forest</span>
            <span>Delhi-NCR Corridor</span>
          </div>
        </div>
      </div>

      {/* Location Cards List */}
      <div className="px-4 pt-1 flex flex-col gap-2.5">
        {filteredHotspots.map((hotspot) => {
          const isHighlighted = activePinId === hotspot.id;
          return (
            <div
              id={`hotspot-card-${hotspot.id}`}
              key={hotspot.id}
              onClick={() => onSelectHotspot(hotspot)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectHotspot(hotspot);
                }
              }}
              className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-between gap-3 cursor-pointer border ${
                isHighlighted ? 'border-[#154212] ring-2 ring-[#154212]/30' : 'border-transparent'
              }`}
            >
              <div className="flex flex-col min-w-0">
                <h2 className="text-[16px] font-bold text-[#181c20] truncate">{hotspot.name}</h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[12px] text-[#42493e]">
                  <span className="font-bold text-[#154212]">{hotspot.speciesCount} species</span>
                  <span className="w-1 h-1 rounded-full bg-[#c2c9bb]"></span>
                  <span>{hotspot.distanceKm} km</span>
                  <span className="w-1 h-1 rounded-full bg-[#c2c9bb]"></span>
                  <span>Best time: {hotspot.bestTime}</span>
                </div>
              </div>

              <span className="material-symbols-outlined text-[#42493e] text-[20px] flex-shrink-0">
                chevron_right
              </span>
            </div>
          );
        })}
        {filteredHotspots.length === 0 && (
          <p role="status" className="py-8 text-center text-[13px] text-[#42493e]">
            No hotspots match this search and filter.
          </p>
        )}
      </div>
    </div>
  );
};
