export type ScreenType =
  | 'auth'
  | 'explore'
  | 'community'
  | 'hotspots'
  | 'journal'
  | 'profile'
  | 'species-detail'
  | 'log-observation'
  | 'hotspot-detail'
  | 'life-list'
  | 'quiz'
  | 'messages'
  | 'search'
  | 'notifications'
  | 'settings';

export interface BirdSpecies {
  source?: 'eBird';
  sourceUrl?: string;
  recentObservations?: Array<{ hotspotId: string; location: string; observedAt: string }>;
  id: string;
  name: string;
  scientificName: string;
  alias?: string;
  orderFamily?: string;
  image: string;
  iucnStatus?: 'LC' | 'NT' | 'VU' | 'EN' | 'CR';
  habitat?: string;
  habitatDetail?: string;
  bestTime?: string;
  bestTimeDetail?: string;
  sightingsThisWeek?: number;
  region?: string;
  photographyDifficulty?: 'Easy' | 'Medium' | 'Hard';
  fieldGuideNotes?: string;
  audioCallDuration?: string;
  audioCallDesc?: string;
  photosCount?: number;
  firstSightingLocation?: string;
  firstSightingCoords?: string;
  isLogged?: boolean;
  isWishlist?: boolean;
}

export interface PostExif {
  camera: string;
  lens: string;
  focal: string;
  aperture: string;
  shutter: string;
  iso: string;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorHandle: string;
  authorBadge?: 'Pro' | 'Top Birder' | 'Guide';
  authorAvatar: string;
  location: string;
  timeAgo: string;
  speciesName: string;
  speciesScientific: string;
  speciesId: string;
  imageUrl: string;
  caption: string;
  exif: PostExif;
  likes: number;
  commentsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  comments?: Array<{
    id: string;
    author: string;
    avatarInitials: string;
    time: string;
    text: string;
    color: string;
  }>;
  weather?: {
    lighting: string;
    temp: string;
    wind: string;
  };
}

export interface Hotspot {
  source?: 'eBird';
  sourceUrl?: string;
  latitude?: number;
  longitude?: number;
  id: string;
  name: string;
  speciesCount: number | null;
  distanceKm: number | null;
  bestTime: string;
  imageUrl: string;
  region: string;
  coordinates: string;
  activeTodayCount: number | null;
  temp: string;
  weatherCondition: string;
  wind: string;
  trailDifficulty: string;
  recommendedGear: string;
  openingHours: string;
  entryFee: string;
  cameraPass: string;
  transitTip: string;
  isSaved?: boolean;
  recentSightings: Array<{
    speciesId?: string;
    species: string;
    scientific: string;
    image: string;
    count: number | null;
    timeAgo: string;
  }>;
  photos: Array<{
    title: string;
    author: string;
    image: string;
  }>;
  speciesList: Array<{
    speciesId?: string;
    name: string;
    scientific: string;
    status: string;
    statusColor: string;
  }>;
}

export interface JournalEntry {
  id: string;
  speciesName: string;
  scientificName: string;
  date: string;
  location: string;
  gear: string;
  weather: string;
  notes: string;
  habitatTag: string;
  imageUrl: string;
  rawBadge?: string;
  isVerified: boolean;
  inLifeList: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  timeAgo: string;
  description: string;
  category: 'alerts' | 'mentions' | 'all';
  isUnread: boolean;
  icon: string;
  iconBg: string;
  iconColor: string;
  thumbnail?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'other' | 'me';
  senderName: string;
  text: string;
  time: string;
  delivered?: boolean;
}

export interface ChatConversation {
  id: string;
  contactName: string;
  contactAvatar: string;
  badge?: string;
  status: string;
  lastMessage: string;
  timeAgo: string;
  topic?: string;
  unread?: boolean;
  contextLocation: string;
  contextLifeNumber: string;
  messages: ChatMessage[];
}

export interface QuizQuestion {
  id: string;
  questionNumber: number;
  totalQuestions: number;
  prompt: string;
  subPrompt: string;
  imageUrl: string;
  options: Array<{
    id: string;
    label: string;
    text: string;
  }>;
  correctOptionId: string;
  factTitle: string;
  factSpecies: string;
  factText: string;
}

export interface UserProfile {
  name: string;
  handle: string;
  title: string;
  location: string;
  bio: string;
  avatarUrl: string;
  primaryRig: string;
  birdsCount: number;
  photosCount: number;
  tripsCount: number;
  locationPrivacy: 'approximate' | 'hide' | 'private';
  profileVisibility: 'public' | 'followers';
  sensitiveSpeciesProtection: boolean;
  pushAlertsEnabled: boolean;
}
