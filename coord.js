let lastOrigen,
    lastPuntoA,
    lastPuntoB,
    lastRetorAlt,
    lastTipoRetorno = null;// Guardará 'ORIGEN' o 'ALTERNO'

// Caché de datos calculados (Guarda distancia y tiempo de cada tramo)
let cacheRecog,
    cacheCarga,
    cacheRetor = null;

// Variable global en el módulo de coordenadas para recordar el cajón seleccionado
// Declaramos la variable en la ventana global del iframe
window.ultimoInputConFoco = null;

//cajones de coordenadas o datos
// Cuando el usuario haga clic o entre a un input, guardamos la referencia de ese cajón
const inptsMapa = [
    document.getElementById('puntoOrigen'),
    document.getElementById('puntoA'),
    document.getElementById('puntoB'),
    document.getElementById('puntoAlterno')
];
inptsMapa.forEach(input => {
    input.addEventListener("focus", (evento) => {
        const idInputActivo = evento.target.id; // 'puntoOrigen', 'puntoA', etc.
        ultimoInputConFoco = idInputActivo;
        // 🚀 LÍNEA NUEVA: Le avisamos al mapa principal que cambiamos de cajón
        window.parent.postMessage({
            tipo: 'CAMBIO_DE_FOCO',
            idInput: idInputActivo
        }, '*');
    });
    input.addEventListener("input", function () {
        const txtInpt = this.value;
        const datalist = document.getElementById('puntos_guardados');
        const opcionSeleccionada = Array.from(datalist.options).find(option => option.value === txtInpt);
        if (opcionSeleccionada) {
            // Guardamos las coordenadas en el dataset del INPUT, no en el value
            this.dataset.geo = opcionSeleccionada.dataset.coordenadas;
            // ⚡ EXTRA INTELIGENTE: Si seleccionó un punto guardado, extraemos la lat y lng
            // Asumiendo que tus coordenadas guardadas están separadas por coma (ej: "3.45, -76.53")
            const [lat, lng] = this.dataset.geo.split(',').map(coord => parseFloat(coord.trim()));
            if (!isNaN(lat) && !isNaN(lng)) {
                // Le avisamos al mapa que pinte de inmediato el pin guardado en su respectivo color
                window.parent.postMessage({
                    tipo: 'PIN_DESDE_DATALIST',
                    idInput: this.id,
                    latitud: lat,
                    longitud: lng
                }, '*');
            }
        } else {
            // Si el usuario borra o escribe texto libre, limpiamos el dato previo
            this.dataset.geo = ""; 
        }
    });
});

function extraerCoordenadas(texto) {
    const regex = /([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)/;
    const match = texto.match(regex);
    if (match) {
        return {
            lat: parseFloat(match[1]), // Corregido: Grupo 1 capturado
            lng: parseFloat(match[2])  // Corregido: Grupo 2 capturado
        };
    }
    return null;
}

async function obtenerDatosRutaOSM(origenStr, destinoStr) {
    const cordOrigen = extraerCoordenadas(origenStr);
    const cordDestino = extraerCoordenadas(destinoStr);
    if (!cordOrigen || !cordDestino) {
        throw new Error("Por favor, ingresa las coordenadas en formato válido: Lat, Lng (Ej: 3.437333, -76.506762)");
    }
    // Proveedor Principal OSRM
    const urlOSRM = `https://router.project-osrm.org/route/v1/driving/${cordOrigen.lng},${cordOrigen.lat};${cordDestino.lng},${cordDestino.lat}?overview=full&geometries=geojson`;
    // Proveedor Secundario de Respaldo Abierto
    const urlORS = `https://openrouteservice.org/${cordOrigen.lng},${cordOrigen.lat}&end=${cordDestino.lng},${cordDestino.lat}`;
    // factor correctivo para obtención de datos de ruta más realistas ya q OMS solo calcula la ruta ideal
    const factorCorrecKmReal = 1.159;
    const factorCorrecTiemReal = 1.42;
    // consulta a la web de mapas
    try {
        const response = await fetch(urlOSRM);
        if (!response.ok)
            throw new Error("Intentando Plan de Respaldo...");
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0)
            throw new Error("Ruta no comercial.");
        console.log("Usando proveedor de mapas principal: OSRM");
        return {
            distancia: (data.routes[0].distance / 1000) * factorCorrecKmReal,
            tiempo: (data.routes[0].duration / 60) * factorCorrecTiemReal,
            geometry: data.routes[0].geometry
        };
    } catch (err) {
        console.warn("Fallo OSRM, usando respaldo:", err.message);
        const responseORS = await fetch(urlORS);
        if (!responseORS.ok)
            throw new Error("Servidores saturados. Revisa tu conexión.");
        const dataORS = await responseORS.json();
        if (!dataORS.features || dataORS.features.length === 0)
            throw new Error("No se encontraron rutas.");
        console.log("Usando proveedor de mapas secundario: ORS");
        return {
            distancia: (dataORS.features[0].properties.summary.distance / 1000) * factorCorrecKmReal,
            tiempo: (dataORS.features[0].properties.summary.duration / 60) * factorCorrecTiemReal,
            geometry: dataORS.features[0].geometry
        };
    }
}

/* Función enlistarPuntosFijos. Despliega en los cajones de búsqueda de coodenadas (y direcciones próximamente)
 * un listado de puntos conocidos o frecuentes, para hacer más fácil su accesibilidad al talvez cambiar 
 * tarifas y recalcular la cotización. */
function enlistarPuntosGuardados() {
    const inputListPuntosGuardados = document.getElementById('puntos_guardados');
    if (!inputListPuntosGuardados) return;
    inputListPuntosGuardados.innerHTML = '';
    const puntos = MIS_PUNTOS;
    puntos.forEach(punto => {
        const option = document.createElement('option');
        // CORRECCIÓN CLAVE: El nombre va en el value para que el navegador lo muestre y filtre
        option.value = punto.nombre; 
        // GUARDADO INVISIBLE: Las coordenadas se ocultan en un atributo personalizado 'data-*'
        option.setAttribute('data-coordenadas', punto.coordenadas);
        inputListPuntosGuardados.appendChild(option);
    });
    console.log("✅ Desplegable único compartido y listo para filtrar por nombre.");
}

async function procesarMiFormularioYCalcular() {
    // inputs obligados
    const inptsReq = [
        inptsMapa[0],
        inptsMapa[1],
        inptsMapa[2]
    ];
    // 1. Filtramos y obtenemos un arreglo con TODOS los inputs que estén vacíos
    let inputsVacios = inptsReq.filter(inpt => !(inpt.dataset.geo || inpt.value.trim()));
    // 2. Si hay al menos un input vacío, activamos la alerta global
    if (inputsVacios.length > 0) {
        alert("Por favor llena todos los campos requeridos.");
        // Recorremos solo los inputs que faltaron para aplicarles el efecto al mismo tiempo
        inputsVacios.forEach(inpt => {
            inpt.classList.add('input_error_shake');
            setTimeout(() => {
                inpt.classList.remove('input_error_shake');
            }, 1500);
        });
        // Buenas prácticas: Ponemos el cursor en el primer campo vacío de la lista
        inputsVacios[0].focus();
        return; // Detiene la ejecución del formulario porque faltan datos
    }
    // el código continúa si todo lo esencial está lleno...
    const pntOrigen = inptsMapa[0].dataset.geo || inptsMapa[0].value;
    const puntoA    = inptsMapa[1].dataset.geo || inptsMapa[1].value;
    const puntoB    = inptsMapa[2].dataset.geo || inptsMapa[2].value;
    // preparamos consulta al servidor si hay tal caso
    let cambioPuntosViaje = false;
    try {// Solo va a internet si los puntos cambian o si no hay caché, comprobados uno por uno
        // TRAMO 1 (Recogida): origen -> Punto A
        if (pntOrigen !== lastOrigen || puntoA !== lastPuntoA || !cacheRecog) {
            cacheRecog = await obtenerDatosRutaOSM(pntOrigen, puntoA);
            lastOrigen = pntOrigen;
            // CORRECCIÓN: Quitamos la asignación prematura de lastPuntoA aquí para no romper el Tramo 2
            //lastPuntoA = puntoA; 
            cambioPuntosViaje = true;
            console.log(`🔄 Recalculando Tramo 1: Recogida de carga`);
        }
        // TRAMO 2 (Viaje con Carga): Punto A -> Punto B
        if (puntoA !== lastPuntoA || puntoB !== lastPuntoB || !cacheCarga) {
            cacheCarga = await obtenerDatosRutaOSM(puntoA, puntoB);
            lastPuntoA = puntoA; // Ahora sí, se actualiza de forma segura para ambos tramos
            lastPuntoB = puntoB;
            cambioPuntosViaje = true;
            console.log(`🔄 Recalculando Tramo 2: Viaje con carga o cargado`);
        }
        // TRAMO 3 (Retorno al punto de partida o punto alternativo): Punto B -> origen/otro
        // si hay final de ruta alterno al origen
        // 1. Capturamos y limpiamos el valor del punto alterno
        // Aseguramos un string vacío '' por defecto si los dos atributos son undefined
        const pntRetorAlt = (inptsMapa[3].dataset.geo || inptsMapa[3].value || '').trim();
        // 2. Determinamos el destino real del retorno y su tipo
        const tieneAlternoValido = pntRetorAlt !== "" && pntRetorAlt !== pntOrigen;
        const destinoRetornoReal = tieneAlternoValido ? pntRetorAlt : pntOrigen;
        const tipoRetornoActual = tieneAlternoValido ? 'ALTERNO' : 'ORIGEN';
        // 3. CONTROL CRÍTICO DE CAMBIOS (Verifica si cambió el Punto B, el destino final o el tipo de retorno)
        const huboCambioEnRetorno = puntoB !== lastPuntoB ||
                tipoRetornoActual !== lastTipoRetorno ||
                (tipoRetornoActual === 'ALTERNO' && pntRetorAlt !== lastRetorAlt) ||
                (tipoRetornoActual === 'ORIGEN' && pntOrigen !== lastOrigen);
        if (huboCambioEnRetorno || !cacheRetor) {
            console.log(`🔄 Recalculando Tramo 3 hacia: ${tipoRetornoActual}`);
            // Llamada única a la API usando el destino real calculado
            cacheRetor = await obtenerDatosRutaOSM(puntoB, destinoRetornoReal);
            // 4. Actualizamos el historial de caché de forma estricta
            lastPuntoB = puntoB;
            lastTipoRetorno = tipoRetornoActual;
            if (tieneAlternoValido) {
                lastRetorAlt = pntRetorAlt;
            } else {
                lastOrigen = pntOrigen;
            }
            cambioPuntosViaje = true;
        }
    } catch (error) {
        console.error("Error en procesamiento: ", error);
        alert(error.message || "Ocurrió un error inesperado calculando las rutas.");
        return;
    }
    // DISPARADOR INTELIGENTE DE COTIZACIÓN
    // Ejecutamos la matemática si hubo un cambio de selectores O si se introdujeron datos nuevos
    // CONTROL DE SELECTORES: Si SOLO cambiaron los selectores, no tocamos la API de OSM - AI
    const cambioTipoViaje = verCambSelectsTipoViaje();
    if (cambioPuntosViaje || cambioTipoViaje || window.EstadoCotizador.cacheTarifaBase === null) {
        // Consolidación de datos usando la caché (fija o recién actualizada)
        // CORRECCIÓN: Validación defensiva. Si por algún motivo una caché falló, no calcula datos rotos
        if (!cacheRecog || !cacheCarga || !cacheRetor) {
            throw new Error("No se pudieron consolidar las rutas de los mapas.");
        }
        const kmsVacio = (cacheRecog.distancia + cacheRetor.distancia);
        const kmsCarga = cacheCarga.distancia;
        const horasViaje = ((cacheRecog.tiempo + cacheCarga.tiempo + cacheRetor.tiempo) / 60);
        // Llamamos la función matemática central de init_modules.js
        calcularCotizacionBase(kmsVacio, kmsCarga, horasViaje);
    }
    if (cambioPuntosViaje){
        console.log("Cambio en los puntos de la ruta.");
    }
}

document.getElementById('btn_calc_coord').addEventListener('click', async function() {
    const boton = this;
    const textoBoton = document.getElementById('btn_text_render');
    // 🛡️ ESCUDO 1: BLOQUEO ANTIESPAM (Si el botón ya está procesando, frena de inmediato)
    if (boton.disabled) return;
    try {
        // Deshabilitamos el botón y cambiamos el texto para que el usuario sepa que está cargando
        boton.disabled = true;
        boton.style.opacity = "0.6";
        if (textoBoton) textoBoton.innerText = "⏳ Calculando rutas en OSM...";
        // 1. Ejecutamos el motor de rutas. El 'await' congela el flujo hasta que internet responda
        // Si faltan campos obligatorios, la función interna tirará un 'return' o error
        await procesarMiFormularioYCalcular();
        // 🛡️ ESCUDO 2: PILOTO DE VALIDACIÓN DE CACHÉ
        // Si la función anterior falló, no fue a internet o los campos estaban vacíos, 
        // cacheTarifaBase seguirá valiendo null. En ese caso, detenemos el flujo aquí.
        if (window.EstadoCotizador.cacheTarifaBase === null) {
            console.warn("⚠️ Operación cancelada: La tarifa base no se ha generado.");
            return; 
        }
        // 2. TRAMO FINAL: Solo si la ruta es válida y real, consolidamos extras y pintamos
        // Esta línea ESPERARÁ pacientemente. Solo se ejecuta cuando la función await de arriba da luz verde
        window.renderizarCuadroResultado();
    } catch (error) {
        console.error("Error en la ejecución del botón:", error);
    } finally {
        // RESTRICCION TEMPORAL: Volvemos a habilitar el botón de forma limpia pase lo que pase
        boton.disabled = false;
        boton.style.opacity = "1";
        if (textoBoton) textoBoton.innerText = "🔍 Calcular Ruta y Cotizar";
    }
});

// Escuchador que recibe las coordenadas desde el mapa gráfico
window.addEventListener('message', function(evento) {
    const coodenadas = evento.data;
    if (coodenadas && coodenadas.tipo === 'NUEVAS_COORDENADAS') {
        console.log("llegaron las coordenadas");
        // 🛠️ CORRECCIÓN: Buscamos el elemento real usando el ID guardado (evitamos usar 'window.variable')
        const inputDestino = document.getElementById(ultimoInputConFoco);
        if (inputDestino) {
            const cadenaCoordenadas = `${coodenadas.latitud}, ${coodenadas.longitud}`;
            // Inyectamos las coordenadas en el value visualmente
            inputDestino.value = cadenaCoordenadas;
            // Guardamos también en el dataset para mantener la coherencia con tu lógica de rutas
            inputDestino.dataset.geo = cadenaCoordenadas;
            // Disparamos el evento input por si tienes validaciones en tiempo real de costos
            inputDestino.dispatchEvent(new Event('input', { bubbles: true }));
            // ❌ SE ELIMINA: 
            // ultimoInputConFoco = null; 
            // Esto permite que si el usuario vuelve a clicar el mapa, se actualice el MISMO input sin bloquearse.
        } else {
            console.warn("No se han inyectado las coordenadas porque no has seleccionado ningún cajón.");
            alert("Primero selecciona el campo que quieres llenar (puntoOrigen, puntoA, puntoB o puntoAlterno)");
        }
    }
});

// 🧠 ESTRATEGIA DE SEGURIDAD PARA NAVEGAR EL MAPA SIN DAÑAR DATOS:
// Limpiamos la memoria del foco SOLO cuando el usuario hace clic afuera de los inputs (en el fondo del formulario)
document.addEventListener('click', function(evento) {
    // Si el clic NO fue en ninguno de nuestros inputs de coordenadas, reseteamos el foco de seguridad
    const inputsIds = ['puntoOrigen', 'puntoA', 'puntoB', 'puntoAlterno'];
    if (!inputsIds.includes(evento.target.id)) {
        ultimoInputConFoco = null;
        // También le avisamos al mapa principal que ya no hay ningún input activo
        window.parent.postMessage({ tipo: 'CAMBIO_DE_FOCO', idInput: null }, '*');
    }
});

document.addEventListener("DOMContentLoaded", function () {
    enlistarPuntosGuardados();
});