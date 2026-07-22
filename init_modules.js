/* funciones generales de la app */
// comprobación de estado de los select de factores o tipos de viaje (carga, operación, tráfico)
let lastStateTipos = {
    lastTipoCarga: "",
    lastTipoOperacion: "",
    lastTipoTrafico: ""
};
// FUNCIÓN FILTRO: Bloquea físicamente cualquier tecla que no sea un número o un punto decimal - AI
function filtrarSoloNumeros(event) {
    const tecla = event.key;
    // Permitir teclas de control del teclado (Borrar, flechas, Suprimir, Tabulador, Enter)
    if (['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab', 'Enter'].includes(tecla)) {
        return true;
    }
    // Permitir números del 0 al 9 y un único punto decimal
    // El 'event.target.value' es el texto actual que ya está escrito en la caja
    if (tecla === ',') {
        // Si ya hay un punto decimal en la caja, bloqueamos el segundo punto
        if (event.target.value.includes(',')) {
            event.preventDefault();
            return false;
        }
        return true;
    }
    // Expresión regular: Si la tecla NO es un número entre 0 y 9, cancelamos la pulsación
    if (!/^[0-9]$/.test(tecla)) {
        event.preventDefault(); // Esta orden mágica evita que la letra aparezca en pantalla
        return false;
    }
}
// FUNCIÓN DE COMPROBACIÓN RÁPIDA DE CAMBIO DE PARÁMETROS DE COTIZACIÓN (Filtro Inteligente) - IA
function verificarCambiosTipoViaje() {
    // Capturamos los elementos del HTML actual de forma segura usando el operador '?'
    const selectTipoCarga       = document.getElementById('tipoCarga_display')?.value || 'suave';
    const selectTipoOperacion   = document.getElementById('tipoOperacion_display')?.value || 'normal';
    const selectTipoTrafico     = document.getElementById('tipoTrafico_display')?.value || 'valle';
    // REGLA DE ORO: Si los 3 valores actuales son IGUALES a los guardados en la caché, NO CALCULES NADA
    if (
        selectTipoCarga     === lastStateTipos.lastTipoCarga &&
        selectTipoOperacion === lastStateTipos.lastTipoOperacion &&
        selectTipoTrafico   === lastStateTipos.lastTipoTrafico
    ) {
        console.log("⚡ Selects sin cambios. Recálculo cancelado para ahorrar RAM.");
        return false; // Retorna falso: Significa "No hay cambios reales"
    }
    // Si el código llega aquí, significa que el usuario SÍ movió algún selector
    // Por lo tanto, actualizamos la caché con los nuevos valores para la próxima revisión
    lastStateTipos.lastTipoCarga = selectTipoCarga;
    lastStateTipos.lastTipoOperacion = selectTipoOperacion;
    lastStateTipos.lastTipoTrafico = selectTipoTrafico;

    console.log("🔄 Se detectó un cambio en los selectores. Procediendo al sgte. paso.");
    return true; // Retorna verdadero: Significa "Proceder, el estado cambió"
}
// mensaje de carga de cálculo de cotización
function cargarCalculoCotizacion(){
    document.getElementById('loadingMsg').style.display = 'block';
    document.getElementById('resultBox').style.display = 'none';
}
// FUNCIÓN GLOBAL: Convierte horas decimales (ej: 1.25) a texto legible (1 hr 15 min) - IA
function formatearTiempoLegible(horasDecimales) {
    // 1. Validar que sea un número válido y mayor a 0
    const tiempo = parseFloat(horasDecimales) || 0;
    if (tiempo <= 0) {
        return "0 min";
    }
    // 2. Extraer las horas enteras (quitando los decimales)
    const horasEnteras = Math.floor(tiempo);
    // 3. Extraer la parte decimal y convertirla a minutos exactos
    // Usamos Math.round para evitar errores de precisión decimal en JavaScript
    const minutosCalculados = Math.round((tiempo - horasEnteras) * 60);
    // 4. Construir el texto de forma inteligente según el resultado
    let textoDesglosado = "";
    // Si hay horas, las agregamos al texto
    if (horasEnteras > 0) {
        textoDesglosado += `${horasEnteras} ${horasEnteras === 1 ? 'hr' : 'hrs'}`;
    }
    // Si hay minutos, los agregamos. Si ya había horas, ponemos un espacio de separación
    if (minutosCalculados > 0) {
        if (textoDesglosado !== "")
            textoDesglosado += " ";
        textoDesglosado += `${minutosCalculados} min`;
    }
    return textoDesglosado;
}
// exportar texto comercial
function copiarWhatsApp() {
    const texto = document.getElementById('summaryText').innerText;
    navigator.clipboard.writeText(texto).then(() => {
        alert("¡Cotización copiada!");
    });
}
// FUNCIÓN MATEMÁTICA GLOBAL DE LIQUIDACIÓN
function calcularCotizacion(kmsVacio, kmsCarga, horasViaje) {
    // Capturar valores de selects tipo viaje (mis tres selects generales: tipoCarga, tipoOperacion, tipoTrafico)
    // Optimización de captura de selectores globales y sus factores matemáticos
    const tipoCarga = document.getElementById('tipoCarga_display')?.value || 'suave';
    const tipoOperacion = document.getElementById('tipoOperacion_display')?.value || 'normal';
    const tipoTrafico = document.getElementById('tipoTrafico_display')?.value || 'valle';
    // Extracción directa de multiplicadores desde las matrices de la Carry
    const factorTipoCarga = TARIFAS_CARRY.FACTORES_TIPOCARGA[tipoCarga];
    const factorOperativo = TARIFAS_CARRY.FACTORES_OPERACION[tipoOperacion];
    const factorTrafico = TARIFAS_CARRY.FACTORES_TRAFICO[tipoTrafico];
    // 4. MATEMÁTICA LOGÍSTICA DE LA SUZUKI CARRY
    // costos de combustible
    const costoCombustible =
            (kmsVacio / TARIFAS_CARRY.cons) * TARIFAS_CARRY.gaso +
            (kmsCarga / TARIFAS_CARRY.cons) * TARIFAS_CARRY.gaso * factorTipoCarga;
    ;
    /* costos rodamiento del vehículo */
    // kms vacío equivale al recorrido hecho para ir a buscar la carga + el regreso a la base o sede
    const costRodaVacio = kmsVacio * TARIFAS_CARRY.km_base;
    const costRodaCargaBase = kmsCarga * TARIFAS_CARRY.km_base;
    const recargoTipoCarga = costRodaCargaBase * (factorTipoCarga - 1);
    let   recargotipoOperacion = 0;
    if (tipoOperacion === 'trocha') {
        recargotipoOperacion = costRodaCargaBase * TARIFAS_CARRY.km_base * (factorOperativo - 1);
    }
    const costRodaCarga = costRodaCargaBase + recargoTipoCarga + recargotipoOperacion;
    // total por rodamiento de vehículo
    const costoRodamiento = costRodaVacio + costRodaCarga;
    /* conductor */
    const costoLaborViaje = horasViaje * TARIFAS_CARRY.hora * factorOperativo;
    // total 
    let totalTarifa = (costoCombustible + costoRodamiento + costoLaborViaje) * factorTrafico;
    if (totalTarifa < TARIFAS_CARRY.tar_min) {
        totalTarifa = TARIFAS_CARRY.tar_min;
    }
    const costoExtras = document.getElementById('extras')?.value || 0;
    totalTarifa += costoExtras;
    // 5. MOSTRAR EL RESULTADO EN PANTALLA
    // Todas tus páginas deben tener una etiqueta con id="totalTarifa_display"
    const resultBox = document.getElementById('resultBox');
    if (resultBox) {
        const formatoCOP = new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
        });
        const totalTarifa_display = document.getElementById('totalTarifa_display');
        totalTarifa_display.innerText = formatoCOP.format(totalTarifa);
        const kmsViaje = kmsVacio + kmsCarga;
        let suplementText = "";
        const moduloActual = window.location.href;
        if (moduloActual.includes('coord.html')) {
            suplementText = "(OSM)";
        }
        let summaryText =
                `📋 COTIZACIÓN DE SERVICIO CARRY ${suplementText}
        📦 Tipo de Carga: ${tipoCarga.toUpperCase()}
        📍 Ruta: Comercial (Punto A ➡️ Punto B)
        🛣️ Distancia Total de Recorrido: ${kmsViaje.toFixed(2)} Km
        ⏱️ Tiempo Estimado de Recorrido: ${formatearTiempoLegible(horasViaje)}
        🤝 Cargue, Descargue / Ayudante: ${formatoCOP.format(costoExtras)}
        💵 VALOR TOTAL DEL SERVICIO: ${formatoCOP.format(totalTarifa)}`;
        if (moduloActual.includes('coord.html')) {
            summaryText += "\nEstimación de ruta generada mediante mapas de código abierto.";
        }

        document.getElementById('loadingMsg').style.display = 'none';
        document.getElementById('summaryText').innerText = summaryText;
        document.getElementById('resultBox').style.display = 'block';
        document.getElementById('btnCopy').style.display = 'block';
    }
}