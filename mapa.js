/* global L */ // línea para ignorar advertencias de variables globales no cargadas como no definidas
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
    }
};
// Carga el mapa gráfico al iniciar la página
window.onload = () => {
    ModuloMapa.init();
};