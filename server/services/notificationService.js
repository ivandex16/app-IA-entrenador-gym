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

async function notifyCoachComment({
  clientId,
  authorName,
  routineName,
  assignmentId,
  routineId,
}) {
  return createNotification({
    user: clientId,
    type: "system",
    title: "Nuevo comentario del entrenador",
    message: `${authorName} dejo una observacion en la rutina "${routineName}".`,
    entityType: "routine",
    entityId: routineId || null,
    meta: {
      assignmentId,
      routineId,
    },
  });
}

async function notifyAssignmentStatusChange({
  clientId,
  status,
  routineName,
  assignmentId,
  routineId,
}) {
  const labels = {
    active: "activa",
    completed: "completada",
    archived: "archivada",
  };

  return createNotification({
    user: clientId,
    type: "system",
    title: "Actualizacion de rutina",
    message: `Tu rutina "${routineName}" ahora esta ${labels[status] || status}.`,
    entityType: "routine",
    entityId: routineId || null,
    meta: {
      assignmentId,
      routineId,
      status,
    },
  });
}

async function notifyRoutineReminder({
  clientId,
  routineName,
  assignmentId,
  routineId,
  customMessage,
}) {
  return createNotification({
    user: clientId,
    type: "system",
    title: "Recordatorio de entrenamiento",
    message: customMessage || `Tienes programada la rutina "${routineName}" para hoy.`,
    entityType: "routine",
    entityId: routineId || null,
    meta: {
      assignmentId,
      routineId,
      reminder: true,
    },
  });
}

module.exports = {
  createNotification,
  notifyRoutineAssignment,
  notifyCoachComment,
  notifyAssignmentStatusChange,
  notifyRoutineReminder,
};
