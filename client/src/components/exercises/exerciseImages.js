/*
 * Exercise images and video helpers, shared by the catalog, the detail page and
 * the routine picker.
 *
 * Strategy: a light image for recognition everywhere (own thumbnail/image, or a
 * known free-exercise-db picture for the classic exercises), and the YouTube
 * video only in the detail/preview, loaded when the user presses play.
 * A generic picture of another exercise is never shown as if it were this one:
 * without a real image the UI shows a clean placeholder.
 */

/* ─── Exercise CDN & Fallback Illustrations (free-exercise-db) ─── */
const FREE_EXERCISE_CDN = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';
const cdn = (id) => `${FREE_EXERCISE_CDN}/${id}/0.jpg`;

/* Ilustraciones anatómicas limpias por grupo muscular (fallbacks de alta precisión) */
const MUSCLE_FALLBACK_IMAGES = {
  chest: cdn('Barbell_Bench_Press_-_Medium_Grip'),
  back: cdn('Pullups'),
  shoulders: cdn('Side_Lateral_Raise'),
  biceps: cdn('Barbell_Curl'),
  triceps: cdn('Triceps_Pushdown'),
  legs: cdn('Barbell_Full_Squat'),
  glutes: cdn('Barbell_Hip_Thrust'),
  abs: cdn('Ab_Crunch_Machine'),
  forearms: cdn('Palms-Down_Wrist_Curl_Over_A_Bench'),
  calves: cdn('Standing_Calf_Raises'),
  full_body: cdn('Clean_and_Press'),
  cardio: cdn('Freehand_Jump_Squat'),
};

export function normalizeExerciseText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const EXERCISE_PATTERNS = [
  // Antebrazos (prioritario antes de curl general)
  { pattern: /curl.*muneca|wrist.*curl/, url: cdn('Palms-Down_Wrist_Curl_Over_A_Bench') },
  { pattern: /farmer|granjero/, url: cdn('Farmers_Walk') },

  // Pecho / Chest
  { pattern: /press.*declinado/, url: cdn('Decline_Barbell_Bench_Press') },
  { pattern: /press.*inclinado/, url: cdn('Incline_Dumbbell_Press') },
  { pattern: /press.*banca|bench.*press/, url: cdn('Barbell_Bench_Press_-_Medium_Grip') },
  { pattern: /apertura/, url: cdn('Dumbbell_Flyes') },
  { pattern: /cruce.*polea|cable.*crossover/, url: cdn('Cable_Crossover') },
  { pattern: /flexion|pushup/, url: cdn('Pushups') },

  // Espalda / Back
  { pattern: /dominada|pullup|pull.*up/, url: cdn('Pullups') },
  { pattern: /jalon.*pecho|lat.*pulldown/, url: cdn('Wide-Grip_Lat_Pulldown') },
  { pattern: /peso.*muerto.*rumano/, url: cdn('Romanian_Deadlift') },
  { pattern: /peso.*muerto.*sumo/, url: cdn('Sumo_Deadlift') },
  { pattern: /peso.*muerto|deadlift/, url: cdn('Barbell_Deadlift') },
  { pattern: /remo.*barra/, url: cdn('Bent_Over_Barbell_Row') },
  { pattern: /remo.*mancuerna/, url: cdn('One-Arm_Dumbbell_Row') },
  { pattern: /remo.*polea|remo.*maquina|seated.*row/, url: cdn('Seated_Cable_Rows') },
  { pattern: /face.*pull/, url: cdn('Face_Pull') },

  // Hombros / Shoulders
  { pattern: /press.*arnold/, url: cdn('Arnold_Dumbbell_Press') },
  { pattern: /press.*militar|military.*press/, url: cdn('Standing_Military_Press') },
  { pattern: /elevacion.*lateral|lateral.*raise/, url: cdn('Side_Lateral_Raise') },
  { pattern: /elevacion.*frontal|front.*raise/, url: cdn('Front_Dumbbell_Raise') },
  { pattern: /pajaro|elevacion.*posterior|rear.*delt/, url: cdn('Seated_Bent-Over_Rear_Delt_Raise') },

  // Piernas / Legs
  { pattern: /sentadilla.*bulgara|bulgarian/, url: cdn('Split_Squat_with_Dumbbells') },
  { pattern: /sentadilla.*salto|jump.*squat/, url: cdn('Freehand_Jump_Squat') },
  { pattern: /sentadilla|squat/, url: cdn('Barbell_Full_Squat') },
  { pattern: /prensa|leg.*press/, url: cdn('Leg_Press') },
  { pattern: /extension.*cuadricep|leg.*extension/, url: cdn('Leg_Extensions') },
  { pattern: /curl.*femoral|leg.*curl/, url: cdn('Lying_Leg_Curls') },
  { pattern: /zancada|lunge/, url: cdn('Dumbbell_Lunges') },
  { pattern: /step.*up/, url: cdn('Step-up_with_Knee_Raise') },
  { pattern: /abductor|abductores/, url: cdn('Thigh_Abductor') },
  { pattern: /adductor|aductores/, url: cdn('Thigh_Adductor') },
  { pattern: /pantorrilla.*sentado/, url: cdn('Seated_Calf_Raise') },
  { pattern: /pantorrilla.*pie|pantorrilla|gemelo|calf/, url: cdn('Standing_Calf_Raises') },

  // Glúteos / Glutes
  { pattern: /hip.*thrust/, url: cdn('Barbell_Hip_Thrust') },
  { pattern: /puente.*gluteo|glute.*bridge/, url: cdn('Butt_Lift_Bridge') },
  { pattern: /patada.*gluteo|glute.*kickback/, url: cdn('Glute_Kickback') },

  // Bíceps
  { pattern: /curl.*concentrado/, url: cdn('Concentration_Curls') },
  { pattern: /curl.*martillo|hammer.*curl/, url: cdn('Hammer_Curls') },
  { pattern: /curl.*polea/, url: cdn('High_Cable_Curls') },
  { pattern: /curl.*barra|bicep.*curl/, url: cdn('Barbell_Curl') },

  // Tríceps
  { pattern: /press.*frances|rompe.*craneo/, url: cdn('Lying_Triceps_Press') },
  { pattern: /patada.*tricep|tricep.*kickback/, url: cdn('Tricep_Dumbbell_Kickback') },
  { pattern: /extension.*tricep|tricep.*pushdown|polea.*tricep/, url: cdn('Triceps_Pushdown') },
  { pattern: /fondo.*paralela|fondo|dip/, url: cdn('Dips_-_Chest_Version') },

  // Abdominales / Core
  { pattern: /crunch/, url: cdn('Ab_Crunch_Machine') },
  { pattern: /plancha|plank/, url: cdn('Plank') },
  { pattern: /elevacion.*pierna|hanging.*leg/, url: cdn('Hanging_Leg_Raise') },
  { pattern: /mountain.*climber/, url: cdn('Mountain_Climbers') },
  { pattern: /russian.*twist/, url: cdn('Russian_Twist') },

  // Full body / Cardio
  { pattern: /clean.*press|cargada.*press/, url: cdn('Clean_and_Press') },
  { pattern: /thruster/, url: cdn('Kettlebell_Thruster') },
  { pattern: /burpee/, url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80' },
  { pattern: /cajon|box.*jump/, url: cdn('Front_Box_Jump') },
  { pattern: /tijera|jumping.*jack/, url: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=600&q=80' },
];

export function getExerciseImage(name, muscleGroup) {
  const norm = normalizeExerciseText(name);
  if (norm) {
    const match = EXERCISE_PATTERNS.find((item) => item.pattern.test(norm));
    if (match) return match.url;
  }
  const group = muscleGroup || 'full_body';
  return MUSCLE_FALLBACK_IMAGES[group] || MUSCLE_FALLBACK_IMAGES.full_body;
}


/* Best image to recognise the exercise in a list, or null (→ placeholder). */
export function exerciseThumb(ex) {
  if (!ex) return null;
  if (ex.thumbnailUrl) return ex.thumbnailUrl;
  if (ex.imageUrl) return ex.imageUrl;
  // Curated pictures only for the original catalog: imported names are too varied
  // ("Sentadilla en pared" is not a barbell squat).
  if (!ex.source) {
    const norm = normalizeExerciseText(ex.name);
    const match = norm && EXERCISE_PATTERNS.find((item) => item.pattern.test(norm));
    if (match) return match.url;
  }
  if (ex.youtubeVideoId) return youtubeThumb(ex.youtubeVideoId);
  return null;
}

/* Large image for the detail page (original first). */
export function exerciseImage(ex) {
  if (!ex) return null;
  return ex.imageUrl || exerciseThumb(ex);
}

export const youtubeThumb = (id) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

/* Muscle-group picture used only as a decorative background, never as the exercise image. */
export const muscleBackground = (group) => MUSCLE_FALLBACK_IMAGES[group] || MUSCLE_FALLBACK_IMAGES.full_body;
