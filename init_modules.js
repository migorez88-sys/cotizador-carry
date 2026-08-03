/* funciones generales de la app */
// comprobación de estado de los select de factores o tipos de viaje (carga, operación, tráfico)
let lastStateTipos = {
    lastTipoCarga: "",
    lastTipoOperacion: "",
    lastTipoTrafico: ""
};

const slctsTipos = [
    document.getElementById('tipoCarga_display'),
    document.getElementById('tipoOperacion_display'),
    document.getElementById('tipoTrafico_display')
];

// 🧠 ESTADO GLOBAL ÚNICO: El único lugar que guarda la verdad financiera del viaje
window.EstadoCotizador = {
    cacheTarifaBase: null,
    cachekmsVacio: 0,
    cachekmsCarga: 0,
    cachehorasViaje: 0,
    cacheCostosExtras: null,
    cacheTotalServicio: 0,
    cacheTipoCarga: 'suave',
    cacheUltimoTotalPintado: null // 🎯 PILOTO VISUAL: Guarda el último valor real renderizado
};

// CONTROL DE SELECTORES: Si SOLO cambiaron los selectores, no tocamos la API de OSM - AI
//let cambioTipoViaje = false;
// FUNCIÓN DE COMPROBACIÓN RÁPIDA DE CAMBIO DE PARÁMETROS DE COTIZACIÓN (Filtro Inteligente) - IA
function verCambSelectsTipoViaje() {
    // Capturamos los elementos del HTML actual de forma segura usando el operador '?'
    const tipoCarga     = slctsTipos[0]?.value || 'suave';
    const tipoOperacion = slctsTipos[1]?.value || 'normal';
    const tipoTrafico   = slctsTipos[2]?.value || 'valle';
    // REGLA DE ORO: Si los 3 valores actuales son IGUALES a los guardados en la caché, NO CALCULES NADA
    if (tipoCarga === lastStateTipos.lastTipoCarga &&
            tipoOperacion === lastStateTipos.lastTipoOperacion &&
            tipoTrafico === lastStateTipos.lastTipoTrafico) {
        console.log("⚡ Selects de factores de viaje, sin cambios.");
        //cambioTipoViaje = false; // Significa "No hay cambios reales"
        return false;
    }
    // Si el código llega aquí, significa que el usuario SÍ movió algún selector
    // Por lo tanto, actualizamos la caché con los nuevos valores para la próxima revisión
    lastStateTipos.lastTipoCarga = tipoCarga;
    lastStateTipos.lastTipoOperacion = tipoOperacion;
    lastStateTipos.lastTipoTrafico = tipoTrafico;
    //cambioTipoViaje = true;
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

// MOSTRAR CUADRO DE RESULTADO
function renderizarCuadroResultado() {
    const resultBox = document.getElementById('resultBox');
    // Si la página actual no tiene la caja de resultados || si no hay datos base, No hace nada frena limpiamente
    if (!resultBox || EstadoCotizador.cacheTarifaBase === null) {
        console.warn("⚠️ Renderizado cancelado: Faltan componentes de interfaz o tarifa base.");
        return;
    }
    // CONTROL INTELIGENTE DE EXTRAS (No toca la API de mapas ni la matemática pesada)
    // La tarifa final siempre es la base limpia guardada + el nuevo valor numérico de extras
    // Sincronizamos las variables finales del estado global
    const extrasLeidasRaw = document.getElementById('extras')?.value || 0;
    const extrasLeidas = parseFloat(extrasLeidasRaw) || 0;
    // 2. EJECUCIÓN DEL TRAMO FINAL: Calculamos el total real de este milisegundo
    const tarifaBaseActual = EstadoCotizador.cacheTarifaBase;
    const totalServicioActual = tarifaBaseActual + extrasLeidas;
    // 🛡️ ESCUDO 2: EL PILOTO DE CONTROL (Evita redibujar si el total final es idéntico al que ya ve el usuario)
    if (totalServicioActual === EstadoCotizador.cacheUltimoTotalPintado) {
        console.log("🛑 Interfaz en reposo: Los datos son idénticos, no se redibuja nada.");
        return;
    }
    console.log("💰 Cambios detectados. Actualizando desglose financiero y renderizando interfaz.");
    // 3. Sincronizamos de forma estricta todas las variables del estado global (Permitiendo el 0)
    EstadoCotizador.cacheCostosExtras = extrasLeidas;
    EstadoCotizador.cacheTotalServicio = totalServicioActual;
    // 🎯 Guardamos el nuevo valor en el piloto para congelar futuros clics repetidos idénticos
    EstadoCotizador.cacheUltimoTotalPintado = totalServicioActual;
    // ==========================================================================
    // 🚀 A PARTIR DE AQUÍ SE CORRE TU RENDERIZADO VISUAL EXCLUSIVO (Inyectar HTML/Textos)
    // ==========================================================================
    // formateador de moneda colombiana
    const formatoCOP = new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    });
    const totalTarifaDisplay = document.getElementById('totalTarifa_display');
    if (totalTarifaDisplay) {
        totalTarifaDisplay.innerText = formatoCOP.format(EstadoCotizador.cacheTotalServicio);
    }
    const kmsViaje = EstadoCotizador.cachekmsVacio + EstadoCotizador.cachekmsCarga;
    const moduloActual = window.location.href;
    let suplementText = moduloActual.includes('coord.html') ? "(OSM)" : "";
    let summaryText =
            `📋 COTIZACIÓN DE SERVICIO CARRY ${suplementText}
        📦 Tipo de Carga: ${EstadoCotizador.cacheTipoCarga}
        📍 Ruta: Comercial (Punto A ➡️ Punto B)
        🛣️ Distancia Total de Recorrido: ${kmsViaje.toFixed(2)} Km
        ⏱️ Tiempo Estimado de Recorrido: ${formatearTiempoLegible(EstadoCotizador.cachehorasViaje)}
        🤝 Cargue, Descargue / Ayudante: ${formatoCOP.format(EstadoCotizador.cacheCostosExtras)}
        💵 VALOR TOTAL DEL SERVICIO: ${formatoCOP.format(EstadoCotizador.cacheTotalServicio)}`;
    if (moduloActual.includes('coord.html'))
        summaryText += "\nEstimación de ruta generada mediante mapas de código abierto.";
    // Switcheo visual seguro de la interfaz
    const loadingMsg = document.getElementById('loadingMsg');
    if (loadingMsg)
        loadingMsg.style.display = 'none';
    const summaryTextDisplay = document.getElementById('summaryText');
    if (summaryTextDisplay)
        summaryTextDisplay.innerText = summaryText;
    resultBox.style.display = 'block';
    const btnCopy = document.getElementById('btnCopy');
    if (btnCopy)
        btnCopy.style.display = 'block';
}

// FUNCIÓN MATEMÁTICA GLOBAL DE LIQUIDACIÓN
function calcularCotizacionBase(kmsVacio, kmsCarga, horasViaje) {
    // Capturar valores de selects tipo viaje (mis tres selects generales: tipoCarga, tipoOperacion, tipoTrafico)
    // Optimización de captura de selectores globales y sus factores matemáticos
    const tipoCarga     = slctsTipos[0]?.value || 'suave';
    const tipoOperacion = slctsTipos[1]?.value || 'normal';
    const tipoTrafico   = slctsTipos[2]?.value || 'valle';
    // Extracción directa de multiplicadores desde las matrices de la Carry
    const factorTipoCarga = TARIFAS_CARRY.FACTORES_TIPOCARGA[tipoCarga]     || 1;
    const factorOperativo = TARIFAS_CARRY.FACTORES_OPERACION[tipoOperacion] || 1;
    const factorTrafico   = TARIFAS_CARRY.FACTORES_TRAFICO[tipoTrafico]     || 1;
    // 4. MATEMÁTICA LOGÍSTICA DE LA SUZUKI CARRY
    // costos de combustible
    const costoCombustible =
            (kmsVacio / TARIFAS_CARRY.cons) * TARIFAS_CARRY.gaso +
            (kmsCarga / TARIFAS_CARRY.cons) * TARIFAS_CARRY.gaso * factorTipoCarga;
    /* costos rodamiento del vehículo */
    // kms vacío equivale al recorrido hecho para ir a buscar la carga + el retorno al origen o a donde se elija
    // 1. Costo base por los kilómetros recorridos (Vacío + Carga)
    const costRodaVacio = kmsVacio * TARIFAS_CARRY.km_base;
    const costRodaCargaBase = kmsCarga * TARIFAS_CARRY.km_base;
    // 2. Cálculo directo de recargos sobre la base de la carga sumamos los excesos de los factores de forma lineal
    const factorTotalRecargos = 1 + ( (factorTipoCarga - 1) + (factorOperativo - 1) );
    const costoRodamiento = costRodaVacio + (costRodaCargaBase * factorTotalRecargos);
    /* conductor */
    const costoLaborViaje = horasViaje * TARIFAS_CARRY.hora * factorOperativo;
    // total acumulado afectado por el factor tráfico (hora pico / valle)
    let totalTarifa = (costoCombustible + costoRodamiento + costoLaborViaje) * factorTrafico;
    if (totalTarifa < TARIFAS_CARRY.tar_min) {
        totalTarifa = TARIFAS_CARRY.tar_min;
    }
    
    // 💾 Guardamos los insumos en el estado global para que el renderizador los tenga disponibles
    window.EstadoCotizador.cacheTarifaBase = totalTarifa;
    window.EstadoCotizador.cachekmsVacio = kmsVacio;
    window.EstadoCotizador.cachekmsCarga = kmsCarga;
    window.EstadoCotizador.cachehorasViaje = horasViaje;
    window.EstadoCotizador.cacheTipoCarga = tipoCarga;
}