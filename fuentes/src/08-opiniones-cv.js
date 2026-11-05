// ===================== Opinar, reportar, opiniones recibidas (U02, U09 a U12, V05) y Mi curriculum (U08) =====================

const sinAncla = (v) => (esLocal(v) ? v.split('#')[0] : null);

function volverAFicha(volver, slugPerfil) {
    const r = sinAncla(volver);
    return r && (r === `/${slugPerfil}` || r.startsWith(`/${slugPerfil}/`) || r.startsWith(`/${slugPerfil}?`)) ? r : `/${slugPerfil}`;
}

const admins = () => db.usuarios.filter((u) => u.admin && u.estado === 'Activo');

// ---------- Opinar (U02, U12) ----------

function pOpinar(ctx, slugPerfil, m = null, errores = {}, terminosForm = null) {
    const perfil = db.perfiles.find((p) => p.slug === slugPerfil && p.estado === 'Activo');
    if (!perfil) return null;
    const yo = ctx.usuario;
    const prov = proveedorDe(perfil);
    const existente = db.resenas.find((r) => r.perfilId === perfil.id && r.usuarioId === yo.id) || null;
    const esPropio = perfil.usuarioId === yo.id;
    const volver = m ? m.Volver : ctx.query.get('volver');
    const volverA = volverAFicha(volver, slugPerfil);
    const retenida = !!existente && existente.estado === 'Oculta' && existente.ocultaPorFiltro;
    const ocultaPorAdmin = !!existente && existente.estado === 'Oculta' && !existente.ocultaPorFiltro;
    m ||= { Calificacion: existente ? String(existente.calificacion) : null, Comentario: existente ? existente.comentario : '', Volver: volver || '' };
    const terminos = terminosForm ?? (retenida ? existente.terminos : []);
    const puedeOpinar = !esPropio && yo.confirmado;
    const boton = retenida ? 'Editar y publicar' : existente ? 'Guardar cambios' : 'Publicar opinión';
    const largo = (m.Comentario || '').length;
    let contenido;
    if (esPropio) {
        contenido = html`<p class="acceso__texto">Es tu propio perfil. Las opiniones las dejan las personas que contrataron tus servicios.</p>
            <a class="boton boton--secundario boton--ancho" href="${volverA}">Volver a la ficha</a>`;
    } else if (!yo.confirmado) {
        contenido = html`<p class="aviso aviso--alerta" role="status">Confirmá tu correo para poder opinar.</p>
            <p class="acceso__texto">Te mandamos un enlace cuando creaste la cuenta. Si no lo encontrás, te mandamos otro: al abrirlo, volvé a esta ficha.</p>
            <form action="/confirmar/reenviar" method="post"><button type="submit" class="boton boton--primario boton--ancho">Reenviar el correo</button></form>`;
    } else if (ocultaPorAdmin) {
        contenido = html`<p class="aviso aviso--error" role="status">La administración ocultó tu opinión y no se ve en la ficha.</p>
            <p class="acceso__texto">Si creés que es un error, escribinos a <a href="mailto:${SITIO.correo}">${SITIO.correo}</a>.</p>
            <a class="boton boton--secundario boton--ancho" href="${volverA}">Volver a la ficha</a>`;
    } else {
        contenido = html`
            ${retenida && terminos.length ? html`<p class="aviso aviso--error aviso--icono" role="alert">${icono('alerta')}<span>Tu opinión no se publicó porque incluye palabras que no se permiten (marcadas abajo). Podés editarla y se publica sola.</span></p>` : ''}
            <form class="formulario" method="post" action="/${slugPerfil}/opinar" novalidate data-envio-unico>
                ${resumen(errores)}
                <input type="hidden" id="Volver" name="Volver" value="${m.Volver ?? ''}" />
                <fieldset class="campo calificar" aria-describedby="calificacion-error">
                    <legend class="campo__etiqueta">Calificación</legend>
                    <div class="calificar__estrellas">
                        ${[1, 2, 3, 4, 5].map((i) => html`<input class="calificar__radio sr-only" type="radio" id="calificacion-${i}" name="Calificacion" value="${i}"${bool('checked', String(m.Calificacion) === String(i))} />
                            <label class="calificar__estrella" for="calificacion-${i}"><span aria-hidden="true">★</span><span class="sr-only">${i === 1 ? '1 estrella' : `${i} estrellas`}: ${NOMBRE_CALIFICACION[i]}</span></label>`)}
                        ${[1, 2, 3, 4, 5].map((i) => html`<span class="calificar__nombre" data-estrellas="${i}" aria-hidden="true">${NOMBRE_CALIFICACION[i]}</span>`)}
                    </div>
                    ${errorDe(errores, 'Calificacion', { id: 'calificacion-error' })}
                </fieldset>
                <div class="campo">
                    <label class="campo__etiqueta" for="Comentario">Comentario</label>
                    <textarea class="control control--texto${conError(errores, 'Comentario')}" id="Comentario" name="Comentario" rows="5" maxlength="1000" aria-describedby="comentario-ayuda">${m.Comentario ?? ''}</textarea>
                    <div class="campo__pie">
                        <p class="campo__ayuda" id="comentario-ayuda" data-minimo-de="Comentario" data-minimo="20">Contá cómo te fue, en 20 caracteres o más.</p>
                        <span class="campo__contador" data-contador-de="Comentario">${largo} / 1000</span>
                    </div>
                    ${errorDe(errores, 'Comentario')}
                    ${resaltado(m.Comentario, terminos)}
                </div>
                <p class="acceso__nota">Podés dejar una sola opinión por proveedor y editarla cuando quieras.</p>
                <div class="formulario__acciones formulario__acciones--par">
                    <a class="boton boton--secundario" href="${volverA}">Cancelar</a>
                    <button type="submit" class="boton boton--primario">${boton}</button>
                </div>
            </form>`;
    }
    const cuerpo = html`
    <div class="acceso">
        <section class="acceso__tarjeta acceso__tarjeta--dialogo" aria-labelledby="opinar-titulo">
            <div class="acceso__titulos">
                <h1 id="opinar-titulo" class="acceso__titulo">Tu opinión sobre ${prov}</h1>
                ${puedeOpinar ? html`<p class="acceso__bajada">Se publica con tu nombre e inicial: ${nombreConInicial(yo.nombre, yo.apellido)}</p>` : ''}
            </div>
            ${contenido}
        </section>
    </div>`;
    return { titulo: `Tu opinión sobre ${prov}`, enfocado: true, volver: volverA, volverTexto: 'Volver a la ficha', cuerpo };
}

function postOpinar(ctx, slugPerfil, d) {
    const perfil = db.perfiles.find((p) => p.slug === slugPerfil && p.estado === 'Activo');
    const yo = ctx.usuario;
    if (!perfil || perfil.usuarioId === yo.id || !yo.confirmado) return pOpinar(ctx, slugPerfil, d);
    const existente = db.resenas.find((r) => r.perfilId === perfil.id && r.usuarioId === yo.id) || null;
    if (existente && existente.estado === 'Oculta' && !existente.ocultaPorFiltro) return pOpinar(ctx, slugPerfil, d);
    const errores = {};
    const cal = entero(d.Calificacion);
    if (!(cal >= 1 && cal <= 5)) errores.Calificacion = 'Elegí de 1 a 5 estrellas.';
    const comentario = (d.Comentario || '').trim();
    if (!comentario) errores.Comentario = 'Escribí un comentario: contá cómo te fue.';
    else if (comentario.length < 20) {
        const faltan = 20 - comentario.length;
        errores.Comentario = faltan === 1 ? 'Contá un poco más: falta 1 carácter.' : `Contá un poco más: faltan ${faltan} caracteres.`;
    } else if (comentario.length > 1000) errores.Comentario = 'El comentario puede tener hasta 1000 caracteres.';
    if (Object.keys(errores).length) return pOpinar(ctx, slugPerfil, d, errores);

    const terminos = filtroActual().analizar(comentario);
    const t = ahora();
    let r = existente;
    const nueva = !r;
    const antesVisible = r && r.estado !== 'Oculta';
    if (!r) {
        r = { id: nuevoId('resenas'), perfilId: perfil.id, usuarioId: yo.id, creacion: t, modificacion: null, respuesta: null, estado: 'Publicada', ocultaPorFiltro: false, terminos: [] };
        db.resenas.push(r);
    } else {
        r.modificacion = t;
    }
    r.calificacion = cal;
    r.comentario = comentario;
    if (terminos.length) {
        // RN-55 y RN-56: queda guardada pero no se publica.
        Object.assign(r, { estado: 'Oculta', ocultaPorFiltro: true, terminos });
        return { redirect: conVolver(`/${slugPerfil}/opinar`, d.Volver) };
    }
    if (r.estado === 'Oculta') Object.assign(r, { estado: 'Publicada', ocultaPorFiltro: false, terminos: [] });
    if (!antesVisible) {
        const proveedor = usuarioDe(perfil.usuarioId);
        if (proveedor.correo) {
            enviarCorreo({
                para: proveedor.correo, asunto: 'Recibiste una nueva opinión', nombre: proveedor.nombre,
                texto: `${nombreConInicial(yo.nombre, yo.apellido)} dejó una opinión de ${cal === 1 ? '1 estrella' : `${cal} estrellas`} sobre tu perfil en Red Nexa: «${comentario}»`,
                boton: 'Ver mis opiniones', enlace: '/mi-perfil/opiniones',
                pie: 'Podés responderla una vez, en público, desde tu panel. Si creés que no corresponde, podés reportarla y la administración la revisa.'
            });
        }
    }
    return {
        redirect: volverAFicha(d.Volver, slugPerfil) + '#opiniones',
        aviso: nueva || !antesVisible ? 'Listo, publicamos tu opinión. Gracias por contar cómo te fue.' : 'Listo, guardamos los cambios de tu opinión.'
    };
}

// ---------- Reportar (U09 a U11, CU-12) ----------

function situacionReporte(yo, propio, yaReportada) {
    if (propio) return 'Propia';
    if (!yo.confirmado) return 'CorreoSinConfirmar';
    if (yaReportada) return 'YaReportada';
    if (reportesDeHoy(yo.id) >= 10) return 'TopeDiario';
    return 'Normal';
}

function vistaReportar(ctx, r, m = {}, errores = {}, terminos = []) {
    const cosa = r.esOpinion ? 'opinión' : 'publicación';
    const largo = (m.Comentario || '').length;
    let contenido;
    if (r.enviado) {
        contenido = html`${icono('hecho')}
            <h1 id="reporte-titulo" class="acceso__titulo">Gracias. La administración va a revisarlo.</h1>
            <p class="acceso__texto">La ${cosa} sigue visible hasta que la administración decida. No te vamos a escribir con el resultado.</p>
            <a class="boton boton--primario boton--ancho" href="${r.volverA}">${r.volverTexto}</a>`;
    } else {
        let cuerpoSituacion;
        switch (r.situacion) {
            case 'Propia':
                cuerpoSituacion = html`<p class="acceso__texto">${r.esOpinion ? 'Es tu propia opinión: no la podés reportar. Si querés cambiarla, editala desde la ficha.' : 'Es tu propia publicación: no la podés reportar.'}</p>
                    <a class="boton boton--secundario boton--ancho" href="${r.volverA}">${r.volverTexto}</a>`;
                break;
            case 'CorreoSinConfirmar':
                cuerpoSituacion = html`<p class="aviso aviso--alerta" role="status">Confirmá tu correo para poder reportar.</p>
                    <p class="acceso__texto">Te mandamos un enlace cuando creaste la cuenta. Si no lo encontrás, te mandamos otro.</p>
                    <form action="/confirmar/reenviar" method="post"><button type="submit" class="boton boton--primario boton--ancho">Reenviar el correo</button></form>`;
                break;
            case 'YaReportada':
                cuerpoSituacion = html`<p class="aviso" role="status">Ya reportaste esta ${cosa}. Está en revisión.</p>
                    <a class="boton boton--secundario boton--ancho" href="${r.volverA}">${r.volverTexto}</a>`;
                break;
            case 'TopeDiario':
                cuerpoSituacion = html`<p class="aviso aviso--alerta" role="status">Por hoy no podés enviar más reportes.</p>
                    <p class="acceso__texto">Hay un máximo de 10 por día, sumando opiniones y publicaciones. Mañana vas a poder enviar este.</p>
                    <a class="boton boton--secundario boton--ancho" href="${r.volverA}">${r.volverTexto}</a>`;
                break;
            default:
                cuerpoSituacion = html`<form class="formulario" method="post" action="${r.accion}" novalidate data-envio-unico data-reporte>
                    ${resumen(errores)}
                    <input type="hidden" id="Volver" name="Volver" value="${m.Volver ?? r.volverParam ?? ''}" />
                    <fieldset class="campo" aria-describedby="motivo-error">
                        <legend class="campo__etiqueta">Motivo</legend>
                        <div class="motivos">
                            ${r.motivos.map((mo) => html`<label class="eleccion">
                                <input type="radio" name="Motivo" value="${mo}"${bool('checked', m.Motivo === mo)}${mo === 'Otro' ? attr('data-motivo-otro', 'si') : ''} />
                                <span>${MOTIVOS[mo]}</span>
                            </label>`)}
                        </div>
                        ${errorDe(errores, 'Motivo', { id: 'motivo-error' })}
                    </fieldset>
                    <div class="campo">
                        <label class="campo__etiqueta" for="Comentario">Comentario <span class="campo__opcional">(opcional; obligatorio si el motivo es «Otro»)</span></label>
                        <textarea class="control control--texto${conError(errores, 'Comentario')}" id="Comentario" name="Comentario" rows="4" maxlength="500" placeholder="Contanos qué viste">${m.Comentario ?? ''}</textarea>
                        <div class="campo__pie"><span></span><span class="campo__contador" data-contador-de="Comentario">${largo} / 500</span></div>
                        ${errorDe(errores, 'Comentario')}
                        ${resaltado(m.Comentario, terminos)}
                    </div>
                    <p class="nota-suave">La ${cosa} sigue visible hasta que la administración la revise.</p>
                    <div class="formulario__acciones formulario__acciones--par">
                        <a class="boton boton--secundario" href="${r.volverA}">Cancelar</a>
                        <button type="submit" class="boton boton--primario">Enviar reporte</button>
                    </div>
                </form>`;
        }
        contenido = html`<div class="acceso__titulos">
                <h1 id="reporte-titulo" class="acceso__titulo">Reportar esta ${cosa}</h1>
                <p class="acceso__bajada">${r.subtitulo}</p>
            </div>
            ${cuerpoSituacion}`;
    }
    return {
        titulo: r.enviado ? 'Reporte enviado' : `Reportar esta ${cosa}`, enfocado: true, volver: r.volverA, volverTexto: r.volverTexto,
        cuerpo: html`<div class="acceso"><section class="acceso__tarjeta acceso__tarjeta--dialogo${r.enviado ? ' estado-acceso' : ''}" aria-labelledby="reporte-titulo">${contenido}</section></div>`
    };
}

function validarReporte(d, motivos) {
    const errores = {};
    if (!motivos.includes(d.Motivo)) errores.Motivo = 'Elegí el motivo del reporte.';
    const comentario = texto(d.Comentario);
    if (comentario && comentario.length > 500) errores.Comentario = 'El comentario puede tener hasta 500 caracteres.';
    else if (d.Motivo === 'Otro' && !comentario) errores.Comentario = 'Con el motivo «Otro», contanos qué viste.';
    let terminos = [];
    if (!errores.Comentario && comentario) {
        terminos = filtroActual().analizar(comentario);
        if (terminos.length) errores.Comentario = `Incluye palabras que no se permiten: ${listaTerminos(terminos)}. Cambialas para poder guardar.`;
    }
    return { errores, terminos, comentario };
}

function datosReporteOpinion(ctx, id, volver) {
    const r = db.resenas.find((x) => x.id === id && x.estado !== 'Oculta');
    if (!r) return null;
    const perfil = perfilDe(r.perfilId);
    if (perfil.estado !== 'Activo' && perfil.usuarioId !== ctx.usuario.id) return null;
    const yo = ctx.usuario;
    const porDefecto = `/${perfil.slug}#opiniones`;
    const volverA = sinAncla(volver) ?? porDefecto;
    return {
        resena: r, perfil, esOpinion: true,
        subtitulo: `Opinión de ${autorDe(r.usuarioId)} sobre ${proveedorDe(perfil)}`,
        situacion: situacionReporte(yo, r.usuarioId === yo.id, db.reportesResena.some((x) => x.resenaId === r.id && x.usuarioId === yo.id && x.estado === 'Pendiente')),
        accion: `/opiniones/${r.id}/reportar`, volverA, volverParam: volver,
        volverTexto: volverA.startsWith('/mi-perfil/opiniones') ? 'Volver a tus opiniones' : 'Volver a la ficha',
        motivos: MOTIVOS_OPINION
    };
}

function pReportarOpinion(ctx, id) {
    const r = datosReporteOpinion(ctx, id, ctx.query.get('volver'));
    if (!r) return null;
    r.enviado = ctx.flash.enviado === true;
    return vistaReportar(ctx, r, { Volver: ctx.query.get('volver') || '' });
}

function postReportarOpinion(ctx, id, d) {
    const r = datosReporteOpinion(ctx, id, d.Volver);
    if (!r) return null;
    if (r.situacion !== 'Normal') return vistaReportar(ctx, r, d);
    const { errores, terminos, comentario } = validarReporte(d, MOTIVOS_OPINION);
    if (Object.keys(errores).length) return vistaReportar(ctx, r, d, errores, terminos);
    const yo = ctx.usuario;
    db.reportesResena.push({ id: nuevoId('reportesResena'), resenaId: id, usuarioId: yo.id, motivo: d.Motivo, comentario, fecha: ahora(), estado: 'Pendiente', delProveedor: r.perfil.usuarioId === yo.id });
    const primera = r.resena.estado !== 'Reportada';
    r.resena.estado = 'Reportada';
    if (primera) {
        for (const a of admins()) {
            enviarCorreo({
                para: a.correo, asunto: 'Opinión reportada', nombre: a.nombre,
                texto: `Reportaron la opinión de ${autorDe(r.resena.usuarioId)} sobre ${proveedorDe(r.perfil)}. Motivo: ${MOTIVOS[d.Motivo].toLowerCase()}. Sigue visible hasta que decidas.`,
                boton: 'Moderar la opinión', enlace: `/admin/resenas/${id}`,
                pie: 'Si llegan más reportes sobre la misma opinión antes de que decidas, se suman en el panel sin otro correo.'
            });
        }
    }
    return { redirect: conVolver(`/opiniones/${id}/reportar`, d.Volver), flash: { enviado: true } };
}

function datosReportePublicacion(ctx, slugPerfil, servicioId) {
    const perfil = db.perfiles.find((p) => p.slug === slugPerfil && p.estado === 'Activo');
    const s = perfil && db.servicios.find((x) => x.id === servicioId && x.perfilId === perfil.id && x.estado === 'Publicado');
    if (!s) return null;
    const yo = ctx.usuario;
    return {
        servicio: s, perfil, esOpinion: false,
        subtitulo: `${proveedorDe(perfil)} · ${s.titulo}`,
        situacion: situacionReporte(yo, perfil.usuarioId === yo.id, db.reportesPublicacion.some((x) => x.servicioId === s.id && x.usuarioId === yo.id && x.estado === 'Pendiente')),
        accion: `/${slugPerfil}/${s.id}/reportar`, volverA: urlFicha(s), volverTexto: 'Volver a la ficha', motivos: MOTIVOS_PUBLICACION
    };
}

function pReportarPublicacion(ctx, slugPerfil, servicioId) {
    const r = datosReportePublicacion(ctx, slugPerfil, servicioId);
    if (!r) return null;
    r.enviado = ctx.flash.enviado === true;
    return vistaReportar(ctx, r);
}

function postReportarPublicacion(ctx, slugPerfil, servicioId, d) {
    const r = datosReportePublicacion(ctx, slugPerfil, servicioId);
    if (!r) return null;
    if (r.situacion !== 'Normal') return vistaReportar(ctx, r, d);
    const { errores, terminos, comentario } = validarReporte(d, MOTIVOS_PUBLICACION);
    if (Object.keys(errores).length) return vistaReportar(ctx, r, d, errores, terminos);
    const primera = !db.reportesPublicacion.some((x) => x.servicioId === servicioId && x.estado === 'Pendiente');
    db.reportesPublicacion.push({ id: nuevoId('reportesPublicacion'), servicioId, curriculumId: null, usuarioId: ctx.usuario.id, motivo: d.Motivo, comentario, fecha: ahora(), estado: 'Pendiente' });
    if (primera) {
        for (const a of admins()) {
            enviarCorreo({
                para: a.correo, asunto: `Publicación reportada: ${r.servicio.titulo}`, nombre: a.nombre,
                texto: `Reportaron el servicio «${r.servicio.titulo}» de ${proveedorDe(r.perfil)}. Motivo: ${MOTIVOS[d.Motivo].toLowerCase()}. Sigue visible hasta que decidas.`,
                boton: 'Ver las reportadas', enlace: '/admin/revision?ver=reportadas',
                pie: 'Si llegan más reportes sobre la misma publicación antes de que decidas, se suman en el panel sin otro correo.'
            });
        }
    }
    return { redirect: `/${slugPerfil}/${servicioId}/reportar`, flash: { enviado: true } };
}

function datosReporteCv(ctx, id) {
    const cv = db.curriculums.find((c) => c.id === id && cvVisible(c));
    if (!cv) return null;
    const yo = ctx.usuario;
    const u = usuarioDe(cv.usuarioId);
    return {
        cv, esOpinion: false, subtitulo: `CV de ${nombreCompleto(u)}`,
        situacion: situacionReporte(yo, cv.usuarioId === yo.id, db.reportesPublicacion.some((x) => x.curriculumId === id && x.usuarioId === yo.id && x.estado === 'Pendiente')),
        accion: `/curriculum/${id}/reportar`, volverA: `/curriculum/${id}`, volverTexto: 'Volver al CV', motivos: MOTIVOS_OPINION
    };
}

function pReportarCv(ctx, id) {
    const r = datosReporteCv(ctx, id);
    if (!r) return null;
    r.enviado = ctx.flash.enviado === true;
    return vistaReportar(ctx, r);
}

function postReportarCv(ctx, id, d) {
    const r = datosReporteCv(ctx, id);
    if (!r) return null;
    if (r.situacion !== 'Normal') return vistaReportar(ctx, r, d);
    const { errores, terminos, comentario } = validarReporte(d, MOTIVOS_OPINION);
    if (Object.keys(errores).length) return vistaReportar(ctx, r, d, errores, terminos);
    const primera = !db.reportesPublicacion.some((x) => x.curriculumId === id && x.estado === 'Pendiente');
    db.reportesPublicacion.push({ id: nuevoId('reportesPublicacion'), servicioId: null, curriculumId: id, usuarioId: ctx.usuario.id, motivo: d.Motivo, comentario, fecha: ahora(), estado: 'Pendiente' });
    if (primera) {
        for (const a of admins()) {
            enviarCorreo({
                para: a.correo, asunto: `Publicación reportada: ${r.subtitulo}`, nombre: a.nombre,
                texto: `Reportaron el ${r.subtitulo}. Motivo: ${MOTIVOS[d.Motivo].toLowerCase()}. Sigue visible hasta que decidas.`,
                boton: 'Ver las reportadas', enlace: '/admin/revision?ver=reportadas',
                pie: 'Si llegan más reportes sobre la misma publicación antes de que decidas, se suman en el panel sin otro correo.'
            });
        }
    }
    return { redirect: `/curriculum/${id}/reportar`, flash: { enviado: true } };
}

// ---------- Opiniones recibidas (V05) ----------

function pRecibidas(ctx, editando = null) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    if (!perfil) return { redirect: '/ofrecer' };
    const soloSin = ctx.query.get('ver') === 'sin-responder';
    const visibles = db.resenas.filter((r) => r.perfilId === perfil.id && r.estado !== 'Oculta');
    const lista = (soloSin ? visibles.filter((r) => !r.respuesta) : visibles).sort((a, b) => (b.modificacion ?? b.creacion) - (a.modificacion ?? a.creacion));
    const total = visibles.length;
    const sinResponder = visibles.filter((r) => !r.respuesta).length;
    const puede = perfil.estado === 'Activo';
    const url = soloSin ? '/mi-perfil/opiniones?ver=sin-responder' : '/mi-perfil/opiniones';
    const cuerpo = html`
    <div class="titulo-cuenta-fila titulo-cuenta-fila--envuelve">
        <h1 class="titulo-cuenta">Opiniones recibidas</h1>
        ${total > 0 ? html`<nav class="segmentado segmentado--enlaces" aria-label="Qué opiniones mostrar">
            <a href="/mi-perfil/opiniones"${attr('aria-current', soloSin ? null : 'page')}>Todas (${total})</a>
            <a href="/mi-perfil/opiniones?ver=sin-responder"${attr('aria-current', soloSin ? 'page' : null)}>Sin responder (${sinResponder})</a>
        </nav>` : ''}
    </div>
    ${puede ? '' : html`<p class="aviso aviso--alerta">Tu perfil no está activo: las opiniones no se ven en el sitio y por ahora no podés responderlas.</p>`}
    ${lista.length === 0 ? html`<div class="vacio">${soloSin
        ? html`<p class="vacio__titulo">Respondiste todas las opiniones.</p><p>Cuando llegue una nueva, aparece acá y te avisamos por correo.</p><a class="boton boton--secundario" href="/mi-perfil/opiniones">Ver todas</a>`
        : html`<p class="vacio__titulo">Todavía no recibiste opiniones.</p><p>Cuando alguien que contrató tus servicios opine sobre vos, aparece acá y te avisamos por correo.</p>${puede ? html`<a class="boton boton--secundario" href="/${perfil.slug}">Ver mi ficha</a>` : ''}`}</div>`
    : html`<ul class="recibidas">${lista.map((r) => {
        const ed = editando && editando.id === r.id ? editando : null;
        const autor = autorDe(r.usuarioId);
        const mio = db.reportesResena.filter((x) => x.resenaId === r.id && x.usuarioId === ctx.usuario.id).sort((a, b) => b.fecha - a.fecha)[0] || null;
        const pendiente = mio && mio.estado === 'Pendiente' && r.estado === 'Reportada';
        const textoRespuesta = ed ? ed.texto : r.respuesta?.texto ?? '';
        return html`<li class="recibida${ed ? ' recibida--editando' : ''}" id="opinion-${r.id}">
            <div class="recibida__cabecera">
                <div class="opinion__cabecera">
                    <p class="opinion__autor">${autor}</p>
                    <p class="estrellas" aria-hidden="true">${estrellas(r.calificacion)}</p>
                    <p class="sr-only">${r.calificacion} de 5</p>
                    <p class="opinion__cuando">${F.hace(r.modificacion ?? r.creacion).toLowerCase()}${r.modificacion ? ', editada' : ''}</p>
                </div>
                ${pendiente ? html`<span class="estado estado--aviso">Reportada, en revisión</span>` : ''}
            </div>
            <p class="opinion__texto texto-largo">${r.comentario}</p>
            ${pendiente ? html`<p class="recibida__nota">Reportaste esta opinión el ${F.fechaLarga(mio.fecha)}: “${mio.comentario ?? MOTIVOS[mio.motivo]}”. Sigue visible hasta que la administración decida.</p>` : ''}
            ${r.respuesta && !ed ? html`<div class="opinion__respuesta"><p class="opinion__respuesta-autor">Tu respuesta:</p><p class="texto-largo">${r.respuesta.texto}</p></div>` : ''}
            <div class="recibida__acciones">
                ${puede ? html`<details class="recibida__responder"${bool('open', !!ed)}>
                    <summary class="enlace-accion">${r.respuesta ? 'Editar respuesta' : 'Responder'}</summary>
                    <form class="recibida__formulario" method="post" action="/mi-perfil/opiniones/${r.id}/respuesta" data-envio-unico>
                        <input type="hidden" name="ver" value="${soloSin ? 'sin-responder' : ''}" />
                        <label class="sr-only" for="respuesta-${r.id}">Tu respuesta a ${autor}</label>
                        <textarea class="control control--texto" id="respuesta-${r.id}" name="respuesta" rows="3" maxlength="500" aria-describedby="respuesta-ayuda-${r.id}${ed?.error ? ` respuesta-error-${r.id}` : ''}"${ed?.error ? attr('aria-invalid', 'true') : ''}>${textoRespuesta}</textarea>
                        <div class="campo__pie">
                            <p class="campo__ayuda" id="respuesta-ayuda-${r.id}">Tu respuesta es pública. Podés editarla, no agregar otra.</p>
                            <span class="campo__contador" data-contador-de="respuesta-${r.id}">${textoRespuesta.length} / 500</span>
                        </div>
                        ${ed?.error ? html`<span class="campo__error" id="respuesta-error-${r.id}">${ed.error}</span>${resaltado(ed.texto, ed.terminos)}` : ''}
                        <div class="recibida__botones">
                            <button type="button" class="boton boton--texto" data-cerrar-detalles hidden>Cancelar</button>
                            <button type="submit" class="boton boton--primario">Publicar respuesta</button>
                        </div>
                    </form>
                </details>` : ''}
                ${mio ? '' : html`<a class="enlace-accion enlace-accion--suave" href="${conVolver(`/opiniones/${r.id}/reportar`, url)}">Reportar</a>`}
            </div>
        </li>`;
    })}</ul>`}`;
    return paginaCuenta(ctx, 'Opiniones recibidas', '/mi-perfil/opiniones', cuerpo);
}

function postRespuesta(ctx, id, d) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    const r = perfil && db.resenas.find((x) => x.id === id && x.perfilId === perfil.id && x.estado !== 'Oculta');
    if (!r) return null;
    const volver = d.ver === 'sin-responder' ? '/mi-perfil/opiniones?ver=sin-responder' : '/mi-perfil/opiniones';
    const fallo = (error, terminos = []) => {
        ctx.query = new URLSearchParams(d.ver ? `ver=${d.ver}` : '');
        return pRecibidas(ctx, { id, texto: d.respuesta, error, terminos });
    };
    if (perfil.estado !== 'Activo') return fallo('Para responder, tu perfil tiene que estar activo.');
    const t = texto(d.respuesta);
    if (!t) return fallo('Escribí tu respuesta.');
    if (t.length > 500) return fallo('La respuesta puede tener hasta 500 caracteres.');
    const terminos = filtroActual().analizar(t);
    if (terminos.length) return fallo(`Incluye palabras que no se permiten: ${listaTerminos(terminos)}. Cambialas para poder guardar.`, terminos);
    r.respuesta = { texto: t, fecha: ahora() };
    return { redirect: `${volver}#opinion-${id}`, aviso: 'Listo, publicamos tu respuesta. Se ve debajo de la opinión, en tu ficha.' };
}

// ---------- Mi curriculum (U08) ----------

function pMiCurriculum(ctx, m = null, errores = {}) {
    const u = ctx.usuario;
    const cv = cvDeUsuario(u.id);
    m ||= cv ? {
        QueSabeHacer: cv.queSabeHacer, Cursos: cv.cursos ?? '', Experiencia: cv.experiencia ?? '', Telefono: cv.telefono ? Tel.formato(cv.telefono) : '',
        MostrarCorreo: cv.mostrarCorreo ? 'true' : null, Oportunidades: OPORTUNIDADES.filter((o) => cv.oportunidades & OPORT[o]), ZonaIds: cv.zonaIds.map(String)
    } : { Oportunidades: [], ZonaIds: [] };
    const ops = lista(m.Oportunidades);
    const zonasElegidas = lista(m.ZonaIds).map(String);
    const terminos = cv && cv.ocultoPorFiltro ? cv.terminos : [];
    const estado = !cv ? null : cv.estado === 'Publicado' ? ['Publicado', 'estado--ok'] : cv.estado === 'Pausado' ? ['Pausado', 'estado--apagado']
        : cv.ocultoPorFiltro ? ['Sin publicar', 'estado--error'] : cv.estado === 'Oculto' ? ['Oculto', 'estado--error'] : ['Borrador', 'estado--apagado'];
    const zonas = [...db.zonas].sort((a, b) => (b.tipo === 'General') - (a.tipo === 'General') || a.orden - b.orden);
    const textarea = (id, etiqueta, max, filas, placeholder, ayuda, ayudaId, obligatorio = false) => html`<div class="campo">
        <label class="campo__etiqueta" for="${id}">${etiqueta} ${obligatorio ? html`<span class="campo__obligatorio" aria-hidden="true">*</span>` : html`<span class="campo__opcional">(opcional)</span>`}</label>
        <textarea class="control control--texto${conError(errores, id)}" id="${id}" name="${id}" rows="${filas}" maxlength="${max}"${bool('required', obligatorio)} placeholder="${placeholder}"${ayudaId ? attr('aria-describedby', ayudaId) : ''}>${m[id] ?? ''}</textarea>
        <div class="campo__pie">
            ${ayuda ? html`<p class="campo__ayuda" id="${ayudaId}">${ayuda}</p>` : html`<span></span>`}
            <span class="campo__contador" data-contador-de="${id}">${(m[id] || '').length} / ${max}</span>
        </div>
        ${errorDe(errores, id)}
        ${resaltado(m[id], terminos)}
    </div>`;
    const cuerpo = html`
    <div class="titulo-cuenta-fila">
        <h1 class="titulo-cuenta">Mi curriculum</h1>
        ${estado ? html`<span class="estado ${estado[1]}">${estado[0]}</span>` : ''}
    </div>
    ${!u.confirmado ? html`<p class="aviso aviso--alerta" role="status">Primero, confirmá tu correo.</p>
        <p class="cv-propio__texto">Para publicar tu CV necesitamos saber que el correo es tuyo. Te mandamos un enlace cuando creaste la cuenta: al abrirlo, volvés acá para seguir.</p>
        <p><a class="boton boton--primario" href="${conVolver('/confirmar', '/mi-curriculum')}">Ver cómo confirmarlo</a></p>` : html`
    ${cv && cv.ocultoPorFiltro ? html`<p class="aviso aviso--alerta" role="alert">Tu CV no se publicó porque incluye palabras que no se permiten (marcadas abajo). Si las cambiás, se publica solo.</p>`
        : cv && cv.estado === 'Oculto' ? html`<p class="aviso aviso--alerta" role="status">La administración ocultó tu CV y no se ve en Curriculum. Podés corregirlo: vuelve a verse cuando la administración lo revise.</p>`
        : cv && cv.estado === 'Pausado' ? html`<p class="aviso" role="status">Tu CV está pausado: no se ve en Curriculum y tus datos quedan guardados.</p>` : ''}
    <p class="nota-suave">
        Nombre y correo salen de tu cuenta: tu CV se publica como <strong>${nombreCompleto(u)}</strong>.
        Se publica al instante. Antes, el texto pasa por un filtro automático de palabras: si encuentra alguna que no se permite, te la marcamos para que la corrijas.
    </p>
    <form class="formulario cv-propio" action="/mi-curriculum" method="post" novalidate data-envio-unico>
        ${resumen(errores)}
        ${textarea('QueSabeHacer', 'Qué sé hacer', 1000, 4, 'Contá en tus palabras qué sabés hacer y cómo trabajás', null, null, true)}
        ${textarea('Cursos', 'Cursos', 2000, 4, 'Cursos realizados, con año si lo recordás', 'Uno por renglón. Si empezás con el año, se muestra al costado: «2025 Atención al cliente».', 'cursos-ayuda')}
        ${textarea('Experiencia', 'Experiencia', 3000, 4, 'Dónde trabajaste y qué hacías', 'Un trabajo por renglón, con los años al principio si querés: «2023 a 2026 Cajera en almacén».', 'experiencia-ayuda')}
        <fieldset class="campo">
            <legend class="campo__etiqueta">Qué estás buscando <span class="campo__opcional">(opcional)</span></legend>
            <div class="chips">${OPORTUNIDADES.map((o) => html`<label class="chip"><input class="chip__casilla" type="checkbox" name="Oportunidades" value="${o}"${bool('checked', ops.includes(o))} /><span class="chip__texto">${NOMBRE_OPORTUNIDAD[o]}</span></label>`)}</div>
        </fieldset>
        <fieldset class="campo" aria-describedby="zonas-ayuda ZonaIds-error"${invalido(errores, 'ZonaIds')}>
            <legend class="campo__etiqueta">Zonas donde podés trabajar <span class="campo__opcional">(opcional)</span></legend>
            <p class="campo__ayuda" id="zonas-ayuda">Si podés trabajar en todo Cerro Largo, elegí «Todo el departamento».</p>
            <div class="chips">${zonas.map((z) => html`<label class="chip chip--chico"><input class="chip__casilla" type="checkbox" name="ZonaIds" value="${z.id}"${bool('checked', zonasElegidas.includes(String(z.id)))} /><span class="chip__texto">${z.nombre}</span></label>`)}</div>
            ${errorDe(errores, 'ZonaIds', { id: 'ZonaIds-error' })}
        </fieldset>
        <div class="campo campo--corto">
            <label class="campo__etiqueta" for="Telefono">Teléfono <span class="campo__opcional">(opcional)</span></label>
            <input class="control${conError(errores, 'Telefono')}" type="tel" inputmode="tel" autocomplete="tel" placeholder="099 000 000" aria-describedby="telefono-ayuda" id="Telefono" name="Telefono" value="${m.Telefono ?? ''}" />
            <p class="campo__ayuda" id="telefono-ayuda">Se ve en tu CV, con un botón para llamar y otro de WhatsApp si es un celular.</p>
            ${errorDe(errores, 'Telefono')}
        </div>
        <label class="interruptor">
            <input class="interruptor__casilla" type="checkbox" role="switch" name="MostrarCorreo" value="true"${bool('checked', m.MostrarCorreo === 'true')} />
            <span class="interruptor__pista" aria-hidden="true"></span>
            <span>Mostrar mi correo (${u.correo}) en mi CV</span>
        </label>
        <div class="formulario__acciones cv-propio__acciones">
            <button type="submit" class="boton boton--primario">${cv ? 'Guardar' : 'Publicar mi CV'}</button>
            ${cv?.estado === 'Publicado' ? html`<button type="submit" class="boton boton--secundario" form="pausar-cv">Pausar CV</button><p class="formulario__acciones-nota">¿Conseguiste trabajo? Pausalo y conservás los datos.</p>`
                : cv?.estado === 'Pausado' ? html`<button type="submit" class="boton boton--secundario" form="reanudar-cv">Volver a publicar</button>` : ''}
        </div>
    </form>
    ${cv?.estado === 'Publicado' ? html`<form id="pausar-cv" method="post" action="/mi-curriculum/pausar" hidden></form><p class="cv-propio__ver"><a href="/curriculum/${cv.id}">Ver cómo se ve mi CV</a></p>`
        : cv?.estado === 'Pausado' ? html`<form id="reanudar-cv" method="post" action="/mi-curriculum/reanudar" hidden></form>` : ''}`}`;
    return paginaCuenta(ctx, 'Mi curriculum', '/mi-curriculum', cuerpo);
}

function postMiCurriculum(ctx, d) {
    const u = ctx.usuario;
    const errores = {};
    if (!u.confirmado) errores[''] = 'Confirmá tu correo para publicar tu CV.';
    const que = texto(d.QueSabeHacer);
    if (!que) errores.QueSabeHacer = 'Contá qué sabés hacer: es lo único obligatorio.';
    else if (que.length > 1000) errores.QueSabeHacer = 'Puede tener hasta 1000 caracteres.';
    if ((d.Cursos || '').length > 2000) errores.Cursos = 'Puede tener hasta 2000 caracteres.';
    if ((d.Experiencia || '').length > 3000) errores.Experiencia = 'Puede tener hasta 3000 caracteres.';
    const telefono = texto(d.Telefono) ? Tel.normalizar(d.Telefono) : null;
    if (texto(d.Telefono) && !telefono) errores.Telefono = 'Revisá el teléfono: un celular es como 099 123 456 y un fijo, como 4642 1234.';
    if (Object.keys(errores).length) return pMiCurriculum(ctx, d, errores);

    const datos = {
        queSabeHacer: que, cursos: texto(d.Cursos), experiencia: texto(d.Experiencia), telefono, mostrarCorreo: d.MostrarCorreo === 'true',
        oportunidades: lista(d.Oportunidades).reduce((a, o) => a | (OPORT[o] || 0), 0),
        zonaIds: lista(d.ZonaIds).map(entero).filter((z) => zonaDe(z))
    };
    let cv = cvDeUsuario(u.id);
    const t = ahora();
    const terminos = filtroActual().analizar(datos.queSabeHacer, datos.cursos, datos.experiencia);
    if (!cv) {
        cv = { id: nuevoId('curriculums'), usuarioId: u.id, ...datos, estado: 'Publicado', ocultoPorFiltro: false, terminos: [], publicacion: t, actualizacion: t, revision: null };
        db.curriculums.push(cv);
        if (terminos.length) {
            Object.assign(cv, { estado: 'Oculto', ocultoPorFiltro: true, terminos });
            return { redirect: '/mi-curriculum' };
        }
        return { redirect: '/mi-curriculum', aviso: 'Listo, tu CV ya se ve en Curriculum.' };
    }
    const igual = cv.queSabeHacer === datos.queSabeHacer && cv.cursos === datos.cursos && cv.experiencia === datos.experiencia && cv.telefono === datos.telefono
        && cv.mostrarCorreo === datos.mostrarCorreo && cv.oportunidades === datos.oportunidades && [...cv.zonaIds].sort().join() === [...datos.zonaIds].sort().join();
    if (igual && !cv.ocultoPorFiltro) return { redirect: '/mi-curriculum', aviso: 'No había cambios para guardar.' };
    const ocultoPorAdmin = cv.estado === 'Oculto' && !cv.ocultoPorFiltro;
    Object.assign(cv, datos, { actualizacion: t });
    if (ocultoPorAdmin) return { redirect: '/mi-curriculum', aviso: 'Guardamos los cambios. Tu CV vuelve a verse cuando la administración lo revise.' };
    if (terminos.length) {
        Object.assign(cv, { estado: 'Oculto', ocultoPorFiltro: true, terminos });
        return { redirect: '/mi-curriculum' };
    }
    const estabaRetenido = cv.ocultoPorFiltro;
    if (estabaRetenido) Object.assign(cv, { estado: 'Publicado', ocultoPorFiltro: false, terminos: [], publicacion: cv.publicacion ?? t });
    return { redirect: '/mi-curriculum', aviso: estabaRetenido ? 'Listo, tu CV ya se ve en Curriculum.' : 'Listo, guardamos los cambios.' };
}

function postPausarCv(ctx) {
    const cv = cvDeUsuario(ctx.usuario.id);
    if (cv && cv.estado === 'Publicado') {
        cv.estado = 'Pausado';
        return { redirect: '/mi-curriculum', aviso: 'Pausaste tu CV: ya no se ve en Curriculum. Tus datos quedan guardados para cuando quieras volver a publicarlo.' };
    }
    return { redirect: '/mi-curriculum' };
}

function postReanudarCv(ctx) {
    const cv = cvDeUsuario(ctx.usuario.id);
    if (cv && cv.estado === 'Pausado') {
        cv.estado = 'Publicado';
        cv.actualizacion = ahora();
        return { redirect: '/mi-curriculum', aviso: 'Listo, tu CV vuelve a verse en Curriculum.' };
    }
    return { redirect: '/mi-curriculum' };
}
