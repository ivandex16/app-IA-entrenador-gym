const mongoose = require('mongoose');
const WorkoutLog = require('../models/WorkoutLog');
const User = require('../models/User');
const Exercise = require('../models/Exercise');
const {
  WORKOUT_STATUS, FINAL_STATUSES, OPEN_STATUSES, LEGACY_COMPLETED_FILTER, canTransition,
} = require('../constants/workoutStatus');

// MET estimates by muscle group (metabolic equivalent of task)
const MET_BY_GROUP = {
  chest: 6.0, back: 6.0, shoulders: 5.0, biceps: 4.5, triceps: 4.5,
  legs: 6.5, glutes: 6.0, abs: 4.0, forearms: 3.5, calves: 4.0,
  full_body: 7.0, cardio: 8.0,
};

// Estimate calories: MET × weight(kg) × duration(hours)
async function estimateCalories(userId, exercises, durationMinutes) {
  if (!durationMinutes || durationMinutes <= 0) return 0;
  const user = await User.findById(userId).select('weight');
  const weightKg = user?.weight || 70; // default 70 kg
  const exerciseIds = exercises.map((e) => e.exercise);
  const dbExercises = await Exercise.find({ _id: { $in: exerciseIds } }).select('muscleGroup');
  const mets = dbExercises.map((e) => MET_BY_GROUP[e.muscleGroup] || 5.0);
  const avgMet = mets.length > 0 ? mets.reduce((a, b) => a + b, 0) / mets.length : 5.0;
  return Math.round(avgMet * weightKg * (durationMinutes / 60));
}

const POPULATE = ['exercises.exercise', 'name muscleGroup'];

// A date-only bound (YYYY-MM-DD) for 'to' means the whole day is included.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function dateRange(from, to) {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    if (DATE_ONLY.test(to)) {
      const end = new Date(to);
      end.setUTCDate(end.getUTCDate() + 1);
      range.$lt = end;
    } else {
      range.$lte = new Date(to);
    }
  }
  return range;
}

/* Cursor = base64("<date ISO>|<_id>") of the last item of the previous page. */
const encodeCursor = (log) => Buffer.from(`${log.date.toISOString()}|${log._id}`).toString('base64url');
function decodeCursor(cursor) {
  try {
    const [iso, id] = Buffer.from(String(cursor), 'base64url').toString('utf8').split('|');
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()) || !mongoose.isValidObjectId(id)) return null;
    return { date, id: new mongoose.Types.ObjectId(id) };
  } catch {
    return null;
  }
}

/*
 * GET /api/workouts?from=&to=&status=&limit=&cursor=   (validated in the route)
 * Newest first. Without `limit` it returns a plain array (old clients). With
 * `limit` it returns one page: { items, nextCursor } (null when there's no more).
 */
exports.list = async (req, res, next) => {
  try {
    const { from, to, status, limit, cursor } = req.query;
    const filter = { user: req.user._id };
    const range = dateRange(from, to);
    if (range) filter.date = range;
    if (status) {
      const wanted = String(status).split(',');
      filter.$and = [wanted.includes(WORKOUT_STATUS.COMPLETED)
        ? { $or: [{ status: { $in: wanted } }, { status: { $exists: false } }] }
        : { status: { $in: wanted } }];
    }

    if (!limit) {
      const logs = await WorkoutLog.find(filter).populate(...POPULATE).sort({ date: -1, _id: -1 });
      return res.json(logs);
    }

    const pageSize = Number(limit);
    if (cursor) {
      const c = decodeCursor(cursor);
      if (!c) return res.status(400).json({ message: 'Invalid cursor' });
      (filter.$and ||= []).push({ $or: [{ date: { $lt: c.date } }, { date: c.date, _id: { $lt: c.id } }] });
    }
    const docs = await WorkoutLog.find(filter)
      .populate(...POPULATE)
      .sort({ date: -1, _id: -1 })
      .limit(pageSize + 1);
    const hasMore = docs.length > pageSize;
    const items = hasMore ? docs.slice(0, pageSize) : docs;
    res.json({ items, nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null });
  } catch (err) {
    next(err);
  }
};

/* Valid IANA time zone or UTC (Mongo errors on unknown zones). */
function safeTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/*
 * GET /api/workouts/summary?tz=America/Bogota
 * Small, whole-history aggregate so the client never needs to download every
 * session: totals of finished sessions, sessions per month (for navigation),
 * weeks with a finished session (for the streak) and open sessions to resume.
 */
exports.summary = async (req, res, next) => {
  try {
    const tz = safeTimeZone(req.query.tz || 'UTC');
    // Old sessions were stored as UTC midnight of their calendar day: read those
    // in UTC so they keep their day (same rule as the client's workoutDisplayDate).
    const zone = {
      $cond: [{ $eq: [{ $dateToString: { date: '$date', format: '%H:%M:%S.%L' } }, '00:00:00.000'] }, 'UTC', tz],
    };
    const user = req.user._id;
    const [totals, months, weeks, open] = await Promise.all([
      WorkoutLog.aggregate([
        { $match: { user, ...LEGACY_COMPLETED_FILTER } },
        {
          $group: {
            _id: null,
            sessions: { $sum: 1 },
            exercises: { $sum: { $size: { $ifNull: ['$exercises', []] } } },
            calories: { $sum: { $ifNull: ['$caloriesBurned', 0] } },
            minutes: { $sum: { $ifNull: ['$durationMinutes', 0] } },
          },
        },
      ]),
      WorkoutLog.aggregate([
        { $match: { user } },
        { $group: { _id: { $dateToString: { date: '$date', format: '%Y-%m', timezone: zone } }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      WorkoutLog.aggregate([
        { $match: { user, ...LEGACY_COMPLETED_FILTER } },
        {
          $group: {
            _id: {
              $dateToString: {
                date: { $dateTrunc: { date: '$date', unit: 'week', timezone: zone, startOfWeek: 'monday' } },
                format: '%Y-%m-%d',
                timezone: zone,
              },
            },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 520 },
      ]),
      WorkoutLog.find({ user, status: { $in: OPEN_STATUSES } }).select('_id status date startedAt').sort({ date: -1 }).limit(5),
    ]);
    const t = totals[0] || { sessions: 0, exercises: 0, calories: 0, minutes: 0 };
    res.json({
      totals: { sessions: t.sessions, exercises: t.exercises, calories: t.calories, minutes: t.minutes },
      months: months.map((m) => ({ month: m._id, count: m.count })),
      weeks: weeks.map((w) => w._id),
      open,
    });
  } catch (err) {
    next(err);
  }
};

/*
 * GET /api/workouts/last-sets?exercises=id1,id2&before=ISO&exclude=workoutId
 * For each exercise, the sets of the latest finished session before `before`
 * that included it: used for "last time" hints and progress in the detail,
 * without loading older months.
 */
exports.lastSets = async (req, res, next) => {
  try {
    const ids = [...new Set(String(req.query.exercises || '').split(','))].filter(mongoose.isValidObjectId).slice(0, 30);
    const before = req.query.before ? new Date(req.query.before) : new Date();
    const exclude = mongoose.isValidObjectId(req.query.exclude) ? req.query.exclude : null;
    const result = {};
    await Promise.all(
      ids.map(async (id) => {
        const filter = {
          user: req.user._id,
          date: { $lt: before },
          'exercises.exercise': id,
          ...LEGACY_COMPLETED_FILTER,
        };
        if (exclude) filter._id = { $ne: exclude };
        const log = await WorkoutLog.findOne(filter).sort({ date: -1 }).select('date exercises');
        const ex = log?.exercises.find((e) => String(e.exercise) === id);
        if (ex) result[id] = { date: log.date, workoutId: log._id, sets: ex.sets };
      })
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/workouts/:id
exports.getById = async (req, res, next) => {
  try {
    const log = await WorkoutLog.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('exercises.exercise');
    if (!log) return res.status(404).json({ message: 'Workout not found' });
    res.json(log);
  } catch (err) {
    next(err);
  }
};

/*
 * Whitelist of what a client may set on a workout. Anything else in the body
 * (caloriesBurned, user, createdAt, unknown fields...) is ignored: calories are
 * always computed here. Types and ranges are validated in routes/workouts.js.
 */
const toNumber = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
const optionalSeconds = (v) => (v === '' || v === null || v === undefined ? undefined : Math.round(Number(v)));

function pickWorkoutFields(body) {
  const data = {};
  if (body.date !== undefined) data.date = body.date;
  if (body.routine) data.routine = body.routine;
  if (body.durationMinutes !== undefined) data.durationMinutes = toNumber(body.durationMinutes);
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.feeling !== undefined) data.feeling = body.feeling;
  if (body.favorite !== undefined) data.favorite = body.favorite === true;
  if (body.status !== undefined) data.status = body.status;
  if (body.startedAt !== undefined) data.startedAt = body.startedAt || undefined;
  if (body.endedAt !== undefined) data.endedAt = body.endedAt || undefined;
  if (body.activeSeconds !== undefined) data.activeSeconds = optionalSeconds(body.activeSeconds);
  if (Array.isArray(body.exercises)) {
    data.exercises = body.exercises.map((e) => {
      const rest = optionalSeconds(e.restSeconds);
      return {
        exercise: e.exercise,
        ...(rest !== undefined ? { restSeconds: rest } : {}),
        sets: (Array.isArray(e.sets) ? e.sets : []).map((s, i) => {
          const setRest = optionalSeconds(s.restSeconds);
          return {
            setNumber: toNumber(s.setNumber) || i + 1,
            reps: toNumber(s.reps),
            weight: toNumber(s.weight),
            ...(s.rpe ? { rpe: toNumber(s.rpe) } : {}),
            ...(typeof s.completed === 'boolean' ? { completed: s.completed } : {}),
            ...(setRest !== undefined ? { restSeconds: setRest } : {}),
          };
        }),
      };
    });
  }
  return data;
}

/* Closing a session stamps when it ended (unless the client sent it). */
function stampEnd(data, current) {
  if (FINAL_STATUSES.includes(data.status) && !data.endedAt && !current?.endedAt) data.endedAt = new Date();
}

// POST /api/workouts
// Idempotent when the client sends a clientId: repeating the same request
// returns the workout already saved (200) instead of creating a duplicate.
exports.create = async (req, res, next) => {
  const userId = req.user._id;
  const { clientId } = req.body;
  try {
    if (clientId) {
      const existing = await WorkoutLog.findOne({ user: userId, clientId }).populate(...POPULATE);
      if (existing) return res.status(200).json(existing);
    }
    const data = { ...pickWorkoutFields(req.body), user: userId };
    if (clientId) data.clientId = clientId;
    stampEnd(data);
    data.caloriesBurned = data.exercises?.length
      ? await estimateCalories(userId, data.exercises, data.durationMinutes)
      : 0;
    const log = await WorkoutLog.create(data);
    await log.populate(...POPULATE);
    res.status(201).json(log);
  } catch (err) {
    // Two identical requests raced past the lookup: return the one that won.
    if (err.code === 11000 && clientId) {
      const existing = await WorkoutLog.findOne({ user: userId, clientId }).populate(...POPULATE).catch(() => null);
      if (existing) return res.status(200).json(existing);
    }
    next(err);
  }
};

// PUT /api/workouts/:id — partial update: only the fields sent change.
// Used both for edits and for the periodic autosave of a live session.
exports.update = async (req, res, next) => {
  try {
    const log = await WorkoutLog.findOne({ _id: req.params.id, user: req.user._id });
    if (!log) return res.status(404).json({ message: 'Workout not found' });

    const data = pickWorkoutFields(req.body);
    if (!canTransition(log.status, data.status)) {
      return res.status(409).json({
        message: 'Esta sesión ya terminó y no se puede reabrir.',
        status: log.status,
      });
    }
    stampEnd(data, log);
    log.set(data);
    // Recompute calories from the merged result whenever what they depend on changed.
    if ('exercises' in data || 'durationMinutes' in data) {
      log.caloriesBurned = log.exercises.length
        ? await estimateCalories(req.user._id, log.exercises, log.durationMinutes)
        : 0;
    }
    await log.save();
    await log.populate(...POPULATE);
    res.json(log);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/workouts/:id
exports.remove = async (req, res, next) => {
  try {
    const log = await WorkoutLog.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!log) return res.status(404).json({ message: 'Workout not found' });
    res.json({ message: 'Workout deleted' });
  } catch (err) {
    next(err);
  }
};
