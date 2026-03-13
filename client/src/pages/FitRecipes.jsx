import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import {
  LuChefHat,
  LuSparkles,
  LuShieldAlert,
  LuUtensils,
  LuFlame,
  LuDroplets,
  LuX,
  LuCalendarDays,
  LuBookmark,
  LuTrash2,
  LuEye,
  LuHistory,
} from 'react-icons/lu';

const OBJECTIVE_OPTIONS = [
  { value: 'fitness_general', label: 'Fitness general' },
  { value: 'muscle_gain', label: 'Ganancia muscular' },
  { value: 'fat_loss', label: 'Perdida de grasa' },
  { value: 'endurance', label: 'Resistencia' },
  { value: 'strength', label: 'Fuerza' },
];

const MEAL_TYPE_OPTIONS = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'cena', label: 'Cena' },
  { value: 'all', label: 'Las 3 comidas' },
];

const normalize = (v) =>
  String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export default function FitRecipes() {
  const [activeTab, setActiveTab] = useState('plan');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savingResult, setSavingResult] = useState(false);

  const [planForm, setPlanForm] = useState({
    objective: 'fitness_general',
    mealType: 'all',
    isWeekly: false,
    dietaryPreference: '',
    allergies: '',
    avoidFoods: '',
    cookingTime: '30 min',
    notes: '',
  });

  const [ingredientsForm, setIngredientsForm] = useState({
    objective: 'fitness_general',
    mealType: 'all',
    isWeekly: false,
    availableIngredients: '',
    cookingTime: '30 min',
    notes: '',
  });

  const loadSavedRecipes = async () => {
    setLoadingSaved(true);
    try {
      const { data } = await api.get('/recommendations/fit-recipes/saved');
      setSavedRecipes(data);
    } catch {
      toast.error('No se pudieron cargar las recetas guardadas');
    } finally {
      setLoadingSaved(false);
    }
  };

  useEffect(() => {
    loadSavedRecipes();
  }, []);

  const buildErrorMessage = (err) => {
    const status = err.response?.status;
    const apiMessage = err.response?.data?.message;
    if (status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente.';
    if (status === 404) return 'El endpoint no esta disponible. Reinicia backend.';
    if (status >= 500) return apiMessage || 'Error interno del servidor.';
    if (!err.response) return 'No hay conexion con el backend.';
    return apiMessage || 'No se pudo generar la recomendacion.';
  };

  const submitPlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/recommendations/fit-recipes/plan', {
        ...planForm,
        allergies: planForm.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        avoidFoods: planForm.avoidFoods.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setResult({ ...data, mode: 'plan', requestSnapshot: { ...planForm } });
      setShowResultOverlay(true);
      toast.success('Plan generado correctamente');
    } catch (err) {
      toast.error(buildErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitIngredients = async (e) => {
    e.preventDefault();
    if (!ingredientsForm.availableIngredients.trim()) {
      toast.error('Ingresa al menos un ingrediente.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/recommendations/fit-recipes/ingredients', {
        ...ingredientsForm,
        availableIngredients: ingredientsForm.availableIngredients
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setResult({ ...data, mode: 'ingredients', requestSnapshot: { ...ingredientsForm } });
      setShowResultOverlay(true);
      toast.success('Recetas por ingredientes generadas');
    } catch (err) {
      toast.error(buildErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const availableIngredientsList = ingredientsForm.availableIngredients
    .split(',')
    .map((s) => normalize(s))
    .filter(Boolean);

  const buildRecipeTitle = (data) => {
    const modeLabel = data.mode === 'ingredients' ? 'Recetas por ingredientes' : 'Plan nutricional';
    const objectiveLabel = OBJECTIVE_OPTIONS.find((opt) => opt.value === data.objective)?.label || data.objective || 'personalizado';
    return `${modeLabel} - ${objectiveLabel}`;
  };

  const handleSaveResult = async () => {
    if (!result) return;
    setSavingResult(true);
    try {
      const payload = {
        title: buildRecipeTitle(result),
        mode: result.mode,
        objective: result.objective,
        mealType: result.mealType,
        isWeekly: result.isWeekly,
        engine: result.engine,
        disclaimer: result.disclaimer,
        requestSnapshot: result.requestSnapshot || {},
        meals: result.meals || [],
        weeklyPlan: result.weeklyPlan || [],
        generalTips: result.generalTips || [],
        hydrationTips: result.hydrationTips || [],
      };
      const { data } = await api.post('/recommendations/fit-recipes/save', payload);
      setSavedRecipes((prev) => [data, ...prev]);
      setResult((prev) => ({ ...prev, savedId: data._id }));
      toast.success('Receta guardada correctamente');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar la receta');
    } finally {
      setSavingResult(false);
    }
  };

  const handleDeleteSaved = async (id) => {
    try {
      await api.delete(`/recommendations/fit-recipes/saved/${id}`);
      setSavedRecipes((prev) => prev.filter((item) => item._id !== id));
      toast.success('Receta guardada eliminada');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar la receta');
    }
  };

  const openSavedRecipe = (recipe) => {
    setResult(recipe);
    setShowResultOverlay(true);
  };

  const renderMealCard = (meal, idx, showIngredientMatch = false) => {
    const mealIngredients = (meal.ingredients || []).map((it) => ({
      raw: it,
      norm: normalize(it),
    }));
    const matched = mealIngredients
      .map((it) => it.raw)
      .filter((_, i) =>
        availableIngredientsList.some(
          (a) =>
            mealIngredients[i].norm.includes(a) ||
            a.includes(mealIngredients[i].norm),
        ),
      );
    const missing = mealIngredients
      .map((it) => it.raw)
      .filter((_, i) =>
        !availableIngredientsList.some(
          (a) =>
            mealIngredients[i].norm.includes(a) ||
            a.includes(mealIngredients[i].norm),
        ),
      );

    return (
      <article key={`${meal.name}-${idx}`} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
        {showIngredientMatch && availableIngredientsList.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs">
              <p className="text-emerald-300 font-semibold">Ingredientes que ya tienes</p>
              <p className="text-gray-300 mt-0.5">{matched.length ? matched.join(', ') : 'No coincide ninguno de forma directa.'}</p>
            </div>
            <div className="text-xs">
              <p className="text-amber-300 font-semibold">Ingredientes faltantes</p>
              <p className="text-gray-300 mt-0.5">{missing.length ? missing.join(', ') : 'No faltan ingredientes principales.'}</p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs uppercase text-primary font-semibold">{meal.mealType}</p>
          <h3 className="text-lg font-bold">{meal.name}</h3>
          <p className="text-sm text-gray-400 mt-1">{meal.whyFits}</p>
        </div>

        <div>
          <p className="text-sm font-semibold flex items-center gap-1"><LuUtensils className="w-4 h-4" /> Ingredientes</p>
          <ul className="text-sm text-gray-300 list-disc pl-5 mt-1 space-y-1">
            {(meal.ingredients || []).map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Preparacion</p>
          <ol className="text-sm text-gray-300 list-decimal pl-5 mt-1 space-y-1">
            {(meal.steps || []).map((it, i) => <li key={i}>{it}</li>)}
          </ol>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-700/60 rounded-md p-2">
            <p className="text-gray-400">Proteina</p>
            <p className="font-semibold">{meal.macros?.protein || '-'}</p>
          </div>
          <div className="bg-slate-700/60 rounded-md p-2">
            <p className="text-gray-400">Carbs</p>
            <p className="font-semibold">{meal.macros?.carbs || '-'}</p>
          </div>
          <div className="bg-slate-700/60 rounded-md p-2">
            <p className="text-gray-400">Grasas</p>
            <p className="font-semibold">{meal.macros?.fats || '-'}</p>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <section data-tour="fit-recipes-form" className="bg-slate-800 border border-slate-700 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <LuChefHat className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Alimentacion IA</h1>
            <p className="text-sm text-gray-400">Dos secciones: plan nutricional y recetas por ingredientes.</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-200 flex gap-2 items-start">
          <LuShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
          <p>La IA brinda orientacion general y no reemplaza a un profesional nutricionista.</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'plan' ? 'bg-primary text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
          >
            Plan de alimentacion
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ingredients')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'ingredients' ? 'bg-primary text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
          >
            Recetas por ingredientes
          </button>
        </div>

        {activeTab === 'plan' ? (
          <form onSubmit={submitPlan} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Objetivo</label>
              <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" value={planForm.objective} onChange={(e) => setPlanForm((p) => ({ ...p, objective: e.target.value }))}>
                {OBJECTIVE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Comida a solicitar</label>
              <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" value={planForm.mealType} onChange={(e) => setPlanForm((p) => ({ ...p, mealType: e.target.value }))}>
                {MEAL_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={planForm.isWeekly} onChange={(e) => setPlanForm((p) => ({ ...p, isWeekly: e.target.checked }))} />
                Quiero plan semanal
              </label>
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Preferencia alimentaria</label>
              <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" value={planForm.dietaryPreference} onChange={(e) => setPlanForm((p) => ({ ...p, dietaryPreference: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Tiempo max por receta</label>
              <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" value={planForm.cookingTime} onChange={(e) => setPlanForm((p) => ({ ...p, cookingTime: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Alergias (coma)</label>
              <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" value={planForm.allergies} onChange={(e) => setPlanForm((p) => ({ ...p, allergies: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Alimentos a evitar</label>
              <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" value={planForm.avoidFoods} onChange={(e) => setPlanForm((p) => ({ ...p, avoidFoods: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-300 block mb-1">Notas</label>
              <textarea rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 resize-none" value={planForm.notes} onChange={(e) => setPlanForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary py-3 rounded-xl font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
                <LuSparkles className="w-5 h-5" />
                {loading ? 'Generando plan...' : 'Generar plan de alimentacion'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitIngredients} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Objetivo</label>
              <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" value={ingredientsForm.objective} onChange={(e) => setIngredientsForm((p) => ({ ...p, objective: e.target.value }))}>
                {OBJECTIVE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Comida a solicitar</label>
              <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" value={ingredientsForm.mealType} onChange={(e) => setIngredientsForm((p) => ({ ...p, mealType: e.target.value }))}>
                {MEAL_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={ingredientsForm.isWeekly} onChange={(e) => setIngredientsForm((p) => ({ ...p, isWeekly: e.target.checked }))} />
                Quiero plan semanal con estos ingredientes
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-300 block mb-1">Ingredientes disponibles (separados por coma)</label>
              <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" placeholder="Ej: papa, carne de cerdo, cebolla" value={ingredientsForm.availableIngredients} onChange={(e) => setIngredientsForm((p) => ({ ...p, availableIngredients: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Tiempo max por receta</label>
              <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" value={ingredientsForm.cookingTime} onChange={(e) => setIngredientsForm((p) => ({ ...p, cookingTime: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Notas</label>
              <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" value={ingredientsForm.notes} onChange={(e) => setIngredientsForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary py-3 rounded-xl font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
                <LuSparkles className="w-5 h-5" />
                {loading ? 'Generando recetas...' : 'Generar recetas con mis ingredientes'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="bg-slate-800 border border-slate-700 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <LuHistory className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Recetas guardadas</h2>
            <p className="text-sm text-gray-400">Aqui puedes volver a ver los resultados que decidiste conservar.</p>
          </div>
        </div>

        {loadingSaved ? (
          <div className="text-sm text-gray-400">Cargando recetas guardadas...</div>
        ) : savedRecipes.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-sm text-gray-400">
            Aun no has guardado recetas. Genera una y usa el boton guardar.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {savedRecipes.map((recipe) => (
              <article key={recipe._id} className="bg-slate-900/70 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-primary">{recipe.mode === 'ingredients' ? 'Ingredientes' : 'Plan'}</p>
                    <h3 className="text-lg font-bold">{recipe.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(recipe.createdAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <span className="text-[11px] bg-slate-700 text-gray-300 px-2 py-1 rounded-lg">
                    {recipe.engine}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {recipe.isWeekly
                    ? `${recipe.weeklyPlan?.length || 0} dias guardados`
                    : `${recipe.meals?.length || 0} comidas guardadas`}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openSavedRecipe(recipe)}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold transition"
                  >
                    <LuEye className="w-4 h-4" />
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSaved(recipe._id)}
                    className="inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                  >
                    <LuTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {result && !showResultOverlay && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            type="button"
            onClick={() => setShowResultOverlay(true)}
            className="bg-primary hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-primary/25 transition"
          >
            Ver resultado generado
          </button>
        </div>
      )}

      {result && showResultOverlay && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setShowResultOverlay(false)}
            aria-label="Cerrar resultado"
          />

          <section className="absolute inset-3 md:inset-8 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-300">
                  Motor usado: <span className="font-semibold text-primary">{result.engine}</span>
                </p>
                <p className="text-xs text-amber-300 mt-0.5">{result.disclaimer}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveResult}
                  disabled={savingResult || Boolean(result.savedId || result._id)}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-semibold transition"
                >
                  <LuBookmark className="w-4 h-4" />
                  {result.savedId || result._id ? 'Guardada' : savingResult ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResultOverlay(false)}
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {result.isWeekly && Array.isArray(result.weeklyPlan) && result.weeklyPlan.length > 0 ? (
                <div className="space-y-3">
                  {result.weeklyPlan.map((day, dIdx) => (
                    <div key={`${day.day}-${dIdx}`} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <p className="font-semibold text-primary flex items-center gap-2"><LuCalendarDays className="w-4 h-4" /> {day.day}</p>
                      <div className="grid lg:grid-cols-2 gap-3 mt-3">
                        {(day.meals || []).map((meal, mIdx) => renderMealCard(meal, `${dIdx}-${mIdx}`, result.mode === 'ingredients'))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-4">
                  {(result.meals || []).map((meal, idx) =>
                    renderMealCard(meal, idx, result.mode === 'ingredients'),
                  )}
                </div>
              )}

              {Array.isArray(result.generalTips) && result.generalTips.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <p className="font-semibold mb-2 flex items-center gap-2"><LuFlame className="w-4 h-4 text-primary" /> Consejos</p>
                    <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                      {result.generalTips.map((tip, i) => <li key={i}>{tip}</li>)}
                    </ul>
                  </div>
                  {Array.isArray(result.hydrationTips) && result.hydrationTips.length > 0 && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <p className="font-semibold mb-2 flex items-center gap-2"><LuDroplets className="w-4 h-4 text-cyan-400" /> Hidratacion</p>
                      <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                        {result.hydrationTips.map((tip, i) => <li key={i}>{tip}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
