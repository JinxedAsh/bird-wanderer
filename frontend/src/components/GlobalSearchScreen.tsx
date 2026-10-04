import React, { useState } from 'react';
import { BirdSpecies, Hotspot, ScreenType, CommunityPost } from '../types';
import { SpeciesPhoto } from './SpeciesPhoto';

interface GlobalSearchScreenProps {
  recentSearches?: string[];
  savedSpeciesIds?: string[];
  historyDisabled?: boolean;
  onRecordSearch?: (term: string) => void;
  onRemoveSearch?: (term?: string) => void;
  onSessionExpired?: () => void;
  externalDiscovery?: boolean;
  onSelectSpecies: (species: BirdSpecies) => void;
  onSelectHotspot: (hotspot: Hotspot) => void;
  onNavigate: (screen: ScreenType) => void;
  speciesList: BirdSpecies[];
  hotspots: Hotspot[];
  posts: CommunityPost[];
}

export const GlobalSearchScreen: React.FC<GlobalSearchScreenProps> = ({
  recentSearches = [],
  savedSpeciesIds = [],
  historyDisabled = false,
  onRecordSearch,
  onRemoveSearch,
  onSessionExpired,
  externalDiscovery = false,
  onSelectSpecies,
  onSelectHotspot,
  onNavigate,
  speciesList,
  hotspots,
  posts,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'birds' | 'people' | 'hotspots' | 'posts'>('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const recordSearch = () => {
    const term = query.trim().replace(/\s+/g, ' ');
    if (term) onRecordSearch?.(term);
  };
  const selectBird = (bird: BirdSpecies) => { recordSearch(); onSelectSpecies(bird); };
  const selectHotspot = (hotspot: Hotspot) => { recordSearch(); onSelectHotspot(hotspot); };

  const q = query.toLowerCase().trim();

  // Matched results
  const matchingBirds = speciesList.filter(
    (b) => (!savedOnly || savedSpeciesIds.includes(b.id)) && (!q || b.name.toLowerCase().includes(q) || b.scientificName.toLowerCase().includes(q))
  );
  const matchedBirds = matchingBirds.slice(0, 60);

  const matchedHotspots = hotspots.filter(
    (h) => !q || h.name.toLowerCase().includes(q) || h.region.toLowerCase().includes(q)
  );

  const people = [...new Map(posts.map((post) => [post.authorHandle, post])).values()];
  const matchedPeople = people.filter((person) =>
    !q || person.authorName.toLowerCase().includes(q) || person.authorHandle.toLowerCase().includes(q)
  );
  const matchedPosts = posts.filter((post) =>
    !q || [post.speciesName, post.speciesScientific, post.authorName, post.location, post.caption]
      .some((value) => value.toLowerCase().includes(q))
  );

  const showBirds = activeCategory === 'all' || activeCategory === 'birds';
  const showPeople = activeCategory === 'all' || activeCategory === 'people';
  const showHotspots = activeCategory === 'all' || activeCategory === 'hotspots';
  const showPosts = activeCategory === 'all' || activeCategory === 'posts';

  const hasAnyResult =
    (showBirds && matchedBirds.length > 0) ||
    (showPeople && matchedPeople.length > 0) ||
    (showHotspots && matchedHotspots.length > 0) ||
    (showPosts && matchedPosts.length > 0);

  return (
    <div className="flex flex-col w-full px-4 pb-28 pt-2">
      {/* Search Bar */}
      <div className="pt-1 pb-2">
        <div className="relative flex items-center bg-white rounded-xl shadow-xs px-3.5 py-0.5 min-h-12 border border-[#f1f4f9] focus-within:bg-[#f1f4f9]">
          <span className="material-symbols-outlined text-[#72796e] text-[20px] flex-shrink-0">
            search
          </span>
          <input
            aria-label="Search birds, hotspots, birders and posts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') recordSearch(); }}
            maxLength={100}
            placeholder="Search birds, hotspots, birders..."
            className="w-full min-w-0 bg-transparent border-0 outline-none px-2.5 text-[14px] text-[#181c20] placeholder:text-[#72796e]"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-[#42493e] hover:bg-[#ebeef3]"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {(['all', 'birds', 'people', 'hotspots', 'posts'] as const).map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`min-h-11 px-3.5 py-1.5 rounded-full text-[12px] font-semibold capitalize transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#154212] text-white shadow-xs'
                  : 'bg-[#ebeef3] text-[#42493e] hover:bg-[#e0e3e8]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {(activeCategory === 'all' || activeCategory === 'birds') && externalDiscovery && (
        <label className="mt-2 flex items-center gap-2 text-[12px] text-[#42493e]">
          <input type="checkbox" checked={savedOnly} onChange={(event) => setSavedOnly(event.target.checked)} />
          Saved birds only
        </label>
      )}
      {onRecordSearch && <p className="mt-2 text-[11px] text-[#72796e]">Press Enter or open a bird/hotspot result to keep this search.</p>}

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="pt-3 pb-2">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#72796e]">
              Recent Searches
            </span>
            <button
              disabled={historyDisabled}
              onClick={() => onRemoveSearch?.()}
              className="min-h-11 min-w-11 px-2 text-[11px] font-semibold text-[#154212] hover:underline"
            >
              Clear All
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {recentSearches.map((term) => (
              <div
                key={term}
                className="inline-flex max-w-full items-center gap-1.5 bg-[#f1f4f9] text-[#181c20] px-3 py-1 rounded-full text-[12px] font-medium"
              >
                <button
                  type="button"
                  disabled={historyDisabled}
                  onClick={() => { setQuery(term); onRecordSearch?.(term); }}
                  className="min-h-11 min-w-0 text-left break-words cursor-pointer hover:text-[#154212]"
                >
                  {term}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${term} from recent searches`}
                  disabled={historyDisabled}
                  onClick={() => onRemoveSearch?.(term)}
                  className="h-11 w-11 shrink-0 flex items-center justify-center text-[#72796e] hover:text-[#181c20]"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBirds && matchingBirds.length > 60 && <p role="status" className="text-[12px] text-[#42493e]">Showing 60 of {matchingBirds.length} species. Refine your search to see more.</p>}
      {/* Search Results Stream */}
      {externalDiscovery && (showPeople || showPosts) && <p className="text-[12px] text-[#42493e]">People and community posts are still demonstration data.</p>}
      <div className="flex flex-col gap-2.5 pt-2">
        {/* Bird Result */}
        {showBirds && matchedBirds.map((bird) => (
          <article
            key={bird.id}
            onClick={() => selectBird(bird)}
            className="w-full text-left grid grid-cols-[64px_1fr_auto] items-center gap-x-3 p-3 bg-white rounded-xl shadow-xs hover:bg-[#f1f4f9] transition-all cursor-pointer border border-[#f1f4f9]"
          >
            <SpeciesPhoto key={bird.id} species={bird} onSessionExpired={onSessionExpired} frameClassName="w-16 h-16 rounded-xl overflow-hidden bg-[#ebeef3]" />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={(event) => { event.stopPropagation(); selectBird(bird); }} className="text-left text-[15px] font-bold text-[#181c20] truncate">
                  {bird.name}
                </button>
                <span className="bg-[#ffdcc3] text-[#6e3900] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  Species
                </span>
              </div>
              <p className="text-[12px] italic text-[#72796e] truncate">
                {bird.scientificName}
              </p>
              <div className="flex items-center gap-1 mt-1 text-[#42493e] text-[11px] font-semibold">
                <span
                  className="material-symbols-outlined text-[#3b6934] text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  visibility
                </span>
                <span>{bird.source ? bird.recentObservations?.length ? 'Recent regional report available' : 'No recent regional report in this response' : `${bird.sightingsThisWeek ?? 0} local sightings this week`}</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#c2c9bb] text-[20px]">
              chevron_right
            </span>
          </article>
        ))}

        {/* Person Result */}
        {showPeople && matchedPeople.map((person) => (
          <button
            type="button"
            key={person.authorHandle}
            onClick={() => onNavigate('messages')}
            className="w-full text-left flex items-center gap-3 p-3 bg-white rounded-xl shadow-xs hover:bg-[#f1f4f9] transition-all cursor-pointer border border-[#f1f4f9]"
          >
            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-[#ebeef3]">
              <img
                src={person.authorAvatar}
                alt={person.authorName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-[#181c20] truncate">{person.authorName}</span>
                <span className="bg-[#c7ecce] text-[#01210f] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {person.authorBadge || 'Birder'}
                </span>
              </div>
              <p className="text-[12px] text-[#72796e] truncate">{person.authorHandle}</p>
              <div className="flex items-center gap-1 mt-1 text-[#42493e] text-[11px] font-semibold">
                <span
                  className="material-symbols-outlined text-[#904d00] text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  photo_camera
                </span>
                <span>{posts.filter((post) => post.authorHandle === person.authorHandle).length} community posts</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#c2c9bb] text-[20px]">
              chevron_right
            </span>
          </button>
        ))}

        {/* Hotspot Result */}
        {showHotspots && matchedHotspots.map((hotspot) => (
          <button
            type="button"
            key={hotspot.id}
            onClick={() => selectHotspot(hotspot)}
            className="w-full text-left flex items-center gap-3 p-3 bg-white rounded-xl shadow-xs hover:bg-[#f1f4f9] transition-all cursor-pointer border border-[#f1f4f9]"
          >
            <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-[#2d5a27] text-white flex-shrink-0">
              <span
                className="material-symbols-outlined text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                location_on
              </span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-[#181c20] truncate">
                  {hotspot.name}
                </span>
              </div>
              <p className="text-[12px] text-[#72796e] truncate">
                {hotspot.region} • {hotspot.distanceKm == null ? 'Distance unavailable' : `${hotspot.distanceKm.toFixed(1)} km away`}
              </p>
              <div className="flex items-center gap-1 mt-1 text-[#42493e] text-[11px] font-semibold">
                <span className="material-symbols-outlined text-[#154212] text-[14px]">eco</span>
                <span className="text-[#3b6934] font-bold">{hotspot.source ? `${hotspot.speciesCount ?? 'Unknown'} species recorded all time` : `${hotspot.activeTodayCount} species active today`}</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#c2c9bb] text-[20px]">
              chevron_right
            </span>
          </button>
        ))}

        {/* Community Post Result */}
        {showPosts && matchedPosts.map((post) => (
          <button
            type="button"
            key={post.id}
            onClick={() => onNavigate('community')}
            className="w-full text-left flex items-center gap-3 p-3 bg-white rounded-xl shadow-xs hover:bg-[#f1f4f9] transition-all cursor-pointer border border-[#f1f4f9]"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#ebeef3]">
              <img
                src={post.imageUrl}
                alt={post.speciesName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-[#181c20] truncate">
                  {post.speciesName}
                </span>
              </div>
              <p className="text-[12px] text-[#42493e] line-clamp-1">{post.location}</p>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-[#72796e]">
                <span>By {post.authorName}</span>
                <span>•</span>
                <span>{post.timeAgo}</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#c2c9bb] text-[20px]">
              chevron_right
            </span>
          </button>
        ))}

        {/* Empty State */}
        {!hasAnyResult && (
          <div className="py-14 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#ebeef3] flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[#72796e] text-[32px]">
                travel_explore
              </span>
            </div>
            <span className="text-[16px] font-bold text-[#181c20]">No wanderings found</span>
            <p className="text-[13px] text-[#42493e] mt-1 max-w-[240px]">
              Try adjusting your search terms or exploring nearby regional checklist hotspots.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
