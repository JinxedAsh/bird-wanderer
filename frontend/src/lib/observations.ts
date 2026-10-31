import { SessionExpiredError } from './auth';
import type { UserProfile, JournalEntry, CommunityPost } from '../types';
import type { PhotoExif } from './discovery';
import type { ObservationPoint } from './observation-form';

export interface ObservationConditions {
  source: string; sourceUrl: string; model: string; observedAt: string; matchedTime: string; timezone: string;
  utcOffset: string | null; timeBasis: string; latitude: number; longitude: number; fetchedAt: string;
  temperatureC: number | null; humidityPercent: number | null; precipitationMm: number | null; cloudCoverPercent: number | null; windKmh: number | null;
}

export interface Observation {
  likes?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
  commentsCount?: number;
  comments?: CommunityPost['comments'];
  id: string;
  ownerId: string;
  authorName: string;
  authorHandle: string;
  speciesId: string;
  speciesName: string;
  scientificName: string;
  hotspotId: string | null;
  location: string;
  observedAt: string;
  notes: string;
  visibility: 'public' | 'followers' | 'private';
  hideExactLocation: boolean;
  inLifeList: boolean;
  imageUrl: string;
  exif: PhotoExif;
  createdAt: string;
  isOwner: boolean;
  observationLocation?: ObservationPoint | null;
  conditions?: ObservationConditions | null;
  utcOffset?: string | null;
}
export interface UploadedPhoto {
  id: string;
  imageUrl: string;
  exif: PhotoExif;
  metadataError: boolean;
  hasPrivateLocation: boolean;
  privateLocation?: { latitude: number; longitude: number } | null;
  note: string;
}
export interface ObservationInput {
  mediaId: string;
  speciesId: string;
  hotspotId: string;
  observedAt: string;
  notes: string;
  visibility: Observation['visibility'];
  hideExactLocation: boolean;
  customLocation?: ObservationPoint | null;
  conditionsId?: string | null;
  utcOffset?: string | null;
}

async function request(path: string, signal: AbortSignal, method = 'GET', body?: object | File) {
  let response: Response;
  try {
    response = await fetch(`/api/observations${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': body instanceof File ? body.type : 'application/json' } : undefined,
      body: body === undefined ? undefined : body instanceof File ? body : JSON.stringify(body),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Cannot reach your field records. Check your connection and retry.');
  }
  if (response.status === 401) throw new SessionExpiredError();
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not save your field record. Please retry.');
  return data;
}
export const observations = {
  conditions: async (point: { latitude: number; longitude: number }, observedAt: string, utcOffset: string, signal: AbortSignal): Promise<{ conditionsId: string; conditions: ObservationConditions }> => {
    const data = await request('/conditions', signal, 'POST', { latitude: Math.round(point.latitude * 10) / 10, longitude: Math.round(point.longitude * 10) / 10, observedAt, utcOffset: utcOffset || null });
    const value = data.conditions;
    if (typeof data.conditionsId !== 'string' || !/^[a-f0-9-]{36}$/.test(data.conditionsId) || value?.source !== 'Open-Meteo' || value.observedAt !== observedAt || value.latitude !== Math.round(point.latitude * 10) / 10 || value.longitude !== Math.round(point.longitude * 10) / 10 || value.utcOffset !== (utcOffset || null)
      || value.sourceUrl !== 'https://open-meteo.com/en/docs/historical-weather-api' || ['model', 'matchedTime', 'timezone', 'timeBasis', 'fetchedAt'].some(key => typeof value[key] !== 'string')
      || ['temperatureC', 'humidityPercent', 'precipitationMm', 'cloudCoverPercent', 'windKmh'].some(key => value[key] !== null && (typeof value[key] !== 'number' || !Number.isFinite(value[key])))) throw new Error('Unexpected historical weather response.');
    return data;
  },
  search:(q:string,signal:AbortSignal,peopleOffset=0,postsOffset=0):Promise<{people:PublicBirder[];observations:Observation[];nextPeopleOffset:number|null;nextPostsOffset:number|null}>=>request(`/social/search?q=${encodeURIComponent(q)}&peopleOffset=${peopleOffset}&postsOffset=${postsOffset}`,signal),
  peoplePage:(signal:AbortSignal,q='',offset=0):Promise<{people:PublicBirder[];nextOffset:number|null}>=>request(`/social/people?q=${encodeURIComponent(q)}&offset=${offset}`,signal),
  get: async (id:string,signal:AbortSignal):Promise<Observation> => (await request(`/${encodeURIComponent(id)}`,signal)).observation,
  people: async (signal: AbortSignal,q=''): Promise<PublicBirder[]> =>
    (await request(`/social/people?q=${encodeURIComponent(q)}`, signal)).people,
  person: async (id: string, signal: AbortSignal): Promise<PublicBirder> =>
    (await request(`/social/people/${encodeURIComponent(id)}`, signal)).person,
  follow: (id: string, following: boolean, signal: AbortSignal) =>
    request(`/social/follows/${encodeURIComponent(id)}`, signal, 'PUT', { following }),
  like: (id: string, liked: boolean, signal: AbortSignal) =>
    request(`/social/posts/${encodeURIComponent(id)}/like`, signal, 'PUT', { liked }),
  savePost: (id: string, saved: boolean, signal: AbortSignal) =>
    request(`/social/posts/${encodeURIComponent(id)}/save`, signal, 'PUT', { saved }),
  comment: (id: string, text: string, signal: AbortSignal) =>
    request(`/social/posts/${encodeURIComponent(id)}/comments`, signal, 'POST', { text }),
  deleteComment: (id: string, signal: AbortSignal) =>
    request(`/social/comments/${encodeURIComponent(id)}`, signal, 'DELETE'),
  report: (id: string, reason: string, detail: string, signal: AbortSignal) =>
    request(`/social/posts/${encodeURIComponent(id)}/reports`, signal, 'POST', { reason, detail }),
  load: (signal: AbortSignal, feed = false,offset=0): Promise<{ observations: Observation[]; profile: UserProfile;nextOffset:number|null }> =>
    request(`?scope=${feed?'feed':'own'}&offset=${offset}`, signal),
  upload: async (file: File, signal: AbortSignal): Promise<UploadedPhoto> =>
    (await request('/media', signal, 'POST', file)).media,
  publish: (
    input: ObservationInput,
    signal: AbortSignal,
  ): Promise<{ observation: Observation; profile: UserProfile }> => request('', signal, 'POST', input),
  update: (id: string, change: object, signal: AbortSignal) =>
    request(`/${encodeURIComponent(id)}`, signal, 'PATCH', change),
  remove: (id: string, signal: AbortSignal) => request(`/${encodeURIComponent(id)}`, signal, 'DELETE'),
  removeUpload: (id: string, signal: AbortSignal) =>
    request(`/media/${encodeURIComponent(id)}`, signal, 'DELETE'),
  profile: async (change: Partial<UserProfile>, signal: AbortSignal): Promise<UserProfile> =>
    (await request('/profile', signal, 'PATCH', change)).profile,
};
const camera = (exif: PhotoExif) =>
  [exif.cameraMake, exif.cameraModel, exif.lens].filter(Boolean).join(' · ') || 'Camera metadata unavailable';
export const observationEntry = (row: Observation): JournalEntry => ({
  weatherSourceUrl: row.conditions?.sourceUrl,
  id: row.id,
  speciesName: row.speciesName,
  scientificName: row.scientificName,
  date: row.observedAt.replace('T', ' '),
  location: row.location,
  gear: camera(row.exif),
  weather: row.conditions ? `${row.conditions.temperatureC ?? 'Unavailable'}°C · ${row.conditions.windKmh ?? 'Unavailable'} km/h · ${row.conditions.model} · ${row.conditions.matchedTime} ${row.conditions.timezone}. ${row.conditions.timeBasis}. Open-Meteo (CC BY 4.0)` : 'Historical conditions unavailable or withheld',
  notes: row.notes,
  habitatTag: 'User observation',
  imageUrl: row.imageUrl,
  isVerified: false,
  inLifeList: row.inLifeList,
});
export const observationPost = (row: Observation): CommunityPost => ({
  locationPoint: row.observationLocation,
  authorId: row.ownerId,
  isFollowing: row.isFollowing,
  id: row.id,
  authorName: row.authorName,
  authorHandle: row.authorHandle,
  authorAvatar: '/bird-wanderer-logo.svg',
  location: row.location,
  timeAgo: row.observedAt.replace('T', ' '),
  speciesName: row.speciesName,
  speciesScientific: row.scientificName,
  speciesId: row.speciesId,
  imageUrl: row.imageUrl,
  caption: row.notes,
  exif: {
    camera: camera(row.exif),
    lens: row.exif.lens || 'Unavailable',
    focal: row.exif.focalLengthMm === null ? 'Unavailable' : `${row.exif.focalLengthMm} mm`,
    aperture: row.exif.aperture === null ? 'Unavailable' : `f/${row.exif.aperture}`,
    shutter: row.exif.exposureSeconds === null ? 'Unavailable' : `${row.exif.exposureSeconds} s`,
    iso: row.exif.iso === null ? 'Unavailable' : String(row.exif.iso),
  },
  likes: row.likes ?? 0,
  commentsCount: row.commentsCount ?? 0,
  isLiked: row.isLiked ?? false,
  isSaved: row.isSaved ?? false,
  comments: row.comments || [],
  weather: row.conditions ? { lighting: row.conditions.cloudCoverPercent === null ? 'Cloud unavailable' : `${row.conditions.cloudCoverPercent}% cloud`, temp: row.conditions.temperatureC === null ? 'Unavailable' : `${row.conditions.temperatureC}°C`, wind: row.conditions.windKmh === null ? 'Unavailable' : `${row.conditions.windKmh} km/h`, description: `${row.conditions.model} · ${row.conditions.matchedTime} ${row.conditions.timezone}. ${row.conditions.timeBasis}. Open-Meteo (CC BY 4.0)`, sourceUrl: row.conditions.sourceUrl } : undefined,
});

export interface PublicBirder {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  primaryRig: string;
  location: string;
  following: boolean;
  isSelf: boolean;
  photosCount: number;
  birdsCount: number;
  followersCount: number;
  visibility: 'public' | 'followers';
}
