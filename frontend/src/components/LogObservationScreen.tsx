import React, { useState } from 'react';
import { BirdSpecies, ScreenType, CommunityPost, JournalEntry, UserProfile } from '../types';

interface LogObservationScreenProps {
  initialSpecies?: BirdSpecies;
  userProfile: UserProfile;
  onPostObservation: (newPost: CommunityPost, newEntry: JournalEntry) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (message: string) => void;
}

export const LogObservationScreen: React.FC<LogObservationScreenProps> = ({
  initialSpecies,
  userProfile,
  onPostObservation,
  onNavigate,
  showToast,
}) => {
  const [speciesName, setSpeciesName] = useState(
    initialSpecies?.name || 'Indian Roller'
  );
  const [scientificName, setScientificName] = useState(
    initialSpecies?.scientificName || 'Coracias benghalensis'
  );
  const [location, setLocation] = useState('Sultanpur National Park, Haryana');
  const [dateTime, setDateTime] = useState('Today, 07:15 AM');
  const [fieldNotes, setFieldNotes] = useState(
    'Perched on acacia branch scanning open scrubland. Flashed intense cyan wing panels when darting to ground for a beetle.'
  );

  const [hideExactLocation, setHideExactLocation] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const photoUrl =
    initialSpecies?.image ||
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAlfbpJ-rQoDBLZ1SffebtHnr3dYdrZ4pDlAaUrMj-3oBlpUTtg8zFGUfNmGInOh9xAQmb5J01qwHan2qRy6YCXVTDph5l7klxAK87A32unGI0h0U6Pw8p8EW7mrq0-042k1TnNH6tQPlAN6-NgW9GETKYs7-lOr39GRUtnRk200BCTh12byrS3wQcvRGpyW1BnFPIVBR2bt0bIhpPRdR_qodSk83FUPOCEYKD1Jgf_WAm3sxGBZQ21Lw';

  const samplePhotoOptions = [
    {
      name: 'Indian Roller',
      sci: 'Coracias benghalensis',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlfbpJ-rQoDBLZ1SffebtHnr3dYdrZ4pDlAaUrMj-3oBlpUTtg8zFGUfNmGInOh9xAQmb5J01qwHan2qRy6YCXVTDph5l7klxAK87A32unGI0h0U6Pw8p8EW7mrq0-042k1TnNH6tQPlAN6-NgW9GETKYs7-lOr39GRUtnRk200BCTh12byrS3wQcvRGpyW1BnFPIVBR2bt0bIhpPRdR_qodSk83FUPOCEYKD1Jgf_WAm3sxGBZQ21Lw',
    },
    {
      name: 'Common Kingfisher',
      sci: 'Alcedo atthis',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_RKvc1lsaH9BbPrxqdOB_dxSOtFGpr0Q11ok4MbkbQ_Lw-LpuQpGnY5WSoO9fAP7hi2FylVedbQctwzJPj7ComXmk6juh_M3c4tgo1B9DDdndtuB318kfXMhkTkCg1f8WNlpHG2Z3dkh0wAG-NnS6DzOyGM_Yi8fvF18VGZ15GVctENiEycU6Fjmyb4kIJx1fsGckf_OMgXpBBrwHnA8y9UP88NDkO1GBf6OEQwJfKDWwPqqCLXrWNA',
    },
    {
      name: 'Rose-ringed Parakeet',
      sci: 'Psittacula krameri',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-rIx-Yv_lhUQrFSMpVcUYq0iljnjwSDyp187qD3IC3BXX02xL4QvJByA8zB_fcmYBqB5joB3EaYzXxqqmc64ftpeP_2kDVlP5M3KSCDqrr6QXYNpq91qfnchSsnhEQ9QXghdc335wr4aHuvE5r4aONsrioslttPIBr7pJi28XbiR2I9u3ZyKCIL4MO6fcYPK29ASTTl86EGNhSJDMg9Z241NwsvTxZkNVWWUSn-0jndaQ9QQzK4lfCA',
    },
  ];

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const activeImage = samplePhotoOptions[currentPhotoIndex].img;

  const handleChangePhoto = () => {
    const nextIdx = (currentPhotoIndex + 1) % samplePhotoOptions.length;
    setCurrentPhotoIndex(nextIdx);
    setSpeciesName(samplePhotoOptions[nextIdx].name);
    setScientificName(samplePhotoOptions[nextIdx].sci);
    showToast(`Loaded ${samplePhotoOptions[nextIdx].name} sample`);
  };

  const handlePost = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsPublished(true);

      const newPostId = `post-${Date.now()}`;
      const newEntryId = `entry-${Date.now()}`;

      const newPost: CommunityPost = {
        id: newPostId,
        authorName: userProfile.name,
        authorHandle: userProfile.handle,
        authorBadge: 'Pro',
        authorAvatar: userProfile.avatarUrl,
        location: location.split(',')[0].trim() + ' · Just now',
        timeAgo: 'Just now',
        speciesName,
        speciesScientific: scientificName,
        speciesId: speciesName.toLowerCase().includes('kingfisher')
          ? 'kingfisher'
          : speciesName.toLowerCase().includes('parakeet')
          ? 'parakeet'
          : 'roller',
        imageUrl: activeImage,
        caption: fieldNotes,
        exif: {
          camera: 'Nikon Z8',
          lens: '500mm f/5.6 PF',
          focal: '500mm',
          aperture: 'f/5.6',
          shutter: '1/2000s',
          iso: '400',
        },
        likes: 1,
        commentsCount: 0,
        isLiked: true,
        isSaved: true,
      };

      const newEntry: JournalEntry = {
        id: newEntryId,
        speciesName,
        scientificName,
        date: dateTime,
        location,
        gear: 'Nikon Z8 · 500mm f/5.6 PF',
        weather: 'Sunny, 22°C',
        notes: fieldNotes,
        habitatTag: 'Acacia scrub',
        imageUrl: activeImage,
        rawBadge: 'RAW',
        isVerified: true,
        inLifeList: true,
      };

      onPostObservation(newPost, newEntry);
      showToast('Observation logged to your Journal & posted!');
    }, 650);
  };

  return (
    <div className="flex flex-col w-full px-4 pb-28 pt-2">
      {/* Photo Preview Stage */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-sm bg-[#ebeef3] aspect-[4/3] mb-4">
        <img
          src={activeImage}
          alt={speciesName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none"></div>

        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#154212] font-semibold text-[12px] shadow-sm">
            <span
              className="material-symbols-outlined text-[15px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <span>EXIF Synced</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleChangePhoto}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-[#181c20] hover:bg-white active:scale-95 transition-all shadow-sm font-semibold text-[12px]"
        >
          <span className="material-symbols-outlined text-[16px]">photo_camera</span>
          <span>Change photo</span>
        </button>

        <div className="absolute bottom-3 left-3 text-white flex flex-col">
          <span className="text-[10px] tracking-wider uppercase opacity-80 font-semibold">
            Detected Specimen
          </span>
          <span className="text-[18px] font-bold leading-tight drop-shadow-sm">
            {speciesName}
          </span>
        </div>
      </div>

      {/* Field Identification Section */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-[#181c20]">Field Identification</h2>
          <span className="text-[10px] font-bold tracking-wider uppercase text-[#42493e] bg-[#ebeef3] px-2 py-0.5 rounded">
            Verified
          </span>
        </div>

        {/* Bird Species */}
        <div className="flex flex-col gap-1 bg-[#f1f4f9] p-3 rounded-xl">
          <label className="text-[11px] font-bold uppercase text-[#42493e] flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-[#154212]">
              cruelty_free
            </span>
            <span>Bird Species</span>
          </label>
          <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-xs">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[15px] font-bold text-[#181c20] truncate">{speciesName}</span>
              <span className="text-[12px] italic text-[#42493e] truncate">{scientificName}</span>
            </div>
            <button
              onClick={() => {
                const custom = prompt('Enter observed bird species:', speciesName);
                if (custom) setSpeciesName(custom);
              }}
              type="button"
              className="text-[#154212] p-1 rounded-md"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
          </div>
        </div>

        {/* Location & Time Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex flex-col gap-1 bg-[#f1f4f9] p-3 rounded-xl">
            <label className="text-[11px] font-bold uppercase text-[#42493e] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#154212]">near_me</span>
              <span>Location</span>
            </label>
            <div className="flex items-center justify-between bg-white p-2.5 rounded-lg shadow-xs">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="text-[13px] text-[#181c20] font-medium bg-transparent focus:outline-none w-full truncate"
              />
              <span className="material-symbols-outlined text-[18px] text-[#42493e] flex-shrink-0">
                place
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 bg-[#f1f4f9] p-3 rounded-xl">
            <label className="text-[11px] font-bold uppercase text-[#42493e] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#154212]">
                schedule
              </span>
              <span>Date & Time</span>
            </label>
            <div className="flex items-center justify-between bg-white p-2.5 rounded-lg shadow-xs">
              <input
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="text-[13px] text-[#181c20] font-medium bg-transparent focus:outline-none w-full"
              />
              <span className="material-symbols-outlined text-[18px] text-[#42493e] flex-shrink-0">
                event
              </span>
            </div>
          </div>
        </div>

        {/* Field Notes */}
        <div className="flex flex-col gap-1 bg-[#f1f4f9] p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase text-[#42493e] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#154212]">notes</span>
              <span>Field Notes</span>
            </label>
            <span className="text-[10px] font-semibold text-[#42493e]">Acacia woodland</span>
          </div>
          <div className="bg-white p-2.5 rounded-lg shadow-xs">
            <textarea
              rows={3}
              value={fieldNotes}
              onChange={(e) => setFieldNotes(e.target.value)}
              className="w-full text-[13px] text-[#181c20] leading-relaxed bg-transparent focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Photo Details (Detected from photo) */}
      <div className="flex flex-col gap-2 bg-[#f1f4f9] p-3.5 rounded-xl mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#154212]">camera</span>
            <h3 className="text-[15px] font-bold text-[#181c20]">Photo Details</h3>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffdcc3] text-[#6e3900] text-[10px] font-bold">
            <span
              className="material-symbols-outlined text-[12px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <span>Detected from photo</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-white p-2.5 rounded-lg shadow-xs flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#42493e]">
              Camera
            </span>
            <span className="text-[13px] font-bold text-[#181c20]">Nikon Z8</span>
          </div>
          <div className="bg-white p-2.5 rounded-lg shadow-xs flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#42493e]">
              Lens
            </span>
            <span className="text-[13px] font-bold text-[#181c20]">500mm f/5.6 PF</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white p-2 rounded-lg shadow-xs flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#42493e]">
              Focal
            </span>
            <span className="text-[13px] font-bold text-[#181c20]">500mm</span>
          </div>
          <div className="bg-white p-2 rounded-lg shadow-xs flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#42493e]">
              Aperture
            </span>
            <span className="text-[13px] font-bold text-[#181c20]">f/5.6</span>
          </div>
          <div className="bg-white p-2 rounded-lg shadow-xs flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#42493e]">
              Shutter
            </span>
            <span className="text-[13px] font-bold text-[#181c20]">1/2000s</span>
          </div>
          <div className="bg-white p-2 rounded-lg shadow-xs flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#42493e]">
              ISO
            </span>
            <span className="text-[13px] font-bold text-[#181c20]">400</span>
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="flex flex-col gap-2 bg-[#f1f4f9] p-3.5 rounded-xl mb-4">
        <div className="flex items-center gap-1.5 text-[#42493e]">
          <span className="material-symbols-outlined text-[17px] text-[#904d00]">wb_sunny</span>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#181c20]">
            Conditions
          </h3>
        </div>
        <div className="grid grid-cols-4 gap-2 pt-0.5">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white shadow-xs">
            <span className="text-[10px] text-[#42493e] font-semibold">Temp</span>
            <span className="text-[13px] font-bold text-[#181c20]">22°C</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white shadow-xs">
            <span className="text-[10px] text-[#42493e] font-semibold">Sky</span>
            <span className="text-[13px] font-bold text-[#181c20]">Sunny</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white shadow-xs">
            <span className="text-[10px] text-[#42493e] font-semibold">Wind</span>
            <span className="text-[13px] font-bold text-[#181c20]">6 km/h</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white shadow-xs">
            <span className="text-[10px] text-[#42493e] font-semibold">Humidity</span>
            <span className="text-[13px] font-bold text-[#181c20]">54%</span>
          </div>
        </div>
      </div>

      {/* Location Privacy Toggle */}
      <div className="flex flex-col gap-2 bg-[#f1f4f9] p-3.5 rounded-xl mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#20402b]">lock</span>
            <span className="text-[15px] font-bold text-[#181c20]">Location Privacy</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hideExactLocation}
            onClick={() => setHideExactLocation(!hideExactLocation)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
              hideExactLocation ? 'bg-[#2d5a27]' : 'bg-[#d7dadf]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                hideExactLocation ? 'translate-x-5' : 'translate-x-0'
              }`}
            ></span>
          </button>
        </div>
        <div className="flex items-start gap-2 pt-1">
          <span className="material-symbols-outlined text-[16px] text-[#42493e] mt-0.5">
            verified_user
          </span>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-[#181c20]">Hide exact location</span>
            <p className="text-[11px] text-[#42493e] leading-snug">
              Sensitive species locations can be automatically obscured to protect habitat nesting
              sites.
            </p>
          </div>
        </div>
      </div>

      {/* Post to Community Radio */}
      <div className="flex flex-col gap-2 bg-[#f1f4f9] p-3.5 rounded-xl mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-[#181c20] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#154212]">public</span>
            <span>Post to Community</span>
          </span>
          <span className="text-[11px] text-[#42493e]">
            {visibility === 'public'
              ? 'Visible to all birders'
              : visibility === 'followers'
              ? 'Visible to followers only'
              : 'Private personal log'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 bg-[#ebeef3] p-1 rounded-xl mt-1">
          {(['public', 'followers', 'private'] as const).map((mode) => {
            const isSelected = visibility === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setVisibility(mode)}
                className={`flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg text-[12px] font-semibold capitalize transition-all ${
                  isSelected ? 'bg-[#2d5a27] text-white shadow-xs' : 'text-[#181c20] hover:bg-white/50'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[15px]"
                  style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {mode === 'public' ? 'public' : mode === 'followers' ? 'group' : 'lock'}
                </span>
                <span>{mode}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Notification Banner */}
      {isPublished && (
        <div className="mb-4 bg-[#2d5a27] text-white rounded-xl p-3.5 shadow-md flex items-center gap-3 animate-in fade-in">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              done_all
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold">Success!</p>
            <p className="text-[11px] text-white/90 truncate">
              Observation logged to your Journal & community feed!
            </p>
          </div>
          <button
            onClick={() => onNavigate('community')}
            className="px-2.5 py-1 bg-white text-[#2d5a27] font-bold text-[11px] rounded-lg shadow-xs"
          >
            View Feed
          </button>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-1">
        <button
          type="button"
          disabled={isSubmitting || isPublished}
          onClick={handlePost}
          className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-[15px] tracking-wide shadow-md active:scale-[0.98] transition-all duration-150 ${
            isPublished
              ? 'bg-[#375740] text-white'
              : 'bg-[#154212] hover:bg-[#2d5a27] text-white'
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined text-[20px] animate-spin">
                progress_activity
              </span>
              <span>SYNCING OBSERVATION...</span>
            </>
          ) : isPublished ? (
            <>
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <span>PUBLISHED TO FIELD LOG</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
              <span>POST PHOTOGRAPH</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
