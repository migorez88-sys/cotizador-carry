/* global L */ 
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
            try{
                // El mapa va a mirar la ventana del iframe (donde corre coord.js)
                const coordIframe = this.iframeCoord.contentWindow;
                if(coordIframe.ultimoInputConFoco !== null){
                    this.enviarCoordenadas(lat, lng);
                }
            } catch (error){
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
        // Envía el mensaje de forma segura al iframe sin preocuparse por el foco para que coord lo gestione
        this.iframeCoord.contentWindow.postMessage(datosCoordenadas, '*');
    },
    
    // 🚀 NUEVA FUNCIÓN: Obtiene la ubicación GPS y la envía al mapa e iframe
    obtenerUbicacionActual: function () {
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
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        alert("Acceso denegado. Por favor, habilita los permisos de ubicación en tu navegador.");
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
                timeout: 8000,            // Tiempo límite de espera: 8 segundos
                maximumAge: 0             // No lee ubicaciones viejas guardadas en caché
            }
        );
    }
};

// Carga el mapa gráfico al iniciar la página
window.onload = () => {
    ModuloMapa.init();
};