import React, { useState } from 'react';
import { useDialogFocus } from '../lib/useDialogFocus';
import { BirdSpecies, ScreenType } from '../types';

interface LifeListScreenProps {
  speciesList: BirdSpecies[];
  onSelectSpecies: (species: BirdSpecies) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const LifeListScreen: React.FC<LifeListScreenProps> = ({
  speciesList,
  onSelectSpecies,
  onNavigate,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'photographed' | 'wishlist'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrawerSpecies, setSelectedDrawerSpecies] = useState<BirdSpecies | null>(null);

  const dialogRef = useDialogFocus(Boolean(selectedDrawerSpecies), () => setSelectedDrawerSpecies(null));

  const filteredList = speciesList.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        item.name.toLowerCase().includes(q) ||
        item.scientificName.toLowerCase().includes(q) ||
        (item.firstSightingLocation || '').toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (activeFilter === 'photographed') {
      return item.isLogged && (item.photosCount || 0) > 0;
    }
    if (activeFilter === 'wishlist') {
      return item.isWishlist || (item.photosCount || 0) === 0;
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-28 pt-1">
      {/* Top Summary & Life List Counter */}
      <section className="px-4 pt-2 pb-2 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] font-bold text-[#181c20] tracking-tight">47</span>
            <span className="text-[14px] text-[#42493e] font-semibold">species logged</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ebeef3] text-[#154212]">
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              eco
            </span>
            <span className="text-[10px] font-bold tracking-wide uppercase">Tier III Birder</span>
          </div>
        </div>
        <p className="text-[12px] text-[#42493e]">
          Your lifelong naturalist field index and photographic records across registered territories.
        </p>
      </section>

      {/* Sticky Controls Section: Search & Filter */}
      <section className="px-4 py-2 flex flex-col gap-2.5 sticky top-16 z-20 bg-[#f7f9ff]/95 backdrop-blur-md">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-[#72796e]">
            search
          </span>
          <input
            aria-label="Search life list"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search species or scientific name..."
            className="w-full h-11 pl-11 pr-10 rounded-xl bg-[#f1f4f9] text-[#181c20] placeholder:text-[#72796e] text-[13px] focus:outline-none focus:bg-[#ebeef3] transition-colors shadow-xs"
          />
          {searchQuery && (
            <button
              aria-label="Clear life list search"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#e0e3e8] text-[#42493e] flex items-center justify-center text-[14px]"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-[#154212] text-white shadow-xs'
                : 'bg-[#f1f4f9] text-[#181c20] hover:bg-[#ebeef3]'
            }`}
          >
            All (47)
          </button>
          <button
            onClick={() => setActiveFilter('photographed')}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
              activeFilter === 'photographed'
                ? 'bg-[#154212] text-white shadow-xs'
                : 'bg-[#f1f4f9] text-[#181c20] hover:bg-[#ebeef3]'
            }`}
          >
            Photographed (41)
          </button>
          <button
            onClick={() => setActiveFilter('wishlist')}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
              activeFilter === 'wishlist'
                ? 'bg-[#154212] text-white shadow-xs'
                : 'bg-[#f1f4f9] text-[#181c20] hover:bg-[#ebeef3]'
            }`}
          >
            Not photographed (6)
          </button>
        </div>
      </section>

      {/* Species Rows List */}
      <section className="px-4 pt-2 flex flex-col gap-2">
        {filteredList.map((item) => {
          const isWishlist = item.isWishlist || (item.photosCount || 0) === 0;
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedDrawerSpecies(item);
                }
              }}
              onClick={() => setSelectedDrawerSpecies(item)}
              className="group flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#f1f4f9] transition-all cursor-pointer shadow-xs border border-[#f1f4f9] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-12 h-12 rounded-lg bg-[#ebeef3] overflow-hidden flex-shrink-0 relative">
                  {isWishlist ? (
                    <div className="w-full h-full flex items-center justify-center text-[#72796e] bg-[#e5e8ee]">
                      <span className="material-symbols-outlined text-[24px]">visibility_off</span>
                    </div>
                  ) : (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] font-bold text-[#181c20] truncate group-hover:text-[#154212]">
                    {item.name}
                  </span>
                  <span className="text-[12px] italic text-[#72796e] truncate">
                    {item.scientificName}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5 text-[#42493e] text-[11px]">
                    <span className="material-symbols-outlined text-[13px] text-[#72796e]">
                      {isWishlist ? 'explore' : 'location_on'}
                    </span>
                    <span className="truncate">
                      {item.firstSightingLocation || 'Delhi Ridge'}
                    </span>
                    <span className="text-[#c2c9bb]">·</span>
                    <span className="whitespace-nowrap">
                      {item.photosCount || 0} photos
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    isWishlist
                      ? 'bg-[#ffdcc3] text-[#6e3900]'
                      : 'bg-[#c7ecce] text-[#01210f]'
                  }`}
                >
                  {isWishlist ? 'Wishlist' : 'Logged'}
                </span>
                <span className="material-symbols-outlined text-[#72796e] text-[18px] group-hover:translate-x-0.5 transition-transform">
                  chevron_right
                </span>
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[32px] text-[#72796e] mb-2">
              travel_explore
            </span>
            <p className="text-[15px] font-bold text-[#181c20]">No species found</p>
            <p className="text-[12px] text-[#42493e] mt-1">
              Try another common name, genus, or clear filters.
            </p>
          </div>
        )}
      </section>

      {/* Field Observation Drawer Info Card */}
      <div className="px-4 mt-6">
        <div className="rounded-2xl p-4 bg-[#f1f4f9] shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#e0e3e8] flex items-center justify-center flex-shrink-0 text-[#154212] mt-0.5">
            <span className="material-symbols-outlined text-[18px]">info</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-bold text-[#181c20]">Field Observation Drawer</span>
            <p className="text-[12px] text-[#42493e] mt-0.5 leading-relaxed">
              Tap any species to view first sighting date, location coordinates, and attached gallery.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Modal / Observation Specimen Drawer */}
      {selectedDrawerSpecies && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedDrawerSpecies(null)}
          ></div>

          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Species observation" tabIndex={-1} className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl max-h-[85dvh] overflow-y-auto p-5 flex flex-col gap-3 z-10 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1.5 rounded-full bg-[#e0e3e8] mx-auto mb-1"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#154212]"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#72796e]">
                  Observation Specimen
                </span>
              </div>
              <button
                aria-label="Close species observation"
                onClick={() => setSelectedDrawerSpecies(null)}
                className="w-8 h-8 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#181c20]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-[#181c20]">
                {selectedDrawerSpecies.name}
              </h3>
              <p className="text-[12px] italic text-[#72796e]">
                {selectedDrawerSpecies.scientificName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-3 rounded-xl bg-[#f1f4f9] flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[#72796e]">
                  First Sighting
                </span>
                <span className="text-[13px] font-bold text-[#181c20] truncate mt-0.5">
                  {selectedDrawerSpecies.firstSightingLocation || 'Delhi Ridge'}
                </span>
                <span className="text-[10px] font-mono text-[#42493e] mt-0.5">
                  {selectedDrawerSpecies.firstSightingCoords || '28.5921° N, 77.1894° E'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#f1f4f9] flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[#72796e]">
                  Captured Media
                </span>
                <span className="text-[13px] font-bold text-[#181c20] mt-0.5">
                  {selectedDrawerSpecies.photosCount || 0} Photographs
                </span>
                <span className="text-[10px] font-semibold text-[#154212] mt-0.5">
                  Raw RAW+JPEG stored
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  const sp = selectedDrawerSpecies;
                  setSelectedDrawerSpecies(null);
                  onSelectSpecies(sp);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#154212] hover:bg-[#2d5a27] text-white font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">collections</span>
                <span>Open Full Species Page</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
