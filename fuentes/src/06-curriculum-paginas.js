// ===================== Curriculum (P05, P06) y páginas del pie (A01, A07, A08, contacto) =====================

function urlCv(c, cambio) {
    const x = { zona: c.zona, tipo: [...c.tipo], pagina: c.pagina };
    if (cambio) cambio(x);
    const partes = [];
    if (x.zona) partes.push(`zona=${x.zona}`);
    for (const t of OPORTUNIDADES) if (x.tipo.includes(t)) partes.push(`tipo=${t}`);
    if (x.pagina > 1) partes.push(`pagina=${x.pagina}`);
    return partes.length ? `/curriculum?${partes.join('&')}` : '/curriculum';
}

function pCurriculum(ctx) {
    const q = ctx.query;
    const c = {
        zona: entero(q.get('zona')),
        tipo: q.getAll('tipo').map((t) => OPORTUNIDADES.find((o) => o.toLowerCase() === t.toLowerCase())).filter(Boolean),
        pagina: entero(q.get('pagina'))
    };
    const bits = c.tipo.reduce((a, t) => a | OPORT[t], 0);
    let lista = db.curriculums.filter(cvVisible);
    if (c.zona) lista = lista.filter((cv) => cv.zonaIds.some((z) => z === c.zona || zonaDe(z).tipo === 'General'));
    if (bits) lista = lista.filter((cv) => (cv.oportunidades & bits) !== 0);
    lista.sort((a, b) => b.actualizacion - a.actualizacion || b.id - a.id);
    const total = lista.length;
    const paginas = Math.max(1, Math.ceil(total / 20));
    const pagina = Math.min(Math.max(1, c.pagina || 1), paginas);
    const filas = lista.slice((pagina - 1) * 20, pagina * 20);
    const filtros = c.zona ? 1 : 0;
    const publicar = ctx.usuario ? '/mi-curriculum' : '/registrarse';
    const limpiar = urlCv(c, (x) => { x.zona = null; x.pagina = null; });
    const zonas = [...db.zonas].sort((a, b) => (b.tipo === 'General') - (a.tipo === 'General') || a.orden - b.orden);

    const cuerpo = html`
    <div class="cv-pagina">
        <section class="cv-portada" aria-labelledby="cv-titulo">
            <div class="cv-portada__textos">
                <h1 class="cv-portada__titulo" id="cv-titulo">Gente de Melo que busca una oportunidad</h1>
                <p class="cv-portada__texto">Cada persona cuenta qué sabe hacer, sus cursos y su experiencia. Sin título ni oficio formal también vale. Publicar un CV es gratis.</p>
            </div>
            <a class="boton cv-portada__boton" href="${publicar}">Publicar mi CV</a>
        </section>
        <div class="cv-barra">
            <a class="boton boton--secundario boton-filtrar" href="#filtros">Filtrar${filtros > 0 ? ` (${filtros})` : ''}</a>
            <aside id="filtros" class="filtros filtros--cv" aria-labelledby="filtros-titulo">
                <div class="filtros__cabecera">
                    <h2 class="filtros__titulo" id="filtros-titulo">Filtrar</h2>
                    <a class="filtros__limpiar" href="${limpiar}">Limpiar</a>
                    <a class="filtros__cerrar" href="#lista-cv">${icono('cerrar')}<span class="sr-only">Cerrar los filtros</span></a>
                </div>
                <form class="filtros__formulario filtros-cv" action="/curriculum" method="get" data-filtros-cv>
                    ${OPORTUNIDADES.filter((t) => c.tipo.includes(t)).map((t) => html`<input type="hidden" name="tipo" value="${t}" />`)}
                    <div class="filtro filtro-cv">
                        <label class="filtro__titulo filtro-cv__etiqueta" for="filtro-zona">Zona</label>
                        <select class="control filtro-cv__control" id="filtro-zona" name="zona" data-enviar-al-cambiar>
                            <option value="">Todas</option>
                            ${zonas.map((z) => html`<option value="${z.id}"${bool('selected', c.zona === z.id)}>${z.nombre}</option>`)}
                        </select>
                    </div>
                    <div class="filtros__acciones filtros-cv__acciones">
                        <button type="submit" class="boton boton--primario">Ver los CV</button>
                        <a class="boton boton--secundario" href="${limpiar}">Limpiar filtros</a>
                    </div>
                </form>
            </aside>
            <ul class="cv-oportunidades" aria-label="Qué están buscando">
                ${OPORTUNIDADES.map((t) => {
                    const marcado = c.tipo.includes(t);
                    const url = urlCv(c, (x) => { x.tipo = marcado ? x.tipo.filter((y) => y !== t) : [...x.tipo, t]; x.pagina = null; });
                    return html`<li><a class="cv-oportunidad" href="${url}"${attr('aria-current', marcado ? 'true' : null)}>${NOMBRE_OPORTUNIDAD[t]}<span class="sr-only">${marcado ? ': filtro puesto, tocá para quitarlo' : ''}</span></a></li>`;
                })}
            </ul>
            <p class="cv-cuenta"><strong>${total === 1 ? '1 CV' : `${total} CV`}</strong> <span class="cv-cuenta__orden">Actualizados primero</span></p>
        </div>
        <section id="lista-cv" class="cv-lista" aria-label="CV publicados">
            ${filas.length === 0 ? html`<div class="sin-resultados">
                <h2 class="sin-resultados__titulo">${filtros > 0 || c.tipo.length > 0 ? 'Ningún CV cumple con estos filtros' : 'Todavía no hay CV publicados'}</h2>
                ${filtros > 0 || c.tipo.length > 0 ? html`<p>Probá quitar algún filtro.</p>` : ''}
                <div class="invitacion">
                    <h3 class="invitacion__titulo">¿Buscás trabajo?</h3>
                    <p>Contá qué sabés hacer y que te encuentren. Publicar un CV es gratis.</p>
                    <a class="boton boton--primario" href="${publicar}">Publicar mi CV</a>
                </div>
            </div>` : html`<ol class="cv-tarjetas">
                ${filas.map((cv) => {
                    const u = usuarioDe(cv.usuarioId);
                    const nombre = nombreConInicial(u.nombre, u.apellido);
                    const ops = nombresOportunidad(cv.oportunidades);
                    const zonasCv = cv.zonaIds.map(zonaDe).sort((a, b) => a.orden - b.orden).map((z) => z.nombre);
                    return html`<li class="cv-tarjeta">
                        <span class="cv-tarjeta__iniciales" aria-hidden="true">${F.iniciales(nombre)}</span>
                        <div class="cv-tarjeta__cuerpo">
                            <div class="cv-tarjeta__cabecera">
                                <h2 class="cv-tarjeta__nombre"><a href="/curriculum/${cv.id}">${nombre}</a></h2>
                                <span class="cv-tarjeta__cuando"><span class="cv-tarjeta__actualizado">Actualizado </span>${F.hace(cv.actualizacion).toLowerCase()}</span>
                            </div>
                            <p class="cv-tarjeta__texto">${cv.queSabeHacer}</p>
                            ${ops.length ? html`<ul class="cv-etiquetas" aria-label="Busca">${ops.map((o) => html`<li>${o}</li>`)}</ul>` : ''}
                            <div class="cv-tarjeta__pie">
                                <p class="cv-tarjeta__datos">${zonasCv.length ? html`<span>${icono('lugar')}<span class="sr-only">Zona: </span>${F.lista(zonasCv)}</span>` : ''}</p>
                                <span class="cv-tarjeta__ver" aria-hidden="true">Ver CV</span>
                            </div>
                        </div>
                    </li>`;
                })}
            </ol>
            ${paginas > 1 ? html`<nav class="paginas" aria-label="Páginas del listado">
                ${pagina > 1 ? html`<a class="paginas__flecha" href="${urlCv(c, (x) => { x.pagina = pagina - 1; })}">${icono('volver')}<span class="sr-only">Página anterior</span></a>` : ''}
                ${Array.from({ length: paginas }, (_, i) => i + 1).map((n) => html`<a class="paginas__numero" href="${urlCv(c, (x) => { x.pagina = n; })}"${attr('aria-current', n === pagina ? 'page' : null)}><span class="sr-only">Página </span>${n}</a>`)}
                ${pagina < paginas ? html`<a class="paginas__flecha" href="${urlCv(c, (x) => { x.pagina = pagina + 1; })}">${icono('siguiente')}<span class="sr-only">Página siguiente</span></a>` : ''}
            </nav>` : ''}`}
        </section>
    </div>`;
    return { titulo: 'Curriculum', cuerpo };
}

function pFichaCv(ctx, id) {
    const cv = db.curriculums.find((c) => c.id === id);
    const yo = ctx.usuario;
    if (!cv) return null;
    const propio = yo && cv.usuarioId === yo.id;
    if (!cvVisible(cv) && !propio) return null;
    if (!cvVisible(cv)) return null;
    const u = usuarioDe(cv.usuarioId);
    const nombre = nombreConInicial(u.nombre, u.apellido);
    const ingresar = conVolver('/ingresar', `/curriculum/${cv.id}`);
    const ops = nombresOportunidad(cv.oportunidades);
    const cursos = lineasCv(cv.cursos);
    const experiencia = lineasCv(cv.experiencia);
    const zonas = cv.zonaIds.map(zonaDe).sort((a, b) => a.orden - b.orden).map((z) => z.nombre);
    const contacto = yo ? { nombre: nombreCompleto(u), telefono: cv.telefono, correo: cv.mostrarCorreo ? u.correo : null } : null;
    const telefono = contacto?.telefono ? Tel.formato(contacto.telefono) : null;
    const llamar = contacto?.telefono ? `tel:+${contacto.telefono}` : null;
    const whatsapp = contacto?.telefono ? Tel.whatsapp(contacto.telefono, MENSAJE_CV) : null;
    const renglones = (lineas, clase) => html`<ul class="cv-renglones ${clase}">${lineas.map((l) => html`<li${attr('class', l.cuando ? null : 'cv-renglones__solo')}>
        ${l.cuando ? html`<span class="cv-renglones__cuando">${l.cuando}</span>` : ''}
        <span class="cv-renglones__texto">${l.texto}</span>
    </li>`)}</ul>`;

    const cuerpo = html`
    <article class="ficha cv-ficha">
        <a class="enlace-panel ficha__volver" href="${ctx.anterior && ctx.anterior.startsWith('/curriculum') && !ctx.anterior.startsWith('/curriculum/') ? ctx.anterior : '/curriculum'}">${icono('volver')}Volver a Curriculum</a>
        <header class="ficha__cabecera cv-ficha__cabecera">
            <span class="ficha__retrato ficha__retrato--iniciales" aria-hidden="true">${F.iniciales(nombre)}</span>
            <div class="ficha__identidad">
                <h1 class="ficha__titulo">${nombre}</h1>
                <div class="cv-ficha__datos">
                    ${ops.length ? html`<ul class="cv-etiquetas" aria-label="Busca">${ops.map((o) => html`<li>${o}</li>`)}</ul>` : ''}
                    <p class="cv-ficha__actualizado">Actualizado el ${F.fechaLarga(cv.actualizacion)}</p>
                </div>
            </div>
        </header>
        <div class="ficha__cuerpo">
            <div class="ficha__principal cv-ficha__principal">
                <section class="ficha__seccion" aria-labelledby="que-sabe">
                    <h2 class="ficha__subtitulo" id="que-sabe">Qué sé hacer</h2>
                    <p class="texto-largo cv-ficha__texto">${cv.queSabeHacer}</p>
                </section>
                ${cursos.length ? html`<section class="ficha__seccion" aria-labelledby="cursos"><h2 class="ficha__subtitulo" id="cursos">Cursos</h2>${renglones(cursos, 'cv-renglones--cursos')}</section>` : ''}
                ${experiencia.length ? html`<section class="ficha__seccion" aria-labelledby="experiencia"><h2 class="ficha__subtitulo" id="experiencia">Experiencia</h2>${renglones(experiencia, 'cv-renglones--experiencia')}</section>` : ''}
            </div>
            <aside class="ficha__lateral">
                <section class="contacto${contacto ? '' : ' cv-contacto--sin-sesion'}" aria-labelledby="contacto-titulo">
                    <h2 class="ficha__subtitulo cv-ficha__subtitulo" id="contacto-titulo">Contacto</h2>
                    ${!contacto ? html`
                        <p class="cv-contacto__aviso">${icono('candado')}Iniciá sesión para ver el apellido, el teléfono y el correo.</p>
                        <a class="boton boton--primario boton--ancho" href="${ingresar}">Ingresar para ver el contacto</a>` : html`
                        <p class="contacto__etiqueta">Nombre</p>
                        <p class="cv-contacto__nombre">${contacto.nombre}</p>
                        ${telefono ? html`<p class="contacto__etiqueta">Teléfono</p>
                            <p class="contacto__telefono">${telefono}</p>
                            <div class="contacto__botones">
                                ${whatsapp ? html`<a class="boton boton--primario" href="${whatsapp}" rel="noopener noreferrer" target="_blank">Escribir por WhatsApp<span class="sr-only"> (se abre WhatsApp)</span></a>` : ''}
                                <a class="boton boton--secundario" href="${llamar}">Llamar<span class="sr-only"> al ${telefono}</span></a>
                            </div>` : ''}
                        ${contacto.correo ? html`<p class="contacto__etiqueta">Correo</p><p class="cv-contacto__correo"><a href="mailto:${contacto.correo}">${contacto.correo}</a></p>` : ''}
                        ${!telefono && !contacto.correo ? html`<p class="contacto__oculta">No dejó un teléfono ni eligió mostrar su correo.</p>` : ''}
                        ${propio ? html`<p class="contacto__oculta">Así ven tu CV las personas con sesión. <a href="/mi-curriculum">Editar mi CV</a></p>` : ''}`}
                </section>
                ${zonas.length ? html`<section class="donde" aria-labelledby="donde-titulo">
                    <h2 class="ficha__subtitulo cv-ficha__subtitulo" id="donde-titulo">Dónde</h2>
                    <ul class="cv-etiquetas" aria-label="Zonas">${zonas.map((z) => html`<li>${z}</li>`)}</ul>
                </section>` : ''}
            </aside>
        </div>
        ${contacto && !propio ? html`<p class="ficha__reportar"><a href="/curriculum/${cv.id}/reportar">Reportar esta publicación</a></p>` : ''}
    </article>
    ${!contacto ? html`<div class="contacto-fijo contacto-fijo--columna">
        <a class="boton boton--primario" href="${ingresar}">${icono('candado')}Ingresar para ver el contacto</a>
        <p class="contacto-fijo__nota">Con sesión ves el apellido, el teléfono y el correo.</p>
    </div>` : llamar && !propio ? html`<div class="contacto-fijo">
        <a class="boton boton--secundario" href="${llamar}">Llamar</a>
        ${whatsapp ? html`<a class="boton boton--primario" href="${whatsapp}" rel="noopener noreferrer" target="_blank">WhatsApp</a>` : ''}
    </div>` : ''}`;
    return { titulo: `${nombre} | Curriculum`, cuerpo };
}

// ---------- Cómo funciona (A01) ----------

function pComoFunciona() {
    const t = tarifasVigentes();
    const paso = (n, titulo, textoPaso) => html`<li><span class="recorrido__numero" aria-hidden="true">${n}</span><div><p class="recorrido__paso">${titulo}</p><p>${textoPaso}</p></div></li>`;
    const cuerpo = html`
    <div class="pagina-texto como-funciona">
        <header class="como-funciona__cabecera">
            <h1 class="pagina-texto__titulo">Cómo funciona Red Nexa</h1>
            <p class="pagina-texto__bajada">Buscar es gratis y no hace falta registrarse. Para opinar, creás una cuenta. Para ofrecer servicios, pagás una cuota mensual chica.</p>
        </header>
        <div class="como-funciona__pasos">
            <section class="recorrido" aria-labelledby="pasos-buscar">
                <h2 class="recorrido__titulo" id="pasos-buscar">Si buscás a alguien</h2>
                <ol class="recorrido__lista">
                    ${paso(1, 'Buscá por texto o rubro', 'Filtrá por zona, modalidad y calificación.')}
                    ${paso(2, 'Compará opiniones', 'Cada proveedor tiene una sola reputación, sume los rubros que sume.')}
                    ${paso(3, 'Contactá directo', 'Llamalo o escribile por WhatsApp desde su ficha, sin crear una cuenta. Sin comisiones.')}
                </ol>
            </section>
            <section class="recorrido" aria-labelledby="pasos-ofrecer">
                <h2 class="recorrido__titulo" id="pasos-ofrecer">Si ofrecés un servicio</h2>
                <ol class="recorrido__lista">
                    ${paso(1, 'Creá tu perfil y tus servicios', `Con la misma cuenta con la que buscás. Hasta ${MAXIMO_CATEGORIAS} categorías en total y ${MAXIMO_FOTOS} fotos por servicio.`)}
                    ${paso(2, 'Se publica al instante', 'Si pasa el filtro de palabras, tu ficha queda visible enseguida. Te avisamos por correo.')}
                    ${paso(3, '30 días gratis, después la cuota', 'Se paga del 1 al 10 de cada mes con Mercado Pago.')}
                </ol>
            </section>
        </div>
        <section class="tarifas" aria-labelledby="tarifas-titulo">
            <h2 class="tarifas__titulo" id="tarifas-titulo">Tarifas</h2>
            <table class="tarifas__tabla">
                <thead><tr><th scope="col">Plan</th><th scope="col">Mensual</th><th scope="col">Anual (−${F.percent(t.desc)})</th><th scope="col">Incluye</th></tr></thead>
                <tbody>
                    <tr><th scope="row">Profesionales</th><td>${F.money(t.prof)}</td><td class="tarifas__anual" data-columna="Anual ">${F.money(cuotaAnual(t.prof, t.desc))}</td><td class="tarifas__incluye">Perfil, servicios, especialidad y formación</td></tr>
                    <tr><th scope="row">Servicios</th><td>${F.money(t.serv)}</td><td class="tarifas__anual" data-columna="Anual ">${F.money(cuotaAnual(t.serv, t.desc))}</td><td class="tarifas__incluye">Perfil y servicios con zona, modalidad y precio orientativo</td></tr>
                    <tr><th scope="row">Curriculum</th><td class="tarifas__gratis">Gratis</td><td class="tarifas__nada tarifas__anual tarifas__sin-anual">—</td><td class="tarifas__incluye">Un CV con lo que sabés hacer</td></tr>
                    <tr class="tarifas__destacado"><th scope="row">Destacado</th><td>${F.money(t.dest)}</td><td class="tarifas__nada tarifas__anual">Sólo mensual</td><td class="tarifas__incluye">Primeros lugares en tu categoría. Incluye la cuota del mes</td></tr>
                </tbody>
            </table>
            <p class="tarifas__nota">Importes en pesos uruguayos, por mes. Con servicios en los dos grandes rubros se paga sólo la cuota de Profesionales. No hay devoluciones, tampoco del pago anual ni del destacado.</p>
        </section>
        <aside class="aviso-identidad" aria-labelledby="identidad-titulo">
            ${icono('alerta')}
            <div>
                <h2 class="aviso-identidad__titulo" id="identidad-titulo">Red Nexa no acredita la identidad de nadie</h2>
                <p>Estar registrado o tener un perfil publicado no prueba identidad, matrícula, habilitación ni antecedentes. La matrícula que ves en una ficha la declara el proveedor.</p>
            </div>
        </aside>
    </div>`;
    return { titulo: 'Cómo funciona', cuerpo };
}

// ---------- Contacto ----------

const MOTIVOS_CONTACTO = { ConsultaGeneral: 'Consulta general', SobreMiPerfil: 'Consulta sobre mi perfil', PagosYSuscripcion: 'Pagos y suscripción', Otro: 'Otro' };

function pContacto(ctx, m = {}, errores = {}, enviado = false) {
    const largo = (m.Mensaje || '').length;
    const cuerpo = html`
    <div class="pagina-texto contacto-pagina">
        <section class="contacto-pagina__formulario" aria-labelledby="contacto-titulo">
            <h1 class="pagina-texto__titulo" id="contacto-titulo">Escribinos</h1>
            ${enviado ? html`<p class="aviso" role="status">Gracias, recibimos tu mensaje. Te respondemos al correo que nos dejaste.</p>
                <p><a class="enlace-fuerte" href="/">Volver a la portada</a></p>` : html`
            <form class="formulario" action="/contacto" method="post" novalidate data-envio-unico>
                ${resumen(errores)}
                <div class="formulario__par">
                    <div class="campo">
                        <label class="campo__etiqueta" for="Nombre">Nombre</label>
                        <input class="control${conError(errores, 'Nombre')}" id="Nombre" name="Nombre" type="text" autocomplete="name" maxlength="100" value="${m.Nombre ?? ''}" />
                        ${errorDe(errores, 'Nombre')}
                    </div>
                    <div class="campo">
                        <label class="campo__etiqueta" for="Correo">Correo</label>
                        <input class="control${conError(errores, 'Correo')}" id="Correo" name="Correo" type="email" autocomplete="email" inputmode="email" value="${m.Correo ?? ''}" />
                        ${errorDe(errores, 'Correo')}
                    </div>
                </div>
                <div class="campo">
                    <label class="campo__etiqueta" for="Motivo">Motivo</label>
                    <select class="control${conError(errores, 'Motivo')}" id="Motivo" name="Motivo">
                        <option value="">Elegí el motivo</option>
                        ${Object.entries(MOTIVOS_CONTACTO).map(([v, n]) => html`<option value="${v}"${bool('selected', m.Motivo === v)}>${n}</option>`)}
                    </select>
                    ${errorDe(errores, 'Motivo')}
                </div>
                <div class="campo">
                    <label class="campo__etiqueta" for="Mensaje">Mensaje</label>
                    <textarea class="control control--texto${conError(errores, 'Mensaje')}" id="Mensaje" name="Mensaje" rows="5" maxlength="1000">${m.Mensaje ?? ''}</textarea>
                    <div class="campo__pie"><span></span><span class="campo__contador" data-contador-de="Mensaje">${largo} / 1000</span></div>
                    ${errorDe(errores, 'Mensaje')}
                </div>
                <div class="formulario__acciones formulario__acciones--libres">
                    <button type="submit" class="boton boton--primario">Enviar mensaje</button>
                </div>
            </form>`}
        </section>
        <aside class="contacto-pagina__datos" aria-label="Otros datos">
            <div><p class="contacto-pagina__etiqueta">Correo</p><p class="contacto-pagina__correo"><a href="mailto:${SITIO.correo}">${SITIO.correo}</a></p></div>
            <div><p class="contacto-pagina__etiqueta">Dónde estamos</p><p>${SITIO.ubicacion}</p></div>
            <p class="contacto-pagina__nota">Para reclamos sobre una opinión, usá el botón “Reportar” en la propia opinión: llega directo a moderación.</p>
        </aside>
    </div>`;
    return { titulo: 'Contacto', cuerpo };
}

function postContacto(ctx, d) {
    const errores = {};
    if (!texto(d.Nombre)) errores.Nombre = 'Escribí tu nombre.';
    else if (d.Nombre.length > 100) errores.Nombre = 'El nombre puede tener hasta 100 caracteres.';
    if (!texto(d.Correo)) errores.Correo = 'Escribí tu correo: ahí te respondemos.';
    else if (!correoValido(d.Correo)) errores.Correo = 'Revisá el correo: tiene que ser como nombre@ejemplo.com.';
    if (!MOTIVOS_CONTACTO[d.Motivo]) errores.Motivo = 'Elegí el motivo.';
    if (!texto(d.Mensaje)) errores.Mensaje = 'Escribí tu mensaje.';
    else if (d.Mensaje.length > 1000) errores.Mensaje = 'El mensaje puede tener hasta 1000 caracteres.';
    if (Object.keys(errores).length) return pContacto(ctx, d, errores);
    enviarCorreo({
        para: SITIO.correo, asunto: `Contacto: ${MOTIVOS_CONTACTO[d.Motivo]}`, nombre: 'equipo de Red Nexa',
        texto: `${d.Nombre.trim()} (${d.Correo.trim()}) escribió desde el formulario de Contacto: «${d.Mensaje.trim()}»`,
        pie: 'Respondé a la persona a su correo.'
    });
    return pContacto(ctx, {}, {}, true);
}

// ---------- Términos (A07) y Privacidad (A08) ----------

function pTerminos() {
    const secciones = [['que-es', '1. Qué es Red Nexa'], ['identidad', '2. Identidad y verificación'], ['cuentas', '3. Cuentas'],
        ['publicaciones', '4. Publicaciones'], ['opiniones', '5. Opiniones'], ['pagos', '6. Cuotas y pagos'], ['baja', '7. Baja de la cuenta']];
    const indice = html`<ol>${secciones.map(([id, t]) => html`<li><a href="#${id}">${t}</a></li>`)}</ol>`;
    const cuerpo = html`
    <div class="pagina-texto legal">
        <nav class="legal__indice legal__indice--celular" aria-label="Contenido">
            <p class="legal__indice-titulo">Contenido</p>
            <details class="legal__desplegable"><summary>Ir a una sección${icono('desplegar')}</summary>${indice}</details>
        </nav>
        <nav class="legal__indice legal__indice--escritorio" aria-label="Contenido">
            <p class="legal__indice-titulo">Contenido</p>
            ${indice}
        </nav>
        <article class="legal__texto">
            <header class="legal__cabecera">
                <h1 class="pagina-texto__titulo">Términos y Condiciones</h1>
                <p class="legal__fecha">Última actualización: 1 de noviembre de 2026</p>
            </header>
            <section id="que-es" class="legal__seccion">
                <h2>1. Qué es Red Nexa</h2>
                <p>Un directorio que conecta a personas de Melo con quienes ofrecen servicios. Red Nexa no presta los servicios, no interviene en los acuerdos y no cobra comisión sobre ellos. Lo que se acuerde, el precio y la forma de pago quedan entre quien contrata y quien ofrece el servicio.</p>
            </section>
            <section id="identidad" class="legal__seccion legal__seccion--recuadro">
                <h2>2. Red Nexa no acredita la identidad de nadie</h2>
                <p>Estar registrado o tener un perfil publicado no prueba identidad, matrícula, habilitación ni antecedentes. Las matrículas que aparecen en las fichas las declara cada proveedor y el sitio no las verifica. No pedimos ni guardamos documento de identidad.</p>
            </section>
            <section id="cuentas" class="legal__seccion">
                <h2>3. Cuentas</h2>
                <p>Nombre, apellido y correo son obligatorios; teléfono y foto, opcionales. Cada correo es una cuenta. Para publicar, opinar o reportar hay que confirmar el correo. Cuidá tu contraseña: lo que se haga con tu cuenta corre por tu cuenta.</p>
                <p>La administración puede bloquear cuentas que no respeten estas condiciones. Una cuenta bloqueada no puede ingresar y su perfil deja de verse.</p>
            </section>
            <section id="publicaciones" class="legal__seccion">
                <h2>4. Publicaciones</h2>
                <p>Quien publica un servicio o un CV es responsable de lo que dice y de las fotos que sube: tienen que describir un servicio o una experiencia real, y las fotos tienen que ser propias o usadas con permiso.</p>
                <p>Lo que se publica se ve en el acto. Antes, los textos pasan por un filtro automático de palabras: si encuentra alguna que no se permite, la publicación no se muestra hasta que se corrija. La administración puede revisar lo publicado en cualquier momento y, con un motivo, ocultar un servicio o un CV, o eliminar una foto.</p>
                <p>En la ficha de un servicio, el teléfono de contacto es público y la dirección del local la ven sólo las personas con la sesión iniciada. De un CV, sin sesión se ve el nombre con la inicial del apellido.</p>
            </section>
            <section id="opiniones" class="legal__seccion">
                <h2>5. Opiniones</h2>
                <p>Pueden opinar las personas con cuenta y correo confirmado: una opinión por proveedor, que se puede editar. Nadie puede opinar sobre sí mismo. Cada opinión cuenta una experiencia propia, sin insultos ni datos personales de otras personas, y pasa por el mismo filtro de palabras.</p>
                <p>El proveedor puede responder una vez cada opinión. Cualquier persona con sesión puede reportar una opinión o una publicación; reportar no la oculta: la revisa la administración. Una opinión oculta no cuenta para el promedio.</p>
            </section>
            <section id="pagos" class="legal__seccion">
                <h2>6. Cuotas y pagos</h2>
                <p>Publicar un servicio tiene 30 días gratis desde el primer servicio publicado; después, una cuota mensual según el gran rubro, que se puede pagar por año con descuento. Publicar un CV es gratis. Los importes vigentes están en <a href="/como-funciona">Cómo funciona</a>, y lo ya contratado conserva su precio.</p>
                <p>Las cuotas se pagan del 1 al 10 de cada mes, sólo con Mercado Pago. Si el día 11 la cuota no está paga, el perfil deja de verse y conserva todos sus datos. No hay devoluciones, tampoco del pago anual ni del destacado.</p>
            </section>
            <section id="baja" class="legal__seccion">
                <h2>7. Baja de la cuenta</h2>
                <p>Podés eliminar tu cuenta cuando quieras desde Mi cuenta. Se borran tu nombre, apellido, teléfono, foto y correo; tu perfil deja de verse y tu CV se borra entero. Las opiniones que escribiste quedan firmadas como “Usuario eliminado”, para no alterar la reputación de quienes las recibieron. No hay vuelta atrás, y lo pagado no se devuelve.</p>
            </section>
            <p class="legal__cierre">Si cambiamos estas condiciones, la versión nueva se publica en esta página con su fecha. Por cualquier consulta, escribinos desde <a href="/contacto">Contacto</a> o a ${SITIO.correo}.</p>
        </article>
    </div>`;
    return { titulo: 'Términos y Condiciones', cuerpo };
}

function pPrivacidad() {
    const filas = [
        ['Nombre del proveedor y su ficha', 'Sí', 'Sí', 'Deja de verse y se borran sus datos'],
        ['Teléfono de contacto del servicio', 'Sí', 'Sí', 'Se borra'],
        ['Dirección del local', 'No', 'Sí', 'Se borra'],
        ['CV: nombre con la inicial, qué sabés hacer, cursos y experiencia', 'Sí', 'Sí', 'El CV se borra entero'],
        ['CV: apellido, teléfono y correo', 'No', 'Sí; el correo, si lo elegís', 'El CV se borra entero'],
        ['Opiniones que escribiste', 'Sí, con tu nombre e inicial', 'Sí', 'Quedan como “Usuario eliminado”'],
        ['Correo, teléfono y foto de tu cuenta', 'No', 'No', 'Se borran'],
        ['Documento de identidad', 'No se pide', 'No se pide', '—']
    ];
    const apagado = (v) => (['No', 'No se pide', '—'].includes(v) ? 'privacidad__apagado' : null);
    const cuerpo = html`
    <div class="pagina-texto privacidad">
        <header class="privacidad__cabecera">
            <h1 class="pagina-texto__titulo">Política de Privacidad</h1>
            <p class="pagina-texto__bajada">Pedimos lo mínimo y mostramos sólo lo necesario. Tratamos tus datos según la Ley 18.331 de Protección de Datos Personales.</p>
        </header>
        <table class="privacidad__tabla">
            <caption class="sr-only">Quién ve cada dato y qué pasa con él al eliminar la cuenta</caption>
            <thead><tr><th scope="col">Dato</th><th scope="col">Cualquier visitante</th><th scope="col">Con sesión iniciada</th><th scope="col">Al eliminar la cuenta</th></tr></thead>
            <tbody>
                ${filas.map(([dato, v, s, e]) => html`<tr>
                    <th scope="row">${dato}</th>
                    <td${attr('class', apagado(v))} data-columna="Cualquier visitante">${v}</td>
                    <td${attr('class', apagado(s))} data-columna="Con sesión iniciada">${s}</td>
                    <td class="privacidad__eliminar${apagado(e) ? ' ' + apagado(e) : ''}" data-columna="Al eliminar la cuenta">${e}</td>
                </tr>`)}
            </tbody>
        </table>
        <div class="privacidad__texto">
            <section class="legal__seccion"><h2>Qué datos pedimos y para qué</h2><p>Para la cuenta, nombre, apellido y correo; el teléfono y la foto son opcionales. Si ofrecés un servicio, lo que cargues en tu perfil y tus servicios; si publicás un CV, lo que escribas en él. Los usamos para mostrar lo que publicás, para que te contacten y para avisarte por correo de lo que pasa con tu cuenta: la confirmación, las opiniones que recibís, las cuotas y los pagos. No mandamos publicidad.</p></section>
            <section class="legal__seccion"><h2>Pagos</h2><p>Los pagos se procesan en Mercado Pago: tu tarjeta no pasa por nuestros servidores. Guardamos el importe, la fecha y el número de operación, como comprobante.</p></section>
            <section class="legal__seccion"><h2>Cookies</h2><p>Usamos sólo las cookies necesarias para mantener la sesión iniciada y proteger los formularios. No usamos cookies de publicidad ni de medición de terceros.</p></section>
            <section class="legal__seccion"><h2>Tus derechos</h2><p>Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiendo a ${SITIO.correo} o desde <a href="/contacto">Contacto</a>, o eliminar tu cuenta vos mismo desde Mi cuenta.</p></section>
        </div>
    </div>`;
    return { titulo: 'Política de Privacidad', cuerpo };
}

function pEstado(titulo = 'No encontramos esta página', mensaje = 'Puede que la dirección esté mal escrita o que la página todavía no exista.') {
    const cuerpo = html`
    <section class="seccion pagina-estado" aria-labelledby="estado-titulo">
        <h1 id="estado-titulo" class="pagina-estado__titulo">${titulo}</h1>
        <p class="pagina-estado__texto">${mensaje}</p>
        <a class="boton boton--primario" href="/">Ir a la portada</a>
    </section>`;
    return { titulo, cuerpo };
}
