/* Miguel González */

function validarEscrituraCampos() { // - IA
    // 1. Crear un arreglo con los IDs exactos de tus 6 inputs numéricos
    const camposId = [
        { id: 'kmsRecogida', nombre: 'Kilómetros de Recogida' },
        { id: 'minRecogida', nombre: 'Minutos de Recogida' },
        { id: 'kmsCargado',  nombre: 'Kilómetros de Ruta Cargado' },
        { id: 'minCargado',  nombre: 'Minutos de Ruta Cargado' },
        { id: 'kmsRetorno',  nombre: 'Kilómetros de Retorno a Base' },
        { id: 'minRetorno',  nombre: 'Minutos de Retorno a Base' }
    ];
    // 2. Recorrer los campos para validar
    for (const campo of camposId) {
        const input = document.getElementById(campo.id);
        if (!input) continue;
        const valorTexto = input.value.trim();
        const valorNumerico = parseFloat(valorTexto);
        // REGLA 1: Comprobar si está vacío
        if (valorTexto === "") {
            // ALERTA DIRECTA AL USUARIO: Limpia y entendible
            alert(`⚠️ El campo "${campo.nombre}" no puede estar vacío. Por favor, digita un valor.`);
            console.warn(`⚠️ Validación fallida: El campo ${campo.id} está vacío.`);
            input.focus(); 
            return false;  
        }
        // REGLA 2 y 3: Comprobar que sea un número válido y que no sea negativo
        if (isNaN(valorNumerico) || valorNumerico < 0) {
            // ALERTA DIRECTA AL USUARIO
            console.warn(`⚠️ Validación fallida: El campo ${campo.id} tiene un valor incorrecto o negativo.`);
            alert(`⚠️ El valor en "${campo.nombre}" es incorrecto. Debe ser un número mayor o igual a 0.`);
            input.focus();
            return false;  
        }
    }
    // Si el ciclo FOR termina por completo sin activarse ningún 'if', todo está perfecto
    console.log("✅ Validación exitosa: Todos los campos están completos y correctos.");
    return true; // Retorna VERDADERO (Proceder al siguiente paso seguro)
}

function procesarMiFormularioYCalcular(){
    // 🖲️ PRIMER PASO: Validar la integridad de los datos - AI
    if (!validarEscrituraCampos()) {
        // Aquí puedes opcionalmente borrar el total de la pantalla para que no muestre datos viejos
        const displayTotalTarifa = document.getElementById('totalTarifa_display');
        if (displayTotalTarifa) displayTotalTarifa.innerText = "0";
        return false;  // Retorna falso para avisarle al botón que no continúe
    }
    // Captura limpia de strings para construir la llave de control
    const kRec = document.getElementById('kmsRecogida').value.trim();
    const mRec = document.getElementById('minRecogida').value.trim();
    const kCar = document.getElementById('kmsCargado').value.trim();
    const mCar = document.getElementById('minCargado').value.trim();
    const kRet = document.getElementById('kmsRetorno').value.trim();
    const mRet = document.getElementById('minRetorno').value.trim();
    // 🎯 CREACIÓN DE LA LLAVE PILOTO (Une todos los datos separados por guiones)
    const llaveActual = `${kRec}-${mRec}-${kCar}-${mCar}-${kRet}-${mRet}`;
    const cambioTipoViaje = window.verCambSelectsTipoViaje();
    // 🛡️ ESCUDO ANTI-REPETICIÓN: Si los inputs son exactamente iguales a la última vez, frenamos
    if (llaveActual !== window.EstadoCotizador.cacheUltimaLlaveManual ||
            cambioTipoViaje) {
        console.log("🔄 Cambios detectados en formulario manual. Procesando matemática...");
        // Guardamos la nueva llave en el piloto para bloquear futuros clics repetidos
        window.EstadoCotizador.cacheUltimaLlaveManual = llaveActual;
        // SEGUNDO PASO: Si pasó el filtro anterior, procesas tus datos con total seguridad - AI
        // Consolidación de kilómetros y tiempos matemáticos
        const kmsVacio = parseFloat(kRec) + parseFloat(kRet);
        const kmsCarga = parseFloat(kCar);
        const minutosTotales = parseFloat(mRec) + parseFloat(mCar) + parseFloat(mRet);
        const horasViaje = minutosTotales / 60;
        // Ejecuta la matemática y actualiza window.EstadoCotizador.cacheTarifaBase
        calcularCotizacionBase(kmsVacio, kmsCarga, horasViaje);
        return true; // Retorna verdadero porque los datos en memoria siguen siendo válidos para renderizar
    }
    // La base vieja en caché sigue siendo válida para que el renderizador pueda procesar los extras.
    console.log("🛑 Módulo Manual en reposo: Los datos son idénticos, no se recalcula base.");
    return true;
}

document.getElementById("btn_calc_main").addEventListener("click", function(){
    // Ejecuta el cálculo. Si la validación falla, se detiene inmediatamente.
    const calculoExitoso = procesarMiFormularioYCalcular();
    if (calculoExitoso) {
        // Ejecuta la consolidación final de extras y pinta la pantalla (init.js)
        window.renderizarCuadroResultado();
    }
});