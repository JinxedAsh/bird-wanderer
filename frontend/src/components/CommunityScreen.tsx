import React, { useEffect, useState } from 'react';
import { CommunityPost, ScreenType } from '../types';
import { useDialogFocus } from '../lib/useDialogFocus';
import type { PublicBirder } from '../lib/observations';
import { routeQuery, shareAppLink } from '../lib/navigation';

interface CommunityScreenProps {
  onEntityChange?: (entity: {post?:string;person?:string}|null) => void;
  openPerson?: {id:string;request:number}|null;
  openPost?: {id:string;request:number}|null;
  people?: PublicBirder[];
  onToggleFollow?: (id: string, following: boolean) => Promise<boolean | undefined>;
  onPersonDetails?: (id: string) => Promise<PublicBirder>;
  onReport?: (id: string, reason: string, detail: string) => Promise<boolean | undefined>;
  onDeleteComment?: (id: string) => Promise<boolean | undefined>;
  nearbyEnabled?: boolean;
  onChooseLocation?: () => void;
  posts: CommunityPost[];
  onNavigate: (screen: ScreenType) => void;
  onSelectSpeciesById: (speciesId: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onAddComment: (postId: string, commentText: string) => Promise<boolean | undefined> | void;
  showToast: (message: string) => void;
}

export const CommunityScreen: React.FC<CommunityScreenProps> = ({
  onEntityChange,
  openPerson,
  openPost,
  people = [],
  onToggleFollow,
  onPersonDetails,
  onReport,
  onDeleteComment,
  nearbyEnabled = false,
  onChooseLocation,
  posts,
  onNavigate,
  onSelectSpeciesById,
  onToggleLike,
  onToggleSave,
  onAddComment,
  showToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'following' | 'birds' | 'people' | 'near-you'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Selected post for details sheet
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  useEffect(()=>{setSelectedPostId(openPost?.id||null);},[openPost]);
  const selectedPostForDetails = posts.find((post) => post.id === selectedPostId);
  const [newCommentInput, setNewCommentInput] = useState('');
  const [reportReason, setReportReason] = useState('identification');
  const [reportDetail, setReportDetail] = useState('');
  useEffect(() => {
    setNewCommentInput('');
    setReportDetail('');
    setReportReason('identification');
  }, [selectedPostId]);

  // Selected photographer for bio sheet
  const [selectedPhotographer, setSelectedPhotographer] = useState<{
    id?: string;
    isSelf?: boolean;
    name: string;
    handle: string;
    avatar: string;
    location: string;
    sightings: number;
    lifers: number;
    followers: string;
    bio: string;
    isFollowing?: boolean;
  } | null>(null);

  const openPostDetails=(id:string)=>{setSelectedPostId(id);onEntityChange?.({post:id});};
  const closePost=()=>{setSelectedPostId(null);onEntityChange?.(null);};
  const closePerson=()=>{setSelectedPhotographer(null);onEntityChange?.(null);};
  const postDialogRef = useDialogFocus(Boolean(selectedPostForDetails), closePost);
  const photographerDialogRef = useDialogFocus(Boolean(selectedPhotographer), closePerson);
  const isFollowing = (handle: string) =>
    selectedPhotographer?.handle===handle ? !!selectedPhotographer.isFollowing :
    people.find((person) => person.handle === handle)?.following ??
    posts.some((post) => post.authorHandle === handle && post.isFollowing);

  const filterOptions: Array<{ id: typeof activeFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'following', label: 'Following' },
    { id: 'birds', label: 'Birds' },
    { id: 'people', label: 'People' },
    { id: 'near-you', label: 'Near You' },
  ];

  const filteredPosts = posts.filter((post) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        post.speciesName.toLowerCase().includes(q) ||
        post.speciesScientific.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q) ||
        post.location.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (activeFilter === 'following') {
      return isFollowing(post.authorHandle);
    }
    if (activeFilter === 'near-you') return nearbyEnabled && post.isNearby;
    return true;
  });

  const showPerson = (person: PublicBirder, updateLink=true) => {
    setSelectedPhotographer({
      id: person.id,
      isSelf: person.isSelf,
      name: person.name,
      handle: person.handle,
      avatar: person.avatarUrl,
      location: person.location || 'Location not shared',
      sightings: person.photosCount,
      lifers: person.birdsCount,
      followers: String(person.followersCount),
      bio: person.bio || 'No biography shared.',
      isFollowing: person.following,
    });
    if(updateLink)onEntityChange?.({person:person.id});
  };
  useEffect(()=>{
    if(!openPerson){setSelectedPhotographer(null);return;}
    if(!onPersonDetails)return;let active=true;
    void onPersonDetails(openPerson.id).then(person=>{if(active)showPerson(person,false);}).catch(error=>{if(active)showToast(error instanceof Error?error.message:'Birder unavailable.');});
    return ()=>{active=false;};
  },[openPerson?.request]);
  const openPhotographerBio = async (post: CommunityPost) => {
    if (!post.authorId || !onPersonDetails) {
      showToast('This photographer profile is unavailable.');
      return;
    }
    try {
      showPerson(await onPersonDetails(post.authorId));
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') showToast(error.message);
    }
  };
  const handleToggleFollow = async (handle: string) => {
    const id =
      people.find((person) => person.handle === handle)?.id ||
      posts.find((post) => post.authorHandle === handle)?.authorId ||
      selectedPhotographer?.id;
    if (!id || !onToggleFollow) return;
    const next = !isFollowing(handle);
    if (await onToggleFollow(id, next)) {
      setSelectedPhotographer((previous) => (previous ? { ...previous, isFollowing: next } : null));
      showToast(next ? 'Following saved' : 'Unfollowed');
    }
  };

  const handlePostCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostForDetails || !newCommentInput.trim()) return;
    if ((await onAddComment(selectedPostForDetails.id, newCommentInput.trim())) === false) return;
    setNewCommentInput('');
    showToast('Observation note added');
  };

  return (
    <div className="community-screen flex flex-col w-full pb-28 pt-1">
      {/* Search and Action Hub */}
      <div className="px-4 pt-2 pb-2 flex flex-col gap-2.5 bg-[#f7f9ff] sticky top-16 z-20">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#42493e] text-[20px] pointer-events-none">
              search
            </span>
            <input
              aria-label="Search community posts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search birds or photographers"
              className="w-full h-11 pl-10 pr-4 bg-white text-[#181c20] placeholder:text-[#42493e]/60 text-[14px] rounded-xl shadow-sm focus:outline-none focus:bg-[#f1f4f9] transition-colors"
              type="text"
            />
            {searchQuery && (
              <button
                aria-label="Clear community search"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#42493e]"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <button
            onClick={() => onNavigate('log-observation')}
            aria-label="Upload field photo"
            className="h-11 px-3.5 bg-[#2d5a27] text-white font-semibold text-[13px] rounded-xl shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
            <span>+ Upload</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {filterOptions.map((opt) => {
            const isActive = activeFilter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setActiveFilter(opt.id)}
                className={`h-8 px-3.5 rounded-full text-[12px] font-semibold flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-[#2d5a27] text-white shadow-sm'
                    : 'bg-[#ebeef3] text-[#42493e] hover:bg-[#e0e3e8]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed Container */}
      <div className="flex flex-col gap-5 px-4 mt-2">
        {activeFilter === 'people' &&
          people
            .filter(
              (person) =>
                !searchQuery.trim() ||
                [person.name, person.handle].some((value) =>
                  value.toLowerCase().includes(searchQuery.toLowerCase().trim()),
                ),
            )
            .map((person) => (
              <div
                key={person.id}
                className="rounded-2xl bg-white p-4 flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => showPerson(person)}
                  className="text-left min-h-11 min-w-0"
                >
                  <span className="block font-bold text-[14px] truncate">{person.name}</span>
                  <span className="text-[12px]">{person.handle}</span>
                </button>
                {!person.isSelf && (
                  <button
                    type="button"
                    onClick={() => void handleToggleFollow(person.handle)}
                    className="min-h-11 px-3 rounded-xl bg-[#2d5a27] text-white text-[12px]"
                  >
                    {person.following ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            ))}
        {activeFilter === 'near-you' && !nearbyEnabled && (
          <button
            type="button"
            onClick={onChooseLocation}
            className="min-h-11 rounded-xl bg-white p-3 text-[13px]"
          >
            Choose a location to find posts at loaded hotspots within 50 km
          </button>
        )}
        {activeFilter !== 'people' &&
          filteredPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md"
            >
              {/* Author Bar */}
              <div className="p-3.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => openPhotographerBio(post)}
                  className="flex items-center gap-2.5 text-left group"
                >
                  <div className="relative">
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#a1d494] rounded-full flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-[#154212] text-[10px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        eco
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-bold text-[#181c20] group-hover:text-[#154212] transition-colors truncate">
                        {post.authorName}
                      </span>
                      {post.authorBadge && (
                        <span className="px-1.5 py-0.5 rounded bg-[#c7ecce] text-[#01210f] text-[9px] font-bold uppercase tracking-wider">
                          {post.authorBadge}
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] text-[#42493e] flex items-center gap-0.5 truncate">
                      <span className="material-symbols-outlined text-[13px]">location_on</span>
                      {post.location}
                    </span>
                  </div>
                </button>

                <button
                  aria-label="Post options"
                  onClick={() => openPostDetails(post.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#42493e] hover:bg-[#ebeef3] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                </button>
              </div>

              {/* Bird Image with Tap to Open Details */}
              <div
                className="relative w-full aspect-[4/3] bg-[#ebeef3] cursor-pointer overflow-hidden group"
                onClick={() => openPostDetails(post.id)}
              >
                <button
                  type="button"
                  aria-label={`View ${post.speciesName} post details`}
                  className="block w-full h-full"
                >
                  <img
                    src={post.imageUrl}
                    alt={post.speciesName}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                </button>

                {/* Species Badge */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSpeciesById(post.speciesId);
                  }}
                  className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 hover:bg-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#2d5a27] text-[16px]">flutter_dash</span>
                  <span className="text-[12px] font-bold text-[#181c20]">{post.speciesName}</span>
                  <span className="text-[11px] italic text-[#42493e]/80 ml-0.5">
                    {post.speciesScientific}
                  </span>
                </button>

                {/* Tap Hint */}
                <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md w-7 h-7 rounded-full flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                </div>
              </div>

              {/* Content & EXIF Strip */}
              <div className="p-3.5 flex flex-col gap-2.5">
                <p className="text-[14px] text-[#181c20] leading-relaxed">{post.caption}</p>

                {/* Minimal EXIF Bar */}
                <div className="bg-[#f1f4f9] rounded-xl px-3 py-2 flex items-center justify-between text-[#42493e] text-[12px]">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="material-symbols-outlined text-[14px] flex-shrink-0">photo_camera</span>
                    <span className="truncate">
                      {post.exif.camera} · {post.exif.lens}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#181c20] flex-shrink-0">
                    <span>ISO {post.exif.iso}</span>
                    <span>·</span>
                    <span>{post.exif.aperture}</span>
                    <span>·</span>
                    <span>{post.exif.shutter}</span>
                  </div>
                </div>

                {/* Social Action Bar */}
                <div className="pt-1 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      aria-label={post.isLiked ? 'Unlike sighting' : 'Like sighting'}
                      aria-pressed={Boolean(post.isLiked)}
                      onClick={() => onToggleLike(post.id)}
                      className="flex items-center gap-1.5 text-[#42493e] hover:text-[#ba1a1a] transition-colors group"
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] transition-transform group-active:scale-125 ${
                          post.isLiked ? 'text-[#ba1a1a]' : ''
                        }`}
                        style={{ fontVariationSettings: post.isLiked ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {post.isLiked ? 'favorite' : 'favorite_border'}
                      </span>
                      <span className="text-[12px] font-semibold">{post.likes}</span>
                    </button>

                    <button
                      aria-label="Open sighting comments"
                      onClick={() => openPostDetails(post.id)}
                      className="flex items-center gap-1.5 text-[#42493e] hover:text-[#154212] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
                      <span className="text-[12px] font-semibold">{post.commentsCount}</span>
                    </button>

                    <button
                      onClick={() => {
                        void shareAppLink(`${window.location.origin}${window.location.pathname}${routeQuery({screen:'community',post:post.id})}`,showToast);
                      }}
                      aria-label="Share sighting"
                      className="text-[#42493e] hover:text-[#154212] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onToggleSave(post.id)}
                    aria-label="Bookmark post"
                    className="text-[#42493e] hover:text-[#904d00] transition-colors"
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        post.isSaved ? 'text-[#904d00]' : ''
                      }`}
                      style={{ fontVariationSettings: post.isSaved ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {post.isSaved ? 'bookmark' : 'bookmark_border'}
                    </span>
                  </button>
                </div>
              </div>
            </article>
          ))}

        {filteredPosts.length === 0 && activeFilter !== 'people' && (
          <p role="status" className="py-8 text-center text-[13px] text-[#42493e]">
            No posts match this search and filter.
          </p>
        )}

        {/* Field Etiquette Quote Card */}
        <div className="bg-[#ebeef3] rounded-2xl p-4 flex items-center gap-3 text-[#42493e]">
          <span className="material-symbols-outlined text-[#2d5a27] text-[24px] flex-shrink-0">
            nature_people
          </span>
          <p className="text-[13px] leading-snug">
            <span className="font-bold text-[#154212] uppercase text-[11px] mr-1">Field Etiquette:</span>
            Keep a respectful distance, avoid disturbing nests, follow local guidance and keep precise nesting locations private.
          </p>
        </div>
      </div>

      {/* OVERLAY 1: Post Details, EXIF & Comments Bottom Sheet */}
      {selectedPostForDetails && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={closePost}></div>

          <div
            ref={postDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Sighting details and comments"
            tabIndex={-1}
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl flex flex-col max-h-[85dvh] overflow-hidden z-10 animate-in slide-in-from-bottom duration-300"
          >
            {/* Handle */}
            <button
              type="button"
              aria-label="Close sighting details"
              className="min-h-11 w-full pt-3 pb-2 flex items-center justify-center cursor-pointer"
              onClick={closePost}
            >
              <span className="w-10 h-1.5 rounded-full bg-[#e0e3e8]"></span>
            </button>

            {/* Header */}
            <div className="px-4 pb-3 flex items-center justify-between border-b border-[#f1f4f9]">
              <div className="flex flex-col">
                <span className="text-[18px] font-bold text-[#181c20]">
                  {selectedPostForDetails.speciesName}
                </span>
                <span className="text-[12px] italic text-[#42493e]">
                  {selectedPostForDetails.speciesScientific}
                </span>
              </div>
              <button
                aria-label="Close sighting details"
                onClick={closePost}
                className="w-8 h-8 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#181c20] hover:bg-[#e0e3e8]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="px-4 py-4 overflow-y-auto flex flex-col gap-4">
              {/* Habitat & Weather */}
              <div className="bg-[#f1f4f9] rounded-xl p-3.5 flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-wider text-[#154212] font-bold">
                  Habitat & Field Weather
                </span>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white p-2 rounded-lg shadow-xs">
                    <span className="material-symbols-outlined text-[#904d00] text-[18px]">sunny</span>
                    <p className="text-[10px] text-[#42493e] mt-0.5">Lighting</p>
                    <p className="text-[12px] font-bold text-[#181c20]">
                      {selectedPostForDetails.weather?.lighting || 'Unverified'}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-xs">
                    <span className="material-symbols-outlined text-[#154212] text-[18px]">
                      device_thermostat
                    </span>
                    <p className="text-[10px] text-[#42493e] mt-0.5">Temp</p>
                    <p className="text-[12px] font-bold text-[#181c20]">
                      {selectedPostForDetails.weather?.temp || 'Unverified'}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-xs">
                    <span className="material-symbols-outlined text-[#2d5a27] text-[18px]">air</span>
                    <p className="text-[10px] text-[#42493e] mt-0.5">Wind</p>
                    <p className="text-[12px] font-bold text-[#181c20]">
                      {selectedPostForDetails.weather?.wind || 'Unverified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sensor & Optical Data */}
              <div className="bg-[#f1f4f9] rounded-xl p-3.5 flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-wider text-[#42493e] font-bold">
                  Sensor & Optical Data
                </span>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1 text-[13px] text-[#181c20]">
                  <div className="flex justify-between">
                    <span className="text-[#42493e]">Camera:</span>
                    <span className="font-semibold truncate ml-2">{selectedPostForDetails.exif.camera}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#42493e]">Lens:</span>
                    <span className="font-semibold truncate ml-2">{selectedPostForDetails.exif.lens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#42493e]">Focal:</span>
                    <span className="font-semibold">{selectedPostForDetails.exif.focal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#42493e]">Aperture:</span>
                    <span className="font-semibold">{selectedPostForDetails.exif.aperture}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#42493e]">Shutter:</span>
                    <span className="font-semibold">{selectedPostForDetails.exif.shutter}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#42493e]">ISO:</span>
                    <span className="font-semibold">{selectedPostForDetails.exif.iso}</span>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#181c20]">Field Notes & Comments</span>
                  <span className="text-[11px] text-[#42493e]">
                    {(selectedPostForDetails.commentsCount ?? selectedPostForDetails.comments?.length ?? 0) + ' replies'}
                  </span>
                </div>

                {selectedPostForDetails.commentsCount>(selectedPostForDetails.comments?.length||0)&&<p className="text-xs text-[#42493e]">Showing the latest {selectedPostForDetails.comments?.length||0} replies. Earlier replies are not loaded.</p>}
                {selectedPostForDetails.comments && selectedPostForDetails.comments.length > 0 ? (
                  selectedPostForDetails.comments.map((comm) => (
                    <div key={comm.id} className="bg-[#f1f4f9] rounded-xl p-3 flex gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${comm.color}`}
                      >
                        {comm.avatarInitials}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[12px] font-bold text-[#181c20] [overflow-wrap:anywhere]">{comm.author}</span>
                          <time dateTime={comm.time} className="text-[10px] text-[#42493e] [overflow-wrap:anywhere]">{Number.isNaN(Date.parse(comm.time))?comm.time:`${new Date(comm.time).toLocaleString('en-GB',{timeZone:'Asia/Kolkata'})} IST`}</time>
                        </div>
                        <p className="text-[13px] text-[#42493e] mt-0.5 leading-snug whitespace-pre-wrap [overflow-wrap:anywhere]">{comm.text}</p>
                        {comm.canDelete && onDeleteComment && (
                          <button
                            type="button"
                            onClick={() => void onDeleteComment(comm.id)}
                            className="min-h-11 text-left text-[11px] underline"
                          >
                            Delete comment
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-[#42493e] italic">No observations logged yet.</p>
                )}

                {/* Inline Comment Form */}
                <form onSubmit={handlePostCommentSubmit} className="relative mt-2">
                  <input
                    aria-label="Add observation note"
                    maxLength={1000}
                    value={newCommentInput}
                    onChange={(e) => setNewCommentInput(e.target.value)}
                    placeholder="Add observation note..."
                    className="w-full h-11 pl-3 pr-14 bg-[#ebeef3] text-[#181c20] placeholder:text-[#42493e]/60 text-[13px] rounded-lg focus:outline-none focus:bg-white shadow-xs transition-colors"
                  />
                  <button
                    aria-label="Submit observation note"
                    disabled={!newCommentInput.trim()}
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#2d5a27] hover:opacity-80 p-1"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                  </button>
                </form>
                {onReport && (
                  <details className="rounded-xl bg-[#f1f4f9] p-3">
                    <summary className="min-h-11 cursor-pointer text-[13px] font-semibold">
                      Report this sighting
                    </summary>
                    <label className="block text-[12px]">
                      Reason
                      <select
                        aria-label="Report reason"
                        value={reportReason}
                        onChange={(event) => setReportReason(event.target.value)}
                        className="block w-full min-h-11 rounded-lg bg-white p-2"
                      >
                        {['identification', 'location', 'privacy', 'abuse', 'other'].map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      aria-label="Report details"
                      value={reportDetail}
                      maxLength={1000}
                      onChange={(event) => setReportDetail(event.target.value)}
                      className="mt-2 w-full rounded-lg bg-white p-2 text-[13px]"
                      placeholder="Explain the issue without sharing private coordinates"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (await onReport(selectedPostForDetails.id, reportReason, reportDetail)) {
                          setReportDetail('');
                          showToast('Report saved for review; no moderation action has occurred yet.');
                        }
                      }}
                      className="min-h-11 underline text-[12px]"
                    >
                      Submit report
                    </button>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY 2: Photographer Bio Quick Sheet */}
      {selectedPhotographer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={closePerson}></div>

          <div
            ref={photographerDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Photographer profile"
            tabIndex={-1}
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl flex flex-col p-5 items-center text-center max-h-[85dvh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-300"
          >
            <div className="w-10 h-1.5 rounded-full bg-[#e0e3e8] mb-3"></div>

            <img
              src={selectedPhotographer.avatar}
              alt={selectedPhotographer.name}
              className="w-20 h-20 rounded-full object-cover shadow-md ring-4 ring-[#ebeef3]"
            />

            <h3 className="text-[20px] font-bold text-[#181c20] mt-3">{selectedPhotographer.name}</h3>
            <p className="text-[12px] text-[#42493e] flex items-center justify-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {selectedPhotographer.location}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 w-full my-4 bg-[#f1f4f9] rounded-xl p-3">
              <div>
                <p className="text-[18px] font-bold text-[#154212]">{selectedPhotographer.sightings}</p>
                <p className="text-[10px] font-semibold text-[#42493e]">Sightings</p>
              </div>
              <div>
                <p className="text-[18px] font-bold text-[#181c20]">{selectedPhotographer.lifers}</p>
                <p className="text-[10px] font-semibold text-[#42493e]">Lifer Birds</p>
              </div>
              <div>
                <p className="text-[18px] font-bold text-[#904d00]">{selectedPhotographer.followers}</p>
                <p className="text-[10px] font-semibold text-[#42493e]">Followers</p>
              </div>
            </div>

            <p className="text-[13px] text-[#42493e] mb-5 px-2 leading-relaxed">{selectedPhotographer.bio}</p>

            <div className="flex items-center gap-2.5 w-full">
              <button
                disabled={selectedPhotographer.isSelf}
                onClick={() => handleToggleFollow(selectedPhotographer.handle)}
                className={`flex-1 h-11 font-semibold text-[14px] rounded-xl shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5 ${
                  isFollowing(selectedPhotographer.handle)
                    ? 'bg-[#ebeef3] text-[#181c20]'
                    : 'bg-[#2d5a27] text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isFollowing(selectedPhotographer.handle) ? 'check' : 'person_add'}
                </span>
                <span>
                  {selectedPhotographer.isSelf
                    ? 'Your profile'
                    : isFollowing(selectedPhotographer.handle)
                      ? 'Following'
                      : 'Follow'}
                </span>
              </button>

              <button
                onClick={closePerson}
                className="h-11 px-5 bg-[#ebeef3] text-[#181c20] font-semibold text-[14px] rounded-xl hover:bg-[#e0e3e8] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
