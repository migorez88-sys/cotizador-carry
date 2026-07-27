function validarCamposManuales() { // - IA
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
function calcularDatosManuales(){
    // 🖲️ PRIMER PASO: Validar la integridad de los datos - AI
    if (!validarCamposManuales()) {
        // Aquí puedes opcionalmente borrar el total de la pantalla para que no muestre datos viejos
        document.getElementById('totalTarifa_display').innerText = "0";
        return; 
    }
    // SEGUNDO PASO: Si pasó el filtro anterior, procesas tus datos con total seguridad - AI
    // 1. Consolidación de kilómetros y tiempos
    const kmsVacio = parseFloat(document.getElementById('kmsRecogida').value) + 
                     parseFloat(document.getElementById('kmsRetorno').value);
    const kmsCarga = parseFloat(document.getElementById('kmsCargado').value);
    // Sumamos todos los minutos del circuito y los dividimos por 60 para enviarle horas a init.js
    const minutosTotales = parseFloat(document.getElementById('minRecogida').value) + 
                           parseFloat(document.getElementById('minCargado').value) + 
                           parseFloat(document.getElementById('minRetorno').value);
    const horasViaje = minutosTotales / 60;
    calcularCotizacion(kmsVacio, kmsCarga, horasViaje);
}


