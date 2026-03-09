const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const Routine = require('../models/Routine');
const Exercise = require('../models/Exercise');

// Multer config — memory storage, max 5 MB, PDF only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  },
});

/**
 * Parse PDF text into a structured routine.
 * Expected PDF format:
 *   Nombre: Mi Rutina
 *   Descripción: ...
 *   Lunes - Pecho y Tríceps
 *     Press de Banca: 4x10 @90s
 *     Flexiones: 3x15 @60s
 *   Martes - Espalda
 *     ...
 */
function parsePdfText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let name = 'Rutina desde PDF';
  let description = '';
  const days = [];
  let currentDay = null;

  const dayPattern = /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s*[-–—:+]\s*(.+)/i;
  // Format: "Name: 4x10 @90s" or "Name: 4x10-12 @90s"
  const exercisePattern = /^(.+?):\s*(\d+)\s*[xX×]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:[@]\s*(\d+)\s*s?)?/;
  // Format: "- Name: 4x10" or "• Name: 4x10"
  const simpleExercisePattern = /^[-•]\s*(.+?):\s*(\d+)\s*[xX×]\s*(\d+)(?:\s*[-–]\s*(\d+))?/;
  // Format: "Name 4x10" or "Name 4 x 10" (no colon)
  const noColonPattern = /^(.+?)\s+(\d+)\s*[xX×]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:[@]\s*(\d+)\s*s?)?$/;
  // Format: just an exercise name on its own line (matched against DB later)
  const setsRepsPattern = /(\d+)\s*[xX×]\s*(\d+)/;

  for (const line of lines) {
    // Check for routine name
    if (/^nombre\s*:/i.test(line)) {
      name = line.replace(/^nombre\s*:\s*/i, '').trim();
      continue;
    }
    if (/^descripci[oó]n\s*:/i.test(line)) {
      description = line.replace(/^descripci[oó]n\s*:\s*/i, '').trim();
      continue;
    }

    // Check for day header
    const dayMatch = line.match(dayPattern);
    if (dayMatch) {
      currentDay = {
        dayLabel: `${dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1).toLowerCase()} — ${dayMatch[2].trim()}`,
        exercises: [],
      };
      days.push(currentDay);
      continue;
    }

    // Check for "Día X" format too (legacy support)
    const dayNumMatch = line.match(/^d[ií]a\s+(\d+)\s*[-–—:]\s*(.+)/i);
    if (dayNumMatch) {
      const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const idx = Math.min(parseInt(dayNumMatch[1]) - 1, 6);
      currentDay = {
        dayLabel: `${WEEKDAYS[idx]} — ${dayNumMatch[2].trim()}`,
        exercises: [],
      };
      days.push(currentDay);
      continue;
    }

    if (!currentDay) continue;

    // Try exercise patterns (most specific first)
    let exMatch = line.match(exercisePattern) || line.match(simpleExercisePattern);
    if (exMatch) {
      currentDay.exercises.push({
        name: exMatch[1].trim(),
        sets: parseInt(exMatch[2]),
        repsMin: parseInt(exMatch[3]),
        repsMax: exMatch[4] ? parseInt(exMatch[4]) : parseInt(exMatch[3]),
        restSeconds: exMatch[5] ? parseInt(exMatch[5]) : 90,
      });
      continue;
    }

    // Try "Name 4x10" without colon
    const noColonMatch = line.match(noColonPattern);
    if (noColonMatch) {
      currentDay.exercises.push({
        name: noColonMatch[1].trim(),
        sets: parseInt(noColonMatch[2]),
        repsMin: parseInt(noColonMatch[3]),
        repsMax: noColonMatch[4] ? parseInt(noColonMatch[4]) : parseInt(noColonMatch[3]),
        restSeconds: noColonMatch[5] ? parseInt(noColonMatch[5]) : 90,
      });
      continue;
    }

    // Line with sets x reps somewhere in it — extract name and numbers
    if (setsRepsPattern.test(line)) {
      const srMatch = line.match(setsRepsPattern);
      const namepart = line.substring(0, line.indexOf(srMatch[0])).replace(/[-•:]\s*$/, '').trim();
      if (namepart.length >= 3) {
        currentDay.exercises.push({
          name: namepart,
          sets: parseInt(srMatch[1]),
          repsMin: parseInt(srMatch[2]),
          repsMax: parseInt(srMatch[2]),
          restSeconds: 90,
        });
        continue;
      }
    }

    // Plain exercise name (no sets/reps) — add with defaults
    const cleaned = line.replace(/^[-•*·]\s*/, '').trim();
    if (cleaned.length >= 3 && !dayPattern.test(cleaned) && !/^\d+$/.test(cleaned)) {
      currentDay.exercises.push({
        name: cleaned,
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSeconds: 90,
      });
    }
  }

  // If no days found, create a single day with any exercises found
  if (days.length === 0 && lines.length > 0) {
    const singleDay = { dayLabel: 'Lunes — Entrenamiento', exercises: [] };
    for (const line of lines) {
      const exMatch = line.match(exercisePattern) || line.match(simpleExercisePattern);
      if (exMatch) {
        singleDay.exercises.push({
          name: exMatch[1].trim(),
          sets: parseInt(exMatch[2]),
          repsMin: parseInt(exMatch[3]),
          repsMax: exMatch[4] ? parseInt(exMatch[4]) : parseInt(exMatch[3]),
          restSeconds: exMatch[5] ? parseInt(exMatch[5]) : 90,
        });
      }
    }
    if (singleDay.exercises.length > 0) days.push(singleDay);
  }

  return { name, description, days };
}

// POST /api/routines/upload-pdf
exports.uploadMiddleware = upload.single('pdf');

exports.uploadPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se envió ningún archivo PDF' });
    }

    const parser = new PDFParse({ data: req.file.buffer });
    const pdfData = await parser.getText();
    const parsed = parsePdfText(pdfData.text);

    if (parsed.days.length === 0) {
      return res.status(422).json({
        message: 'No se pudieron extraer ejercicios del PDF. Revisa el formato.',
        hint: 'Asegúrate de que el PDF tenga días con formato: "Lunes - Pecho\\n  Press de Banca: 4x10 @90s"',
        extractedText: pdfData.text.substring(0, 500),
      });
    }

    // Match exercise names to database — auto-create missing ones
    const allExercises = await Exercise.find({});

    // Normalize: lowercase + strip accents
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const exerciseMap = {};
    allExercises.forEach((e) => {
      exerciseMap[norm(e.name)] = e;
    });

    // Guess muscle group from exercise name or day label context
    const MUSCLE_KEYWORDS = {
      chest: ['pecho', 'press de banca', 'aperturas', 'cruces', 'press inclinado', 'press declinado', 'flexiones'],
      back: ['espalda', 'remo', 'jalon', 'dominadas', 'dorsal', 'pulldown', 'pull'],
      shoulders: ['hombro', 'press militar', 'elevaciones laterales', 'elevaciones frontales', 'arnold', 'deltoides', 'face pull', 'pajaros'],
      biceps: ['bicep', 'curl con barra', 'curl martillo', 'curl concentrado', 'curl en polea'],
      triceps: ['tricep', 'press frances', 'extension de triceps', 'patada de triceps', 'fondos', 'kickback', 'rompecraneos'],
      legs: ['pierna', 'sentadilla', 'prensa', 'zancadas', 'lunges', 'cuadricep', 'femoral', 'extension', 'curl femoral', 'bulgara'],
      glutes: ['gluteo', 'hip thrust', 'puente de gluteos', 'patada de gluteo'],
      abs: ['abdominal', 'plancha', 'crunch', 'russian twist', 'elevacion de piernas', 'mountain'],
      calves: ['pantorrilla', 'gemelo'],
      forearms: ['antebrazo', 'muneca', 'farmer'],
      full_body: ['burpees', 'thrusters', 'clean', 'cuerpo completo', 'full body'],
      cardio: ['cardio', 'correr', 'bicicleta', 'saltar', 'jumping', 'salto'],
    };

    function guessMuscleGroup(exerciseName, dayLabel) {
      const combined = norm(exerciseName + ' ' + (dayLabel || ''));
      for (const [group, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
        for (const kw of keywords) {
          if (combined.includes(norm(kw))) return group;
        }
      }
      return 'full_body';
    }

    const created = [];
    const routineDays = [];

    for (const day of parsed.days) {
      const exercises = [];
      for (let i = 0; i < day.exercises.length; i++) {
        const pdfEx = day.exercises[i];
        const pdfName = norm(pdfEx.name);

        // 1. Exact match
        let dbEx = exerciseMap[pdfName];
        if (!dbEx) {
          // 2. Partial/substring match
          const key = Object.keys(exerciseMap).find((k) =>
            k.includes(pdfName) || pdfName.includes(k)
          );
          if (key) dbEx = exerciseMap[key];
        }
        if (!dbEx) {
          // 3. Word-overlap match
          const pdfWords = pdfName.split(/\s+/).filter((w) => w.length > 2);
          let bestScore = 0;
          let bestEx = null;
          for (const [k, ex] of Object.entries(exerciseMap)) {
            const dbWords = k.split(/\s+/).filter((w) => w.length > 2);
            const overlap = pdfWords.filter((w) => dbWords.some((d) => d.includes(w) || w.includes(d))).length;
            if (overlap > bestScore) {
              bestScore = overlap;
              bestEx = ex;
            }
          }
          if (bestScore >= 1 && pdfWords.length <= 3) dbEx = bestEx;
          if (bestScore >= 2) dbEx = bestEx;
        }

        // 4. Not found — create new exercise in catalog
        if (!dbEx) {
          const muscleGroup = guessMuscleGroup(pdfEx.name, day.dayLabel);
          dbEx = await Exercise.create({
            name: pdfEx.name,
            muscleGroup,
            difficulty: 'intermediate',
            equipment: 'other',
            category: 'hypertrophy',
            description: `Importado desde PDF`,
          });
          exerciseMap[norm(dbEx.name)] = dbEx;
          created.push(pdfEx.name);
        }

        exercises.push({
          exercise: dbEx._id,
          order: i,
          sets: pdfEx.sets,
          repsMin: pdfEx.repsMin,
          repsMax: pdfEx.repsMax,
          restSeconds: pdfEx.restSeconds,
          notes: '',
        });
      }
      routineDays.push({ dayLabel: day.dayLabel, exercises });
    }

    // Log for debugging
    const totalParsedExercises = parsed.days.reduce((s, d) => s + d.exercises.length, 0);
    const totalMatchedExercises = routineDays.reduce((s, d) => s + d.exercises.length, 0);
    console.log(`[PDF Upload] Days: ${parsed.days.length}, Parsed: ${totalParsedExercises}, Matched: ${totalMatchedExercises}, Created: ${created.length}`);
    if (created.length > 0) console.log('[PDF Upload] Nuevos ejercicios creados:', created);

    const routine = await Routine.create({
      user: req.user._id,
      name: parsed.name,
      description: parsed.description || 'Importada desde PDF',
      days: routineDays,
      exercises: [],
    });

    await routine.populate('days.exercises.exercise');

    res.status(201).json({
      routine,
      created: created.length > 0 ? created : undefined,
      message: created.length > 0
        ? `Rutina importada. ${created.length} ejercicio(s) nuevos agregados al catálogo: ${created.join(', ')}`
        : 'Rutina importada exitosamente desde PDF',
    });
  } catch (err) {
    if (err.message === 'Solo se permiten archivos PDF') {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};
