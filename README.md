# Escalera MBA

Web app para prepararte para el GRE como un juego, pronosticar tu puntaje y ver a qué programas MBA de Estados Unidos te alcanza.

**Abrir la app:** https://juanpablogza1.github.io/MBA-JPG/

Se instala en el teléfono como app (en Safari o Chrome: "Agregar a pantalla de inicio") y funciona sin conexión, excepto el mapa.

## Qué hace

- **Entrenar.** Sprints adaptativos de 10 preguntas, práctica por tema, secciones cronometradas (12 preguntas en 18 o 21 minutos), simulacro completo con la segunda sección adaptativa como el GRE real, repaso de errores con repetición espaciada, vocabulario (263 palabras, sistema de cajas), quiz y ensayo Issue con autoevaluación. XP, niveles, rachas, misiones diarias y logros.
- **Pronóstico.** Estima tu Verbal y Quant con Teoría de Respuesta al Ítem y las tablas de percentiles oficiales de ETS (jul 2022 a jun 2025), con intervalo del 80%. Proyecta tu puntaje al día del examen según tus horas de estudio y clasifica cada escuela como Alcanzable, Objetivo o Reto. Puedes registrar tus POWERPREP oficiales para anclar la estimación.
- **Mapa.** 30 programas MBA con color según tu ajuste, filtros por Ivy League, M7, Texas y favoritas.
- **Escuelas.** Ficha de cada programa: GRE (promedio, mediana o estimado, y rango 10-90%), tasa de admisión, perfil de la clase, por qué destaca, historia, quién entra, requisitos, fechas de aplicación con días restantes y sitio oficial.
- **Guía.** GRE vs. GMAT, formato del examen, método de estudio basado en evidencia, plan de 12 semanas, estrategias por tipo de pregunta, logística, financiamiento (Fulbright-García Robles, FUNED, becas), visa, STEM OPT y tres rutas de calendario.

## Contenido

- Quant: 33 generadores paramétricos (porcentajes, razones, álgebra, exponentes, números, tasas, combinatoria, probabilidad, geometría, estadística, interpretación de datos y más) + 18 preguntas difíciles escritas a mano. Las preguntas nunca se acaban.
- Verbal: 90 preguntas originales (Text Completion de 1, 2 y 3 espacios, Sentence Equivalence, 6 pasajes de lectura con selección de oración y 8 argumentos).
- Todo el contenido es original, en estilo GRE. La dificultad es aproximada: calibra con material oficial de ETS.

## Cómo funciona el pronóstico

Cada pregunta tiene dificultad de 1 a 5. Con un modelo logístico de 3 parámetros (incluye la probabilidad de adivinar según el tipo de pregunta) se estima tu habilidad respecto a la población que presenta el GRE; las respuestas recientes pesan más (vida media de 21 días). Esa habilidad se convierte en puntaje 130-170 con los percentiles oficiales de ETS. La proyección usa la regla práctica de ~40 horas de estudio por cada 5 puntos totales, con rendimientos decrecientes cerca del máximo.

## Tus datos

Todo se guarda en el navegador (localStorage). En Ajustes puedes descargar un respaldo JSON y cargarlo en otro dispositivo.

## Actualizar datos de escuelas

Edita `data/schools.js`. Cada escuela tiene GRE, admisión, perfil, textos y `deadlines` (fechas ISO). Las fechas del ciclo 2027-28 se publican en el verano de 2027.

## Estructura

```
index.html            app de una sola página
css/app.css           diseño
js/app.js             navegación y vistas
js/practice.js        sesiones de práctica, vocabulario y ensayo
js/quant.js           generadores de preguntas Quant
js/engine.js          pronóstico (IRT + percentiles ETS) y ajuste por escuela
js/gamify.js          XP, niveles, misiones y logros
js/charts.js          gráfica de tendencia
data/                 escuelas, Verbal, vocabulario, ensayos y guía
vendor/leaflet        mapa (Leaflet 1.9.4)
sw.js, manifest       instalación y uso sin conexión
```

## Fuentes principales

ETS (estructura, costos, percentiles), Poets&Quants y U.S. News (GRE y admisión por escuela, 2026), Clear Admit y GMAT Club (perfiles de clase y fechas 2026-27), mbaMission (fechas), sitios oficiales de las escuelas, COMEXUS y FUNED. La lista completa con enlaces está en la Guía de la app.
