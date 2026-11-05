// ===================== Acceso (A02 a A06) y Mi cuenta (U03 a U06) =====================

const REGLAS_CLAVE = [
    ['largo', '8 caracteres o más', (v) => v.length >= 8],
    ['mayuscula', 'Una mayúscula', (v) => /\p{Lu}/u.test(v)],
    ['numero', 'Un número', (v) => /\p{Nd}/u.test(v)],
    ['simbolo', 'Un símbolo', (v) => /[^\p{L}\p{Nd}]/u.test(v)]
];

const requisitos = (id) => html`<ul class="requisitos" id="requisitos-${id}" data-requisitos="${id}">
    ${REGLAS_CLAVE.map(([r, t]) => html`<li data-regla="${r}"><span class="sr-only" data-estado>Falta: </span>${t}</li>`)}
</ul>`;

// Los errores de Identity, en el orden en que los da (IdentityErrorDescriberEs).
function erroresDeClave(v) {
    const e = [];
    if (v.length < 8) e.push('La contraseña tiene que tener 8 caracteres o más.');
    if (!/[^\p{L}\p{Nd}]/u.test(v)) e.push('Agregá un símbolo a la contraseña, como ! o #.');
    if (!/\p{Nd}/u.test(v)) e.push('Agregá un número a la contraseña.');
    if (!/\p{Lu}/u.test(v)) e.push('Agregá una mayúscula a la contraseña.');
    return e;
}

const destino = (volver) => (esLocal(volver) && !esDeAcceso(volver) ? volver : '/');
const codigoNuevo = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

function campoClave(id, etiqueta, valorCampo, errores, autocomplete, conRequisitos = false) {
    return html`<div class="campo">
        <label class="campo__etiqueta" for="${id}">${etiqueta}</label>
        <div class="control-contrasena">
            <input class="control${conError(errores, id)}" type="password" id="${id}" name="${id}" autocomplete="${autocomplete}"${conRequisitos ? attr('aria-describedby', `requisitos-${id}`) : ''} value="${valorCampo ?? ''}" />
            <button type="button" class="control-contrasena__mostrar" data-mostrar="${id}" aria-pressed="false" hidden>Mostrar</button>
        </div>
        ${conRequisitos ? requisitos(id) : ''}
        ${errorDe(errores, id)}
    </div>`;
}

function campoTexto(id, etiqueta, valorCampo, errores, extra = '') {
    return html`<div class="campo">
        <label class="campo__etiqueta" for="${id}">${etiqueta}</label>
        <input class="control${conError(errores, id)}" type="text" id="${id}" name="${id}" value="${valorCampo ?? ''}"${crudo(extra)} />
        ${errorDe(errores, id)}
    </div>`;
}

function rechazarProhibidas(errores, campos) {
    const f = filtroActual();
    for (const [campo, valorCampo] of campos) {
        const t = f.analizar(valorCampo);
        if (t.length && !errores[campo]) errores[campo] = `Incluye palabras que no se permiten: ${listaTerminos(t)}. Cambialas para poder guardar.`;
    }
}

// ---------- Registrarse (A02) ----------

function pRegistrarse(ctx, m = null, errores = {}, correoYaRegistrado = false) {
    if (!m && ctx.usuario) return { redirect: destino(ctx.query.get('volver')) };
    m ||= { Volver: ctx.query.get('volver') || '' };
    const cuerpo = html`
    <div class="acceso">
        <section class="acceso__tarjeta" aria-labelledby="registro-titulo">
            <div class="acceso__titulos">
                <h1 id="registro-titulo" class="acceso__titulo">Crear cuenta</h1>
                <p class="acceso__bajada">Una sola cuenta para buscar, opinar y, si querés, ofrecer servicios.</p>
            </div>
            <form class="formulario" action="/registrarse" method="post" novalidate>
                ${resumen(errores)}
                <input type="hidden" id="Volver" name="Volver" value="${m.Volver ?? ''}" />
                <div class="formulario__par">
                    ${campoTexto('Nombre', 'Nombre', m.Nombre, errores, ' autocomplete="given-name"')}
                    ${campoTexto('Apellido', 'Apellido', m.Apellido, errores, ' autocomplete="family-name"')}
                </div>
                <div class="campo">
                    <label class="campo__etiqueta" for="Correo">Correo</label>
                    <input class="control${conError(errores, 'Correo') || (correoYaRegistrado ? ' input-validation-error' : '')}" type="email" inputmode="email" autocomplete="email" id="Correo" name="Correo" value="${m.Correo ?? ''}" />
                    ${errorDe(errores, 'Correo')}
                    ${correoYaRegistrado ? html`<p class="campo__error" role="alert"><span>Ya existe una cuenta con ese correo. <a href="/recuperar">Recuperar contraseña</a></span></p>` : ''}
                </div>
                ${campoClave('Contrasena', 'Contraseña', m.Contrasena, errores, 'new-password', true)}
                ${campoClave('RepetirContrasena', 'Repetir contraseña', m.RepetirContrasena, errores, 'new-password')}
                <div class="campo">
                    <label class="casilla">
                        <input type="checkbox" id="AceptaTerminos" name="AceptaTerminos" value="true" data-habilita="crear-cuenta"${bool('checked', m.AceptaTerminos === 'true')} />
                        <span>Acepto los <a href="/terminos" target="_blank" rel="noopener">Términos y Condiciones</a> y la <a href="/privacidad" target="_blank" rel="noopener">Política de Privacidad</a></span>
                    </label>
                    ${errorDe(errores, 'AceptaTerminos')}
                </div>
                <div class="formulario__enviar">
                    <button type="submit" id="crear-cuenta" class="boton boton--primario boton--ancho">Crear cuenta</button>
                    <p class="formulario__ayuda" data-ayuda-de="crear-cuenta" hidden>Aceptá los términos para crear la cuenta.</p>
                </div>
            </form>
            <p class="acceso__pie">¿Ya tenés cuenta? <a href="${conVolver('/ingresar', m.Volver)}">Iniciar sesión</a></p>
        </section>
    </div>`;
    return { titulo: 'Crear cuenta', enfocado: true, volver: m.Volver || '/', cuerpo };
}

function postRegistrarse(ctx, d) {
    const errores = {};
    if (!texto(d.Nombre)) errores.Nombre = 'Escribí tu nombre.';
    else if (d.Nombre.length > 80) errores.Nombre = 'El nombre puede tener hasta 80 caracteres.';
    if (!texto(d.Apellido)) errores.Apellido = 'Escribí tu apellido.';
    else if (d.Apellido.length > 80) errores.Apellido = 'El apellido puede tener hasta 80 caracteres.';
    if (!texto(d.Correo)) errores.Correo = 'Escribí tu correo.';
    else if (!correoValido(d.Correo)) errores.Correo = 'Revisá el correo: tiene que ser como nombre@ejemplo.com.';
    if (!d.Contrasena) errores.Contrasena = 'Elegí una contraseña.';
    else if (d.Contrasena.length < 8) errores.Contrasena = 'La contraseña tiene que tener 8 caracteres o más.';
    if (!d.RepetirContrasena) errores.RepetirContrasena = 'Repetí la contraseña.';
    else if (d.RepetirContrasena !== d.Contrasena) errores.RepetirContrasena = 'Las dos contraseñas no coinciden. Escribila de nuevo.';
    if (d.AceptaTerminos !== 'true') errores.AceptaTerminos = 'Aceptá los términos para crear la cuenta.';
    rechazarProhibidas(errores, [['Nombre', d.Nombre], ['Apellido', d.Apellido]]);
    if (Object.keys(errores).length) return pRegistrarse(ctx, d, errores);

    const correo = d.Correo.trim();
    if (db.usuarios.some((u) => u.correo && u.correo.toLowerCase() === correo.toLowerCase())) {
        return pRegistrarse(ctx, d, {}, true);
    }
    const problemas = erroresDeClave(d.Contrasena);
    if (problemas.length) return pRegistrarse(ctx, d, { Contrasena: problemas[0] });

    const u = {
        id: nuevoId('usuarios'), nombre: d.Nombre.trim(), apellido: d.Apellido.trim(), correo, clave: d.Contrasena, confirmado: false,
        estado: 'Activo', registro: ahora(), ultimoAcceso: ahora(), telefono: null, foto: null, admin: false, modificado: null
    };
    db.usuarios.push(u);
    enviarConfirmacion(u);
    db.sesion = u.id;
    return { redirect: conVolver('/confirmar', d.Volver) };
}

function enviarConfirmacion(u) {
    u.confirmacion = { codigo: codigoNuevo(), vence: ahora() + 48 * 3600000 };
    enviarCorreo({
        para: u.correo, asunto: 'Confirmá tu cuenta en Red Nexa', nombre: u.nombre,
        texto: 'Gracias por crear tu cuenta en Red Nexa. Para activarla, confirmá tu correo con este enlace.',
        boton: 'Confirmar mi correo', enlace: `/confirmar?usuario=${u.id}&codigo=${u.confirmacion.codigo}`,
        pie: 'El enlace dura 48 horas. Si no creaste esta cuenta, ignorá este mensaje.'
    });
}

// ---------- Confirmar el correo (A03, A04) ----------

function vistaConfirmar(ctx, estado, datos = {}) {
    const titulos = { Confirmado: 'Correo confirmado', Vencido: 'El enlace venció' };
    let contenido;
    if (estado === 'Pendiente') {
        contenido = html`${icono('correo')}
            <h1 id="confirmar-titulo" class="acceso__titulo">Revisá tu correo</h1>
            <p class="acceso__texto">Te mandamos un enlace a <strong>${datos.correo}</strong> para activar la cuenta. Mientras tanto podés navegar, pero no opinar ni publicar.</p>
            <form action="/confirmar/reenviar" method="post">
                <p class="acceso__nota">¿No llegó? Mirá en spam o <button type="submit" class="boton-enlace">reenviar el correo</button>.</p>
            </form>
            ${notaCorreos()}`;
    } else if (estado === 'Reenviado') {
        contenido = html`${icono('correo')}
            <h1 id="confirmar-titulo" class="acceso__titulo">Te mandamos un enlace nuevo</h1>
            ${datos.correo ? html`<p class="acceso__texto">Lo mandamos a <strong>${datos.correo}</strong>. Dura 48 horas: usalo desde ese mismo correo.</p>`
                : html`<p class="acceso__texto">Si la cuenta todavía no está confirmada, en unos minutos te llega un correo con el enlace. Dura 48 horas.</p>`}
            ${notaCorreos()}`;
    } else if (estado === 'Vencido') {
        contenido = html`${icono('reloj')}
            <h1 id="confirmar-titulo" class="acceso__titulo">El enlace venció</h1>
            <p class="acceso__texto">Los enlaces de confirmación duran 48 horas. Pedí uno nuevo y usalo desde el mismo correo.</p>
            <form action="/confirmar/reenviar" method="post">
                <input type="hidden" name="usuario" value="${datos.usuarioId ?? ''}" />
                <button type="submit" class="boton boton--primario boton--ancho">Enviar un enlace nuevo</button>
            </form>`;
    } else {
        contenido = html`${icono('hecho')}
            <h1 id="confirmar-titulo" class="acceso__titulo">Listo, tu correo quedó confirmado</h1>
            <p class="acceso__texto">Ya podés opinar sobre los servicios que usaste y publicar los tuyos.</p>
            ${datos.conSesion ? html`<a class="boton boton--primario boton--ancho" href="/">Ir a la portada</a>` : html`<a class="boton boton--primario boton--ancho" href="/ingresar">Ingresar</a>`}`;
    }
    return {
        titulo: titulos[estado] || 'Revisá tu correo', enfocado: true, volver: datos.volver || '/',
        cuerpo: html`<div class="acceso"><section class="acceso__tarjeta estado-acceso" aria-labelledby="confirmar-titulo">${contenido}</section></div>`
    };
}

function pConfirmar(ctx) {
    const usuarioId = entero(ctx.query.get('usuario'));
    const codigo = ctx.query.get('codigo');
    const volver = ctx.query.get('volver');
    if (usuarioId === null || !codigo) {
        const actual = ctx.usuario;
        if (!actual) return { redirect: conVolver('/ingresar', '/confirmar') };
        if (actual.confirmado) return { redirect: destino(volver) };
        return vistaConfirmar(ctx, 'Pendiente', { correo: actual.correo, volver });
    }
    const u = usuarioDe(usuarioId);
    if (u && u.confirmado) return { redirect: ctx.usuario ? '/' : '/ingresar' };
    if (u && u.confirmacion && u.confirmacion.codigo === codigo && u.confirmacion.vence > ahora()) {
        u.confirmado = true;
        u.confirmacion = null;
        guardar();
        return vistaConfirmar(ctx, 'Confirmado', { conSesion: !!ctx.usuario });
    }
    return vistaConfirmar(ctx, 'Vencido', { usuarioId });
}

function postReenviar(ctx, d) {
    const actual = ctx.usuario;
    const u = actual || usuarioDe(entero(d.usuario));
    if (u && !u.confirmado && u.estado === 'Activo') enviarConfirmacion(u);
    return vistaConfirmar(ctx, 'Reenviado', { correo: actual?.correo, conSesion: !!actual });
}

// ---------- Ingresar (A04) ----------

function pIngresar(ctx, m = null, errores = {}) {
    if (!m && ctx.usuario) return { redirect: destino(ctx.query.get('volver')) };
    m ||= { Volver: ctx.query.get('volver') || '' };
    const cuerpo = html`
    <div class="acceso">
        <section class="acceso__tarjeta acceso__tarjeta--angosta" aria-labelledby="ingreso-titulo">
            <h1 id="ingreso-titulo" class="acceso__titulo">Ingresar</h1>
            <form class="formulario" action="/ingresar" method="post" novalidate>
                ${resumen(errores)}
                <input type="hidden" id="Volver" name="Volver" value="${m.Volver ?? ''}" />
                <div class="campo">
                    <label class="campo__etiqueta" for="Correo">Correo</label>
                    <input class="control${conError(errores, 'Correo')}" type="email" inputmode="email" autocomplete="username" id="Correo" name="Correo" value="${m.Correo ?? ''}" />
                    ${errorDe(errores, 'Correo')}
                </div>
                <div class="campo">
                    <div class="campo__cabecera">
                        <label class="campo__etiqueta" for="Contrasena">Contraseña</label>
                        <a class="campo__enlace" href="/recuperar">Olvidé mi contraseña</a>
                    </div>
                    <div class="control-contrasena">
                        <input class="control${conError(errores, 'Contrasena')}" type="password" autocomplete="current-password" id="Contrasena" name="Contrasena" />
                        <button type="button" class="control-contrasena__mostrar" data-mostrar="Contrasena" aria-pressed="false" hidden>Mostrar</button>
                    </div>
                    ${errorDe(errores, 'Contrasena')}
                </div>
                <button type="submit" class="boton boton--primario boton--ancho">Ingresar</button>
            </form>
            <p class="acceso__pie">¿No tenés cuenta? <a href="${conVolver('/registrarse', m.Volver)}">Crear cuenta</a></p>
            <p class="nota-desarrollo">Demo: entrá con <button type="button" class="boton-enlace" data-completar-ingreso="maria.gonzalez@example.com">maria.gonzalez@example.com</button> (usuaria), <button type="button" class="boton-enlace" data-completar-ingreso="juan.perez@example.com">juan.perez@example.com</button> (proveedor) o <button type="button" class="boton-enlace" data-completar-ingreso="admin@example.com">admin@example.com</button> (administración). La contraseña de las tres es <strong>${CLAVE_DEMO}</strong>.</p>
        </section>
    </div>`;
    return { titulo: 'Ingresar', enfocado: true, volver: m.Volver || '/', cuerpo };
}

function postIngresar(ctx, d) {
    const errores = {};
    if (!texto(d.Correo)) errores.Correo = 'Escribí tu correo.';
    else if (!correoValido(d.Correo)) errores.Correo = 'Revisá el correo: tiene que ser como nombre@ejemplo.com.';
    if (!d.Contrasena) errores.Contrasena = 'Escribí tu contraseña.';
    if (Object.keys(errores).length) return pIngresar(ctx, { ...d, Contrasena: '' }, errores);
    const u = db.usuarios.find((x) => x.correo && x.correo.toLowerCase() === d.Correo.trim().toLowerCase() && x.estado !== 'Eliminado');
    if (!u || !u.clave || u.clave !== d.Contrasena) {
        return pIngresar(ctx, d, { '': 'El correo o la contraseña no coinciden. Revisalos y probá de nuevo.' });
    }
    if (u.estado === 'Bloqueado') {
        return pIngresar(ctx, d, { '': `Esta cuenta está bloqueada. Si creés que es un error, escribinos a ${SITIO.correo}.` });
    }
    db.sesion = u.id;
    u.ultimoAcceso = ahora();
    return { redirect: destino(d.Volver) };
}

function postSalir() {
    db.sesion = null;
    return { redirect: '/' };
}

// ---------- Recuperar y restablecer la contraseña (A05, A06) ----------

function pRecuperar(ctx, m = {}, errores = {}, enviado = false) {
    const cuerpo = enviado ? html`
    <div class="acceso">
        <section class="acceso__tarjeta acceso__tarjeta--angosta estado-acceso" aria-labelledby="recuperar-titulo">
            ${icono('correo')}
            <h1 id="recuperar-titulo" class="acceso__titulo">Listo, revisá tu correo</h1>
            <p class="acceso__texto">Si hay una cuenta con ese correo, en unos minutos te llega el enlace. Dura 1 hora.</p>
            ${notaCorreos()}
            <a class="enlace-volver" href="/ingresar">${icono('volver')}Volver a ingresar</a>
        </section>
    </div>` : html`
    <div class="acceso">
        <section class="acceso__tarjeta acceso__tarjeta--angosta" aria-labelledby="recuperar-titulo">
            <div class="acceso__titulos">
                <h1 id="recuperar-titulo" class="acceso__titulo">Recuperar contraseña</h1>
                <p class="acceso__bajada">Escribí el correo de tu cuenta y te mandamos un enlace para crear una nueva.</p>
            </div>
            <form class="formulario" action="/recuperar" method="post" novalidate>
                <div class="campo">
                    <label class="campo__etiqueta" for="Correo">Correo</label>
                    <input class="control${conError(errores, 'Correo')}" type="email" inputmode="email" autocomplete="email" id="Correo" name="Correo" value="${m.Correo ?? ''}" />
                    ${errorDe(errores, 'Correo')}
                </div>
                <button type="submit" class="boton boton--primario boton--ancho">Enviar enlace</button>
            </form>
            <a class="enlace-volver" href="/ingresar">${icono('volver')}Volver a ingresar</a>
        </section>
    </div>`;
    return { titulo: 'Recuperar contraseña', enfocado: true, volver: '/ingresar', cuerpo };
}

function postRecuperar(ctx, d) {
    if (!texto(d.Correo)) return pRecuperar(ctx, d, { Correo: 'Escribí tu correo.' });
    if (!correoValido(d.Correo)) return pRecuperar(ctx, d, { Correo: 'Revisá el correo: tiene que ser como nombre@ejemplo.com.' });
    const u = db.usuarios.find((x) => x.correo && x.correo.toLowerCase() === d.Correo.trim().toLowerCase());
    if (u && u.estado === 'Activo') {
        u.restablecer = { codigo: codigoNuevo(), vence: ahora() + 3600000 };
        enviarCorreo({
            para: u.correo, asunto: 'Restablecer tu contraseña', nombre: u.nombre,
            texto: 'Recibimos un pedido para crear una contraseña nueva para tu cuenta de Red Nexa.',
            boton: 'Crear una contraseña nueva', enlace: `/restablecer?usuario=${u.id}&codigo=${u.restablecer.codigo}`,
            pie: 'El enlace dura 1 hora. Si no lo pediste vos, ignorá este mensaje: tu contraseña sigue igual.'
        });
    }
    return pRecuperar(ctx, {}, {}, true);
}

function pRestablecer(ctx, m = null, errores = {}) {
    if (!m) {
        const usuarioId = entero(ctx.query.get('usuario'));
        const codigo = ctx.query.get('codigo');
        if (usuarioId === null || !codigo) return { redirect: '/recuperar' };
        const u = usuarioDe(usuarioId);
        const vigente = u && u.restablecer && u.restablecer.codigo === codigo && u.restablecer.vence > ahora();
        m = { Usuario: usuarioId, Codigo: codigo, vencido: !vigente };
    }
    const cuerpo = m.vencido ? html`
    <div class="acceso">
        <section class="acceso__tarjeta acceso__tarjeta--angosta estado-acceso" aria-labelledby="restablecer-titulo">
            ${icono('reloj')}
            <h1 id="restablecer-titulo" class="acceso__titulo">El enlace venció</h1>
            <p class="acceso__texto">Los enlaces para crear una contraseña nueva duran 1 hora y sirven una sola vez. Pedí uno nuevo.</p>
            <a class="boton boton--primario boton--ancho" href="/recuperar">Pedir un enlace nuevo</a>
        </section>
    </div>` : html`
    <div class="acceso">
        <section class="acceso__tarjeta acceso__tarjeta--angosta" aria-labelledby="restablecer-titulo">
            <h1 id="restablecer-titulo" class="acceso__titulo">Nueva contraseña</h1>
            <form class="formulario" action="/restablecer" method="post" novalidate>
                ${resumen(errores)}
                <input type="hidden" name="Usuario" value="${m.Usuario}" />
                <input type="hidden" name="Codigo" value="${m.Codigo}" />
                ${campoClave('Contrasena', 'Contraseña nueva', m.Contrasena, errores, 'new-password', true)}
                ${campoClave('RepetirContrasena', 'Repetir contraseña', m.RepetirContrasena, errores, 'new-password')}
                <button type="submit" class="boton boton--primario boton--ancho">Guardar y entrar</button>
            </form>
        </section>
    </div>`;
    return { titulo: m.vencido ? 'El enlace venció' : 'Nueva contraseña', enfocado: true, volver: '/ingresar', cuerpo };
}

function postRestablecer(ctx, d) {
    const errores = {};
    if (!d.Contrasena) errores.Contrasena = 'Elegí una contraseña.';
    else if (d.Contrasena.length < 8) errores.Contrasena = 'La contraseña tiene que tener 8 caracteres o más.';
    if (!d.RepetirContrasena) errores.RepetirContrasena = 'Repetí la contraseña.';
    else if (d.RepetirContrasena !== d.Contrasena) errores.RepetirContrasena = 'Las dos contraseñas no coinciden. Escribila de nuevo.';
    const m = { ...d, vencido: false };
    if (Object.keys(errores).length) return pRestablecer(ctx, m, errores);
    const u = usuarioDe(entero(d.Usuario));
    if (!u || !u.restablecer || u.restablecer.codigo !== d.Codigo || u.restablecer.vence <= ahora()) return pRestablecer(ctx, { ...m, vencido: true });
    const problemas = erroresDeClave(d.Contrasena);
    if (problemas.length) return pRestablecer(ctx, m, { Contrasena: problemas[0] });
    u.clave = d.Contrasena;
    u.restablecer = null;
    u.confirmado = true;
    db.sesion = u.id;
    u.ultimoAcceso = ahora();
    return { redirect: '/' };
}

// ---------- Mi cuenta (UNM, U03 a U06) ----------

function pMenuCuenta(ctx) {
    const u = ctx.usuario;
    const m = datosMenuCuenta(u);
    const esProveedor = m.estadoPerfil && m.estadoPerfil !== 'Eliminado';
    const item = (href, textoItem, extra = '') => html`<li><a href="${href}"><span class="menu-pagina__item">${textoItem}</span>${extra}${icono('siguiente')}</a></li>`;
    const estadoCv = { Publicado: 'Publicado', Pausado: 'Pausado', Borrador: 'Borrador', Oculto: 'Oculto' }[m.estadoCv];
    const cuerpo = html`
    <div class="seccion menu-pagina-contenedor">
        <div class="menu-pagina">
            <div class="menu-pagina__persona">
                ${avatar(u, true)}
                <div class="menu-pagina__datos">
                    <h1 class="menu-pagina__nombre">${m.nombre}</h1>
                    <p class="menu-pagina__correo">${m.correo}</p>
                </div>
            </div>
            <section class="menu-pagina__grupo" aria-labelledby="menu-cuenta-titulo">
                <h2 id="menu-cuenta-titulo" class="menu-pagina__titulo">Mi cuenta</h2>
                <ul class="menu-pagina__lista">
                    ${item('/mi-cuenta', 'Datos personales')}
                    ${item('/mi-cuenta/contrasena', 'Cambiar contraseña')}
                    <li><a href="/mi-cuenta/resenas"><span class="menu-pagina__item">Mis reseñas escritas<span class="menu-pagina__detalle">${F.opiniones(m.cantidadResenas)}</span></span>${icono('siguiente')}</a></li>
                    <li><a href="/mi-curriculum"><span class="menu-pagina__item">Mi curriculum</span>${estadoCv ? html`<span class="estado ${claseEstadoCv(m.estadoCv)}">${estadoCv}</span>` : ''}${icono('siguiente')}</a></li>
                    ${item('/mi-cuenta/eliminar', 'Eliminar mi cuenta')}
                </ul>
            </section>
            ${esProveedor ? html`<section class="menu-pagina__grupo" aria-labelledby="menu-perfil-titulo">
                <div class="menu-pagina__cabecera">
                    <h2 id="menu-perfil-titulo" class="menu-pagina__titulo">Mi perfil profesional</h2>
                    <span class="estado ${claseEstadoPerfil(m.estadoPerfil)}">${textoEstadoPerfil[m.estadoPerfil]}</span>
                </div>
                <ul class="menu-pagina__lista">
                    ${item('/mi-perfil', 'Datos del perfil')}
                    ${item('/mi-perfil/servicios', 'Mis servicios')}
                    ${item('/mi-perfil/opiniones', 'Reseñas recibidas')}
                    ${item('/mi-perfil/suscripcion', 'Mi suscripción')}
                </ul>
            </section>` : html`<section class="menu-pagina__ofrecer" aria-labelledby="menu-ofrecer-titulo">
                <h2 id="menu-ofrecer-titulo" class="menu-pagina__ofrecer-titulo">¿Ofrecés un servicio?</h2>
                <p>Con la misma cuenta creás tu perfil de proveedor. Los primeros 30 días no se paga.</p>
                <a class="boton boton--contorno boton--ancho" href="/ofrecer">Crear mi perfil de proveedor</a>
            </section>`}
            <form method="post" action="/salir"><button type="submit" class="menu-pagina__salir">Cerrar sesión</button></form>
        </div>
    </div>`;
    return { titulo: 'Mi cuenta', cuerpo };
}

function pDatosCuenta(ctx, m = null, errores = {}) {
    const u = ctx.usuario;
    m ||= { Nombre: u.nombre, Apellido: u.apellido, Telefono: u.telefono ? Tel.formato(u.telefono) : '' };
    const cuerpo = html`
    <h1 class="titulo-cuenta">Datos personales</h1>
    <form class="formulario" action="/mi-cuenta" method="post" enctype="multipart/form-data" novalidate>
        ${resumen(errores)}
        <div class="foto-perfil">
            <span class="foto-perfil__vista" data-foto-vista>
                ${u.foto ? html`<img class="avatar avatar--perfil avatar--foto" src="${u.foto}" alt="Tu foto de perfil" />` : html`<span class="avatar avatar--perfil" aria-hidden="true">${F.iniciales(nombreCompleto(u))}</span>`}
            </span>
            <div class="foto-perfil__acciones">
                <label class="boton-archivo">
                    <input class="sr-only" type="file" id="Foto" name="Foto" accept="image/jpeg,image/png,image/webp" data-foto data-foto-maximo="5242880" aria-describedby="foto-ayuda" />
                    <span>${u.foto ? 'Cambiar foto' : 'Subir foto'}</span>
                </label>
                <p id="foto-ayuda" class="foto-perfil__ayuda">Opcional. JPG, PNG o WEBP, hasta 5 MB.</p>
                ${u.foto ? html`<label class="casilla casilla--chica"><input type="checkbox" id="QuitarFoto" name="QuitarFoto" value="true" /><span>Quitar la foto</span></label>` : ''}
                ${errorDe(errores, 'Foto', { datos: ' data-foto-error' })}
            </div>
        </div>
        <div class="formulario__par">
            ${campoTexto('Nombre', 'Nombre', m.Nombre, errores, ' autocomplete="given-name"')}
            ${campoTexto('Apellido', 'Apellido', m.Apellido, errores, ' autocomplete="family-name"')}
        </div>
        <div class="campo">
            <span class="campo__etiqueta" id="correo-etiqueta">Correo</span>
            <div class="control control--solo-lectura" aria-labelledby="correo-etiqueta">
                <span class="control__valor">${u.correo}</span>
                ${u.confirmado ? html`<span class="estado estado--ok">Confirmado</span>` : html`<span class="estado estado--aviso">Sin confirmar</span>`}
            </div>
            ${u.confirmado ? '' : html`<p class="campo__ayuda">Confirmalo para poder opinar y publicar. <a href="/confirmar">Ver cómo</a></p>`}
        </div>
        <div class="campo">
            <label class="campo__etiqueta" for="Telefono">Teléfono <span class="campo__opcional">(opcional)</span></label>
            <input class="control${conError(errores, 'Telefono')}" type="tel" inputmode="tel" autocomplete="tel" placeholder="099 000 000" id="Telefono" name="Telefono" value="${m.Telefono ?? ''}" />
            ${errorDe(errores, 'Telefono')}
        </div>
        <div class="formulario__acciones">
            <button type="submit" class="boton boton--primario">Guardar cambios</button>
            ${u.modificado ? html`<p class="formulario__acciones-nota">Último cambio: ${F.fechaLarga(u.modificado)}</p>` : ''}
        </div>
    </form>`;
    return paginaCuenta(ctx, 'Datos personales', '/mi-cuenta', cuerpo);
}

async function postDatosCuenta(ctx, d) {
    const u = ctx.usuario;
    const errores = {};
    if (!texto(d.Nombre)) errores.Nombre = 'Escribí tu nombre.';
    else if (d.Nombre.length > 80) errores.Nombre = 'El nombre puede tener hasta 80 caracteres.';
    if (!texto(d.Apellido)) errores.Apellido = 'Escribí tu apellido.';
    else if (d.Apellido.length > 80) errores.Apellido = 'El apellido puede tener hasta 80 caracteres.';
    const telefono = texto(d.Telefono) ? Tel.normalizar(d.Telefono) : null;
    if (texto(d.Telefono) && !telefono) errores.Telefono = 'Revisá el teléfono: un celular es como 099 123 456 y un fijo, como 4642 1234.';
    rechazarProhibidas(errores, [['Nombre', d.Nombre], ['Apellido', d.Apellido]]);
    const archivo = (d.Foto || []).find((f) => f.size > 0);
    let foto = null;
    if (archivo) {
        if (archivo.size > TAMANO_MAXIMO_FOTO) errores.Foto = `La foto pesa ${(archivo.size / 1048576).toFixed(1).replace('.', ',')} MB y el máximo es 5 MB. Probá con una más liviana.`;
        else if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) errores.Foto = 'Sólo se admiten JPG, PNG o WEBP.';
        else {
            foto = await achicarImagen(archivo, 320, 320);
            if (!foto) errores.Foto = 'No pudimos abrir esa imagen. Probá con otra foto en JPG, PNG o WEBP.';
        }
    }
    if (Object.keys(errores).length) return pDatosCuenta(ctx, d, errores);
    u.nombre = d.Nombre.trim();
    u.apellido = d.Apellido.trim();
    u.telefono = telefono;
    if (foto) u.foto = foto;
    else if (d.QuitarFoto === 'true') u.foto = null;
    u.modificado = ahora();
    return { redirect: '/mi-cuenta', aviso: 'Listo, guardamos tus datos.' };
}

function pContrasena(ctx, m = {}, errores = {}) {
    const cuerpo = html`
    <h1 class="titulo-cuenta">Cambiar contraseña</h1>
    <form class="formulario formulario--angosto" action="/mi-cuenta/contrasena" method="post" novalidate>
        ${resumen(errores)}
        ${campoClave('ContrasenaActual', 'Contraseña actual', '', errores, 'current-password')}
        ${campoClave('Contrasena', 'Contraseña nueva', m.Contrasena, errores, 'new-password', true)}
        ${campoClave('RepetirContrasena', 'Repetir contraseña nueva', m.RepetirContrasena, errores, 'new-password')}
        <div class="formulario__acciones"><button type="submit" class="boton boton--primario">Cambiar contraseña</button></div>
    </form>`;
    return paginaCuenta(ctx, 'Cambiar contraseña', '/mi-cuenta/contrasena', cuerpo);
}

function postContrasena(ctx, d) {
    const u = ctx.usuario;
    const errores = {};
    if (!d.ContrasenaActual) errores.ContrasenaActual = 'Escribí tu contraseña actual.';
    if (!d.Contrasena) errores.Contrasena = 'Elegí una contraseña nueva.';
    else if (d.Contrasena.length < 8) errores.Contrasena = 'La contraseña tiene que tener 8 caracteres o más.';
    if (!d.RepetirContrasena) errores.RepetirContrasena = 'Repetí la contraseña nueva.';
    else if (d.RepetirContrasena !== d.Contrasena) errores.RepetirContrasena = 'Las dos contraseñas no coinciden. Escribila de nuevo.';
    if (Object.keys(errores).length) return pContrasena(ctx, d, errores);
    if (u.clave !== d.ContrasenaActual) return pContrasena(ctx, d, { ContrasenaActual: 'La contraseña actual no es correcta.' });
    const problemas = erroresDeClave(d.Contrasena);
    if (problemas.length) return pContrasena(ctx, d, { Contrasena: problemas[0] });
    u.clave = d.Contrasena;
    return { redirect: '/mi-cuenta/contrasena', aviso: 'Listo, cambiaste tu contraseña.' };
}

function pMisResenas(ctx) {
    const u = ctx.usuario;
    const resenas = db.resenas.filter((r) => r.usuarioId === u.id).sort((a, b) => (b.modificacion ?? b.creacion) - (a.modificacion ?? a.creacion));
    const cuerpo = html`
    <div class="titulo-cuenta-fila">
        <h1 class="titulo-cuenta">Mis reseñas</h1>
        ${resenas.length ? html`<p class="titulo-cuenta-fila__dato">${F.opiniones(resenas.length)}</p>` : ''}
    </div>
    ${resenas.length === 0 ? html`<div class="vacio">
        <p class="vacio__titulo">Todavía no escribiste opiniones.</p>
        <p>Cuando contrates a alguien por Red Nexa, contá cómo te fue: ayuda a los demás a elegir.</p>
        <a class="boton boton--primario" href="/">Buscar un servicio</a>
    </div>` : html`<ul class="resenas-escritas">${resenas.map((r) => {
        const perfil = perfilDe(r.perfilId);
        const prov = proveedorDe(perfil);
        const slugPerfil = perfil.estado === 'Activo' ? perfil.slug : null;
        const avisoResena = r.estado !== 'Oculta' ? null : r.ocultaPorFiltro
            ? 'No se publicó: tiene palabras que no se permiten. Si la editás sin esas palabras, se publica sola.'
            : 'La moderación la ocultó y no se ve en la ficha.';
        const editar = !slugPerfil || (r.estado === 'Oculta' && !r.ocultaPorFiltro) ? null : conVolver(`/${slugPerfil}/opinar`, '/mi-cuenta/resenas');
        const ficha = slugPerfil ? `/${slugPerfil}` : null;
        return html`<li class="resena-escrita">
            <div class="resena-escrita__cabecera">
                <h2 class="resena-escrita__proveedor">${prov}</h2>
                <span class="estrellas" aria-hidden="true">${estrellas(r.calificacion)}</span>
                <span class="sr-only">${r.calificacion} de 5 estrellas</span>
                ${editar || ficha ? html`<span class="resena-escrita__enlaces">
                    ${editar ? html`<a class="enlace-accion" href="${editar}">Editar<span class="sr-only"> tu opinión sobre ${prov}</span></a>` : ''}
                    ${ficha ? html`<a class="enlace-accion enlace-accion--suave" href="${ficha}">Ver ficha<span class="sr-only"> de ${prov}</span></a>` : ''}
                </span>` : ''}
            </div>
            <p class="resena-escrita__texto">${r.comentario}</p>
            ${avisoResena ? html`<p class="resena-escrita__aviso">${avisoResena}</p>` : ''}
            <p class="resena-escrita__fecha">${r.modificacion ? `Editada el ${F.fechaLarga(r.modificacion)}` : `Publicada el ${F.fechaLarga(r.creacion)}`}</p>
        </li>`;
    })}</ul>`}`;
    return paginaCuenta(ctx, 'Mis reseñas', '/mi-cuenta/resenas', cuerpo);
}

function pagadoHasta(u) {
    const perfil = perfilDeUsuario(u.id);
    const s = perfil && suscripcionDe(perfil.id);
    return s && !s.esPrueba && s.cubiertoHasta >= diaUy(ahora()) ? F.fechaLarga(s.cubiertoHasta) : null;
}

function pEliminar(ctx, errores = {}) {
    const u = ctx.usuario;
    const tienePerfil = !!perfilDeUsuario(u.id);
    const tieneCv = !!cvDeUsuario(u.id);
    const cantidad = db.resenas.filter((r) => r.usuarioId === u.id).length;
    const pagado = pagadoHasta(u);
    const cuerpo = html`
    <h1 class="titulo-cuenta">Eliminar mi cuenta</h1>
    <p class="alerta-peligro"><strong>No hay vuelta atrás.</strong> Una vez eliminada, no podemos recuperar la cuenta ni sus datos.</p>
    <div class="consecuencias">
        <section class="consecuencias__caja" aria-labelledby="se-borra">
            <h2 id="se-borra" class="consecuencias__titulo consecuencias__titulo--borra">Se borra</h2>
            <ul>
                <li>Nombre y apellido</li>
                <li>Correo y teléfono</li>
                <li>Foto de perfil</li>
                ${tieneCv ? html`<li>Tu CV, completo</li>` : ''}
                ${tienePerfil ? html`<li>Tu perfil de proveedor deja de verse, y se borran sus datos de contacto, su descripción y sus fotos</li>` : ''}
            </ul>
        </section>
        <section class="consecuencias__caja" aria-labelledby="queda">
            <h2 id="queda" class="consecuencias__titulo consecuencias__titulo--queda">Queda</h2>
            <ul>
                ${cantidad > 0 ? html`<li>${cantidad === 1 ? 'Tu opinión, firmada' : `Tus ${cantidad} opiniones, firmadas`} como “Usuario eliminado”, para no alterar la calificación de los proveedores</li>` : ''}
                ${tienePerfil ? html`<li>Las opiniones que recibió tu perfil, guardadas pero sin mostrarse</li>` : ''}
                ${cantidad === 0 && !tienePerfil ? html`<li>Nada que te identifique</li>` : ''}
            </ul>
        </section>
    </div>
    <form class="formulario formulario--angosto" action="/mi-cuenta/eliminar" method="post" novalidate>
        ${pagado ? html`<div class="campo">
            <p class="aviso aviso--alerta">Tenés pagado hasta el ${pagado}. Si eliminás la cuenta ahora, no se devuelve lo ya pagado.</p>
            <label class="casilla"><input type="checkbox" id="AceptaSinDevolucion" name="AceptaSinDevolucion" value="true" /><span>Entiendo que no hay devolución</span></label>
            ${errorDe(errores, 'AceptaSinDevolucion')}
        </div>` : ''}
        <div class="campo">
            <label class="campo__etiqueta" for="Contrasena">Para confirmar, escribí tu contraseña</label>
            <input class="control${conError(errores, 'Contrasena')}" type="password" autocomplete="current-password" id="Contrasena" name="Contrasena" />
            ${errorDe(errores, 'Contrasena')}
        </div>
        <div class="formulario__acciones formulario__acciones--libres">
            <button type="submit" class="boton boton--peligro">Eliminar mi cuenta</button>
            <a class="boton boton--secundario" href="/mi-cuenta">Cancelar</a>
        </div>
    </form>`;
    return paginaCuenta(ctx, 'Eliminar mi cuenta', '/mi-cuenta/eliminar', cuerpo);
}

function postEliminar(ctx, d) {
    const u = ctx.usuario;
    if (!d.Contrasena) return pEliminar(ctx, { Contrasena: 'Escribí tu contraseña para confirmar.' });
    if (u.clave !== d.Contrasena) return pEliminar(ctx, { Contrasena: 'La contraseña no es correcta. No se eliminó nada.' });
    if (pagadoHasta(u) && d.AceptaSinDevolucion !== 'true') return pEliminar(ctx, { AceptaSinDevolucion: 'Marcá que entendés que no hay devolución de lo ya pagado.' });

    // CU-08: se anonimiza. Las opiniones quedan como "Usuario eliminado".
    const perfil = perfilDeUsuario(u.id);
    if (perfil) {
        perfil.estado = 'Eliminado';
        perfil.descripcion = '';
        perfil.nombreComercial = null;
        for (const s of db.servicios.filter((x) => x.perfilId === perfil.id)) {
            s.estado = 'Oculto';
            s.fotos = [];
            s.telefono = '';
            s.direccion = null;
        }
        for (const dd of db.destacados.filter((x) => x.perfilId === perfil.id)) dd.estado = 'Retirado';
    }
    db.curriculums = db.curriculums.filter((c) => c.usuarioId !== u.id);
    Object.assign(u, { nombre: '', apellido: '', correo: null, telefono: null, foto: null, clave: null, estado: 'Eliminado' });
    db.sesion = null;
    return { redirect: '/cuenta-eliminada' };
}

function pCuentaEliminada() {
    return {
        titulo: 'Tu cuenta se eliminó',
        cuerpo: html`<section class="seccion pagina-estado" aria-labelledby="eliminada-titulo">
            <h1 id="eliminada-titulo" class="pagina-estado__titulo">Tu cuenta se eliminó</h1>
            <p class="pagina-estado__texto">Borramos tus datos personales. Gracias por haber sido parte de Red Nexa.</p>
            <a class="boton boton--primario" href="/">Ir a la portada</a>
        </section>`
    };
}

// Achica una imagen elegida en el navegador, para guardarla en la demo sin ocupar de más.
function achicarImagen(archivo, ancho, alto) {
    return new Promise((resolver) => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = ancho;
            c.height = alto;
            const x = c.getContext('2d');
            const escala = Math.max(ancho / img.naturalWidth, alto / img.naturalHeight);
            const w = img.naturalWidth * escala;
            const h = img.naturalHeight * escala;
            x.drawImage(img, (ancho - w) / 2, (alto - h) / 2, w, h);
            URL.revokeObjectURL(url);
            let datos = c.toDataURL('image/webp', 0.7);
            if (!datos.startsWith('data:image/webp')) datos = c.toDataURL('image/jpeg', 0.75);
            resolver(datos);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolver(null);
        };
        img.src = url;
    });
}
