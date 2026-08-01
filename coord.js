let lastOrigen,
    lastPuntoA,
    lastPuntoB,
    lastRetorAlt,
    lastTipoRetorno = null;// Guardará 'ORIGEN' o 'ALTERNO'

// Caché de datos calculados (Guarda distancia y tiempo de cada tramo)
let
        cacheRecog,
        cacheCarga,
        cacheRetor = null;

// Variable global en el módulo de coordenadas para recordar el cajón seleccionado
// Declaramos la variable en la ventana global del iframe
window.ultimoInputConFoco = null;

// Cuando el usuario haga clic o entre a un input, guardamos la referencia de ese cajón
document.getElementById('puntoOrigen').addEventListener('focus', function() {
    window.ultimoInputConFoco = this;
});
document.getElementById('puntoA').addEventListener('focus', function() {
    window.ultimoInputConFoco = this;
});
document.getElementById('puntoB').addEventListener('focus', function() {
    window.ultimoInputConFoco = this;
});
document.getElementById('puntoAlterno').addEventListener('focus', function() {
    window.ultimoInputConFoco = this;
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

//cajones de coordenadas o datos
const inptPuntoOrigen = document.getElementById('puntoOrigen');//.value;
const inptPuntoA = document.getElementById('puntoA');//.value;
const inptPuntoB = document.getElementById('puntoB');//.value;
const inptPuntoAlterno = document.getElementById('puntoAlterno');

[inptPuntoOrigen, inptPuntoA, inptPuntoB, inptPuntoAlterno].forEach(input => {//
    input.addEventListener("input", function () {
        const txtInpt = this.value;
        const datalist = document.getElementById('puntos_guardados');
        const opcionSeleccionada = Array.from(datalist.options).find(option => option.value === txtInpt);
        if (opcionSeleccionada) {
            // Guardamos las coordenadas en el dataset del INPUT, no en el value
            this.dataset.geo = opcionSeleccionada.dataset.coordenadas;
        } else {
            // Si el usuario borra o escribe texto libre, limpiamos el dato previo
            this.dataset.geo = ""; 
        }
    });
});

async function procesarRutasYCalcular() {
    // inputs obligados
    const inptsReq = [
        inptPuntoOrigen,
        inptPuntoA,
        inptPuntoB
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
    const pntOrigen = inptPuntoOrigen.dataset.geo || inptPuntoOrigen.value;
    const puntoA = inptPuntoA.dataset.geo || inptPuntoA.value;
    const puntoB = inptPuntoB.dataset.geo || inptPuntoB.value;
    // CONTROL DE SELECTORES: Si SOLO cambiaron los selectores, no tocamos la API de OSM - AI
    const   cambioTipoViaje = verificarCambiosTipoViaje();
    let     cambioPuntosViaje = false;
    // preparamos consulta al servidor si hay tal caso
    try {
        // Solo va a internet si los puntos cambian o si no hay caché, comprobados uno por uno
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
        const pntRetorAlt = (inptPuntoAlterno.dataset.geo || inptPuntoAlterno.value || '').trim();
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
        if (cambioPuntosViaje)
            console.log("Cambio en los puntos de la ruta.");
        // DISPARADOR INTELIGENTE DE COTIZACIÓN
        // Ejecutamos la matemática si hubo un cambio de selectores O si se introdujeron datos nuevos
        if (cambioPuntosViaje || cambioTipoViaje) {
            // Consolidación de datos usando la caché (fija o recién actualizada)
            // CORRECCIÓN: Validación defensiva. Si por algún motivo una caché falló, no calcula datos rotos
            if (!cacheRecog || !cacheCarga || !cacheRetor) {
                throw new Error("No se pudieron consolidar las rutas de los mapas.");
            }
            const kmsVacio = (cacheRecog.distancia + cacheRetor.distancia);
            const kmsCarga = cacheCarga.distancia;
            const horasViaje = ((cacheRecog.tiempo + cacheCarga.tiempo + cacheRetor.tiempo) / 60);
            // Llamamos la función matemática central de init_modules.js
            calcularCotizacion(kmsVacio, kmsCarga, horasViaje);
        }
    } catch (error) {
        console.error("Error en procesamiento: ", error);
        alert(error.message || "Ocurrió un error inesperado calculando las rutas.");
    }
}

// Escuchador que recibe las coordenadas desde el mapa gráfico
window.addEventListener('message', function(evento) {
    const coodenadas = evento.data;
    if (coodenadas && coodenadas.tipo === 'NUEVAS_COORDENADAS') {
        console.log("llegaron las coordenadas");
        // VALIDACIÓN CLAVE: Verificamos si el usuario seleccionó previamente algún cajón
        if (ultimoInputConFoco !== null) {
            // Aquí puedes armar la cadena como tú prefieras. Ejemplo: "Lat, Lng"
            const cadenaCoordenadas = `${coodenadas.latitud}, ${coodenadas.longitud}`;
            // Inyectamos los datos directamente en el cajón guardado en memoria
            window.ultimoInputConFoco.value = cadenaCoordenadas;
            // Disparamos el evento input por si tienes validaciones en tiempo real
            //ultimoInputConFoco.dispatchEvent(new Event('input', { bubbles: true }));
            // OPCIONAL: Le devolvemos el foco visualmente si quieres que el cursor siga ahí
            //ultimoInputConFoco.focus();
            // después de llenar se pierda todos los focos, y tenga q seleccionar nuevamente
            // para q pueda seguir navegando en el mapa sin que se cambie el último valor
            window.ultimoInputConFoco = null;
        } else {
            console.warn("No se han inyectado las coordenadas porque no has seleccionado ningún cajón en el formulario.");
            alert("Primero selecciona el campo que quieres llenar (base, punto A o punto B");
        }
    } else {
        console.warn("No llegaron las coordenadas");
    }
});

document.addEventListener("DOMContentLoaded", function () {
    enlistarPuntosGuardados();
});