import React, { useMemo, useState } from 'react';
import { Hotspot, ScreenType, BirdSpecies } from '../types';
import type { HotspotDetails } from '../lib/discovery';
import { hotspotDirectionsUrl } from '../lib/maps';
import { HotspotMap } from './HotspotMap';

interface HotspotDetailScreenProps {
  details?: HotspotDetails;
  detailsError?: string;
  onRetryDetails?: () => void;
  onSelectSpeciesById?: (id: string) => void;
  hotspot: Hotspot;
  onToggleSave: (hotspotId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  onSelectSpeciesByName: (name: string) => void;
  showToast: (message: string) => void;
}

export const HotspotDetailScreen: React.FC<HotspotDetailScreenProps> = ({
  details,
  detailsError,
  onRetryDetails,
  onSelectSpeciesById,
  hotspot,
  onToggleSave,
  onNavigate,
  onSelectSpeciesByName,
  showToast,
}) => {
  const isSaved = Boolean(hotspot.isSaved);
  const [openAccordion, setOpenAccordion] = useState<string | null>('visit');
  const mapHotspots = useMemo(() => [hotspot], [hotspot]);
  const directionsUrl = hotspotDirectionsUrl(hotspot);
  const recentSightings = hotspot.source ? details?.recentSightings || [] : hotspot.recentSightings;
  const speciesList = hotspot.source ? details?.speciesList || [] : hotspot.speciesList;
  const selectSpecies = (id: string | undefined, name: string) => {
    if (hotspot.source) {
      if (id && onSelectSpeciesById) onSelectSpeciesById(id);
      else showToast('This species is not available in the loaded catalogue.');
    } else onSelectSpeciesByName(name);
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordion((prev) => (prev === id ? null : id));
  };

  const handleToggleSave = () => {
    onToggleSave(hotspot.id);
  };

  return (
    <div className="flex flex-col w-full pb-28 pt-0">
      {/* Top Location Hero Banner */}
      <div className="relative w-full h-56 overflow-hidden bg-[#ebeef3]">
        <img
          src={hotspot.imageUrl}
          alt={hotspot.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2d3135]/90 via-[#2d3135]/30 to-transparent"></div>

        {/* Favorite & Map Floating Pill */}
        <div className="absolute top-3 right-4 flex items-center gap-2">
          <button
            onClick={handleToggleSave}
            aria-label="Bookmark this sanctuary"
            aria-pressed={isSaved}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-sm flex items-center justify-center text-[#181c20] hover:bg-white active:scale-95 transition-all"
          >
            <span
              className={`material-symbols-outlined text-[20px] transition-colors ${
                isSaved ? 'text-[#904d00]' : 'text-[#181c20]'
              }`}
              style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
            >
              {isSaved ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>
        </div>

        {/* Title & Geo Badging */}
        <div className="absolute bottom-3 left-4 right-4 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/90 backdrop-blur-sm text-[#181c20] text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px] text-[#2d5a27]">
                location_on
              </span>
              {hotspot.region}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#fe932c] text-white text-[11px] font-bold">
              {hotspot.source ? 'eBird Hotspot' : 'Wetland Hotspot'}
            </span>
          </div>
          <h2 className="text-[24px] font-bold text-white tracking-tight leading-none drop-shadow-sm">
            {hotspot.name}
          </h2>
        </div>
      </div>

      {/* Summary Metric Chips Panel */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 gap-2 bg-[#f1f4f9] p-3 rounded-2xl shadow-xs">
          <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-white shadow-xs">
            <span className="material-symbols-outlined text-[20px] text-[#2d5a27] mb-0.5">
              flutter_dash
            </span>
            <span className="text-[17px] font-bold text-[#181c20] leading-tight">
              {hotspot.activeTodayCount ?? 'Unavailable'}
            </span>
            <span className="text-[10px] text-[#42493e] font-semibold mt-0.5">Active today</span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-white shadow-xs">
            <span className="material-symbols-outlined text-[20px] text-[#904d00] mb-0.5">
              wb_twilight
            </span>
            <span className="text-[17px] font-bold text-[#181c20] leading-tight">{hotspot.source ? 'Unavailable' : '06:00'}</span>
            <span className="text-[10px] text-[#42493e] font-semibold mt-0.5">{hotspot.source ? 'Peak time' : 'Peak (06–09h)'}</span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-2 rounded-xl bg-white shadow-xs">
            <span className="material-symbols-outlined text-[20px] text-[#154212] mb-0.5">
              thermostat
            </span>
            <span className="text-[17px] font-bold text-[#181c20] leading-tight">
              {hotspot.temp}
            </span>
            <span className="text-[10px] text-[#42493e] font-semibold mt-0.5 truncate w-full">
              {hotspot.weatherCondition}
            </span>
          </div>
        </div>
      </div>

      {/* Action CTA Buttons Strip */}
      <div className="px-4 pt-3 grid grid-cols-3 gap-2">
        <button
          onClick={handleToggleSave}
          className={`h-11 flex items-center justify-center gap-1.5 rounded-xl font-semibold text-[13px] transition-all active:scale-95 ${
            isSaved
              ? 'bg-[#ffdcc3] text-[#6e3900]'
              : 'bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20]'
          }`}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
          >
            {isSaved ? 'bookmark' : 'bookmark_border'}
          </span>
          <span>SAVE</span>
        </button>

        <button
          onClick={() => {
            setOpenAccordion('visit');
            document.getElementById('accordion-visit')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-[#2d5a27] text-white font-semibold text-[13px] shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">navigation</span>
          <span>PLAN VISIT</span>
        </button>

        <button
          onClick={() => {
            setOpenAccordion('species');
            document.getElementById('accordion-species')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20] font-semibold text-[13px] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">menu_book</span>
          <span>SPECIES</span>
        </button>
      </div>

      {/* Section 1: Recent Sightings */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#154212]"></span>
            <h3 className="text-[17px] font-bold text-[#181c20]">Recent Sightings</h3>
          </div>
          <span className="text-[11px] text-[#42493e] font-semibold">{hotspot.source ? 'This hotspot, past 14 days' : 'Past 4 hours'}</span>
        </div>

        <div className="flex flex-col gap-2">
          {hotspot.source && <p className="text-[12px] text-[#42493e]">Latest report per species at this hotspot, not total sightings or a complete history.</p>}
          {hotspot.source && !details && !detailsError && <p role="status" className="text-[12px] text-[#42493e]">Loading hotspot reports and species...</p>}
          {hotspot.source && detailsError && <div role="alert" className="text-[12px] text-[#42493e]"><p>{detailsError}</p><button type="button" onClick={onRetryDetails} className="mt-2 font-semibold text-[#154212] underline">Try again</button></div>}
          {details && <p className="text-[11px] text-[#42493e]">Retrieved {new Date(details.fetchedAt).toLocaleString()}{details.cached ? ' (cached)' : ''}. Observation times are local to the location.</p>}
          {details && recentSightings.length === 0 && <p className="text-[12px] text-[#42493e]">No recent reports returned. This does not mean no birds occur here.</p>}
          {recentSightings.map((sight, idx) => (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => selectSpecies(sight.speciesId, sight.species)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectSpecies(sight.speciesId, sight.species); } }}
              className="flex items-center justify-between p-2.5 bg-white rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={sight.image}
                  alt={sight.species}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] font-bold text-[#181c20] truncate">
                    {sight.species}
                  </span>
                  <span className="text-[11px] italic text-[#42493e] truncate">
                    {sight.scientific}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end flex-shrink-0 pl-2">
                <span className="px-2 py-0.5 rounded-full bg-[#f1f4f9] text-[#154212] text-[10px] font-bold">
                  {hotspot.source ? sight.count === null ? 'Count unavailable' : `${sight.count} individuals` : `${sight.count} sightings`}
                </span>
                <span className="text-[10px] text-[#42493e] mt-1">{sight.timeAgo}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Recent Photographs Strip */}
      <div className="pt-5">
        <div className="px-4 flex items-center justify-between mb-2">
          <h3 className="text-[17px] font-bold text-[#181c20]">Recent Field Photographs</h3>
          <span className="text-[11px] text-[#42493e] font-semibold">Local birders</span>
        </div>

        <div className="flex gap-2.5 px-4 overflow-x-auto no-scrollbar pb-1">
          {hotspot.photos.map((item, i) => (
            <div
              key={i}
              className="relative flex-shrink-0 w-32 h-40 rounded-xl overflow-hidden shadow-xs bg-[#ebeef3]"
            >
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                <span className="text-[11px] font-bold text-white truncate">{item.title}</span>
                <span className="text-[10px] text-white/80 truncate">{item.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Field Notes & Gear */}
      <div className="px-4 pt-5">
        <div className="p-4 bg-[#f1f4f9] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[20px] text-[#2d5a27]">hiking</span>
            <h3 className="text-[16px] font-bold text-[#181c20]">Field Notes & Gear</h3>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e0e3e8] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#181c20]">
              <span className="material-symbols-outlined text-[18px]">terrain</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-[#181c20]">Trail Difficulty</span>
              <span className="text-[12px] text-[#42493e] leading-snug">
                {hotspot.trailDifficulty}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e0e3e8] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#181c20]">
              <span className="material-symbols-outlined text-[18px]">camera</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-[#181c20]">Recommended Optics & Gear</span>
              <span className="text-[12px] text-[#42493e] leading-snug">
                {hotspot.recommendedGear}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Accordions */}
      <div className="px-4 pt-5 space-y-2.5">
        {/* Accordion 1: Plan Visit & Entry Gates */}
        <div id="accordion-visit" className="bg-white rounded-xl overflow-hidden shadow-xs border border-[#f1f4f9]">
          <button
            onClick={() => toggleAccordion('visit')}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#f1f4f9] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#ebeef3] flex items-center justify-center text-[#154212]">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
              </div>
              <span className="text-[15px] font-bold text-[#181c20]">
                Plan Visit & Entry Gates
              </span>
            </div>
            <span
              className={`material-symbols-outlined text-[#42493e] transition-transform duration-200 ${
                openAccordion === 'visit' ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>

          {openAccordion === 'visit' && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-2">
              <div className="p-3 rounded-xl bg-[#f1f4f9] text-[#181c20] text-[13px] space-y-1.5">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#42493e]">Gates Opening Hours</span>
                  <span className="font-bold text-[#154212]">{hotspot.openingHours}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#42493e]">Entry Fee</span>
                  <span className="font-semibold">{hotspot.entryFee}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#42493e]">Still Camera Pass</span>
                  <span className="font-semibold">{hotspot.cameraPass}</span>
                </div>
                <p className="mt-2 text-[#42493e] text-[11px] leading-relaxed pt-1 border-t border-[#e0e3e8]">
                  {hotspot.transitTip}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: Detailed Micro-Weather */}
        <div className="bg-white rounded-xl overflow-hidden shadow-xs border border-[#f1f4f9]">
          <button
            onClick={() => toggleAccordion('weather')}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#f1f4f9] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#ebeef3] flex items-center justify-center text-[#904d00]">
                <span className="material-symbols-outlined text-[18px]">air</span>
              </div>
              <span className="text-[15px] font-bold text-[#181c20]">
                Detailed Micro-Weather
              </span>
            </div>
            <span
              className={`material-symbols-outlined text-[#42493e] transition-transform duration-200 ${
                openAccordion === 'weather' ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>

          {openAccordion === 'weather' && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-[#f1f4f9] flex flex-col">
                  <span className="text-[10px] text-[#42493e] font-semibold">Wind Speed</span>
                  <span className="text-[14px] font-bold text-[#181c20]">{hotspot.wind}</span>
                  <span className="text-[11px] text-[#154212] font-medium">
                    {hotspot.source ? 'Guidance not connected' : 'Ideal for perched birds'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#f1f4f9] flex flex-col">
                  <span className="text-[10px] text-[#42493e] font-semibold">Humidity & Mist</span>
                  <span className="text-[14px] font-bold text-[#181c20]">{hotspot.source ? 'Unavailable' : '68% • Clearing'}</span>
                  <span className="text-[11px] text-[#42493e]">{hotspot.source ? 'Weather not connected' : 'Mist burns by 07:15'}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f1f4f9] flex items-center gap-2 text-[12px] text-[#181c20]">
                <span className="material-symbols-outlined text-[18px] text-[#904d00]">
                  light_mode
                </span>
                <span>{hotspot.source ? 'Sunrise and golden hour not connected' : 'Sunrise: 06:14 • Golden hour ends 07:45'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 3: View All Hotspot Species */}
        <div id="accordion-species" className="bg-white rounded-xl overflow-hidden shadow-xs border border-[#f1f4f9]">
          <button
            onClick={() => toggleAccordion('species')}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#f1f4f9] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#ebeef3] flex items-center justify-center text-[#154212]">
                <span className="material-symbols-outlined text-[18px]">
                  format_list_bulleted
                </span>
              </div>
              <span className="text-[15px] font-bold text-[#181c20]">
                {hotspot.source ? `Species recorded all time (${hotspot.speciesCount ?? 'Unknown'})` : `View All Hotspot Species (${hotspot.speciesCount || 188})`}
              </span>
            </div>
            <span
              className={`material-symbols-outlined text-[#42493e] transition-transform duration-200 ${
                openAccordion === 'species' ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>

          {openAccordion === 'species' && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-1.5">
              {hotspot.source && <p className="text-[12px] text-[#42493e]">All-time recorded species, distinct from recent activity. {details ? `${speciesList.length} catalogue species matched; ${details.unmatchedTaxa} other taxa could not be matched.` : detailsError ? 'Species list unavailable; retry above.' : 'Loading species list...'}</p>}
              {details && speciesList.length === 0 && <p className="text-[12px] text-[#42493e]">No catalogue species matched this list.</p>}
              {speciesList.map((sp, i) => (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectSpecies(sp.speciesId, sp.name)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectSpecies(sp.speciesId, sp.name); } }}
                  className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-[#f1f4f9] cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-[13px] font-bold text-[#181c20]">{sp.name}</p>
                    <p className="text-[11px] italic text-[#42493e]">{sp.scientific}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${sp.statusColor}`}>
                    {sp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!hotspot.source && <>
      {/* Sanctuary Map & Access */}
      <div className="px-4 pt-5">
        <div className="p-3.5 bg-white rounded-2xl shadow-xs border border-[#f1f4f9]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[15px] font-bold text-[#181c20]">Sanctuary Map & Access</span>
            <span className="text-[11px] font-mono text-[#42493e]">{hotspot.coordinates}</span>
          </div>
          <div className="w-full h-40 rounded-xl bg-[#ebeef3] bg-cover bg-center flex items-center justify-center relative overflow-hidden">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLleV9fLCzYR8V5eZzMFUDF_DDa2p5Y4odVcNeDwXKD8Jn1Zg7s4Vn4hDJwnQ-OzZwVv3J76aTJ7_63xFKt7ORzxtN8oLXe5DGtpoEmz4U71YDB7c45F0H3DH1zledFONKorO_59-M-7oQmS9ZDE19054qz1E0ZymqcqGNKUgLeitM3Ce1mE-F6e0-0CabFEAGpW8ojqwBIANkj1bl5sh33esmFDjY7fw4tEm5b2XkY-R-KZ6IbQr4zg"
              alt="Barrage Point"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm shadow-md flex items-center gap-1.5 text-[#181c20]">
              <span className="material-symbols-outlined text-[16px] text-[#2d5a27]">near_me</span>
              <span className="text-[12px] font-bold">Barrage Watchtower Point</span>
            </div>
          </div>
        </div>
      </div>
      </>}
      {hotspot.source && <div className="mx-4 mt-4 rounded-xl bg-white p-4 text-[13px] text-[#42493e]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-[#181c20]">Sanctuary Map &amp; Access</h3><span className="text-[11px] font-mono">{hotspot.coordinates}</span></div>
        <HotspotMap hotspots={mapHotspots} label={`Map of ${hotspot.name}`} selectedId={hotspot.id} />
        {directionsUrl ? <a href={directionsUrl} target="_blank" rel="noreferrer" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2d5a27] font-semibold text-white"><span className="material-symbols-outlined text-[18px]">directions</span>Open directions</a> : <p role="status" className="mt-2">Directions unavailable: this hotspot has no valid coordinates.</p>}
        <p className="mt-2 text-[11px]">Directions open Google Maps at the hotspot coordinates. Entry-gate information remains unavailable.</p>
        <a href={hotspot.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-[#154212] underline">View hotspot on eBird</a>
      </div>}
    </div>
  );
};
