let puntosEnLista = null;
// El "detector de metales" para saber si un texto son coordenadas numéricas
const patronCoordenadas = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
// El interruptor que nos avisa si el usuario modificó algo y no ha guardado online
let tieneCambiosPendientes = false;

// Actualizar lista sin llamar al servidor
function actualizarMemoriaTemporal() {
    const inputListaPuntos = document.querySelectorAll(".lista_interactiva .item_punto");
    const nuevaListaPuntos = [];
    // Filtro validador de coordenadas
    //const patronCoordenadas = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
    inputListaPuntos.forEach(item => {
        const inputNom = item.querySelector(".punto_nom");
        const inputCoord = item.querySelector(".punto_coord");
        if (!inputNom || !inputCoord) return;
        // CORRECCIÓN: Para elementos contenteditable se usa innerText, no value
        let nom = inputNom.innerText.trim();
        let coord = inputCoord.innerText.trim();
        // Filtro extractor: Remueve el emoji del mapa (📍) y cualquier espacio extra que quede pegado
        coord = coord.replace(/📍/g, "").trim();
        nom = nom.replace(/📍/g, "").trim();
        let coordenadasFinales = "";
        let nombreFinal = "";
        // CASO A: Ambos campos llenos
        if (nom && coord) {
            if (patronCoordenadas.test(coord)) {
                coordenadasFinales = coord;
                nombreFinal = nom;
            } else if (patronCoordenadas.test(nom)) {
                coordenadasFinales = nom;
                nombreFinal = coord;
            } 
        }
        // CASO B: Solo hay texto en el campo Nombre
        else if (nom && !coord) {
            if (patronCoordenadas.test(nom)) {
                coordenadasFinales = nom;
                nombreFinal = nom;
            }
        }
        // CASO C: Solo hay texto en el campo Coordenadas
        else if (!nom && coord) {
            if (patronCoordenadas.test(coord)) {
                coordenadasFinales = coord;
                nombreFinal = coord;
            }
        }
        // Si logramos rescatar coordenadas válidas, añadimos el objeto
        if (coordenadasFinales) {
            nuevaListaPuntos.push({
                nombre: nombreFinal,
                coordenadas: coordenadasFinales
            });
            // Corrección visual en caliente: actualizamos el texto si hubo intercambio inteligente
            // Esto lo hace de forma silenciosa sin romper el foco del teclado
            if (inputNom.innerText !== nombreFinal) inputNom.innerText = nombreFinal;
            if (inputCoord.innerText !== coordenadasFinales) inputCoord.innerText = coordenadasFinales;
            item.classList.remove("item_invalido"); // Quita alerta visual si existía
        } else {
            // Si el ítem quedó totalmente inválido o vacío, le añadimos una clase CSS de advertencia
            // En vez de un alert() molesto, pintamos el borde de rojo de forma elegante
            item.classList.add("item_invalido");
        }
    });
    // Sincronizamos con el tanque de reserva global
    puntosEnLista = nuevaListaPuntos;
    tieneCambiosPendientes = true;
    // ELIMINADO: renderizarListaPuntos(); 
    console.log("💾 RAM Actualizada silenciosamente:", puntosEnLista);
}

// =========================================================================
// REFACCIÓN 1: SISTEMA DE ALMACENAMIENTO LOCAL (BATERÍA DEL VEHÍCULO)
// =========================================================================
// Guarda el estado actual de la lista en el disco duro del navegador
async function guardarPuntosEnServidor() {
    actualizarMemoriaTemporal();
    // Si no hay cambios, nos ahorramos el viaje al servidor
    if (!tieneCambiosPendientes) {
        console.log("ℹ️ No hay cambios nuevos que sincronizar.");
        return;
    }
    console.log("🚀 Iniciando proceso duro de subida online...");
    // Aquí inyectas tu código de envío a la base de datos online
    // Ejemplo: await miBaseDatosOnline.guardarPuntos(COPIA_LOCAL_PUNTOS);
    await dbPuntosFijos.setItem(KEY_PUNTOS_GUARDADOS, puntosEnLista).then(function () {
        tieneCambiosPendientes = false;
        alert("✅ ¡Puntos e itinerarios guardados en la nube con éxito!");
    }).catch(function (err) {
        console.error("Error al escribir en la base de datos:", err);
        alert("❌ Error al guardar online. Revisa tu conexión a internet.");
    });
}

// =========================================================================
// REFACCIÓN 2: CONSTRUCTOR DINÁMICO DE INTERFAZ (CHASIS Y ENSAMBLE)
// =========================================================================
const ulLista = document.getElementById("lista_puntos");
const inputNuevoNombre = document.getElementById("nombre_nuevo_punto");
const inputNuevasCoord = document.getElementById("coord_nuevo_punto");
const btnAgregar = document.getElementById("btn_agregar_punto");

function renderizarListaPuntos() {
    if (puntosEnLista) {
        ulLista.innerHTML = ""; // Limpia la lista vieja
        puntosEnLista.forEach(punto => {
            const li = document.createElement("li");
            li.className = "item_punto";
            li.setAttribute("draggable", "true");
            li.innerHTML = `
            <div class="accion_eliminar_fondo">🗑️ Eliminar</div>
            <div class="contenido_item">
            <!-- Nombre editable directamente -->
            <div class="punto_nom" contenteditable="true" data-placeholder="Nombre del punto...">${punto.nombre}</div>
            <!-- Coordenadas editables en una línea secundaria más sutil -->
            <div class="punto_coord">
                    📍 <span class="coordenadas_texto" contenteditable="true" 
                            data-placeholder="Lat, Lng (Ej: 3.4651, -76.5210)">${punto.coordenadas}
                    </span>
            </div>
            </div>`;
            inyectarMecanismoArrastrar(li);
            inyectarMecanismoDeslizar(li);
            inyectarMecanismoEdicion(li);
            ulLista.appendChild(li);
        });
    }
}
// Escuchador para el botón de añadir un punto rápido
btnAgregar.addEventListener("click", () => {
    // 1. Recolectamos lo que haya escrito el usuario en bruto
    let entradaNombre = inputNuevoNombre.value.trim();
    let entradaCoords = inputNuevasCoord.value.trim();
    // Variables finales que inyectaremos en el motor
    let coordenadasFinales = "";
    let nombreFinal = "";
    // 2. CASO A: El usuario escribió en ambos campos
    if (entradaNombre && entradaCoords) {
        if (patronCoordenadas.test(entradaCoords)) {
            coordenadasFinales = entradaCoords;
            nombreFinal = entradaNombre;
        } else if (patronCoordenadas.test(entradaNombre)) {
            // Intercambio inteligente si los puso al revés
            coordenadasFinales = entradaNombre;
            nombreFinal = entradaCoords;
        } else {
            alert("❌ Error: Ninguno de los dos campos contiene coordenadas válidas (Ej: 3.4651, -76.5210).");
            return;
        }
    }
    // 3. CASO B: Solo llenó el campo "Nombre"
    else if (entradaNombre && !entradaCoords) {
        if (patronCoordenadas.test(entradaNombre)) {
            coordenadasFinales = entradaNombre;
            nombreFinal = entradaNombre; // Duplicamos la coordenada en el nombre tal como pediste
        } else {
            alert("⚠️ Si solo llenas un campo, deben ser las coordenadas numéricas obligatorias.");
            return;
        }
    }
    // 4. CASO C: Solo llenó el campo "Coordenadas"
    else if (!entradaNombre && entradaCoords) {
        if (patronCoordenadas.test(entradaCoords)) {
            coordenadasFinales = entradaCoords;
            nombreFinal = entradaCoords; // Copiamos las coordenadas en el campo nombre
        } else {
            alert("❌ El dato ingresado en coordenadas no tiene el formato numérico válido.");
            return;
        }
    }
    // 5. CASO D: Ambos vacíos
    else {
        alert("⚠️ Por favor, ingresa al menos las coordenadas numéricas para poder continuar.");
        return;
    }
    // 6. Inyección limpia en el tanque de reserva global (RAM)
    puntosEnLista.push({
        nombre: nombreFinal,
        coordenadas: coordenadasFinales
    });
    // Encendemos el testigo de cambios pendientes para el servidor online
    tieneCambiosPendientes = true; 
    // Limpiamos los cajones de texto para el siguiente viaje
    inputNuevoNombre.value = "";
    inputNuevasCoord.value = "";
    // Volvemos a dibujar la lista en pantalla con la nueva estructura
    renderizarListaPuntos(); 
});
// Permite añadir puntos también al presionar la tecla "Enter" en el teclado
// Vinculamos la tecla Enter en ambos inputs para que agregue el punto de inmediato
[inputNuevoNombre, inputNuevasCoord].forEach(input => {
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") btnAgregar.click();
    });
});

// =========================================================================
// REFACCIÓN 3: SISTEMA DRAG & DROP
// =========================================================================
function inyectarMecanismoArrastrar(liItem) {
    liItem.addEventListener("dragstart", () => {
        liItem.classList.add("dragging");
    });
    liItem.addEventListener("dragend", () => {
        liItem.classList.remove("dragging");
        actualizarMemoriaTemporal(); // Guarda el nuevo orden
    });
}
// Monitorea la posición del elemento arrastrado sobre la lista general
ulLista.addEventListener("dragover", (e) => {
    e.preventDefault();
    const elementoArrastrado = document.querySelector(".dragging");
    const hermanos = [...ulLista.querySelectorAll(".item_punto:not(.dragging)")];
    const siguienteHermano = hermanos.find(hermano => {
        const caja = hermano.getBoundingClientRect();
        return e.clientY < caja.top + caja.height / 2;
    });
    if (!siguienteHermano) {
        ulLista.appendChild(elementoArrastrado);
    } else {
        ulLista.insertBefore(elementoArrastrado, siguienteHermano);
    }
});

// =========================================================================
// REFACCIÓN 4: GESTOS TÁCTILES SWIPE
// =========================================================================
function inyectarMecanismoDeslizar(liItem) {
    const capaVisible = liItem.querySelector(".contenido_item");
    let coordenadaInicioX = 0;
    let coordenadaMovimientoX = 0;
    // Detecta cuando el dedo o mouse toca la pantalla
    const iniciarGesto = (e) => {
        coordenadaInicioX = e.touches ? e.touches[0].clientX : e.clientX;
        capaVisible.style.transition = "none"; // Quita animaciones durante el arrastre manual
    };
    // Mide la distancia recorrida mientras se desliza hacia la izquierda
    const moverGesto = (e) => {
        const clienteX = e.touches ? e.touches[0].clientX : e.clientX;
        coordenadaMovimientoX = clienteX - coordenadaInicioX;
        // Solo permitimos deslizar hacia la izquierda (valores negativos)
        if (coordenadaMovimientoX < 0) {
            // Efecto elástico para que no se desarme visualmente la tarjeta
            if (coordenadaMovimientoX < -150) {
                coordenadaMovimientoX = -150 + (coordenadaMovimientoX + 150) * 0.2;
            }
            capaVisible.style.transform = `translateX(${coordenadaMovimientoX}px)`;
        }
    };
    // Define si el elemento se destruye o regresa a su posición original
    const finalizarGesto = () => {
        capaVisible.style.transition = "transform 0.2s ease-out";
        // Si el deslizamiento superó los 100 píxeles, eliminamos el ítem
        if (coordenadaMovimientoX < -100) {
            capaVisible.style.transform = "translateX(-100%)";
            setTimeout(() => {
                liItem.remove();
                actualizarMemoriaTemporal(); // Actualiza los cambios
            }, 200);
        } else {
            // Regresa a su lugar si el tiro fue muy corto
            capaVisible.style.transform = "translateX(0px)";
        }
        coordenadaMovimientoX = 0;
    };
    // Vinculación de eventos táctiles (Smartphones)
    capaVisible.addEventListener("touchstart", iniciarGesto);
    capaVisible.addEventListener("touchmove", moverGesto);
    capaVisible.addEventListener("touchend", finalizarGesto);
    // Vinculación de eventos de Mouse (Computador)
    capaVisible.addEventListener("mousedown", iniciarGesto);
    // El arrastre por mouse requiere monitoreo global si sale del ítem
    const mouseMoverGlobal = (e) => { if (coordenadaInicioX !== 0) moverGesto(e); };
    const mouseSubirGlobal = () => { 
        if (coordenadaInicioX !== 0) {
            coordenadaInicioX = 0;
            finalizarGesto();
            window.removeEventListener("mousemove", mouseMoverGlobal);
            window.removeEventListener("mouseup", mouseSubirGlobal);
        }
    };
    capaVisible.addEventListener("mousedown", () => {
        window.addEventListener("mousemove", mouseMoverGlobal);
        window.addEventListener("mouseup", mouseSubirGlobal);
    });
}

// =========================================================================
// REFACCIÓN 5: SALVAGUARDA DE EDICIÓN DIRECTA (INYECCIÓN ELECTRÓNICA)
// =========================================================================
function inyectarMecanismoEdicion(liItem) {
    const capaVisible = liItem.querySelector(".contenido_item");
    // Cuando el usuario haga clic afuera del texto editado, se guarda automáticamente
    capaVisible.addEventListener("blur", () => {
        actualizarMemoriaTemporal();
    });
    // Si presiona Enter editando, quita el foco para forzar el guardado automático
    capaVisible.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); // Evita saltos de línea destructivos dentro del ítem
            capaVisible.blur();
        }
    });
}

// Enciende los motores del módulo al cargar la página por primera vez
document.addEventListener("DOMContentLoaded", function() {
    puntosEnLista = MIS_PUNTOS;
    renderizarListaPuntos();
    tieneCambiosPendientes = false;
});