/**
 * AI Recommendation Service – 3-tier engine
 *
 * Tier 1 – RULES:   Simple business-rule matching (goal → exercise filters).
 * Tier 2 – SCORING: Personalised scoring using profile, history & muscle gaps.
 * Tier 3 – LLM:     Optional integration with OpenAI for natural-language plans.
 *
 * Each tier returns: { title, body, exercises[], engine }
 */

const Exercise = require("../models/Exercise");
const WorkoutLog = require("../models/WorkoutLog");
const Goal = require("../models/Goal");
const AIRecommendation = require("../models/AIRecommendation");

// ─────────────────────────────────────────────
//  TIER 1 – Rule-based
// ─────────────────────────────────────────────
const goalToFilter = {
  muscle_gain: {
    category: "hypertrophy",
    difficulty: ["intermediate", "advanced"],
  },
  fat_loss: { category: "endurance", difficulty: ["beginner", "intermediate"] },
  endurance: {
    category: "endurance",
    difficulty: ["beginner", "intermediate"],
  },
  toning: { category: "hypertrophy", difficulty: ["beginner", "intermediate"] },
  strength: { category: "strength", difficulty: ["intermediate", "advanced"] },
};

async function ruleBasedRecommend(user) {
  const activeGoal = await Goal.findOne({
    user: user._id,
    isActive: true,
  }).sort("-createdAt");
  const goalType = activeGoal?.type || "muscle_gain";
  const mapping = goalToFilter[goalType] || goalToFilter.muscle_gain;

  const exercises = await Exercise.find({
    category: mapping.category,
    difficulty: { $in: mapping.difficulty },
  }).limit(8);

  return {
    engine: "rules",
    title: `Exercises for "${goalType.replace("_", " ")}"`,
    body: `Based on your active goal we selected ${exercises.length} exercises matching ${mapping.category} training.`,
    exercises,
  };
}

// ─────────────────────────────────────────────
//  TIER 2 – Scoring engine
// ─────────────────────────────────────────────
async function scoringRecommend(user) {
  const activeGoal = await Goal.findOne({
    user: user._id,
    isActive: true,
  }).sort("-createdAt");
  const goalType = activeGoal?.type || "muscle_gain";

  // Fetch last 4 weeks of workouts to find muscle-group gaps
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const recentLogs = await WorkoutLog.find({
    user: user._id,
    date: { $gte: fourWeeksAgo },
  }).populate("exercises.exercise", "muscleGroup");

  // Count muscle-group frequency
  const mgCount = {};
  recentLogs.forEach((log) =>
    log.exercises.forEach((e) => {
      const mg = e.exercise?.muscleGroup;
      if (mg) mgCount[mg] = (mgCount[mg] || 0) + 1;
    }),
  );

  // Least-trained groups get priority
  const allGroups = [
    "chest",
    "back",
    "shoulders",
    "legs",
    "biceps",
    "triceps",
    "abs",
    "glutes",
  ];
  const sorted = allGroups.sort(
    (a, b) => (mgCount[a] || 0) - (mgCount[b] || 0),
  );
  const priorityGroups = sorted.slice(0, 3);

  // Score each candidate exercise
  const mapping = goalToFilter[goalType] || goalToFilter.muscle_gain;
  const candidates = await Exercise.find({
    category: mapping.category,
    difficulty: { $in: [user.level || "intermediate", ...mapping.difficulty] },
  });

  const scored = candidates.map((ex) => {
    let score = 0;
    // +3 if muscle group is under-trained
    if (priorityGroups.includes(ex.muscleGroup)) score += 3;
    // +2 if difficulty matches user level
    if (ex.difficulty === (user.level || "intermediate")) score += 2;
    // +1 if equipment matches preferences
    if (user.preferences?.equipment?.includes(ex.equipment)) score += 1;
    return { exercise: ex, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 8);

  return {
    engine: "scoring",
    title: `Personalised picks for "${goalType.replace("_", " ")}"`,
    body: `Prioritising under-trained muscle groups: ${priorityGroups.join(", ")}. Exercises scored by goal alignment, level match & equipment preferences.`,
    exercises: top.map((t) => t.exercise),
    _scores: top.map((t) => ({ name: t.exercise.name, score: t.score })),
  };
}

// ─────────────────────────────────────────────
//  TIER 3 – LLM-powered (Google Gemini)
// ─────────────────────────────────────────────
const { GoogleGenerativeAI } = require("@google/generative-ai");

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

async function llmRecommend(user) {
  const model = getGeminiModel();
  if (!model) {
    const fallback = await scoringRecommend(user);
    fallback.engine = "scoring";
    fallback.body += " (Gemini no disponible – se usó el motor de puntuación.)";
    return fallback;
  }

  const activeGoal = await Goal.findOne({
    user: user._id,
    isActive: true,
  }).sort("-createdAt");

  const prompt = `Eres un entrenador personal certificado con IA.
Dado un usuario con estos atributos:
- Nivel: ${user.level || "intermedio"}
- Objetivo: ${activeGoal?.type || "fitness general"}
- Frecuencia semanal: ${user.weeklyFrequency || 3} días
- Tiempo disponible por sesión: ${user.availableMinutes || 60} min
- Equipamiento: ${user.preferences?.equipment?.join(", ") || "cualquiera"}
- Grupos musculares prioritarios: ${user.preferences?.focusMuscleGroups?.join(", ") || "todos"}

Genera una rutina de entrenamiento semanal concisa en formato JSON (un array de objetos con campos: day, exerciseName, sets, reps, restSeconds, notes). Responde SOLO con JSON válido, sin markdown ni texto adicional.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Extract JSON from response (strip markdown code fences if present)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    let plan;
    try {
      plan = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      plan = text;
    }

    return {
      engine: "llm",
      title: "Plan Semanal Generado por IA",
      body: typeof plan === "string" ? plan : JSON.stringify(plan, null, 2),
      exercises: [],
    };
  } catch (err) {
    const fallback = await scoringRecommend(user);
    fallback.body += ` (Error de Gemini: ${err.message} – se usó puntuación.)`;
    return fallback;
  }
}

// ─────────────────────────────────────────────
//  Generate full routine with Gemini
// ─────────────────────────────────────────────
const Routine = require("../models/Routine");

// ── Local fallback routine generator (multi-day) ──

// Day splits by weekly frequency
<<<<<<< HEAD
const WEEKDAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const DAY_SPLITS = {
  1: [{ label: "Full Body", muscles: ["chest", "back", "shoulders", "legs", "biceps", "triceps", "abs", "glutes"] }],
  2: [
    { label: "Tren Superior", muscles: ["chest", "back", "shoulders", "biceps", "triceps"] },
=======
const WEEKDAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const DAY_SPLITS = {
  1: [
    {
      label: "Full Body",
      muscles: [
        "chest",
        "back",
        "shoulders",
        "legs",
        "biceps",
        "triceps",
        "abs",
        "glutes",
      ],
    },
  ],
  2: [
    {
      label: "Tren Superior",
      muscles: ["chest", "back", "shoulders", "biceps", "triceps"],
    },
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
    { label: "Tren Inferior", muscles: ["legs", "glutes", "abs"] },
  ],
  3: [
    { label: "Empuje (Push)", muscles: ["chest", "shoulders", "triceps"] },
    { label: "Tirón (Pull)", muscles: ["back", "biceps"] },
    { label: "Piernas", muscles: ["legs", "glutes", "abs"] },
  ],
  4: [
    { label: "Tren Superior A", muscles: ["chest", "back", "shoulders"] },
    { label: "Tren Inferior A", muscles: ["legs", "glutes"] },
    { label: "Tren Superior B", muscles: ["biceps", "triceps", "shoulders"] },
    { label: "Tren Inferior B + Core", muscles: ["legs", "glutes", "abs"] },
  ],
  5: [
    { label: "Pecho y Tríceps", muscles: ["chest", "triceps"] },
    { label: "Espalda y Bíceps", muscles: ["back", "biceps"] },
    { label: "Hombros y Abs", muscles: ["shoulders", "abs"] },
    { label: "Piernas y Glúteos", muscles: ["legs", "glutes"] },
<<<<<<< HEAD
    { label: "Full Body", muscles: ["chest", "back", "shoulders", "legs", "abs"] },
=======
    {
      label: "Full Body",
      muscles: ["chest", "back", "shoulders", "legs", "abs"],
    },
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
  ],
  6: [
    { label: "Empuje A", muscles: ["chest", "shoulders", "triceps"] },
    { label: "Tirón A", muscles: ["back", "biceps"] },
    { label: "Piernas A", muscles: ["legs", "glutes", "abs"] },
    { label: "Empuje B", muscles: ["chest", "shoulders", "triceps"] },
    { label: "Tirón B", muscles: ["back", "biceps"] },
    { label: "Piernas B", muscles: ["legs", "glutes", "abs"] },
  ],
  7: [
    { label: "Pecho", muscles: ["chest"] },
    { label: "Espalda", muscles: ["back"] },
    { label: "Hombros", muscles: ["shoulders"] },
    { label: "Piernas", muscles: ["legs", "glutes"] },
    { label: "Bíceps y Tríceps", muscles: ["biceps", "triceps"] },
    { label: "Abdominales y Glúteos", muscles: ["abs", "glutes"] },
    { label: "Full Body", muscles: ["chest", "back", "shoulders", "legs"] },
  ],
};

function buildLocalRoutine(allExercises, opts) {
<<<<<<< HEAD
  const {
    level, goalType, frequency, minutes, equipment, focusMuscleGroups,
  } = opts;

  // Goal → training config
  const goalConfig = {
    muscle_gain:  { sets: 4, repsMin: 8,  repsMax: 12, rest: 90,  category: "hypertrophy", exerciseCount: 6 },
    fat_loss:     { sets: 3, repsMin: 12, repsMax: 15, rest: 45,  category: "endurance",    exerciseCount: 7 },
    endurance:    { sets: 3, repsMin: 15, repsMax: 20, rest: 30,  category: "endurance",    exerciseCount: 7 },
    toning:       { sets: 3, repsMin: 12, repsMax: 15, rest: 60,  category: "hypertrophy",  exerciseCount: 6 },
    strength:     { sets: 5, repsMin: 3,  repsMax: 6,  rest: 180, category: "strength",     exerciseCount: 5 },
    general:      { sets: 3, repsMin: 10, repsMax: 12, rest: 60,  category: "hypertrophy",  exerciseCount: 6 },
=======
  const { level, goalType, frequency, minutes, equipment, focusMuscleGroups } =
    opts;

  // Goal → training config
  const goalConfig = {
    muscle_gain: {
      sets: 4,
      repsMin: 8,
      repsMax: 12,
      rest: 90,
      category: "hypertrophy",
      exerciseCount: 6,
    },
    fat_loss: {
      sets: 3,
      repsMin: 12,
      repsMax: 15,
      rest: 45,
      category: "endurance",
      exerciseCount: 7,
    },
    endurance: {
      sets: 3,
      repsMin: 15,
      repsMax: 20,
      rest: 30,
      category: "endurance",
      exerciseCount: 7,
    },
    toning: {
      sets: 3,
      repsMin: 12,
      repsMax: 15,
      rest: 60,
      category: "hypertrophy",
      exerciseCount: 6,
    },
    strength: {
      sets: 5,
      repsMin: 3,
      repsMax: 6,
      rest: 180,
      category: "strength",
      exerciseCount: 5,
    },
    general: {
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      rest: 60,
      category: "hypertrophy",
      exerciseCount: 6,
    },
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
  };
  const cfg = { ...(goalConfig[goalType] || goalConfig.general) };

  // Adjust exercise count based on available time
<<<<<<< HEAD
  const estimatedTimePerExercise = (cfg.sets * 0.75 + cfg.rest * cfg.sets / 60);
  let targetCountPerDay = Math.min(cfg.exerciseCount, Math.floor(minutes / estimatedTimePerExercise) || 4);
=======
  const estimatedTimePerExercise = cfg.sets * 0.75 + (cfg.rest * cfg.sets) / 60;
  let targetCountPerDay = Math.min(
    cfg.exerciseCount,
    Math.floor(minutes / estimatedTimePerExercise) || 4,
  );
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
  targetCountPerDay = Math.max(3, Math.min(targetCountPerDay, 10));

  // Level adjustments
  if (level === "beginner") {
    cfg.sets = Math.max(2, cfg.sets - 1);
    cfg.rest = Math.min(cfg.rest + 30, 180);
  } else if (level === "advanced") {
    cfg.sets = Math.min(cfg.sets + 1, 6);
  }

  // Filter exercises by equipment
  let pool = [...allExercises];
  if (equipment.length > 0) {
    const eqSet = new Set(equipment.map((e) => e.toLowerCase()));
    const filtered = pool.filter((ex) => {
      const exEquip = (ex.equipment || "").toLowerCase();
<<<<<<< HEAD
      return eqSet.has(exEquip) || exEquip === "bodyweight" || exEquip === "ninguno" || exEquip === "";
=======
      return (
        eqSet.has(exEquip) ||
        exEquip === "bodyweight" ||
        exEquip === "ninguno" ||
        exEquip === ""
      );
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
    });
    if (filtered.length >= targetCountPerDay) pool = filtered;
  }

  const goalLabels = {
<<<<<<< HEAD
    muscle_gain: "ganancia muscular", fat_loss: "pérdida de grasa",
    endurance: "resistencia", toning: "tonificación",
    strength: "fuerza", general: "fitness general",
  };
  const goalLabel = goalLabels[goalType] || goalType;
  const levelLabel = level === "beginner" ? "Principiante" : level === "intermediate" ? "Intermedio" : "Avanzado";

  const compoundKeywords = ["press", "sentadilla", "peso muerto", "dominadas", "fondos", "remo", "clean", "thruster", "burpee"];
=======
    muscle_gain: "ganancia muscular",
    fat_loss: "pérdida de grasa",
    endurance: "resistencia",
    toning: "tonificación",
    strength: "fuerza",
    general: "fitness general",
  };
  const goalLabel = goalLabels[goalType] || goalType;
  const levelLabel =
    level === "beginner"
      ? "Principiante"
      : level === "intermediate"
        ? "Intermedio"
        : "Avanzado";

  const compoundKeywords = [
    "press",
    "sentadilla",
    "peso muerto",
    "dominadas",
    "fondos",
    "remo",
    "clean",
    "thruster",
    "burpee",
  ];
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
  const split = DAY_SPLITS[Math.min(Math.max(frequency, 1), 7)];

  // Track globally used exercises to diversify across days
  const globalUsedIds = new Set();

  const days = split.map((dayDef, dayIdx) => {
    // Merge day muscles with focus groups
    let dayMuscles = [...dayDef.muscles];
    if (focusMuscleGroups.length > 0) {
      // Add focus muscles to each day that has overlap, prioritize them
      const overlap = focusMuscleGroups.filter((m) => dayMuscles.includes(m));
<<<<<<< HEAD
      if (overlap.length > 0) dayMuscles = [...overlap, ...dayMuscles.filter((m) => !overlap.includes(m))];
=======
      if (overlap.length > 0)
        dayMuscles = [
          ...overlap,
          ...dayMuscles.filter((m) => !overlap.includes(m)),
        ];
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
    }

    const selected = [];
    const dayUsedIds = new Set();

    // Pick exercises for this day's muscle groups
    for (const mg of dayMuscles) {
      if (selected.length >= targetCountPerDay) break;
      const candidates = pool.filter(
<<<<<<< HEAD
        (e) => e.muscleGroup === mg && !dayUsedIds.has(e._id.toString()) && !globalUsedIds.has(e._id.toString()),
=======
        (e) =>
          e.muscleGroup === mg &&
          !dayUsedIds.has(e._id.toString()) &&
          !globalUsedIds.has(e._id.toString()),
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
      );
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        selected.push(pick);
        dayUsedIds.add(pick._id.toString());
        globalUsedIds.add(pick._id.toString());
      }
    }

    // Round 2: if short, pick more from day muscles (allow globally used)
    for (const mg of dayMuscles) {
      if (selected.length >= targetCountPerDay) break;
      const candidates = pool.filter(
        (e) => e.muscleGroup === mg && !dayUsedIds.has(e._id.toString()),
      );
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        selected.push(pick);
        dayUsedIds.add(pick._id.toString());
      }
    }

    // Round 3: fill remaining with anything
    while (selected.length < targetCountPerDay) {
      const candidates = pool.filter((e) => !dayUsedIds.has(e._id.toString()));
      if (candidates.length === 0) break;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push(pick);
      dayUsedIds.add(pick._id.toString());
    }

    // Compound exercises first
    selected.sort((a, b) => {
<<<<<<< HEAD
      const aCompound = compoundKeywords.some((k) => a.name.toLowerCase().includes(k)) ? 0 : 1;
      const bCompound = compoundKeywords.some((k) => b.name.toLowerCase().includes(k)) ? 0 : 1;
=======
      const aCompound = compoundKeywords.some((k) =>
        a.name.toLowerCase().includes(k),
      )
        ? 0
        : 1;
      const bCompound = compoundKeywords.some((k) =>
        b.name.toLowerCase().includes(k),
      )
        ? 0
        : 1;
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
      return aCompound - bCompound;
    });

    return {
      dayLabel: `${WEEKDAY_NAMES[dayIdx]} — ${dayDef.label}`,
      exercises: selected.map((ex, i) => ({
        exercise: ex._id,
        order: i,
        sets: cfg.sets,
        repsMin: cfg.repsMin,
        repsMax: cfg.repsMax,
        restSeconds: cfg.rest,
        notes: `${ex.muscleGroup} — ${ex.difficulty || level}`,
      })),
    };
  });

<<<<<<< HEAD
  const allUsedMuscles = [...new Set(days.flatMap((d) => d.exercises.map((e) => {
    const ex = allExercises.find((ae) => ae._id.toString() === e.exercise.toString());
    return ex?.muscleGroup;
  }).filter(Boolean)))];
=======
  const allUsedMuscles = [
    ...new Set(
      days.flatMap((d) =>
        d.exercises
          .map((e) => {
            const ex = allExercises.find(
              (ae) => ae._id.toString() === e.exercise.toString(),
            );
            return ex?.muscleGroup;
          })
          .filter(Boolean),
      ),
    ),
  ];
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))

  const totalExercises = days.reduce((s, d) => s + d.exercises.length, 0);

  return {
    name: `Rutina de ${goalLabel} — ${levelLabel} (${frequency} días)`,
    description: `Plan de ${frequency} días para ${goalLabel}. ${totalExercises} ejercicios distribuidos, ${cfg.sets} series, descanso de ${cfg.rest}s. Generada por el motor de recomendaciones.`,
    targetMuscleGroups: allUsedMuscles,
    days,
    exercises: [],
  };
}

async function generateRoutineWithAI(user, overrides = {}) {
  const activeGoal = await Goal.findOne({
    user: user._id,
    isActive: true,
  }).sort("-createdAt");
  const allExercises = await Exercise.find({});
  const exerciseNames = allExercises.map((e) => e.name);

  // Use form overrides or fall back to user profile / active goal
  const level = overrides.level || user.level || "intermediate";
  const goalType = overrides.goalType || activeGoal?.type || "general";
  const goalDescription =
    overrides.goalDescription || activeGoal?.description || "";
  const frequency = overrides.weeklyFrequency || user.weeklyFrequency || 3;
  const minutes = overrides.availableMinutes || user.availableMinutes || 60;
  const equipment = overrides.equipment?.length
    ? overrides.equipment
    : user.preferences?.equipment || [];
  const focusMuscleGroups = overrides.focusMuscleGroups?.length
    ? overrides.focusMuscleGroups
    : user.preferences?.focusMuscleGroups || [];
  const customNotes = overrides.customNotes || "";
  const height = overrides.height || user.height || null;
  const weight = overrides.weight || user.weight || null;

  const goalLabels = {
    muscle_gain: "ganancia muscular",
    fat_loss: "pérdida de grasa",
    endurance: "resistencia",
    toning: "tonificación",
    strength: "fuerza",
    general: "fitness general",
  };

  const prompt = `Eres un entrenador personal certificado experto en programación de entrenamiento.

INFORMACIÓN DEL USUARIO:
- Nivel: ${level}
- Objetivo: ${goalLabels[goalType] || goalType}${goalDescription ? ` (${goalDescription})` : ""}
- Frecuencia semanal: ${frequency} días
- Tiempo disponible por sesión: ${minutes} minutos
- Equipamiento disponible: ${equipment.length ? equipment.join(", ") : "todo el equipamiento"}
- Grupos musculares prioritarios: ${focusMuscleGroups.length ? focusMuscleGroups.join(", ") : "todos"}${height ? `\n- Altura: ${height} cm` : ""}${weight ? `\n- Peso: ${weight} kg` : ""}${customNotes ? `\n- Instrucciones adicionales del usuario: ${customNotes}` : ""}

EJERCICIOS DISPONIBLES EN LA BASE DE DATOS (usa EXACTAMENTE estos nombres):
${exerciseNames.join(", ")}

INSTRUCCIONES:
1. Crea una rutina de entrenamiento de ${frequency} días por semana.
2. Distribuye los ejercicios de forma inteligente por día (ej: Push/Pull/Legs, Upper/Lower, etc.).
3. Usa SOLO ejercicios de la lista proporcionada (nombres exactos).
4. Adapta sets, reps y descanso al objetivo y nivel del usuario.
5. El tiempo de cada sesión debe ajustarse a ${minutes} minutos.
6. Cada día debe usar el nombre del día de la semana (ej: "Lunes — Pecho y Tríceps", "Martes — Espalda y Bíceps").

Responde SOLO con un JSON válido con esta estructura exacta (sin markdown):
{
  "name": "nombre descriptivo de la rutina",
  "description": "breve descripción de la rutina y su enfoque",
  "targetMuscleGroups": ["grupo1", "grupo2"],
  "days": [
    {
      "dayLabel": "Lunes — Nombre descriptivo",
      "exercises": [
        {
          "exerciseName": "nombre exacto del ejercicio",
          "sets": 3,
          "repsMin": 8,
          "repsMax": 12,
          "restSeconds": 90,
          "notes": "nota o consejo breve"
        }
      ]
    }
  ]
}`;

  // ── Try Gemini first, fallback to local generator ──
  let routineData; // { name, description, targetMuscleGroups, days[] }
  let usedEngine = "llm";
  let unmatchedExercises = [];

  const model = getGeminiModel();
  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Formato inválido");

      const aiPlan = JSON.parse(jsonMatch[0]);

      // Map exercise names to database ObjectIds
      const exerciseMap = {};
<<<<<<< HEAD
      allExercises.forEach((e) => { exerciseMap[e.name.toLowerCase()] = e; });
=======
      allExercises.forEach((e) => {
        exerciseMap[e.name.toLowerCase()] = e;
      });
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))

      // Parse multi-day structure from Gemini
      const days = (aiPlan.days || []).map((aiDay) => {
        const routineExercises = [];
        (aiDay.exercises || []).forEach((aiEx, index) => {
          const dbExercise = exerciseMap[aiEx.exerciseName?.toLowerCase()];
          if (dbExercise) {
            routineExercises.push({
              exercise: dbExercise._id,
              order: index,
              sets: aiEx.sets || 3,
              repsMin: aiEx.repsMin || 8,
              repsMax: aiEx.repsMax || 12,
              restSeconds: aiEx.restSeconds || 90,
              notes: aiEx.notes || "",
            });
          } else {
            unmatchedExercises.push(aiEx.exerciseName);
          }
        });
        return {
          dayLabel: aiDay.dayLabel || "Día",
          exercises: routineExercises,
        };
      });

      // Fallback: if Gemini returned flat exercises (old format), wrap in single day
      if (days.length === 0 && aiPlan.exercises?.length > 0) {
        const routineExercises = [];
        aiPlan.exercises.forEach((aiEx, index) => {
          const dbExercise = exerciseMap[aiEx.exerciseName?.toLowerCase()];
          if (dbExercise) {
            routineExercises.push({
              exercise: dbExercise._id,
              order: index,
              sets: aiEx.sets || 3,
              repsMin: aiEx.repsMin || 8,
              repsMax: aiEx.repsMax || 12,
              restSeconds: aiEx.restSeconds || 90,
              notes: aiEx.notes || "",
            });
          } else {
            unmatchedExercises.push(aiEx.exerciseName);
          }
        });
        if (routineExercises.length > 0) {
<<<<<<< HEAD
          days.push({ dayLabel: "Día 1 — Full Body", exercises: routineExercises });
=======
          days.push({
            dayLabel: "Día 1 — Full Body",
            exercises: routineExercises,
          });
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
        }
      }

      const totalMapped = days.reduce((s, d) => s + d.exercises.length, 0);
      if (totalMapped === 0) throw new Error("No exercises mapped");

      routineData = {
        name: aiPlan.name || "Rutina IA",
<<<<<<< HEAD
        description: aiPlan.description || "Rutina generada por inteligencia artificial",
=======
        description:
          aiPlan.description || "Rutina generada por inteligencia artificial",
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
        targetMuscleGroups: aiPlan.targetMuscleGroups || [],
        days,
        exercises: [],
      };
    } catch (geminiErr) {
<<<<<<< HEAD
      console.log("⚠️ Gemini falló, usando generador local:", geminiErr.message);
      usedEngine = "scoring";
      routineData = buildLocalRoutine(allExercises, {
        level, goalType, frequency, minutes, equipment, focusMuscleGroups,
=======
      console.log(
        "⚠️ Gemini falló, usando generador local:",
        geminiErr.message,
      );
      usedEngine = "scoring";
      routineData = buildLocalRoutine(allExercises, {
        level,
        goalType,
        frequency,
        minutes,
        equipment,
        focusMuscleGroups,
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
      });
    }
  } else {
    // No API key — use local generator
    usedEngine = "scoring";
    routineData = buildLocalRoutine(allExercises, {
<<<<<<< HEAD
      level, goalType, frequency, minutes, equipment, focusMuscleGroups,
    });
  }

  // Create the routine in the database
=======
      level,
      goalType,
      frequency,
      minutes,
      equipment,
      focusMuscleGroups,
    });
  }

  // Populate exercise details for the preview
  const exerciseMap = {};
  allExercises.forEach((e) => {
    exerciseMap[e._id.toString()] = e;
  });

  const populatedDays = routineData.days.map((d) => ({
    dayLabel: d.dayLabel,
    exercises: d.exercises.map((ex) => ({
      ...ex,
      exercise: exerciseMap[ex.exercise.toString()] || {
        _id: ex.exercise,
        name: "Ejercicio",
      },
    })),
  }));

  return {
    preview: {
      name: routineData.name,
      description: routineData.description,
      targetMuscleGroups: routineData.targetMuscleGroups,
      goal: goalType,
      days: populatedDays,
    },
    _routineData: routineData,
    _goalType: goalType,
    unmatchedExercises,
    engine: usedEngine,
  };
}

/**
 * Save a previously previewed AI routine to the database.
 */
async function saveAIRoutine(user, { routineData, goalType, engine }) {
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
  const routine = await Routine.create({
    user: user._id,
    name: routineData.name,
    description: routineData.description,
    targetMuscleGroups: routineData.targetMuscleGroups,
    goal: goalType,
    days: routineData.days,
    exercises: [],
    isAIGenerated: true,
  });

  await routine.populate(
    "days.exercises.exercise",
    "name muscleGroup equipment youtubeVideoId",
  );

<<<<<<< HEAD
  // Collect all exercise IDs for the recommendation record
  const allExerciseIds = routineData.days.flatMap((d) => d.exercises.map((e) => e.exercise));

  // Save AI recommendation record
  const rec = await AIRecommendation.create({
    user: user._id,
    type: "routine",
    engine: usedEngine,
=======
  const allExerciseIds = routineData.days.flatMap((d) =>
    d.exercises.map((e) => e.exercise),
  );

  const rec = await AIRecommendation.create({
    user: user._id,
    type: "routine",
    engine: engine,
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
    title: routine.name,
    body: routine.description,
    exercises: allExerciseIds,
    routine: routine._id,
  });

  return {
    routine,
    recommendationId: rec._id,
<<<<<<< HEAD
    unmatchedExercises,
    engine: usedEngine,
=======
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
  };
}

// ─────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────
/**
 * @param {'rules'|'scoring'|'llm'} tier
 */
async function recommend(user, tier = "scoring") {
  let result;
  switch (tier) {
    case "rules":
      result = await ruleBasedRecommend(user);
      break;
    case "llm":
      result = await llmRecommend(user);
      break;
    case "scoring":
    default:
      result = await scoringRecommend(user);
  }

  // Persist recommendation
  const rec = await AIRecommendation.create({
    user: user._id,
    type: tier === "llm" ? "routine" : "exercise",
    engine: result.engine,
    title: result.title,
    body: result.body,
    exercises: result.exercises.map((e) => e._id).filter(Boolean),
  });

  return { ...result, recommendationId: rec._id };
}

<<<<<<< HEAD
module.exports = {
  recommend,
  generateRoutineWithAI,
  saveAIRoutine,
  aiExerciseRecommend,
};
=======
// ─────────────────────────────────────────────
//  AI Exercise Recommender (free-text query)
// ─────────────────────────────────────────────
async function aiExerciseRecommend(user, userQuery) {
  const allExercises = await Exercise.find({});
  const exerciseCatalog = allExercises.map((e) => ({
    name: e.name,
    muscleGroup: e.muscleGroup,
    difficulty: e.difficulty,
    equipment: e.equipment,
    category: e.category,
  }));

  const model = getGeminiModel();
  if (!model) {
    throw new Error(
      "GEMINI_API_KEY no configurada. No se puede usar la recomendación con IA.",
    );
  }

  // Build detailed catalog with muscle groups clearly labeled
  const catalogLines = exerciseCatalog.map(
    (e) =>
      `• "${e.name}" | grupo: ${e.muscleGroup} | equipo: ${e.equipment} | dificultad: ${e.difficulty} | categoría: ${e.category}`,
  );

  const prompt = `Eres un entrenador personal certificado experto en ejercicios de gimnasio. Responde preguntas sobre ejercicios basándote ÚNICAMENTE en el catálogo proporcionado.

CATÁLOGO DE EJERCICIOS DISPONIBLES:
${catalogLines.join("\n")}

PERFIL DEL USUARIO:
- Nivel: ${user.level || "intermediate"}
- Equipamiento disponible: ${user.preferences?.equipment?.join(", ") || "todo"}

SOLICITUD DEL USUARIO:
"${userQuery}"

TIPOS DE CONSULTA QUE DEBES MANEJAR:

A) EJERCICIOS POR GRUPO MUSCULAR (ej: "ejercicios para abdomen", "quiero trabajar pecho"):
   - Identifica el grupo muscular usando estas equivalencias:
     abdomen/abdominales/core/abs → "abs", pecho/pectoral → "chest", espalda/dorsal → "back",
     hombros/deltoides → "shoulders", bíceps → "biceps", tríceps → "triceps",
     piernas/cuádriceps/muslos → "legs", glúteos/pompas/cola → "glutes",
     antebrazos → "forearms", pantorrillas/gemelos → "calves", cardio/aeróbico → "cardio"
   - Recomienda SOLO ejercicios cuyo campo "grupo" coincida con ese grupo muscular.

B) REEMPLAZO / ALTERNATIVA (ej: "con qué reemplazo el hip thrust", "alternativa a press de banca"):
   - Identifica el ejercicio mencionado (puede NO estar en el catálogo, ej: "hip thrust").
   - Determina qué músculos trabaja ese ejercicio y su patrón de movimiento.
   - Busca en el catálogo ejercicios que trabajen los MISMOS músculos con un patrón de movimiento similar.
   - Explica por qué cada ejercicio sirve como reemplazo.

C) CONSEJO / PREGUNTA GENERAL (ej: "qué ejercicio es mejor para ganar masa", "cómo mejorar fuerza de agarre"):
   - Responde la pregunta seleccionando los ejercicios más relevantes del catálogo.
   - Da una explicación clara de por qué esos ejercicios responden a la pregunta.

D) POR EQUIPAMIENTO (ej: "ejercicios con mancuernas", "sin equipamiento"):
   - Filtra ejercicios del catálogo que usen ese equipamiento específico.

REGLAS OBLIGATORIAS:
1. Usa SOLO nombres EXACTOS del campo "name" del catálogo. NUNCA inventes ejercicios que no estén listados.
2. Si el ejercicio que el usuario menciona NO está en el catálogo (ej: "hip thrust"), NO lo incluyas en la respuesta, pero úsalo para entender qué busca y recomendar ALTERNATIVAS que SÍ estén en el catálogo.
3. Máximo 8 ejercicios recomendados. Ordénalos del más relevante al menos.
4. Adapta sets y reps al nivel del usuario y al objetivo.
5. Los tips deben ser consejos prácticos y relevantes a la solicitud.

Responde SOLO con JSON válido (sin markdown ni texto adicional):
{
  "title": "título descriptivo que resuma la recomendación",
  "explanation": "respuesta directa a lo que el usuario preguntó, explicando tu razonamiento",
  "exercises": [
    {
      "name": "nombre EXACTO del catálogo",
      "reason": "por qué este ejercicio responde a lo que el usuario pidió",
      "sets": 3,
      "reps": "8-12",
      "priority": 1
    }
  ],
  "tips": ["consejo práctico 1", "consejo práctico 2"]
}`;

  // Map exercise names to DB documents (used in both AI and fallback paths)
  const exerciseMap = {};
  allExercises.forEach((e) => {
    exerciseMap[e.name.toLowerCase()] = e;
  });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("🤖 Gemini raw response length:", text.length);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Formato de respuesta inválido");

    const aiResult = JSON.parse(jsonMatch[0]);

    const matched = (aiResult.exercises || [])
      .map((aiEx) => {
        const dbEx = exerciseMap[aiEx.name?.toLowerCase()];
        if (!dbEx) console.log("⚠️ Ejercicio no encontrado en DB:", aiEx.name);
        return dbEx
          ? {
              exercise: dbEx,
              reason: aiEx.reason,
              sets: aiEx.sets,
              reps: aiEx.reps,
              priority: aiEx.priority,
            }
          : null;
      })
      .filter(Boolean);

    if (matched.length === 0) throw new Error("Ningún ejercicio coincidió con el catálogo");

    return {
      title: aiResult.title || "Recomendación de ejercicios",
      explanation: aiResult.explanation || "",
      exercises: matched,
      tips: aiResult.tips || [],
    };
  } catch (err) {
    console.error("❌ AI Exercise Recommend error:", err.message);

    // ── Smart fallback ──
    const query = userQuery.toLowerCase();

    // 1. Keyword → muscle group mapping
    const muscleKeywords = {
      pecho: "chest", pectoral: "chest",
      espalda: "back", dorsal: "back",
      hombros: "shoulders", hombro: "shoulders", deltoides: "shoulders",
      bíceps: "biceps", biceps: "biceps",
      tríceps: "triceps", triceps: "triceps",
      piernas: "legs", pierna: "legs", cuádriceps: "legs", muslos: "legs",
      glúteos: "glutes", gluteos: "glutes",
      abdomen: "abs", abdominales: "abs", abs: "abs", core: "abs",
      antebrazos: "forearms", pantorrillas: "calves", gemelos: "calves",
      cardio: "cardio", cuerpo: "full_body",
    };

    // 2. Common exercises (including ones NOT in catalog) → muscle group
    const exerciseMuscleMap = {
      "hip thrust": "glutes", "hipthrust": "glutes",
      "sentadilla búlgara": "legs", "sentadilla bulgara": "legs",
      "zancada": "legs", "zancadas": "legs", "lunges": "legs", "lunge": "legs",
      "peso muerto": "back", "deadlift": "back",
      "dominadas": "back", "dominada": "back", "pull up": "back", "pullup": "back",
      "flexiones": "chest", "flexión": "chest", "push up": "chest", "pushup": "chest",
      "press de banca": "chest", "bench press": "chest",
      "press militar": "shoulders", "military press": "shoulders",
      "curl": "biceps", "curl de bíceps": "biceps",
      "fondos": "triceps", "dips": "triceps",
      "plancha": "abs", "plank": "abs", "crunch": "abs",
      "sentadilla": "legs", "squat": "legs",
      "burpee": "cardio", "burpees": "cardio",
      "prensa": "legs", "leg press": "legs",
      "elevación de cadera": "glutes", "puente de glúteos": "glutes", "glute bridge": "glutes",
      "patada de glúteo": "glutes", "kickback": "glutes",
      "extensión de cuádriceps": "legs", "leg extension": "legs",
      "curl femoral": "legs", "leg curl": "legs",
      "remo": "back", "row": "back",
      "jalón": "back", "lat pulldown": "back",
    };

    // Find target muscle from keywords
    let targetMuscle = null;
    const words = query.split(/\s+/);
    for (const kw of words) {
      if (muscleKeywords[kw]) { targetMuscle = muscleKeywords[kw]; break; }
    }

    // If no muscle keyword found, try to match exercise names in the query
    if (!targetMuscle) {
      for (const [exName, muscle] of Object.entries(exerciseMuscleMap)) {
        if (query.includes(exName)) { targetMuscle = muscle; break; }
      }
    }

    // If still no match, try to match against catalog exercise names
    if (!targetMuscle) {
      for (const ex of allExercises) {
        if (query.includes(ex.name.toLowerCase())) {
          targetMuscle = ex.muscleGroup;
          break;
        }
      }
    }

    let filtered = targetMuscle
      ? allExercises.filter((e) => e.muscleGroup === targetMuscle)
      : allExercises;
    filtered = filtered.slice(0, 8);

    const muscleLabels = {
      chest: "Pecho", back: "Espalda", shoulders: "Hombros",
      biceps: "Bíceps", triceps: "Tríceps", legs: "Piernas",
      glutes: "Glúteos", abs: "Abdominales", forearms: "Antebrazos",
      calves: "Pantorrillas", cardio: "Cardio", full_body: "Cuerpo completo",
    };

    return {
      title: targetMuscle
        ? `Ejercicios de ${muscleLabels[targetMuscle] || targetMuscle}`
        : "Ejercicios recomendados",
      explanation: targetMuscle
        ? `Mostrando ejercicios de ${muscleLabels[targetMuscle] || targetMuscle} relacionados con tu búsqueda. (La IA no pudo responder, se usó búsqueda inteligente.)`
        : `No se pudo procesar la consulta con IA. Mostrando ejercicios generales.`,
      exercises: filtered.map((e, i) => ({
        exercise: e,
        reason: `Ejercicio de ${muscleLabels[e.muscleGroup] || e.muscleGroup} — ${e.difficulty}`,
        sets: 3,
        reps: "8-12",
        priority: i + 1,
      })),
      tips: targetMuscle
        ? [`Estos ejercicios trabajan ${muscleLabels[targetMuscle] || targetMuscle}.`, "Consulta a un entrenador para personalizar tu rutina."]
        : [],
    };
  }
}

module.exports = {
  recommend,
  generateRoutineWithAI,
  saveAIRoutine,
  aiExerciseRecommend,
};
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
