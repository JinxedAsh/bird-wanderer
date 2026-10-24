import { Router } from 'express';
import { randomUUID, randomInt } from 'node:crypto';
import { localClock } from './opportunities.mjs';

// Candidate names select provider records; taxonomy and photographs still require exact source matches.
const candidates = [
  'Coracias benghalensis',
  'Alcedo atthis',
  'Egretta garzetta',
  'Psittacula krameri',
  'Halcyon smyrnensis',
  'Passer domesticus',
  'Acridotheres tristis',
  'Pavo cristatus',
  'Pycnonotus cafer',
  'Dicrurus macrocercus',
  'Eudynamys scolopaceus',
  'Ardeola grayii',
  'Spilopelia chinensis',
  'Milvus migrans',
  'Bubulcus ibis',
  'Upupa epops',
  'Ceryle rudis',
  'Anas acuta',
  'Anas crecca',
  'Fulica atra',
];
const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const failure = (status, message) => Object.assign(new Error(message), { status });
const day = (now) => localClock(now, 'Asia/Kolkata').slice(0, 10);

export function retentionRouter(db, discovery, now = Date.now) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      questions TEXT NOT NULL,current_index INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,completed_at INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS quiz_one_active ON quiz_sessions(user_id) WHERE status='active';
    CREATE TABLE IF NOT EXISTS quiz_answers (
      session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      question_index INTEGER NOT NULL,option_id TEXT NOT NULL,correct INTEGER NOT NULL,created_at INTEGER NOT NULL,
      PRIMARY KEY(session_id,question_index)
    );
    CREATE TABLE IF NOT EXISTS quiz_limits (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,started_at INTEGER NOT NULL,attempts INTEGER NOT NULL
    );
  `);
  let bank = null,
    loading = null;
  const loadBank = async () => {
    if (bank && now() - bank.time < 3600000) return bank.rows;
    if (!loading)
      loading = (async () => {
        const catalogue = await discovery.catalogue();
        const targets = candidates
          .map((name) => catalogue.species.find((bird) => bird.scientificName === name))
          .filter(Boolean);
        const rows = [];
        // Three bounded provider requests at a time; skip unavailable references without inventing an image.
        for (let index = 0; index < targets.length && rows.length < 10; index += 3) {
          const batch = await Promise.all(
            targets.slice(index, index + 3).map(async (bird) => {
              try {
                const { photo } = await discovery.speciesPhoto(bird.id);
                return photo &&
                  typeof photo.author === 'string' &&
                  photo.author &&
                  photo.scientificName === bird.scientificName
                  ? { bird, photo }
                  : null;
              } catch {
                return null;
              }
            }),
          );
          rows.push(...batch.filter(Boolean));
        }
        if (rows.length < 10)
          throw failure(
            503,
            'Ten credited species photographs could not be loaded. Please retry when discovery is available.',
          );
        bank = { rows: rows.slice(0, 10), time: now() };
        return bank.rows;
      })().finally(() => {
        loading = null;
      });
    return loading;
  };
  const owned = (id, user) =>
    db.prepare('SELECT * FROM quiz_sessions WHERE id=? AND user_id=?').get(id, user);
  const stats = (user) => {
    const xp = db
      .prepare(
        'SELECT COALESCE(SUM(a.correct),0)*50 AS xp FROM quiz_answers a JOIN quiz_sessions s ON s.id=a.session_id WHERE s.user_id=?',
      )
      .get(user).xp;
    const sessions = db
      .prepare(
        "SELECT completed_at FROM quiz_sessions WHERE user_id=? AND status='completed' ORDER BY completed_at DESC",
      )
      .all(user);
    const dates = [...new Set(sessions.map((row) => day(row.completed_at)))];
    let streak = 0,
      expected = Date.parse(`${day(now())}T00:00:00Z`);
    if (dates[0] === new Date(expected - 86400000).toISOString().slice(0, 10)) expected -= 86400000;
    for (const date of dates) {
      if (date !== new Date(expected).toISOString().slice(0, 10)) break;
      streak++;
      expected -= 86400000;
    }
    const local = Date.parse(`${day(now())}T00:00:00Z`),
      weekday = new Date(local).getUTCDay();
    const monday = local - ((weekday + 6) % 7) * 86400000 - 19800000;
    const progress = db
      .prepare(
        `SELECT COUNT(DISTINCT species_id) AS birds,COUNT(DISTINCT hotspot_id) AS places,
      SUM(CASE WHEN json_extract(m.exif,'$.iso') IS NOT NULL AND json_extract(m.exif,'$.aperture') IS NOT NULL THEN 1 ELSE 0 END) AS metadata
      FROM observations o JOIN media m ON m.id=o.media_id WHERE o.user_id=? AND o.created_at>=?`,
      )
      .get(user, monday);
    return {
      xp,
      streak,
      completedSessions: sessions.length,
      timezone: 'Asia/Kolkata',
      challenges: [
        { id: 'birds', title: 'Log three different species this week', progress: progress.birds, target: 3 },
        {
          id: 'places',
          title: 'Log at two different hotspots this week',
          progress: progress.places,
          target: 2,
        },
        {
          id: 'metadata',
          title: 'Log one photo with ISO and aperture metadata this week',
          progress: progress.metadata || 0,
          target: 1,
        },
      ],
    };
  };
  const state = (row, user) => {
    if (!row) return { session: null, stats: stats(user) };
    const questions = JSON.parse(row.questions),
      question = questions[row.current_index];
    const answer = db
      .prepare('SELECT * FROM quiz_answers WHERE session_id=? AND question_index=?')
      .get(row.id, row.current_index);
    const totalCorrect = db
      .prepare('SELECT COALESCE(SUM(correct),0) AS total FROM quiz_answers WHERE session_id=?')
      .get(row.id).total;
    const current = question
      ? {
          id: `${row.id}:${row.current_index}`,
          questionNumber: row.current_index + 1,
          totalQuestions: questions.length,
          prompt: 'Which bird is shown?',
          subPrompt: 'Compare the visible features, then choose one species.',
          imageUrl: question.photo.thumbnailUrl,
          photoCredit: Object.fromEntries(
            [
              'author',
              'license',
              'licenseUrl',
              'sourceUrl',
              'title',
              'credit',
              'attribution',
              'usageTerms',
              'restrictions',
              'matchUrl',
            ].map((key) => [key, question.photo[key] || '']),
          ),
          options: question.options,
        }
      : null;
    return {
      session: {
        id: row.id,
        status: row.status,
        currentIndex: row.current_index,
        totalQuestions: questions.length,
        score: totalCorrect,
        question: current,
        feedback: answer
          ? {
              selectedOptionId: answer.option_id,
              correct: !!answer.correct,
              correctOptionId: question.correctOptionId,
              factTitle: answer.correct ? `Correct! ${question.name}` : `The reference is ${question.name}`,
              factSpecies: question.scientificName,
              factText:
                'This is a source-matched reference photograph. Practise comparing visible features with the species field guide; a quiz answer does not verify a real sighting.',
            }
          : null,
      },
      stats: stats(user),
    };
  };
  const router = Router();
  const route = (fn) => (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req, res))
      .catch((error) =>
        error.status ? res.status(error.status).json({ error: error.message }) : next(error),
      );
  };
  router.use((req, res, next) => {
    if (['GET', 'HEAD'].includes(req.method)) return next();
    const time = now(),
      row = db.prepare('SELECT * FROM quiz_limits WHERE user_id=?').get(req.userId);
    if (row && time - row.started_at < 60000 && row.attempts >= 40)
      return res
        .status(429)
        .set('Retry-After', '60')
        .json({ error: 'Too many practice changes. Try again in a minute.' });
    db.prepare(
      `INSERT INTO quiz_limits VALUES (?,?,1) ON CONFLICT(user_id) DO UPDATE SET attempts=CASE WHEN ?-started_at>=60000 THEN 1 ELSE attempts+1 END,started_at=CASE WHEN ?-started_at>=60000 THEN ? ELSE started_at END`,
    ).run(req.userId, time, time, time, time);
    next();
  });
  router.get(
    '/',
    route((req, res) => {
      const row = db
        .prepare(
          "SELECT * FROM quiz_sessions WHERE user_id=? AND status!='abandoned' ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END,created_at DESC,rowid DESC LIMIT 1",
        )
        .get(req.userId);
      res.json(state(row, req.userId));
    }),
  );
  router.post(
    '/quiz',
    route(async (req, res) => {
      if (req.body?.restart !== undefined && typeof req.body.restart !== 'boolean')
        throw failure(400, 'Choose a valid restart state.');
      const existing = db
        .prepare("SELECT * FROM quiz_sessions WHERE user_id=? AND status='active'")
        .get(req.userId);
      if (existing && !req.body?.restart) return res.json(state(existing, req.userId));
      const references = await loadBank();
      const questions = shuffle(references).map(({ bird, photo }) => {
        const choices = shuffle([
          bird,
          ...shuffle(references.filter((row) => row.bird.id !== bird.id))
            .slice(0, 3)
            .map((row) => row.bird),
        ]);
        const options = choices.map((choice, index) => ({
          id: String.fromCharCode(65 + index),
          label: String.fromCharCode(65 + index),
          text: choice.name,
        }));
        return {
          name: bird.name,
          scientificName: bird.scientificName,
          photo,
          options,
          correctOptionId: options[choices.findIndex((choice) => choice.id === bird.id)].id,
        };
      });
      db.exec('BEGIN');
      try {
        const active = db
          .prepare("SELECT * FROM quiz_sessions WHERE user_id=? AND status='active'")
          .get(req.userId);
        if (active && !req.body?.restart) {
          db.exec('COMMIT');
          return res.json(state(active, req.userId));
        }
        if (active) db.prepare("UPDATE quiz_sessions SET status='abandoned' WHERE id=?").run(active.id);
        const id = randomUUID();
        db.prepare("INSERT INTO quiz_sessions VALUES (?,?,?,0,'active',?,NULL)").run(
          id,
          req.userId,
          JSON.stringify(questions),
          now(),
        );
        db.exec('COMMIT');
        res.status(201).json(state(owned(id, req.userId), req.userId));
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }),
  );
  router.post(
    '/quiz/:id/answer',
    route((req, res) => {
      const row = owned(req.params.id, req.userId);
      if (!row) throw failure(404, 'Practice session not found.');
      const { index, optionId } = req.body || {};
      if (!Number.isInteger(index) || index !== row.current_index || row.status !== 'active')
        throw failure(409, 'This question is no longer current. Reload your practice.');
      const question = JSON.parse(row.questions)[index];
      if (!question.options.some((option) => option.id === optionId))
        throw failure(400, 'Select one of the question options.');
      const previous = db
        .prepare('SELECT * FROM quiz_answers WHERE session_id=? AND question_index=?')
        .get(row.id, index);
      if (previous && previous.option_id !== optionId)
        throw failure(409, 'This answer is already saved. Continue to the next question.');
      if (!previous)
        db.prepare('INSERT INTO quiz_answers VALUES (?,?,?,?,?)').run(
          row.id,
          index,
          optionId,
          Number(optionId === question.correctOptionId),
          now(),
        );
      res.json(state(row, req.userId));
    }),
  );
  router.post(
    '/quiz/:id/next',
    route((req, res) => {
      const row = owned(req.params.id, req.userId);
      if (!row) throw failure(404, 'Practice session not found.');
      if (!Number.isInteger(req.body?.index) || req.body.index < 0)
        throw failure(400, 'Choose a valid question index.');
      if (req.body.index === row.current_index - 1 && ['active', 'completed'].includes(row.status))
        return res.json(state(row, req.userId));
      if (row.status !== 'active') throw failure(409, 'Reload your practice before continuing.');
      if (
        req.body.index !== row.current_index ||
        !db
          .prepare('SELECT 1 FROM quiz_answers WHERE session_id=? AND question_index=?')
          .get(row.id, row.current_index)
      )
        throw failure(409, 'Answer the current question before continuing.');
      const next = row.current_index + 1,
        complete = next === JSON.parse(row.questions).length;
      db.prepare('UPDATE quiz_sessions SET current_index=?,status=?,completed_at=? WHERE id=?').run(
        next,
        complete ? 'completed' : 'active',
        complete ? now() : null,
        row.id,
      );
      res.json(state(owned(row.id, req.userId), req.userId));
    }),
  );
  return router;
}
