import { SessionExpiredError } from './auth';
import type { UserProfile, JournalEntry, CommunityPost } from '../types';
import type { PhotoExif } from './discovery';

export interface Observation {
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
}
export interface UploadedPhoto {
  id: string;
  imageUrl: string;
  exif: PhotoExif;
  metadataError: boolean;
  hasPrivateLocation: boolean;
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
  load: (signal: AbortSignal, feed = false): Promise<{ observations: Observation[]; profile: UserProfile }> =>
    request(feed ? '?scope=feed' : '', signal),
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
  id: row.id,
  speciesName: row.speciesName,
  scientificName: row.scientificName,
  date: row.observedAt.replace('T', ' '),
  location: row.location,
  gear: camera(row.exif),
  weather: 'Historical conditions unverified',
  notes: row.notes,
  habitatTag: 'User observation',
  imageUrl: row.imageUrl,
  isVerified: false,
  inLifeList: row.inLifeList,
});
export const observationPost = (row: Observation): CommunityPost => ({
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
  likes: 0,
  commentsCount: 0,
  isLiked: false,
  isSaved: false,
  comments: [],
});
