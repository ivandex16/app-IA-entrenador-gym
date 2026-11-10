/*
 * Routine import from an image — separate from the PDF importer, which stays untouched.
 *
 * The OCR runs in the user's browser (tesseract.js): the photo never leaves the
 * device and the free server CPU isn't spent on it. This endpoint receives the
 * recognised lines and returns a DRAFT: nothing is saved here. The routine is
 * created later with the normal POST /api/routines, after the user reviews it.
 */
const Exercise = require('../models/Exercise');
const { parseRoutineText } = require('../services/routineImport/parseRoutineText');
const { buildCatalog, matchExercise } = require('../services/routineImport/matchExercises');
const { normKey } = require('../services/routineImport/textUtils');

const MUSCLE_GROUPS = Exercise.schema.path('muscleGroup').enumValues;

let catalogCache = { at: 0, entries: null };
async function getCatalog() {
  if (catalogCache.entries && Date.now() - catalogCache.at < 60_000) return catalogCache.entries;
  const exercises = await Exercise.find({}).select('name muscleGroup aliases').lean();
  catalogCache = { at: Date.now(), entries: buildCatalog(exercises) };
  return catalogCache.entries;
}

/* Fields shown as "⚠ Revisar" in the review screen. */
function reviewReasons(ex) {
  const reasons = [];
  if (ex.match.status !== 'auto') reasons.push('exercise');
  else if (ex.match.confidence !== 'high') reasons.push('exercise-approx');
  if (ex.nameConfidence === 'low') reasons.push('name');
  if (!ex.sets) reasons.push('sets-missing');
  else if (ex.sets.confidence === 'low') reasons.push('sets');
  if (!ex.reps) reasons.push('reps-missing');
  else if (ex.reps.confidence === 'low') reasons.push('reps');
  for (const k of ['weight', 'restSeconds', 'rir', 'rpe', 'tempo']) if (ex[k]?.confidence === 'low') reasons.push(k);
  return reasons;
}

// POST /api/routines/import/image   body: { lines: [{ text, confidence }] }
exports.parseImageText = async (req, res, next) => {
  try {
    const lines = req.body.lines.map((l) => ({ text: String(l.text).slice(0, 300), confidence: l.confidence }));
    const parsed = parseRoutineText(lines);
    const exerciseCount = parsed.days.reduce((s, d) => s + d.exercises.length, 0);
    if (exerciseCount === 0) {
      return res.status(422).json({
        message: 'No encontramos ejercicios en la imagen.',
        hint: 'Prueba con una foto más nítida y de frente, o con una captura de pantalla.',
        unparsed: parsed.unparsed.slice(0, 40),
      });
    }

    const catalog = await getCatalog();
    let key = 0;
    const days = parsed.days.map((d) => ({
      label: d.label,
      exercises: d.exercises.map((ex) => {
        const out = { key: `ex${++key}`, ...ex, match: matchExercise(ex.detectedName, catalog) };
        out.reviewReasons = reviewReasons(out);
        out.needsReview = out.reviewReasons.length > 0;
        return out;
      }),
    }));

    res.json({
      name: parsed.name,
      days,
      unparsed: parsed.unparsed.slice(0, 60),
      stats: {
        exercises: exerciseCount,
        matched: days.reduce((s, d) => s + d.exercises.filter((e) => e.match.status === 'auto').length, 0),
        toReview: days.reduce((s, d) => s + d.exercises.filter((e) => e.needsReview).length, 0),
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/routines/import/exercises   body: { name, muscleGroup }
// Only on an explicit "Crear ejercicio" from the review screen; reuses an
// existing exercise with the same name instead of duplicating it.
exports.createExercise = async (req, res, next) => {
  try {
    const name = req.body.name.trim().replace(/\s+/g, ' ');
    const key = normKey(name);
    const existing = (await Exercise.find({}).select('name muscleGroup').lean()).find((e) => normKey(e.name) === key);
    if (existing) return res.json({ exercise: existing, existed: true });
    const exercise = await Exercise.create({
      name,
      muscleGroup: req.body.muscleGroup,
      equipment: 'other',
      difficulty: 'intermediate',
      category: 'hypertrophy',
      description: 'Añadido al importar una rutina desde imagen',
    });
    catalogCache = { at: 0, entries: null };
    res.status(201).json({ exercise: { _id: exercise._id, name: exercise.name, muscleGroup: exercise.muscleGroup }, existed: false });
  } catch (err) {
    next(err);
  }
};

exports.MUSCLE_GROUPS = MUSCLE_GROUPS;
