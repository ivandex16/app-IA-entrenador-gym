require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Exercise = require("../models/Exercise");

const MUSCLE_LABEL = {
  chest: "pecho",
  back: "espalda",
  shoulders: "hombros",
  biceps: "biceps",
  triceps: "triceps",
  legs: "piernas",
  glutes: "gluteos",
  abs: "abdomen",
  forearms: "antebrazos",
  calves: "pantorrillas",
  full_body: "cuerpo completo",
  cardio: "cardio",
};

const EQUIPMENT_LABEL = {
  barbell: "barra",
  dumbbell: "mancuernas",
  machine: "maquina",
  cable: "polea",
  bodyweight: "peso corporal",
  kettlebell: "kettlebell",
  band: "banda elastica",
  other: "equipamiento funcional",
};

function normalizeName(name) {
  return String(name || "")
    .replace(/\s+[–—-]\s*$/g, "")
    .replace(/^\s*[-•]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function defaultDescription(ex) {
  const muscle = MUSCLE_LABEL[ex.muscleGroup] || "fuerza general";
  const equip = EQUIPMENT_LABEL[ex.equipment] || "equipamiento de gimnasio";
  const name = normalizeName(ex.name) || "este ejercicio";
  return `${name} es un ejercicio orientado a trabajar ${muscle} utilizando ${equip}. Se recomienda enfocarse en la tecnica, controlar la fase de bajada y progresar la carga de forma gradual.`;
}

function defaultInstructions(ex) {
  const name = normalizeName(ex.name) || "el ejercicio";
  return [
    `Adopta una posicion inicial estable para ${name}, activando abdomen y gluteos.`,
    "Ejecuta el movimiento principal con control, respirando de forma constante.",
    "Regresa a la posicion inicial sin perder postura y repite manteniendo buena tecnica.",
  ];
}

function defaultTips(ex) {
  const muscle = MUSCLE_LABEL[ex.muscleGroup] || "grupo objetivo";
  return [
    `Prioriza la tecnica y el rango de movimiento para estimular mejor ${muscle}.`,
    "Empieza con peso moderado y aumenta progresivamente cuando controles el movimiento.",
  ];
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const all = await Exercise.find({});
  let updated = 0;

  for (const ex of all) {
    let touched = false;

    if (!String(ex.description || "").trim()) {
      ex.description = defaultDescription(ex);
      touched = true;
    }

    if (!Array.isArray(ex.instructions) || ex.instructions.length === 0) {
      ex.instructions = defaultInstructions(ex);
      touched = true;
    }

    if (!Array.isArray(ex.tips) || ex.tips.length === 0) {
      ex.tips = defaultTips(ex);
      touched = true;
    }

    if (touched) {
      await ex.save();
      updated++;
    }
  }

  const remainingDescription = await Exercise.countDocuments({
    $or: [{ description: "" }, { description: null }],
  });
  const remainingInstructions = await Exercise.countDocuments({
    $or: [{ instructions: { $exists: false } }, { instructions: { $size: 0 } }],
  });
  const remainingTips = await Exercise.countDocuments({
    $or: [{ tips: { $exists: false } }, { tips: { $size: 0 } }],
  });

  console.log(
    JSON.stringify(
      {
        total: all.length,
        updated,
        remainingDescription,
        remainingInstructions,
        remainingTips,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("backfillExerciseContent error:", err);
  process.exit(1);
});

