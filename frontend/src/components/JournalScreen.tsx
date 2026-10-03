import React, { useState } from 'react';
import { JournalEntry, ScreenType } from '../types';

interface JournalScreenProps {
  entries: JournalEntry[];
  onNavigate: (screen: ScreenType) => void;
  onToggleLifeList: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  showToast: (message: string) => void;
}

export const JournalScreen: React.FC<JournalScreenProps> = ({
  entries,
  onNavigate,
  onToggleLifeList,
  onDeleteEntry,
  showToast,
}) => {
  const [activeEntryId, setActiveEntryId] = useState<string>(entries[0]?.id || '');
  const activeEntry = entries.find((e) => e.id === activeEntryId) || entries[0];

  return (
    <div className="flex flex-col w-full px-4 pb-28 pt-1">
      {/* Session Title Strip */}
      <div className="pt-2 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-wider text-[#154212]">
            Field Log
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#fe932c]"></span>
          <span className="text-[13px] text-[#42493e]">Autumn Session</span>
        </div>
        <div className="flex items-center gap-1 bg-[#e0e3e8] px-2.5 py-1 rounded-full text-[#42493e] text-[11px] font-semibold">
          <span className="material-symbols-outlined text-[15px] text-[#154212]">filter_list</span>
          <span>All Logs</span>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="w-full bg-[#f1f4f9] rounded-2xl p-4 mb-5 shadow-sm">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="text-[32px] font-bold text-[#181c20] leading-none">47</span>
              <span
                className="material-symbols-outlined text-[#154212] text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                eco
              </span>
            </div>
            <span className="text-[12px] font-semibold text-[#42493e] mt-1">Birds</span>
          </div>

          <div className="flex flex-col items-center border-x border-[#e0e3e8]">
            <div className="flex items-center gap-1">
              <span className="text-[32px] font-bold text-[#181c20] leading-none">128</span>
              <span className="material-symbols-outlined text-[#904d00] text-[18px]">
                photo_camera
              </span>
            </div>
            <span className="text-[12px] font-semibold text-[#42493e] mt-1">Photos</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="text-[32px] font-bold text-[#181c20] leading-none">23</span>
              <span className="material-symbols-outlined text-[#20402b] text-[18px]">explore</span>
            </div>
            <span className="text-[12px] font-semibold text-[#42493e] mt-1">Trips</span>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-[18px] font-bold text-[#181c20]">Recent photographs</h2>
          <span className="bg-[#e0e3e8] text-[#42493e] text-[11px] font-bold px-2 py-0.5 rounded-full">
            {entries.length}
          </span>
        </div>

        <button
          onClick={() => onNavigate('log-observation')}
          className="h-9 px-3.5 bg-[#2d5a27] hover:bg-[#154212] text-white rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all text-[12px] font-semibold"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>+ Add photograph</span>
        </button>
      </div>

      {/* 2x2 Grid of Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {entries.map((entry) => {
          const isSelected = entry.id === activeEntryId;
          return (
            <div
              key={entry.id}
              onClick={() => setActiveEntryId(entry.id)}
              className={`group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-all border ${
                isSelected ? 'border-[#154212] ring-2 ring-[#154212]/30' : 'border-transparent'
              }`}
            >
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#ebeef3]">
                <img
                  src={entry.imageUrl}
                  alt={entry.speciesName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {entry.rawBadge && (
                  <span
                    className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-sm ${
                      entry.rawBadge === 'Rare'
                        ? 'bg-[#ffdcc3] text-[#6e3900]'
                        : 'bg-white/90 backdrop-blur-sm text-[#181c20]'
                    }`}
                  >
                    {entry.rawBadge}
                  </span>
                )}
              </div>

              <div className="p-2.5 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-[#181c20] truncate">
                    {entry.speciesName}
                  </h3>
                  <p className="text-[11px] italic text-[#42493e] truncate">
                    {entry.scientificName}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[#f1f4f9]">
                  <span className="text-[10px] text-[#72796e] truncate">
                    {entry.date.split('·')[0].trim()}
                  </span>
                  <span className="material-symbols-outlined text-[#154212] text-[15px]">
                    visibility
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ACTIVE LOG ENTRY CARD */}
      {activeEntry && (
        <div className="w-full bg-white rounded-2xl p-4 shadow-sm flex flex-col transition-all border border-[#f1f4f9]">
          <div className="flex items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#154212]"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#154212]">
                Active Log Entry
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#42493e]">
              <span className="material-symbols-outlined text-[18px]">photo_camera_back</span>
              <span className="text-[11px] font-semibold">Entry #{activeEntry.id.replace('entry-', '04')}</span>
            </div>
          </div>

          <div className="w-full aspect-[16/9] rounded-xl overflow-hidden relative bg-[#ebeef3] mb-3.5">
            <img
              src={activeEntry.imageUrl}
              alt={activeEntry.speciesName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
            <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
              <div>
                <h4 className="text-[18px] font-bold text-white drop-shadow-sm">
                  {activeEntry.speciesName}
                </h4>
                <span className="text-[12px] italic text-white/90">
                  {activeEntry.scientificName}
                </span>
              </div>
              <span className="bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">verified</span> Verified
              </span>
            </div>
          </div>

          {/* Details Bento */}
          <div className="grid grid-cols-2 gap-2 mb-3.5">
            <div className="bg-[#f1f4f9] p-2.5 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-[#154212] text-[18px] mt-0.5">
                location_on
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase text-[#42493e] block">
                  Location
                </span>
                <span className="text-[12px] font-bold text-[#181c20] truncate block">
                  {activeEntry.location}
                </span>
              </div>
            </div>

            <div className="bg-[#f1f4f9] p-2.5 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-[#154212] text-[18px] mt-0.5">
                calendar_today
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase text-[#42493e] block">
                  Date & Time
                </span>
                <span className="text-[12px] font-bold text-[#181c20] truncate block">
                  {activeEntry.date}
                </span>
              </div>
            </div>

            <div className="bg-[#f1f4f9] p-2.5 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-[#154212] text-[18px] mt-0.5">
                camera
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase text-[#42493e] block">
                  Gear
                </span>
                <span className="text-[12px] font-bold text-[#181c20] truncate block">
                  {activeEntry.gear}
                </span>
              </div>
            </div>

            <div className="bg-[#f1f4f9] p-2.5 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-[#904d00] text-[18px] mt-0.5">
                wb_sunny
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase text-[#42493e] block">
                  Weather
                </span>
                <span className="text-[12px] font-bold text-[#181c20] truncate block">
                  {activeEntry.weather}
                </span>
              </div>
            </div>
          </div>

          {/* Field notes */}
          <div className="bg-[#f1f4f9] rounded-xl p-3 mb-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#42493e] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">edit_note</span> Field Notes
              </span>
              <span className="text-[10px] text-[#154212] font-bold bg-[#bcf0ae] px-1.5 py-0.5 rounded">
                {activeEntry.habitatTag}
              </span>
            </div>
            <p className="text-[13px] text-[#181c20] leading-relaxed">{activeEntry.notes}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => showToast('Editing observation record...')}
              className="flex-1 h-11 bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20] rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-semibold active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span>Edit</span>
            </button>

            <button
              onClick={() => {
                onDeleteEntry(activeEntry.id);
                showToast('Entry removed from field log');
              }}
              aria-label="Delete entry"
              className="h-11 px-3 bg-[#ffdad6] hover:bg-red-200 text-[#93000a] rounded-xl flex items-center justify-center active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>

            <button
              onClick={() => {
                onToggleLifeList(activeEntry.id);
                showToast(
                  activeEntry.inLifeList
                    ? 'Removed from Life List'
                    : 'Added to Life List!'
                );
              }}
              className={`flex-[1.5] h-11 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-semibold shadow-sm active:scale-95 transition-all ${
                activeEntry.inLifeList
                  ? 'bg-[#2d5a27] text-white'
                  : 'bg-[#904d00] hover:bg-amber-700 text-white'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {activeEntry.inLifeList ? 'check_circle' : 'star'}
              </span>
              <span>{activeEntry.inLifeList ? 'In Life List' : 'Add to Life List'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
