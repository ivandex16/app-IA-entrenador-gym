const Goal = require("../models/Goal");
const {
  generateJsonWithOpenAI,
  getOpenAIConfig,
} = require("../services/openaiService");

// GET /api/goals
exports.list = async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort("-createdAt");
    res.json(goals);
  } catch (err) {
    next(err);
  }
};

// POST /api/goals
exports.create = async (req, res, next) => {
  try {
    const goal = await Goal.create({ ...req.body, user: req.user._id });
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
};

// PUT /api/goals/:id
exports.update = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.json(goal);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/goals/:id
exports.remove = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.json({ message: "Goal deleted" });
  } catch (err) {
    next(err);
  }
};

// POST /api/goals/ai-suggest
exports.aiSuggest = async (req, res) => {
  try {
    const userContext = req.body.context || "";
    const existingGoals = await Goal.find({ user: req.user._id, isActive: true });
    const existingDesc = existingGoals
      .map((g) => `${g.type}: ${g.description}`)
      .join("; ");

    const prompt = `Eres un coach de fitness motivacional y experto. El usuario quiere establecer objetivos de entrenamiento.

Contexto del usuario: ${userContext || "No especificado"}
Objetivos actuales: ${existingDesc || "Ninguno"}

Genera exactamente 4 sugerencias de objetivos de fitness personalizados y motivadores. Cada sugerencia debe ser practica y alcanzable.

Responde SOLO con JSON valido con esta estructura:
{
  "suggestions": [
    {
      "type": "muscle_gain|fat_loss|endurance|toning|strength",
      "title": "titulo corto motivador",
      "description": "descripcion detallada del objetivo (2-3 oraciones motivadoras)",
      "tip": "un consejo practico para lograrlo"
    }
  ]
}`;

    if (getOpenAIConfig()) {
      try {
        const parsed = await generateJsonWithOpenAI({
          systemPrompt:
            "Eres un coach fitness. Debes responder siempre JSON valido en el formato solicitado.",
          userPrompt: prompt,
          temperature: 0.7,
        });
        const suggestions = Array.isArray(parsed?.suggestions)
          ? parsed.suggestions
          : getLocalSuggestions(userContext);
        return res.json({ suggestions, source: "openai" });
      } catch (_openaiErr) {
        return res.json({
          suggestions: getLocalSuggestions(userContext),
          source: "local",
        });
      }
    }

    res.json({ suggestions: getLocalSuggestions(userContext), source: "local" });
  } catch (_err) {
    res.json({ suggestions: getLocalSuggestions(req.body.context), source: "local" });
  }
};

function getLocalSuggestions() {
  return [
    {
      type: "muscle_gain",
      title: "Ganar masa muscular",
      description:
        "Aumenta tu masa muscular con un programa de hipertrofia progresivo. Enfocate en ejercicios compuestos y constancia semanal.",
      tip: "Consume entre 1.6 y 2.2 g de proteina por kg de peso corporal al dia.",
    },
    {
      type: "fat_loss",
      title: "Reducir grasa corporal",
      description:
        "Baja tu porcentaje de grasa combinando entrenamiento de fuerza con cardio inteligente. Busca un deficit calorico moderado y sostenible.",
      tip: "Combina 3 dias de pesas con 2 sesiones cortas de cardio de alta intensidad.",
    },
    {
      type: "strength",
      title: "Aumentar fuerza",
      description:
        "Mejora tus marcas en movimientos principales con trabajo estructurado. Enfocate en tecnica, descanso y progresion de cargas.",
      tip: "Usa esquemas como 5x5 en ejercicios compuestos y sube peso gradualmente.",
    },
    {
      type: "endurance",
      title: "Mejorar resistencia",
      description:
        "Aumenta tu capacidad cardiovascular y la resistencia muscular con sesiones dinamicas. Prioriza volumen de trabajo y descansos controlados.",
      tip: "Incluye circuitos de 4 a 5 ejercicios con 15-20 repeticiones y descansos cortos.",
    },
  ];
}
