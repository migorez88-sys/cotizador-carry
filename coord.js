let
        lastBase,
        lastPuntoA,
        lastPuntoB = null;
// Caché de datos calculados (Guarda distancia y tiempo de cada tramo)
let
        cacheRecog,
        cacheCarga,
        cacheRetor = null;
// Variable global en el módulo de coordenadas para recordar el cajón seleccionado
// Declaramos la variable en la ventana global del iframe
window.ultimoInputConFoco = null;
// Cuando el usuario haga clic o entre a un input, guardamos la referencia de ese cajón
document.getElementById('puntoBase').addEventListener('focus', function() {
    window.ultimoInputConFoco = this;
});
document.getElementById('puntoA').addEventListener('focus', function() {
    window.ultimoInputConFoco = this;
});
document.getElementById('puntoB').addEventListener('focus', function() {
    window.ultimoInputConFoco = this;
});
/* Función enlistarPuntosFijos. Despliega en los cajones de búsqueda de coodenadas (y direcciones próximamente)
 * un listado de puntos conocidos o frecuentes, para hacer más fácil su accesibilidad al talvez cambiar 
 * tarifas y recalcular la cotización. */
function enlistarPuntosGuardados() {
    const inputListSedesPredet = document.getElementById('sedes_predeterminadas');
    inputListSedesPredet.innerHTML = '';
    MIS_SEDES.forEach(sede => {
        const option = document.createElement('option');
        option.value = sede.coodenadas;
        option.textContent = sede.nombre;
        inputListSedesPredet.appendChild(option);
    });
    console.log("Desplegable único compartido y listo.");
}

// Escuchador que recibe las coordenadas desde el mapa gráfico
window.addEventListener('message', function(evento) {
    const coodenadas = evento.data;
    if (coodenadas && coodenadas.tipo === 'NUEVAS_COORDENADAS') {
        console.warn("llegaron las coordenadas");
        // VALIDACIÓN CLAVE: Verificamos si el usuario seleccionó previamente algún cajón
        //if (ultimoInputConFoco) {
            // Aquí puedes armar la cadena como tú prefieras. Ejemplo: "Lat, Lng"
            const cadenaCoordenadas = `${coodenadas.latitud}, ${coodenadas.longitud}`;
            // Inyectamos los datos directamente en el cajón guardado en memoria
            window.ultimoInputConFoco.value = cadenaCoordenadas;
            // Disparamos el evento input por si tienes validaciones en tiempo real
            //ultimoInputConFoco.dispatchEvent(new Event('input', { bubbles: true }));
            // OPCIONAL: Le devolvemos el foco visualmente si quieres que el cursor siga ahí
            //ultimoInputConFoco.focus();
            // después de llenar se pierda todos los focos, y tenga q seleccionar nuevamente
            window.ultimoInputConFoco = null;
        //} else {
        //    console.warn("No se han inyectado las coordenadas porque no has seleccionado ningún cajón en el formulario.");
        //    alert("Primero selecciona el campo que quieres llenar (base, punto A o punto B");
        //}
    } else {
        console.warn("NO llegaron las coordenadas");
    }
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
    try {
        const response = await fetch(urlOSRM);
        if (!response.ok)
            throw new Error("Intentando Plan de Respaldo...");
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0)
            throw new Error("Ruta no comercial.");
        return {
            distancia: data.routes[0].distance / 1000,
            tiempo: data.routes[0].duration / 60,
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
        return {
            distancia: dataORS.features[0].properties.summary.distance / 1000,
            tiempo: dataORS.features[0].properties.summary.duration / 60,
            geometry: dataORS.features[0].geometry
        };
    }
}
async function procesarRutasYCalcular() {
    //datos de los cajones
    const base = document.getElementById('puntoBase').value;
    const puntoA = document.getElementById('puntoA').value;
    const puntoB = document.getElementById('puntoB').value;
    if (!base || !puntoA || !puntoB) {
        alert("Por favor llena todos los campos requeridos.");
        return;
    }
    // CONTROL DE SELECTORES: Si SOLO cambiaron los selectores, no tocamos la API de OSM - AI
    const   cambioTipoViaje = verificarCambiosTipoViaje();
    let     cambioPuntosViaje = false;
    try {
        // TRAMO 1: Recogida (Base -> Punto A)
        // Solo va a internet si la base o el punto A cambiaron, o si no hay caché
        if (base !== lastBase || puntoA !== lastPuntoA || !cacheRecog) {
            cacheRecog = await obtenerDatosRutaOSM(base, puntoA);
            cambioPuntosViaje = true;
        }
        // TRAMO 2: Viaje con Carga (Punto A -> Punto B)
        // Solo va a internet si el punto A o el punto B cambiaron, o si no hay caché
        if (puntoA !== lastPuntoA || puntoB !== lastPuntoB || !cacheCarga) {
            cacheCarga = await obtenerDatosRutaOSM(puntoA, puntoB);
            cambioPuntosViaje = true;
        }
        // TRAMO 3: Retorno al punto de partida (Punto B -> Base)
        // Solo va a internet si el punto B o la base cambiaron, o si no hay caché
        if (puntoB !== lastPuntoB || base !== lastBase || !cacheRetor) {
            cacheRetor = await obtenerDatosRutaOSM(puntoB, base);
            cambioPuntosViaje = true;
        }
        // DISPARADOR INTELIGENTE DE COTIZACIÓN
        // Ejecutamos la matemática si hubo un cambio de selectores O si se trajeron datos nuevos de red
        if (cambioPuntosViaje || cambioTipoViaje) {
            // Consolidación de datos usando la caché (fija o recién actualizada)
            const kmsVacio = cacheRecog.distancia + cacheRetor.distancia;
            const kmsCarga = cacheCarga.distancia;
            const horasViaje = (cacheRecog.tiempo + cacheCarga.tiempo + cacheRetor.tiempo) / 60;
            // Llamamos la función matemática central de init.js
            calcularCotizacion(kmsVacio, kmsCarga, horasViaje);
            // Actualizamos el historial de coordenadas para la siguiente revisión
            lastBase = base;
            lastPuntoA = puntoA;
            lastPuntoB = puntoB;
        }
    } catch (error) {
        alert(error.message);
    }
}