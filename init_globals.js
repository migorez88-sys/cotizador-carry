/* global localForage, localforage */
let TARIFAS_CARRY = null;
let MIS_PUNTOS_FIJOS = null;
// 1. Instanciar el motor de la base de datos local (IndexedDB)
// Esto crea el objeto con todas sus funciones listas (getItem, setItem)
let dbTarifas = null;//new localForage({
//    name: 'sistema_carry',
//    storeName: 'matriz_tarifas'
//});
let dbPuntosFijos = null;//new localForage({
//    name: 'sistema_carry',
//    storeName: 'puntos_fijos'
//});
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
// Convertimos la función en asíncrona (async) para poder esperar a la Base de Datos
async function cargarDatabase() {
    const isConfigWindow = 
            window.location.pathname.endsWith('config.html') || 
            window.location.pathname === '/' ||
            window.location.href.indexOf("config.html") !== -1;
//    const misPuntos = await dbPuntosFijos.getItem('mis_sedes');
//    if(misPuntos){
//        MIS_PUNTOS_FIJOS = misPuntos;
//        window.enlistarPuntosGuardados();
//    }else{
//        // definición provisional, para pruebas
//        MIS_PUNTOS_FIJOS = [
//            { nombre: "🏠 Sede Principal Norte", coordenadas: "3.4651, -76.5210" },
//            { nombre: "🏢 Sucursal Sur", coordenadas: "3.3720, -76.5430" },
//            { nombre: "📦 Centro de Distribución", coordenadas: "3.4373, -76.5067" }];
//    }
    const tarifasCarry = await window.dbTarifas.getItem('tarifas_carry');
    if (tarifasCarry) {
        console.log("Matriz de costos hayada..");
        TARIFAS_CARRY = {
            tar_min: tarifasCarry.tar_min,
            gaso: tarifasCarry.gaso,
            hora: tarifasCarry.hora,
            km_base: tarifasCarry.km_base,
            cons: tarifasCarry.cons,
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
            window.autoLlenarCamposConfig();
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
        alert("No hay parámetros almacenados. Por favor, define las tarifas iniciales de la Suzuki Carry. 🚚");
        // Si el código llegó aquí es 100% seguro que el usuario está en cualquier otra ventana
        // window.top asegura que la redirección destruya el iframe y se adueñe de toda la pantalla
        window.top.location.href = "config.html"; 
        return;
    }
}
// Crucialmente llamamos o ejecutamos de una vez la función de cargar las tarifas al iniciar cualquier módulo
// En lugar de llamar a cargarTarifasGuardadas() directo en el aire...
// Le ordenamos a la pestaña esperar a que todas las librerías estén cargadas en la RAM
document.addEventListener("DOMContentLoaded", function () {
    // Verificación de seguridad final
    if (typeof localForage !== 'undefined'  && typeof localForage.createInstance === "function") {
        // 1. HERRAMIENTA AVANZADA: Consultamos la Base de Datos IndexedDB de forma directa
        // LocalForage gestiona por debajo la persistencia real en el disco del celular
        // // 1. Instanciar el motor de la base de datos local (IndexedDB)
        // Esto crea el objeto con todas sus funciones listas (getItem, setItem)
        window.dbTarifas = localForage.createInstance({
        name: 'sistema_carry',
        storeName: 'matriz_tarifas',
        version: 1.0
        });
        window.dbPuntosFijos = localForage.createInstance({
            name: 'sistema_carry',
            storeName: 'puntos_fijos',
            version: 1.0
        });
        console.log("💾 Motor Principal IndexedDB Activado con Éxito.");
        console.log("📦 Base de Datos LocalForage cargada con éxito.");
        cargarDatabase(); // Ejecuta tu función asíncrona de forma segura
    } else {
        // PLAN DE RESPALDO: Si la librería falla en cargar, el sistema activa este simulador automático
        window.localForage = {
            createInstance: function (config_table) {
                return {
                    setItem: function (key, val) {
                        localStorage.setItem(config_table.storeName + '_' + key, JSON.stringify(val));
                        return Promise.resolve(val);
                    },
                    getItem: function (key) {
                        return Promise.resolve(JSON.parse(localStorage.getItem(config_table.storeName + '_' + key)));
                    }
                };
            }
        };
        window.dbTarifas = localForage.createInstance({
            name: 'sistema_carry',
            storeName: 'matriz_tarifas',
            version: 1.0
        });
        window.dbPuntosFijos = localForage.createInstance({
            name: 'sistema_carry',
            storeName: 'puntos_fijos',
            version: 1.0
        });
//        window.dbTarifas = {
//            getItem: function (key) {
//                return Promise.resolve(JSON.parse(localStorage.getItem('matriz_tarifas' + key)));
//            },
//            setItem: function (key, val) {
//                localStorage.setItem('matriz_tarifas' + key, JSON.stringify(val));
//                return Promise.resolve(val);
//            },
//            clear: function () {
//                localStorage.clear();
//                return Promise.resolve();
//            }
//        };
//        window.dbPuntosFijos = {
//            getItem: function (key) {
//                return Promise.resolve(JSON.parse(localStorage.getItem('puntos_fijos' + key)));
//            },
//            setItem: function (key, val) {
//                localStorage.setItem('puntos_fijos' + key, JSON.stringify(val));
//                return Promise.resolve(val);
//            },
//            clear: function () {
//                localStorage.clear();
//                return Promise.resolve();
//            }
//        };
       // window.dbTarifas;
//    window.dbTarifas = localForage.createInstance({
//        name: 'sistema_carry',
//        storeName: 'matriz_tarifas',
//        version: 1.0
//    });
//    window.dbPuntosFijos = localForage.createInstance({
//        name: 'sistema_carry',
//        storeName: 'puntos_fijos',
//        version: 1.0
//    });
        cargarDatabase();
        console.log("🚀 Motor de Respaldo LocalStorage Activado de forma Exitosa.");
        console.warn("[Aviso] Usando motor de respaldo LocalStorage. Tu app funcionará al 100% en PC y Celular.");
        console.warn("❌ Error crítico: El navegador no pudo descargar LocalForage.");
        console.warn("Error de conexión: No se pudo cargar el motor de base de datos.");
    }
});
// envío del formulario para guardar la configuración
if (document.getElementById('form_tarifas')) {
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
        //CREAR NUEVOS CAJONES PARA GUARDAR LAS SEDES PREDETERMINADAS (AQUÍ)
        // ejemplo creación del array
        //    const MIS_PUNTOS_FIJOS = [
        //            { nombre: "🏠 Sede Principal Norte", coordenadas: "3.4651, -76.5210" },
        //            { nombre: "🏢 Sucursal Sur", coordenadas: "3.3720, -76.5430" },
        //            { nombre: "📦 Centro de Distribución", coordenadas: "3.4373, -76.5067" }
        //    ];
        // CAMBIO CLAVE: Usamos dbCarry.setItem en lugar de localforage.setItem
        //dbPuntosFijos.setItem('mis_sedes', MIS_PUNTOS_FIJOS);
        window.dbTarifas.setItem('tarifas_carry', TARIFAS_CARRY).then(function () {
            alert("¡Parámetros guardados en el dispositivo! 🚚");
            // Redireccionar de vuelta al menú principal automáticamente
            window.location.href = "index.html";
        }).catch(function (err) {
            console.error("Error al escribir en IndexedDB:", err);
        });
    });
}