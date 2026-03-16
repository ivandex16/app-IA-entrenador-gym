const CoachingAssignment = require("../models/CoachingAssignment");
const Notification = require("../models/Notification");
const { notifyRoutineReminder } = require("./notificationService");

let timer = null;
let running = false;

const WEEKDAY_ALIASES = {
  sunday: 0,
  domingo: 0,
  monday: 1,
  lunes: 1,
  tuesday: 2,
  martes: 2,
  wednesday: 3,
  miercoles: 3,
  miércoles: 3,
  thursday: 4,
  jueves: 4,
  friday: 5,
  viernes: 5,
  saturday: 6,
  sabado: 6,
  sábado: 6,
};

function shouldRunReminder(reminder, now) {
  if (!reminder?.enabled || !reminder.weekday || !reminder.time) return false;

  const weekday = WEEKDAY_ALIASES[String(reminder.weekday).trim().toLowerCase()];
  if (weekday === undefined || weekday !== now.getDay()) return false;

  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return currentTime === String(reminder.time).slice(0, 5);
}

async function reminderAlreadySentToday(assignmentId, now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const existing = await Notification.findOne({
    "meta.assignmentId": assignmentId,
    "meta.reminder": true,
    createdAt: { $gte: start, $lte: end },
  }).select("_id");

  return Boolean(existing);
}

async function runReminderSweep() {
  if (running) return;
  running = true;

  try {
    const now = new Date();
    const assignments = await CoachingAssignment.find({
      status: "active",
      "reminder.enabled": true,
    }).select("client routine title reminder");

    for (const assignment of assignments) {
      if (!shouldRunReminder(assignment.reminder, now)) continue;
      if (await reminderAlreadySentToday(assignment._id, now)) continue;

      await notifyRoutineReminder({
        clientId: assignment.client,
        routineName: assignment.title,
        assignmentId: assignment._id,
        routineId: assignment.routine,
        customMessage: assignment.reminder.message,
      });
    }
  } catch (error) {
    console.error("[reminders]", error.message);
  } finally {
    running = false;
  }
}

function startReminderScheduler() {
  if (timer) return timer;
  timer = setInterval(runReminderSweep, 60 * 1000);
  setTimeout(runReminderSweep, 8000);
  return timer;
}

module.exports = {
  startReminderScheduler,
  runReminderSweep,
};
