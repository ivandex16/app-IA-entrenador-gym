const WorkoutLog = require('../models/WorkoutLog');
const WeightLog = require('../models/WeightLog');
const Goal = require('../models/Goal');

/**
 * Generate a weekly progress report for the authenticated user.
 * Compares current week (Mon→Sun) with previous week.
 *
 * Returns: { currentWeek, previousWeek, comparison, insights }
 */
const generateWeeklyReport = async (userId, referenceDate = new Date()) => {
  // ── Date boundaries ──
  const ref = new Date(referenceDate);
  const dayOfWeek = ref.getDay() === 0 ? 7 : ref.getDay(); // Mon=1…Sun=7
  const currentMonday = new Date(ref);
  currentMonday.setDate(ref.getDate() - dayOfWeek + 1);
  currentMonday.setHours(0, 0, 0, 0);

  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6);
  currentSunday.setHours(23, 59, 59, 999);

  const previousMonday = new Date(currentMonday);
  previousMonday.setDate(currentMonday.getDate() - 7);
  const previousSunday = new Date(currentMonday);
  previousSunday.setDate(currentMonday.getDate() - 1);
  previousSunday.setHours(23, 59, 59, 999);

  // ── Fetch logs ──
  const [currentLogs, previousLogs] = await Promise.all([
    WorkoutLog.find({
      user: userId,
      date: { $gte: currentMonday, $lte: currentSunday },
    }).populate('exercises.exercise', 'name muscleGroup'),
    WorkoutLog.find({
      user: userId,
      date: { $gte: previousMonday, $lte: previousSunday },
    }).populate('exercises.exercise', 'name muscleGroup'),
  ]);

  const summarize = (logs) => {
    let totalVolume = 0;       // sum of (reps × weight) across all sets
    let totalSets = 0;
    let totalReps = 0;
    let maxWeight = 0;
    let totalCalories = 0;
    const muscleGroups = {};
    const exercisesPerformed = new Set();

    logs.forEach((log) => {
      totalCalories += log.caloriesBurned || 0;
      log.exercises.forEach((entry) => {
        const exName = entry.exercise?.name || 'Unknown';
        const mg = entry.exercise?.muscleGroup || 'unknown';
        exercisesPerformed.add(exName);
        muscleGroups[mg] = (muscleGroups[mg] || 0) + 1;
        entry.sets.forEach((s) => {
          totalSets++;
          totalReps += s.reps;
          totalVolume += s.reps * s.weight;
          if (s.weight > maxWeight) maxWeight = s.weight;
        });
      });
    });

    return {
      workouts: logs.length,
      totalSets,
      totalReps,
      totalVolume: Math.round(totalVolume),
      maxWeight,
      totalCalories,
      exercisesPerformed: [...exercisesPerformed],
      muscleGroups,
    };
  };

  const current = summarize(currentLogs);
  const previous = summarize(previousLogs);

  // ── Comparison ──
  const pct = (cur, prev) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  const comparison = {
    volumeChange: pct(current.totalVolume, previous.totalVolume),
    workoutsChange: current.workouts - previous.workouts,
    maxWeightChange: current.maxWeight - previous.maxWeight,
  };

  // ── Automatic insights ──
  const insights = [];
  if (comparison.volumeChange > 0)
    insights.push(`📈 El volumen aumentó un ${comparison.volumeChange}% respecto a la semana pasada.`);
  else if (comparison.volumeChange < 0)
    insights.push(`📉 El volumen disminuyó un ${Math.abs(comparison.volumeChange)}% respecto a la semana pasada.`);
  if (current.workouts === 0)
    insights.push('⚠️ No registraste entrenamientos esta semana. ¡Mantén la constancia!');
  if (current.maxWeight > previous.maxWeight)
    insights.push(`🏆 Nuevo peso máximo: ${current.maxWeight} kg (+${comparison.maxWeightChange} kg). ¡Sigue así!`);

  // Muscle coverage alert
  const mgTranslate = {
    chest: 'pecho', back: 'espalda', shoulders: 'hombros',
    legs: 'piernas', biceps: 'bíceps', triceps: 'tríceps', abs: 'abdominales',
  };
  const allGroups = [
    'chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps', 'abs',
  ];
  const missed = allGroups.filter((g) => !current.muscleGroups[g]);
  if (missed.length > 0 && current.workouts > 0)
    insights.push(`💡 Grupos musculares sin entrenar esta semana: ${missed.map(g => mgTranslate[g] || g).join(', ')}.`);

  // ── Weight progress ──
  const weightLogs = await WeightLog.find({
    user: userId,
    date: { $gte: currentMonday, $lte: currentSunday },
  }).sort('date');

  const prevWeightLogs = await WeightLog.find({
    user: userId,
    date: { $gte: previousMonday, $lte: previousSunday },
  }).sort('date');

  let weightProgress = null;
  if (weightLogs.length > 0 || prevWeightLogs.length > 0) {
    const latestWeight = weightLogs.length > 0
      ? weightLogs[weightLogs.length - 1].weight
      : null;
    const prevWeight = prevWeightLogs.length > 0
      ? prevWeightLogs[prevWeightLogs.length - 1].weight
      : null;

    weightProgress = {
      currentWeekWeight: latestWeight,
      previousWeekWeight: prevWeight,
      change: latestWeight != null && prevWeight != null
        ? +(latestWeight - prevWeight).toFixed(1)
        : null,
      entries: weightLogs.length,
    };

    // Weight insight
    if (latestWeight != null && prevWeight != null) {
      const wChange = latestWeight - prevWeight;
      const activeGoal = await Goal.findOne({ user: userId, isActive: true }).sort('-createdAt');
      const goalType = activeGoal?.type;

      if (goalType === 'fat_loss' || goalType === 'toning') {
        if (wChange < 0)
          insights.push(`⚖️ Peso bajó ${Math.abs(wChange).toFixed(1)} kg esta semana. ¡Buen progreso!`);
        else if (wChange > 0)
          insights.push(`⚖️ Peso subió ${wChange.toFixed(1)} kg. Revisa tu alimentación.`);
      } else if (goalType === 'muscle_gain' || goalType === 'strength') {
        if (wChange > 0)
          insights.push(`⚖️ Peso subió ${wChange.toFixed(1)} kg esta semana. ¡Buen progreso!`);
        else if (wChange < 0)
          insights.push(`⚖️ Peso bajó ${Math.abs(wChange).toFixed(1)} kg. Asegúrate de comer suficiente.`);
      } else if (wChange !== 0) {
        insights.push(`⚖️ Cambio de peso: ${wChange > 0 ? '+' : ''}${wChange.toFixed(1)} kg esta semana.`);
      }
    }
  }

  return {
    period: {
      from: currentMonday.toISOString().slice(0, 10),
      to: currentSunday.toISOString().slice(0, 10),
    },
    currentWeek: current,
    previousWeek: previous,
    comparison,
    insights,
    weightProgress,
  };
};

module.exports = { generateWeeklyReport };
