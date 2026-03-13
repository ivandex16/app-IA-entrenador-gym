const { GoogleGenerativeAI } = require("@google/generative-ai");
const { generateJsonWithOpenAI, getOpenAIConfig } = require("./openaiService");

const NUTRITION_DISCLAIMER =
  "Este contenido es orientativo y no reemplaza la evaluacion de un profesional en nutricion.";

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeList(values) {
  return toArray(values).map(normalizeText).filter(Boolean);
}

function buildRecipeCatalog() {
  return [
    {
      mealType: "desayuno",
      name: "Avena proteica con banana",
      objectives: ["muscle_gain", "endurance", "fitness_general"],
      ingredients: ["avena", "leche", "banana", "yogur griego"],
      steps: [
        "Cocina avena con leche.",
        "Agrega banana y yogur griego.",
      ],
      macros: { protein: "20-28 g", carbs: "45-60 g", fats: "8-12 g" },
      whyFits: "Buen balance de energia y proteina para iniciar el dia.",
    },
    {
      mealType: "desayuno",
      name: "Omelette de claras con espinaca y tomate",
      objectives: ["fat_loss", "strength", "fitness_general"],
      ingredients: ["claras", "huevo", "espinaca", "tomate"],
      steps: [
        "Saltea vegetales.",
        "Agrega huevo y claras batidas.",
      ],
      macros: { protein: "24-32 g", carbs: "8-14 g", fats: "10-14 g" },
      whyFits: "Alta proteina con buena saciedad.",
    },
    {
      mealType: "almuerzo",
      name: "Bowl de pollo con arroz y brocoli",
      objectives: ["muscle_gain", "strength", "fitness_general"],
      ingredients: ["pollo", "arroz", "brocoli", "ajo"],
      steps: [
        "Cocina pollo con especias.",
        "Sirve con arroz y brocoli.",
      ],
      macros: { protein: "35-45 g", carbs: "40-60 g", fats: "10-16 g" },
      whyFits: "Plato completo para rendimiento y recuperacion.",
    },
    {
      mealType: "almuerzo",
      name: "Ensalada de atun con garbanzos",
      objectives: ["fat_loss", "endurance", "fitness_general"],
      ingredients: ["atun", "garbanzos", "pepino", "tomate"],
      steps: [
        "Escurre atun y garbanzos.",
        "Mezcla con vegetales frescos.",
      ],
      macros: { protein: "28-35 g", carbs: "22-35 g", fats: "8-12 g" },
      whyFits: "Rapida, alta en proteina y fibra.",
    },
    {
      mealType: "almuerzo",
      name: "Cerdo magro salteado con papa y cebolla",
      objectives: ["muscle_gain", "fitness_general", "strength"],
      ingredients: ["carne de cerdo", "papa", "cebolla", "ajo"],
      steps: [
        "Cocina papa en cubos.",
        "Saltea cerdo magro con cebolla y ajo.",
        "Integra y ajusta condimentos.",
      ],
      macros: { protein: "30-40 g", carbs: "28-40 g", fats: "12-18 g" },
      whyFits: "Usa ingredientes comunes con buen aporte de energia y proteina.",
    },
    {
      mealType: "cena",
      name: "Salmon con papa y ensalada verde",
      objectives: ["strength", "endurance", "fitness_general"],
      ingredients: ["salmon", "papa", "lechuga", "pepino"],
      steps: [
        "Cocina salmon a la plancha.",
        "Hornea o cocina papa.",
        "Acompana con ensalada.",
      ],
      macros: { protein: "30-38 g", carbs: "25-35 g", fats: "15-22 g" },
      whyFits: "Proteina de calidad y grasas saludables.",
    },
    {
      mealType: "cena",
      name: "Bowl fit de cerdo, papa asada y vegetales",
      objectives: ["fitness_general", "fat_loss", "muscle_gain"],
      ingredients: ["carne de cerdo", "papa", "brocoli", "zanahoria"],
      steps: [
        "Asa papa al horno.",
        "Cocina cerdo magro a la plancha.",
        "Sirve con vegetales al vapor.",
      ],
      macros: { protein: "28-38 g", carbs: "25-35 g", fats: "10-16 g" },
      whyFits: "Cena completa y facil de ajustar por porciones.",
    },
    {
      mealType: "cena",
      name: "Tofu salteado con quinoa y vegetales",
      objectives: ["fitness_general", "fat_loss", "muscle_gain"],
      ingredients: ["tofu", "quinoa", "brocoli", "zanahoria"],
      steps: [
        "Cocina quinoa.",
        "Saltea tofu y vegetales.",
      ],
      macros: { protein: "24-32 g", carbs: "30-42 g", fats: "10-16 g" },
      whyFits: "Alternativa vegetal alta en proteina.",
    },
  ];
}

function pickRandom(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function rotatePick(items, count) {
  if (!items.length) return [];
  const start = Math.floor(Math.random() * items.length);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(items[(start + i) % items.length]);
  }
  return out;
}

function recipeHasIngredient(recipe, ingredient) {
  const ing = normalizeText(ingredient);
  return recipe.ingredients
    .map(normalizeText)
    .some((r) => r.includes(ing) || ing.includes(r));
}

function recipeOverlap(recipe, normalizedIngredients) {
  if (!normalizedIngredients.length) return 0;
  const matches = normalizedIngredients.filter((i) => recipeHasIngredient(recipe, i));
  return matches.length;
}

function mealTypesFromInput(mealType) {
  if (!mealType || mealType === "all") return ["desayuno", "almuerzo", "cena"];
  return [mealType];
}

function buildFallbackNutritionPlan(payload = {}) {
  const objective = payload.objective || "fitness_general";
  const mealType = payload.mealType || "all";
  const isWeekly = Boolean(payload.isWeekly);
  const catalog = buildRecipeCatalog();
  const targetMealTypes = mealTypesFromInput(mealType);

  const selectForMealType = (mt) => {
    const candidates = catalog.filter(
      (r) => r.mealType === mt && r.objectives.includes(objective),
    );
    if (candidates.length) return pickRandom(candidates);
    return pickRandom(catalog.filter((r) => r.mealType === mt)) || pickRandom(catalog);
  };

  if (isWeekly) {
    const weekDays = [
      "Lunes",
      "Martes",
      "Miercoles",
      "Jueves",
      "Viernes",
      "Sabado",
      "Domingo",
    ];
    const weeklyPlan = weekDays.map((day) => ({
      day,
      meals: targetMealTypes.map((mt) => selectForMealType(mt)),
    }));

    return {
      engine: "fallback_plan",
      objective,
      mealType,
      isWeekly,
      disclaimer: NUTRITION_DISCLAIMER,
      weeklyPlan,
      generalTips: [
        "Ajusta porciones segun tu hambre real y objetivo.",
        "Mantiene una base de proteina en cada comida.",
      ],
      hydrationTips: [
        "Bebe agua durante el dia y alrededor del entrenamiento.",
      ],
    };
  }

  const meals = targetMealTypes.map((mt) => selectForMealType(mt));
  return {
    engine: "fallback_plan",
    objective,
    mealType,
    isWeekly,
    disclaimer: NUTRITION_DISCLAIMER,
    meals,
    generalTips: [
      "Si quieres mas variedad, vuelve a generar y compara opciones.",
      "Ajusta porciones segun tu nivel de actividad.",
    ],
    hydrationTips: ["Mantente hidratado en todas las comidas."],
  };
}

function buildFallbackFromIngredients(payload = {}) {
  const objective = payload.objective || "fitness_general";
  const mealType = payload.mealType || "all";
  const isWeekly = Boolean(payload.isWeekly);
  const rawIngredients = toArray(payload.availableIngredients);
  const normalizedIngredients = normalizeList(rawIngredients);
  const catalog = buildRecipeCatalog();
  const targetMealTypes = mealTypesFromInput(mealType);

  const matchedByOverlap = catalog
    .map((recipe) => ({
      recipe,
      overlap: recipeOverlap(recipe, normalizedIngredients),
    }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .map((x) => x.recipe);

  const selected = [];
  const used = new Set();
  for (const mt of targetMealTypes) {
    const pool = matchedByOverlap.filter((r) => r.mealType === mt && !used.has(r.name));
    const pick = pool[0] || matchedByOverlap.find((r) => !used.has(r.name));
    if (pick) {
      selected.push(pick);
      used.add(pick.name);
    }
  }

  // If still not enough, build dynamic recipes directly from user ingredients.
  const dynamicRecipe = (mt, idx) => ({
    mealType: mt,
    name: `${mt} con ${rawIngredients[idx % rawIngredients.length] || "ingredientes disponibles"}`,
    objectives: [objective],
    ingredients: [
      rawIngredients[idx % rawIngredients.length] || "ingrediente base",
      rawIngredients[(idx + 1) % rawIngredients.length] || "ingrediente complementario",
      "sal",
      "pimienta",
    ],
    steps: [
      "Prepara y corta los ingredientes principales.",
      "Cocina a fuego medio con poca grasa.",
      "Ajusta condimentos y porcion.",
    ],
    macros: { protein: "20-35 g", carbs: "20-45 g", fats: "8-16 g" },
    whyFits: "Receta ajustada segun los ingredientes que tienes en casa.",
  });

  while (selected.length < targetMealTypes.length && rawIngredients.length > 0) {
    const mt = targetMealTypes[selected.length];
    selected.push(dynamicRecipe(mt, selected.length));
  }

  if (isWeekly) {
    const weekDays = [
      "Lunes",
      "Martes",
      "Miercoles",
      "Jueves",
      "Viernes",
      "Sabado",
      "Domingo",
    ];
    return {
      engine: "fallback_ingredients",
      objective,
      mealType,
      isWeekly,
      disclaimer: NUTRITION_DISCLAIMER,
      weeklyPlan: weekDays.map((day, idx) => ({
        day,
        meals:
          selected.length > 0
            ? rotatePick(selected, targetMealTypes.length)
            : [dynamicRecipe(targetMealTypes[0], idx)],
      })),
      generalTips: [
        "Se priorizaron recetas con tus ingredientes disponibles.",
      ],
    };
  }

  return {
    engine: "fallback_ingredients",
    objective,
    mealType,
    isWeekly,
    disclaimer: NUTRITION_DISCLAIMER,
    meals: selected,
    generalTips: [
      "Se priorizaron recetas con tus ingredientes disponibles.",
    ],
  };
}

async function generateNutritionPlanWithAI(user, payload = {}) {
  const objective = payload.objective || "fitness_general";
  const mealType = payload.mealType || "all";
  const isWeekly = Boolean(payload.isWeekly);
  const dietaryPreference = payload.dietaryPreference || "sin preferencia";
  const allergies = toArray(payload.allergies);
  const avoidFoods = toArray(payload.avoidFoods);
  const cookingTime = payload.cookingTime || "30 min";

  const prompt = `Eres un asistente de alimentacion fitness.
Usuario:
- Nivel: ${user?.level || "intermedio"}
- Objetivo: ${objective}
- Tipo de comida solicitada: ${mealType}
- Plan semanal: ${isWeekly ? "si" : "no"}
- Preferencia alimentaria: ${dietaryPreference}
- Alergias: ${allergies.join(", ") || "ninguna"}
- Evitar alimentos: ${avoidFoods.join(", ") || "ninguno"}
- Tiempo maximo por receta: ${cookingTime}
- Semilla de variedad: ${Date.now() % 100000}

Reglas:
1) Responde SOLO JSON valido.
2) Si plan semanal=si, entrega 7 dias.
3) Si tipo de comida=all, usa desayuno+almuerzo+cena.
4) Incluye ingredientes, pasos, macros, y por que encaja.
5) Incluye disclaimer de que no reemplaza nutricionista.

Formato JSON:
{
  "objective":"string",
  "mealType":"desayuno|almuerzo|cena|all",
  "isWeekly": true|false,
  "disclaimer":"string",
  "meals":[{"mealType":"string","name":"string","whyFits":"string","ingredients":["string"],"steps":["string"],"macros":{"protein":"string","carbs":"string","fats":"string"}}],
  "weeklyPlan":[{"day":"string","meals":[{"mealType":"string","name":"string","whyFits":"string","ingredients":["string"],"steps":["string"],"macros":{"protein":"string","carbs":"string","fats":"string"}}]}],
  "generalTips":["string"],
  "hydrationTips":["string"]
}`;

  try {
    let parsed = null;
    if (getOpenAIConfig()) {
      parsed = await generateJsonWithOpenAI({
        systemPrompt:
          "Eres un asistente de alimentacion fitness. Debes responder siempre JSON valido y util.",
        userPrompt: prompt,
        temperature: 0.6,
      });
    } else {
      const model = getGeminiModel();
      if (!model) return buildFallbackNutritionPlan(payload);
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON invalido");
      parsed = JSON.parse(jsonMatch[0]);
    }

    return {
      engine: getOpenAIConfig() ? "openai_plan" : "gemini_plan",
      objective: parsed.objective || objective,
      mealType: parsed.mealType || mealType,
      isWeekly: typeof parsed.isWeekly === "boolean" ? parsed.isWeekly : isWeekly,
      disclaimer: parsed.disclaimer || NUTRITION_DISCLAIMER,
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      weeklyPlan: Array.isArray(parsed.weeklyPlan) ? parsed.weeklyPlan : [],
      generalTips: Array.isArray(parsed.generalTips) ? parsed.generalTips : [],
      hydrationTips: Array.isArray(parsed.hydrationTips)
        ? parsed.hydrationTips
        : [],
    };
  } catch (_err) {
    const model = getGeminiModel();
    if (!getOpenAIConfig() || !model) return buildFallbackNutritionPlan(payload);
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON invalido");
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        engine: "gemini_plan",
        objective: parsed.objective || objective,
        mealType: parsed.mealType || mealType,
        isWeekly: typeof parsed.isWeekly === "boolean" ? parsed.isWeekly : isWeekly,
        disclaimer: parsed.disclaimer || NUTRITION_DISCLAIMER,
        meals: Array.isArray(parsed.meals) ? parsed.meals : [],
        weeklyPlan: Array.isArray(parsed.weeklyPlan) ? parsed.weeklyPlan : [],
        generalTips: Array.isArray(parsed.generalTips) ? parsed.generalTips : [],
        hydrationTips: Array.isArray(parsed.hydrationTips)
          ? parsed.hydrationTips
          : [],
      };
    } catch (_geminiErr) {
      return buildFallbackNutritionPlan(payload);
    }
  }
}

async function generateIngredientRecipesWithAI(user, payload = {}) {
  const ingredients = toArray(payload.availableIngredients);
  if (!ingredients.length) {
    return {
      engine: "validation",
      disclaimer: NUTRITION_DISCLAIMER,
      message: "Debes ingresar al menos un ingrediente para esta seccion.",
      meals: [],
      weeklyPlan: [],
      generalTips: [],
    };
  }

  const objective = payload.objective || "fitness_general";
  const mealType = payload.mealType || "all";
  const isWeekly = Boolean(payload.isWeekly);
  const cookingTime = payload.cookingTime || "30 min";
  const notes = payload.notes || "";

  const prompt = `Eres un asistente de recetas fit por ingredientes.
Usuario:
- Objetivo: ${objective}
- Tipo de comida solicitada: ${mealType}
- Plan semanal: ${isWeekly ? "si" : "no"}
- Ingredientes disponibles: ${ingredients.join(", ")}
- Tiempo maximo por receta: ${cookingTime}
- Notas: ${notes || "ninguna"}
- Semilla de variedad: ${Date.now() % 100000}

Reglas:
1) Usa principalmente los ingredientes disponibles.
2) Puedes agregar maximo 2 ingredientes extra por receta.
3) Incluye ingredientes, pasos, macros y por que encaja.
4) Si plan semanal=si entrega 7 dias.
5) Responde SOLO JSON valido.

Formato JSON:
{
  "objective":"string",
  "mealType":"desayuno|almuerzo|cena|all",
  "isWeekly": true|false,
  "disclaimer":"string",
  "meals":[{"mealType":"string","name":"string","whyFits":"string","ingredients":["string"],"steps":["string"],"macros":{"protein":"string","carbs":"string","fats":"string"}}],
  "weeklyPlan":[{"day":"string","meals":[{"mealType":"string","name":"string","whyFits":"string","ingredients":["string"],"steps":["string"],"macros":{"protein":"string","carbs":"string","fats":"string"}}]}],
  "generalTips":["string"]
}`;

  try {
    let parsed = null;
    if (getOpenAIConfig()) {
      parsed = await generateJsonWithOpenAI({
        systemPrompt:
          "Eres un asistente de recetas fitness. Debes responder siempre JSON valido y priorizar los ingredientes dados.",
        userPrompt: prompt,
        temperature: 0.7,
      });
    } else {
      const model = getGeminiModel();
      if (!model) return buildFallbackFromIngredients(payload);
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON invalido");
      parsed = JSON.parse(jsonMatch[0]);
    }

    return {
      engine: getOpenAIConfig() ? "openai_ingredients" : "gemini_ingredients",
      objective: parsed.objective || objective,
      mealType: parsed.mealType || mealType,
      isWeekly: typeof parsed.isWeekly === "boolean" ? parsed.isWeekly : isWeekly,
      disclaimer: parsed.disclaimer || NUTRITION_DISCLAIMER,
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      weeklyPlan: Array.isArray(parsed.weeklyPlan) ? parsed.weeklyPlan : [],
      generalTips: Array.isArray(parsed.generalTips) ? parsed.generalTips : [],
    };
  } catch (_err) {
    const model = getGeminiModel();
    if (!getOpenAIConfig() || !model) return buildFallbackFromIngredients(payload);
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON invalido");
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        engine: "gemini_ingredients",
        objective: parsed.objective || objective,
        mealType: parsed.mealType || mealType,
        isWeekly: typeof parsed.isWeekly === "boolean" ? parsed.isWeekly : isWeekly,
        disclaimer: parsed.disclaimer || NUTRITION_DISCLAIMER,
        meals: Array.isArray(parsed.meals) ? parsed.meals : [],
        weeklyPlan: Array.isArray(parsed.weeklyPlan) ? parsed.weeklyPlan : [],
        generalTips: Array.isArray(parsed.generalTips) ? parsed.generalTips : [],
      };
    } catch (_geminiErr) {
      return buildFallbackFromIngredients(payload);
    }
  }
}

module.exports = {
  generateNutritionPlanWithAI,
  generateIngredientRecipesWithAI,
  NUTRITION_DISCLAIMER,
};
