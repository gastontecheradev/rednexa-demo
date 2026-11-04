// ===================== Enrutador, formularios, scripts del sitio y panel de la demo =====================

const SLUG = '([a-z0-9]+(?:-[a-z0-9]+)*)';
const N = '(\\d+)';
const AUTH = { auth: true };
const ADMIN = { auth: true, admin: true };

const GET = [
    ['^/$', pPortada],
    ['^/buscar$', pBuscar],
    ['^/destacados$', pDestacados],
    ['^/categorias$', pCategorias],
    ['^/(profesionales|servicios)(/[a-z0-9-]+){0,2}$', pCategoria],
    ['^/curriculum$', pCurriculum],
    [`^/curriculum/${N}$`, (c, id) => pFichaCv(c, +id)],
    [`^/curriculum/${N}/reportar$`, (c, id) => pReportarCv(c, +id), AUTH],
    ['^/como-funciona$', pComoFunciona],
    ['^/contacto$', (c) => pContacto(c)],
    ['^/terminos$', pTerminos],
    ['^/privacidad$', pPrivacidad],
    ['^/registrarse$', (c) => pRegistrarse(c)],
    ['^/ingresar$', (c) => pIngresar(c)],
    ['^/confirmar$', pConfirmar],
    ['^/recuperar$', (c) => pRecuperar(c)],
    ['^/restablecer$', (c) => pRestablecer(c)],
    ['^/cuenta-eliminada$', pCuentaEliminada],
    ['^/mi-cuenta$', (c) => pDatosCuenta(c), AUTH],
    ['^/mi-cuenta/menu$', pMenuCuenta, AUTH],
    ['^/mi-cuenta/contrasena$', (c) => pContrasena(c), AUTH],
    ['^/mi-cuenta/resenas$', pMisResenas, AUTH],
    ['^/mi-cuenta/eliminar$', (c) => pEliminar(c), AUTH],
    ['^/mi-curriculum$', (c) => pMiCurriculum(c), AUTH],
    ['^/ofrecer$', (c) => pOfrecer(c), AUTH],
    ['^/mi-perfil$', (c) => pDatosPerfil(c), AUTH],
    ['^/mi-perfil/servicios$', pMisServicios, AUTH],
    ['^/mi-perfil/servicios/nuevo$', (c) => pRubro(c, null), AUTH],
    [`^/mi-perfil/servicios/${N}/rubro$`, (c, id) => pRubro(c, +id), AUTH],
    [`^/mi-perfil/servicios/${N}/datos$`, (c, id) => pDatosServicio(c, +id), AUTH],
    [`^/mi-perfil/servicios/${N}/donde$`, (c, id) => pDonde(c, +id), AUTH],
    [`^/mi-perfil/servicios/${N}/categorias$`, (c, id) => pCategoriasServicio(c, +id, null, {}, c.flash.rechazadas || []), AUTH],
    [`^/mi-perfil/servicios/${N}/revisar$`, (c, id) => pRevisar(c, +id), AUTH],
    ['^/mi-perfil/opiniones$', (c) => pRecibidas(c), AUTH],
    ['^/mi-perfil/suscripcion$', pSuscripcion, AUTH],
    ['^/pasarela-de-prueba/debito$', pPasarelaDebito, AUTH],
    [`^/pasarela-de-prueba/${N}$`, (c, id) => pPasarela(c, +id), AUTH],
    ['^/admin$', pTablero, ADMIN],
    ['^/admin/revision$', pRevision, ADMIN],
    ['^/admin/perfiles$', pPerfilesAdmin, ADMIN],
    [`^/admin/perfiles/${N}$`, (c, id) => pPerfilAdmin(c, +id), ADMIN],
    ['^/admin/usuarios$', pUsuariosAdmin, ADMIN],
    [`^/admin/usuarios/${N}$`, (c, id) => pUsuarioAdmin(c, +id), ADMIN],
    ['^/admin/cv$', pCvAdmin, ADMIN],
    ['^/admin/resenas$', (c) => pModeracion(c), ADMIN],
    [`^/admin/resenas/${N}$`, (c, id) => pModeracion(c, +id), ADMIN],
    ['^/admin/categorias$', pCategoriasAdmin, ADMIN],
    ['^/admin/palabras$', pPalabras, ADMIN],
    ['^/admin/pagos$', pPagosAdmin, ADMIN],
    ['^/admin/destacados$', pDestacadosAdmin, ADMIN],
    ['^/admin/tarifas$', (c) => pTarifasAdmin(c), ADMIN],
    ['^/admin/registro$', pRegistroAdmin, ADMIN],
    [`^/opiniones/${N}/reportar$`, (c, id) => pReportarOpinion(c, +id), AUTH],
    [`^/${SLUG}/opinar$`, (c, s) => pOpinar(c, s), AUTH],
    [`^/${SLUG}/${N}/reportar$`, (c, s, id) => pReportarPublicacion(c, s, +id), AUTH],
    [`^/${SLUG}/${N}$`, (c, s, id) => (SLUGS_RESERVADOS.has(s) ? null : pFicha(c, s, +id))],
    [`^/${SLUG}$`, (c, s) => (SLUGS_RESERVADOS.has(s) ? null : pFicha(c, s, null))]
];

const POST = [
    ['^/salir$', postSalir],
    ['^/registrarse$', postRegistrarse],
    ['^/ingresar$', postIngresar],
    ['^/confirmar/reenviar$', postReenviar],
    ['^/recuperar$', postRecuperar],
    ['^/restablecer$', postRestablecer],
    ['^/contacto$', postContacto],
    ['^/mi-cuenta$', postDatosCuenta, AUTH],
    ['^/mi-cuenta/contrasena$', postContrasena, AUTH],
    ['^/mi-cuenta/eliminar$', postEliminar, AUTH],
    ['^/mi-curriculum$', postMiCurriculum, AUTH],
    ['^/mi-curriculum/pausar$', postPausarCv, AUTH],
    ['^/mi-curriculum/reanudar$', postReanudarCv, AUTH],
    ['^/ofrecer$', postOfrecer, AUTH],
    ['^/mi-perfil$', postDatosPerfil, AUTH],
    ['^/mi-perfil/servicios/nuevo$', (c, d) => postRubro(c, null, d), AUTH],
    [`^/mi-perfil/servicios/${N}/rubro$`, (c, id, d) => postRubro(c, +id, d), AUTH],
    [`^/mi-perfil/servicios/${N}/datos$`, (c, id, d) => postDatosServicio(c, +id, d), AUTH],
    [`^/mi-perfil/servicios/${N}/donde$`, (c, id, d) => postDonde(c, +id, d), AUTH],
    [`^/mi-perfil/servicios/${N}/categorias$`, (c, id, d) => postCategoriasServicio(c, +id, d), AUTH],
    [`^/mi-perfil/servicios/${N}/revisar$`, (c, id) => postPublicar(c, +id), AUTH],
    [`^/mi-perfil/servicios/${N}/pausar$`, (c, id) => postPausar(c, +id), AUTH],
    [`^/mi-perfil/servicios/${N}/reanudar$`, (c, id) => postReanudar(c, +id), AUTH],
    [`^/mi-perfil/servicios/${N}/eliminar$`, (c, id) => postEliminarBorrador(c, +id), AUTH],
    [`^/mi-perfil/opiniones/${N}/respuesta$`, (c, id, d) => postRespuesta(c, +id, d), AUTH],
    ['^/mi-perfil/suscripcion$', postSuscripcion, AUTH],
    ['^/pasarela-de-prueba/debito$', postPasarelaDebito, AUTH],
    [`^/pasarela-de-prueba/${N}$`, (c, id, d) => postPasarela(c, +id, d), AUTH],
    ['^/admin/revision/todo$', postMarcarTodo, ADMIN],
    [`^/admin/revision/(servicio|perfil|curriculum)/${N}/revisada$`, (c, t, id) => postMarcarRevisada(c, t, +id), ADMIN],
    [`^/admin/revision/servicio/${N}/ocultar$`, (c, id, d) => postOcultarServicio(c, +id, d), ADMIN],
    [`^/admin/revision/servicio/${N}/publicar$`, (c, id, d) => postPublicarServicioAdmin(c, +id, d), ADMIN],
    [`^/admin/revision/servicio/${N}/desestimar$`, (c, id, d) => postDesestimarServicio(c, +id, d), ADMIN],
    [`^/admin/revision/cv/${N}/ocultar$`, (c, id, d) => postOcultarCvRevision(c, +id, d), ADMIN],
    [`^/admin/revision/cv/${N}/publicar$`, (c, id, d) => postPublicarCvRevision(c, +id, d), ADMIN],
    [`^/admin/revision/cv/${N}/desestimar$`, (c, id, d) => postDesestimarCv(c, +id, d), ADMIN],
    [`^/admin/perfiles/${N}/bloquear$`, (c, id, d) => postBloquearPerfil(c, +id, d), ADMIN],
    [`^/admin/perfiles/${N}/desbloquear$`, (c, id) => postDesbloquearPerfil(c, +id), ADMIN],
    [`^/admin/usuarios/${N}/bloquear$`, (c, id, d) => postBloquearUsuario(c, +id, d), ADMIN],
    [`^/admin/usuarios/${N}/desbloquear$`, (c, id) => postDesbloquearUsuario(c, +id), ADMIN],
    [`^/admin/usuarios/${N}/reenviar$`, (c, id) => postReenviarAdmin(c, +id), ADMIN],
    [`^/admin/cv/${N}/ocultar$`, (c, id, d) => postOcultarCvPanel(c, +id, d), ADMIN],
    [`^/admin/cv/${N}/reactivar$`, (c, id) => postReactivarCvPanel(c, +id), ADMIN],
    [`^/admin/resenas/${N}$`, (c, id, d) => postModeracion(c, +id, d), ADMIN],
    ['^/admin/categorias/agregar$', postAgregarCategoria, ADMIN],
    [`^/admin/categorias/${N}$`, (c, id, d) => postEditarCategoria(c, +id, d), ADMIN],
    [`^/admin/categorias/${N}/mover$`, (c, id, d) => postMoverCategoria(c, +id, d), ADMIN],
    ['^/admin/palabras$', postPalabras, ADMIN],
    [`^/admin/palabras/${N}/eliminar$`, (c, id) => postEliminarPalabra(c, +id), ADMIN],
    ['^/admin/tarifas$', postTarifasAdmin, ADMIN],
    [`^/opiniones/${N}/reportar$`, (c, id, d) => postReportarOpinion(c, +id, d), AUTH],
    [`^/${SLUG}/opinar$`, (c, s, d) => postOpinar(c, s, d), AUTH],
    [`^/${SLUG}/${N}/reportar$`, (c, s, id, d) => postReportarPublicacion(c, s, +id, d), AUTH],
    [`^/curriculum/${N}/reportar$`, (c, id, d) => postReportarCv(c, +id, d), AUTH]
].map(([p, f, o]) => [new RegExp(p), f, o || {}]);

const RUTAS_GET = GET.map(([p, f, o]) => [new RegExp(p), f, o || {}]);

// ---------- La dirección: todo va después del #, para que el archivo funcione abierto desde el disco ----------

function leerDireccion() {
    let h = location.hash.slice(1);
    if (!h.startsWith('/')) h = '/';
    const i = h.indexOf('#', 1);
    const fragmento = i >= 0 ? h.slice(i + 1) : '';
    if (i >= 0) h = h.slice(0, i);
    const q = h.indexOf('?');
    const ruta = decodeURIComponent((q >= 0 ? h.slice(0, q) : h) || '/').replace(/\/+$/, '') || '/';
    const consulta = q >= 0 ? h.slice(q + 1) : '';
    return { ruta, consulta, fragmento };
}

let flash = {};
let anterior = null;
let navegando = false;
const scrolls = new Map();

function ir(url, reemplazar = false) {
    scrolls.set(location.hash, window.scrollY);
    navegando = true;
    const destinoHash = '#' + url;
    if (location.hash === destinoHash) {
        dibujar();
        return;
    }
    if (reemplazar) {
        history.replaceState(null, '', destinoHash);
        dibujar();
    } else {
        location.hash = destinoHash;
    }
}

function contexto() {
    const { ruta, consulta, fragmento } = leerDireccion();
    let usuario = db.sesion ? usuarioDe(db.sesion) : null;
    if (usuario && usuario.estado !== 'Activo') {
        db.sesion = null;
        usuario = null;
        guardar();
    }
    const f = flash;
    flash = {};
    return { ruta, query: new URLSearchParams(consulta), aqui: ruta + (consulta ? '?' + consulta : ''), fragmento, usuario, flash: f, anterior };
}

// Una redirección después de un GET reemplaza la entrada del historial; después de un POST, como en el
// navegador, queda una entrada nueva y "Atrás" vuelve al formulario.
function aplicar(resultado, ctx, reemplazar = true) {
    if (resultado && resultado.redirect) {
        flash = { ...(resultado.flash || {}) };
        if (resultado.aviso) flash.aviso = resultado.aviso;
        if (resultado.alerta) flash.alerta = resultado.alerta;
        ir(resultado.redirect, reemplazar);
        return true;
    }
    pintar(ctx, resultado || pEstado());
    return false;
}

function buscarRuta(tabla, ruta) {
    for (const [re, f, o] of tabla) {
        const m = re.exec(ruta);
        if (m) return { f, o, params: m.slice(1) };
    }
    return null;
}

function permitido(ctx, o) {
    if (o.auth && !ctx.usuario) return { redirect: conVolver('/ingresar', ctx.aqui) };
    if (o.admin && !ctx.usuario.admin) return pEstado();
    return null;
}

function dibujar() {
    if (!puertaAbierta()) {
        pintarPuerta();
        return;
    }
    const ctx = contexto();
    const r = buscarRuta(RUTAS_GET, ctx.ruta);
    if (!r) {
        pintar(ctx, pEstado());
        return;
    }
    const bloqueo = permitido(ctx, r.o);
    if (bloqueo) {
        aplicar(bloqueo, ctx);
        return;
    }
    const params = ctx.ruta.startsWith('/servicios') || ctx.ruta.startsWith('/profesionales') ? [] : r.params;
    const resultado = r.f(ctx, ...params);
    guardar();
    aplicar(resultado, ctx);
}

async function enviar(form, submitter) {
    const accion = form.getAttribute('action') || leerDireccion().ruta;
    const url = new URL(accion, 'http://demo');
    const ctx = contexto();
    ctx.ruta = url.pathname;
    const r = buscarRuta(POST, url.pathname);
    if (!r) {
        pintar(ctx, pEstado());
        return;
    }
    const bloqueo = permitido(ctx, r.o);
    if (bloqueo) {
        aplicar(bloqueo, ctx);
        return;
    }
    const datos = leerFormulario(form, submitter);
    const resultado = await r.f(ctx, ...r.params, datos);
    guardar();
    const redirigio = aplicar(resultado, ctx, false);
    if (!redirigio) {
        const error = document.querySelector('.field-validation-error, .validation-summary-errors, .campo__error[role="alert"]');
        if (error) error.closest('.campo, .formulario__resumen, fieldset')?.scrollIntoView({ block: 'center' });
        else window.scrollTo(0, 0);
    }
}

// ---------- Pintar una página ----------

function pintar(ctx, pagina) {
    anterior = ctx.aqui;
    document.title = pagina.titulo ? `${pagina.titulo} | ${SITIO.nombre}` : SITIO.nombre;
    document.body.className = pagina.enfocado ? 'pagina-enfocada' : '';
    document.body.innerHTML = String(marco(ctx, pagina)) + String(panelDemo());
    reescribirEnlaces(document.body);
    mejorar();
    const fragmento = ctx.fragmento;
    if (navegando) {
        navegando = false;
        const objetivo = fragmento && document.getElementById(fragmento);
        if (objetivo) objetivo.scrollIntoView();
        else window.scrollTo(0, 0);
    } else {
        const y = scrolls.get(location.hash);
        if (y !== undefined) window.scrollTo(0, y);
        else if (fragmento && document.getElementById(fragmento)) document.getElementById(fragmento).scrollIntoView();
        else window.scrollTo(0, 0);
    }
    actualizarInsigniaCorreos();
}

// Los enlaces del sitio son rutas ("/buscar"); en la demo van después del #.
function reescribirEnlaces(raiz) {
    for (const a of raiz.querySelectorAll('a[href^="/"]')) {
        a.setAttribute('href', '#' + a.getAttribute('href'));
    }
}

// ---------- Clics y envíos ----------

document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (href.startsWith('#/')) {
        e.preventDefault();
        ir(href.slice(1));
        return;
    }
    if (href.startsWith('#') && href.length > 1) {
        // Un ancla de la misma página: #filtros abre el panel de filtros (en el sitio, con :target).
        e.preventDefault();
        const id = href.slice(1);
        const el = document.getElementById(id);
        for (const abierto of document.querySelectorAll('.es-objetivo')) abierto.classList.remove('es-objetivo');
        if (el) {
            if (el.classList.contains('filtros')) el.classList.add('es-objetivo');
            if (id === 'contenido') {
                el.setAttribute('tabindex', '-1');
                el.focus();
            }
            el.scrollIntoView();
        }
    }
});

document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || form.closest('[data-demo], [data-puerta]')) return;
    if (!puertaAbierta()) {
        e.preventDefault();
        return;
    }
    e.preventDefault();
    if (form.dataset.enviando === 'si' && form.hasAttribute('data-envio-unico')) return;
    const metodo = (form.getAttribute('method') || 'get').toLowerCase();
    if (metodo === 'get') {
        const accion = form.getAttribute('action') || leerDireccion().ruta;
        const ruta = accion.replace(/^#/, '');
        const params = new URLSearchParams();
        for (const [k, v] of new FormData(form)) if (typeof v === 'string' && v !== '') params.append(k, v);
        const qs = params.toString();
        ir(qs ? `${ruta}?${qs}` : ruta);
        return;
    }
    if (form.hasAttribute('data-envio-unico')) form.dataset.enviando = 'si';
    enviar(form, e.submitter).catch((error) => {
        console.error(error);
        delete form.dataset.enviando;
    });
}, true);

window.addEventListener('hashchange', dibujar);

// ---------- Lo que hacen los scripts del sitio (site.js, cuenta.js, busqueda.js, servicios.js, opiniones.js, curriculum.js) ----------

function scriptsGlobales() {
    document.addEventListener('click', (evento) => {
        const objetivo = evento.target;
        const abrir = objetivo.closest('[data-menu-abrir]');
        if (abrir) {
            document.getElementById(abrir.getAttribute('aria-controls'))?.showModal();
            return;
        }
        if (objetivo.closest('[data-menu-cerrar]')) {
            objetivo.closest('dialog')?.close();
            return;
        }
        if (objetivo instanceof HTMLDialogElement && objetivo.id === 'menu-sitio') objetivo.close();
        for (const cuenta of document.querySelectorAll('details.cuenta[open]')) {
            if (!cuenta.contains(objetivo)) cuenta.open = false;
        }
        // Un enlace del menú cierra el menú antes de navegar.
        if (objetivo.closest('#menu-sitio a')) document.getElementById('menu-sitio')?.close();
    });
    document.addEventListener('keydown', (evento) => {
        if (evento.key !== 'Escape') return;
        for (const cuenta of document.querySelectorAll('details.cuenta[open]')) {
            cuenta.open = false;
            cuenta.querySelector('summary')?.focus();
        }
        const panel = document.querySelector('.demo-panel:not([hidden])');
        if (panel) cerrarPanelDemo();
    });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', (evento) => {
        if (evento.matches) document.getElementById('menu-sitio')?.close();
    });
}

function mejorar() {
    // site.js: contadores de caracteres.
    for (const contador of document.querySelectorAll('[data-contador-de]')) {
        const campo = document.getElementById(contador.dataset.contadorDe);
        if (!campo || !campo.maxLength || campo.maxLength < 0) continue;
        const actualizar = () => { contador.textContent = `${campo.value.length} / ${campo.maxLength}`; };
        campo.addEventListener('input', actualizar);
        actualizar();
    }

    // busqueda.js: el buscador del índice de categorías.
    const buscador = document.querySelector('[data-buscador-indice]');
    const campoIndice = document.querySelector('[data-buscar-indice]');
    if (buscador && campoIndice) {
        const vacio = document.querySelector('[data-indice-vacio]');
        buscador.hidden = false;
        campoIndice.addEventListener('input', () => {
            const consulta = sinTildes(campoIndice.value);
            let hay = false;
            for (const grupo of document.querySelectorAll('[data-grupo-indice]')) {
                let enGrupo = false;
                for (const rubro of grupo.querySelectorAll('[data-rubro-indice]')) {
                    const titulo = rubro.querySelector('[data-texto]');
                    const rubroCoincide = consulta === '' || sinTildes(titulo.dataset.texto).includes(consulta);
                    let enRubro = rubroCoincide;
                    for (const categoria of rubro.querySelectorAll('li[data-texto]')) {
                        const coincide = rubroCoincide || sinTildes(categoria.dataset.texto).includes(consulta);
                        categoria.hidden = !coincide;
                        enRubro ||= coincide;
                    }
                    rubro.hidden = !enRubro;
                    enGrupo ||= enRubro;
                }
                grupo.hidden = !enGrupo;
                hay ||= enGrupo;
            }
            vacio.hidden = hay;
        });
    }

    // cuenta.js: requisitos de la contraseña, mostrar u ocultar, aceptar términos y la foto de perfil.
    for (const listaReq of document.querySelectorAll('[data-requisitos]')) {
        const campo = document.getElementById(listaReq.dataset.requisitos);
        if (!campo) continue;
        const actualizar = () => {
            for (const item of listaReq.querySelectorAll('[data-regla]')) {
                const regla = REGLAS_CLAVE.find((r) => r[0] === item.dataset.regla);
                const cumple = regla[2](campo.value);
                item.classList.toggle('cumple', cumple);
                const estado = item.querySelector('[data-estado]');
                if (estado) estado.textContent = cumple ? 'Cumplido: ' : 'Falta: ';
            }
        };
        campo.addEventListener('input', actualizar);
        actualizar();
    }
    for (const boton of document.querySelectorAll('[data-mostrar]')) {
        const campo = document.getElementById(boton.dataset.mostrar);
        if (!campo) continue;
        boton.hidden = false;
        boton.addEventListener('click', () => {
            const mostrar = campo.type === 'password';
            campo.type = mostrar ? 'text' : 'password';
            boton.textContent = mostrar ? 'Ocultar' : 'Mostrar';
            boton.setAttribute('aria-pressed', String(mostrar));
            campo.focus();
        });
    }
    for (const casilla of document.querySelectorAll('[data-habilita]')) {
        const boton = document.getElementById(casilla.dataset.habilita);
        const ayuda = document.querySelector(`[data-ayuda-de="${casilla.dataset.habilita}"]`);
        if (!boton) continue;
        if (ayuda) {
            ayuda.id ||= `${boton.id}-ayuda`;
            boton.setAttribute('aria-describedby', ayuda.id);
        }
        const actualizar = () => {
            boton.disabled = !casilla.checked;
            if (ayuda) ayuda.hidden = casilla.checked;
        };
        casilla.addEventListener('change', actualizar);
        actualizar();
    }
    for (const campo of document.querySelectorAll('[data-foto]')) {
        const maximo = Number(campo.dataset.fotoMaximo);
        const vista = document.querySelector('[data-foto-vista]');
        const error = document.querySelector('[data-foto-error]');
        const mostrarError = (mensaje) => {
            if (!error) return;
            error.textContent = mensaje;
            error.classList.toggle('field-validation-valid', mensaje === '');
            error.classList.toggle('field-validation-error', mensaje !== '');
        };
        campo.addEventListener('change', () => {
            const archivo = campo.files?.[0];
            if (!archivo) return;
            if (maximo && archivo.size > maximo) {
                const megas = (archivo.size / 1024 / 1024).toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                mostrarError(`La foto pesa ${megas} MB y el máximo es 5 MB. Probá con una más liviana.`);
                campo.value = '';
                return;
            }
            mostrarError('');
            if (vista) {
                const imagen = document.createElement('img');
                imagen.className = 'avatar avatar--perfil avatar--foto';
                imagen.alt = 'Vista previa de tu foto';
                imagen.src = URL.createObjectURL(archivo);
                vista.replaceChildren(imagen);
            }
        });
    }

    // curriculum.js: en escritorio, la zona se aplica al elegirla.
    const filtrosCv = document.querySelector('[data-filtros-cv]');
    if (filtrosCv) {
        const escritorio = window.matchMedia('(min-width: 1100px)');
        filtrosCv.dataset.js = '';
        for (const l of filtrosCv.querySelectorAll('[data-enviar-al-cambiar]')) {
            l.addEventListener('change', () => { if (escritorio.matches) filtrosCv.requestSubmit(); });
        }
    }

    // opiniones.js: mínimo del comentario, «Otro» obligatorio y cancelar una respuesta.
    for (const ayuda of document.querySelectorAll('[data-minimo-de]')) {
        const campo = document.getElementById(ayuda.dataset.minimoDe);
        const minimo = Number(ayuda.dataset.minimo);
        if (!campo || !minimo) continue;
        const inicial = ayuda.textContent;
        const actualizar = () => {
            const largo = campo.value.trim().length;
            const faltan = minimo - largo;
            ayuda.classList.toggle('campo__ayuda--falta', largo > 0 && faltan > 0);
            ayuda.textContent = largo === 0 ? inicial : faltan > 1 ? `Contá un poco más: faltan ${faltan} caracteres.` : faltan === 1 ? 'Contá un poco más: falta 1 carácter.' : '';
        };
        campo.addEventListener('input', actualizar);
        actualizar();
    }
    for (const formulario of document.querySelectorAll('[data-reporte]')) {
        const comentario = formulario.querySelector('textarea');
        const actualizar = () => {
            const otro = formulario.querySelector('[data-motivo-otro]:checked') !== null;
            comentario?.setAttribute('aria-required', otro ? 'true' : 'false');
        };
        formulario.addEventListener('change', actualizar);
        actualizar();
    }
    for (const boton of document.querySelectorAll('[data-cerrar-detalles]')) {
        boton.hidden = false;
        boton.addEventListener('click', () => {
            const detalles = boton.closest('details');
            if (detalles) {
                detalles.open = false;
                detalles.querySelector('summary')?.focus();
            }
        });
    }

    mejorarServicios();

    // La demo: completar el ingreso y abrir los correos desde las notas.
    for (const b of document.querySelectorAll('[data-completar-ingreso]')) {
        b.addEventListener('click', () => {
            const correo = document.getElementById('Correo');
            const clave = document.getElementById('Contrasena');
            if (correo) correo.value = b.dataset.completarIngreso;
            if (clave) clave.value = CLAVE_DEMO;
            clave?.focus();
        });
    }
    for (const b of document.querySelectorAll('[data-abrir-correos]')) b.addEventListener('click', () => abrirPanelDemo('correos'));
}

function mejorarServicios() {
    const tiposPersona = [...document.querySelectorAll('[data-tipo-persona]')];
    if (tiposPersona.length > 0) {
        const actualizar = () => {
            const empresa = tiposPersona.find((t) => t.checked)?.value === 'Empresa';
            for (const el of document.querySelectorAll('[data-solo-empresa]')) el.hidden = !empresa;
            for (const el of document.querySelectorAll('[data-solo-persona]')) el.hidden = empresa;
        };
        for (const t of tiposPersona) t.addEventListener('change', actualizar);
        actualizar();
    }

    const enLocal = document.querySelector('[data-modalidad="EnLocal"]');
    const direccionOpcional = document.querySelector('[data-direccion-opcional]');
    if (enLocal && direccionOpcional) {
        const actualizar = () => { direccionOpcional.textContent = enLocal.checked ? '' : '(si atendés en local)'; };
        enLocal.addEventListener('change', actualizar);
        actualizar();
    }

    const seccion = document.querySelector('[data-categorias]');
    if (seccion) {
        const maximo = Number(seccion.dataset.maximo);
        const otras = new Set(seccion.dataset.otras.split(',').filter(Boolean));
        const casillas = [...seccion.querySelectorAll('input[name="CategoriaIds"]')];
        const contador = seccion.querySelector('[data-contador-categorias]');
        const elegidas = seccion.querySelector('[data-elegidas]');
        const campoMatricula = seccion.querySelector('[data-campo-matricula]');
        const ayudaMatricula = seccion.querySelector('[data-ayuda-matricula]');
        const unir = (partes) => (partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`);
        const dibujarElegidas = (marcadas) => {
            for (const item of elegidas.querySelectorAll('[data-elegida]')) item.remove();
            const antesDe = elegidas.firstElementChild;
            for (const casilla of marcadas) {
                const item = document.createElement('li');
                item.className = 'categoria-elegida';
                item.dataset.elegida = casilla.value;
                const nombre = document.createElement('span');
                nombre.className = 'categoria-elegida__nombre';
                nombre.textContent = casilla.dataset.nombre;
                const ruta = document.createElement('span');
                ruta.className = 'categoria-elegida__ruta';
                ruta.textContent = casilla.dataset.ruta;
                const quitar = document.createElement('button');
                quitar.type = 'button';
                quitar.className = 'categoria-elegida__quitar';
                quitar.setAttribute('aria-label', `Quitar ${casilla.dataset.nombre}`);
                quitar.textContent = '×';
                quitar.addEventListener('click', () => {
                    casilla.checked = false;
                    actualizar();
                    casilla.closest('[data-grupo]')?.setAttribute('open', '');
                    casilla.focus();
                });
                item.append(nombre, ruta, quitar);
                elegidas.insertBefore(item, antesDe);
            }
            const ids = new Set(marcadas.map((c) => c.value));
            for (const item of elegidas.querySelectorAll('[data-otra]')) item.hidden = ids.has(item.dataset.otra);
        };
        const actualizar = () => {
            const marcadas = casillas.filter((c) => c.checked);
            const enUso = new Set([...otras, ...marcadas.map((c) => c.value)]).size;
            contador.textContent = `${enUso} de ${maximo} usadas`;
            for (const casilla of casillas) {
                const bloqueada = !casilla.checked && enUso >= maximo && !otras.has(casilla.value);
                casilla.disabled = bloqueada;
                casilla.closest('[data-opcion]')?.classList.toggle('opcion-categoria--bloqueada', bloqueada);
            }
            for (const grupo of seccion.querySelectorAll('[data-grupo]')) {
                const cuenta = grupo.querySelectorAll('input[name="CategoriaIds"]:checked').length;
                grupo.querySelector('[data-cuenta-grupo]').textContent = cuenta === 0 ? '' : cuenta === 1 ? '1 elegida' : `${cuenta} elegidas`;
            }
            const reguladas = marcadas.filter((c) => c.dataset.matricula === 'si').map((c) => c.dataset.nombre);
            if (campoMatricula) campoMatricula.hidden = reguladas.length === 0;
            if (campoMatricula && reguladas.length > 0) {
                ayudaMatricula.textContent = `${unir(reguladas)} ${reguladas.length === 1 ? 'es una actividad regulada' : 'son actividades reguladas'}. Se muestra como «Matrícula declarada»: Red Nexa no la verifica.`;
            }
            dibujarElegidas(marcadas);
        };
        for (const casilla of casillas) casilla.addEventListener('change', actualizar);
        actualizar();
        const buscadorCat = seccion.querySelector('[data-buscador]');
        const campoBuscar = seccion.querySelector('[data-buscar-categoria]');
        const sinResultados = seccion.querySelector('[data-sin-resultados]');
        if (buscadorCat && campoBuscar) {
            buscadorCat.hidden = false;
            campoBuscar.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
            campoBuscar.addEventListener('input', () => {
                const consulta = sinTildes(campoBuscar.value);
                let hay = false;
                for (const grupo of seccion.querySelectorAll('[data-grupo]')) {
                    let enGrupo = false;
                    for (const opcion of grupo.querySelectorAll('[data-opcion]')) {
                        const coincide = consulta === '' || sinTildes(opcion.dataset.texto).includes(consulta);
                        opcion.hidden = !coincide;
                        enGrupo ||= coincide;
                    }
                    grupo.hidden = !enGrupo;
                    if (consulta !== '') grupo.open = enGrupo;
                    hay ||= enGrupo;
                }
                sinResultados.hidden = hay;
            });
        }
    }

    const campoFotos = document.querySelector('[data-fotos]');
    if (campoFotos) {
        const maximo = Number(campoFotos.dataset.maximo);
        const lugares = Number(campoFotos.dataset.lugares);
        const elegidasFotos = document.querySelector('[data-fotos-elegidas]');
        const subir = document.querySelector('[data-subir-fotos]');
        const tipos = ['image/jpeg', 'image/png', 'image/webp'];
        const megas = (b) => (b / 1024 / 1024).toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        if (subir) subir.hidden = true;
        campoFotos.addEventListener('change', () => {
            const validas = new DataTransfer();
            elegidasFotos.replaceChildren();
            for (const archivo of campoFotos.files) {
                let motivo = '';
                if (!tipos.includes(archivo.type)) motivo = 'Sólo se admiten JPG, PNG o WEBP.';
                else if (archivo.size > maximo) motivo = 'Pesa más de 5 MB. Probá reducirla o sacarla con menos calidad.';
                else if (validas.items.length >= lugares) motivo = `Ya no hay lugar: entran ${lugares === 1 ? 'una más' : `${lugares} más`}.`;
                else validas.items.add(archivo);
                const item = document.createElement('li');
                item.className = motivo ? 'foto-elegida foto-elegida--rechazada' : 'foto-elegida';
                const nombre = document.createElement('span');
                nombre.className = 'foto-elegida__archivo';
                nombre.textContent = `${archivo.name} (${megas(archivo.size)} MB)`;
                item.append(nombre);
                if (motivo) {
                    const error = document.createElement('span');
                    error.className = 'campo__error';
                    error.textContent = motivo;
                    item.append(error);
                }
                elegidasFotos.append(item);
            }
            campoFotos.files = validas.files;
            if (subir) {
                subir.hidden = validas.items.length === 0;
                subir.textContent = validas.items.length === 1 ? 'Subir la foto' : `Subir las ${validas.items.length} fotos`;
            }
        });
    }
}

// ---------- El panel de la demo ----------

let panelAbierto = null;
let correoAbierto = null;

const CUENTAS_DEMO = [
    [null, 'Sin sesión', 'Como cualquier visitante'],
    ['maria.gonzalez@example.com', 'María González', 'Usuaria: opina y reporta'],
    ['juan.perez@example.com', 'Juan Pérez', 'Proveedor: servicios y cuota'],
    ['admin@example.com', 'Equipo Red Nexa', 'Administración']
];

function panelDemo() {
    const yo = db.sesion ? usuarioDe(db.sesion) : null;
    const sinLeer = db.correos.filter((c) => !c.leido).length;
    let contenido = '';
    if (panelAbierto === 'correos') {
        const correo = correoAbierto ? db.correos.find((c) => c.id === correoAbierto) : null;
        contenido = correo ? html`
            <button type="button" class="demo-panel__volver" data-demo-accion="correos">‹ Todos los correos</button>
            <article class="demo-correo">
                <p class="demo-correo__meta">Para ${correo.para} · ${F.fechaCorta(correo.fecha)} ${F.hora(correo.fecha).slice(6)}</p>
                <h3 class="demo-correo__asunto">${correo.asunto}</h3>
                <p>Hola ${correo.nombre},</p>
                <p>${correo.texto}</p>
                ${correo.enlace ? html`<p><a class="boton boton--primario" href="#${correo.enlace}" data-demo-cerrar>${correo.boton}</a></p>` : ''}
                ${correo.pie ? html`<p class="demo-correo__pie">${correo.pie}</p>` : ''}
            </article>` : html`
            <h2 class="demo-panel__titulo">Correos de la demo</h2>
            <p class="demo-panel__texto">El sitio manda estos correos; en la demo quedan acá, con sus enlaces funcionando.</p>
            ${db.correos.length === 0 ? html`<p class="demo-panel__vacio">Todavía no salió ninguno. Probá crear una cuenta, recuperar la contraseña o escribir una opinión.</p>`
                : html`<ul class="demo-correos">${db.correos.slice(0, 40).map((c) => html`<li><button type="button" class="demo-correos__item${c.leido ? '' : ' demo-correos__item--nuevo'}" data-demo-correo="${c.id}">
                    <span class="demo-correos__asunto">${c.asunto}</span>
                    <span class="demo-correos__para">${c.para} · ${F.hace(c.fecha).toLowerCase()}</span>
                </button></li>`)}</ul>`}
            <button type="button" class="demo-panel__volver" data-demo-accion="inicio">‹ Volver al panel</button>`;
    } else if (panelAbierto) {
        contenido = html`
            <h2 class="demo-panel__titulo">Demo de Red Nexa</h2>
            <p class="demo-panel__texto">Es el sitio completo funcionando en este archivo. Lo que hagas queda guardado en este navegador.</p>
            <h3 class="demo-panel__subtitulo">Ver el sitio como</h3>
            <ul class="demo-cuentas">${CUENTAS_DEMO.map(([correo, nombre, detalle]) => {
                const actual = correo === null ? !yo : yo && yo.correo === correo;
                return html`<li><button type="button" class="demo-cuentas__item"${attr('aria-pressed', actual ? 'true' : 'false')} data-demo-entrar="${correo ?? ''}">
                    <span class="demo-cuentas__nombre">${nombre}</span><span class="demo-cuentas__detalle">${detalle}</span>
                </button></li>`;
            })}</ul>
            ${yo && !CUENTAS_DEMO.some(([c]) => c === yo.correo) ? html`<p class="demo-panel__texto">Ahora: <strong>${nombreCompleto(yo)}</strong> (${yo.correo}).</p>` : ''}
            <p class="demo-panel__texto">Para ingresar a mano, la contraseña de esas cuentas es <strong>${CLAVE_DEMO}</strong>.</p>
            <button type="button" class="demo-panel__boton" data-demo-accion="correos">Correos de la demo${sinLeer ? ` (${sinLeer} sin leer)` : ''}</button>
            <button type="button" class="demo-panel__boton demo-panel__boton--suave" data-demo-accion="reiniciar">Volver a empezar la demo</button>
            <p class="demo-panel__texto demo-panel__texto--chico">Volver a empezar borra lo que cambiaste y carga los datos de ejemplo de nuevo.</p>`;
    }
    return html`
    <div class="demo" data-demo>
        <button type="button" class="demo-boton" data-demo-accion="abrir" aria-expanded="${panelAbierto ? 'true' : 'false'}" aria-controls="demo-panel">
            Demo${sinLeer ? html`<span class="demo-boton__cuenta" data-insignia-correos>${sinLeer}</span>` : html`<span class="demo-boton__cuenta" data-insignia-correos hidden></span>`}
        </button>
        <section id="demo-panel" class="demo-panel" aria-label="Panel de la demo"${bool('hidden', !panelAbierto)}>
            <button type="button" class="demo-panel__cerrar" data-demo-accion="cerrar" aria-label="Cerrar el panel de la demo">×</button>
            ${contenido}
        </section>
    </div>`;
}

function refrescarPanel() {
    const viejo = document.querySelector('[data-demo]');
    if (!viejo) return;
    const plantilla = document.createElement('template');
    plantilla.innerHTML = String(panelDemo());
    const nuevo = plantilla.content.firstElementChild;
    viejo.replaceWith(nuevo);
    reescribirEnlaces(nuevo);
}

function abrirPanelDemo(que = 'inicio') {
    panelAbierto = que;
    correoAbierto = null;
    refrescarPanel();
    document.querySelector('.demo-panel__titulo, .demo-panel__volver')?.focus?.();
}

function cerrarPanelDemo() {
    panelAbierto = null;
    correoAbierto = null;
    refrescarPanel();
    document.querySelector('.demo-boton')?.focus();
}

function actualizarInsigniaCorreos() {
    const sinLeer = db.correos.filter((c) => !c.leido).length;
    const insignia = document.querySelector('[data-insignia-correos]');
    if (insignia) {
        insignia.hidden = sinLeer === 0;
        insignia.textContent = sinLeer;
    }
}

document.addEventListener('click', (e) => {
    const zona = e.target.closest('[data-demo]');
    if (!zona) {
        if (panelAbierto && !e.target.closest('dialog')) cerrarPanelDemo();
        return;
    }
    const accion = e.target.closest('[data-demo-accion]')?.dataset.demoAccion;
    const entrar = e.target.closest('[data-demo-entrar]');
    const correo = e.target.closest('[data-demo-correo]');
    if (e.target.closest('[data-demo-cerrar]')) {
        panelAbierto = null;
        correoAbierto = null;
        return;
    }
    if (accion === 'abrir') panelAbierto ? cerrarPanelDemo() : abrirPanelDemo('inicio');
    else if (accion === 'cerrar') cerrarPanelDemo();
    else if (accion === 'inicio') abrirPanelDemo('inicio');
    else if (accion === 'correos') abrirPanelDemo('correos');
    else if (accion === 'reiniciar') {
        if (confirm('¿Volver a empezar la demo? Se borra lo que cambiaste.')) {
            reiniciarBase();
            panelAbierto = null;
            ir('/', true);
        }
    } else if (entrar) {
        const correoEntrar = entrar.dataset.demoEntrar;
        const u = correoEntrar ? db.usuarios.find((x) => x.correo === correoEntrar) : null;
        if (u && u.estado !== 'Activo') {
            alert('Esa cuenta está bloqueada o eliminada en esta demo. Volvé a empezar la demo para recuperarla.');
            return;
        }
        db.sesion = u ? u.id : null;
        if (u) u.ultimoAcceso = ahora();
        guardar();
        panelAbierto = null;
        ir(u ? (u.admin ? '/admin' : u.correo.startsWith('juan') ? '/mi-perfil/servicios' : '/') : '/');
    } else if (correo) {
        const c = db.correos.find((x) => x.id === Number(correo.dataset.demoCorreo));
        if (c) {
            c.leido = true;
            guardar();
            panelAbierto = 'correos';
            correoAbierto = c.id;
            refrescarPanel();
            actualizarInsigniaCorreos();
        }
    }
});

// ---------- Arranque ----------

cargarBase();
scriptsGlobales();
if (!location.hash.startsWith('#/')) history.replaceState(null, '', '#/');
navegando = true;
dibujar();
