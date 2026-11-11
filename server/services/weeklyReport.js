const WorkoutLog = require("../models/WorkoutLog");
const { LEGACY_COMPLETED_FILTER } = require("../constants/workoutStatus");
const WeightLog = require("../models/WeightLog");
const Goal = require("../models/Goal");
const { dayKey, queryWindow, inRange, safeTimeZone, periodRanges } = require("./progressDates");
const { summarize, compare, summarySentence, baseInsights } = require("./progressSummary");

/**
 * Progress report for the authenticated user, in the user's time zone
 * (`tz`, IANA name sent by the browser).
 *
 * period: 'week' (Monday → today vs the same days of last week),
 *         '4w' / '12w' (last 28 / 84 days vs the 28 / 84 days before).
 *
 * Returns: { period, summary, currentWeek, previousWeek, comparison, timeline,
 *            insights, weightProgress }
 * `currentWeek` / `previousWeek` keep their names (Inicio reads them) but hold
 * the current and the compared range of the chosen period.
 */
const generateWeeklyReport = async (userId, referenceDate = new Date(), tz = "UTC", periodType = "week") => {
  const zone = safeTimeZone(tz);
  const p = periodRanges(periodType, referenceDate, zone);

  // ── Sessions (wide window, then exact calendar days in the user's zone) ──
  const window = queryWindow(p.previous.from, p.current.to);
  const logs = await WorkoutLog.find({
    user: userId,
    date: window,
    ...LEGACY_COMPLETED_FILTER,
  }).populate("exercises.exercise", "name muscleGroup");
  const withDay = logs.map((l) => ({ log: l, day: dayKey(l.date, zone) }));
  const currentLogs = withDay.filter((x) => inRange(x.day, p.current)).map((x) => x.log);
  const previousLogs = withDay.filter((x) => inRange(x.day, p.previous)).map((x) => x.log);

  const current = summarize(currentLogs);
  const previous = summarize(previousLogs);
  const comparison = compare(current, previous);

  // ── Chart: days of the week, or 7-day blocks ──
  const timeline = p.buckets.map((b) => {
    const t = summarize(withDay.filter((x) => inRange(x.day, b)).map((x) => x.log));
    return { from: b.from, to: b.to, label: b.label, future: Boolean(b.future), workouts: t.workouts, volume: t.totalVolume, sets: t.totalSets };
  });

  const insights = baseInsights(p.type, p.daysElapsed, current);

  // ── Body weight: last entry of each range ──
  const allWeightLogs = await WeightLog.find({ user: userId, date: window }).sort("date");
  const weightLogs = allWeightLogs.filter((l) => inRange(dayKey(l.date, zone), p.current));
  const prevWeightLogs = allWeightLogs.filter((l) => inRange(dayKey(l.date, zone), p.previous));

  let weightProgress = null;
  if (weightLogs.length > 0 || prevWeightLogs.length > 0) {
    const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;
    const prevWeight = prevWeightLogs.length > 0 ? prevWeightLogs[prevWeightLogs.length - 1].weight : null;

    weightProgress = {
      currentWeekWeight: latestWeight,
      previousWeekWeight: prevWeight,
      change: latestWeight != null && prevWeight != null ? +(latestWeight - prevWeight).toFixed(1) : null,
      entries: weightLogs.length,
    };

    if (latestWeight != null && prevWeight != null) {
      const wChange = latestWeight - prevWeight;
      const when = p.type === "week" ? "esta semana" : "en este periodo";
      const activeGoal = await Goal.findOne({ user: userId, isActive: true }).sort("-createdAt");
      const goalType = activeGoal?.type;

      if (goalType === "fat_loss" || goalType === "toning") {
        if (wChange < 0) insights.push(`⚖️ Peso bajó ${Math.abs(wChange).toFixed(1)} kg ${when}. ¡Buen progreso!`);
        else if (wChange > 0) insights.push(`⚖️ Peso subió ${wChange.toFixed(1)} kg ${when}. Revisa tu alimentación.`);
      } else if (goalType === "muscle_gain" || goalType === "strength") {
        if (wChange > 0) insights.push(`⚖️ Peso subió ${wChange.toFixed(1)} kg ${when}. ¡Buen progreso!`);
        else if (wChange < 0) insights.push(`⚖️ Peso bajó ${Math.abs(wChange).toFixed(1)} kg. Asegúrate de comer suficiente.`);
      } else if (wChange !== 0) {
        insights.push(`⚖️ Cambio de peso: ${wChange > 0 ? "+" : ""}${wChange.toFixed(1)} kg ${when}.`);
      }
    }
  }

  return {
    period: {
      type: p.type,
      from: p.display.from,
      to: p.display.to,
      today: p.today,
      current: p.current,
      previous: p.previous,
    },
    summary: summarySentence(p.type, current, previous, comparison),
    currentWeek: current,
    previousWeek: previous,
    comparison,
    timeline,
    insights,
    weightProgress,
  };
};

module.exports = { generateWeeklyReport };
