import { createSocialNotifications } from './social-notifications.mjs';
import express, { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import exifr from 'exifr';
import { normalizeExif } from './exif.mjs';
import { communityRouter, communityStats, visibleObservationSQL } from './community.mjs';
import { createAlerts } from './alerts.mjs';
import { messagesRouter } from './messages.mjs';

const maxBytes = 10 * 1024 * 1024;
const clean = (value, max) => (typeof value === 'string' && value.trim().length <= max ? value.trim() : null);
const fail = (status, message) => Object.assign(new Error(message), { status });
const uuid = (value) => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
const validObservationTime=(value,time)=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return false;
  const parsed=Date.parse(`${value}:00Z`);
  return Number.isFinite(parsed)&&new Date(parsed).toISOString().slice(0,16)===value&&parsed<=time+86400000&&parsed>=Date.UTC(1900,0,1);
};
const initialProfile = (user) => ({
  name: user.name,
  handle: `birder-${user.id.replaceAll('-', '').slice(0, 12)}`,
  title: 'Birder',
  location: '',
  bio: '',
  avatarUrl: '/bird-wanderer-logo.svg',
  primaryRig: '',
  birdsCount: 0,
  photosCount: 0,
  tripsCount: 0,
  locationPrivacy: 'approximate',
  profileVisibility: 'public',
  sensitiveSpeciesProtection: true,
  pushAlertsEnabled: false,
});

async function sanitizeImage(bytes) {
  const image = sharp(bytes, { limitInputPixels: 40000000, failOn: 'warning' });
  const info = await image.metadata();
  if (!['jpeg', 'png'].includes(info.format) || (info.pages || 1) !== 1) throw new Error('Unsupported image');
  return image
    .rotate()
    .resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export function observationsRouter(
  db,
  discovery,
  { mediaPath = resolve('data/media'), now = Date.now, processImage = sanitizeImage, push } = {},
) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT NOT NULL DEFAULT '', gear TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
      location_privacy TEXT NOT NULL DEFAULT 'approximate', visibility TEXT NOT NULL DEFAULT 'public',
      sensitive_protection INTEGER NOT NULL DEFAULT 1, push_enabled INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followed_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY(follower_id, followed_id), CHECK(follower_id != followed_id)
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL UNIQUE, bytes INTEGER NOT NULL, exif TEXT NOT NULL,
      latitude REAL, longitude REAL, metadata_error INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      media_id TEXT NOT NULL UNIQUE REFERENCES media(id), species_id TEXT NOT NULL,
      species_name TEXT NOT NULL, scientific_name TEXT NOT NULL, hotspot_id TEXT NOT NULL,
      hotspot_name TEXT NOT NULL, observed_at TEXT NOT NULL, notes TEXT NOT NULL,
      visibility TEXT NOT NULL CHECK(visibility IN ('public','followers','private')),
      hide_location INTEGER NOT NULL DEFAULT 1, in_life_list INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS observations_owner_date ON observations(user_id, created_at);
  `);
  const router = Router();
  const route = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  };
  const profile = (userId) => {
    const user = db.prepare('SELECT id,name FROM users WHERE id=?').get(userId);
    const row = db.prepare('SELECT * FROM profiles WHERE user_id=?').get(userId);
    const counts = db
      .prepare(
        `SELECT COUNT(*) AS photos, COUNT(DISTINCT CASE WHEN in_life_list=1 THEN species_id END) AS birds,
      COUNT(DISTINCT substr(observed_at,1,10)||':'||hotspot_id) AS visits FROM observations WHERE user_id=?`,
      )
      .get(userId);
    return {
      ...initialProfile(user),
      ...(row
        ? {
            bio: row.bio,
            primaryRig: row.gear,
            location: row.location,
            locationPrivacy: row.location_privacy,
            profileVisibility: row.visibility,
            sensitiveSpeciesProtection: !!row.sensitive_protection,
            pushAlertsEnabled: !!row.push_enabled,
          }
        : {}),
      photosCount: counts.photos,
      birdsCount: counts.birds,
      tripsCount: counts.visits,
    };
  };
  const observation = (id) =>
    db
      .prepare(
        `SELECT o.*, m.exif, m.latitude, m.longitude, u.name AS author_name
    FROM observations o JOIN media m ON o.media_id=m.id JOIN users u ON u.id=o.user_id WHERE o.id=?`,
      )
      .get(id);
  const canRead = (row, viewer) => {
    if (!row) return false;
    if (row.user_id === viewer) return true;
    if (row.visibility === 'private') return false;
    const following = !!db
      .prepare('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?')
      .get(viewer, row.user_id);
    const ownerPreferences = db
      .prepare('SELECT visibility,location_privacy FROM profiles WHERE user_id=?')
      .get(row.user_id);
    if (ownerPreferences?.location_privacy === 'private') return false;
    const ownerVisibility = ownerPreferences?.visibility || 'public';
    return (row.visibility === 'public' || following) && (ownerVisibility === 'public' || following);
  };
  const serialize = (row, viewer) => {
    const own = row.user_id === viewer;
    const ownerPrivacy =
      db.prepare('SELECT location_privacy FROM profiles WHERE user_id=?').get(row.user_id)
        ?.location_privacy || 'approximate';
    const hidden = !own && ['hide', 'private'].includes(ownerPrivacy);
    return {
      id: row.id,
      ownerId: row.user_id,
      authorName: row.author_name,
      authorHandle: initialProfile({ id: row.user_id, name: row.author_name }).handle,
      speciesId: row.species_id,
      speciesName: row.species_name,
      scientificName: row.scientific_name,
      hotspotId: hidden ? null : row.hotspot_id,
      location: hidden ? 'Location withheld' : row.hotspot_name,
      observedAt: row.observed_at,
      notes: row.notes,
      visibility: row.visibility,
      hideExactLocation: !!row.hide_location,
      inLifeList: !!row.in_life_list,
      imageUrl: `/api/observations/media/${row.media_id}`,
      exif: JSON.parse(row.exif),
      createdAt: new Date(row.created_at).toISOString(),
      ...communityStats(db,row.id,viewer),
      isFollowing: !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?').get(viewer,row.user_id),
      isOwner: own,
      ...(own
        ? {
            privateLocation:
              row.latitude === null ? null : { latitude: row.latitude, longitude: row.longitude },
          }
        : {}),
      locationPolicy:
        'Shared records use hotspot-level location only; exact EXIF coordinates are never published. This conservative protection applies to all species, without claiming a verified sensitivity classification.',
    };
  };
  const socialNotifications=createSocialNotifications(db,{observation,canRead},now);
  router.use('/social',communityRouter(db,{observation,canRead,serialize},now,socialNotifications));
  router.use('/chat',messagesRouter(db,discovery,{observation,canRead},now));
  const alerts = createAlerts(db, discovery, { observation, canRead }, now, push, socialNotifications);
  router.dispatchPush = alerts.dispatchPush;
  router.checkOpportunities = alerts.checkOpportunities;
  router.use('/alerts', alerts.router);
  router.get(
    '/profile',
    route((req, res) => res.json({ profile: profile(req.userId) })),
  );
  router.patch(
    '/profile',
    route((req, res) => {
      const old = profile(req.userId),
        input = req.body || {};
      const next = { ...old, ...input };
      for (const [field, max] of [
        ['name', 80],
        ['bio', 1000],
        ['primaryRig', 200],
        ['location', 120],
      ]) {
        if (clean(next[field], max) === null || (field === 'name' && next[field].trim().length < 2))
          throw fail(400, `Invalid ${field}.`);
        next[field] = next[field].trim();
      }
      if (
        !['approximate', 'hide', 'private'].includes(next.locationPrivacy) ||
        !['public', 'followers'].includes(next.profileVisibility) ||
        typeof next.sensitiveSpeciesProtection !== 'boolean' ||
        typeof next.pushAlertsEnabled !== 'boolean'
      )
        throw fail(400, 'Invalid privacy preferences.');
      db.exec('BEGIN');
      try {
        db.prepare('UPDATE users SET name=? WHERE id=?').run(next.name, req.userId);
        db.prepare(
          `INSERT INTO profiles VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
        bio=excluded.bio,gear=excluded.gear,location=excluded.location,location_privacy=excluded.location_privacy,
        visibility=excluded.visibility,sensitive_protection=excluded.sensitive_protection,push_enabled=excluded.push_enabled`,
        ).run(
          req.userId,
          next.bio,
          next.primaryRig,
          next.location,
          next.locationPrivacy,
          next.profileVisibility,
          Number(next.sensitiveSpeciesProtection),
          Number(next.pushAlertsEnabled),
        );
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      res.json({ profile: profile(req.userId) });
    }),
  );

  let activeUploads = 0;
  router.post(
    '/media',
    (req, res, next) => {
      if (activeUploads >= 2)
        return res.status(503).json({ error: 'Photo processing is busy. Please try again.' });
      activeUploads++;
      let released = false;
      req.releaseUpload = () => {
        if (!released) {
          released = true;
          activeUploads--;
        }
      };
      const releaseBeforeProcessing = () => {
        if (!req.uploadProcessing) req.releaseUpload();
      };
      res.once('finish', releaseBeforeProcessing);
      res.once('close', releaseBeforeProcessing);
      next();
    },
    express.raw({ type: () => true, limit: maxBytes }),
    route(async (req, res) => {
      req.uploadProcessing = true;
      try {
        if (res.destroyed) return;
        if (!Buffer.isBuffer(req.body) || req.body.length === 0)
          throw fail(400, 'Choose a JPEG or PNG photograph.');
        const jpeg = req.body[0] === 0xff && req.body[1] === 0xd8 && req.body[2] === 0xff;
        const png = req.body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const declared = req.get('content-type')?.split(';')[0].toLowerCase();
        if ((!jpeg && !png) || declared !== (jpeg ? 'image/jpeg' : 'image/png'))
          throw fail(415, 'File content and type must be JPEG or PNG.');
        const expired = db
          .prepare(
            `SELECT m.id,m.filename FROM media m WHERE user_id=? AND created_at<?
      AND NOT EXISTS(SELECT 1 FROM observations o WHERE o.media_id=m.id)`,
          )
          .all(req.userId, now() - 86400000);
        for (const media of expired) {
          const removed = db
            .prepare(
              'DELETE FROM media WHERE id=? AND NOT EXISTS(SELECT 1 FROM observations WHERE media_id=?)',
            )
            .run(media.id, media.id);
          if (removed.changes)
            await unlink(resolve(mediaPath, media.filename)).catch((error) => {
              if (error.code !== 'ENOENT') console.error('Expired staged photo needs file cleanup.');
            });
        }
        const usage = db
          .prepare('SELECT COALESCE(SUM(bytes),0) AS total FROM media WHERE user_id=?')
          .get(req.userId).total;
        const staged = db
          .prepare(
            'SELECT COUNT(*) AS total FROM media m WHERE user_id=? AND NOT EXISTS(SELECT 1 FROM observations o WHERE o.media_id=m.id)',
          )
          .get(req.userId).total;
        if (usage >= 500 * 1024 * 1024 || staged >= 25)
          throw fail(409, 'Photo storage limit reached. Remove unused photographs before uploading more.');
        let tags = {},
          metadataError = false,
          output;
        try {
          output = await processImage(req.body);
        } catch {
          throw fail(
            422,
            'Cannot decode this photograph. Use a valid single-frame JPEG/PNG of at most 40 megapixels.',
          );
        }
        if (res.destroyed) return;
        try {
          tags =
            (await exifr.parse(req.body, {
              xmp: false,
              icc: false,
              iptc: false,
              makerNote: false,
              userComment: false,
              reviveValues: false,
            })) || {};
        } catch {
          metadataError = true;
        }
        const exif = normalizeExif(
          Object.entries({ ...tags, ISOSpeedRatings: tags.ISO ?? tags.ISOSpeedRatings }).map(
            ([name, value]) => ({ name, value }),
          ),
        );
        const latitude =
          Number.isFinite(tags.latitude) && Math.abs(tags.latitude) <= 90 ? tags.latitude : null;
        const longitude =
          Number.isFinite(tags.longitude) && Math.abs(tags.longitude) <= 180 ? tags.longitude : null;
        if (output.length > maxBytes || usage + output.length > 500 * 1024 * 1024)
          throw fail(413, 'Processed photograph exceeds your storage limit.');
        const id = randomUUID(),
          filename = `${id}.jpg`,
          filePath = resolve(mediaPath, filename);
        await mkdir(mediaPath, { recursive: true });
        await writeFile(filePath, output, { flag: 'wx' });
        if (res.destroyed) {
          await unlink(filePath).catch(() => {});
          return;
        }
        try {
          const currentUsage = db.prepare('SELECT COALESCE(SUM(bytes),0) AS total FROM media WHERE user_id=?').get(req.userId).total;
          const currentStaged = db.prepare('SELECT COUNT(*) AS total FROM media m WHERE user_id=? AND NOT EXISTS(SELECT 1 FROM observations o WHERE o.media_id=m.id)').get(req.userId).total;
          if (currentUsage + output.length > 500 * 1024 * 1024 || currentStaged >= 25) throw fail(409, 'Photo storage limit reached.');
          db.prepare('INSERT INTO media VALUES (?,?,?,?,?,?,?,?,?)').run(
            id,
            req.userId,
            filename,
            output.length,
            JSON.stringify(exif),
            latitude !== null && longitude !== null ? latitude : null,
            latitude !== null && longitude !== null ? longitude : null,
            Number(metadataError),
            now(),
          );
        } catch (error) {
          await unlink(filePath).catch(() => {});
          throw error;
        }
        res.status(201).json({
          media: {
            id,
            imageUrl: `/api/observations/media/${id}`,
            exif,
            metadataError,
            hasPrivateLocation: latitude !== null && longitude !== null,
            note: 'Shared image is re-encoded JPEG, max 4096px, with embedded metadata removed. Original file is not retained.',
          },
        });
      } finally {
        req.releaseUpload();
      }
    }),
  );
  router.get(
    '/media/:id',
    route(async (req, res) => {
      if (!uuid(req.params.id)) throw fail(404, 'Photo not found.');
      const media = db.prepare('SELECT * FROM media WHERE id=?').get(req.params.id);
      const linked = db.prepare('SELECT id FROM observations WHERE media_id=?').get(req.params.id);
      if (
        !media ||
        (media.user_id !== req.userId && (!linked || !canRead(observation(linked.id), req.userId)))
      )
        throw fail(404, 'Photo not found.');
      res.set({
        'Cache-Control': 'private, no-store',
        'Content-Type': 'image/jpeg',
        'Content-Disposition': 'inline; filename="bird-photograph.jpg"',
      });
      res.sendFile(resolve(mediaPath, media.filename), (error) => {
        if (error && !res.headersSent) res.status(404).json({ error: 'Photo unavailable.' });
      });
    }),
  );
  router.delete(
    '/media/:id',
    route(async (req, res) => {
      const media = db.prepare('SELECT * FROM media WHERE id=? AND user_id=?').get(req.params.id, req.userId);
      if (!media) throw fail(404, 'Photo not found.');
      if (db.prepare('SELECT 1 FROM observations WHERE media_id=?').get(media.id))
        throw fail(409, 'Delete the observation first.');
      await unlink(resolve(mediaPath, media.filename)).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
      db.prepare('DELETE FROM media WHERE id=?').run(media.id);
      res.status(204).end();
    }),
  );
  router.get(
    '/',
    route((req, res) => {
      const offset=Number(req.query.offset??0);
      if(!Number.isSafeInteger(offset)||offset<0||offset>Number.MAX_SAFE_INTEGER-500)throw fail(400,'Invalid field-record page.');
      const feed=req.query.scope==='feed';
      const rows=db.prepare(`SELECT o.id FROM observations o LEFT JOIN profiles p ON p.user_id=o.user_id
        WHERE ${feed?`o.visibility!='private' AND COALESCE(p.location_privacy,'approximate')!='private' AND ${visibleObservationSQL}`:'o.user_id=:viewer'}
        ORDER BY o.created_at DESC,o.id DESC LIMIT 501 OFFSET :offset`).all({viewer:req.userId,offset});
      res.json({
        nextOffset:rows.length>500?offset+500:null,
        observations: rows.slice(0,500)
          .map((row) => observation(row.id))
          .filter((row) => canRead(row, req.userId))
          .map((row) => serialize(row, req.userId)),
        profile: profile(req.userId),
      });
    }),
  );
  router.post(
    '/',
    route(async (req, res) => {
      const body = req.body || {};
      if (
        !uuid(body.mediaId) ||
        typeof body.speciesId !== 'string' ||
        typeof body.hotspotId !== 'string' ||
        !['public', 'followers', 'private'].includes(body.visibility) ||
        typeof body.hideExactLocation !== 'boolean' ||
        clean(body.notes, 3000) === null ||
        typeof body.observedAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(body.observedAt)
      )
        throw fail(
          400,
          'Choose a photograph, species, hotspot, date/time and visibility; notes may have up to 3000 characters.',
        );
      if(!validObservationTime(body.observedAt,now()))
        throw fail(400,'Enter a valid observation date/time (camera/local clock; timezone unverified).');
      const media = db.prepare('SELECT * FROM media WHERE id=? AND user_id=?').get(body.mediaId, req.userId);
      if (!media) throw fail(409, 'Choose an unused photograph belonging to your account.');
      const existing = db.prepare('SELECT * FROM observations WHERE media_id=?').get(body.mediaId);
      if (existing) {
        if (
          existing.user_id !== req.userId ||
          existing.species_id !== body.speciesId ||
          existing.hotspot_id !== body.hotspotId ||
          existing.observed_at !== body.observedAt ||
          existing.notes !== body.notes.trim() ||
          existing.visibility !== body.visibility ||
          !!existing.hide_location !== body.hideExactLocation
        )
          throw fail(409, 'This photograph is already attached to an observation.');
        return res.json({
          observation: serialize(observation(existing.id), req.userId),
          profile: profile(req.userId),
        });
      }
      const catalogue = await discovery.catalogue();
      const species = catalogue.species.find((row) => row.id === body.speciesId),
        hotspot = catalogue.hotspots.find((row) => row.id === body.hotspotId);
      if (!species || !hotspot)
        throw fail(400, 'Choose a species and hotspot from the current discovery catalogue.');
      const id = randomUUID();
      // No await inside this transaction: the sighting and its matched alerts commit together.
      db.exec('BEGIN');
      try {
        db.prepare('INSERT INTO observations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
          id,
          req.userId,
          body.mediaId,
          species.id,
          species.name,
          species.scientificName,
          hotspot.id,
          hotspot.name,
          body.observedAt,
          body.notes.trim(),
          body.visibility,
          Number(body.hideExactLocation),
          1,
          now(),
        );
        alerts.queue(observation(id));
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        if (db.prepare('SELECT 1 FROM observations WHERE media_id=?').get(body.mediaId))
          throw fail(409, 'This photograph is already attached to an observation. Refresh your journal before retrying.');
        throw error;
      }
      res
        .status(201)
        .json({ observation: serialize(observation(id), req.userId), profile: profile(req.userId) });
    }),
  );
  router.get(
    '/:id',
    route((req, res) => {
      const row = observation(req.params.id);
      if (!canRead(row, req.userId)) throw fail(404, 'Observation not found.');
      res.json({ observation: serialize(row, req.userId) });
    }),
  );
  router.patch(
    '/:id',
    route(async(req,res)=>{
      const original=observation(req.params.id);
      if(!original||original.user_id!==req.userId)throw fail(404,'Observation not found.');
      const body=req.body,allowed=['inLifeList','visibility','notes','observedAt','speciesId','hotspotId'];
      if(!body||typeof body!=='object'||Array.isArray(body)||!Object.keys(body).length||Object.keys(body).some(key=>!allowed.includes(key)))
        throw fail(400,'Choose valid observation fields to change.');
      if((body.inLifeList!==undefined&&typeof body.inLifeList!=='boolean')||
         (body.visibility!==undefined&&!['public','followers','private'].includes(body.visibility))||
         (body.notes!==undefined&&clean(body.notes,3000)===null)||
         (body.observedAt!==undefined&&!validObservationTime(body.observedAt,now()))||
         ['speciesId','hotspotId'].some(key=>body[key]!==undefined&&(typeof body[key]!=='string'||!body[key]||body[key].length>80)))
        throw fail(400,'Check species, hotspot, local date/time, visibility and notes (up to 3000 characters).');
      // Text/privacy/life-list edits must still work when the discovery provider is unavailable.
      const needsCatalogue=(body.speciesId!==undefined&&body.speciesId!==original.species_id)||(body.hotspotId!==undefined&&body.hotspotId!==original.hotspot_id);
      const catalogue=needsCatalogue?await discovery.catalogue():null;
      const species=body.speciesId===undefined?null:body.speciesId===original.species_id?{id:original.species_id,name:original.species_name,scientificName:original.scientific_name}:catalogue.species.find(row=>row.id===body.speciesId);
      const hotspot=body.hotspotId===undefined?null:body.hotspotId===original.hotspot_id?{id:original.hotspot_id,name:original.hotspot_name}:catalogue.hotspots.find(row=>row.id===body.hotspotId);
      if((body.speciesId!==undefined&&!species)||(body.hotspotId!==undefined&&!hotspot))throw fail(400,'Choose a species and hotspot from the current discovery catalogue.');
      // Awaiting the provider may allow another request to run. Merge only submitted
      // fields into the latest owned row, preserving unrelated concurrent changes.
      const row=observation(original.id);
      if(!row||row.user_id!==req.userId)throw fail(404,'Observation not found.');
      const corrected=(species&&species.id!==row.species_id)||(hotspot&&hotspot.id!==row.hotspot_id);
      db.exec('BEGIN');
      try{
        db.prepare(`UPDATE observations SET in_life_list=?,visibility=?,notes=?,observed_at=?,species_id=?,species_name=?,scientific_name=?,hotspot_id=?,hotspot_name=? WHERE id=?`).run(
          body.inLifeList===undefined?row.in_life_list:Number(body.inLifeList),body.visibility??row.visibility,
          body.notes===undefined?row.notes:body.notes.trim(),body.observedAt??row.observed_at,
          species?.id??row.species_id,species?.name??row.species_name,species?.scientificName??row.scientific_name,
          hotspot?.id??row.hotspot_id,hotspot?.name??row.hotspot_name,row.id);
        // A corrected species/site is not a newly published sighting. Old matched
        // alerts/outbox references must not silently change into a different report.
        if(corrected)db.prepare('DELETE FROM sighting_alerts WHERE observation_id=?').run(row.id);
        db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
      res.json({observation:serialize(observation(row.id),req.userId),profile:profile(req.userId)});

    }),
  );
  router.delete(
    '/:id',
    route(async (req, res) => {
      const row = observation(req.params.id);
      if (!row || row.user_id !== req.userId) throw fail(404, 'Observation not found.');
      const media = db.prepare('SELECT * FROM media WHERE id=?').get(row.media_id);
      db.exec('BEGIN');
      try {
        db.prepare('DELETE FROM observations WHERE id=?').run(row.id);
        db.prepare('DELETE FROM media WHERE id=?').run(row.media_id);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      await unlink(resolve(mediaPath, media.filename)).catch((error) => {
        if (error.code !== 'ENOENT') console.error('Deleted photo file needs cleanup.');
      });
      res.status(204).end();
    }),
  );
  return router;
}
