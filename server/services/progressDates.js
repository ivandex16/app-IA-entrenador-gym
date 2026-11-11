/*
 * Calendar days and weeks in the user's time zone for the progress report.
 *
 * Same rule as GET /api/workouts/summary and the client's workoutDisplayDate:
 * sessions saved before times were stored (exactly 00:00:00.000 UTC) keep
 * their UTC calendar day; every other date is read in the user's zone. So a
 * workout on Sunday 21:00 in Bogotá (Monday 02:00 UTC) stays on Sunday.
 */

/* Valid IANA time zone or UTC. */
function safeTimeZone(tz) {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

const formatters = new Map();
function ymdIn(date, tz) {
  if (!formatters.has(tz)) {
    formatters.set(tz, new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }));
  }
  return formatters.get(tz).format(date); // en-CA → YYYY-MM-DD
}

const isLegacyMidnight = (d) => d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;

/* 'YYYY-MM-DD' of a stored date, as the user sees it. */
function dayKey(date, tz) {
  const d = new Date(date);
  return isLegacyMidnight(d) ? d.toISOString().slice(0, 10) : ymdIn(d, tz);
}

/* Day arithmetic on 'YYYY-MM-DD' strings (calendar days, no time zone involved). */
function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const weekday = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday 0 … Sunday 6
};

/*
 * Current and previous week (Monday–Sunday) around `ref` in `tz`.
 * `ref` may be a Date or a 'YYYY-MM-DD' local day.
 */
function weekBounds(ref, tz) {
  const today = typeof ref === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ref) ? ref : ymdIn(new Date(ref || Date.now()), tz);
  const monday = addDays(today, -weekday(today));
  return {
    today,
    current: { from: monday, to: addDays(monday, 6) },
    previous: { from: addDays(monday, -7), to: addDays(monday, -1) },
  };
}

/*
 * Wide UTC window that surely contains every stored date whose day falls in
 * [fromYmd, toYmd] for any zone (±14 h) — filter precisely with dayKey after.
 */
function queryWindow(fromYmd, toYmd) {
  return { $gte: new Date(`${addDays(fromYmd, -1)}T00:00:00.000Z`), $lt: new Date(`${addDays(toYmd, 2)}T00:00:00.000Z`) };
}

const inRange = (ymd, range) => ymd >= range.from && ymd <= range.to;

const PERIODS = ['week', '4w', '12w'];
const dayLabel = (ymd) => ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][weekday(ymd)];

/*
 * Ranges compared fairly, ending today in the user's zone:
 *  - week: Monday → today vs the same weekdays of the previous week
 *          (on a Tuesday, Mon–Tue vs last Mon–Tue, never a full week);
 *  - 4w / 12w: the last 28 / 84 days vs the 28 / 84 days before.
 * `buckets` split the current range for the chart: days of the week, or
 * 7-day blocks (oldest first) ending today.
 */
function periodRanges(type, ref, tz) {
  const period = PERIODS.includes(type) ? type : 'week';
  const { today, current: week } = weekBounds(ref, tz);
  if (period === 'week') {
    const elapsed = weekday(today); // 0 on Monday
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(week.from, i);
      return { from: day, to: day, label: dayLabel(day), future: day > today };
    });
    return {
      type: period,
      today,
      current: { from: week.from, to: today },
      previous: { from: addDays(week.from, -7), to: addDays(today, -7) },
      display: { from: week.from, to: week.to },
      daysElapsed: elapsed + 1,
      buckets,
    };
  }
  const weeks = period === '4w' ? 4 : 12;
  const from = addDays(today, -(weeks * 7 - 1));
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const b = addDays(from, i * 7);
    return { from: b, to: addDays(b, 6), label: b };
  });
  return {
    type: period,
    today,
    current: { from, to: today },
    previous: { from: addDays(from, -weeks * 7), to: addDays(from, -1) },
    display: { from, to: today },
    daysElapsed: weeks * 7,
    buckets,
  };
}

module.exports = { safeTimeZone, dayKey, addDays, weekBounds, queryWindow, inRange, periodRanges, PERIODS };
