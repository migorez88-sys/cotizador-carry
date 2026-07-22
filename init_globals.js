/* global localforage */
let TARIFAS_CARRY = null;
// 1. Instanciar el motor de la base de datos local (IndexedDB)
// Esto crea el objeto con todas sus funciones listas (getItem, setItem)
const dbCarry = new localforage({
    name: 'sistema_carry',
    storeName: 'matriz_tarifas'
});
// variables globales
function autoLlenarCamposConfig() {
    if (document.getElementById('form_tarifas')) {
        // Inyectamos cada valor en su caja de texto correspondiente usando tus IDs
        document.getElementById('tarifa_base').value = TARIFAS_CARRY.tar_min;
        document.getElementById('costo_comb').value = TARIFAS_CARRY.gaso;
        document.getElementById('hora_lab').value = TARIFAS_CARRY.hora;
        document.getElementById('precio_km').value = TARIFAS_CARRY.km_base;
        document.getElementById('consumo_actual').value = TARIFAS_CARRY.cons;
        console.log("✅ Fase autollenado de campos de configuración almacenados");
    }
}
// Convertimos la función en asíncrona (async) para poder esperar a la Base de Datos
async function cargarTarifasGuardadas() {
    const isConfigWindow = 
            window.location.pathname.endsWith('config.html') || 
            window.location.pathname === '/' ||
            window.location.href.indexOf("config.html") !== -1;
    //const moduloActual = window.location.href;
    //const isConfigWindow = moduloActual.indexOf("config.html") !== -1;
    //if (typeof localforage !== 'undefined') {
    // opcion 1: datos en la memoria del navegador
    //const datosMemoria = localStorage.getItem('matriz_costos_carry');
    // Convertimos el texto de la memoria en un objeto numérico legible al usar la opción de almacenar en navegador
    //const tarifasMemoria = JSON.parse(datosMemoria);
    // opcion 2: En IndexedDB los objetos se guardan directamente como datos numéricos en el disco del disp. 
    // CAMBIO CLAVE: Cambiamos 'localforage.getItem' por 'dbCarry.getItem'
    const datosMemoria = await dbCarry.getItem('matriz_costos_carry');
    // Comprobamos si la URL actual termina en index.html o es la raíz de la app
    if (datosMemoria) {
        console.log("Matriz de costos hayada..");
        TARIFAS_CARRY = {
            tar_min: datosMemoria.tar_min,
            gaso: datosMemoria.gaso,
            hora: datosMemoria.hora,
            km_base: datosMemoria.km_base,
            cons: datosMemoria.cons,
//            tar_min: tarifasMemoria.tar_min,
//            gaso: tarifasMemoria.gaso,
//            hora: tarifasMemoria.hora,
//            km_base: tarifasMemoria.km_base,
//            cons: tarifasMemoria.cons,
            // Matriz factor tipo de carga
            FACTORES_TIPOCARGA: {
                suave: 1.0,
                moderada: 1.25,
                sobredimensionada: 1.50,
                critica: 1.75,
                pasajeros: 1.20
            },
            // MATRIZ GLOBAL DE FACTORES OPERATIVOS
            FACTORES_OPERACION: {
                normal: 1.0,
                nocturno: 1.35,
                trocha: 1.25,
                descuento: 0.90
            },
            FACTORES_TRAFICO: {
                valle: 1.0, // Conducción fluida o carretera (costo normal)
                pico: 1.25      // Hora pico (+25% automático por el ralentí y tiempo de la Carry)
            }
        };
        if(isConfigWindow){
            // 🖲️ DISPARADOR ASÍNCRONO: 
            // Si el usuario está en config.html, esta función existirá en la RAM y se ejecutará 
            // exactamente en el instante en que los datos terminen de cargar.
            if (typeof autoLlenarCamposConfig === "function") {
                autoLlenarCamposConfig();
            }
        }
    } else {
        // Redireccionar a página de configuración para definir las tarifas
        // ROMPER EL BUCLE: Averiguamos en qué página web está parado el usuario actualmente
        // HERRAMIENTA AVANZADA: Leemos el final de la URL actual de forma limpia
        // VALIDACIÓN ABSOLUTA: Verificamos si la URL termina o contiene exactamente "config.html"
        if (isConfigWindow) {
            // Si ya estás en la configuración, detenemos todo con un return para que jamás alerte ni redireccione
            return;
        }
        // Si el código llegó aquí es 100% seguro que el usuario está en cualquier otra ventana
        alert("No hay parámetros almacenados. Por favor, define las tarifas iniciales de la Suzuki Carry. 🚚");
        window.location.href = "config.html";
        return;
    }
//    } else {
//        console.error("Error: La librería de la base de datos no se ha cargado en el HTML.");
//    }
}
// Crucialmente llamamos o ejecutamos de una vez la función de cargar las tarifas al iniciar cualquier módulo
// En lugar de llamar a cargarTarifasGuardadas() directo en el aire...
// Le ordenamos a la pestaña esperar a que todas las librerías estén cargadas en la RAM
document.addEventListener("DOMContentLoaded", function () {
    // 1. HERRAMIENTA AVANZADA: Consultamos la Base de Datos IndexedDB de forma directa
    // LocalForage gestiona por debajo la persistencia real en el disco del celular
    // Verificación de seguridad final
    if (typeof localforage !== 'undefined') {
        console.log("📦 Base de Datos LocalForage cargada con éxito.");
        cargarTarifasGuardadas(); // Ejecuta tu función asíncrona de forma segura
    } else {
        console.error("❌ Error crítico: El navegador no pudo descargar LocalForage de internet.");
        alert("Error de conexión: No se pudo cargar el motor de base de datos.");
    }
});
// envío del formulario para guardar la configuración
if (document.getElementById('form_tarifas'))
document.getElementById('form_tarifas').addEventListener('submit', function (event) {
    // Evita que la página se recargue automáticamente al presionar guardar
    event.preventDefault();
    // 2. Guardar valores
    // Usamos parseFloat para asegurarnos de que el navegador lea números y no texto
    TARIFAS_CARRY = {
        tar_min: parseFloat(document.getElementById('tarifa_base').value),
        gaso: parseFloat(document.getElementById('costo_comb').value),
        hora: parseFloat(document.getElementById('hora_lab').value),
        km_base: parseFloat(document.getElementById('precio_km').value),
        cons: parseFloat(document.getElementById('consumo_actual').value)
    };
    // Guardar los datos en la memoria de el navegador
    //localStorage.setItem('matriz_costos_carry', JSON.stringify(TARIFAS_CARRY));
    //alert("¡Parámetros de la Suzuki Carry guardados con éxito! 🚚");
    // ORDEN DE GUARDADO EN BASE DE DATOS PERMANENTE (IndexedDB)
    // Usamos .then() para asegurarnos de que la página cambie SOLO cuando el disco termine de escribir
//            localforage.setItem('matriz_costos_carry', TARIFAS_CARRY).then(
//                    function () {
//                        alert("¡Parámetros guardados con total persistencia en el dispositivo! 🚚");
//                    }
//            );
    // CAMBIO CLAVE: Usamos dbCarry.setItem en lugar de localforage.setItem
    dbCarry.setItem('matriz_costos_carry', TARIFAS_CARRY).then(function () {
        alert("¡Parámetros guardados con total persistencia en el dispositivo! 🚚");
        // Redireccionar de vuelta al menú principal automáticamente
        window.location.href = "index.html";
    }).catch(function (err) {
        console.error("Error al escribir en IndexedDB:", err);
    });
}); 