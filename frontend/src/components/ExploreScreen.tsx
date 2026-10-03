import React from 'react';
import { BirdSpecies, ScreenType } from '../types';

interface ExploreScreenProps {
  observerName: string;
  speciesList: BirdSpecies[];
  onSelectSpecies: (species: BirdSpecies) => void;
  onNavigate: (screen: ScreenType) => void;
  onQuickLog: (species: BirdSpecies) => void;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  observerName,
  speciesList,
  onSelectSpecies,
  onNavigate,
  onQuickLog,
}) => {
  const nearbyBirds = speciesList.slice(0, 4);
  const notableBird = speciesList.find((s) => s.id === 'hornbill') || speciesList[4];

  return (
    <div className="flex flex-col w-full px-4 pb-28 pt-2 space-y-6">
      {/* Greeting & Environmental Observation Module */}
      <section className="flex flex-col space-y-2.5 pt-1">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#42493e] flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-[15px] text-[#154212]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                near_me
              </span>
              Delhi, India
            </span>
            <h2 className="text-[24px] font-bold text-[#181c20] tracking-tight">
              Good morning, {observerName}
            </h2>
          </div>
          <button
            onClick={() => onNavigate('search')}
            aria-label="Open search"
            className="w-10 h-10 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#154212] hover:bg-[#e0e3e8] active:scale-95 transition-all shadow-sm flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">search</span>
          </button>
        </div>

        {/* Weather & Field Conditions Pill */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#f1f4f9] shadow-sm">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[18px] text-[#fe932c]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              wb_sunny
            </span>
            <span className="text-[14px] font-bold text-[#181c20]">24°C</span>
            <span className="text-[#c2c9bb] text-[12px]">•</span>
            <span className="text-[14px] text-[#42493e]">Clear</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#42493e]">
            <span className="material-symbols-outlined text-[16px]">air</span>
            <span className="text-[12px] font-semibold">8 km/h</span>
          </div>
        </div>
      </section>

      {/* Main Section: What's out there? */}
      <section className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[20px] font-bold text-[#181c20]">What’s out there?</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#154212]">
              Active nearby
            </span>
          </div>
          <button
            onClick={() => onNavigate('life-list')}
            className="text-[12px] font-semibold text-[#154212] hover:text-[#2d5a27] transition-colors flex items-center gap-0.5"
          >
            All sights
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="flex flex-col space-y-2">
          {nearbyBirds.map((bird) => (
            <article
              key={bird.id}
              className="flex items-center p-2 rounded-xl bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer"
              onClick={() => onSelectSpecies(bird)}
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#ebeef3]">
                <img
                  src={bird.image}
                  alt={bird.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="flex-1 min-w-0 ml-3.5 flex flex-col">
                <h4 className="text-[16px] font-bold text-[#181c20] truncate group-hover:text-[#154212] transition-colors">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onSelectSpecies(bird); }} className="text-left">
                    {bird.name}
                  </button>
                </h4>
                <span className="text-[12px] italic text-[#42493e] truncate">
                  {bird.scientificName}
                </span>
              </div>

              <button
                type="button"
                aria-label={`Log sighting of ${bird.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickLog(bird);
                }}
                className="w-9 h-9 rounded-lg bg-[#f1f4f9] flex items-center justify-center text-[#42493e] hover:text-[#154212] hover:bg-[#ebeef3] active:scale-95 transition-all flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="flex flex-col space-y-2.5">
        <h3 className="text-[17px] font-semibold text-[#181c20]">Quick actions</h3>
        <div className="grid grid-cols-3 gap-2.5">
          {/* 1. Community */}
          <button
            onClick={() => onNavigate('community')}
            className="flex flex-col items-center text-center p-3 rounded-xl bg-white shadow-sm hover:bg-[#f1f4f9] active:scale-[0.98] transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#154212] group-hover:bg-[#154212] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
            <span className="text-[12px] font-semibold text-[#181c20] mt-2 truncate w-full">
              Community
            </span>
            <span className="text-[10px] text-[#42493e] mt-0.5">Share logs</span>
          </button>

          {/* 2. Nearby Hotspots */}
          <button
            onClick={() => onNavigate('hotspots')}
            className="flex flex-col items-center text-center p-3 rounded-xl bg-white shadow-sm hover:bg-[#f1f4f9] active:scale-[0.98] transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#154212] group-hover:bg-[#154212] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">explore_nearby</span>
            </div>
            <span className="text-[12px] font-semibold text-[#181c20] mt-2 truncate w-full">
              Hotspots
            </span>
            <span className="text-[10px] text-[#42493e] mt-0.5">14 nearby</span>
          </button>

          {/* 3. Bird Quiz */}
          <button
            onClick={() => onNavigate('quiz')}
            className="flex flex-col items-center text-center p-3 rounded-xl bg-white shadow-sm hover:bg-[#f1f4f9] active:scale-[0.98] transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#904d00] group-hover:bg-[#fe932c] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">quiz</span>
            </div>
            <span className="text-[12px] font-semibold text-[#181c20] mt-2 truncate w-full">
              Bird quiz
            </span>
            <span className="text-[10px] text-[#42493e] mt-0.5">Test ear</span>
          </button>
        </div>
      </section>

      {/* Best Birds Today Section */}
      {notableBird && (
        <section className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[17px] font-semibold text-[#181c20]">Best birds today</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#ffdcc3] text-[#6e3900] text-[10px] flex items-center gap-1 font-bold">
              <span
                className="material-symbols-outlined text-[13px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              Notable
            </span>
          </div>

          <div
            onClick={() => onSelectSpecies(notableBird)}
            className="p-3.5 rounded-xl bg-white shadow-sm flex items-center justify-between relative overflow-hidden cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#154212]/5 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#c7ecce] flex items-center justify-center text-[#20402b] flex-shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">clock_loader_40</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[16px] font-bold text-[#181c20] truncate group-hover:text-[#154212] transition-colors">
                  {notableBird.name}
                </span>
                <div className="flex items-center gap-1 mt-0.5 text-[#42493e] min-w-0">
                  <span
                    className="material-symbols-outlined text-[14px] text-[#904d00] flex-shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    schedule
                  </span>
                  <span className="text-[12px] truncate">Seen 2h ago at Sanjay Van</span>
                </div>
              </div>
            </div>

            <button
              aria-label={`View ${notableBird.name} report details`}
              onClick={(e) => { e.stopPropagation(); onSelectSpecies(notableBird); }}
              className="w-8 h-8 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#181c20] group-hover:bg-[#2d5a27] group-hover:text-white transition-colors flex-shrink-0 ml-2"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
