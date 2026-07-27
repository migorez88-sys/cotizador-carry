/* global localForage, localforage */
let TARIFAS_CARRY = null;
const KEY_TARIFAS_GUARDADAS = "TARIFAS_CARRY";
let MIS_PUNTOS = null;
const KEY_PUNTOS_GUARDADOS = "PUNTOS_GUARDADOS";
let dbTarifas = null;
let dbPuntosFijos = null;
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
    try {
        // Verificación de acceso a servidor de database
        if (typeof localForage !== 'undefined' && typeof localForage.createInstance === "function") {
            // 1. HERRAMIENTA AVANZADA: Consultamos la Base de Datos IndexedDB de forma directa
            // LocalForage gestiona por debajo la persistencia real en el disco del celular
            // 1. Instanciar el motor de la base de datos local (IndexedDB)
            // Esto crea el objeto con todas sus funciones listas (getItem, setItem)
            console.log("💾 Motor Principal IndexedDB Activado con Éxito.\n\
                        📦 Base de Datos LocalForage cargada con éxito.");
        } else {
            // PLAN DE RESPALDO: Si la librería falla en cargar, el sistema activa este simulador automático
            // PLAN DE RESPALDO PROFESIONAL: Soporta múltiples tablas e instancias usando prefijos
            window.localForage = {
                createInstance: function (config_table) {
                    // Aseguramos un nombre de almacén por defecto si se pasa vacío
                    const nombreTabla = (config_table && config_table.storeName) ? config_table.storeName : "default";
                    return {
                        setItem: function (key, val) {
                            try {
                                const llaveCompuesta = nombreTabla + '_' + key;
                                localStorage.setItem(llaveCompuesta, JSON.stringify(val));
                                return Promise.resolve(val);
                            } catch (error) {
                                return Promise.reject(error);
                            }
                        },
                        getItem: function (key) {
                            try {
                                const llaveCompuesta = nombreTabla + '_' + key;
                                const datosEnBruto = localStorage.getItem(llaveCompuesta);
                                // FUSIBLE: Si no existe el registro en el disco, devolvemos null de inmediato
                                // Esto evita que JSON.parse rompa la promesa asíncrona
                                if (datosEnBruto === null) {
                                    return Promise.resolve(null);
                                }
                                return Promise.resolve(JSON.parse(datosEnBruto));
                            } catch (error) {
                                return Promise.reject(error);
                            }
                        },
                        removeItem: function (key) {
                            const llaveCompuesta = nombreTabla + '_' + key;
                            localStorage.removeItem(llaveCompuesta);
                            return Promise.resolve();
                        },
                        clear: function () {
                            // Borra únicamente los datos que le pertenecen a ESTA tabla, no todo el localStorage
                            Object.keys(localStorage).forEach(llave => {
                                if (llave.startsWith(nombreTabla + '_')) {
                                    localStorage.removeItem(llave);
                                }
                            });
                            return Promise.resolve();
                        }
                    };
                }
            };
            console.warn("Error de conexión: No se pudo cargar el motor de base de datos.\n\
                    ❌ Error crítico: El navegador no pudo descargar LocalForage.");
            console.log("🚀 Motor de Respaldo LocalStorage Activado de forma Exitosa. \n\
                    [Aviso] Usando motor de respaldo LocalStorage. Tu app funcionará al 100% en PC y Celular.");
        }
        dbTarifas = localForage.createInstance({
            name: 'sistema_carry',
            storeName: 'matriz_tarifas',
            version: 1.0
        });
        dbPuntosFijos = localForage.createInstance({
            name: 'sistema_carry',
            storeName: 'puntos_fijos',
            version: 1.0
        });
        const isConfigWindow =
                window.location.pathname.endsWith('config.html') ||
                window.location.pathname === '/' ||
                window.location.href.indexOf("config.html") !== -1;
        const misPuntosGuardados = await dbPuntosFijos.getItem(KEY_PUNTOS_GUARDADOS);
        if (misPuntosGuardados) {
            MIS_PUNTOS = misPuntosGuardados;
        } else {
            console.log("No se guardaron los puntos");
            // definición provisional, para pruebas
            MIS_PUNTOS = [
                {nombre: "🏠 Sede Principal Norte", coordenadas: "3.4651, -76.5210"},
                {nombre: "🏢 Sucursal Sur", coordenadas: "3.3720, -76.5430"},
                {nombre: "📦 Centro de Distribución", coordenadas: "3.4373, -76.5067"}];
        }
        const tarifasCarry = await dbTarifas.getItem(KEY_TARIFAS_GUARDADAS);
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
            if (isConfigWindow) {
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
    } catch (error) {
        console.log.warn(error);
    }
}
// Crucialmente llamamos o ejecutamos de una vez la función de cargar las tarifas al iniciar cualquier módulo
// En lugar de llamar a cargarTarifasGuardadas() directo en el aire...
// Le ordenamos a la pestaña esperar a que todas las librerías estén cargadas en la RAM
document.addEventListener("DOMContentLoaded", function () {
    cargarDatabase();
});