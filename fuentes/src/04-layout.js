// ===================== Marco del sitio: _Layout, encabezado, menú y pie =====================

const RUTAS_ACCESO = ['/registrarse', '/ingresar', '/confirmar', '/recuperar', '/restablecer'];
const esDeAcceso = (ruta) => RUTAS_ACCESO.some((r) => ruta.toLowerCase().startsWith(r));
const esLocal = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');

function conVolver(ruta, volver) {
    return !volver || volver === '/' ? ruta : `${ruta}?volver=${encodeURIComponent(volver)}`;
}

function avatar(u, grande = false) {
    const clase = grande ? 'avatar avatar--grande' : 'avatar';
    return u.foto
        ? html`<img class="${clase} avatar--foto" src="${u.foto}" alt="" />`
        : html`<span class="${clase}" aria-hidden="true">${F.iniciales(nombreCompleto(u))}</span>`;
}

function encabezado(ctx, pagina) {
    const u = ctx.usuario;
    const actual = (r) => attr('aria-current', ctx.ruta.startsWith(r) ? 'page' : null);
    const volver = esDeAcceso(ctx.ruta) ? null : ctx.aqui;
    const cuenta = u
        ? html`<details class="cuenta">
            <summary aria-label="Tu cuenta: ${nombreCompleto(u)}">
                ${avatar(u)}
                <span class="cuenta__nombre" aria-hidden="true">${nombreCompleto(u)}</span>
                ${icono('desplegar')}
            </summary>
            <div class="cuenta__panel">
                <a href="/mi-cuenta">Mi cuenta</a>
                ${u.admin ? html`<a href="/admin">Administración</a>` : ''}
                <form method="post" action="/salir">
                    <button type="submit">Cerrar sesión</button>
                </form>
            </div>
        </details>`
        : html`<div class="encabezado__acciones">
            <a class="encabezado__ingresar" href="${conVolver('/ingresar', volver)}">Ingresar</a>
            <a class="boton boton--contorno-claro encabezado__publicar" href="/registrarse">Publicar mi servicio</a>
        </div>`;

    return html`
    <header class="encabezado">
        <div class="encabezado__barra">
            <a class="logo" href="/"><picture class="logo__marca"><source media="(min-width: 700px)" srcset="${LOGO_26}" width="25" height="26" /><img src="${LOGO}" alt="" width="22" height="24" /></picture>${SITIO.nombre}</a>
            ${pagina.administracion ? html`<span class="logo__etiqueta">Administración</span>` : ''}
            <nav class="encabezado__nav" aria-label="Principal">
                <a href="/categorias"${actual('/categorias')}>Categorías</a>
                <a href="/como-funciona"${actual('/como-funciona')}>Cómo funciona</a>
            </nav>
            ${cuenta}
            <button type="button" class="encabezado__menu" aria-haspopup="dialog" aria-controls="menu-sitio" data-menu-abrir>
                ${icono('menu')}
                <span class="sr-only">Abrir el menú</span>
            </button>
        </div>
    </header>`;
}

function menuSitio(ctx) {
    const u = ctx.usuario;
    const volver = esDeAcceso(ctx.ruta) ? null : ctx.aqui;
    return html`
    <dialog id="menu-sitio" class="menu" aria-label="Menú">
        <div class="menu__contenido">
            <div class="menu__cabecera">
                <a class="logo" href="/"><img class="logo__marca" src="${LOGO}" alt="" width="22" height="24" />${SITIO.nombre}</a>
                <button type="button" class="menu__cerrar" data-menu-cerrar autofocus>
                    ${icono('cerrar')}
                    <span class="sr-only">Cerrar el menú</span>
                </button>
            </div>
            ${u ? html`<div class="menu__usuario">${avatar(u, true)}<span class="menu__usuario-nombre">${nombreCompleto(u)}</span></div>` : ''}
            <nav class="menu__nav" aria-label="Principal">
                <a href="/categorias">Categorías${icono('siguiente')}</a>
                <a href="/como-funciona">Cómo funciona${icono('siguiente')}</a>
                ${u ? html`<a href="/mi-cuenta/menu">Mi cuenta${icono('siguiente')}</a>` : ''}
                ${u && u.admin ? html`<a href="/admin">Administración${icono('siguiente')}</a>` : ''}
            </nav>
            <div class="menu__acciones">
                ${u
                    ? html`<form method="post" action="/salir"><button type="submit" class="boton boton--contorno-claro boton--ancho">Cerrar sesión</button></form>`
                    : html`<a class="boton boton--blanco boton--ancho" href="${conVolver('/ingresar', volver)}">Ingresar</a>
                        <a class="boton boton--contorno-claro boton--ancho" href="/registrarse">Publicar mi servicio</a>
                        <p class="menu__registro">¿No tenés cuenta? <a href="/registrarse">Crear una cuenta gratis</a></p>`}
            </div>
            <div class="menu__pie">
                <a href="/contacto">Contacto</a>
                <a href="/terminos">Términos y Condiciones</a>
                <a href="/privacidad">Política de Privacidad</a>
                <p>${SITIO.correo}. ${SITIO.ubicacion}.</p>
            </div>
        </div>
    </dialog>`;
}

function pie(ctx) {
    const publicar = ctx.usuario ? '/ofrecer' : '/registrarse';
    return html`
    <footer class="pie">
        <div class="pie__interior">
            <div class="pie__principal">
                <div class="pie__marca">
                    <a class="logo" href="/"><img class="logo__marca" src="${LOGO}" alt="" width="22" height="24" />${SITIO.nombre}</a>
                    <p>La guía de servicios de Melo. Profesionales, oficios y personas que buscan trabajo.</p>
                </div>
                <nav class="pie__columnas" aria-label="Enlaces del sitio">
                    <div>
                        <h2 class="pie__titulo">Buscar</h2>
                        <ul>
                            <li><a href="/categorias">Categorías</a></li>
                            <li><a href="/curriculum">Curriculum</a></li>
                            <li><a href="/como-funciona">Cómo funciona</a></li>
                        </ul>
                    </div>
                    <div>
                        <h2 class="pie__titulo">Publicar</h2>
                        <ul>
                            <li><a href="${publicar}">Soy profesional</a></li>
                            <li><a href="${publicar}">Ofrezco un servicio</a></li>
                            <li><a href="/mi-curriculum">Publicar mi CV</a></li>
                        </ul>
                    </div>
                </nav>
            </div>
            <div class="pie__legal">
                <ul class="pie__enlaces">
                    <li><a href="/contacto">Contacto</a></li>
                    <li><a href="/terminos">Términos y Condiciones</a></li>
                    <li><a href="/privacidad">Política de Privacidad</a></li>
                </ul>
                <p class="pie__datos"><a href="mailto:${SITIO.correo}">${SITIO.correo}</a> <span>${SITIO.ubicacion}</span></p>
                <p class="pie__aviso">Red Nexa no acredita identidad, matrícula ni antecedentes de quienes publican.</p>
            </div>
        </div>
    </footer>`;
}

// La página completa. pagina: { titulo, cuerpo, enfocado, volver, volverTexto, barraDetalle, administracion }
function marco(ctx, pagina) {
    const enfocada = !!pagina.enfocado;
    const volver = esLocal(pagina.volver) ? pagina.volver : '/';
    return html`
    <a class="saltar" href="#contenido">Saltar al contenido</a>
    ${enfocada ? html`<nav class="barra-volver" aria-label="Volver">
        <a href="${volver}">${icono('volver')}${pagina.volverTexto || 'Volver'}</a>
        ${pagina.barraDetalle ? html`<span class="barra-volver__detalle">${pagina.barraDetalle}</span>` : ''}
    </nav>` : ''}
    ${encabezado(ctx, pagina)}
    ${menuSitio(ctx)}
    <main id="contenido">
        ${pagina.cuerpo}
    </main>
    ${enfocada ? '' : pie(ctx)}`;
}

// La nota que en Development dice dónde quedan los correos (_NotaCorreoDesarrollo).
const notaCorreos = () => html`<p class="nota-desarrollo">Demo: los correos no se envían. Abrilos desde <button type="button" class="boton-enlace" data-abrir-correos>Correos de la demo</button>.</p>`;

function aviso(flash) {
    return html`${flash.aviso ? html`<p class="aviso" role="status">${flash.aviso}</p>` : ''}${flash.alerta ? html`<p class="aviso aviso--alerta" role="alert">${flash.alerta}</p>` : ''}`;
}

// ---------- Mi cuenta: la columna lateral (MenuCuenta) ----------

function datosMenuCuenta(u) {
    const perfil = perfilDeUsuario(u.id);
    const cv = cvDeUsuario(u.id);
    return {
        nombre: nombreCompleto(u) || u.correo,
        correo: u.correo,
        cantidadResenas: db.resenas.filter((r) => r.usuarioId === u.id).length,
        estadoCv: cv ? cv.estado : null,
        estadoPerfil: perfil ? perfil.estado : null
    };
}

const textoEstadoPerfil = { Activo: 'Activo', Borrador: 'Borrador', Vencido: 'Vencido', Bloqueado: 'Bloqueado' };
const claseEstadoPerfil = (e) => (e === 'Activo' ? 'estado--ok' : e === 'Vencido' ? 'estado--aviso' : 'estado--apagado');
const claseEstadoCv = (e) => (e === 'Publicado' ? 'estado--ok' : e === 'Oculto' ? 'estado--error' : 'estado--apagado');

function menuCuenta(u, activo) {
    const m = datosMenuCuenta(u);
    const actual = (s) => attr('aria-current', activo === s ? 'page' : null);
    const esProveedor = m.estadoPerfil && m.estadoPerfil !== 'Eliminado';
    return html`
    <nav class="menu-cuenta" aria-label="Mi cuenta">
        <div class="menu-cuenta__grupo">
            <h2 class="menu-cuenta__titulo">Mi cuenta</h2>
            <a href="/mi-cuenta"${actual('/mi-cuenta')}>Datos personales</a>
            <a href="/mi-cuenta/contrasena"${actual('/mi-cuenta/contrasena')}>Cambiar contraseña</a>
            <a href="/mi-cuenta/resenas"${actual('/mi-cuenta/resenas')}>Mis reseñas escritas</a>
            <a href="/mi-curriculum"${actual('/mi-curriculum')}>Mi curriculum</a>
            <a href="/mi-cuenta/eliminar"${actual('/mi-cuenta/eliminar')}>Eliminar mi cuenta</a>
        </div>
        ${esProveedor ? html`
        <div class="menu-cuenta__grupo">
            <div class="menu-cuenta__cabecera">
                <h2 class="menu-cuenta__titulo">Mi perfil profesional</h2>
                <span class="estado ${claseEstadoPerfil(m.estadoPerfil)}">${textoEstadoPerfil[m.estadoPerfil]}</span>
            </div>
            <a href="/mi-perfil"${actual('/mi-perfil')}>Datos del perfil</a>
            <a href="/mi-perfil/servicios"${actual('/mi-perfil/servicios')}>Mis servicios</a>
            <a href="/mi-perfil/opiniones"${actual('/mi-perfil/opiniones')}>Reseñas recibidas</a>
            <a href="/mi-perfil/suscripcion"${actual('/mi-perfil/suscripcion')}>Mi suscripción</a>
        </div>` : html`
        <div class="menu-cuenta__ofrecer">
            <h2 class="menu-cuenta__ofrecer-titulo">¿Ofrecés un servicio?</h2>
            <p>Con la misma cuenta creás tu perfil de proveedor. Los primeros 30 días no se paga.</p>
            <a href="/ofrecer">Crear mi perfil de proveedor</a>
        </div>`}
    </nav>`;
}

// _LayoutCuenta: en celular cada sección es una pantalla propia, con "‹ Mi cuenta".
function paginaCuenta(ctx, titulo, seccion, cuerpo) {
    return {
        titulo,
        enfocado: true,
        volver: '/mi-cuenta/menu',
        volverTexto: 'Mi cuenta',
        cuerpo: html`
        <div class="cuenta-pagina">
            <aside class="cuenta-pagina__menu">${menuCuenta(ctx.usuario, seccion)}</aside>
            <div class="cuenta-pagina__contenido">
                ${aviso(ctx.flash)}
                ${cuerpo}
            </div>
        </div>`
    };
}

// ---------- Administración: _LayoutAdmin y MenuAdmin ----------

function resumenRevision() {
    return {
        sinRevisar: serviciosSinRevisar().length + perfilesSinRevisar().length + cvsSinRevisar().length,
        retenidas: db.servicios.filter((s) => s.estado === 'Oculto' && s.ocultoPorFiltro && perfilDe(s.perfilId).estado !== 'Eliminado').length
            + db.curriculums.filter((c) => c.estado === 'Oculto' && c.ocultoPorFiltro).length,
        reportadas: db.servicios.filter((s) => db.reportesPublicacion.some((r) => r.servicioId === s.id && r.estado === 'Pendiente')).length
            + db.curriculums.filter((c) => db.reportesPublicacion.some((r) => r.curriculumId === c.id && r.estado === 'Pendiente')).length
    };
}

function resumenModeracion() {
    const reportadas = db.resenas.filter((r) => r.estado === 'Reportada').length;
    const delFiltro = db.resenas.filter((r) => r.estado === 'Oculta' && r.ocultaPorFiltro).length;
    const ocultas = db.resenas.filter((r) => r.estado === 'Oculta' && !r.ocultaPorFiltro).length;
    return { reportadas, delFiltro, ocultas, porModerar: reportadas + delFiltro };
}

function menuAdmin(activo) {
    const r = resumenRevision();
    const m = resumenModeracion();
    const porRevisar = r.sinRevisar + r.reportadas + r.retenidas;
    const actual = (s) => attr('aria-current', activo === s ? 'page' : null);
    return html`
    <nav class="menu-admin" aria-label="Administración">
        <a href="/admin"${actual('/admin')}>Tablero</a>
        <a href="/admin/revision"${actual('/admin/revision')}>
            Revisión
            ${porRevisar > 0 ? html`<span class="menu-admin__cuenta">${porRevisar}<span class="sr-only"> para revisar</span></span>` : ''}
        </a>
        <a href="/admin/perfiles"${actual('/admin/perfiles')}>Perfiles</a>
        <a href="/admin/usuarios"${actual('/admin/usuarios')}>Usuarios</a>
        <a href="/admin/cv"${actual('/admin/cv')}>CV publicados</a>
        <a href="/admin/resenas"${actual('/admin/resenas')}>
            Reseñas
            ${m.porModerar > 0 ? html`<span class="menu-admin__cuenta">${m.porModerar}<span class="sr-only"> para moderar</span></span>` : ''}
        </a>
        <a href="/admin/categorias"${actual('/admin/categorias')}>Categorías</a>
        <a href="/admin/palabras"${actual('/admin/palabras')}>Palabras prohibidas</a>
        <a href="/admin/pagos"${actual('/admin/pagos')}>Suscripciones y pagos</a>
        <a href="/admin/destacados"${actual('/admin/destacados')}>Destacados</a>
        <a href="/admin/tarifas"${actual('/admin/tarifas')}>Tarifas y cupos</a>
        <a href="/admin/registro"${actual('/admin/registro')}>Registro de actividad</a>
        <a class="menu-admin__sitio" href="/">Ver el sitio público</a>
    </nav>`;
}

function paginaAdmin(ctx, titulo, seccion, cuerpo, extra = {}) {
    const tablero = seccion === '/admin';
    const ancho = tablero || seccion === '/admin/categorias';
    return {
        titulo,
        administracion: true,
        enfocado: true,
        volver: extra.volver ?? (tablero ? '/' : '/admin'),
        volverTexto: extra.volverTexto ?? (tablero ? 'Ver el sitio' : 'Tablero'),
        barraDetalle: 'Administración',
        cuerpo: html`
        <div class="admin${tablero ? ' admin--tablero' : ''}${ancho ? ' admin--ancho' : ''}">
            <aside class="admin__menu">${menuAdmin(seccion)}</aside>
            <div class="admin__contenido">
                ${aviso(ctx.flash)}
                ${cuerpo}
            </div>
        </div>`
    };
}
