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
                    const nombre = nombreCompleto(u);
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
    const nombre = nombreCompleto(u);
    const ops = nombresOportunidad(cv.oportunidades);
    const cursos = lineasCv(cv.cursos);
    const experiencia = lineasCv(cv.experiencia);
    const zonas = cv.zonaIds.map(zonaDe).sort((a, b) => a.orden - b.orden).map((z) => z.nombre);
    // RN-49: el contacto es público, con o sin sesión; el correo, sólo si la persona eligió mostrarlo.
    const contacto = { telefono: cv.telefono, correo: cv.mostrarCorreo ? u.correo : null };
    const telefono = contacto.telefono ? Tel.formato(contacto.telefono) : null;
    const llamar = contacto.telefono ? `tel:+${contacto.telefono}` : null;
    const whatsapp = contacto.telefono ? Tel.whatsapp(contacto.telefono, MENSAJE_CV) : null;
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
                <section class="contacto" aria-labelledby="contacto-titulo">
                    <h2 class="ficha__subtitulo cv-ficha__subtitulo" id="contacto-titulo">Contacto</h2>
                        ${telefono ? html`<p class="contacto__etiqueta">Teléfono</p>
                            <p class="contacto__telefono">${telefono}</p>
                            <div class="contacto__botones">
                                ${whatsapp ? html`<a class="boton boton--primario" href="${whatsapp}" rel="noopener noreferrer" target="_blank">Escribir por WhatsApp<span class="sr-only"> (se abre WhatsApp)</span></a>` : ''}
                                <a class="boton boton--secundario" href="${llamar}">Llamar<span class="sr-only"> al ${telefono}</span></a>
                            </div>` : ''}
                        ${contacto.correo ? html`<p class="contacto__etiqueta">Correo</p><p class="cv-contacto__correo"><a href="mailto:${contacto.correo}">${contacto.correo}</a></p>` : ''}
                        ${!telefono && !contacto.correo ? html`<p class="contacto__oculta">No dejó un teléfono ni eligió mostrar su correo.</p>` : ''}
                        ${propio ? html`<p class="contacto__oculta">Así se ve tu CV. <a href="/mi-curriculum">Editar mi CV</a></p>` : ''}
                </section>
                ${zonas.length ? html`<section class="donde" aria-labelledby="donde-titulo">
                    <h2 class="ficha__subtitulo cv-ficha__subtitulo" id="donde-titulo">Dónde</h2>
                    <ul class="cv-etiquetas" aria-label="Zonas">${zonas.map((z) => html`<li>${z}</li>`)}</ul>
                </section>` : ''}
            </aside>
        </div>
        ${yo && !propio ? html`<p class="ficha__reportar"><a href="/curriculum/${cv.id}/reportar">Reportar esta publicación</a></p>` : ''}
    </article>
    ${llamar && !propio ? html`<div class="contacto-fijo">
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
            <p class="tarifas__nota">Importes en pesos uruguayos, por mes.</p>
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

// ---------- Términos (A07) y Políticas (A08), con el texto de la clienta del 11 de noviembre de 2026 ----------

// _IndiceLegal: en celular, el índice se despliega con "Ir a una sección" (A07M); en escritorio queda al costado (A07).
function indiceLegal(secciones) {
    const lista = html`<ol>${secciones.map(([id, t]) => html`<li><a href="#${id}">${t}</a></li>`)}</ol>`;
    return html`
        <nav class="legal__indice legal__indice--celular" aria-label="Contenido">
            <p class="legal__indice-titulo">Contenido</p>
            <details class="legal__desplegable"><summary>Ir a una sección${icono('desplegar')}</summary>${lista}</details>
        </nav>
        <nav class="legal__indice legal__indice--escritorio" aria-label="Contenido">
            <p class="legal__indice-titulo">Contenido</p>
            ${lista}
        </nav>`;
}

function pTerminos() {
    const secciones = [
        ['identificacion', '1. Identificación y objeto'],
        ['definiciones', '2. Definiciones'],
        ['aceptacion', '3. Aceptación de los Términos'],
        ['usuarios', '4. Tipos de usuarios y requisitos'],
        ['naturaleza', '5. Naturaleza y funcionamiento de RED NEXA'],
        ['relacion', '6. Relación entre Usuarios y Prestadores'],
        ['conectar', '7. Función “Conectar”'],
        ['publicacion', '8. Publicación de perfiles y servicios'],
        ['habilitaciones', '9. Profesiones reguladas y habilitaciones'],
        ['visibilidad', '10. Información de contacto y visibilidad'],
        ['resenas', '11. Reseñas y calificaciones'],
        ['posicionamiento', '12. Posicionamiento de perfiles y contenido destacado'],
        ['contenido', '13. Contenido publicado por los Usuarios'],
        ['propiedad', '14. Propiedad intelectual de RED NEXA'],
        ['prohibidas', '15. Conductas prohibidas'],
        ['denuncias', '16. Denuncias, moderación y medidas de protección'],
        ['suspension', '17. Suspensión, eliminación y reactivación de cuentas'],
        ['suscripciones', '18. Suscripciones de Prestadores'],
        ['renovacion', '19. Renovación automática, cancelación e impago'],
        ['precios', '20. Modificación de precios y funcionalidades'],
        ['resultados', '21. Ausencia de garantía de resultados'],
        ['responsabilidad', '22. Responsabilidad por los servicios'],
        ['indemnidad', '23. Indemnidad'],
        ['datos-personales', '24. Protección de datos personales'],
        ['comunicaciones', '25. Comunicaciones'],
        ['seguridad', '26. Seguridad y disponibilidad'],
        ['modificaciones', '27. Modificaciones de los Términos'],
        ['politicas', '28. Relación con las Políticas de RED NEXA'],
        ['consumidores', '29. Consumidores y normativa imperativa'],
        ['fuerza-mayor', '30. Fuerza mayor'],
        ['jurisdiccion', '31. Legislación aplicable y jurisdicción'],
        ['datos-red-nexa', '32. Datos de identificación de RED NEXA'],
        ['aceptacion-electronica', '33. Aceptación electrónica'],
        ['declaracion', '34. Declaración específica del Prestador'],
        ['vigencia', '35. Vigencia']
    ];
    const cuerpo = html`
    <div class="pagina-texto legal">
        ${indiceLegal(secciones)}
        <article class="legal__texto">
            <header class="legal__cabecera">
                <h1 class="pagina-texto__titulo">Términos y Condiciones</h1>
                <p class="legal__fecha">Última actualización: 11 de noviembre de 2026</p>
            </header>

            <section id="identificacion" class="legal__seccion">
                <h2>1. Identificación y objeto</h2>
                <p>Los presentes Términos y Condiciones (en adelante, los “Términos”) regulan el acceso, navegación, registro y utilización de la plataforma digital denominada RED NEXA (en adelante, “RED NEXA”, “la Plataforma” o “la plataforma”), así como las condiciones aplicables a las personas que utilizan funcionalidades destinadas específicamente a Prestadores.</p>
                <p>RED NEXA es una plataforma digital destinada a facilitar el encuentro, búsqueda y contacto entre personas que ofrecen servicios y personas interesadas en conocer, contactar o eventualmente contratar dichos servicios. Asimismo, podrá ofrecer una modalidad gratuita denominada “Busco Job / Currículum”, destinada a la publicación de perfiles laborales o curriculares.</p>
                <p>La titularidad de RED NEXA corresponde a Mariana Caltieri, propietaria de la empresa, con domicilio en Mata 636, Melo, Cerro Largo, República Oriental del Uruguay (en adelante, “RED NEXA” o la “Empresa”).</p>
                <p>La utilización de la Plataforma implica la aceptación de estos Términos y de las <a href="/privacidad">Políticas de RED NEXA</a> que resulten aplicables a cada funcionalidad. La Política de Privacidad y las demás políticas vigentes complementan estos Términos y deberán interpretarse conjuntamente con ellos.</p>
                <p>La utilización de esta funcionalidad (facilitar contacto entre usuarios y prestadores) no convierte a RED NEXA en garante de las relaciones que eventualmente se establezcan entre ellos, las cuales se rigen únicamente por lo que estos convengan.</p>
            </section>

            <section id="definiciones" class="legal__seccion">
                <h2>2. Definiciones</h2>
                <ul class="legal__lista">
                    <li><strong>Plataforma:</strong> el sitio web, software, sistemas, funcionalidades, bases de datos y demás medios digitales que integran RED NEXA.</li>
                    <li><strong>Usuario:</strong> toda persona que accede o utiliza RED NEXA, se encuentre o no registrada.</li>
                    <li><strong>Usuario Registrado:</strong> persona que crea una cuenta y accede a funcionalidades reservadas.</li>
                    <li><strong>Prestador:</strong> persona física mayor de dieciocho (18) años que utiliza RED NEXA para publicar y ofrecer servicios.</li>
                    <li><strong>Profesional:</strong> Prestador que ofrece servicios correspondientes a una profesión determinada y que, cuando corresponda, declara poseer el título, matrícula, habilitación, registro o autorización exigible.</li>
                    <li><strong>Servicio:</strong> actividad profesional, oficio o servicio personal ofrecido por un Prestador a través de RED NEXA.</li>
                    <li><strong>Perfil:</strong> espacio digital asociado a una cuenta donde puede publicarse información relativa al Prestador.</li>
                    <li><strong>Reseña o Calificación:</strong> valoración, puntuación, comentario o respuesta publicada por un Usuario respecto de un Prestador.</li>
                    <li><strong>Busco Job / Currículum:</strong> modalidad gratuita destinada a personas mayores de dieciocho (18) años que desean publicar información profesional, laboral o curricular.</li>
                    <li><strong>Conectar:</strong> funcionalidad destinada a facilitar el contacto entre usuarios, sin que por ello RED NEXA pase a formar parte de la relación posterior.</li>
                </ul>
            </section>

            <section id="aceptacion" class="legal__seccion">
                <h2>3. Aceptación de los Términos</h2>
                <p>Toda persona que acceda, navegue, se registre o utilice RED NEXA declara haber leído y comprendido estos Términos.</p>
                <p>Cuando una funcionalidad requiera registro, el Usuario deberá aceptar expresamente los Términos mediante el mecanismo electrónico dispuesto por RED NEXA. RED NEXA podrá conservar evidencia de dicha aceptación, incluyendo fecha, hora, versión aceptada y datos técnicos disponibles.</p>
                <p>Cuando una funcionalidad específica requiera una aceptación adicional, RED NEXA podrá solicitarla de manera diferenciada.</p>
            </section>

            <section id="usuarios" class="legal__seccion">
                <h2>4. Tipos de usuarios y requisitos</h2>
                <h3>4.1 Visitantes y Usuarios Registrados</h3>
                <p>Los Visitantes podrán navegar por determinadas áreas de la Plataforma sin crear una cuenta. Para acceder a funcionalidades reservadas, deberán registrarse y proporcionar información verdadera, actual, completa y suficiente.</p>
                <p>RED NEXA podrá establecer funcionalidades o restricciones diferentes según el tipo de cuenta, la naturaleza de la actividad y la normativa aplicable.</p>
                <h3>4.2 Prestadores</h3>
                <p>Para registrarse como Prestador será requisito ser mayor de dieciocho (18) años, crear una cuenta, proporcionar la información solicitada, aceptar estos Términos y la Política de Privacidad, y contratar la suscripción correspondiente cuando resulte exigible.</p>
                <h3>4.3 Currículum</h3>
                <p>La modalidad “Currículum” estará destinada a personas mayores de dieciocho (18) años, será inicialmente gratuita y permitirá publicar información sobre experiencia, formación, habilidades, disponibilidad y otros antecedentes laborales. La publicación de un perfil no garantiza entrevistas, empleo, contratación ni ingresos.</p>
                <p>Tampoco garantiza al contratante que los datos proporcionados por el usuario sean reales o comprobados.</p>
            </section>

            <section id="naturaleza" class="legal__seccion legal__seccion--recuadro">
                <h2>5. Naturaleza y funcionamiento de RED NEXA</h2>
                <p>RED NEXA constituye un medio digital de intermediación y conexión. No presta directamente los servicios publicados por los Prestadores ni actúa como empleador, contratante, representante, mandatario, socio, franquiciante, agente comercial o garante de los Prestadores.</p>
                <p>Salvo que una funcionalidad indique expresamente lo contrario, RED NEXA no interviene en la negociación, contratación, ejecución, pago, facturación, entrega o resultado de los servicios ofrecidos.</p>
                <p>La existencia de un Perfil no constituye por sí misma recomendación, certificación, garantía o aval del Prestador o del servicio publicado.</p>
                <p>El contacto facilitado mediante RED NEXA no implica que se haya celebrado un contrato entre las partes.</p>
            </section>

            <section id="relacion" class="legal__seccion">
                <h2>6. Relación entre Usuarios y Prestadores</h2>
                <p>Toda contratación de un servicio se celebra exclusivamente entre el Usuario y el Prestador. Las partes deberán acordar directamente el alcance del servicio, precio, forma y momento de pago, fecha y horario, lugar, materiales, garantías, cancelaciones y demás condiciones.</p>
                <p>RED NEXA no administra ni cobra, en principio, los importes correspondientes a los servicios contratados entre Usuarios y Prestadores.</p>
                <p>Los reclamos relativos a la prestación concreta del servicio deberán dirigirse a la parte correspondiente.</p>
                <p>En atención al objeto y naturaleza de la plataforma, ésta actúa únicamente como medio tecnológico de encuentro, búsqueda y contacto entre personas que ofrecen servicios y personas interesadas en conocerlos, contactarlos o contratarlos.</p>
                <p>RED NEXA no es parte de los acuerdos, contratos o relaciones, de cualquier naturaleza, sea civil, comercial, laboral y otra índole que los usuarios y prestadores celebren. En consecuencia, carece de legitimación jurídica entre las relaciones convenidas entre usuario y prestador, careciendo por tanto de responsabilidad entre las eventualidades que pudieran suscitarse entre estos.</p>
            </section>

            <section id="conectar" class="legal__seccion">
                <h2>7. Función “Conectar”</h2>
                <p>La funcionalidad “Conectar” tiene como finalidad facilitar el contacto entre Usuarios y Prestadores. RED NEXA no garantiza una cantidad mínima de contactos, consultas, presupuestos, clientes, contrataciones, ingresos o resultados económicos.</p>
                <p>Una vez facilitado el contacto, las comunicaciones, negociaciones, acuerdos y contrataciones posteriores serán responsabilidad de las partes involucradas.</p>
            </section>

            <section id="publicacion" class="legal__seccion">
                <h2>8. Publicación de perfiles y servicios</h2>
                <p>Los Prestadores serán responsables de la información que publiquen, incluyendo nombre personal o comercial, fotografías, descripción, servicios, experiencia, ubicación, teléfono, redes sociales y, cuando corresponda, matrícula, título, registro o habilitación.</p>
                <p>La información deberá ser verdadera, actualizada, suficiente y no engañosa. El Prestador deberá modificarla cuando deje de reflejar su situación real.</p>
                <p>Solo podrán publicarse servicios lícitos y compatibles con las categorías y reglas de RED NEXA.</p>
                <p>La publicación de un servicio no supone que RED NEXA haya verificado su calidad, legalidad, habilitación o cumplimiento, salvo que la Plataforma indique expresamente una verificación concreta.</p>
            </section>

            <section id="habilitaciones" class="legal__seccion">
                <h2>9. Profesiones reguladas y habilitaciones</h2>
                <p>Cuando una actividad requiera título, matrícula, registro, permiso, habilitación, seguro u otra autorización, el Prestador declara bajo su exclusiva responsabilidad que cumple los requisitos aplicables.</p>
                <p>La inclusión de una matrícula, número de registro o referencia profesional constituye una declaración del Prestador. Salvo que RED NEXA indique expresamente que una determinada información fue verificada, la Plataforma no garantiza su autenticidad, vigencia, alcance o validez.</p>
                <p>El Prestador será responsable de sus obligaciones tributarias, laborales, previsionales, municipales, sanitarias, profesionales, regulatorias, de seguridad, habilitación y facturación que correspondan a su actividad.</p>
            </section>

            <section id="visibilidad" class="legal__seccion">
                <h2>10. Información de contacto y visibilidad</h2>
                <p>RED NEXA podrá permitir que determinados datos del Prestador sean visibles públicamente y podrá reservar otros datos para Usuarios Registrados.</p>
                <p>El Prestador podrá seleccionar el número telefónico u otros medios de contacto que desee publicar, conforme a las funcionalidades disponibles, y podrá modificarlos o retirarlos.</p>
                <p>El Prestador comprende y acepta que los datos que decida publicar como información de contacto podrán ser visualizados por todos los Usuarios de acuerdo con la configuración de la Plataforma.</p>
            </section>

            <section id="resenas" class="legal__seccion">
                <h2>11. Reseñas y calificaciones</h2>
                <p>RED NEXA podrá permitir que los Usuarios publiquen calificaciones mediante estrellas, comentarios y otros mecanismos. Las reseñas podrán referirse a servicios contratados o recibidos antes o después de la utilización de RED NEXA y no necesariamente implican que el contacto haya ocurrido dentro de la Plataforma.</p>
                <p>Las opiniones expresadas corresponden a quienes las publican. RED NEXA no garantiza que toda experiencia relatada sea verdadera ni que toda persona que publique una reseña haya contratado efectivamente al Prestador.</p>
                <p>Los Prestadores podrán responder las reseñas respetando estos Términos. No podrán utilizar las respuestas para insultar, amenazar, hostigar, discriminar, publicar datos personales de terceros, realizar spam o formular acusaciones ilegales.</p>
                <p>RED NEXA podrá moderar, ocultar o retirar contenidos que infrinjan estos Términos, las Políticas o la legislación aplicable, conforme al procedimiento de moderación vigente.</p>
            </section>

            <section id="posicionamiento" class="legal__seccion">
                <h2>12. Posicionamiento de perfiles y contenido destacado</h2>
                <p>RED NEXA podrá utilizar sistemas de clasificación y posicionamiento para determinar el orden de aparición de los perfiles. Podrán considerarse factores como calificaciones, cantidad de reseñas, actividad, completitud del perfil, categoría, ubicación, criterios técnicos, disponibilidad de funcionalidades, promociones y criterios comerciales.</p>
                <p>No existe garantía de una posición determinada. RED NEXA podrá ofrecer en el futuro modalidades de promoción, publicidad o posicionamiento destacado, cuyas condiciones y precios serán informados previamente y de acuerdo a cada caso.</p>
            </section>

            <section id="contenido" class="legal__seccion">
                <h2>13. Contenido publicado por los Usuarios</h2>
                <p>Los Usuarios podrán publicar fotografías, textos, descripciones, logotipos, nombres comerciales, currículums, opiniones y otros contenidos permitidos.</p>
                <p>Quien publique contenido declara que es su titular o que cuenta con autorización suficiente para utilizarlo, y que su publicación no infringe derechos de terceros, incluyendo derechos de autor, marcas, imagen, privacidad u otros derechos.</p>
                <p>Al publicar contenido, el Usuario autoriza a RED NEXA, mientras dicho contenido permanezca publicado y en la medida necesaria, a almacenarlo, reproducirlo técnicamente, adaptar su formato y exhibirlo dentro de la Plataforma para operar, administrar, mejorar y promocionar RED NEXA así como en las Redes Sociales de Red Nexa. Esta autorización no implica transferencia de propiedad intelectual.</p>
                <p>Cuando corresponda, RED NEXA podrá retirar contenido ante una denuncia fundada o cuando considere que existe una infracción.</p>
            </section>

            <section id="propiedad" class="legal__seccion">
                <h2>14. Propiedad intelectual de RED NEXA</h2>
                <p>El nombre RED NEXA, sus logotipos, identidad visual, diseño, textos propios, gráficos, software, funcionalidades, bases de datos, código, organización de categorías y demás elementos propios pertenecen a RED NEXA o son utilizados legítimamente por ella.</p>
                <p>Queda prohibida su reproducción, modificación, distribución, comercialización, explotación, extracción sistemática de datos o utilización no autorizada, salvo autorización expresa o cuando la legislación permita lo contrario.</p>
            </section>

            <section id="prohibidas" class="legal__seccion">
                <h2>15. Conductas prohibidas</h2>
                <p>Está prohibido utilizar RED NEXA para:</p>
                <ul class="legal__lista">
                    <li>Cometer, facilitar o promover delitos o actividades ilegales.</li>
                    <li>Realizar fraudes, estafas o prácticas engañosas.</li>
                    <li>Suplantar identidades, crear perfiles falsos o utilizar cuentas de terceros.</li>
                    <li>Publicar información deliberadamente falsa o engañosa.</li>
                    <li>Ofrecer servicios ilegales o servicios para los que se carezca de habilitación cuando esta sea exigible.</li>
                    <li>Publicar datos personales de terceros sin autorización o base jurídica suficiente.</li>
                    <li>Amenazar, acosar, hostigar o discriminar a otras personas.</li>
                    <li>Manipular reseñas, calificaciones, posicionamiento o sistemas de la Plataforma.</li>
                    <li>Crear cuentas ficticias para alterar resultados o generar actividad artificial.</li>
                    <li>Enviar spam o comunicaciones no solicitadas mediante funcionalidades de RED NEXA.</li>
                    <li>Distribuir malware, vulnerar sistemas o intentar obtener acceso no autorizado.</li>
                    <li>Extraer masivamente información de la Plataforma mediante mecanismos automatizados no autorizados.</li>
                    <li>Publicar contenido que infrinja derechos de terceros.</li>
                    <li>Realizar cualquier conducta contraria a estos Términos, las Políticas o la legislación aplicable.</li>
                </ul>
            </section>

            <section id="denuncias" class="legal__seccion">
                <h2>16. Denuncias, moderación y medidas de protección</h2>
                <p>En caso de incumplimiento del numeral anterior RED NEXA podrá disponer mecanismos para denunciar perfiles, publicaciones, reseñas, comunicaciones o conductas contrarias a estos Términos.</p>
                <p>RED NEXA podrá solicitar información adicional, revisar el contenido denunciado y adoptar medidas razonables conforme a sus políticas y a la normativa aplicable.</p>
                <p>Cuando existan motivos razonables para considerar que existe un incumplimiento, fraude, riesgo para otros Usuarios o para la Plataforma, actividad sospechosa, denuncia que requiera investigación o necesidad de cumplir una obligación legal, RED NEXA podrá suspender preventivamente una cuenta, Perfil, publicación o funcionalidad.</p>
                <p>Cuando se presuma o configure incumplimiento de los términos señalados, RED NEXA podrá informar al Usuario afectado sobre la medida y sus fundamentos, sin perjuicio de las medidas urgentes que puedan resultar necesarias para proteger la Plataforma o a terceros.</p>
            </section>

            <section id="suspension" class="legal__seccion">
                <h2>17. Suspensión, eliminación y reactivación de cuentas</h2>
                <p>RED NEXA podrá suspender o eliminar cuentas, Perfiles, publicaciones o funcionalidades ante incumplimientos de estos Términos, falta de pago, información falsa, contenido prohibido, indicios de fraude, actividad sospechosa, riesgos para terceros, requerimientos legales u otras causas legítimas, sin que ello implique incumplimiento del servicio brindado, siendo esta condición, garantía del mismo.</p>
                <p>Los Usuarios podrán solicitar la eliminación de sus cuentas mediante los mecanismos disponibles. La eliminación podrá implicar la eliminación de la información pública asociada, sin perjuicio de las obligaciones legales de conservación o de información que deba mantenerse por razones legítimas.</p>
                <p>La cancelación de una suscripción no implica necesariamente la eliminación de la cuenta. El Prestador podrá volver a contratar una suscripción posteriormente, sujeto a las condiciones vigentes.</p>
            </section>

            <section id="suscripciones" class="legal__seccion">
                <h2>18. Suscripciones de Prestadores</h2>
                <p>Determinadas funcionalidades destinadas a Prestadores estarán sujetas al pago de una suscripción mensual.</p>
                <p>A la fecha de esta versión de trabajo, los planes iniciales son:</p>
                <ul class="legal__lista">
                    <li><strong>Profesionales:</strong> $400 (pesos uruguayos) mensuales, precio final.</li>
                    <li><strong>Servicios y Oficios:</strong> $150 (pesos uruguayos) mensuales, precio final.</li>
                    <li><strong>Currículum:</strong> inicialmente gratuito.</li>
                </ul>
                <p>RED NEXA podrá ofrecer un período inicial de prueba gratuita de un (1) mes, sujeto a las condiciones informadas al momento de la contratación.</p>
            </section>

            <section id="renovacion" class="legal__seccion">
                <h2>19. Renovación automática, cancelación e impago</h2>
                <p>Cuando corresponda, finalizado el período gratuito, la suscripción comenzará a cobrarse y se renovará automáticamente por períodos mensuales sucesivos mientras permanezca activa, siempre que el mecanismo de contratación y cobro utilizado lo permita y se haya informado previamente de manera clara.</p>
                <p>El Prestador podrá cancelar la suscripción en cualquier momento. La cancelación impedirá futuras renovaciones y nuevos cargos una vez finalizado el período ya abonado.</p>
                <p>La cancelación no generará reintegro proporcional del período mensual ya abonado.</p>
                <p>Cuando un cobro no pueda efectuarse, RED NEXA podrá suspender las funcionalidades pagas y/o el Perfil hasta que se regularice la situación, respetando la normativa aplicable.</p>
                <p>RED NEXA podrá utilizar proveedores externos de pago. El procesamiento de los datos necesarios para efectuar pagos podrá estar sujeto a las condiciones y políticas de privacidad del proveedor correspondiente.</p>
            </section>

            <section id="precios" class="legal__seccion">
                <h2>20. Modificación de precios y funcionalidades</h2>
                <p>RED NEXA podrá modificar precios, planes, categorías y funcionalidades. Las modificaciones de precios serán comunicadas con antelación de 30 días corridos antes de su aplicación y no afectarán períodos ya abonados.</p>
                <p>Las modificaciones podrán responder a cambios de costos, inflación, IPC, proveedores tecnológicos, nuevas funcionalidades, condiciones de mercado u otras razones comerciales u operativas.</p>
                <p>Cuando una modificación implique un cambio sustancial en una condición contratada, RED NEXA actuará conforme a la legislación aplicable y, cuando corresponda, solicitará una nueva aceptación.</p>
            </section>

            <section id="resultados" class="legal__seccion">
                <h2>21. Ausencia de garantía de resultados</h2>
                <p>El pago de una suscripción otorga acceso a las funcionalidades y condiciones del plan contratado, pero no garantiza contactos, consultas, clientes, contrataciones, ingresos, rentabilidad, posicionamiento determinado ni resultados comerciales.</p>
                <p>RED NEXA no garantiza que un Perfil reciba una cantidad mínima de visitas o consultas.</p>
            </section>

            <section id="responsabilidad" class="legal__seccion">
                <h2>22. Responsabilidad por los servicios</h2>
                <p>El Prestador será responsable de los servicios que ofrezca, publicite, acuerde o realice, así como de la información, precios, condiciones, horarios, materiales, calidad, garantías y obligaciones legales asociadas. Cada prestador actúa por su cuenta y organización bajo su propia responsabilidad.</p>
                <p>RED NEXA no será responsable por daños, perjuicios, pérdidas, incumplimientos, accidentes, lesiones, daños materiales, perjuicios económicos, fraudes, errores profesionales, mala praxis, omisiones, retrasos, cancelaciones o cualquier otro hecho derivado de la relación entre Usuarios, conforme al objeto señalado anteriormente (facilitar encuentro, búsqueda o contacto entre ambos).</p>
                <p>Nada de estos Términos pretende excluir, limitar o trasladar responsabilidades que por normas imperativas correspondan legalmente a RED NEXA.</p>
            </section>

            <section id="indemnidad" class="legal__seccion">
                <h2>23. Indemnidad</h2>
                <p>El Prestador deberá mantener indemne a RED NEXA frente a reclamos de terceros que deriven directamente de actos, omisiones, contenidos, servicios o incumplimientos atribuibles al Prestador. Esta obligación no alcanza responsabilidades que legalmente correspondan a RED NEXA.</p>
            </section>

            <section id="datos-personales" class="legal__seccion">
                <h2>24. Protección de datos personales</h2>
                <p>El tratamiento de datos personales realizado por RED NEXA se regirá por la normativa uruguaya aplicable y por la <a href="/privacidad">Política de Privacidad de RED NEXA</a>.</p>
                <p>RED NEXA podrá tratar datos personales necesarios para crear y administrar cuentas, prestar funcionalidades, facilitar contactos, gestionar suscripciones y pagos, gestionar comunicaciones, atender reclamos, prevenir fraudes, mejorar la Plataforma y cumplir obligaciones legales.</p>
                <p>Los Usuarios deberán consultar la Política de Privacidad para conocer las categorías de datos tratados, finalidades, derechos, mecanismos de ejercicio y demás información correspondiente.</p>
                <p>Los Prestadores serán responsables de contar con autorización o base jurídica suficiente respecto de datos personales de terceros que publiquen.</p>
            </section>

            <section id="comunicaciones" class="legal__seccion">
                <h2>25. Comunicaciones</h2>
                <p>RED NEXA podrá comunicarse con los Usuarios mediante correo electrónico, teléfono, notificaciones dentro de la Plataforma u otros medios proporcionados por el Usuario.</p>
                <p>Las comunicaciones vinculadas con seguridad, funcionamiento, cuenta, suscripción, pagos o cumplimiento podrán ser necesarias para prestar el servicio. Las comunicaciones promocionales estarán sujetas a la normativa aplicable y a los mecanismos de consentimiento y exclusión correspondientes.</p>
            </section>

            <section id="seguridad" class="legal__seccion">
                <h2>26. Seguridad y disponibilidad</h2>
                <p>RED NEXA implementará medidas razonables de seguridad destinadas a proteger sus sistemas y la información bajo su responsabilidad. No obstante, ningún sistema informático puede garantizar seguridad absoluta.</p>
                <p>RED NEXA procurará mantener la Plataforma disponible y funcionando adecuadamente, pero no garantiza disponibilidad permanente, ininterrumpida o libre de errores, en caso de fuerza mayor.</p>
                <p>La Plataforma podrá verse afectada por mantenimiento, actualizaciones, fallas técnicas, problemas de conectividad, fallas de proveedores tecnológicos, fuerza mayor, ataques informáticos u otras circunstancias fuera del control razonable de RED NEXA.</p>
            </section>

            <section id="modificaciones" class="legal__seccion">
                <h2>27. Modificaciones de los Términos</h2>
                <p>RED NEXA podrá modificar estos Términos cuando resulte necesario por cambios legales, regulatorios, tecnológicos, comerciales, de seguridad o de funcionamiento.</p>
                <p>Las modificaciones relevantes serán comunicadas en el domicilio o contacto que constituya el prestador al momento de la suscripción o mediante medios razonables. Cuando la normativa o la naturaleza del cambio requiera una nueva aceptación, RED NEXA solicitará la correspondiente aceptación antes de aplicar el cambio a las funcionalidades afectadas.</p>
                <p>La versión vigente estará disponible en la Plataforma e indicará su fecha de actualización.</p>
            </section>

            <section id="politicas" class="legal__seccion">
                <h2>28. Relación con las Políticas de RED NEXA</h2>
                <p>Forman parte del marco contractual y operativo de RED NEXA, en cuanto resulten aplicables, las <a href="/privacidad">Políticas de RED NEXA</a>, que podrán estar reunidas en un documento único y comprender, entre otras:</p>
                <ul class="legal__lista">
                    <li>Política de Privacidad.</li>
                    <li>Política de Cookies.</li>
                    <li>Política de Publicaciones y Contenido.</li>
                    <li>Política de Reseñas y Comunidad.</li>
                    <li>Política de Suscripciones y Pagos.</li>
                    <li>Política de Reclamos, Denuncias y Moderación.</li>
                </ul>
                <p>En caso de contradicción, se aplicará la normativa imperativa correspondiente y, respecto de aspectos específicos, la disposición particular que regule expresamente la funcionalidad de que se trate, en la medida legalmente válida.</p>
            </section>

            <section id="consumidores" class="legal__seccion">
                <h2>29. Consumidores y normativa imperativa</h2>
                <p>Cuando una relación se encuentre alcanzada por normas de protección al consumidor u otras disposiciones imperativas, dichas normas prevalecerán sobre cualquier disposición de estos Términos que resulte incompatible.</p>
                <p>Ninguna disposición de estos Términos pretende privar a los Usuarios o Prestadores de derechos que no puedan ser válidamente renunciados conforme a la legislación aplicable.</p>
            </section>

            <section id="fuerza-mayor" class="legal__seccion">
                <h2>30. Fuerza mayor</h2>
                <p>RED NEXA no será responsable por incumplimientos o interrupciones derivados de circunstancias imprevisibles o inevitables fuera de su control razonable, dentro de los límites establecidos por la legislación aplicable.</p>
            </section>

            <section id="jurisdiccion" class="legal__seccion">
                <h2>31. Legislación aplicable y jurisdicción</h2>
                <p>Estos Términos se regirán e interpretarán conforme a las leyes de la República Oriental del Uruguay, y de conformidad a los artículos 1247 y 1291 del Código Civil, la obligación pactada por RED NEXA es la de contactar; siendo las obligaciones de quienes se contactan ajenas a ésta.</p>
                <p>Para las cuestiones que puedan surgir en relación con estos Términos serán competentes los tribunales de Melo, Cerro Largo.</p>
            </section>

            <section id="datos-red-nexa" class="legal__seccion">
                <h2>32. Datos de identificación de RED NEXA</h2>
                <ul class="legal__lista">
                    <li><strong>Nombre comercial:</strong> RED NEXA</li>
                    <li><strong>Tipo societario:</strong> Propietario</li>
                    <li><strong>Domicilio:</strong> Mata 636, Melo</li>
                    <li><strong>Departamento:</strong> Cerro Largo</li>
                    <li><strong>País:</strong> República Oriental del Uruguay</li>
                    <li><strong>Correo electrónico:</strong> ${SITIO.correo}</li>
                </ul>
            </section>

            <section id="aceptacion-electronica" class="legal__seccion">
                <h2>33. Aceptación electrónica</h2>
                <p>La selección de la casilla “Acepto los Términos y Condiciones”, acompañada del mecanismo electrónico correspondiente, constituirá manifestación expresa de voluntad de aceptar estos Términos.</p>
                <p>Para registrarse como Prestador, el usuario deberá aceptar expresamente estos Términos, la Política de Privacidad y las declaraciones específicas que RED NEXA establezca respecto de la veracidad de la información, responsabilidad por los servicios y habilitaciones que correspondan.</p>
                <p>RED NEXA podrá conservar evidencia electrónica de la aceptación realizada, incluyendo la versión de los documentos aceptados.</p>
            </section>

            <section id="declaracion" class="legal__seccion">
                <h2>34. Declaración específica del Prestador</h2>
                <p>Al registrarse como Prestador, la persona declara que:</p>
                <ul class="legal__lista">
                    <li>Es mayor de dieciocho (18) años.</li>
                    <li>La información proporcionada es verdadera, completa y actualizada.</li>
                    <li>Es responsable de los servicios que publica y presta.</li>
                    <li>Posee las habilitaciones, matrículas, títulos, permisos o autorizaciones que correspondan a su actividad.</li>
                    <li>Es responsable de cumplir sus obligaciones tributarias, laborales, previsionales, profesionales, municipales y demás obligaciones legales.</li>
                    <li>Tiene derecho a utilizar los contenidos que publica.</li>
                    <li>Comprende que RED NEXA facilita el contacto entre personas, siendo éste su objeto.</li>
                    <li>Comprende que RED NEXA no es parte de las relaciones o contrataciones que puedan establecerse entre Usuarios.</li>
                    <li>Comprende que la suscripción no garantiza contrataciones, ingresos, contactos ni resultados económicos.</li>
                    <li>Acepta estos Términos y las Políticas de RED NEXA que resulten aplicables.</li>
                </ul>
            </section>

            <section id="vigencia" class="legal__seccion">
                <h2>35. Vigencia</h2>
                <p>Estos Términos entrarán en vigencia desde su publicación en RED NEXA o desde la fecha indicada a continuación.</p>
                <p>Última actualización: 11 de noviembre de 2026.</p>
            </section>
        </article>
    </div>`;
    return { titulo: 'Términos y Condiciones', cuerpo };
}

function pPrivacidad() {
    const filas = [
        ['Nombre del proveedor y su ficha', 'Sí', 'Sí', 'Deja de verse y se borran sus datos'],
        ['Teléfono de contacto del servicio', 'Sí', 'Sí', 'Se borra'],
        ['Dirección del local', 'No', 'Sí', 'Se borra'],
        ['CV: nombre y apellido, qué sabés hacer, cursos, experiencia y teléfono', 'Sí', 'Sí', 'El CV se borra entero'],
        ['CV: correo', 'Si lo elegís', 'Si lo elegís', 'El CV se borra entero'],
        ['Opiniones que escribiste', 'Sí, con tu nombre e inicial', 'Sí', 'Quedan como “Usuario eliminado”'],
        ['Correo, teléfono y foto de tu cuenta', 'No', 'No', 'Se borran'],
        ['Documento de identidad', 'No se pide', 'No se pide', '—']
    ];
    const apagado = (v) => (['No', 'No se pide', '—'].includes(v) ? 'privacidad__apagado' : null);
    const secciones = [
        ['objeto', '1. Objeto, alcance y marco normativo'],
        ['intermediario', '2. Identificación del Intermediario'],
        ['principios', '3. Principios de tratamiento'],
        ['datos', '4. Qué datos podemos tratar'],
        ['finalidades', '5. Finalidades del tratamiento'],
        ['bases', '6. Bases y legitimación del tratamiento'],
        ['formularios', '7. Información y consentimiento en formularios'],
        ['publicidad', '8. Publicidad y comunicaciones comerciales'],
        ['perfiles', '9. Perfiles públicos y datos publicados por Usuarios'],
        ['conectar', '10. Datos de contacto y función “Conectar”'],
        ['resenas', '11. Reseñas, calificaciones y contenido de comunidad'],
        ['curriculum', '12. Perfil laboral: “Currículum”'],
        ['conservacion', '13. Conservación y eliminación de datos'],
        ['derechos', '14. Derechos de los titulares'],
        ['cumplimiento', '15. Bases de datos y cumplimiento formal'],
        ['proveedores', '16. Proveedores y encargados del tratamiento'],
        ['transferencias', '17. Transferencias internacionales'],
        ['seguridad', '18. Seguridad de la información'],
        ['vulneraciones', '19. Vulneraciones de seguridad'],
        ['cookies', '20. Cookies y tecnologías similares'],
        ['categorias-cookies', '21. Categorías de cookies'],
        ['preferencias-cookies', '22. Panel de preferencias de cookies'],
        ['publicaciones', '23. Publicaciones de Prestadores'],
        ['derechos-terceros', '24. Fotografías, marcas, logotipos y derechos de terceros'],
        ['comunidad', '25. Reseñas y comunidad'],
        ['posicionamiento', '26. Criterios de posicionamiento'],
        ['suscripciones', '27. Suscripciones y pagos de RED NEXA'],
        ['reclamos', '28. Reclamos, denuncias y solicitudes'],
        ['notificacion', '29. Propiedad intelectual y procedimiento de notificación'],
        ['menores', '30. Menores de edad'],
        ['automatizadas', '31. Decisiones automatizadas y herramientas tecnológicas'],
        ['actualizacion', '32. Actualización de estas Políticas'],
        ['terminos', '33. Relación con los Términos y Condiciones'],
        ['contacto', '34. Contacto y autoridad de control'],
        ['empresa', '35. Datos de la empresa y vigencia']
    ];
    const cuerpo = html`
    <div class="pagina-texto privacidad">
        <header class="privacidad__cabecera">
            <h1 class="pagina-texto__titulo">Políticas de Red Nexa</h1>
            <p class="pagina-texto__bajada">Privacidad, cookies, publicaciones, comunidad, suscripciones y reclamos.</p>
            <p class="legal__fecha">Última actualización: 11 de noviembre de 2026</p>
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
        <div class="legal">
            ${indiceLegal(secciones)}
            <article class="legal__texto">
                <section id="objeto" class="legal__seccion">
                    <h2>1. Objeto, alcance y marco normativo</h2>
                    <p>El presente documento reúne las políticas que regulan aspectos específicos del funcionamiento de RED NEXA y complementa los <a href="/terminos">Términos y Condiciones de RED NEXA</a>.</p>
                    <p>Las políticas se aplican a Visitantes, Usuarios Registrados, Prestadores y demás personas que interactúen con la Plataforma, según corresponda a cada funcionalidad.</p>
                    <p>RED NEXA adopta estas políticas de conformidad con la normativa uruguaya aplicable, incluyendo la Ley N.º 18.331 de Protección de Datos Personales y Acción de Habeas Data y su Decreto N.º 414/009; las modificaciones introducidas por la Ley N.º 19.670 y el Decreto N.º 64/020; la Resolución URCDP N.º 64/013 sobre políticas de privacidad; la normativa y guías de la URCDP sobre cookies, seguridad, transferencias internacionales y responsabilidad proactiva; y la Ley N.º 17.250 de Relaciones de Consumo, su normativa reglamentaria y las disposiciones sobre comercio electrónico aplicables.</p>
                    <p>La normativa indicada constituye el marco de referencia y no limita la aplicación de otras disposiciones imperativas que correspondan a la actividad concreta de RED NEXA.</p>
                </section>

                <section id="intermediario" class="legal__seccion">
                    <h2>2. Identificación del Intermediario</h2>
                    <ul class="legal__lista">
                        <li><strong>Nombre comercial:</strong> RED NEXA</li>
                        <li><strong>Tipo societario:</strong> Propietario</li>
                        <li><strong>Domicilio:</strong> Mata 636, Melo</li>
                        <li><strong>Departamento:</strong> Cerro Largo, Uruguay</li>
                        <li><strong>Correo de contacto para privacidad y ejercicio de derechos:</strong> ${SITIO.correo}</li>
                    </ul>
                </section>

                <section id="principios" class="legal__seccion">
                    <h2>3. Principios de tratamiento</h2>
                    <p>RED NEXA tratará los datos personales respetando los principios de legalidad, veracidad, finalidad, proporcionalidad, seguridad, reserva y responsabilidad proactiva, procurando que los datos sean adecuados, pertinentes y no excesivos para las finalidades informadas.</p>
                    <p>RED NEXA aplicará, cuando corresponda, criterios de privacidad desde el diseño y privacidad por defecto, y mantendrá medidas destinadas a demostrar el cumplimiento de sus obligaciones.</p>
                    <p>RED NEXA no ejecuta, dirige, ni supervisa materialmente los trabajos ofrecidos por los prestadores publicados, tampoco interviene como parte en los acuerdos que estos celebren directamente con los usuarios interesados.</p>
                    <p>La publicación de información, perfiles, datos de contacto, u otros contenidos proporcionados, no implica que RED NEXA certifique la experiencia, habilidad técnica o profesional, disponibilidad o calidad de los servicios.</p>
                </section>

                <section id="datos" class="legal__seccion">
                    <h2>4. Qué datos podemos tratar</h2>
                    <p>Dependiendo de la funcionalidad utilizada, RED NEXA podrá tratar:</p>
                    <ul class="legal__lista">
                        <li><strong>Datos identificatorios:</strong> nombre, apellido, nombre de usuario y otros identificadores.</li>
                        <li><strong>Datos de contacto:</strong> correo electrónico, teléfono y medios de contacto que el usuario decida proporcionar.</li>
                        <li><strong>Datos de cuenta:</strong> credenciales, estado de la cuenta, preferencias, historial de aceptación de documentos y configuraciones.</li>
                        <li><strong>Datos de Prestadores:</strong> nombre comercial, fotografía, descripción, servicios, experiencia, ubicación, redes sociales, matrícula, título, registro o habilitación cuando corresponda y demás información incorporada al Perfil.</li>
                        <li><strong>Datos de perfil laboral:</strong> información curricular, formación, experiencia, habilidades y disponibilidad publicada mediante “Busco Job / Currículum”.</li>
                        <li><strong>Datos de uso y técnicos:</strong> dirección IP, identificadores técnicos, navegador, dispositivo, fecha y hora de acceso, registros de actividad y datos necesarios para seguridad y funcionamiento.</li>
                        <li><strong>Datos de suscripción y facturación:</strong> plan contratado, estado de suscripción, historial de pagos y datos necesarios para gestionar la relación comercial. Los datos completos de tarjetas podrán ser procesados directamente por el proveedor de pagos y no necesariamente serán almacenados por RED NEXA.</li>
                        <li><strong>Contenido generado por usuarios:</strong> reseñas, calificaciones, respuestas, fotografías, textos, denuncias y comunicaciones realizadas a través de funcionalidades de la Plataforma.</li>
                    </ul>
                    <p>RED NEXA procurará no solicitar datos personales que no sean necesarios para la finalidad correspondiente.</p>
                </section>

                <section id="finalidades" class="legal__seccion">
                    <h2>5. Finalidades del tratamiento</h2>
                    <p>Los datos podrán ser tratados para:</p>
                    <ul class="legal__lista">
                        <li>Crear, autenticar, administrar y proteger cuentas.</li>
                        <li>Permitir la publicación y gestión de Perfiles y servicios.</li>
                        <li>Facilitar el contacto entre Usuarios y Prestadores.</li>
                        <li>Permitir el uso de “Busco Job / Currículum”.</li>
                        <li>Gestionar reseñas, calificaciones, respuestas y mecanismos de comunidad.</li>
                        <li>Procesar y administrar suscripciones, cobros, facturación y cancelaciones.</li>
                        <li>Atender consultas, reclamos, denuncias y solicitudes.</li>
                        <li>Prevenir fraude, abuso, suplantación, manipulación de reseñas y usos ilícitos.</li>
                        <li>Proteger la seguridad de la Plataforma y de sus usuarios.</li>
                        <li>Cumplir obligaciones legales, regulatorias, judiciales o administrativas.</li>
                        <li>Realizar análisis estadísticos y técnicos, preferentemente mediante información agregada o disociada cuando sea posible.</li>
                        <li>Mejorar, mantener y desarrollar funcionalidades.</li>
                        <li>Enviar comunicaciones operativas relacionadas con la cuenta, seguridad, pagos o funcionamiento.</li>
                        <li>Enviar comunicaciones comerciales cuando exista una base jurídica válida y se respeten los mecanismos de consentimiento y exclusión aplicables.</li>
                    </ul>
                </section>

                <section id="bases" class="legal__seccion">
                    <h2>6. Bases y legitimación del tratamiento</h2>
                    <p>RED NEXA tratará datos personales únicamente cuando exista una base jurídica válida conforme a la normativa aplicable. Según el caso, podrá fundarse en el consentimiento del titular, la ejecución de una relación contractual o precontractual, el cumplimiento de obligaciones legales, la protección de derechos o intereses legítimos cuando resulte jurídicamente admisible, u otra base prevista por la normativa.</p>
                    <p>Cuando el tratamiento requiera consentimiento, este deberá ser libre, previo, expreso, informado y documentado. El consentimiento podrá retirarse, sin perjuicio de que determinados tratamientos puedan continuar cuando exista otra base jurídica válida.</p>
                    <p>Las casillas de aceptación de términos y las casillas de consentimiento para finalidades adicionales deberán diferenciarse cuando corresponda.</p>
                </section>

                <section id="formularios" class="legal__seccion">
                    <h2>7. Información y consentimiento en formularios</h2>
                    <p>Cuando RED NEXA recopile datos mediante formularios web, procurará informar antes de la recolección la identidad del responsable, finalidad, carácter obligatorio o facultativo de los datos, consecuencias de proporcionarlos o no, derechos del titular y demás información exigida por la normativa.</p>
                    <p>Los formularios destinados a comunicaciones comerciales deberán permitir gestionar las preferencias de comunicación de manera clara y sencilla.</p>
                </section>

                <section id="publicidad" class="legal__seccion">
                    <h2>8. Publicidad y comunicaciones comerciales</h2>
                    <p>RED NEXA podrá enviar comunicaciones necesarias para la administración de la cuenta, seguridad, cambios de servicio, pagos, suscripciones y otras cuestiones operativas.</p>
                    <p>Las comunicaciones promocionales se enviarán únicamente cuando exista una base jurídica habilitante y se respeten las reglas aplicables. El destinatario podrá solicitar dejar de recibir comunicaciones comerciales mediante el mecanismo de baja disponible o mediante el canal indicado.</p>
                    <p>La baja de comunicaciones comerciales no impedirá el envío de comunicaciones estrictamente necesarias para la prestación del servicio.</p>
                </section>

                <section id="perfiles" class="legal__seccion">
                    <h2>9. Perfiles públicos y datos publicados por Usuarios</h2>
                    <p>Cuando un Usuario o Prestador decida publicar información en un Perfil, comprende que determinados datos podrán ser visibles para otros usuarios según la configuración de RED NEXA.</p>
                    <p>El Prestador es responsable de los datos de terceros que publique y deberá contar con una base jurídica suficiente para hacerlo.</p>
                    <p>RED NEXA podrá limitar la visibilidad de determinados datos, exigir modificaciones o retirar contenido cuando sea necesario para proteger la privacidad, cumplir la normativa o aplicar sus políticas.</p>
                </section>

                <section id="conectar" class="legal__seccion">
                    <h2>10. Datos de contacto y función “Conectar”</h2>
                    <p>La función “Conectar” podrá facilitar determinados datos de contacto de acuerdo con las configuraciones de la Plataforma.</p>
                    <p>RED NEXA no garantiza ni controla las comunicaciones posteriores entre usuarios. Cada persona deberá evitar publicar datos personales de terceros sin autorización o base jurídica suficiente.</p>
                    <p>RED NEXA podrá registrar datos técnicos relacionados con la utilización de la función para seguridad, prevención de abuso y funcionamiento.</p>
                </section>

                <section id="resenas" class="legal__seccion">
                    <h2>11. Reseñas, calificaciones y contenido de comunidad</h2>
                    <p>RED NEXA podrá tratar datos vinculados con reseñas y calificaciones para administrar el sistema de reputación de la Plataforma.</p>
                    <p>Las reseñas podrán incluir información personal aportada por quien publica y podrán quedar asociadas al Perfil correspondiente conforme a las reglas de RED NEXA.</p>
                    <p>No se permitirá publicar datos personales sensibles o innecesarios de terceros. RED NEXA podrá retirar, ocultar o limitar contenidos que vulneren estas políticas, los Términos o la normativa aplicable.</p>
                    <p>Los titulares podrán ejercer los derechos que correspondan sobre sus datos personales, sin perjuicio de las reglas específicas aplicables a opiniones y contenidos publicados por terceros.</p>
                </section>

                <section id="curriculum" class="legal__seccion">
                    <h2>12. Perfil laboral: “Currículum”</h2>
                    <p>La información curricular podrá contener datos personales vinculados con formación, experiencia, habilidades y disponibilidad.</p>
                    <p>RED NEXA procurará limitar la visibilidad de esta información a las funcionalidades y usuarios que correspondan. La persona que publica el perfil será responsable de la exactitud y de no incorporar datos de terceros sin autorización.</p>
                    <p>RED NEXA no garantiza la obtención de empleo ni participa en procesos de selección que puedan realizar terceros, salvo que una funcionalidad futura indique expresamente lo contrario.</p>
                    <p>RED NEXA no garantiza que los datos aportados por el usuario en su Currículum sean reales.</p>
                </section>

                <section id="conservacion" class="legal__seccion">
                    <h2>13. Conservación y eliminación de datos</h2>
                    <p>RED NEXA conservará los datos personales durante el tiempo necesario para cumplir las finalidades informadas, mantener la relación contractual, atender reclamos, cumplir obligaciones legales, ejercer o defender derechos y cumplir otras obligaciones legítimas.</p>
                    <p>Cuando los datos dejen de ser necesarios, serán eliminados, anonimizados o conservados únicamente cuando exista una base legal para ello.</p>
                    <p>La eliminación de una cuenta no implica necesariamente la eliminación inmediata de toda información cuando exista una obligación legal de conservación, una necesidad legítima de seguridad, prevención de fraude, defensa ante reclamos u otra base jurídica.</p>
                </section>

                <section id="derechos" class="legal__seccion">
                    <h2>14. Derechos de los titulares</h2>
                    <p>Las personas podrán ejercer, conforme a la normativa aplicable, los derechos de información, acceso, actualización, rectificación, inclusión, supresión, impugnación de valoraciones personales y los demás derechos reconocidos por la legislación.</p>
                    <p>Las solicitudes podrán realizarse mediante el correo ${SITIO.correo} o el formulario de <a href="/contacto">Contacto</a>. RED NEXA responderá dentro de los plazos legales aplicables. La URCDP informa que las solicitudes de acceso, rectificación o supresión tienen mecanismos específicos y que las solicitudes deben ser respondidas en un plazo máximo de cinco días hábiles cuando corresponda.</p>
                    <p>El titular podrá asimismo recurrir ante la Unidad Reguladora y de Control de Datos Personales (URCDP) cuando considere que sus derechos han sido vulnerados.</p>
                </section>

                <section id="cumplimiento" class="legal__seccion">
                    <h2>15. Bases de datos y cumplimiento formal</h2>
                    <p>RED NEXA realizará las inscripciones, comunicaciones y demás gestiones ante la URCDP que resulten exigibles respecto de sus bases de datos y tratamientos.</p>
                    <p>La empresa evaluará periódicamente si corresponde designar un Delegado de Protección de Datos Personales, realizar una evaluación de impacto o adoptar medidas adicionales según el volumen, naturaleza y riesgos de los tratamientos.</p>
                </section>

                <section id="proveedores" class="legal__seccion">
                    <h2>16. Proveedores y encargados del tratamiento</h2>
                    <p>RED NEXA podrá utilizar proveedores tecnológicos, alojamiento, correo electrónico, analítica, seguridad, soporte, atención al cliente, procesamiento de pagos y otros servicios necesarios para operar la Plataforma.</p>
                    <p>Cuando un tercero trate datos personales por cuenta de RED NEXA, se procurará que exista el marco contractual y las garantías de seguridad y confidencialidad exigibles.</p>
                    <p>Los proveedores podrán estar ubicados en Uruguay o en otros países. En estos casos se observarán las reglas aplicables a transferencias internacionales.</p>
                </section>

                <section id="transferencias" class="legal__seccion">
                    <h2>17. Transferencias internacionales</h2>
                    <p>RED NEXA podrá utilizar infraestructura o proveedores ubicados fuera de Uruguay, lo que podrá implicar transferencias internacionales de datos personales.</p>
                    <p>Las transferencias se realizarán de acuerdo con la normativa uruguaya aplicable, incluyendo las reglas sobre países u organizaciones adecuadas, garantías apropiadas, inscripción de bases y autorizaciones cuando correspondan.</p>
                    <p>Cuando resulte necesario, RED NEXA podrá utilizar cláusulas contractuales u otras garantías reconocidas por la normativa y las recomendaciones vigentes de la URCDP.</p>
                </section>

                <section id="seguridad" class="legal__seccion">
                    <h2>18. Seguridad de la información</h2>
                    <p>RED NEXA implementará medidas técnicas y organizativas razonables y proporcionales al riesgo para proteger los datos contra pérdida, destrucción, alteración, divulgación o acceso no autorizado.</p>
                    <p>Entre otras medidas, podrá utilizar controles de acceso, autenticación, cifrado cuando corresponda, registros de actividad, copias de seguridad, gestión de proveedores y procedimientos de respuesta a incidentes.</p>
                    <p>Ningún sistema puede garantizar seguridad absoluta.</p>
                </section>

                <section id="vulneraciones" class="legal__seccion">
                    <h2>19. Vulneraciones de seguridad</h2>
                    <p>Ante una vulneración que afecte datos personales, RED NEXA activará sus procedimientos internos para contener y minimizar el impacto.</p>
                    <p>Cuando corresponda, RED NEXA comunicará la vulneración a la URCDP dentro del plazo legal aplicable y comunicará el incidente a los titulares afectados cuando la normativa determine que existe una afectación significativa de sus derechos.</p>
                    <p>Los encargados del tratamiento deberán comunicar a RED NEXA, sin demora indebida, cualquier incidente que pueda afectar datos tratados por cuenta de la empresa.</p>
                </section>

                <section id="cookies" class="legal__seccion">
                    <h2>20. Cookies y tecnologías similares</h2>
                    <p>RED NEXA podrá utilizar cookies, píxeles, SDK, almacenamiento local y tecnologías similares para permitir el funcionamiento del sitio, recordar preferencias, mantener sesiones, mejorar seguridad, obtener estadísticas y, cuando corresponda y exista base jurídica válida, analizar navegación o realizar medición y publicidad.</p>
                    <p>Las cookies pueden ser propias o de terceros, y pueden ser de sesión o persistentes.</p>
                    <p>La Guía de Cookies y Perfiles de la URCDP considera que las cookies pueden implicar tratamiento de datos personales y recomienda aplicar a su utilización la normativa de protección de datos. RED NEXA seguirá ese enfoque.</p>
                    <p>Cuando corresponda, las cookies no esenciales deberán gestionarse mediante un mecanismo de preferencias que permita al usuario aceptar, rechazar o configurar categorías de cookies, sin condicionar injustificadamente el acceso al servicio.</p>
                </section>

                <section id="categorias-cookies" class="legal__seccion">
                    <h2>21. Categorías de cookies</h2>
                    <ul class="legal__lista">
                        <li><strong>Cookies estrictamente necesarias:</strong> necesarias para seguridad, autenticación, sesión o funcionamiento esencial.</li>
                        <li><strong>Cookies de preferencias:</strong> permiten recordar elecciones realizadas por el usuario.</li>
                        <li><strong>Cookies analíticas o de medición:</strong> permiten conocer cómo se utiliza la Plataforma y mejorar su funcionamiento.</li>
                        <li><strong>Cookies de publicidad o personalización:</strong> podrán utilizarse para medir campañas, limitar frecuencia, personalizar contenidos o publicidad, cuando corresponda y exista base jurídica válida.</li>
                        <li><strong>Cookies de terceros:</strong> instaladas o gestionadas por proveedores externos incorporados a la Plataforma.</li>
                    </ul>
                    <p>La lista concreta de cookies, proveedor, finalidad, duración, tipo y mecanismo de gestión deberá mantenerse actualizada conforme a las tecnologías efectivamente utilizadas por RED NEXA.</p>
                </section>

                <section id="preferencias-cookies" class="legal__seccion">
                    <h2>22. Panel de preferencias de cookies</h2>
                    <p>RED NEXA deberá implementar, antes del lanzamiento, un mecanismo técnico que permita gestionar las categorías de cookies que requieran consentimiento y registrar, cuando corresponda, la elección del usuario.</p>
                    <p>La configuración del navegador puede permitir bloquear o eliminar cookies, aunque determinadas funcionalidades esenciales pueden dejar de funcionar.</p>
                </section>

                <section id="publicaciones" class="legal__seccion">
                    <h2>23. Publicaciones de Prestadores</h2>
                    <p>Los Prestadores son responsables de la veracidad, actualidad y legalidad de los contenidos que publiquen.</p>
                    <p>No podrán publicarse servicios ilegales, engañosos, discriminatorios, fraudulentos, que vulneren derechos de terceros o que requieran una habilitación que el Prestador no posea.</p>
                    <p>Cuando una profesión sea regulada, el Prestador deberá contar con la matrícula, título, habilitación, registro o autorización que corresponda.</p>
                    <p>RED NEXA podrá solicitar documentación adicional, limitar una publicación, cambiar su categoría, ocultarla o retirarla cuando existan motivos razonables relacionados con seguridad, legalidad, veracidad o cumplimiento.</p>
                </section>

                <section id="derechos-terceros" class="legal__seccion">
                    <h2>24. Fotografías, marcas, logotipos y derechos de terceros</h2>
                    <p>Quien publique fotografías, marcas, logotipos, textos, videos o cualquier contenido declara contar con los derechos o autorizaciones necesarias.</p>
                    <p>RED NEXA podrá retirar contenido ante una denuncia razonable de infracción de derechos de autor, marca, imagen, privacidad u otros derechos.</p>
                    <p>La protección de los derechos de autor y demás derechos de propiedad intelectual se interpretará conforme a la legislación uruguaya aplicable.</p>
                </section>

                <section id="comunidad" class="legal__seccion">
                    <h2>25. Reseñas y comunidad</h2>
                    <p>Las reseñas deben reflejar experiencias u opiniones reales y respetar los derechos de terceros.</p>
                    <p>Está prohibido crear reseñas falsas, manipular calificaciones, utilizar cuentas ficticias, ofrecer incentivos engañosos para obtener valoraciones o coordinar acciones destinadas a alterar artificialmente la reputación de un Perfil.</p>
                    <p>No se admitirán amenazas, hostigamiento, discriminación, divulgación de datos privados, contenido ilegal, spam ni acusaciones que infrinjan derechos de terceros.</p>
                    <p>RED NEXA podrá moderar contenidos de forma automática, manual o mediante herramientas tecnológicas de apoyo. Las decisiones relevantes podrán ser revisadas mediante los canales establecidos.</p>
                </section>

                <section id="posicionamiento" class="legal__seccion">
                    <h2>26. Criterios de posicionamiento</h2>
                    <p>Los Perfiles podrán ordenarse mediante criterios técnicos y comerciales. Estos podrán incluir actividad, completitud, categoría, ubicación, cantidad y promedio de reseñas, disponibilidad de funcionalidades, promociones y otros factores.</p>
                    <p>Cuando un factor comercial influya en el posicionamiento de manera relevante, RED NEXA procurará informarlo de manera clara.</p>
                    <p>El posicionamiento no constituye recomendación profesional ni garantía de calidad.</p>
                </section>

                <section id="suscripciones" class="legal__seccion">
                    <h2>27. Suscripciones y pagos de RED NEXA</h2>
                    <p>Las suscripciones contratadas por Prestadores se regirán por los precios, planes y condiciones informados al momento de la contratación y por los Términos y Condiciones de RED NEXA.</p>
                    <p>Los pagos podrán ser procesados por proveedores externos. RED NEXA podrá recibir información necesaria para administrar la suscripción, pero el proveedor de pagos podrá ser quien procese directamente los datos financieros sensibles.</p>
                    <p>Cuando exista renovación automática, la información sobre precio, periodicidad, período de prueba, fecha de inicio del cobro y mecanismo de cancelación deberá ser presentada de forma clara antes de la contratación.</p>
                    <p>Los cambios de precio serán comunicados conforme a los Términos y a la normativa aplicable.</p>
                </section>

                <section id="reclamos" class="legal__seccion">
                    <h2>28. Reclamos, denuncias y solicitudes</h2>
                    <p>RED NEXA dispondrá de un canal para reclamos y denuncias: el correo ${SITIO.correo} y el formulario de <a href="/contacto">Contacto</a>.</p>
                    <p>Podrán denunciarse perfiles, servicios, reseñas, contenidos, conductas, problemas de privacidad, posibles fraudes, infracciones de derechos y otros incumplimientos.</p>
                    <p>RED NEXA podrá solicitar información adicional para evaluar la denuncia y podrá adoptar medidas provisionales cuando exista riesgo para usuarios, terceros o la Plataforma.</p>
                    <p>Los reclamos relacionados exclusivamente con la ejecución de un servicio contratado entre Usuario y Prestador deberán dirigirse al Prestador, sin perjuicio de que RED NEXA pueda recibir denuncias sobre incumplimientos de las reglas de la Plataforma.</p>
                </section>

                <section id="notificacion" class="legal__seccion">
                    <h2>29. Propiedad intelectual y procedimiento de notificación</h2>
                    <p>Las personas que consideren que un contenido publicado en RED NEXA infringe sus derechos podrán comunicarlo mediante el correo ${SITIO.correo} o el formulario de <a href="/contacto">Contacto</a>, identificando el contenido, derecho afectado y fundamentos de la denuncia.</p>
                    <p>RED NEXA podrá retirar o limitar provisionalmente el acceso al contenido mientras analiza la situación, sin perjuicio de los derechos de las partes y de los procedimientos legales aplicables.</p>
                </section>

                <section id="menores" class="legal__seccion">
                    <h2>30. Menores de edad</h2>
                    <p>RED NEXA podrá permitir que determinadas funcionalidades sean utilizadas por menores únicamente cuando ello sea compatible con la naturaleza de la funcionalidad y la normativa aplicable.</p>
                    <p>No podrán registrarse como Prestadores ni contratar funcionalidades reservadas a mayores de dieciocho (18) años quienes no cumplan dicho requisito.</p>
                    <p>RED NEXA no solicitará deliberadamente datos sensibles de menores para finalidades no necesarias. Si se detecta la recopilación indebida de datos de un menor, podrán adoptarse medidas para su eliminación o restricción conforme a la normativa.</p>
                </section>

                <section id="automatizadas" class="legal__seccion">
                    <h2>31. Decisiones automatizadas y herramientas tecnológicas</h2>
                    <p>RED NEXA podrá utilizar sistemas automatizados o herramientas de apoyo para seguridad, detección de fraude, clasificación de contenidos, prevención de spam, moderación y posicionamiento.</p>
                    <p>Cuando un tratamiento automatizado produzca efectos jurídicos o afecte significativamente a una persona y la normativa otorgue derechos específicos, RED NEXA aplicará las garantías que correspondan.</p>
                    <p>La utilización de herramientas automatizadas no exime a RED NEXA de sus obligaciones de responsabilidad proactiva.</p>
                </section>

                <section id="actualizacion" class="legal__seccion">
                    <h2>32. Actualización de estas Políticas</h2>
                    <p>RED NEXA podrá modificar estas Políticas para reflejar cambios legales, tecnológicos, comerciales o funcionales.</p>
                    <p>Las modificaciones relevantes serán publicadas con su fecha de actualización y, cuando corresponda, comunicadas o sometidas a nueva aceptación.</p>
                    <p>La versión vigente permanecerá disponible en el sitio web.</p>
                </section>

                <section id="terminos" class="legal__seccion">
                    <h2>33. Relación con los Términos y Condiciones</h2>
                    <p>Estas Políticas complementan los <a href="/terminos">Términos y Condiciones de RED NEXA</a>. Ambos documentos deberán interpretarse conjuntamente.</p>
                    <p>Las condiciones específicas de una funcionalidad podrán contener reglas adicionales, siempre que sean compatibles con los Términos y estas Políticas.</p>
                </section>

                <section id="contacto" class="legal__seccion">
                    <h2>34. Contacto y autoridad de control</h2>
                    <p>Para consultas, solicitudes relacionadas con datos personales, denuncias de privacidad o ejercicio de derechos: ${SITIO.correo}</p>
                    <p>La Unidad Reguladora y de Control de Datos Personales (URCDP) es la autoridad competente en materia de protección de datos personales en Uruguay. Los titulares pueden recurrir ante ella cuando consideren que sus derechos han sido vulnerados.</p>
                </section>

                <section id="empresa" class="legal__seccion">
                    <h2>35. Datos de la empresa y vigencia</h2>
                    <ul class="legal__lista">
                        <li><strong>Nombre comercial:</strong> RED NEXA</li>
                        <li><strong>Domicilio:</strong> Mata 636, Melo, Cerro Largo</li>
                        <li><strong>Correo electrónico:</strong> ${SITIO.correo}</li>
                        <li><strong>Última actualización:</strong> 11 de noviembre de 2026</li>
                    </ul>
                </section>
            </article>
        </div>
    </div>`;
    return { titulo: 'Políticas', cuerpo };
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
