const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const Routine = require("../models/Routine");
const Exercise = require("../models/Exercise");
const { normalizeExerciseName } = require("../utils/exerciseName");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Solo se permiten archivos PDF"));
  },
});

function parsePdfText(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let name = "Rutina desde PDF";
  let description = "";
  const days = [];
  const issues = [];
  let currentDay = null;

  const dayPattern =
    /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s*[-–—:+]\s*(.+)$/i;
  const numberedDayPattern = /^d[ií]a\s+(\d+)\s*[-–—:]\s*(.+)$/i;
  const exercisePattern =
    /^[-•*]?\s*(.+?):\s*(\d+)\s*[xX×]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:@\s*(\d+)\s*s?)?$/;
  const weekDays = [
    "Lunes",
    "Martes",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sabado",
    "Domingo",
  ];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^nombre\s*:/i.test(line)) {
      name = line.replace(/^nombre\s*:\s*/i, "").trim() || name;
      continue;
    }

    if (/^descripci[oó]n\s*:/i.test(line)) {
      description = line.replace(/^descripci[oó]n\s*:\s*/i, "").trim();
      continue;
    }

    const dayMatch = line.match(dayPattern);
    if (dayMatch) {
      currentDay = {
        dayLabel: `${dayMatch[1].charAt(0).toUpperCase()}${dayMatch[1].slice(1).toLowerCase()} - ${dayMatch[2].trim()}`,
        exercises: [],
      };
      days.push(currentDay);
      continue;
    }

    const numberedDayMatch = line.match(numberedDayPattern);
    if (numberedDayMatch) {
      const dayIndex = Math.max(
        0,
        Math.min(Number(numberedDayMatch[1]) - 1, weekDays.length - 1),
      );
      currentDay = {
        dayLabel: `${weekDays[dayIndex]} - ${numberedDayMatch[2].trim()}`,
        exercises: [],
      };
      days.push(currentDay);
      continue;
    }

    if (!currentDay) {
      issues.push({
        type: "line_outside_day",
        line: index + 1,
        content: line,
        message: "Hay una linea fuera de un encabezado de dia valido.",
      });
      continue;
    }

    const exerciseMatch = line.match(exercisePattern);
    if (!exerciseMatch) {
      issues.push({
        type: "invalid_exercise_format",
        line: index + 1,
        content: line,
        message: 'La linea no cumple el formato "Ejercicio: 4x10 @90s".',
      });
      continue;
    }

    currentDay.exercises.push({
      name: exerciseMatch[1].trim(),
      sets: parseInt(exerciseMatch[2], 10),
      repsMin: parseInt(exerciseMatch[3], 10),
      repsMax: exerciseMatch[4]
        ? parseInt(exerciseMatch[4], 10)
        : parseInt(exerciseMatch[3], 10),
      restSeconds: exerciseMatch[5] ? parseInt(exerciseMatch[5], 10) : 90,
    });
  }

  if (!days.length) {
    issues.push({
      type: "no_days_detected",
      message: "No se detectaron dias validos en el PDF.",
    });
  }

  for (const day of days) {
    if (!day.exercises.length) {
      issues.push({
        type: "day_without_exercises",
        dayLabel: day.dayLabel,
        message: `El bloque "${day.dayLabel}" no contiene ejercicios validos.`,
      });
    }
  }

  return { name, description, days, issues };
}

function findExerciseSuggestions(allExercises, normalizedName) {
  return allExercises
    .filter((candidate) => {
      const normalizedCandidate = normalizeExerciseName(candidate.name);
      return (
        normalizedCandidate.includes(normalizedName)
        || normalizedName.includes(normalizedCandidate)
      );
    })
    .slice(0, 5)
    .map((candidate) => candidate.name);
}

exports.uploadMiddleware = upload.single("pdf");

exports.uploadPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se envio ningun archivo PDF" });
    }

    const parser = new PDFParse({ data: req.file.buffer });
    const pdfData = await parser.getText();
    const parsed = parsePdfText(pdfData.text);

    if (parsed.issues.length > 0) {
      return res.status(422).json({
        message: "El PDF no cumple el formato exigido para importar rutinas.",
        hint: 'Usa encabezados tipo "Lunes - Pecho" y ejercicios tipo "Press de Banca: 4x10 @90s".',
        issues: parsed.issues,
        extractedText: String(pdfData.text || "").substring(0, 700),
      });
    }

    const allExercises = await Exercise.find({}).select("name");
    const exerciseMap = new Map();
    allExercises.forEach((exercise) => {
      exerciseMap.set(normalizeExerciseName(exercise.name), exercise);
    });

    const missingExercises = [];
    const routineDays = [];

    for (const day of parsed.days) {
      const mappedExercises = [];
      for (let idx = 0; idx < day.exercises.length; idx += 1) {
        const pdfExercise = day.exercises[idx];
        const normalizedName = normalizeExerciseName(pdfExercise.name);
        const dbExercise = exerciseMap.get(normalizedName);

        if (!dbExercise) {
          missingExercises.push({
            day: day.dayLabel,
            exercise: pdfExercise.name,
            suggestions: findExerciseSuggestions(allExercises, normalizedName),
          });
          continue;
        }

        mappedExercises.push({
          exercise: dbExercise._id,
          order: idx,
          sets: pdfExercise.sets,
          repsMin: pdfExercise.repsMin,
          repsMax: pdfExercise.repsMax,
          restSeconds: pdfExercise.restSeconds,
          notes: "",
        });
      }

      routineDays.push({
        dayLabel: day.dayLabel,
        exercises: mappedExercises,
      });
    }

    if (missingExercises.length > 0) {
      return res.status(422).json({
        message: "El PDF contiene ejercicios que no existen en el catalogo.",
        hint: "Corrige los nombres para que coincidan con el catalogo antes de importar.",
        missingExercises,
      });
    }

    const routine = await Routine.create({
      user: req.user._id,
      name: parsed.name,
      description: parsed.description || "Importada desde PDF",
      days: routineDays,
      exercises: [],
    });

    await routine.populate("days.exercises.exercise");

    res.status(201).json({
      routine,
      message: "Rutina importada exitosamente desde PDF",
    });
  } catch (err) {
    if (err.message === "Solo se permiten archivos PDF") {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};
