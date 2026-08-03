/* global L */ 

let lastPuntoActual = null;

// MÓDULO DEL MAPA GRÁFICO (Lógica de Dibujo e Interacción)
const ModuloMapa = {
    instanciaMapa: null,
    marcadorActual: null,
    iframeCoord: document.getElementById('iframe_cont_coord'),
    init: function () {
        // INICIALIZA EL MAPA GRÁFICO
        this.instanciaMapa = L.map('mapa_grafico').setView([3.4516, -76.5320], 12);
        // DIBUJA EL MAPA EN PANTALLA
        L.tileLayer(
                'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                {attribution: '&copy; OpenStreetMap'}
        ).addTo(this.instanciaMapa);
        // 🛠️ PARCHE CRÍTICO: Fuerza a Leaflet a recalcular y "pintar" los mosaicos en pantalla
//        setTimeout(() => {
//            this.instanciaMapa.invalidateSize();
//            console.log("🔄 Motor gráfico recalibrado y forzado a dibujarse.");
//        }, 200);
        // CAPTURA EL CLICK SOBRE MAPA GRÁFICO
        this.instanciaMapa.on('click', (evento) => {
            const {lat, lng} = evento.latlng;
            this.actualizarMarcadorGrafico(lat, lng);
            try {
                // El mapa va a mirar la ventana del iframe (donde corre coord.js)
                const coordIframe = this.iframeCoord.contentWindow;
                if (coordIframe.ultimoInputConFoco !== null) {
                    this.enviarCoordenadas(lat, lng);
                }
            } catch (error) {
                console.error(error);
            }
        });
    },
    // solución IA para llenar los campos de coordenadas
    actualizarMarcadorGrafico: function (lat, lng) {
        if (this.marcadorActual) {
            this.marcadorActual.setLatLng([lat, lng]);
        } else {
            this.marcadorActual = L.marker([lat, lng]).addTo(this.instanciaMapa);
        }
    },
    enviarCoordenadas: function (lat, lng) {
        const datosCoordenadas = {
            tipo: 'NUEVAS_COORDENADAS',
            latitud: lat.toFixed(6),
            longitud: lng.toFixed(6)
        };
        //lastPuntoActual = datosCoordenadas;
        // Envía el mensaje de forma segura al iframe sin preocuparse por el foco para que coord lo gestione
        this.iframeCoord.contentWindow.postMessage(datosCoordenadas, '*');
    },

    // 🚀 NUEVA FUNCIÓN: Obtiene la ubicación GPS y la envía al mapa e iframe
    obtenerUbicacionActual: function () {
        const coordIframe = this.iframeCoord.contentWindow;
        if (coordIframe.ultimoInputConFoco !== null) {
            if (!navigator.geolocation) {
                alert("Tu navegador no soporta la obtención de geolocalización.");
                return;
            }
            // Animación visual o mensaje de carga opcional aquí
            navigator.geolocation.getCurrentPosition(
                    (posicion) => {
                const lat = posicion.coords.latitude;
                const lng = posicion.coords.longitude;
                // 1. Centra el mapa de Leaflet en la posición actual del usuario con zoom 16 (más cerca)
                this.instanciaMapa.setView([lat, lng], 16);
                // 2. Dibuja o mueve el marcador gráfico a tu posición real
                this.actualizarMarcadorGrafico(lat, lng);
                // 3. Envía los datos de forma segura a través del postMessage a tu iframe
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
                    {
                        enableHighAccuracy: true, // Fuerza el uso de GPS si está disponible en móviles
                        timeout: 8000, // Tiempo límite de espera: 8 segundos
                        maximumAge: 0             // No lee ubicaciones viejas guardadas en caché
                    }
            );
        } else {
            alert("Primero selecciona el campo que quieres llenar (base/origen, punto A o punto B");
        }
    }
};

// Carga el mapa gráfico al iniciar la página
window.onload = () => {
    ModuloMapa.init();
};