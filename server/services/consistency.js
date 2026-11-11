/*
 * Consistency (pure, unit-tested): training days per calendar week (Monday →
 * Sunday) for the last 12 weeks, against the user's weekly goal
 * (User.weeklyFrequency), and the streak of weeks meeting it.
 *
 * Several sessions on the same day are one training day. The current week
 * never breaks a streak while it is still going on: it only adds to it once
 * the goal is met.
 */
const { addDays, weekBounds } = require('./progressDates');

const WEEKS = 12;

/* days: 'YYYY-MM-DD' training days (any order, duplicates allowed), whole history. */
function buildConsistency(days, { today, goal }) {
  const target = Math.min(7, Math.max(1, Math.round(goal || 3)));
  const unique = [...new Set(days)].sort();
  const currentMonday = weekBounds(today, 'UTC').current.from; // `today` is already the user's day
  const mondayOf = (d) => weekBounds(d, 'UTC').current.from;

  // Training days per week (whole history, for the streaks).
  const perWeek = new Map();
  for (const d of unique) {
    if (d > today) continue;
    const m = mondayOf(d);
    perWeek.set(m, (perWeek.get(m) || 0) + 1);
  }

  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const from = addDays(currentMonday, -(WEEKS - 1 - i) * 7);
    const count = perWeek.get(from) || 0;
    return { from, to: addDays(from, 6), days: count, met: count >= target, current: from === currentMonday };
  });

  // Current streak: completed weeks back from last week, plus this week if already met.
  let streak = 0;
  for (let m = addDays(currentMonday, -7); (perWeek.get(m) || 0) >= target; m = addDays(m, -7)) streak++;
  if ((perWeek.get(currentMonday) || 0) >= target) streak++;

  // Best streak in the whole history.
  let best = 0;
  if (perWeek.size) {
    const first = [...perWeek.keys()].sort()[0];
    let run = 0;
    for (let m = first; m <= currentMonday; m = addDays(m, 7)) {
      if ((perWeek.get(m) || 0) >= target) best = Math.max(best, ++run);
      else if (m !== currentMonday) run = 0;
    }
  }

  const totalDays = weeks.reduce((s, w) => s + w.days, 0);
  const weeksTrained = weeks.filter((w) => w.days > 0).length;
  const completed = weeks.filter((w) => !w.current);
  const weeksMet = completed.filter((w) => w.met).length;
  const thisWeek = weeks[weeks.length - 1];
  return {
    goal: target,
    weeks,
    totalDays,
    weeksTrained,
    weeksMet,
    completedWeeks: completed.length,
    perWeek: Math.round((totalDays / WEEKS) * 10) / 10,
    streak,
    bestStreak: Math.max(best, streak),
    thisWeek: { days: thisWeek.days, remaining: Math.max(0, target - thisWeek.days) },
  };
}

module.exports = { buildConsistency, WEEKS };
