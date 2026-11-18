// Guía de estudio y de admisión. Datos verificados en noviembre de 2026.
export const GUIDE = [
  {
    id: 'veredicto',
    title: 'GRE o GMAT: en tu caso, GRE',
    html: `
<p>Todas las escuelas de esta app aceptan el GRE y declaran no tener preferencia. Para ti, el GRE gana por cuatro razones concretas:</p>
<ul>
<li><strong>La beca Fulbright-García Robles lo exige.</strong> Su convocatoria de posgrado pide GRE para todas las disciplinas y ya no acepta GMAT. Si quieres esa beca, el GRE es obligatorio.</li>
<li><strong>Ya es mainstream en las top.</strong> En las 10 mejores escuelas, el GRE ya representa el 37.2% de los exámenes presentados; en Tuck lo usó el 59% de la Clase 2028 y en Harvard el 44% de la Clase 2027.</li>
<li><strong>Te deja otras puertas abiertas.</strong> Sirve también para maestrías en energía, ingeniería o políticas públicas si cambias de plan.</li>
<li><strong>Tiene calculadora en pantalla</strong> y el Quant es más de contenido escolar que de lógica rebuscada; para un perfil de ingeniería suele ser terreno favorable.</li>
</ul>
<p class="note">Lo que cuesta del GRE es el vocabulario del Verbal. Por eso esta app trae un mazo de repetición espaciada desde el día uno.</p>`,
  },
  {
    id: 'examen',
    title: 'El examen en dos minutos',
    html: `
<p>Desde el 22 de septiembre de 2023 el GRE dura <strong>1 hora 58 minutos</strong> y tiene cinco secciones, sin descanso programado.</p>
<table class="gtable"><thead><tr><th>Sección</th><th>Preguntas</th><th>Tiempo</th></tr></thead><tbody>
<tr><td>Analytical Writing (Issue)</td><td>1 ensayo</td><td>30 min</td></tr>
<tr><td>Verbal, sección 1</td><td>12</td><td>18 min</td></tr>
<tr><td>Verbal, sección 2</td><td>15</td><td>23 min</td></tr>
<tr><td>Quant, sección 1</td><td>12</td><td>21 min</td></tr>
<tr><td>Quant, sección 2</td><td>15</td><td>26 min</td></tr>
</tbody></table>
<ul>
<li>Writing siempre va primero; Verbal y Quant pueden venir en cualquier orden.</li>
<li><strong>Adaptativo por sección:</strong> la primera sección de cada área es de dificultad media y la segunda se ajusta a tu desempeño en la primera. Tu puntaje considera aciertos en ambas, ponderados por dificultad. Por eso la sección 1 vale oro: abre la puerta a la sección difícil, que es la que permite puntajes altos.</li>
<li>Dentro de una sección puedes saltar, marcar y volver a preguntas. No se penalizan errores: nunca dejes una en blanco.</li>
<li>Escalas: Verbal y Quant de 130 a 170 (de 1 en 1); Writing de 0 a 6 (en medios puntos).</li>
</ul>`,
  },
  {
    id: 'puntaje',
    title: 'Qué puntaje necesitas',
    html: `
<p>Medias de todos los que presentan el GRE (ETS, jul 2022 a jun 2025): Verbal 151.4, Quant 157.6, Writing 3.46. El Quant tiene percentiles mucho más apretados: 160 en Verbal es el percentil 82, pero en Quant es el 50.</p>
<table class="gtable"><thead><tr><th>Grupo</th><th>GRE total típico (V + Q)</th></tr></thead><tbody>
<tr><td>Stanford, Harvard, Yale, Wharton, Columbia, Stern</td><td>326 a 329</td></tr>
<tr><td>Kellogg, Booth, MIT, UCLA, Haas, Ross</td><td>322 a 326</td></tr>
<tr><td>Tuck, Darden, Tepper, Fuqua, McCombs</td><td>319 a 322</td></tr>
<tr><td>Rice, SMU Cox, Georgetown, Emory</td><td>315 a 320</td></tr>
<tr><td>Texas A&amp;M Mays</td><td>≈ 310</td></tr>
</tbody></table>
<ul>
<li>Las escuelas leen Verbal y Quant por separado. En MBA el Quant pesa mucho: apunta a 160 o más aunque el total ya alcance.</li>
<li>Un puntaje en la mediana te pone "en rango", no te admite. El MBA decide con ensayos, experiencia, recomendaciones y entrevista. El GRE abre la puerta y ayuda en becas.</li>
<li>El rango 10-90% de cada escuela (en sus fichas) muestra qué tan ancha es la puerta: en Tuck, el percentil 10 de Quant fue 142.</li>
</ul>`,
  },
  {
    id: 'metodo',
    title: 'El método: cómo estudiar de verdad',
    html: `
<p>La revisión más citada sobre técnicas de estudio (Dunlosky y colegas, 2013) evaluó diez técnicas. Solo dos obtuvieron utilidad alta: <strong>practicar con preguntas (práctica de recuperación)</strong> y <strong>espaciar el estudio en el tiempo</strong>. Releer, subrayar y resumir quedaron con utilidad baja. Esta app está construida sobre esas dos ideas.</p>
<ol>
<li><strong>Diagnóstico primero.</strong> Haz el diagnóstico de la app y el POWERPREP Online 1 de ETS (gratis) para saber dónde estás.</li>
<li><strong>Aprende con preguntas, no leyendo.</strong> Cada concepto nuevo: 10 minutos de teoría y después práctica inmediata. Los sprints adaptativos te mantienen en la dificultad justa.</li>
<li><strong>Bitácora de errores.</strong> Cada error vale más que diez aciertos. La app los guarda y te los regresa en 0, 2 y 5 días hasta que los dominas (repaso de errores).</li>
<li><strong>Intercala temas.</strong> Mezclar tipos de pregunta (porcentajes, geometría, probabilidad) en una misma sesión entrena el paso que más falla en el examen: reconocer qué herramienta usar.</li>
<li><strong>Vocabulario espaciado diario.</strong> 15 a 20 tarjetas por día, siempre en contexto. El sistema de cajas te muestra más seguido las que fallas.</li>
<li><strong>Tiempo real desde la mitad del plan.</strong> Secciones de 12 preguntas en 18 o 21 minutos y un simulacro completo cada dos semanas, con revisión profunda.</li>
<li><strong>Guarda el POWERPREP 2</strong> para las dos semanas previas al examen: es tu calibración más realista y solo se puede usar fresco una vez.</li>
</ol>
<p>Regla práctica para planear: <strong>≈ 40 horas de estudio por cada 5 puntos totales</strong> (PrepScholar). Subir 10 puntos ≈ 80 horas; 20 puntos ≈ 160 horas. Cerca de 330 cada punto cuesta más.</p>`,
  },
  {
    id: 'plan',
    title: 'Plan de 12 semanas (≈ 10 horas por semana)',
    html: `
<p>Unas 120 horas: según la regla práctica, del orden de 15 puntos de mejora. Ajusta las horas en Pronóstico y la app recalcula tu proyección.</p>
<table class="gtable plan"><thead><tr><th>Semana</th><th>Enfoque</th></tr></thead><tbody>
<tr><td>0</td><td>Diagnóstico de la app + POWERPREP Online 1. Define escuela meta y fecha de examen.</td></tr>
<tr><td>1-2</td><td>Quant: aritmética, porcentajes, razones, álgebra lineal. Verbal: estrategia de Text Completion. 20 tarjetas de vocabulario al día.</td></tr>
<tr><td>3-4</td><td>Quant: exponentes, desigualdades, funciones, geometría. Verbal: Sentence Equivalence y un pasaje de lectura diario.</td></tr>
<tr><td>5</td><td>Primer simulacro completo de la app. Dos días de revisión de cada error.</td></tr>
<tr><td>6-7</td><td>Temas más débiles según tu tabla de dominio. Secciones cronometradas. Un ensayo Issue por semana.</td></tr>
<tr><td>8</td><td>Segundo simulacro. Ajusta el plan con el pronóstico.</td></tr>
<tr><td>9-10</td><td>Preguntas difíciles (dificultad 4 y 5), datos y probabilidad. Official Guide de ETS para practicar con material oficial.</td></tr>
<tr><td>11</td><td>POWERPREP Online 2 en condiciones reales. Regístralo en Pronóstico.</td></tr>
<tr><td>12</td><td>Repaso ligero de errores y vocabulario. Duerme bien. Examen.</td></tr>
</tbody></table>
<p>Programa el examen con margen para un segundo intento: se puede repetir cada 21 días, hasta 5 veces en 12 meses, y con ScoreSelect envías solo tu mejor resultado.</p>`,
  },
  {
    id: 'estrategias',
    title: 'Estrategias por tipo de pregunta',
    html: `
<h4>Text Completion</h4>
<ul><li>Lee toda la oración antes de ver opciones. Busca las palabras pista: contraste (although, despite, but, rather than) o continuidad (because, and, punto y coma).</li><li>Predice tu propia palabra y luego búscala. En dos o tres espacios, empieza por el que tenga más pistas.</li><li>Relee la oración completa con tus respuestas: debe tener sentido de punta a punta.</li></ul>
<h4>Sentence Equivalence</h4>
<ul><li>Necesitas dos palabras que produzcan oraciones con el mismo sentido. No basta con que sean sinónimos: el par tiene que encajar en el contexto.</li><li>Cuidado con pares de sinónimos trampa que no encajan.</li></ul>
<h4>Comprensión de lectura y argumentos</h4>
<ul><li>Lee buscando estructura: ¿cuál es la tesis, dónde gira el autor, para qué sirve cada párrafo?</li><li>La respuesta correcta siempre está respaldada por el texto. Desconfía de lo extremo (always, never, proves).</li><li>En "selecciona todas" evalúa cada opción por separado; no hay crédito parcial.</li><li>Argumentos: separa conclusión y evidencia; busca causas alternativas, grupos de control y supuestos ocultos.</li></ul>
<h4>Quantitative Comparison</h4>
<ul><li>Simplifica ambas cantidades igual (sumar, restar o multiplicar por un positivo).</li><li>Prueba casos: 0, 1, negativos, fracciones y números grandes. Si cambian de orden, la respuesta es D.</li><li>Si ambas cantidades son números fijos, la respuesta nunca es D.</li></ul>
<h4>Opción múltiple, numérica y datos</h4>
<ul><li>Elige números concretos (residuos, porcentajes) y trabaja hacia atrás desde las opciones.</li><li>Usa la calculadora para aritmética fea, no para pensar. Estima antes de calcular.</li><li>En gráficas lee títulos, unidades y escalas antes de calcular nada.</li></ul>
<h4>Ensayo Issue (30 minutos)</h4>
<ul><li>5 minutos: posición matizada, dos o tres razones, un ejemplo concreto por razón y una objeción.</li><li>20 minutos: introducción con tesis, desarrollo, concesión y respuesta, conclusión breve.</li><li>5 minutos: revisión. No hay corrector ortográfico.</li></ul>`,
  },
  {
    id: 'recursos',
    title: 'Recursos recomendados',
    html: `
<ul>
<li><strong>ETS POWERPREP Online</strong> (gratis): dos exámenes oficiales. El 1 al inicio; el 2 en las últimas dos semanas.</li>
<li><strong>The Official Guide to the GRE General Test</strong> (ETS) y los libros oficiales de práctica Verbal y Quant: preguntas reales, la mejor referencia de estilo.</li>
<li><strong>Manhattan Prep 5 lb. Book of GRE Practice Problems</strong>: volumen de práctica por tema.</li>
<li><strong>GregMat+</strong>: curso en línea de bajo costo, muy usado para planes de estudio y Verbal.</li>
<li><strong>Target Test Prep</strong> o <strong>Magoosh</strong>: cursos completos; TTP es fuerte en Quant.</li>
<li><strong>Khan Academy</strong>: repaso gratuito de bases de matemáticas si alguna te falla.</li>
</ul>
<p class="note">Las preguntas de esta app son originales, escritas en estilo GRE, y su dificultad es aproximada. Úsalas para practicar a diario y calibra con material oficial de ETS.</p>`,
  },
  {
    id: 'logistica',
    title: 'Registro, costo y día del examen',
    html: `
<ul>
<li><strong>Costo:</strong> USD 249 desde el 1 de agosto de 2026 (antes 220). Igual en centro de examen o en casa.</li>
<li><strong>En casa o en centro:</strong> mismo contenido y validez. En casa puedes agendar con 24 horas de anticipación; necesitas cámara, cuarto privado y buena conexión.</li>
<li><strong>Cambios:</strong> reprogramar o cancelar con al menos 4 días de anticipación (al cancelar recuperas 50%).</li>
<li><strong>Puntajes:</strong> oficiales en 8 a 10 días, válidos por 5 años. Envíos gratis a 4 escuelas el día del examen.</li>
<li><strong>Repetir:</strong> cada 21 días, hasta 5 veces en 12 meses. ETS reporta que 70% de quienes repiten mejoran.</li>
<li><strong>Identificación:</strong> como mexicano, usa tu pasaporte vigente y que el nombre coincida exacto con tu registro.</li>
</ul>`,
  },
  {
    id: 'trabas',
    title: 'Tus trabas y cómo resolverlas',
    html: `
<h4>1. Inglés (TOEFL)</h4>
<p>Casi todas las escuelas piden TOEFL, IELTS o similar si tu licenciatura no fue en inglés; algunas lo dispensan si estudiaste en una institución de habla inglesa. Fulbright pide TOEFL iBT de al menos 80 (o IELTS 6.5, o Duolingo 120). En las top el listón real es mucho más alto: Stanford reportó un TOEFL promedio de 112. Si vas a presentarlo, hazlo después del GRE, cuando tu vocabulario esté en su mejor momento.</p>
<h4>2. Dinero</h4>
<ul>
<li><strong>Fulbright-García Robles (COMEXUS):</strong> para mexicanos. La convocatoria publicada para posgrado regular otorga hasta USD 37,000 por año en maestría, cubre la gestión de solicitudes a hasta 4 universidades y paga TOEFL y GRE a los seleccionados. Los MBA son elegibles. Requisitos clave: promedio mínimo de 8, TOEFL, GRE, no tener ya una admisión, no haber vivido más de un año en EE. UU. en los cinco años previos al cierre y no haber estudiado licenciatura o maestría allá. Viajas con visa J-1, que tiene restricciones de residencia al terminar.</li>
<li><strong>FUNED:</strong> esquema de crédito educativo para maestrías en el extranjero. En su convocatoria 2026, para MBA en universidades top 10 maneja de USD 35,000 a 60,000 y para top 200 de 10,000 a 30,000. Pide buen historial (Mi Score de al menos 680) y aval con inmueble.</li>
<li><strong>Becas de la escuela:</strong> casi todas reparten fellowships en Ronda 1 y Ronda 2. Un GRE por encima de la mediana es de las palancas más claras para ganarlas. Mays considera fellowships hasta su Ronda 2; WashU Olin ofrece becas nuevas de USD 60,000 a 100,000 y no cobra la solicitud.</li>
<li><strong>Préstamos sin aval en EE. UU.</strong> para internacionales (por ejemplo MPOWER Financing o Prodigy Finance): compara tasas antes de firmar.</li>
</ul>
<h4>3. Visa y trabajo después</h4>
<p>La ruta normal es visa F-1 con el I-20 que emite la escuela al probar fondos. Prioriza MBA con designación STEM: te da hasta 36 meses de OPT (permiso para trabajar en EE. UU. después de graduarte) en lugar de 12, y por lo tanto más intentos en la lotería H-1B. Casi todas las top ya tienen el MBA completo o una ruta STEM. Si vas con Fulbright, la visa es J-1 y debes revisar la obligación de regreso.</p>
<h4>4. Experiencia laboral</h4>
<p>El promedio de las top ronda 5 a 6 años (Harvard 4.9, Stanford 5.3, McCombs y Fuqua 6). Si tienes menos, compénsalo con impacto medible: proyectos de eficiencia y eléctricos con ahorro en dinero o energía, liderazgo de equipos y una meta post-MBA concreta (por ejemplo energía y almacenamiento). Aplicar un año después también es una estrategia válida.</p>
<h4>5. Calendario</h4>
<p>Abajo tienes tres rutas posibles.</p>`,
  },
  {
    id: 'rutas',
    title: 'Tres rutas de calendario',
    html: `
<h4>Ruta A: aplicar en otoño 2027, entrar en agosto 2028</h4>
<ol><li>Nov 2026 a mar 2027: preparar GRE (este plan).</li><li>Mar o abr 2027: primer GRE; repetir en mayo si hace falta.</li><li>May a ago 2027: TOEFL si aplica, recomendadores, ensayos, visitas.</li><li>Sep y oct 2027: Ronda 1 (las fechas 2027-28 se publican en verano 2027; serán parecidas a las de esta app).</li><li>Ene 2028: Ronda 2 para escuelas restantes. Mays: internacionales cierran en su Ronda 2 (fines de enero).</li></ol>
<h4>Ruta B: Fulbright para entrar en agosto 2028</h4>
<p>La convocatoria actual de posgrado regular está abierta del 2 de septiembre de 2026 al 15 de enero de 2027 para iniciar en agosto de 2028. Exige GRE y TOEFL (el TOEFL con resultado vigente al cierre), así que necesitarías ambos en menos de 2 meses. Es muy apretado; solo tiene sentido si ya tienes buen nivel. Confirma fechas en comexus.org.mx.</p>
<h4>Ruta C: Fulbright para entrar en agosto 2029</h4>
<p>Presentas GRE en 2027 con calma, aplicas a la siguiente convocatoria (previsiblemente sep 2027 a ene 2028) y COMEXUS te acompaña a aplicar en el ciclo 2028-29. Llegas con más experiencia, que está más cerca del promedio de las top. Ojo: no puedes tener ya una admisión cuando apliques a Fulbright, así que no combines esta ruta con la A.</p>`,
  },
];

export const GUIDE_SOURCES = [
  ['ETS: estructura del GRE actual', 'https://www.ets.org/gre/shorter'],
  ['ETS: costos del GRE', 'https://www.ets.org/gre/test-takers/general-test/register/fees'],
  ['ETS: política de repetición y ScoreSelect', 'https://ets.org/gre'],
  ['Percentiles ETS jul 2022 - jun 2025 (resumen)', 'https://cleveracademy.vn/en/blog/complete-guide-on-gre-percentiles/'],
  ['Dunlosky et al. 2013, técnicas de estudio (APS)', 'https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html'],
  ['PrepScholar: horas de estudio por puntos', 'https://www.prepscholar.com/gre/blog/how-long-to-study-for-gre/'],
  ['Magoosh: cuándo usar POWERPREP', 'https://magoosh.com/gre/free-gre-study-materials/'],
  ['Poets&Quants: el GRE en las top MBA (2025-2026)', 'https://poetsandquants.com/2025/06/04/gre-scores-submission-rates-at-the-top-50-u-s-mba-programs/'],
  ['COMEXUS: convocatoria Fulbright-García Robles posgrado', 'https://comexus.org.mx/documentos/becas/ConvocatoriaPosgradoRegular_sitioweb_2026-08-06_H_22-32-12.pdf'],
  ['Becas.com: fechas convocatoria 2026-27 COMEXUS', 'https://www.becas.com/comexus/becas-fulbright-garcia-robles'],
  ['FUNED: convocatoria Maestrías 2026', 'https://www.funedmx.org/wp-content/uploads/2026/02/FUNED-Maestrias-2026.pdf'],
  ['MBA STEM y OPT de 36 meses', 'https://menlocoaching.com/top-mba-programs/stem-mba-programs/'],
];
