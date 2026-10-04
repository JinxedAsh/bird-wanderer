import React, { useEffect, useRef, useState } from 'react';
import { BirdSpecies, ScreenType } from '../types';
import type { SpeciesLocations } from '../lib/discovery';

interface SpeciesDetailScreenProps {
  locations?: SpeciesLocations;
  locationsError?: string;
  onRetryLocations?: () => void;
  onSelectHotspotById?: (id: string) => void;
  species: BirdSpecies;
  onNavigate: (screen: ScreenType) => void;
  onQuickLog: (species: BirdSpecies) => void;
  showToast: (message: string) => void;
}

export const SpeciesDetailScreen: React.FC<SpeciesDetailScreenProps> = ({
  locations,
  locationsError,
  onRetryLocations,
  onSelectHotspotById,
  species,
  onNavigate,
  onQuickLog,
  showToast,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSightingsExpanded, setIsSightingsExpanded] = useState(true);
  const audioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (audioTimer.current) clearTimeout(audioTimer.current);
  }, []);

  const toggleAudio = () => {
    const nextState = !isPlayingAudio;
    if (audioTimer.current) clearTimeout(audioTimer.current);
    setIsPlayingAudio(nextState);
    if (nextState) {
      showToast('Audio preview is simulated. Recorded calls are not connected yet.');
      audioTimer.current = setTimeout(() => {
        setIsPlayingAudio(false);
        audioTimer.current = null;
      }, 4000);
    }
  };

  const toggleBookmark = () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    showToast(
      next
        ? `${species.name} saved to your field target list!`
        : `Removed from target list`
    );
  };

  return (
    <div className="flex flex-col w-full pb-28 pt-1">
      {/* Top Action Rail */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ffdcc3] text-[#6e3900] text-[11px] font-bold uppercase tracking-wider">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            Target Species
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#ebeef3] text-[#42493e] text-[11px] font-semibold">
            {species.orderFamily || 'Coraciiformes'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleBookmark}
            aria-label="Bookmark species"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isBookmarked
                ? 'bg-[#ffdcc3] text-[#6e3900]'
                : 'bg-[#ebeef3] text-[#181c20] hover:bg-[#e0e3e8]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
            >
              {isBookmarked ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>

          <button
            onClick={toggleAudio}
            aria-label="Listen to call"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isPlayingAudio
                ? 'bg-[#2d5a27] text-white'
                : 'bg-[#ebeef3] text-[#181c20] hover:bg-[#e0e3e8]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isPlayingAudio ? 'volume_up' : 'volume_down'}
            </span>
          </button>
        </div>
      </div>

      {/* Hero Photo Stage */}
      <div className="px-4 pb-3">
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#ebeef3] shadow-sm">
          <img
            src={species.image}
            alt={species.name}
            className="w-full h-full object-cover"
          />

          {/* Ambient Badge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#fe932c] animate-pulse"></span>
            <span>{species.source ? 'Photo metadata not connected yet' : 'Verified Field Shot • 1/2500s ƒ/5.6'}</span>
          </div>

          {/* Audio Visualizer Overlay Pill */}
          {isPlayingAudio && (
            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-[#2d5a27]/90 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
              <span className="inline-block w-1 h-3 bg-[#a1d494] animate-bounce rounded-full"></span>
              <span className="inline-block w-1 h-4 bg-[#a1d494] animate-bounce [animation-delay:0.15s] rounded-full"></span>
              <span className="inline-block w-1 h-2 bg-[#a1d494] animate-bounce [animation-delay:0.3s] rounded-full"></span>
              <span className="ml-1">{species.audioCallDesc || "High whistle 'chee-kee'"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Species Title & Nomenclature */}
      <div className="px-4 pt-1 pb-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[26px] font-bold text-[#181c20] tracking-tight">{species.name}</h2>
          <span className="text-[11px] text-[#904d00] px-2 py-0.5 rounded bg-[#ffdcc3] uppercase tracking-widest font-bold">
            {species.iucnStatus || (species.source ? 'Status unavailable' : 'LC')}
          </span>
        </div>
        <p className="text-[14px] text-[#42493e] italic mt-0.5">
          {species.scientificName}{' '}
          <span className="not-italic text-[#72796e]">• {species.alias || 'Field Specimen'}</span>
        </p>
      </div>

      {/* Bento Grid Metadata */}
      <div className="px-4 grid grid-cols-2 gap-2.5 pb-5">
        {/* Habitat */}
        <div className="bg-[#f1f4f9] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#42493e]">
            <span className="material-symbols-outlined text-[18px] text-[#3b6934]">waves</span>
            <span className="text-[11px] font-bold uppercase tracking-wider">Habitat</span>
          </div>
          <div className="mt-2">
            <span className="text-[16px] font-bold text-[#181c20] block leading-tight">
              {species.habitat || 'Wetlands'}
            </span>
            <span className="text-[12px] text-[#42493e]">
              {species.habitatDetail || 'Rivers & reed ponds'}
            </span>
          </div>
        </div>

        {/* Best Time */}
        <div className="bg-[#f1f4f9] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#42493e]">
            <span className="material-symbols-outlined text-[18px] text-[#904d00]">wb_twilight</span>
            <span className="text-[11px] font-bold uppercase tracking-wider">Best Time</span>
          </div>
          <div className="mt-2">
            <span className="text-[16px] font-bold text-[#181c20] block leading-tight">
              {species.bestTime || '06:30 – 08:30'}
            </span>
            <span className="text-[12px] text-[#42493e]">
              {species.bestTimeDetail || 'Optimal low angle glare'}
            </span>
          </div>
        </div>

        {/* Sightings */}
        <div className="bg-[#f1f4f9] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#42493e]">
            <span className="material-symbols-outlined text-[18px] text-[#3b6934]">travel_explore</span>
            <span className="text-[11px] font-bold uppercase tracking-wider">Sightings</span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-[16px] font-bold text-[#181c20]">
                {species.source ? species.recentObservations?.length ? 'Reported' : 'Unavailable' : species.sightingsThisWeek ?? 0}
              </span>
              <span className="text-[12px] text-[#42493e]">{species.source ? 'past 14 days' : 'this week'}</span>
            </div>
            <span className="text-[12px] text-[#3b6934] font-medium truncate block">
              {species.region || 'Delhi-NCR region'}
            </span>
          </div>
        </div>

        {/* Photography Difficulty */}
        <div className="bg-[#f1f4f9] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#42493e]">
            <span className="material-symbols-outlined text-[18px] text-[#904d00]">shutter_speed</span>
            <span className="text-[11px] font-bold uppercase tracking-wider">Photography</span>
          </div>
          <div className="mt-2">
            <span className="text-[16px] font-bold text-[#181c20] block leading-tight">
              {species.photographyDifficulty || (species.source ? 'Unavailable' : 'Medium')}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-3 h-1.5 rounded-full bg-[#904d00]"></span>
              <span className="w-3 h-1.5 rounded-full bg-[#904d00]"></span>
              <span className="w-3 h-1.5 rounded-full bg-[#e0e3e8]"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Deck */}
      <div className="px-4 pb-5 flex gap-2.5">
        <button
          onClick={() => {
            setIsSightingsExpanded(true);
            document.getElementById('sightings-sheet-anchor')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex-1 h-12 rounded-xl bg-[#ebeef3] text-[#181c20] font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-[#e0e3e8] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">map</span>
          <span>VIEW SIGHTINGS</span>
        </button>

        <button
          onClick={() => showToast(species.source ? 'Photography logistics are not connected yet.' : `Suggested early morning session for ${species.name}. Trip saving is not connected yet.`)}
          className="flex-1 h-12 rounded-xl bg-[#2d5a27] text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
          <span>PLAN A SHOT</span>
        </button>
      </div>

      {/* Photography Field Note Card */}
      <div className="px-4 pb-5">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#f1f4f9]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#ffdcc3] flex items-center justify-center text-[#6e3900]">
              <span className="material-symbols-outlined text-[16px]">tips_and_updates</span>
            </div>
            <h3 className="text-[16px] font-bold text-[#181c20]">Field Guide & Technique</h3>
          </div>
          <p className="text-[13px] text-[#42493e] leading-relaxed">
            {species.fieldGuideNotes ||
              '400mm+ recommended. Kingfishers dive rapidly from low perches; maintain shutter speed at 1/2000s or faster in morning light. Look for regular fishing perches 1–2 meters above stagnant river channels.'}
          </p>

          {/* Audio Spectrogram Bar Pattern */}
          <div className="mt-3.5 bg-[#f1f4f9] rounded-xl p-2.5 flex items-center gap-2.5">
            <button
              onClick={toggleAudio}
              aria-label="Play audio snippet"
              className="w-8 h-8 rounded-full bg-[#2d5a27] text-white flex items-center justify-center flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isPlayingAudio ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <div className="flex-1 flex items-center gap-1 h-6 px-1">
              <span className="w-1 bg-[#3b6934] h-2 rounded-full"></span>
              <span className="w-1 bg-[#3b6934] h-4 rounded-full"></span>
              <span className="w-1 bg-[#3b6934] h-5 rounded-full"></span>
              <span className="w-1 bg-[#3b6934] h-3 rounded-full"></span>
              <span className="w-1 bg-[#fe932c] h-6 rounded-full"></span>
              <span className="w-1 bg-[#fe932c] h-5 rounded-full"></span>
              <span className="w-1 bg-[#3b6934] h-2 rounded-full"></span>
              <span className="w-1 bg-[#e0e3e8] h-3 rounded-full"></span>
              <span className="w-1 bg-[#e0e3e8] h-2 rounded-full"></span>
              <span className="w-1 bg-[#e0e3e8] h-1 rounded-full"></span>
              <span className="w-1 bg-[#e0e3e8] h-3 rounded-full"></span>
              <span className="w-1 bg-[#e0e3e8] h-4 rounded-full"></span>
              <span className="w-1 bg-[#e0e3e8] h-2 rounded-full"></span>
              <span className="w-1 bg-[#e0e3e8] h-1 rounded-full"></span>
            </div>
            <span className="text-[11px] font-semibold text-[#42493e] whitespace-nowrap">
              {species.audioCallDuration || '0:04 call'}
            </span>
          </div>
        </div>
      </div>

      {!species.source && <>
      {/* Recent Gallery Strip */}
      <div className="px-4 pb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[16px] font-bold text-[#181c20]">Community Field Captures</h3>
          <span className="text-[11px] font-semibold text-[#42493e]">32 uploads</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="aspect-square rounded-xl overflow-hidden bg-[#ebeef3] shadow-xs">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYO5LOV6gmKDcdxCIWn5WKufgXF7kreErhzDHQSnCIaa9WCrsQnKm5Z-_O5Lr104sF6JSYAk2-rkCNMBthC5rYxKAm-TRJU4WNMhZZL5ehKbu9mvpuAzAtuaWuORx3Wdr5PjIHb2drSYsyj-W89Yq9NboLQoD6iNqtcjTm9Df595AcPy-zOCj4iJOiWV2wNkf8Hu5vINPpA6qqA7p2q3gyweiWjOEzo4T_q0sfFbgNnorYzgPpk5xT8g"
              alt="Kingfisher diving"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square rounded-xl overflow-hidden bg-[#ebeef3] shadow-xs">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrYdi2ZuF85w9c0pdJooqpUg8s9t4krk2jFPGDv6uw7aVsxPPb8XPJO9w4NtZM1BRWz9QS11be6fcwiajg8rkEDvfEl9k_51qEUR7_NWRhrJwJbqJttkG3FzZhgRm4i-fwH-tQt9LUj_BJ75sEcirBZcHCIT3cAJSWP3VDq5bP75bc5GMaYOGOR-ZQyeRGMRplfgVd19HTFQqn4bF8-h3LEINSoSw138JhllqZPrH50TIdklZKlGUU0A"
              alt="Kingfisher with minnow"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square rounded-xl overflow-hidden bg-[#ebeef3] relative shadow-xs">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVTO1MxPBb9tvo5CIA5dQuUOJN4elBEI5S1PF9J7OEPlKQE0CiNUdEiWj4eLI36STG-BaycsTzdyanfH7hypmUjTDRW0oXWPVvK6XnJrBU2I05_iRK7jPuCfi994T9F3jfu3-LJZi_OkQWfviMR0t2yeuis8dr4YaQsEEKnp_WUK8xiLRwGO5Ztt4w_d1qD7Nas3cH2H2dTUKBJC82UVJyjDejJ987LIXt5qhqSIfUcalVJkyLaoBPRQ"
              alt="Kingfisher on reed"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center text-white font-bold text-[12px]">
              +29 more
            </div>
          </div>
        </div>
      </div>

      </>}

      {!species.source && <>
      {/* Sightings & Field Map Section */}
      <section
        id="sightings-sheet-anchor"
        className="w-full bg-white rounded-t-3xl shadow-md border-t border-[#f1f4f9] pt-3 pb-6 transition-all"
      >
        <div
          onClick={() => setIsSightingsExpanded(!isSightingsExpanded)}
          className="w-full px-4 pb-2 flex flex-col items-center justify-center cursor-pointer select-none"
        >
          <div className="w-10 h-1.5 bg-[#e0e3e8] rounded-full mb-3"></div>
          <div className="w-full flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2d5a27]"></span>
                <h3 className="text-[17px] font-bold text-[#181c20]">Sightings & Field Map</h3>
              </div>
              <p className="text-[11px] text-[#42493e]">
                Logged coords in Delhi-NCR (past 7 days)
              </p>
            </div>
            <button
              aria-label="Toggle sightings sheet"
              className="w-8 h-8 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#42493e]"
            >
              <span
                className={`material-symbols-outlined text-[20px] transition-transform ${
                  isSightingsExpanded ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
          </div>
        </div>

        {isSightingsExpanded && (
          <div className="px-4 pt-2 space-y-3">
            {/* Visual map preview */}
            <div className="relative w-full h-44 rounded-xl overflow-hidden bg-[#ebeef3] shadow-inner">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLleV9fLCzYR8V5eZzMFUDF_DDa2p5Y4odVcNeDwXKD8Jn1Zg7s4Vn4hDJwnQ-OzZwVv3J76aTJ7_63xFKt7ORzxtN8oLXe5DGtpoEmz4U71YDB7c45F0H3DH1zledFONKorO_59-M-7oQmS9ZDE19054qz1E0ZymqcqGNKUgLeitM3Ce1mE-F6e0-0CabFEAGpW8ojqwBIANkj1bl5sh33esmFDjY7fw4tEm5b2XkY-R-KZ6IbQr4zg"
                alt="Sightings Map"
                className="w-full h-full object-cover"
              />

              {/* Hotspot pin overlays */}
              <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="px-2 py-0.5 rounded-full bg-black/90 text-white text-[10px] shadow-md flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#904d00]"></span>
                  <span>Yamuna Ghats (4)</span>
                </div>
                <span className="material-symbols-outlined text-[#904d00] text-[22px] drop-shadow">
                  location_on
                </span>
              </div>

              <div className="absolute bottom-1/4 right-1/3 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="px-2 py-0.5 rounded-full bg-[#2d5a27] text-white text-[10px] shadow-md flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  <span>Okhla Sanctuary (8)</span>
                </div>
                <span className="material-symbols-outlined text-[#2d5a27] text-[24px] drop-shadow">
                  location_on
                </span>
              </div>

              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-semibold">
                Updated 3h ago
              </div>
            </div>

            {/* Coordinates List */}
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[#f1f4f9] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#e0e3e8] flex items-center justify-center text-[#3b6934]">
                    <span className="material-symbols-outlined text-[20px]">water</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#181c20]">
                      Okhla Bird Sanctuary
                    </div>
                    <div className="text-[11px] text-[#42493e] font-mono">
                      28.5632° N, 77.3089° E
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-[#181c20]">Today 06:45</div>
                  <div className="text-[11px] text-[#3b6934] font-semibold">3 individuals</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f1f4f9] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#e0e3e8] flex items-center justify-center text-[#904d00]">
                    <span className="material-symbols-outlined text-[20px]">kayaking</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#181c20]">
                      Yamuna Bio-Diversity Park
                    </div>
                    <div className="text-[11px] text-[#42493e] font-mono">
                      28.7183° N, 77.2144° E
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-[#181c20]">Yesterday</div>
                  <div className="text-[11px] text-[#904d00] font-semibold">Active plunge dive</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onQuickLog(species)}
              className="w-full h-11 rounded-xl bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20] font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">edit_location</span>
              <span>LOG YOUR SIGHTING HERE</span>
            </button>
          </div>
        )}
      </section>
      </>}
      {species.source && (
        <section id="sightings-sheet-anchor" className="mx-4 rounded-xl bg-white p-4 text-[13px] text-[#42493e]">
          <h3 className="font-bold text-[#181c20]">Recent Sightings &amp; Hotspots</h3>
          <p className="mt-2">Latest report at each matching hotspot in {species.region}, within 14 days. Select a location to explore it. Reports do not guarantee a sighting; interactive maps are not connected yet.</p>
          {!locations && !locationsError && <p role="status" className="mt-2">Loading locations for {species.name}...</p>}
          {locationsError && <div role="alert" className="mt-2"><p>{locationsError}</p><button type="button" onClick={onRetryLocations} className="mt-2 font-semibold text-[#154212] underline">Try again</button></div>}
          {locations && <p className="mt-2 text-[11px]">Retrieved {new Date(locations.fetchedAt).toLocaleString()}{locations.cached ? ' (cached)' : ''}. Observation times below are local to the location.</p>}
          {locations?.locations.length === 0 && <p className="mt-2">No recent reports at hotspots in the loaded region. This does not establish that the species is absent.</p>}
          {locations?.locations.map((location) => (
            <button type="button" key={location.hotspotId} aria-label={`Open hotspot ${location.name}`} onClick={() => onSelectHotspotById?.(location.hotspotId)} className="mt-2 w-full rounded-xl bg-[#f1f4f9] p-3 text-left hover:bg-[#ebeef3]">
              <span className="block font-semibold text-[#181c20]">{location.name}</span>
              <span className="block text-[12px]">{location.coordinates} - {location.observedAt}</span>
              <span className="block text-[12px]">{location.count === null ? 'Individual count unavailable' : `${location.count} individuals reported`}</span>
            </button>
          ))}
          <a href={species.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block font-semibold text-[#154212] underline">View species on eBird</a>
        </section>
      )}

    </div>
  );
};
