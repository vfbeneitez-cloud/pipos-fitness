/**
 * One-off: run with npx tsx scripts/generate-exercises-seed.ts to regenerate data/exercises.seed.json
 * EX2: Enriched with YouTube, images, detailed text.
 */
import * as fs from "fs";
import * as path from "path";

// Real YouTube video IDs (form tutorials) and Wikimedia image URLs
const CORE_ENRICHMENT: Record<
  string,
  {
    primaryMuscle: string;
    description: string;
    cues: string;
    commonMistakes: string;
    regressions: string | null;
    progressions: string | null;
    youtubeId: string;
    imageUrl: string;
  }
> = {
  "gym-leg-press-0": {
    primaryMuscle: "Cuádriceps, glúteos, isquiotibiales",
    description:
      "Ejercicio compuesto en máquina que permite trabajar las piernas con mayor control y menor carga sobre la columna. Ideal para principiantes o como complemento al squat.",
    cues: "Pies a la anchura de hombros.\nMantén la espalda apoyada en el respaldo.\nBaja controlado sin rebotar.\nNo bloquees las rodillas al extender.",
    commonMistakes:
      "Separar la zona lumbar del respaldo.\nRebotar en el punto más bajo.\nExtensión completa de rodillas con bloqueo.\nPies demasiado altos o bajos en la plataforma.",
    regressions: "Reduce el peso y el rango de movimiento.",
    progressions: "Pausa en la parte inferior, una pierna, o mayor rango.",
    youtubeId: "3R0SOJ3alTA",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "gym-bench-press-1": {
    primaryMuscle: "Pectorales, deltoides anterior, tríceps",
    description:
      "Ejercicio básico de empuje horizontal para desarrollar fuerza y masa muscular del pecho. Requiere estabilidad de hombros y core.",
    cues: "Omóplatos retraídos y pegados al banco.\nArco lumbar moderado.\nPies apoyados en el suelo.\nBarra alineada con la parte media del pecho.",
    commonMistakes:
      "Rebotar la barra en el pecho.\nSeparar los glúteos del banco.\nElevar excesivamente los hombros.\nAsimetría en el agarre o descenso.",
    regressions: "Press con mancuernas, press inclinado con barra o máquina.",
    progressions: "Pausas, press con pausa, bench press con banda.",
    youtubeId: "gRVjAtPip0Y",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "gym-deadlift-2": {
    primaryMuscle: "Espalda baja, isquiotibiales, glúteos, trapecio",
    description:
      "Uno de los ejercicios más completos para el cuerpo. Trabaja toda la cadena posterior y desarrolla fuerza funcional.",
    cues: "Barra cerca de las espinillas.\nPecho alto, espalda neutral.\nEmpuja el suelo con los pies.\nBloquea cadera y rodillas al final.",
    commonMistakes:
      "Redondear la espalda lumbar.\nTirar con los brazos en lugar de empujar con las piernas.\nArrancar la barra alejada del cuerpo.\nHiperextensión lumbar al bloquear.",
    regressions: "Deadlift rumano, peso muerto con kettlebell, hex bar.",
    progressions: "Pausas, deficit deadlift, variaciones de agarre.",
    youtubeId: "-4qRntuXBSc",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/7c/Fit_young_man_doing_deadlift_exercise_in_gym.jpg",
  },
  "gym-dumbbell-row-3": {
    primaryMuscle: "Dorsales, romboides, bíceps",
    description:
      "Remo unilateral con mancuerna que permite mayor rango de movimiento y corrección de desequilibrios entre lados.",
    cues: "Apoyo en banco o rodilla, espalda neutral.\nTira del codo hacia la cadera.\nSiente la contracción en el dorsal.\nMantén el hombro estable.",
    commonMistakes:
      "Girar el torso excesivamente.\nTirar con el brazo en lugar de la espalda.\nEncoger los hombros.\nDescender sin control.",
    regressions: "Remo con banda, remo en máquina sentado.",
    progressions: "Pausa en la contracción, remo renegado.",
    youtubeId: "gfUg6qWohTk",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "gym-squat-4": {
    primaryMuscle: "Cuádriceps, glúteos, isquiotibiales, core",
    description:
      "El rey de los ejercicios de pierna. Squat con barra para desarrollo completo de piernas y core.",
    cues: "Pies a la anchura de hombros o algo más.\nPecho alto, core activo.\nBaja hasta que el muslo esté al menos paralelo.\nLas rodillas siguen la línea de los pies.",
    commonMistakes:
      "Valgo de rodillas (rodillas hacia dentro).\nRedondear la espalda baja.\nElevar talones del suelo.\nInclinar el torso en exceso hacia adelante.",
    regressions: "Goblet squat, squat con barra de seguridad, box squat.",
    progressions: "Squat con pausa, squat profundo, front squat.",
    youtubeId: "Dy28eq2PjcM",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/46/Squat.png",
  },
  "gym-overhead-press-5": {
    primaryMuscle: "Deltoides, tríceps, trapecio superior",
    description:
      "Prensa de hombros con barra. Ejercicio fundamental para desarrollar fuerza de empuje vertical.",
    cues: "Agarre algo más ancho que hombros.\nCodos ligeramente hacia adelante.\nEmpuja en línea recta sobre la cabeza.\nCore y glúteos tensos.",
    commonMistakes:
      "Arquear la espalda en exceso.\nIniciar el movimiento con las piernas.\nDejar caer la barra tras la cabeza.\nNo bloquear completamente arriba.",
    regressions: "Press con mancuernas sentado, landmine press.",
    progressions: "Press estricto, push press, jerk.",
    youtubeId: "M2rwvNhTOu0",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "gym-lat-pulldown-6": {
    primaryMuscle: "Dorsales, bíceps, romboides",
    description:
      "Jalón al pecho en polea para desarrollar la espalda y mejorar la fuerza de tracción vertical.",
    cues: "Agarre según objetivo (ancho/estrecho).\nTira de los codos hacia las costillas.\nPecho hacia adelante, omóplatos juntos.\nEvita balancear el torso.",
    commonMistakes:
      "Tirar con los brazos en lugar de la espalda.\nInclinar el torso demasiado hacia atrás.\nEncoger los hombros.\nRango de movimiento incompleto.",
    regressions: "Remo con banda a la altura del pecho.",
    progressions: "Pull-up asistido, jalón con pausa.",
    youtubeId: "OcFCHdQHjVU",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "gym-romanian-deadlift-18": {
    primaryMuscle: "Isquiotibiales, glúteos, espalda baja",
    description:
      "Variante del peso muerto que enfatiza los isquiotibiales y glúteos con menor carga en la espalda baja.",
    cues: "Pecho alto, ligera flexión de rodillas.\nHinge por la cadera, no por la espalda.\nBarra pegada al cuerpo.\nSiente el estiramiento en los isquios.",
    commonMistakes:
      "Doblar demasiado las rodillas (convierte en squat).\nRedondear la espalda al bajar.\nBajar demasiado si se pierde la neutralidad.\nMover la barra lejos de las piernas.",
    regressions: "RDL con mancuernas, good morning con barra ligera.",
    progressions: "RDL con pausa, RDL a una pierna.",
    youtubeId: "CQp5I9KgdXI",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "home-push-up-20": {
    primaryMuscle: "Pectorales, deltoides anterior, tríceps, core",
    description:
      "Empuje horizontal con peso corporal. Ejercicio básico para fortalecer pecho, hombros y brazos.",
    cues: "Manos algo más anchas que hombros.\nCuerpo en línea recta de cabeza a talones.\nBaja el pecho hasta casi tocar el suelo.\nCodos a unos 45° del cuerpo.",
    commonMistakes:
      "Cadera hundida o elevada (puente).\nCodos demasiado abiertos (riesgo hombro).\nCuello tenso o mirada hacia adelante.\nRango de movimiento incompleto.",
    regressions: "Push-up en pared, push-up con rodillas, push-up inclinado.",
    progressions: "Diamond push-up, push-up con aplauso, archer push-up.",
    youtubeId: "WDIpL0pjun0",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "home-bodyweight-squat-21": {
    primaryMuscle: "Cuádriceps, glúteos, isquiotibiales",
    description:
      "Squat sin peso externo. Base para el movimiento de sentadilla y para ganar movilidad.",
    cues: "Pies a la anchura de hombros.\nPecho alto, mira al frente.\nBaja como si te sentaras en una silla.\nRodillas alineadas con los pies.",
    commonMistakes:
      "Talones que se elevan.\nRodillas que van hacia dentro.\nInclinar el torso en exceso.\nNo bajar lo suficiente.",
    regressions: "Squat a una silla, squat asistido con apoyo.",
    progressions: "Squat con salto, pistol squat asistido.",
    youtubeId: "Dy28eq2PjcM",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/46/Squat.png",
  },
  "home-plank-22": {
    primaryMuscle: "Core (transverso, recto abdominal, oblicuos)",
    description:
      "Mantenimiento isométrico en posición de flexión. Fortalece el core y la estabilidad del tronco.",
    cues: "Antebrazos en suelo, codos bajo hombros.\nCuerpo en línea recta.\nOmbligo hacia la columna.\nMantén la respiración.",
    commonMistakes:
      "Cadera demasiado alta o baja.\nDejar caer la cabeza.\nContener la respiración.\nEncoger los hombros.",
    regressions: "Plank con rodillas apoyadas, plank en pared.",
    progressions: "Plank con elevación de pierna, plank lateral.",
    youtubeId: "mwlp75MS6Rg",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "home-lunges-23": {
    primaryMuscle: "Cuádriceps, glúteos, isquiotibiales",
    description:
      "Zancada que trabaja piernas de forma unilateral y mejora equilibrio y estabilidad.",
    cues: "Paso amplio hacia adelante.\nRodilla delantera alineada con el tobillo.\nBaja la rodilla trasera hacia el suelo.\nTronco erguido.",
    commonMistakes:
      "Rodilla delantera que sobrepasa el pie.\nPaso demasiado corto.\nInclinar el torso hacia adelante.\nPerder el equilibrio.",
    regressions: "Lunges asistido con apoyo, lunges estático.",
    progressions: "Lunges caminando, lunges con salto.",
    youtubeId: "QOVaHwm-Q6U",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "home-glute-bridge-24": {
    primaryMuscle: "Glúteos, isquiotibiales, core",
    description:
      "Puente de glúteos para activar y fortalecer glúteos e isquiotibiales con control de la pelvis.",
    cues: "Pies apoyados, rodillas a 90°.\nEmpuja con los talones.\nSqueeze glúteos en la parte alta.\nNo arquees la espalda en exceso.",
    commonMistakes:
      "Usar más la espalda que los glúteos.\nNo contraer glúteos al subir.\nPies demasiado lejos o cerca.\nRebotar en el punto bajo.",
    regressions: "Bridge con apoyo de brazos, bridge con banda.",
    progressions: "Hip thrust en suelo, single-leg bridge.",
    youtubeId: "wZID98mY5Qs",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Bridge_exercise.svg/440px-Bridge_exercise.svg.png",
  },
  "home-crunches-30": {
    primaryMuscle: "Recto abdominal",
    description: "Flexión del tronco en el suelo para trabajar los abdominales superiores.",
    cues: "Pies apoyados, rodillas dobladas.\nManos detrás de la cabeza sin tirar.\nEleva hombros del suelo, no el cuello.\nExhala al subir.",
    commonMistakes:
      "Tirar del cuello con las manos.\nSubir todo el tronco (debe ser curl).\nRebotar sin control.\nContener la respiración.",
    regressions: "Crunch con piernas elevadas en silla.",
    progressions: "Bicycle crunch, crunch con peso.",
    youtubeId: "Xyd_fa5zoEU",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Crunch_exercise.svg/440px-Crunch_exercise.svg.png",
  },
  "home-bird-dog-33": {
    primaryMuscle: "Core, espalda baja, glúteos",
    description:
      "Ejercicio de estabilidad que combina extensión de brazo y pierna opuestos. Excelente para la espalda baja.",
    cues: "Manos bajo hombros, rodillas bajo cadera.\nExtiende brazo y pierna opuestos.\nMantén la espalda neutral.\nMueve lento y controlado.",
    commonMistakes:
      "Arquear la espalda baja.\nBalancear o usar momentum.\nLevantar demasiado alto.\nRotar la cadera.",
    regressions: "Bird dog con apoyo de mano en pared.",
    progressions: "Bird dog con pausa, bird dog con banda.",
    youtubeId: "wiFNA3sqjCA",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Birddog_exercise.svg/440px-Birddog_exercise.svg.png",
  },
  "home-hip-thrust-35": {
    primaryMuscle: "Glúteos, isquiotibiales",
    description: "Extensión de cadera con espalda apoyada. Muy efectivo para activar los glúteos.",
    cues: "Parte superior de la espalda en banco o suelo.\nEmpuja con los talones.\nMáxima contracción de glúteos arriba.\nChin metido para proteger el cuello.",
    commonMistakes:
      "Hiperextensión lumbar.\nNo alcanzar la extensión completa de cadera.\nUsar el cuello para empujar.\nRebotar.",
    regressions: "Glute bridge, hip thrust sin peso.",
    progressions: "Hip thrust con barra, single-leg hip thrust.",
    youtubeId: "wZID98mY5Qs",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Bridge_exercise.svg/440px-Bridge_exercise.svg.png",
  },
  "calisthenics-pull-up-40": {
    primaryMuscle: "Dorsales, bíceps, core",
    description:
      "Tracción vertical colgado de una barra. Ejercicio fundamental de calistenia para la espalda.",
    cues: "Agarre prono, algo más ancho que hombros.\nInicia con depresión escapular.\nSube hasta que la barbilla supere la barra.\nBaja con control hasta extensión completa.",
    commonMistakes:
      "Balanceo (kipping) si buscas fuerza estricta.\nNo alcanzar la extensión completa abajo.\nEncoger hombros.\nTirar con los brazos en lugar de la espalda.",
    regressions: "Pull-up con banda, chin-up, australian pull-up.",
    progressions: "Pull-up con peso, L-sit pull-up, muscle-up.",
    youtubeId: "9yVGh3XbJ34",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "calisthenics-dip-42": {
    primaryMuscle: "Tríceps, pectorales, deltoides anterior",
    description:
      "Descenso entre barras o paralelas empujando el cuerpo. Excelente para tríceps y pecho.",
    cues: "Brazos extendidos al inicio.\nBaja hasta que los codos estén a ~90°.\nMantén el torso erguido o ligera inclinación.\nNo dejes caer los hombros.",
    commonMistakes:
      "Bajar demasiado y forzar el hombro.\nBalancear las piernas.\nCodos que se abren en exceso.\nNo bloquear arriba.",
    regressions: "Dips en banco, dips con banda de asistencia.",
    progressions: "Dips con peso, ring dips, L-sit dips.",
    youtubeId: "2z8JmcrW-As",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "calisthenics-chin-up-53": {
    primaryMuscle: "Bíceps, dorsales",
    description: "Tracción vertical con agarre supino. Mayor énfasis en bíceps que el pull-up.",
    cues: "Agarre supino, manos a la anchura de hombros.\nDeprime omóplatos al inicio.\nSube hasta que la barbilla supere la barra.\nSiente el trabajo en bíceps.",
    commonMistakes:
      "Balanceo para ganar altura.\nEncoger hombros.\nNo llegar a extensión completa.\nCodos que se separan.",
    regressions: "Chin-up con banda, australian chin-up.",
    progressions: "Chin-up con peso, weighted chin-up.",
    youtubeId: "brhYBBFJMxk",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "gym-bicep-curl-13": {
    primaryMuscle: "Bíceps",
    description: "Curl con mancuerna o barra para aislar el bíceps braquial.",
    cues: "Codos pegados al cuerpo.\nCurl completo sin balancear.\nControla la bajada.\nSupina ligeramente la muñeca al subir.",
    commonMistakes:
      "Balancear el torso (cheating).\nCodos que se abren.\nRango incompleto.\nPeso excesivo.",
    regressions: "Curl con banda, curl con mancuerna ligera.",
    progressions: "Curl con pausa, hammer curl.",
    youtubeId: "ykJmrZ5v0Oo",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
  "pool-freestyle-60": {
    primaryMuscle: "Full body (dorsales, hombros, core, piernas)",
    description: "Estilo libre o crol. El estilo de natación más rápido y eficiente.",
    cues: "Cuerpo alargado y horizontal.\nRotación de hombros y cadera.\nRespiración lateral.\nPatada desde la cadera.",
    commonMistakes:
      "Cabeza demasiado alta.\nCruzar la mano sobre la línea central.\nPatada desde la rodilla.\nFalta de rotación.",
    regressions: "Patada con tabla, brazada con pull buoy.",
    progressions: "Intervalos, técnica de catch.",
    youtubeId: "5HLW2AI1Ink",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png",
  },
};

// Fallback YouTube IDs for non-core exercises (real form/general fitness videos)
const FALLBACK_YT: Record<string, string> = {
  GYM: "3R0SOJ3alTA",
  HOME: "WDIpL0pjun0",
  CALISTHENICS: "9yVGh3XbJ34",
  POOL: "5HLW2AI1Ink",
  MIXED: "Dy28eq2PjcM",
};
const FALLBACK_IMG = "https://upload.wikimedia.org/wikipedia/commons/4/43/Exercise.png";

const GYM_NAMES = [
  "Leg Press",
  "Bench Press",
  "Deadlift",
  "Dumbbell Row",
  "Squat",
  "Overhead Press",
  "Lat Pulldown",
  "Cable Fly",
  "Leg Curl",
  "Calf Raise",
  "Barbell Row",
  "Incline Press",
  "Tricep Pushdown",
  "Bicep Curl",
  "Leg Extension",
  "Chest Press",
  "Seated Row",
  "Lateral Raise",
  "Romanian Deadlift",
  "Hack Squat",
];
const HOME_NAMES = [
  "Push-up",
  "Bodyweight Squat",
  "Plank",
  "Lunges",
  "Glute Bridge",
  "Mountain Climber",
  "Burpee",
  "Jumping Jack",
  "Squat Jump",
  "Wall Sit",
  "Crunches",
  "Bicycle Crunch",
  "Superman",
  "Bird Dog",
  "Dead Bug",
  "Hip Thrust",
  "Step-up",
  "Inchworm",
  "Bear Crawl",
  "High Knees",
];
const CALISTHENICS_NAMES = [
  "Pull-up",
  "Push-up",
  "Dip",
  "L-Sit",
  "Handstand",
  "Muscle-up",
  "Pistol Squat",
  "Front Lever",
  "Planche",
  "Back Lever",
  "Hanging Leg Raise",
  "Diamond Push-up",
  "Archer Push-up",
  "Chin-up",
  "Pike Push-up",
  "Hollow Hold",
  "Skin the Cat",
  "Human Flag",
  "Front Roll",
  "Back Roll",
];
const POOL_NAMES = [
  "Freestyle",
  "Backstroke",
  "Breaststroke",
  "Butterfly",
  "Kickboard",
  "Water Tread",
  "Pool Run",
  "Aqua Jog",
  "Sculling",
  "Streamline",
  "Flip Turn",
  "Open Turn",
  "Side Stroke",
  "Elementary Back",
  "Water Polo Drill",
  "Lap Swim",
  "Sprint",
  "Drill Set",
  "Cool Down",
  "Warm Up Swim",
];
const MIXED_NAMES = [
  "Circuit A",
  "Circuit B",
  "HIIT Block",
  "Tabata",
  "AMRAP",
  "EMOM",
  "Chipper",
  "Metcon",
  "WOD",
  "Finisher",
  "Warm-up Set",
  "Cool-down Set",
  "Mobility Block",
  "Stretch Sequence",
  "Recovery Run",
  "Cross Train",
  "Combo Session",
  "Hybrid",
  "Fusion Workout",
  "Mixed Block",
];

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

type MediaItem = { type: string; url: string; thumbnailUrl?: string | null };

function gen(env: string, names: string[], startIndex: number) {
  return names.map((name, i) => {
    const s = `${env.toLowerCase()}-${slug(name)}-${startIndex + i}`;
    const core = CORE_ENRICHMENT[s];
    if (core) {
      const ytUrl = `https://www.youtube.com/watch?v=${core.youtubeId}`;
      const thumbUrl = `https://img.youtube.com/vi/${core.youtubeId}/hqdefault.jpg`;
      return {
        slug: s,
        name,
        environment: env,
        primaryMuscle: core.primaryMuscle,
        description: core.description,
        cues: core.cues,
        commonMistakes: core.commonMistakes,
        regressions: core.regressions,
        progressions: core.progressions,
        media: [
          { type: "image" as const, url: core.imageUrl, thumbnailUrl: null },
          {
            type: "youtube" as const,
            url: ytUrl,
            thumbnailUrl: thumbUrl,
          },
        ] satisfies MediaItem[],
      };
    }
    const ytId = FALLBACK_YT[env] ?? FALLBACK_YT.GYM;
    const ytUrl = `https://www.youtube.com/watch?v=${ytId}`;
    const thumbUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    return {
      slug: s,
      name,
      environment: env,
      primaryMuscle: "Full body",
      description: null,
      cues: "Form first.",
      commonMistakes: "Rushing.",
      regressions: null,
      progressions: null,
      media: [
        { type: "image" as const, url: FALLBACK_IMG, thumbnailUrl: null },
        {
          type: "youtube" as const,
          url: ytUrl,
          thumbnailUrl: thumbUrl,
        },
      ] satisfies MediaItem[],
    };
  });
}

const all: ReturnType<typeof gen>[number][] = [];
let idx = 0;
all.push(...gen("GYM", GYM_NAMES, idx));
idx += GYM_NAMES.length;
all.push(...gen("HOME", HOME_NAMES, idx));
idx += HOME_NAMES.length;
all.push(...gen("CALISTHENICS", CALISTHENICS_NAMES, idx));
idx += CALISTHENICS_NAMES.length;
all.push(...gen("POOL", POOL_NAMES, idx));
idx += POOL_NAMES.length;
all.push(...gen("MIXED", MIXED_NAMES, idx));

const outPath = path.join(process.cwd(), "data", "exercises.seed.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(all, null, 2), "utf8");
console.log("Wrote", outPath, "exercises:", all.length);
