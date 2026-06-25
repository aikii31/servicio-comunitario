// --- ESTADO GLOBAL LOCAL (In-Memory Database) ---
let baseDeDatos = {
    productos: [],
    ventas: [],
    usuarios: [],

    carrito: []
};


// --- VARIABLE DE SESIÓN ACTIVA ---
let usuarioActivo = null;
let vistaActual = "inicio";

// --- ELEMENTOS DEL DOM COMUNES ---
const dinamicView = document.getElementById("dinamic-view");
const appSidebar = document.getElementById("app-sidebar");
const appFooterActions = document.getElementById("app-footer-actions");
const modal = document.getElementById("app-modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalSubmitBtn = document.getElementById("modal-submit-btn");

// --- MANEJO DE TOASTS ---
function mostrarToast(mensaje, tipo = "success") {
    const wrapper = document.getElementById("toast-wrapper");
    const toast = document.createElement("div");
    toast.className = `toast-item ${tipo}`;

    let icon = "💡";
    if (tipo === "success") icon = "✅";
    if (tipo === "warning") icon = "⚠️";
    if (tipo === "danger") icon = "❌";

    toast.innerHTML = `
        <span style="font-size: 1.25rem;">${icon}</span>
        <div style="flex: 1;">
            <p style="margin: 0; font-weight: 600; font-size: 0.9rem; color: #1e293b;">${mensaje}</p>
        </div>
    `;
    wrapper.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 50);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// --- CONTROL DE VISTAS (ENRUTADOR) ---
function cambiarVista(vista) {
    if (!usuarioActivo && vista !== "login") {
        mostrarToast("Debe iniciar sesión para acceder al sistema.", "warning");
        cambiarVista("login");
        return;
    }

    vistaActual = vista;
    appFooterActions.style.display = "none";
    document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));

    const btnAsociado = document.querySelector(`[onclick="cambiarVista('${vista}')"]`);
    if (btnAsociado) btnAsociado.classList.add("active");

    switch (vista) {
        case "login":
            appSidebar.style.opacity = "0.1";
            appSidebar.style.pointerEvents = "none";
            cargarVistaLogin();
            break;
        case "inicio":
            appSidebar.style.opacity = "1";
            appSidebar.style.pointerEvents = "auto";
            cargarVistaInicio();
            break;
        case "pos":
            cargarVistaPOS();
            break;
        case "productos":
            appFooterActions.style.display = "flex";
            configurarBotoneraFooter("productos");
            cargarVistaProductos();
            break;
        case "historial":
            cargarVistaHistorial();
            break;
        case "root":
            cargarVistaRoot();
            break;
    }
}

// --- VISTA: LOGIN ---
function cargarVistaLogin() {
    dinamicView.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; width: 100%;">
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center;">
                <h2 style="margin-bottom: 10px; color: #1e293b;">Bienvenido</h2>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 25px;">Ingrese sus credenciales de acceso</p>

                <div style="text-align: left; margin-bottom: 15px;">
                    <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 5px; color: #475569;">Usuario u Operador</label>
                    <input type="text" id="login-user" placeholder="Ej: admin" style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem;">
                </div>

                <div style="text-align: left; margin-bottom: 25px;">
                    <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 5px; color: #475569;">Contraseña</label>
                    <input type="password" id="login-pass" placeholder="••••••••" style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem;">
                </div>

                <button onclick="procesarLogin()" class="action-btn add-btn" style="width: 100%; padding: 12px; font-size: 1rem; justify-content: center;">Ingresar al Sistema</button>
            </div>
        </div>
    `;

    document.getElementById("login-pass").addEventListener("keyup", (e) => {
        if (e.key === "Enter") procesarLogin();
    });
}

async function procesarLogin() {
    const userVal = document.getElementById("login-user").value.trim();
    const passVal = document.getElementById("login-pass").value;

    if (!userVal || !passVal) {
        mostrarToast("Por favor complete todos los campos.", "warning");
        return;
    }

    if (window.pywebview && window.pywebview.api) {
        try {
            const result = await window.pywebview.api.verificar_login(userVal, passVal);
            if (result && result.status === "success") {
                usuarioActivo = {
                    nombre: result.user.username,
                    iniciales: result.user.rol,
                    contrasena: result.user.password
                };

                mostrarToast(`Sesión iniciada como: ${usuarioActivo.nombre}`, "success");

                const rootBtn = document.getElementById("menu-btn-root");
                if (usuarioActivo.iniciales === "ROOT") {
                    if (rootBtn) rootBtn.style.display = "block";
                } else {
                    if (rootBtn) rootBtn.style.display = "none";
                }

                if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
                cambiarVista("inicio");
            } else {
                mostrarToast(result.message || "Credenciales incorrectas.", "danger");
            }
        } catch (err) {
            console.error(err);
            mostrarToast("Error conectando con la autenticación del backend.", "danger");
        }
    } else {
        if (userVal === "admin" && passVal === "admin123") {
            usuarioActivo = { nombre: "admin", iniciales: "ROOT" };
            cambiarVista("inicio");
        } else {
            mostrarToast("Modo desarrollo aislado: use admin / admin123", "warning");
        }
    }
}

function cerrarSesion() {
    usuarioActivo = null;
    mostrarToast("Sesión cerrada correctamente.");
    cambiarVista("login");
}

// --- VISTA: INICIO / DASHBOARD ---
function cargarVistaInicio() {
    const totalVentas = baseDeDatos.ventas.reduce((acc, v) => acc + (v.estado === "ANULADA" ? 0 : v.total), 0);
    const totalProductos = baseDeDatos.productos.length;
    const stockBajo = baseDeDatos.productos.filter(p => p.stock <= p.stock_minimo).length;

    dinamicView.innerHTML = `
        <div style="padding: 30px;">
            <h1 style="color: #1e293b; margin-bottom: 5px;">Panel de Control</h1>
            <p style="color: #64748b; margin-bottom: 30px;">Resumen operativo del sistema unificado</p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 40px;">
                <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-left: 5px solid #3b82f6;">
                    <p style="font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Ingresos Totales</p>
                    <h2 style="font-size: 2rem; color: #1e293b; margin-top: 10px;">$${totalVentas.toFixed(2)}</h2>
                </div>
                <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-left: 5px solid #10b981;">
                    <p style="font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Items en Catálogo</p>
                    <h2 style="font-size: 2rem; color: #1e293b; margin-top: 10px;">${totalProductos} Productos</h2>
                </div>
                <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-left: 5px solid #ef4444;">
                    <p style="font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Alertas Críticas</p>
                    <h2 style="font-size: 2rem; color: #ef4444; margin-top: 10px;">${stockBajo} Stock Bajo</h2>
                </div>
            </div>

            <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h3 style="color: #1e293b; margin-bottom: 15px;">Accesos Rápidos</h3>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button onclick="cambiarVista('pos')" class="action-btn add-btn" style="padding: 15px 25px; font-size: 1rem;">⚡ Abrir Punto de Venta (POS)</button>
                    <button onclick="cambiarVista('productos')" class="action-btn edit-btn" style="padding: 15px 25px; font-size: 1rem; color:white; background:#475569;">📦 Gestionar Inventario</button>
                </div>
            </div>
        </div>
    `;
}

// --- VISTA: POS ---
function cargarVistaPOS() {
    dinamicView.innerHTML = `
        <div style="display: flex; height: 100%; width:100%;">
            <div style="flex: 1.4; padding: 25px; display: flex; flex-direction: column; border-right: 1px solid #e2e8f0; height:100%; overflow-y:auto;">
                <h2 style="color: #1e293b; margin-bottom: 15px;">Catálogo de Productos</h2>
                <div id="pos-catalog-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px;"></div>
            </div>

            <div style="flex: 1; padding: 25px; background: #f8fafc; display: flex; flex-direction: column; height: 100%;">
                <h2 style="color: #1e293b; margin-bottom: 15px;">Líneas de Venta</h2>

                <div style="margin-bottom: 15px; display: flex; gap:10px;">
                    <input type="text" id="pos-cliente" placeholder="Cliente: General / Particular" style="flex:1; padding:10px; border:1px solid #cbd5e1; border-radius:6px;">
                    <select id="pos-metodo" style="padding:10px; border:1px solid #cbd5e1; border-radius:6px; background:white;">
                        <option value="Efectivo">💵 Efectivo</option>
                        <option value="Transferencia">🏦 Transferencia</option>
                        <option value="Pago Móvil">📱 Pago Móvil</option>
                        <option value="Divisas">🇺🇸 Divisas</option>
                    </select>
                </div>

                <div id="pos-cart-container" style="flex: 1; background: white; border: 1px solid #cbd5e1; border-radius: 8px; overflow-y: auto; padding: 15px; margin-bottom: 20px;"></div>

                <div style="border-top: 2px dashed #cbd5e1; padding-top: 15px; margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; font-size: 1.4rem; font-weight: 700; color: #1e293b;">
                        <span>Total General:</span>
                        <span id="pos-cart-total">$0.00</span>
                    </div>
                </div>

                <button onclick="procesarVentaPOS()" class="action-btn add-btn" style="width: 100%; padding: 15px; font-size: 1.2rem; justify-content: center; font-weight: 700;">🚀 Procesar Factura e Imprimir</button>
            </div>
        </div>
    `;

    renderizarCatalogoPOS();
    renderizarCarritoPOS();
}

function renderizarCatalogoPOS() {
    const grid = document.getElementById("pos-catalog-grid");
    if (!grid) return;
    grid.innerHTML = "";

    baseDeDatos.productos.forEach(p => {
        let badgeColor = "#3b82f6";
        if (p.tipo === "Nuevo") badgeColor = "#10b981";
        if (p.tipo === "Prestamo") badgeColor = "#8b5cf6";

        const deshabilitado = p.stock <= 0;

        const card = document.createElement("div");
        card.style = `background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); position:relative; ${deshabilitado ? 'opacity: 0.5;' : ''}`;

        card.innerHTML = `
            <span style="position: absolute; top: 8px; right: 8px; font-size: 0.7rem; font-weight: 700; color: white; background: ${badgeColor}; padding: 3px 8px; border-radius: 20px;">${p.tipo}</span>
            <div style="margin-top: 10px; margin-bottom: 15px;">
                <h4 style="color: #1e293b; font-size: 0.95rem; line-height: 1.3; font-weight: 600;">${p.nombre}</h4>
                <p style="color: #64748b; font-size: 0.8rem; margin-top: 4px;">Disponibles: <strong style="${p.stock <= p.stock_minimo ? 'color:#ef4444;' : 'color:#1e293b;'}">${p.stock}</strong></p>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                <span style="font-size: 1.1rem; font-weight: 700; color: #0f172a;">$${p.precio.toFixed(2)}</span>
                <button onclick="agregarAlCarritoPOS(${p.id})" ${deshabilitado ? 'disabled' : ''} class="action-btn add-btn" style="padding: 6px 10px; font-size: 0.8rem;">+ Añadir</button>
            </div>
        `;

        grid.appendChild(card);
    });
}

function renderizarCarritoPOS() {
    const container = document.getElementById("pos-cart-container");
    const totalSpan = document.getElementById("pos-cart-total");
    if (!container || !totalSpan) return;

    container.innerHTML = "";
    if (baseDeDatos.carrito.length === 0) {
        container.innerHTML = `<p style="color: #94a3b8; text-align: center; margin-top: 40px; font-size: 0.9rem;">El carrito está vacío</p>`;
        totalSpan.innerText = "$0.00";
        return;
    }

    let acumulador = 0;
    baseDeDatos.carrito.forEach(item => {
        const prod = baseDeDatos.productos.find(p => p.id === item.productoId);
        if (!prod) return;

        const subtotal = item.cantidad * item.precioUnitario;
        acumulador += subtotal;

        const row = document.createElement("div");
        row.style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;";
        row.innerHTML = `
            <div style="max-width: 60%;">
                <h5 style="margin:0; color:#1e293b; font-size:0.85rem; font-weight:600;">${prod.nombre}</h5>
                <span style="font-size:0.75rem; color:#64748b;">${item.cantidad} x $${item.precioUnitario.toFixed(2)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-weight:700; color:#1e293b; font-size:0.9rem;">$${subtotal.toFixed(2)}</span>
                <button onclick="removerDelCarritoPOS(${item.productoId})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1rem;">❌</button>
            </div>
        `;
        container.appendChild(row);
    });

    totalSpan.innerText = `$${acumulador.toFixed(2)}`;
}

function agregarAlCarritoPOS(id) {
    const prod = baseDeDatos.productos.find(p => p.id === id);
    if (!prod || prod.stock <= 0) return;

    const enCarrito = baseDeDatos.carrito.find(item => item.productoId === id);
    if (enCarrito) {
        if (enCarrito.cantidad >= prod.stock) {
            mostrarToast("No puede agregar más de la cantidad en existencia.", "warning");
            return;
        }
        enCarrito.cantidad++;
    } else {
        baseDeDatos.carrito.push({
            productoId: id,
            whitespaceId: id,
            cantidad: 1,
            precioUnitario: prod.precio
        });
    }
    renderizarCarritoPOS();
}

function removerDelCarritoPOS(id) {
    baseDeDatos.carrito = baseDeDatos.carrito.filter(item => item.productoId !== id);
    renderizarCarritoPOS();
}

async function procesarVentaPOS() {
    if (baseDeDatos.carrito.length === 0) {
        mostrarToast("No hay elementos en las líneas de venta para procesar.", "warning");
        return;
    }

    const clienteName = document.getElementById("pos-cliente").value.trim() || "Consumidor Final";
    const metodoSelect = document.getElementById("pos-metodo").value;

    let totalFactura = 0;
    const itemsProcesados = baseDeDatos.carrito.map(item => {
        totalFactura += item.cantidad * item.precioUnitario;
        return {
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario
        };
    });

    if (window.pywebview && window.pywebview.api) {
        try {
            const result = await window.pywebview.api.registrar_venta(
                clienteName,
                totalFactura,
                metodoSelect,
                usuarioActivo ? usuarioActivo.nombre : "OP",
                itemsProcesados
            );

            if (result && result.status === 'success') {
                mostrarToast(`Venta procesada.`, "success");
                if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });

                const nuevosProductos = await window.pywebview.api.get_productos();
                if (nuevosProductos) baseDeDatos.productos = nuevosProductos;

                const nuevasVentas = await window.pywebview.api.get_ventas();
                if (nuevasVentas) baseDeDatos.ventas = nuevasVentas;

                baseDeDatos.carrito = [];
                cargarVistaPOS();
            } else {
                mostrarToast("Error: " + (result.message || ''), "danger");
            }
        } catch (err) {
            console.error(err);
            mostrarToast("Fallo de conexión con la DB.", "danger");
        }
    }
}

// --- VISTA: PRODUCTOS ---
let productoSeleccionadoId = null;

function cargarVistaProductos() {
    dinamicView.innerHTML = `
        <div style="padding: 25px; height: 100%; overflow-y: auto;">
            <h2 style="color: #1e293b; margin-bottom: 5px;">Módulo de Inventario</h2>
            <p style="color: #64748b; margin-bottom: 20px;">Catálogo base del sistema para control de existencias</p>

            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color:#475569; font-size:0.85rem; font-weight:700;">
                        <th style="padding: 15px;">ID</th>
                        <th style="padding: 15px;">Descripción del Producto</th>
                        <th style="padding: 15px;">Tipo de Operación</th>
                        <th style="padding: 15px; text-align:right;">Precio Base</th>
                        <th style="padding: 15px; text-align:center;">Existencias</th>
                        <th style="padding: 15px; text-align:center;">Mínimo</th>
                    </tr>
                </thead>
                <tbody id="productos-table-body"></tbody>
            </table>
        </div>
    `;
    renderizarTablaProductos();
}

function renderizarTablaProductos() {
    const tbody = document.getElementById("productos-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    baseDeDatos.productos.forEach(p => {
        const row = document.createElement("tr");
        row.style = "border-bottom: 1px solid #e2e8f0; cursor: pointer; font-size: 0.9rem; color:#1e293b;";
        if (p.id === productoSeleccionadoId) row.style.background = "#e0f2fe";

        row.onclick = () => {
            productoSeleccionadoId = (productoSeleccionadoId === p.id) ? null : p.id;
            renderizarTablaProductos();
        };

        let badgeColor = "#3b82f6";
        if (p.tipo === "Nuevo") badgeColor = "#10b981";
        if (p.tipo === "Prestamo") badgeColor = "#8b5cf6";

        row.innerHTML = `
            <td style="padding: 15px; font-weight:600; color:#64748b;">#${p.id}</td>
            <td style="padding: 15px; font-weight:600;">${p.nombre}</td>
            <td style="padding: 15px;"><span style="font-size: 0.75rem; font-weight: 700; color: white; background: ${badgeColor}; padding: 3px 8px; border-radius: 20px;">${p.tipo}</span></td>
            <td style="padding: 15px; text-align:right; font-weight:700;">$${p.precio.toFixed(2)}</td>
            <td style="padding: 15px; text-align:center;"><span style="${p.stock <= p.stock_minimo ? 'background:#fee2e2; color:#ef4444; padding:4px 10px; border-radius:6px; font-weight:700;' : ''}">${p.stock} u.</span></td>
            <td style="padding: 15px; text-align:center; color:#64748b;">${p.stock_minimo} u.</td>
        `;
        tbody.appendChild(row);
    });
}

function configurarBotoneraFooter(modulo) {
    const btnAdd = document.getElementById("btn-add");
    const btnEdit = document.getElementById("btn-edit");
    const btnDelete = document.getElementById("btn-delete");

    if (modulo === "productos") {
        btnAdd.onclick = () => abrirModalProducto("crear");
        btnEdit.onclick = () => {
            if (!productoSeleccionadoId) { mostrarToast("Seleccione una fila primero.", "warning"); return; }
            abrirModalProducto("editar");
        };
        btnDelete.onclick = () => {
            if (!productoSeleccionadoId) { mostrarToast("Seleccione una fila de la tabla.", "warning"); return; }
            abrirModalProducto("eliminar");
        };
    }
}

function abrirModalProducto(accion) {
    const prod = baseDeDatos.productos.find(p => p.id === productoSeleccionadoId);

    if (accion === "crear") {
        modalTitle.innerText = "Añadir Item al Inventario";
        modalBody.innerHTML = `
            <div style="display:grid; gap:15px;">
                <div><label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Nombre / Descripción</label><input type="text" id="m-prod-nombre" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;"></div>
                <div><label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Tipo de Operación</label><select id="m-prod-tipo" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:white;"><option value="Recarga">Recarga</option><option value="Nuevo">Nuevo</option><option value="Prestamo">Préstamo</option></select></div>
                <div><label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Precio Venta ($)</label><input type="number" step="0.01" id="m-prod-precio" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;"></div>
                <div><label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Stock Físico Inicial</label><input type="number" id="m-prod-stock" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;"></div>
                <div><label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Existencia Mínima Permitida</label><input type="number" id="m-prod-minimo" value="5" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;"></div>
            </div>
        `;
        modalSubmitBtn.onclick = confirmarCrearProducto;
    } else if (accion === "editar" && prod) {
        modalTitle.innerText = `Modificar Item #${prod.id}`;
        modalBody.innerHTML = `
            <div style="display:grid; gap:15px;">
                <div><label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Nombre / Descripción</label><input type="text" id="m-prod-nombre" value="${prod.nombre}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;"></div>
                <div><label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Tipo de Operación</label><select id="m-prod-tipo" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px; background:white;"><option value="Recarga" ${prod.tipo==='Recarga'?'selected':''}>Recarga</option><option value="Nuevo" ${prod.tipo==='Nuevo'?'selected':''}>Nuevo</option><option value="Prestamo" ${prod.tipo==='Prestamo'?'selected':''}>Préstamo</option></select></div>
                <div><label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Precio Venta ($)</label><input type="number" step="0.01" id="m-prod-precio" value="${prod.precio}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;"></div>
                <div><label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Stock Físico</label><input type="number" id="m-prod-stock" value="${prod.stock}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;"></div>
                <div><label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Existencia Mínima</label><input type="number" id="m-prod-minimo" value="${prod.stock_minimo}" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:4px;"></div>
            </div>
        `;
        modalSubmitBtn.onclick = confirmarEditarProducto;
    } else if (accion === "eliminar" && prod) {
        modalTitle.innerText = "Confirmación de Descarte";
        modalBody.innerHTML = `<p style="color:#1e293b; font-size:0.95rem;">¿Está seguro que desea borrar permanentemente el producto <strong>${prod.nombre}</strong>?</p>`;
        modalSubmitBtn.onclick = confirmarEliminarProducto;
    }

    modal.classList.add("active");
}

function cerrarModal() {
    modal.classList.remove("active");
}

async function confirmarCrearProducto() {
    const nombre = document.getElementById("m-prod-nombre").value.trim();
    const tipo = document.getElementById("m-prod-tipo").value;
    const precio = parseFloat(document.getElementById("m-prod-precio").value) || 0;
    const stock = parseInt(document.getElementById("m-prod-stock").value) || 0;
    const stock_minimo = parseInt(document.getElementById("m-prod-minimo").value) || 0;

    if (!nombre) { mostrarToast("Asigne una descripción válida.", "warning"); return; }

    if (window.pywebview && window.pywebview.api) {
        try {
            const res = await window.pywebview.api.agregar_producto(nombre, tipo, precio, stock, stock_minimo);
            if (res && res.status === 'success') {
                mostrarToast("Item guardado correctamente.");
                const items = await window.pywebview.api.get_productos();
                if (items) baseDeDatos.productos = items;
                cerrarModal();
                cargarVistaProductos();
            }
        } catch (e) {
            mostrarToast("Error de sincronización", "danger");
        }
    }
}

async function confirmarEditarProducto() {
    const nombre = document.getElementById("m-prod-nombre").value.trim();
    const tipo = document.getElementById("m-prod-tipo").value;
    const precio = parseFloat(document.getElementById("m-prod-precio").value) || 0;
    const stock = parseInt(document.getElementById("m-prod-stock").value) || 0;
    const stock_minimo = parseInt(document.getElementById("m-prod-minimo").value) || 0;

    if (window.pywebview && window.pywebview.api) {
        try {
            const res = await window.pywebview.api.editar_producto(productoSeleccionadoId, nombre, tipo, precio, stock, stock_minimo);
            if (res && res.status === 'success') {
                mostrarToast("Cambios guardados.");
                const items = await window.pywebview.api.get_productos();
                if (items) baseDeDatos.productos = items;
                productoSeleccionadoId = null;
                cerrarModal();
                cargarVistaProductos();
            }
        } catch (e) {
            mostrarToast("Fallo de escritura.", "danger");
        }
    }
}

async function confirmarEliminarProducto() {
    if (window.pywebview && window.pywebview.api) {
        try {
            const res = await window.pywebview.api.eliminar_producto(productoSeleccionadoId);
            if (res && res.status === 'success') {
                mostrarToast("Registro eliminado.");
                const items = await window.pywebview.api.get_productos();
                if (items) baseDeDatos.productos = items;
                productoSeleccionadoId = null;
                cerrarModal();
                cargarVistaProductos();
            }
        } catch (e) {
            mostrarToast("Fallo al eliminar.", "danger");
        }
    }
}

// --- VISTA: HISTORIAL ---
function cargarVistaHistorial() {
    dinamicView.innerHTML = `
        <div style="padding: 25px; height: 100%; overflow-y: auto;">
            <h2 style="color: #1e293b; margin-bottom: 5px;">Historial del Módulo POS</h2>
            <p style="color: #64748b; margin-bottom: 20px;">Registro integral de facturas y auditoría rápida</p>

            <div id="historial-cards-wrapper" style="display:grid; gap:15px;"></div>
        </div>
    `;
    renderizarTarjetasHistorial();
}

function renderizarTarjetasHistorial() {
    const wrapper = document.getElementById("historial-cards-wrapper");
    if (!wrapper) return;
    wrapper.innerHTML = "";

    if (baseDeDatos.ventas.length === 0) {
        wrapper.innerHTML = `<p style="color:#94a3b8; padding:30px; text-align:center;">No hay registros transacciones comerciales.</p>`;
        return;
    }

    const esAdmin = usuarioActivo && usuarioActivo.iniciales === "ROOT";

    baseDeDatos.ventas.forEach(v => {
        const estadoVenta = v.estado || "ACTIVA";
        if (estadoVenta === "ANULADA" && !esAdmin) return;

        const card = document.createElement("div");

        let estiloCardBorde = "border-left: 5px solid #10b981;";
        let estiloCardFondo = "background: white;";
        let estiloCardTexto = "color: #1e293b;";
        let badgeEstado = "";
        let botonAccion = `<button onclick="anularVentaHistorial(${v.id})" class="action-btn delete-btn" style="padding:6px 12px; font-size:0.8rem;">⚠️ Anular Operación</button>`;

        if (estadoVenta === "ANULADA") {
            estiloCardBorde = "border-left: 5px solid #ef4444;";
            estiloCardFondo = "background: #f8fafc; opacity: 0.75;";
            estiloCardTexto = "color: #94a3b8; text-decoration: line-through;";
            badgeEstado = `<span style="background: #fee2e2; color: #ef4444; font-weight: bold; font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; margin-left: 10px;">ANULADA</span>`;
            botonAccion = `<span style="color: #cbd5e1; font-weight: 600; font-style: italic; font-size:0.85rem;">Operación Cancelada</span>`;
        }

        card.style = `${estiloCardFondo} border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); ${estiloCardBorde}`;

        let subLineas = "";
        if (v.items && Array.isArray(v.items)) {
            v.items.forEach(it => {
                subLineas += `<li style="font-size:0.8rem; color:#475569;">${it.cantidad}x ${it.producto_nombre || 'Producto'} (u: $${(it.precio_unitario || 0).toFixed(2)})</li>`;
            });
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; ${estiloCardTexto}">
                <div>
                    <h4 style="margin:0; display: inline-flex; align-items: center;">Factura #${v.id} ${badgeEstado}</h4>
                    <p style="margin:0; font-size:0.75rem; color:#64748b; text-decoration: none;">Fecha: ${v.fecha} | Operador: ${v.usuario}</p>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:1.2rem; font-weight:700;">$${(v.total || 0).toFixed(2)}</span>
                    <p style="margin:0; font-size:0.75rem; color:#64748b; text-decoration: none;">${v.metodo_pago || ''}</p>
                </div>
            </div>
            <div style="background:#f8fafc; padding:10px; border-radius:6px; margin-bottom:15px; text-decoration: none;">
                <p style="font-size:0.8rem; font-weight:600; margin-bottom:5px; color:#1e293b;">Cliente: ${v.cliente_nombre || v.cliente || 'Consumidor Final'}</p>
                <ul style="margin:0; padding-left:15px;">${subLineas}</ul>
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                ${botonAccion}
            </div>
        `;

        wrapper.appendChild(card);
    });
}

async function anularVentaHistorial(id) {
    if (!confirm(`¿Está seguro de que desea anular la venta #${id}? Esta acción modificará el estado.`)) return;

    if (window.pywebview && window.pywebview.api) {
        try {
            const res = await window.pywebview.api.anular_venta(id);
            if (res && res.status === "success") {
                mostrarToast(res.message, "success");

                const nuevasVentas = await window.pywebview.api.get_ventas();
                if (nuevasVentas) baseDeDatos.ventas = nuevasVentas;

                cargarVistaHistorial();
            } else {
                mostrarToast(res.message || "No se pudo anular la venta", "danger");
            }
        } catch (e) {
            console.error(e);
            mostrarToast("Error al conectar con la base de datos.", "danger");
        }
    }
}

function cargarVistaRoot() {
    dinamicView.innerHTML = `
        <div style="padding: 25px; height: 100%; overflow-y:auto;">
            <h2 style="color:#1e293b; margin-bottom: 5px;">Panel de Usuarios (Root)</h2>
            <p style="color:#64748b; margin-bottom: 20px;">Crear, eliminar y modificar contraseñas. (Incluye contraseñas en texto plano)</p>

            <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; align-items:start;">
                <div style="background:white; padding: 18px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.03);">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom: 10px;">
                        <h3 style="margin:0; color:#1e293b;">Usuarios</h3>
                        <button onclick="rootRefrescarUsuarios()" class="action-btn edit-btn" style="padding:8px 12px;">↻ Actualizar</button>
                    </div>

                    <div id="root-usuarios-table-wrap" style="overflow:auto; border:1px solid #e2e8f0; border-radius: 10px;">
                        <table style="width:100%; border-collapse: collapse; min-width: 520px;">
                            <thead>
                                <tr style="background:#f1f5f9;">
                                    <th style="text-align:left; padding:12px; color:#475569; font-size:0.85rem;">Usuario</th>
                                    <th style="text-align:left; padding:12px; color:#475569; font-size:0.85rem;">Rol</th>
                                    <th style="text-align:left; padding:12px; color:#475569; font-size:0.85rem;">Contraseña</th>
                                    <th style="text-align:right; padding:12px; color:#475569; font-size:0.85rem;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="root-usuarios-tbody"></tbody>
                        </table>
                    </div>

                    <div id="root-usuarios-empty" style="display:none; color:#94a3b8; padding: 20px 0; text-align:center;">
                        No hay usuarios.
                    </div>
                </div>

                <div class="user-form" style="max-width:none; padding: 18px;">
                    <h3 style="margin-bottom: 12px; color:#1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom:10px;">Crear Usuario</h3>

                    <label>Username</label>
                    <input type="text" id="root-user-username" placeholder="Ej: pepe" />

                    <label>Contraseña</label>
                    <input type="text" id="root-user-password" placeholder="Ej: 1234" />

                    <label>Rol</label>
                    <select id="root-user-rol" style="width:100%; padding:10px; border: 1px solid #cbd5e1; border-radius:6px; background:#fff; margin-bottom: 14px;">
                        <option value="empleado">empleado</option>
                        <option value="FA">FA</option>
                        <option value="MA">MA</option>
                        <option value="ROOT">ROOT</option>
                    </select>

                    <button onclick="rootCrearUsuario()" class="btn-success" style="margin-top: 0;">+ Crear</button>

                    <p style="margin-top: 14px; color:#94a3b8; font-size:0.8rem; line-height:1.4;">
                        Nota: la cuenta <strong>admin</strong> (Root primario) no puede eliminarse ni modificarse.
                    </p>
                </div>
            </div>
        </div>
    `;

    rootRefrescarUsuarios();
}

function rootRefrescarUsuarios() {
    const tbody = document.getElementById('root-usuarios-tbody');
    const empty = document.getElementById('root-usuarios-empty');
    if (!tbody || !empty) return;

    tbody.innerHTML = '';

    if (!window.pywebview || !window.pywebview.api) {
        empty.style.display = 'block';
        return;
    }

    window.pywebview.api.get_usuarios().then(usuarios => {
        baseDeDatos.usuarios = Array.isArray(usuarios) ? usuarios.map(u => ({
            nombre: u.username,
            iniciales: u.rol,
            contrasena: u.password || ''
        })) : [];

        const list = baseDeDatos.usuarios;
        if (list.length === 0) {
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';

        list.forEach(u => {
            const isAdmin = (u.nombre || '').toLowerCase() === 'admin';

            const tr = document.createElement('tr');
            tr.style = 'border-bottom: 1px solid #e2e8f0;';
            tr.innerHTML = `
                <td style="padding:12px; font-weight:700; color:#1e293b;">${u.nombre}</td>
                <td style="padding:12px; color:#475569;">${u.iniciales}</td>
                <td style="padding:12px; color:#1e293b;">${u.contrasena}</td>
                <td style="padding:12px; text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:8px; flex-wrap: wrap;">
                        <button ${isAdmin ? 'disabled' : ''} onclick="rootCambiarPassword('${u.nombre}')" class="action-btn edit-btn" style="padding:8px 10px; font-size:0.8rem;">🔐 Cambiar</button>
                        <button ${isAdmin ? 'disabled' : ''} onclick="rootEliminarUsuario('${u.nombre}')" class="action-btn delete-btn" style="padding:8px 10px; font-size:0.8rem;">❌ Eliminar</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(err => {
        console.error(err);
        empty.style.display = 'block';
    });
}

async function rootCrearUsuario() {
    const username = document.getElementById('root-user-username').value.trim();
    const password = document.getElementById('root-user-password').value.trim();
    const rol = document.getElementById('root-user-rol').value;

    if (!username || !password) {
        mostrarToast('Complete username y contraseña.', 'warning');
        return;
    }

    if (!window.pywebview || !window.pywebview.api) {
        mostrarToast('Root solo funciona con la DB activa.', 'warning');
        return;
    }

    try {
        const res = await window.pywebview.api.agregar_usuario(username, password, rol);
        if (res && res.status === 'success') {
            mostrarToast('Usuario creado correctamente.');
            document.getElementById('root-user-username').value = '';
            document.getElementById('root-user-password').value = '';
            rootRefrescarUsuarios();
        } else {
            mostrarToast(res.message || 'No se pudo crear usuario.', 'danger');
        }
    } catch (e) {
        console.error(e);
        mostrarToast('Error al crear usuario.', 'danger');
    }
}

async function rootEliminarUsuario(username) {
    const confirmText = `¿Eliminar el usuario ${username}?`;
    if (!confirm(confirmText)) return;

    try {
        const res = await window.pywebview.api.eliminar_usuario(username);
        if (res && res.status === 'success') {
            mostrarToast(res.message || 'Usuario eliminado.');
            rootRefrescarUsuarios();
        } else {
            mostrarToast(res.message || 'No se pudo eliminar usuario.', 'danger');
        }
    } catch (e) {
        console.error(e);
        mostrarToast('Error al eliminar usuario.', 'danger');
    }
}

async function rootCambiarPassword(username) {
    const nueva = prompt(`Nueva contraseña para ${username}:`);
    if (!nueva) return;

    try {
        const res = await window.pywebview.api.set_password_usuario(username, nueva);
        if (res && res.status === 'success') {
            mostrarToast(res.message || 'Contraseña actualizada.');
            rootRefrescarUsuarios();
        } else {
            mostrarToast(res.message || 'No se pudo cambiar la contraseña.', 'danger');
        }
    } catch (e) {
        console.error(e);
        mostrarToast('Error al actualizar contraseña.', 'danger');
    }
}


// --- PARCHE DE INTEGRACIÓN PYTHON/SQLITE ---
window.addEventListener('pywebviewready', async () => {
  try {
    if (window.pywebview && window.pywebview.api) {
      const productos = await window.pywebview.api.get_productos();
      const usuarios = await window.pywebview.api.get_usuarios();
      const ventas = await window.pywebview.api.get_ventas();

      if (productos && Array.isArray(productos)) baseDeDatos.productos = productos;
      if (ventas && Array.isArray(ventas)) baseDeDatos.ventas = ventas;

      if (usuarios && Array.isArray(usuarios)) {
        baseDeDatos.usuarios = usuarios.map(u => ({
          nombre: u.username,
          iniciales: u.rol,
          contrasena: u.password || ''
        }));
      }

      console.log('SQLite conectado correctamente');
    }
  } catch (e) {
    console.error('Error conectando SQLite', e);
  }
});

// Funciones globales para uso desde consola y futuras integraciones
window.dbSync = {
  getProductos: () => window.pywebview.api.get_productos(),
  getUsuarios: () => window.pywebview.api.get_usuarios(),
  getVentas: () => window.pywebview.api.get_ventas(),
  agregarProducto: (...a) => window.pywebview.api.agregar_producto(...a),
  editarProducto: (...a) => window.pywebview.api.editar_producto(...a),
  eliminarProducto: (id) => window.pywebview.api.eliminar_producto(id),
  agregarUsuario: (...a) => window.pywebview.api.agregar_usuario(...a),
  anularVenta: (id) => window.pywebview.api.anular_venta(id)
};

