/* global L */ 

// MÓDULO DEL MAPA GRÁFICO (Lógica de Dibujo e Interacción)
const ModuloMapa = {
    instanciaMapa: null,
    iframeCoord: document.getElementById('iframe_cont_coord'),
    // 🎨 Diccionario de marcadores independientes por cada input
    marcadores: {
        'puntoOrigen': null, // O el ID exacto que use tu primer input en coord.html
        'puntoA': null,
        'puntoB': null,
        'puntoAlterno': null
    },
    inputActivoActual: null,
    obtenerUbicacionActual: function () {
        const coordIframe = this.iframeCoord.contentWindow;
        const inputActivo = coordIframe.ultimoInputConFoco;
        if (inputActivo) {
            if (!navigator.geolocation) {
                alert("Tu navegador no soporta la obtención de geolocalización.");
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (posicion) => {
                    const lat = posicion.coords.latitude;
                    const lng = posicion.coords.longitude;
                    this.instanciaMapa.setView([lat, lng], 16);
                    this.actualizarMarcadorGrafico(lat, lng, inputActivo);
                    this.enviarCoordenadas(lat, lng);
                    console.log("📍 Ubicación actual enviada con éxito:", lat, lng);
                },
                (error) => {
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            // 🚀 MEJORA DE INTERFAZ: Instrucciones directas de reactivación rápida
                            alert(
                                    "⚠️ ACCESO AL GPS BLOQUEADO\n\n" +
                                    "Para solucionarlo en 2 segundos desde esta misma pantalla\n\
                                    si no te da la opción automáticamente el navegador:\n\n" +
                                    "1. Toca el botón de los tres puntos verticales (...) en alguna esquina del navegador.\n" +
                                    "2. Entra a Configuración (o Ajustes).\n" +
                                    "3. Desliza y entra a Configuración de sitios.\n\n" +
                                    "4. Sigue las instrucciones de tu navegador o busca \n\
                                    Permisos (de tu navegador) -> Localización y actívalos.\n\n" +
                                    "¡Listo! Vuelve a presionar el botón de ubicación actual."
                                    );
                            break;
                        case error.POSITION_UNAVAILABLE:
                            alert("La información de tu ubicación no está disponible actualmente.");
                            break;
                        case error.TIMEOUT:
                            alert("Se agotó el tiempo de espera para obtener tu ubicación.");
                            break;
                    }
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
            );
        } else {
            alert("Primero selecciona el campo que quieres llenar (base/origen, punto A o punto B)");
        }
    },
    enviarCoordenadas: function (lat, lng) {
        const datosCoordenadas = {
            tipo: 'NUEVAS_COORDENADAS',
            latitud: lat.toFixed(6),
            longitud: lng.toFixed(6)
        };
        this.iframeCoord.contentWindow.postMessage(datosCoordenadas, '*');
    },
    // 🛠️ Función interna optimizada con SVG nativo (Evita bloqueos de red y ORB)
    crearIconoColor: function (colorClase) {
        return L.divIcon({
            // 🎯 CLAVE: Añadimos 'leaflet-marker-icon' para que herede las físicas nativas de Leaflet
            className: `custom-pin-icon ${colorClase} leaflet-marker-icon`,
            iconSize: [25, 41], // 📐 Tamaño del contenedor del pin
            iconAnchor: [12.5, 41], // 🎯 Punta inferior clavada en la coordenada
            popupAnchor: [1, -34], // 💬 Posición del popup flotante
            // 🎯 CORRECCIÓN: Enlace xmlns restaurado al formato oficial de la W3C
            html: `<svg xmlns="http://w3.org" 
                        viewBox="0 0 24 24" 
                        class="svg-marker-pin" 
                        style="width: 25px; height: 41px; display: block;">
                    <ellipse cx="12" cy="22" rx="5" ry="2" fill="rgba(0,0,0,0.25)" />
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" class="pin-body"/>
                   </svg>`
        });
    },
    // 🚀 LÓGICA DE PINES POR COLORES ASIGNADOS
    actualizarMarcadorGrafico: function (lat, lng, idInput) {
        // Asignación estricta de colores según el ID del input activo
        let colorClase = 'pin-azul'; // Por defecto por seguridad
        if (idInput === 'puntoOrigen') {
            colorClase = 'pin-verde';       // Origen / Base
        } else if (idInput === 'puntoA') {
            colorClase = 'pin-amarillo';      // Punto A (Carga)
        } else if (idInput === 'puntoB') {
            colorClase = 'pin-rojo';   // Punto B (Descarga)
        } else if (idInput === 'puntoAlterno') {
            colorClase = 'pin-blanco';     // 🏁 Punto Alterno Opcional (Claro)
        }
        // 🛠️ PARCHE CRÍTICO: Si el pin ya existía en el mapa, lo borramos por completo
        if (this.marcadores[idInput]) {
            this.instanciaMapa.removeLayer(this.marcadores[idInput]);
        }
        this.marcadores[idInput] = L.marker([lat, lng], {
            icon: this.crearIconoColor(colorClase)
        }).addTo(this.instanciaMapa);
    },
    recalcularVistaRuta: function () {
        setTimeout(() => {
            const coordenadasActivas = [];
            for (const pin in this.marcadores) {
                const marcador = this.marcadores[pin];
                // Verificamos de forma estricta que el marcador no sea nulo, que tenga posición 
                // y que realmente se encuentre dibujado y visible en la instancia del mapa actual
                if (marcador && typeof marcador.getLatLng === 'function' &&
                        this.instanciaMapa.hasLayer(marcador)) {
                    coordenadasActivas.push(marcador.getLatLng());
                }
            } 
            console.log(`📌 Pines reales detectados en pantalla para encuadre: ${coordenadasActivas.length}`);
            // 3. Si hay más de un pin dibujado, encuadramos la pantalla proporcionalmente
            if (coordenadasActivas.length > 1) {
                // L.latLngBounds agrupa todos los puntos y fitBounds estira el mapa para verlos a todos
                const limites = L.latLngBounds(coordenadasActivas);
                // 🎯 OPERACIÓN CLAVE: Calculamos el centro matemático exacto en medio de los pines
                const centroRealDeLaRuta = limites.getCenter();
                // Forzamos un re-escaneo final del tamaño de pantalla justo antes del encuadre
                this.instanciaMapa.invalidateSize();
                // 🎯 MOVIMIENTO 1: Movemos el centro del mapa directamente a la mitad de la ruta
                this.instanciaMapa.setView(centroRealDeLaRuta, this.instanciaMapa.getZoom(), {animate: false});
                // 🎯 MOVIMIENTO 2: Aplicamos el zoom estirando el mapa alrededor de ese nuevo centro
                this.instanciaMapa.fitBounds(limites, {
                    // Margen de seguridad en píxeles para que los pines no queden pegados a los bordes
                    padding: [50, 50],
                    // Evita que si los puntos están exageradamente cerca haga un zoom ultra-profundo
                    maxZoom: 15,
                    animate: true, // Animación suave de apertura de cámara
                    duration: 0.5      // Duración de la animación en segundos
                });
                console.log(`📐 Mapa centrado con éxito en: ${centroRealDeLaRuta.toString()}`);
            } else if (coordenadasActivas.length === 1) {
                // Si es el primer y único pin en el mapa, hacemos un zoom estándar y suave
                this.instanciaMapa.setView(coordenadasActivas[0], 13);
            }
        }, 150); // ⏱️ 50 milisegundos son imperceptibles para el usuario pero vitales para el motor gráfico
    },
    init: function () {
        // INICIALIZA EL MAPA GRÁFICO
        this.instanciaMapa = L.map('mapa_grafico').setView([3.4516, -76.5320], 12);
        // DIBUJA EL MAPA EN PANTALLA
        L.tileLayer(
                'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                {attribution: '&copy; OpenStreetMap'}
        ).addTo(this.instanciaMapa);
        // CAPTURA EL CLICK SOBRE MAPA GRÁFICO
        this.instanciaMapa.on('click', (evento) => {
            const {lat, lng} = evento.latlng;
            try {
                const coordIframe = this.iframeCoord.contentWindow;
                const inputActivo = coordIframe.ultimoInputConFoco; // Ej: 'puntoBase', 'puntoA', 'puntoB', 'Retorno alterno'
                if (inputActivo) {
                    // 1. Mueve o crea el pin correspondiente a ese input
                    this.actualizarMarcadorGrafico(lat, lng, inputActivo);
                    // 2. Envía las coordenadas al formulario
                    this.enviarCoordenadas(lat, lng);
                } else {
                    alert("Primero haz clic en un campo del formulario para saber dónde guardar este punto.");
                }
            } catch (error) {
                console.error(error);
            }
        });
        window.addEventListener('message', (evento) => {
            if (!evento.data)
                return;
            if (evento.data.tipo === 'CAMBIO_DE_FOCO') {
                this.inputActivoActual = evento.data.idInput;
                console.log("📥 El mapa sabe que el usuario pasó al cajón:", this.inputActivoActual);
            }
            // 🚀 NUEVA CONDICIÓN: Escucha la orden de borrado desde el iframe
            if (evento.data.tipo === 'BORRAR_PIN_INPUT') {
                const idInputABorrar = evento.data.idInput;
                // 🛠️ Verificamos si existe el pin dibujado en el mapa
                if (this.marcadores[idInputABorrar]) {
                    // 1. Lo removemos físicamente de la pantalla de Leaflet
                    this.instanciaMapa.removeLayer(this.marcadores[idInputABorrar]);
                    // 2. Lo volvemos nulo en nuestro archivador de memoria
                    this.marcadores[idInputABorrar] = null;
                    console.log(`🗑️ Pin eliminado del mapa debido a limpieza en input: ${idInputABorrar}`);
                    // 3. Volvemos a recalcular el zoom a la ruta con los pines que queden vivos
                    this.recalcularVistaRuta();
                }
            }
            // 🚀 NUEVA CONDICIÓN: Si el usuario eligió del datalist o pega las coordenadas, pintamos el pin de golpe
            if (evento.data.tipo === 'PIN_DESDE_DATALIST') {
                const {idInput, latitud, longitud} = evento.data;
                // 🛠️ PARCHE OPERATIVO: Obligamos al motor a re-escanear las dimensiones físicas 
                // Forzamos primero a Leaflet a actualizar su tamaño real en el layout
                // de la pantalla del celular por si el iframe generó un desfase visual
                this.instanciaMapa.invalidateSize();
                this.actualizarMarcadorGrafico(latitud, longitud, idInput);
                // Opcional: Centrar el mapa en ese punto favorito que acaba de cargar
                //this.instanciaMapa.setView([latitud, longitud], 14);
                this.recalcularVistaRuta();
            }
        });
    }
};

window.onload = () => { ModuloMapa.init(); };