const Notification = require("../models/Notification");

async function createNotification(payload) {
  return Notification.create(payload);
}

async function notifyRoutineAssignment({ clientId, trainerName, routineName, assignmentId, routineId }) {
  return createNotification({
    user: clientId,
    type: "routine_assignment",
    title: "Nueva rutina asignada",
    message: `${trainerName} te asigno la rutina "${routineName}".`,
    entityType: "routine",
    entityId: routineId || null,
    meta: {
      assignmentId,
      routineId,
    },
  });
}

module.exports = {
  createNotification,
  notifyRoutineAssignment,
};
