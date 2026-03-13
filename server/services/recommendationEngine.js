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
const Routine = require("../models/Routine");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { generateJsonWithOpenAI, getOpenAIConfig } = require("./openaiService");
const GEMINI_MODEL = "gemini-2.0-flash";

function geminiKeyHint() {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key) return "missing";
  return `len:${key.length}-tail:${key.slice(-6)}`;
}

function parseGeminiError(err) {
  const status =
    err?.status ||
    err?.response?.status ||
    err?.response?.statusCode ||
    err?.code ||
    null;
  const message =
    err?.message ||
    err?.response?.data?.error?.message ||
    "Unknown Gemini error";
  const details =
    err?.response?.data?.error?.status ||
    err?.error?.status ||
    null;
  return { status, details, message };
}

function logGeminiFailure(scope, err) {
  const parsed = parseGeminiError(err);
  console.error("[Gemini][Error]", {
    scope,
    model: GEMINI_MODEL,
    keyHint: geminiKeyHint(),
    ...parsed,
  });
}

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
}

function pickExercises(allExercises, count, muscleGroup) {
  const pool = muscleGroup
    ? allExercises.filter((ex) => ex.muscleGroup === muscleGroup)
    : allExercises;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, count));
}

function buildLocalRoutineFallback(allExercises, opts = {}) {
  const {
    level = "intermediate",
    goalType = "general",
    frequency = 3,
    minutes = 60,
    focusMuscleGroups = [],
  } = opts;

  const weeklyDays = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
  const safeFrequency = Math.min(Math.max(Number(frequency) || 3, 1), 7);
  const sets = goalType === "strength" ? 5 : level === "beginner" ? 3 : 4;
  const repsMin = goalType === "strength" ? 4 : goalType === "fat_loss" ? 12 : 8;
  const repsMax = goalType === "strength" ? 6 : goalType === "fat_loss" ? 15 : 12;
  const restSeconds = goalType === "strength" ? 150 : 90;
  const exCount = Math.max(3, Math.min(8, Math.floor((Number(minutes) || 60) / 10)));

  const days = Array.from({ length: safeFrequency }).map((_, idx) => {
    const preferredMuscle = focusMuscleGroups[idx % (focusMuscleGroups.length || 1)];
    const selected = pickExercises(allExercises, exCount, preferredMuscle);
    return {
      dayLabel: `${weeklyDays[idx]} - Dia ${idx + 1}`,
      exercises: selected.map((ex, order) => ({
        exercise: ex._id,
        order,
        sets,
        repsMin,
        repsMax,
        restSeconds,
        notes: `${ex.muscleGroup || "general"} - ${level}`,
      })),
    };
  });

  const targetMuscleGroups = [
    ...new Set(
      days.flatMap((d) =>
        d.exercises
          .map((e) => allExercises.find((ex) => ex._id.toString() === e.exercise.toString())?.muscleGroup)
          .filter(Boolean),
      ),
    ),
  ];

  return {
    name: `Rutina ${goalType} (${safeFrequency} dias)`,
    description: `Rutina generada por fallback local para ${safeFrequency} dias.`,
    targetMuscleGroups,
    days,
    exercises: [],
  };
}

async function scoringRecommend(user) {
  const base = await ruleBasedRecommend(user);
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const recentWorkouts = await WorkoutLog.countDocuments({
    user: user._id,
    createdAt: { $gte: since },
  });

  return {
    ...base,
    engine: "scoring",
    title: "Recomendacion personalizada",
    body: `${base.body} Se detectaron ${recentWorkouts} entrenamientos en las ultimas 2 semanas.`,
  };
}

async function llmRecommend(user) {
  const allExercises = await Exercise.find({}).limit(40);
  const names = allExercises.map((e) => e.name).join(", ");
  const prompt = `Recomienda 8 ejercicios para un usuario nivel ${user.level || "intermediate"}.\nUsa solo esta lista: ${names}\nResponde JSON {"exercises":["name1","name2"]}`;

  try {
    const parsed =
      (await generateJsonWithOpenAI({
        systemPrompt:
          "Eres un entrenador personal. Debes responder siempre JSON valido y usar solo ejercicios presentes en la lista dada.",
        userPrompt: prompt,
        temperature: 0.3,
      })) || {};
    const picked = (parsed.exercises || [])
      .map((name) => allExercises.find((e) => e.name.toLowerCase() === String(name).toLowerCase()))
      .filter(Boolean)
      .slice(0, 8);

    if (!picked.length) return scoringRecommend(user);

    return {
      engine: "openai",
      title: "Recomendacion IA",
      body: "Plan sugerido por IA usando tu perfil.",
      exercises: picked,
    };
  } catch (_err) {
    const model = getGeminiModel();
    if (!model) return scoringRecommend(user);
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      const picked = (parsed.exercises || [])
        .map((name) => allExercises.find((e) => e.name.toLowerCase() === String(name).toLowerCase()))
        .filter(Boolean)
        .slice(0, 8);

      if (!picked.length) return scoringRecommend(user);

      return {
        engine: "gemini",
        title: "Recomendacion IA",
        body: "Plan sugerido por IA usando tu perfil.",
        exercises: picked,
      };
    } catch (_geminiErr) {
      return scoringRecommend(user);
    }
  }
}

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
      fallback.body +=
        " (Gemini no disponible – se usó el motor de puntuación.)";
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
      {
        label: "Full Body",
        muscles: ["chest", "back", "shoulders", "legs", "abs"],
      },
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
    const {
      level,
      goalType,
      frequency,
      minutes,
      equipment,
      focusMuscleGroups,
    } = opts;
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
    };
  }
  const cfg = { ...(goalConfig[goalType] || goalConfig.general) };

  // Adjust exercise count based on available time
  const estimatedTimePerExercise = cfg.sets * 0.75 + (cfg.rest * cfg.sets) / 60;
  let targetCountPerDay = Math.min(
    cfg.exerciseCount,
    Math.floor(minutes / estimatedTimePerExercise) || 4,
  );
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
      return (
        eqSet.has(exEquip) ||
        exEquip === "bodyweight" ||
        exEquip === "ninguno" ||
        exEquip === ""
      );
    });
    if (filtered.length >= targetCountPerDay) pool = filtered;
  }

  const goalLabels = {
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
  const split = DAY_SPLITS[Math.min(Math.max(frequency, 1), 7)];

  // Track globally used exercises to diversify across days
  const globalUsedIds = new Set();

  const days = split.map((dayDef, dayIdx) => {
    // Merge day muscles with focus groups
    let dayMuscles = [...dayDef.muscles];
    if (focusMuscleGroups.length > 0) {
      // Add focus muscles to each day that has overlap, prioritize them
      const overlap = focusMuscleGroups.filter((m) => dayMuscles.includes(m));
      if (overlap.length > 0)
        dayMuscles = [
          ...overlap,
          ...dayMuscles.filter((m) => !overlap.includes(m)),
        ];
    }

    const selected = [];
    const dayUsedIds = new Set();

    // Pick exercises for this day's muscle groups
    for (const mg of dayMuscles) {
      if (selected.length >= targetCountPerDay) break;
      const candidates = pool.filter(
        (e) =>
          e.muscleGroup === mg &&
          !dayUsedIds.has(e._id.toString()) &&
          !globalUsedIds.has(e._id.toString()),
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

  const totalExercises = days.reduce((s, d) => s + d.exercises.length, 0);

  return {
    name: `Rutina de ${goalLabel} — ${levelLabel} (${frequency} días)`,
    description: `Plan de ${frequency} días para ${goalLabel}. ${totalExercises} ejercicios distribuidos, ${cfg.sets} series, descanso de ${cfg.rest}s. Generada por el motor de recomendaciones.`,
    targetMuscleGroups: allUsedMuscles,
    days,
    exercises: [],
  };
}

function buildRoutineFromAIPlan(aiPlan, exerciseMap, unmatchedExercises) {
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
      dayLabel: aiDay.dayLabel || "Dia",
      exercises: routineExercises,
    };
  });

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
      days.push({
        dayLabel: "Dia 1 - Full Body",
        exercises: routineExercises,
      });
    }
  }

  const totalMapped = days.reduce((sum, day) => sum + day.exercises.length, 0);
  if (totalMapped === 0) throw new Error("No exercises mapped");

  return {
    name: aiPlan.name || "Rutina IA",
    description:
      aiPlan.description || "Rutina generada por inteligencia artificial",
    targetMuscleGroups: aiPlan.targetMuscleGroups || [],
    days,
    exercises: [],
  };
}

async function generateRoutineWithAI(user, overrides = {}, options = {}) {
  const { persist = true } = options;
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
    fat_loss: "pÃ©rdida de grasa",
    endurance: "resistencia",
    toning: "tonificaciÃ³n",
    strength: "fuerza",
    general: "fitness general",
  };

  const prompt = `Eres un entrenador personal certificado experto en programaciÃ³n de entrenamiento.

INFORMACIÃ“N DEL USUARIO:
- Nivel: ${level}
- Objetivo: ${goalLabels[goalType] || goalType}${goalDescription ? ` (${goalDescription})` : ""}
- Frecuencia semanal: ${frequency} dÃ­as
- Tiempo disponible por sesiÃ³n: ${minutes} minutos
- Equipamiento disponible: ${equipment.length ? equipment.join(", ") : "todo el equipamiento"}
- Grupos musculares prioritarios: ${focusMuscleGroups.length ? focusMuscleGroups.join(", ") : "todos"}${height ? `\n- Altura: ${height} cm` : ""}${weight ? `\n- Peso: ${weight} kg` : ""}${customNotes ? `\n- Instrucciones adicionales del usuario: ${customNotes}` : ""}

EJERCICIOS DISPONIBLES EN LA BASE DE DATOS (usa EXACTAMENTE estos nombres):
${exerciseNames.join(", ")}

INSTRUCCIONES:
1. Crea una rutina de entrenamiento de ${frequency} dÃ­as por semana.
2. Distribuye los ejercicios de forma inteligente por dÃ­a (ej: Push/Pull/Legs, Upper/Lower, etc.).
3. Usa SOLO ejercicios de la lista proporcionada (nombres exactos).
4. Adapta sets, reps y descanso al objetivo y nivel del usuario.
5. El tiempo de cada sesiÃ³n debe ajustarse a ${minutes} minutos.
6. Cada dÃ­a debe usar el nombre del dÃ­a de la semana.

Responde SOLO con un JSON vÃ¡lido con esta estructura exacta (sin markdown):
{
  "name": "nombre descriptivo de la rutina",
  "description": "breve descripciÃ³n de la rutina y su enfoque",
  "targetMuscleGroups": ["grupo1", "grupo2"],
  "days": [
    {
      "dayLabel": "Lunes - Nombre descriptivo",
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

  // OpenAI -> Gemini -> local fallback
  let routineData; // { name, description, targetMuscleGroups, days[] }
  let usedEngine = "llm";
  let unmatchedExercises = [];
  const exerciseMap = {};
  allExercises.forEach((e) => {
    exerciseMap[e.name.toLowerCase()] = e;
  });

  if (getOpenAIConfig()) {
    try {
      const aiPlan = await generateJsonWithOpenAI({
        systemPrompt:
          "Eres un entrenador personal certificado. Debes responder siempre JSON valido usando exactamente los nombres de ejercicios dados por el usuario.",
        userPrompt: prompt,
        temperature: 0.5,
      });
      routineData = buildRoutineFromAIPlan(
        aiPlan,
        exerciseMap,
        unmatchedExercises,
      );
      usedEngine = "openai";
    } catch (openaiErr) {
      console.error("[OpenAI][generateRoutineWithAI]", {
        status: openaiErr?.status || null,
        message: openaiErr?.message || "Unknown OpenAI error",
        details: openaiErr?.details || null,
      });
    }
  }

  const model = !routineData ? getGeminiModel() : null;
  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Formato invalido");

      const aiPlan = JSON.parse(jsonMatch[0]);
      routineData = buildRoutineFromAIPlan(
        aiPlan,
        exerciseMap,
        unmatchedExercises,
      );
      usedEngine = "gemini";
    } catch (geminiErr) {
      logGeminiFailure("generateRoutineWithAI", geminiErr);
      console.log("Gemini fallo, usando generador local.");
      usedEngine = "scoring";
      routineData = buildLocalRoutineFallback(allExercises, {
        level,
        goalType,
        frequency,
        minutes,
        equipment,
        focusMuscleGroups,
      });
    }
  } else if (!routineData) {
    usedEngine = "scoring";
    routineData = buildLocalRoutineFallback(allExercises, {
      level,
      goalType,
      frequency,
      minutes,
      equipment,
      focusMuscleGroups,
    });
  }
  if (!persist) {
    const exerciseById = {};
    allExercises.forEach((e) => {
      exerciseById[String(e._id)] = e;
    });
    const previewDays = (routineData.days || []).map((day) => ({
      ...day,
      exercises: (day.exercises || []).map((ex) => {
        const dbEx = exerciseById[String(ex.exercise)];
        return {
          ...ex,
          exercise: dbEx
            ? {
                _id: dbEx._id,
                name: dbEx.name,
                muscleGroup: dbEx.muscleGroup,
                equipment: dbEx.equipment,
              }
            : null,
        };
      }),
    }));

    return {
      routine: {
        name: routineData.name,
        description: routineData.description,
        targetMuscleGroups: routineData.targetMuscleGroups,
        goal: goalType,
        days: previewDays,
        exercises: [],
        isAIGenerated: true,
      },
      recommendationId: null,
      unmatchedExercises,
      engine: usedEngine,
      needsConfirmation: true,
    };
  }

  // Create the routine in the database
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
    "name muscleGroup equipment youtubeVideoId videoUrl",
  );

  // Collect all exercise IDs for the recommendation record
  const allExerciseIds = routineData.days.flatMap((d) =>
    d.exercises.map((e) => e.exercise),
  );

  // Save AI recommendation record
  const rec = await AIRecommendation.create({
    user: user._id,
    type: "routine",
    engine: usedEngine,
    title: routine.name,
    body: routine.description,
    exercises: allExerciseIds,
    routine: routine._id,
  });

  return {
    routine,
    recommendationId: rec._id,
    unmatchedExercises,
    engine: usedEngine,
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

async function confirmGeneratedRoutine(user, payload = {}) {
  const routineDraft = payload.routine;
  if (!routineDraft || !Array.isArray(routineDraft.days) || routineDraft.days.length === 0) {
    throw new Error("No hay rutina pendiente para confirmar");
  }

  const normalizedDays = (routineDraft.days || []).map((day) => ({
    dayLabel: day.dayLabel || "Dia",
    exercises: (day.exercises || [])
      .map((ex, idx) => {
        const exerciseId = ex?.exercise?._id || ex?.exercise;
        if (!exerciseId) return null;
        return {
          exercise: exerciseId,
          order: Number.isFinite(Number(ex.order)) ? Number(ex.order) : idx,
          sets: Math.max(1, Number(ex.sets) || 3),
          repsMin: Math.max(1, Number(ex.repsMin) || 8),
          repsMax: Math.max(1, Number(ex.repsMax) || 12),
          restSeconds: Math.max(15, Number(ex.restSeconds) || 90),
          notes: String(ex.notes || ""),
        };
      })
      .filter(Boolean),
  }));

  const routine = await Routine.create({
    user: user._id,
    name: routineDraft.name || "Rutina IA",
    description:
      routineDraft.description || "Rutina generada por inteligencia artificial",
    targetMuscleGroups: Array.isArray(routineDraft.targetMuscleGroups)
      ? routineDraft.targetMuscleGroups
      : [],
    goal: routineDraft.goal || "general",
    days: normalizedDays,
    exercises: [],
    isAIGenerated: true,
  });

  await routine.populate(
    "days.exercises.exercise",
    "name muscleGroup equipment youtubeVideoId videoUrl",
  );

  const allExerciseIds = (routine.days || []).flatMap((d) =>
    (d.exercises || []).map((e) => e.exercise),
  );

  const rec = await AIRecommendation.create({
    user: user._id,
    type: "routine",
    engine: payload.engine || "scoring",
    title: routine.name,
    body: routine.description,
    exercises: allExerciseIds,
    routine: routine._id,
  });

  return {
    routine,
    recommendationId: rec._id,
    unmatchedExercises: Array.isArray(payload.unmatchedExercises)
      ? payload.unmatchedExercises
      : [],
    engine: payload.engine || "scoring",
  };
}

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

  // Build detailed catalog with muscle groups clearly labeled

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
    let aiResult;
    if (getOpenAIConfig()) {
      aiResult = await generateJsonWithOpenAI({
        systemPrompt:
          "Eres un entrenador personal experto. Debes responder siempre JSON valido usando solo ejercicios presentes en el catalogo.",
        userPrompt: prompt,
        temperature: 0.4,
      });
    } else {
      const model = getGeminiModel();
      if (!model) {
        throw new Error("No hay proveedor de IA configurado.");
      }
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log("AI raw response length:", text.length);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Formato de respuesta invalido");
      aiResult = JSON.parse(jsonMatch[0]);
    }

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

    if (matched.length === 0)
      throw new Error("Ningún ejercicio coincidió con el catálogo");

    return {
      title: aiResult.title || "Recomendación de ejercicios",
      explanation: aiResult.explanation || "",
      exercises: matched,
      tips: aiResult.tips || [],
    };
  } catch (err) {
    logGeminiFailure("aiExerciseRecommend", err);

    // ── Smart fallback ──
    const query = userQuery.toLowerCase();

    // 1. Keyword → muscle group mapping
    const muscleKeywords = {
      pecho: "chest",
      pectoral: "chest",
      espalda: "back",
      dorsal: "back",
      hombros: "shoulders",
      hombro: "shoulders",
      deltoides: "shoulders",
      biceps: "biceps",
      triceps: "triceps",
      piernas: "legs",
      pierna: "legs",
      cuadriceps: "legs",
      muslos: "legs",
      gluteos: "glutes",
      abdomen: "abs",
      abdominales: "abs",
      abs: "abs",
      core: "abs",
      antebrazos: "forearms",
      pantorrillas: "calves",
      gemelos: "calves",
      cardio: "cardio",
      cuerpo: "full_body",
    };

    // 2. Common exercises (including ones NOT in catalog) → muscle group
    const exerciseMuscleMap = {
      "hip thrust": "glutes",
      hipthrust: "glutes",
      "sentadilla bulgara": "legs",
      zancada: "legs",
      zancadas: "legs",
      lunges: "legs",
      lunge: "legs",
      "peso muerto": "back",
      deadlift: "back",
      dominadas: "back",
      dominada: "back",
      "pull up": "back",
      pullup: "back",
      flexiones: "chest",
      "push up": "chest",
      pushup: "chest",
      "press de banca": "chest",
      "bench press": "chest",
      "press militar": "shoulders",
      "military press": "shoulders",
      curl: "biceps",
      "curl de biceps": "biceps",
      fondos: "triceps",
      dips: "triceps",
      plancha: "abs",
      plank: "abs",
      crunch: "abs",
      sentadilla: "legs",
      squat: "legs",
      burpee: "cardio",
      burpees: "cardio",
      prensa: "legs",
      "leg press": "legs",
      "elevacion de cadera": "glutes",
      "puente de gluteos": "glutes",
      "glute bridge": "glutes",
      "patada de gluteo": "glutes",
      kickback: "glutes",
      "extension de cuadriceps": "legs",
      "leg extension": "legs",
      "curl femoral": "legs",
      "leg curl": "legs",
      remo: "back",
      row: "back",
      jalon: "back",
      "lat pulldown": "back",
    };

    // Find target muscle from keywords
    let targetMuscle = null;
    const words = query.split(/\s+/);
    for (const kw of words) {
      if (muscleKeywords[kw]) {
        targetMuscle = muscleKeywords[kw];
        break;
      }
    }

    // If no muscle keyword found, try to match exercise names in the query
    if (!targetMuscle) {
      for (const [exName, muscle] of Object.entries(exerciseMuscleMap)) {
        if (query.includes(exName)) {
          targetMuscle = muscle;
          break;
        }
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
      chest: "Pecho",
      back: "Espalda",
      shoulders: "Hombros",
      biceps: "Bíceps",
      triceps: "Tríceps",
      legs: "Piernas",
      glutes: "Glúteos",
      abs: "Abdominales",
      forearms: "Antebrazos",
      calves: "Pantorrillas",
      cardio: "Cardio",
      full_body: "Cuerpo completo",
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
        ? [
            `Estos ejercicios trabajan ${muscleLabels[targetMuscle] || targetMuscle}.`,
            "Consulta a un entrenador para personalizar tu rutina.",
          ]
        : [],
    };
  }
}

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferMuscleFromQuery(userQuery = "") {
  const q = normalizeText(userQuery);
  const keywordToMuscle = {
    pecho: "chest",
    pectoral: "chest",
    chest: "chest",
    espalda: "back",
    dorsal: "back",
    back: "back",
    hombro: "shoulders",
    hombros: "shoulders",
    shoulder: "shoulders",
    shoulders: "shoulders",
    biceps: "biceps",
    triceps: "triceps",
    pierna: "legs",
    piernas: "legs",
    leg: "legs",
    legs: "legs",
    gluteo: "glutes",
    gluteos: "glutes",
    glute: "glutes",
    glutes: "glutes",
    abdomen: "abs",
    abdominal: "abs",
    abdominales: "abs",
    abs: "abs",
    core: "abs",
    antebrazo: "forearms",
    antebrazos: "forearms",
    forearm: "forearms",
    forearms: "forearms",
    pantorrilla: "calves",
    pantorrillas: "calves",
    gemelo: "calves",
    gemelos: "calves",
    calf: "calves",
    calves: "calves",
    cardio: "cardio",
  };

  for (const [keyword, muscle] of Object.entries(keywordToMuscle)) {
    if (q.includes(keyword)) return muscle;
  }
  return null;
}

function getExternalExercisesPool() {
  return [
    { name: "Hip Thrust", muscleGroup: "glutes", equipment: "barbell", difficulty: "intermediate" },
    { name: "Bulgarian Split Squat", muscleGroup: "legs", equipment: "dumbbell", difficulty: "intermediate" },
    { name: "Sissy Squat", muscleGroup: "legs", equipment: "bodyweight", difficulty: "advanced" },
    { name: "Nordic Hamstring Curl", muscleGroup: "legs", equipment: "bodyweight", difficulty: "advanced" },
    { name: "Jefferson Curl", muscleGroup: "back", equipment: "barbell", difficulty: "advanced" },
    { name: "Face Pull", muscleGroup: "shoulders", equipment: "cable", difficulty: "beginner" },
    { name: "Landmine Press", muscleGroup: "shoulders", equipment: "barbell", difficulty: "intermediate" },
    { name: "Chest Supported Row", muscleGroup: "back", equipment: "dumbbell", difficulty: "intermediate" },
    { name: "Pike Push-Up", muscleGroup: "shoulders", equipment: "bodyweight", difficulty: "intermediate" },
    { name: "Diamond Push-Up", muscleGroup: "triceps", equipment: "bodyweight", difficulty: "beginner" },
    { name: "Incline Dumbbell Fly", muscleGroup: "chest", equipment: "dumbbell", difficulty: "intermediate" },
    { name: "Cable Crossover", muscleGroup: "chest", equipment: "cable", difficulty: "intermediate" },
    { name: "Farmer Carry", muscleGroup: "forearms", equipment: "dumbbell", difficulty: "beginner" },
    { name: "Ab Wheel Rollout", muscleGroup: "abs", equipment: "other", difficulty: "intermediate" },
    { name: "Hollow Body Hold", muscleGroup: "abs", equipment: "bodyweight", difficulty: "beginner" },
    { name: "Assault Bike Sprint", muscleGroup: "cardio", equipment: "machine", difficulty: "intermediate" },
  ];
}

async function aiExerciseSuggestOpen(user, userQuery) {
  const query = String(userQuery || "").trim();
  if (!query) {
    throw new Error("Debes escribir que tipo de ejercicios buscas");
  }

  const allExercises = await Exercise.find({})
    .select("name muscleGroup equipment difficulty category imageUrl")
    .lean();
  const catalogMap = new Map();
  allExercises.forEach((e) => {
    const key = normalizeText(e.name);
    if (!catalogMap.has(key)) catalogMap.set(key, e);
  });

  if (getOpenAIConfig()) {
    try {
      const catalogLines = allExercises.slice(0, 180).map(
        (e) =>
          `- ${e.name} | muscleGroup=${e.muscleGroup} | equipment=${e.equipment} | difficulty=${e.difficulty}`,
      );

      const prompt = `Eres un entrenador personal experto en gimnasio.
Tu trabajo es recomendar ejercicios segun la solicitud del usuario.
Puedes recomendar ejercicios del catalogo y tambien ejercicios que NO esten en el catalogo si son utiles.

USUARIO:
- nivel: ${user?.level || "intermediate"}
- equipamiento preferido: ${user?.preferences?.equipment?.join(", ") || "cualquiera"}
- solicitud: "${query}"

CATALOGO DISPONIBLE:
${catalogLines.join("\n")}

Devuelve SOLO JSON valido con esta estructura:
{
  "title": "titulo corto",
  "explanation": "explicacion breve de la estrategia",
  "recommendations": [
    {
      "name": "nombre del ejercicio",
      "reason": "por que lo recomiendas",
      "sets": "3-4",
      "reps": "8-12",
      "muscleGroup": "chest|back|shoulders|biceps|triceps|legs|glutes|abs|forearms|calves|full_body|cardio",
      "equipment": "barbell|dumbbell|machine|cable|bodyweight|kettlebell|band|other",
      "difficulty": "beginner|intermediate|advanced",
      "priority": 1
    }
  ],
  "tips": ["tip 1", "tip 2"]
}
Reglas:
- maximo 10 recomendaciones
- mezcla catalogo + fuera de catalogo cuando tenga sentido
- no uses markdown`;

      const parsed = await generateJsonWithOpenAI({
        systemPrompt:
          "Eres un entrenador personal experto. Debes responder siempre JSON valido y util.",
        userPrompt: prompt,
        temperature: 0.6,
      });

      const recs = Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [];
      const mapped = recs
        .map((rec, idx) => {
          const rawName = String(rec?.name || "").trim();
          if (!rawName) return null;
          const matched = catalogMap.get(normalizeText(rawName));
          return {
            name: matched?.name || rawName,
            reason: String(rec?.reason || "Recomendado para tu objetivo"),
            sets: String(rec?.sets || "3-4"),
            reps: String(rec?.reps || "8-12"),
            muscleGroup: rec?.muscleGroup || matched?.muscleGroup || null,
            equipment: rec?.equipment || matched?.equipment || null,
            difficulty: rec?.difficulty || matched?.difficulty || null,
            inCatalog: Boolean(matched),
            exerciseId: matched?._id || null,
            priority: Number(rec?.priority) || idx + 1,
          };
        })
        .filter(Boolean)
        .slice(0, 10);

      if (mapped.length > 0) {
        return {
          title: parsed.title || "Sugerencias de ejercicios con IA",
          explanation:
            parsed.explanation ||
            "Recomendaciones generadas segun tu objetivo y contexto.",
          recommendations: mapped,
          tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 4) : [],
          source: "openai_open",
        };
      }
    } catch (err) {
      console.error("[OpenAI][aiExerciseSuggestOpen]", {
        status: err?.status || null,
        message: err?.message || "Unknown OpenAI error",
        details: err?.details || null,
      });
    }
  }
  const model = getGeminiModel();
  if (model) {
    try {
      const catalogLines = allExercises.slice(0, 180).map(
        (e) =>
          `- ${e.name} | muscleGroup=${e.muscleGroup} | equipment=${e.equipment} | difficulty=${e.difficulty}`,
      );

      const prompt = `Eres un entrenador personal experto en gimnasio.
Tu trabajo es recomendar ejercicios segun la solicitud del usuario.
Puedes recomendar ejercicios del catalogo y tambien ejercicios que NO esten en el catalogo si son utiles.

USUARIO:
- nivel: ${user?.level || "intermediate"}
- equipamiento preferido: ${user?.preferences?.equipment?.join(", ") || "cualquiera"}
- solicitud: "${query}"

CATALOGO DISPONIBLE:
${catalogLines.join("\n")}

Devuelve SOLO JSON valido con esta estructura:
{
  "title": "titulo corto",
  "explanation": "explicacion breve de la estrategia",
  "recommendations": [
    {
      "name": "nombre del ejercicio",
      "reason": "por que lo recomiendas",
      "sets": "3-4",
      "reps": "8-12",
      "muscleGroup": "chest|back|shoulders|biceps|triceps|legs|glutes|abs|forearms|calves|full_body|cardio",
      "equipment": "barbell|dumbbell|machine|cable|bodyweight|kettlebell|band|other",
      "difficulty": "beginner|intermediate|advanced",
      "priority": 1
    }
  ],
  "tips": ["tip 1", "tip 2"]
}
Reglas:
- maximo 10 recomendaciones
- mezcla catalogo + fuera de catalogo cuando tenga sentido
- no uses markdown`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Formato invalido");
      const parsed = JSON.parse(jsonMatch[0]);

      const recs = Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [];
      const mapped = recs
        .map((rec, idx) => {
          const rawName = String(rec?.name || "").trim();
          if (!rawName) return null;
          const matched = catalogMap.get(normalizeText(rawName));
          return {
            name: matched?.name || rawName,
            reason: String(rec?.reason || "Recomendado para tu objetivo"),
            sets: String(rec?.sets || "3-4"),
            reps: String(rec?.reps || "8-12"),
            muscleGroup: rec?.muscleGroup || matched?.muscleGroup || null,
            equipment: rec?.equipment || matched?.equipment || null,
            difficulty: rec?.difficulty || matched?.difficulty || null,
            inCatalog: Boolean(matched),
            exerciseId: matched?._id || null,
            priority: Number(rec?.priority) || idx + 1,
          };
        })
        .filter(Boolean)
        .slice(0, 10);

      if (mapped.length > 0) {
        return {
          title: parsed.title || "Sugerencias de ejercicios con IA",
          explanation:
            parsed.explanation ||
            "Recomendaciones generadas segun tu objetivo y contexto.",
          recommendations: mapped,
          tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 4) : [],
          source: "gemini_open",
        };
      }
    } catch (err) {
      logGeminiFailure("aiExerciseSuggestOpen", err);
    }
  }

  const targetMuscle = inferMuscleFromQuery(query);
  const catalogFiltered = (targetMuscle
    ? allExercises.filter((e) => e.muscleGroup === targetMuscle)
    : allExercises
  )
    .slice(0, 5)
    .map((e, idx) => ({
      name: e.name,
      reason: "Coincide con tu consulta y con el catalogo disponible.",
      sets: "3-4",
      reps: "8-12",
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      difficulty: e.difficulty,
      inCatalog: true,
      exerciseId: e._id,
      priority: idx + 1,
    }));

  const externalPool = getExternalExercisesPool();
  const externalFiltered = (targetMuscle
    ? externalPool.filter((e) => e.muscleGroup === targetMuscle)
    : externalPool
  )
    .slice(0, 4)
    .map((e, idx) => ({
      name: e.name,
      reason: "Opcion adicional sugerida fuera del catalogo local.",
      sets: "3-4",
      reps: "8-12",
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      difficulty: e.difficulty,
      inCatalog: false,
      exerciseId: null,
      priority: catalogFiltered.length + idx + 1,
    }));

  return {
    title: targetMuscle
      ? `Sugerencias para ${targetMuscle}`
      : "Sugerencias de ejercicios",
    explanation:
      "Se uso un generador local de respaldo. Puedes afinar tu consulta para recomendaciones mas precisas.",
    recommendations: [...catalogFiltered, ...externalFiltered].slice(0, 10),
    tips: [
      "Prioriza tecnica correcta antes de subir peso.",
      "Ajusta volumen y descanso segun tu nivel.",
    ],
    source: model ? "fallback_open" : "local_open",
  };
}

module.exports = {
  recommend,
  generateRoutineWithAI,
  confirmGeneratedRoutine,
  aiExerciseRecommend,
  aiExerciseSuggestOpen,
};


