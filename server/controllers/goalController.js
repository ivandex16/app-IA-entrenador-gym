const Goal = require('../models/Goal');

// GET /api/goals
exports.list = async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort('-createdAt');
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
      { new: true, runValidators: true }
    );
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
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
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/goals/ai-suggest  – Gemini-powered goal suggestions
exports.aiSuggest = async (req, res, next) => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ suggestions: getLocalSuggestions(req.body.context) });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const userContext = req.body.context || '';
    const existingGoals = await Goal.find({ user: req.user._id, isActive: true });
    const existingDesc = existingGoals.map(g => `${g.type}: ${g.description}`).join('; ');

    const prompt = `Eres un coach de fitness motivacional y experto. El usuario quiere establecer objetivos de entrenamiento.

Contexto del usuario: ${userContext || 'No especificado'}
Objetivos actuales: ${existingDesc || 'Ninguno'}

Genera exactamente 4 sugerencias de objetivos de fitness personalizados y motivadores. Cada sugerencia debe ser práctica y alcanzable.

Responde SOLO con un JSON válido (sin markdown, sin backticks), con esta estructura:
[{"type": "muscle_gain|fat_loss|endurance|toning|strength", "title": "título corto motivador", "description": "descripción detallada del objetivo (2-3 oraciones motivadoras)", "tip": "un consejo práctico para lograrlo"}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    let suggestions;
    try {
      suggestions = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      suggestions = getLocalSuggestions(userContext);
    }

    res.json({ suggestions, source: 'gemini' });
  } catch (err) {
    res.json({ suggestions: getLocalSuggestions(req.body.context), source: 'local' });
  }
};

function getLocalSuggestions() {
  return [
    { type: 'muscle_gain', title: '💪 Ganar masa muscular', description: 'Aumenta tu masa muscular con un programa de hipertrofia progresivo. Enfócate en ejercicios compuestos como sentadillas, press de banca y peso muerto.', tip: 'Consume 1.6-2.2g de proteína por kg de peso corporal al día.' },
    { type: 'fat_loss', title: '🔥 Quemar grasa', description: 'Reduce tu porcentaje de grasa corporal combinando entrenamiento de fuerza con cardio HIIT. Mantén un déficit calórico moderado y sostenible.', tip: 'Combina 3 días de pesas con 2 días de cardio HIIT de 20 minutos.' },
    { type: 'strength', title: '🏋️ Aumentar fuerza', description: 'Mejora tus marcas en los levantamientos principales. Trabaja con pesos altos y pocas repeticiones para maximizar la fuerza neuromuscular.', tip: 'Usa el esquema 5x5 en ejercicios compuestos y aumenta el peso un 2.5% cada semana.' },
    { type: 'endurance', title: '❤️ Mejorar resistencia', description: 'Aumenta tu capacidad cardiovascular y resistencia muscular. Entrena con series largas y descansos cortos para mejorar tu rendimiento general.', tip: 'Incluye circuitos de 4-5 ejercicios con 15-20 repeticiones y 30s de descanso.' },
  ];
}
