// ===================== Administración (D01 a D12) =====================

const POR_PAGINA_PANEL = 50;

function serviciosSinRevisar() {
    return db.servicios.filter((s) => {
        const p = perfilDe(s.perfilId);
        return p.estado !== 'Eliminado'
            && ((s.estado === 'Publicado' && p.estado === 'Activo') || (s.estado === 'Oculto' && !s.ocultoPorFiltro))
            && (s.revision === null || s.revision < s.modificacion);
    });
}

const perfilesSinRevisar = () => db.perfiles.filter((p) => p.estado === 'Activo' && (p.revision === null || p.revision < p.modificacion));

const cvsSinRevisar = () => db.curriculums.filter((c) => usuarioDe(c.usuarioId).estado === 'Activo'
    && (c.estado === 'Publicado' || (c.estado === 'Oculto' && !c.ocultoPorFiltro))
    && (c.revision === null || c.revision < c.actualizacion));

function textosCv(c) {
    return [['Qué sabe hacer', c.queSabeHacer], ['Cursos', c.cursos], ['Experiencia', c.experiencia]].filter(([, t]) => texto(t));
}

function deServicio(s, reportes) {
    const p = perfilDe(s.perfilId);
    const visibleAhora = s.estado === 'Publicado' && p.estado === 'Activo';
    return {
        tipo: 'Servicio', id: s.id, proveedor: proveedorDe(p), nueva: s.revision === null, fecha: s.revision === null ? (s.publicacion ?? s.modificacion) : s.modificacion,
        titulo: s.titulo, granRubro: granRubroDe(s).nombre, cantidadFotos: s.fotos.length, miniaturas: s.fotos.slice(0, 5).map(fotoSrc), matricula: s.matricula,
        oculto: s.estado === 'Oculto', visible: visibleAhora, ocultoPorFiltro: s.ocultoPorFiltro, terminos: s.terminos || [], textos: textosDeServicio(s),
        url: visibleAhora ? urlFicha(s) : null, reportes
    };
}

function dePerfil(p) {
    return {
        tipo: 'Perfil', id: p.id, proveedor: proveedorDe(p), nueva: p.revision === null, fecha: p.modificacion, titulo: 'Presentación del perfil', granRubro: null,
        cantidadFotos: 0, miniaturas: [], matricula: null, oculto: false, visible: true, ocultoPorFiltro: false, terminos: [],
        textos: [['Nombre comercial', p.nombreComercial], ['Presentación', p.descripcion]].filter(([, t]) => texto(t)), url: null, reportes: []
    };
}

function deCv(c, reportes) {
    const u = usuarioDe(c.usuarioId);
    const q = c.queSabeHacer;
    return {
        tipo: 'Curriculum', id: c.id, proveedor: nombreCompleto(u), nueva: c.revision === null, fecha: c.revision === null ? (c.publicacion ?? c.actualizacion) : c.actualizacion,
        titulo: q.length <= 120 ? q : q.slice(0, 120).trimEnd() + '…', granRubro: null, cantidadFotos: 0, miniaturas: [], matricula: null,
        oculto: c.estado === 'Oculto', visible: cvVisible(c), ocultoPorFiltro: c.ocultoPorFiltro, terminos: c.terminos || [], textos: textosCv(c), url: null, reportes
    };
}

const reportesDe = (campo, id) => db.reportesPublicacion.filter((r) => r[campo] === id && r.estado === 'Pendiente').sort((a, b) => b.fecha - a.fecha);

// ---------- Tablero (D01) ----------

function pTablero(ctx) {
    const r = resumenRevision();
    const m = resumenModeracion();
    const palabras = db.palabras.length;
    const t = ahora();
    const hoy = diaUy(t);
    const mes = periodoActual();
    const inicioMes = inicioDiaUtc(mes);
    const perfiles = db.perfiles.filter((p) => p.estado === 'Activo' || p.estado === 'Vencido').map((p) => ({ p, s: suscripcionDe(p.id) }));
    const activos = perfiles.filter((x) => x.p.estado === 'Activo');
    const enPrueba = activos.filter((x) => x.s?.esPrueba).length;
    const pagaron = activos.filter((x) => x.s && !x.s.esPrueba && !debe(x.s.cubiertoHasta, hoy)).length;
    const ventana = partesDia(hoy).d <= 10;
    const sinPagar = ventana ? activos.filter((x) => x.s && !x.s.esPrueba && debe(x.s.cubiertoHasta, hoy)).length : perfiles.filter((x) => x.p.estado === 'Vencido').length;
    const recaudado = db.pagos.filter((p) => p.periodo === mes && p.estado === 'Aprobado').reduce((a, p) => a + p.monto, 0);
    const pendientes = db.pagos.filter((p) => p.estado === 'Pendiente' && p.tx).length;
    const reservados = db.destacados.filter((d) => d.periodo === mes && d.estado === 'PendientePago' && d.alta < inicioMes).length;
    const usuarios = db.usuarios.filter((u) => u.estado !== 'Eliminado');
    const nuevos = usuarios.filter((u) => u.registro >= inicioMes).length;
    const cvs = db.curriculums.filter((c) => c.estado === 'Publicado').length;
    const total = Math.max(1, pagaron + enPrueba + sinPagar);
    const nombreMes = F.mes(mes);
    const hora = new Date(t - OFFSET_UY).getUTCHours();
    const saludo = hora < 12 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
    const diaSemana = DIAS_SEMANA[new Date(t - OFFSET_UY).getUTCDay()];
    const fechaHoy = `${diaSemana[0].toUpperCase()}${diaSemana.slice(1)} ${F.fechaLarga(hoy)}`;
    const plural = (n, uno, varios) => (n === 1 ? uno : varios.replace('{n}', n));
    const cuerpo = html`
    <div class="tablero-saludo">
        <h1 class="titulo-admin">${saludo}</h1>
        <span class="tablero-saludo__fecha">${fechaHoy}</span>
    </div>
    <div class="tablero">
        <section class="tablero__pendientes" aria-labelledby="pendientes-titulo">
            <h2 class="subtitulo-admin" id="pendientes-titulo">Para revisar cuando puedas</h2>
            <ul class="pendientes">
                ${palabras === 0 ? html`<li class="pendiente pendiente--alerta">
                    <p class="pendiente__titulo">La lista de palabras prohibidas está vacía</p>
                    <p class="pendiente__texto">Hasta que la cargues, el filtro no retiene nada: todo se publica en el acto.</p>
                    <a class="boton boton--primario" href="/admin/palabras">Cargar la lista</a>
                </li>` : ''}
                ${m.porModerar > 0 ? html`<li class="pendiente">
                    <p class="pendiente__titulo">${plural(m.reportadas, '1 opinión reportada', '{n} opiniones reportadas')}, ${plural(m.delFiltro, '1 retenida por el filtro', '{n} retenidas por el filtro')}</p>
                    <p class="pendiente__texto">Las reportadas siguen visibles hasta que decidas. Las retenidas no se ven hasta que se corrijan o las publiques.</p>
                    <a class="boton boton--secundario" href="/admin/resenas">Moderar opiniones</a>
                </li>` : ''}
                ${r.reportadas > 0 ? html`<li class="pendiente">
                    <p class="pendiente__titulo">${plural(r.reportadas, '1 publicación reportada', '{n} publicaciones reportadas')}</p>
                    <p class="pendiente__texto">Siguen visibles hasta que desestimes los reportes o las ocultes.</p>
                    <a class="boton boton--secundario" href="/admin/revision?ver=reportadas">Ver las reportadas</a>
                </li>` : ''}
                <li class="pendiente">
                    <p class="pendiente__titulo">${plural(r.sinRevisar, '1 publicación sin revisar', '{n} publicaciones sin revisar')}, ${plural(r.retenidas, '1 retenida por el filtro', '{n} retenidas por el filtro')}</p>
                    <p class="pendiente__texto">Lo sin revisar ya está publicado: revisar es opcional. Lo retenido no se ve hasta que se corrija o lo publiques.</p>
                    <a class="boton boton--secundario" href="/admin/revision">Revisar publicaciones</a>
                </li>
                ${pendientes > 0 ? html`<li class="pendiente">
                    <p class="pendiente__titulo">${plural(pendientes, '1 pago pendiente de confirmación', '{n} pagos pendientes de confirmación')}</p>
                    <p class="pendiente__texto">Mercado Pago todavía no los aprobó ni los rechazó. Se vuelven a consultar cada hora.</p>
                    <a class="boton boton--secundario" href="/admin/pagos?ver=pendientes">Ver pagos</a>
                </li>` : ''}
                ${reservados > 0 ? html`<li class="pendiente">
                    <p class="pendiente__titulo">${reservados === 1 ? `1 destacado reservado para ${nombreMes}` : `${reservados} destacados reservados para ${nombreMes}`}</p>
                    <p class="pendiente__texto">Se liberan el 11 si no pagan.</p>
                    <a class="boton boton--secundario" href="/admin/destacados">Ver destacados</a>
                </li>` : ''}
                ${palabras > 0 ? html`<li class="pendiente">
                    <p class="pendiente__titulo">${plural(palabras, '1 entrada', '{n} entradas')} en la lista de palabras prohibidas</p>
                    <p class="pendiente__texto">Un texto que contiene alguna no se publica hasta que el autor lo corrija.</p>
                    <a class="boton boton--secundario" href="/admin/palabras">Ver la lista</a>
                </li>` : ''}
            </ul>
        </section>
        <div class="tablero__numeros">
            <section class="numeros-admin" aria-labelledby="numeros-titulo">
                <h2 class="numeros-admin__titulo" id="numeros-titulo">En números</h2>
                <dl>
                    <div class="numeros-admin__fila"><dt>Perfiles activos</dt><dd class="numeros-admin__valor">${activos.length}</dd><dd class="numeros-admin__nota">${plural(enPrueba, 'Incluye 1 en prueba.', 'Incluye {n} en prueba.')}</dd></div>
                    <div class="numeros-admin__fila"><dt>CV publicados</dt><dd class="numeros-admin__valor">${cvs}</dd></div>
                    <div class="numeros-admin__fila"><dt>Usuarios</dt><dd class="numeros-admin__valor">${usuarios.length}</dd><dd class="numeros-admin__nota">${plural(nuevos, '1 nuevo este mes.', '{n} nuevos este mes.')}</dd></div>
                </dl>
            </section>
            <section class="cobro-admin" aria-labelledby="cobro-titulo">
                <h2 class="numeros-admin__titulo" id="cobro-titulo">Cobro de ${nombreMes}</h2>
                <p class="cobro-admin__ventana">${ventana ? 'La ventana de pago está abierta hasta el 10.' : 'Ventana cerrada el día 10.'}</p>
                <div class="cobro-admin__barra" aria-hidden="true">
                    <span class="cobro-admin__parte cobro-admin__parte--pagaron" style="width: ${Math.trunc(pagaron * 100 / total)}%"></span>
                    <span class="cobro-admin__parte cobro-admin__parte--prueba" style="width: ${Math.trunc(enPrueba * 100 / total)}%"></span>
                    <span class="cobro-admin__parte cobro-admin__parte--sin-pagar" style="width: ${Math.trunc(sinPagar * 100 / total)}%"></span>
                </div>
                <dl class="cobro-admin__datos">
                    <div><dt><span class="cobro-admin__marca cobro-admin__marca--pagaron"></span>Pagaron</dt><dd>${pagaron}</dd></div>
                    <div><dt><span class="cobro-admin__marca cobro-admin__marca--prueba"></span>En prueba</dt><dd>${enPrueba}</dd></div>
                    <div><dt><span class="cobro-admin__marca cobro-admin__marca--sin-pagar"></span>${ventana ? 'Sin pagar todavía' : 'Vencidos el 11'}</dt><dd>${sinPagar}</dd></div>
                </dl>
                <p class="cobro-admin__recaudado"><span>Recaudado</span> <strong>${F.money(recaudado)}</strong></p>
                <a class="enlace-fuerte" href="/admin/pagos">Ver los pagos</a>
            </section>
        </div>
    </div>`;
    return paginaAdmin(ctx, 'Administración', '/admin', cuerpo);
}

// ---------- Revisión (D02) ----------

function pRevision(ctx) {
    const ver = ctx.query.get('ver');
    const lista = ver === 'retenidos' ? 'Retenidos' : ver === 'reportadas' ? 'Reportadas' : 'SinRevisar';
    const r = resumenRevision();
    let items;
    if (lista === 'SinRevisar') {
        items = [...serviciosSinRevisar().map((s) => deServicio(s, [])), ...perfilesSinRevisar().map(dePerfil), ...cvsSinRevisar().map((c) => deCv(c, []))]
            .sort((a, b) => b.fecha - a.fecha);
    } else if (lista === 'Retenidos') {
        items = [...db.servicios.filter((s) => s.estado === 'Oculto' && s.ocultoPorFiltro && perfilDe(s.perfilId).estado !== 'Eliminado').map((s) => deServicio(s, [])),
            ...db.curriculums.filter((c) => c.estado === 'Oculto' && c.ocultoPorFiltro).map((c) => deCv(c, []))].sort((a, b) => b.fecha - a.fecha);
    } else {
        items = [...db.servicios.filter((s) => reportesDe('servicioId', s.id).length).map((s) => deServicio(s, reportesDe('servicioId', s.id))),
            ...db.curriculums.filter((c) => reportesDe('curriculumId', c.id).length).map((c) => deCv(c, reportesDe('curriculumId', c.id)))]
            .sort((a, b) => b.reportes[0].fecha - a.reportes[0].fecha);
    }
    const verParam = ver === 'retenidos' || ver === 'reportadas' ? ver : '';
    const actual = (l) => attr('aria-current', lista === l ? 'page' : null);
    const tarjeta = (p) => {
        const reportes = p.reportes.length;
        const etiqueta = reportes > 0 ? (reportes === 1 ? '1 reporte' : `${reportes} reportes`)
            : p.tipo === 'Perfil' ? (p.nueva ? 'Perfil nuevo' : 'Perfil editado')
            : p.tipo === 'Curriculum' ? (p.nueva ? 'CV nuevo' : 'CV editado')
            : p.nueva ? 'Servicio nuevo' : 'Servicio editado';
        const partes = [];
        if (p.tipo === 'Curriculum') partes.push('Curriculum');
        else if (p.granRubro) partes.push(p.granRubro);
        partes.push(reportes > 0 ? `Reportado ${F.hace(p.reportes[0].fecha).toLowerCase()}` : `${p.nueva ? 'Publicado' : 'Editado'} ${F.hace(p.fecha).toLowerCase()}`);
        if (p.tipo === 'Servicio') partes.push(p.cantidadFotos === 1 ? '1 foto' : `${p.cantidadFotos} fotos`);
        const [estado, clase] = p.oculto && p.ocultoPorFiltro ? ['Retenido por el filtro: no se ve', 'publicacion__estado--error']
            : p.oculto ? ['Oculto por la administración: no se ve', 'publicacion__estado--error']
            : !p.visible ? ['No se ve en el sitio', 'publicacion__estado--error'] : ['Visible en el sitio', 'publicacion__estado--ok'];
        const esCv = p.tipo === 'Curriculum';
        const moderable = p.tipo === 'Servicio' || esCv;
        const clave = `${p.tipo}-${p.id}`.toLowerCase();
        const base = esCv ? `/admin/revision/cv/${p.id}` : `/admin/revision/servicio/${p.id}`;
        return html`<li class="publicacion">
            ${p.miniaturas.length ? html`<img class="publicacion__foto" src="${p.miniaturas[0]}" alt="" loading="lazy" />` : html`<span class="publicacion__foto publicacion__foto--iniciales" aria-hidden="true">${F.iniciales(p.proveedor)}</span>`}
            <div class="publicacion__cuerpo">
                <div class="publicacion__cabecera">
                    <h2 class="publicacion__nombre">${p.proveedor}</h2>
                    <span class="estado estado--apagado">${etiqueta}</span>
                </div>
                <p class="publicacion__titulo">${texto(p.titulo) ? p.titulo : 'Sin título'}</p>
                <p class="publicacion__detalle">${partes.join(' · ')}</p>
                ${p.matricula ? html`<p class="publicacion__matricula">Matrícula declarada: “${p.matricula}”</p>` : ''}
                <p class="publicacion__estado ${clase}">${estado}</p>
                ${p.terminos.length ? html`<p class="publicacion__terminos">El filtro encontró ${listaTerminos(p.terminos)}.</p>` : ''}
                ${reportes ? html`<div class="publicacion__reportes">
                    <p class="publicacion__reportes-titulo">Motivos de los reportes</p>
                    <ul>${p.reportes.map((x) => html`<li>
                        <span class="publicacion__reporte-motivo">${MOTIVOS[x.motivo]}</span>
                        <span class="publicacion__reporte-fecha">${F.hace(x.fecha).toLowerCase()}</span>
                        ${x.comentario ? html`<span class="publicacion__reporte-comentario texto-largo">“${x.comentario}”</span>` : ''}
                    </li>`)}</ul>
                </div>` : ''}
                <details class="publicacion__textos"${bool('open', lista === 'Retenidos')}>
                    <summary>Leer los textos</summary>
                    <dl>${p.textos.map(([n, t]) => html`<dt>${n}</dt><dd class="texto-largo">${textoMarcado(t, p.terminos)}</dd>`)}</dl>
                    ${p.miniaturas.length ? html`<ul class="publicacion__fotos">${p.miniaturas.map((src, i) => html`<li><img src="${src}" alt="Foto ${i + 1} de ${p.cantidadFotos}" loading="lazy" /></li>`)}</ul>` : ''}
                </details>
                <div class="publicacion__acciones">
                    ${p.url ? html`<a class="boton boton--texto" href="${p.url}" target="_blank" rel="noopener">Ver ficha<span class="sr-only"> (se abre en otra pestaña)</span></a>`
                        : esCv && p.visible ? html`<a class="boton boton--texto" href="/curriculum/${p.id}" target="_blank" rel="noopener">Ver CV<span class="sr-only"> (se abre en otra pestaña)</span></a>` : ''}
                    ${lista === 'SinRevisar' ? html`<form method="post" action="/admin/revision/${p.tipo.toLowerCase()}/${p.id}/revisada"><button type="submit" class="boton boton--primario">Marcar revisado</button></form>` : ''}
                    ${moderable && p.oculto ? html`<form method="post" action="${base}/publicar"><input type="hidden" name="ver" value="${verParam}" /><button type="submit" class="boton boton--secundario">${p.ocultoPorFiltro ? 'Publicar igual' : 'Volver a publicar'}</button></form>` : ''}
                    ${lista === 'Reportadas' ? html`<details class="confirmar">
                        <summary class="boton boton--secundario">Desestimar</summary>
                        <form class="confirmar__panel" method="post" action="${base}/desestimar">
                            <input type="hidden" name="ver" value="${verParam}" />
                            <label class="campo__etiqueta" for="desestimar-${clave}">Motivo <span class="campo__opcional">(opcional, queda en el registro)</span></label>
                            <textarea class="control control--texto" id="desestimar-${clave}" name="motivo" rows="2" maxlength="1000"></textarea>
                            <button type="submit" class="boton boton--primario">Desestimar los reportes</button>
                        </form>
                    </details>` : ''}
                    ${moderable && (!p.oculto || p.ocultoPorFiltro) ? html`<details class="confirmar">
                        <summary class="boton boton--peligro-contorno">${p.ocultoPorFiltro ? 'Mantener oculto' : 'Ocultar'}</summary>
                        <form class="confirmar__panel" method="post" action="${base}/ocultar">
                            <input type="hidden" name="ver" value="${verParam}" />
                            <label class="campo__etiqueta" for="motivo-${clave}">Motivo</label>
                            <textarea class="control control--texto" id="motivo-${clave}" name="motivo" rows="3" maxlength="1000" required aria-describedby="motivo-ayuda-${clave}"></textarea>
                            <p class="campo__ayuda" id="motivo-ayuda-${clave}">${esCv ? 'Queda en el registro de actividad.' : 'Le llega al proveedor por correo, tal cual lo escribas.'}</p>
                            <button type="submit" class="boton boton--peligro">${esCv ? 'Ocultar el CV' : 'Ocultar el servicio'}</button>
                        </form>
                    </details>` : ''}
                </div>
            </div>
        </li>`;
    };
    const cuerpo = html`
    <div class="titulo-admin-fila">
        <h1 class="titulo-admin">Revisión de publicaciones</h1>
        ${lista === 'SinRevisar' && items.length ? html`<form method="post" action="/admin/revision/todo"><button type="submit" class="boton boton--secundario">Marcar todo como revisado</button></form>` : ''}
    </div>
    <nav class="filtros-admin" aria-label="Qué mostrar">
        <a href="/admin/revision"${actual('SinRevisar')}>Sin revisar (${r.sinRevisar})</a>
        <a href="/admin/revision?ver=reportadas"${actual('Reportadas')}>Reportadas (${r.reportadas})</a>
        <a href="/admin/revision?ver=retenidos"${actual('Retenidos')}>Retenidos por el filtro (${r.retenidas})</a>
    </nav>
    <p class="nota-suave">${lista === 'Retenidos' ? 'Lo retenido no se ve en el sitio. Si es un falso positivo, publicalo; si no, mantenelo oculto con un motivo (al proveedor le avisamos por correo). Si el autor lo corrige, se publica solo.'
        : lista === 'Reportadas' ? 'Reportar no oculta nada: lo reportado sigue a la vista hasta que decidas. Desestimar u ocultar cierra todos sus reportes. A quien reportó no se le avisa del resultado.'
        : 'Todo lo que está en Sin revisar ya es público. Revisar es opcional: el sitio funciona igual aunque no entres.'}</p>
    ${items.length === 0 ? html`<div class="vacio">
        <p class="vacio__titulo">${lista === 'Retenidos' ? 'No hay nada retenido por el filtro.' : lista === 'Reportadas' ? 'No hay publicaciones reportadas.' : 'Está todo revisado.'}</p>
        <p>${lista === 'Retenidos' ? 'Cuando el filtro retenga algo, aparece acá.' : lista === 'Reportadas' ? 'Cuando alguien reporte un servicio o un CV, aparece acá con los motivos.' : 'Lo nuevo o editado aparece acá, del más reciente al más antiguo.'}</p>
    </div>` : html`<ul class="publicaciones">${items.map(tarjeta)}</ul>`}`;
    return paginaAdmin(ctx, 'Revisión de publicaciones', '/admin/revision', cuerpo);
}

const volverRevision = (ver) => (ver === 'retenidos' || ver === 'reportadas' ? `/admin/revision?ver=${ver}` : '/admin/revision');

function postMarcarRevisada(ctx, tipo, id) {
    const t = ahora();
    const a = ctx.usuario.id;
    if (tipo === 'servicio') {
        const s = servicioDe(id);
        if (!s) return null;
        s.revision = t;
        registrar(a, 'PublicacionRevisada', `Servicio «${s.titulo}» de ${proveedorDe(perfilDe(s.perfilId))}`);
    } else if (tipo === 'perfil') {
        const p = perfilDe(id);
        if (!p) return null;
        p.revision = t;
        registrar(a, 'PublicacionRevisada', `Perfil de ${proveedorDe(p)}`);
    } else {
        const c = db.curriculums.find((x) => x.id === id);
        if (!c) return null;
        c.revision = t;
        const u = usuarioDe(c.usuarioId);
        registrar(a, 'PublicacionRevisada', `CV de ${nombreCompleto(u)}`);
    }
    return { redirect: '/admin/revision', aviso: 'Listo, quedó como revisada.' };
}

function postMarcarTodo(ctx) {
    const t = ahora();
    const a = ctx.usuario.id;
    const ss = serviciosSinRevisar();
    const ps = perfilesSinRevisar();
    const cs = cvsSinRevisar();
    for (const s of ss) { s.revision = t; registrar(a, 'PublicacionRevisada', `Servicio «${s.titulo}» de ${proveedorDe(perfilDe(s.perfilId))}`); }
    for (const p of ps) { p.revision = t; registrar(a, 'PublicacionRevisada', `Perfil de ${proveedorDe(p)}`); }
    for (const c of cs) { c.revision = t; registrar(a, 'PublicacionRevisada', `CV de ${nombreCompleto(usuarioDe(c.usuarioId))}`); }
    const n = ss.length + ps.length + cs.length;
    return { redirect: '/admin/revision', aviso: n === 1 ? 'Listo, marcamos 1 publicación como revisada.' : `Listo, marcamos ${n} publicaciones como revisadas.` };
}

function cerrarReportes(campo, id, estado, adminId) {
    let n = 0;
    for (const r of db.reportesPublicacion.filter((x) => x[campo] === id && x.estado === 'Pendiente')) {
        Object.assign(r, { estado, resueltoPor: adminId, resolucion: ahora() });
        n++;
    }
    return n;
}

function postOcultarServicio(ctx, id, d) {
    const s = servicioDe(id);
    if (!s || !['Publicado', 'Pausado', 'Oculto'].includes(s.estado)) return null;
    if (!texto(d.motivo)) return { redirect: volverRevision(d.ver), alerta: 'Escribí el motivo para ocultarlo: le llega al proveedor por correo.' };
    const perfil = perfilDe(s.perfilId);
    Object.assign(s, { estado: 'Oculto', ocultoPorFiltro: false, revision: ahora() });
    cerrarReportes('servicioId', id, 'Resuelto', ctx.usuario.id);
    registrar(ctx.usuario.id, 'ServicioOcultado', `Servicio «${s.titulo}» de ${proveedorDe(perfil)}`, d.motivo.trim());
    const u = usuarioDe(perfil.usuarioId);
    if (u.correo && u.confirmado) {
        enviarCorreo({
            para: u.correo, asunto: 'Sobre tu publicación', nombre: u.nombre,
            texto: `La administración de Red Nexa ocultó tu servicio «${s.titulo}», que ya no se ve en el sitio. El motivo: ${d.motivo.trim()}`,
            boton: 'Ir a Mis servicios', enlace: '/mi-perfil/servicios',
            pie: 'Si lo corregís desde tu panel, queda para que la administración lo revise y decida si vuelve a publicarse.'
        });
    }
    return { redirect: volverRevision(d.ver), aviso: `Ocultaste «${s.titulo}». Le avisamos al proveedor por correo, con el motivo.` };
}

function postPublicarServicioAdmin(ctx, id, d) {
    const s = servicioDe(id);
    if (!s || s.estado !== 'Oculto') return null;
    publicarServicio(s);
    s.revision = ahora();
    registrar(ctx.usuario.id, 'ServicioReactivado', `Servicio «${s.titulo}» de ${proveedorDe(perfilDe(s.perfilId))}`);
    return { redirect: volverRevision(d.ver), aviso: `Publicaste «${s.titulo}». Ya se ve en el sitio.` };
}

function postDesestimarServicio(ctx, id, d) {
    const s = servicioDe(id);
    if (!s || cerrarReportes('servicioId', id, 'Desestimado', ctx.usuario.id) === 0) return null;
    registrar(ctx.usuario.id, 'ReporteDesestimado', `Servicio «${s.titulo}» de ${proveedorDe(perfilDe(s.perfilId))}`, texto(d.motivo));
    return { redirect: volverRevision(d.ver), aviso: 'Listo, desestimaste los reportes. La publicación sigue igual.' };
}

function ocultarCv(c, adminId, motivo) {
    Object.assign(c, { estado: 'Oculto', ocultoPorFiltro: false, revision: ahora() });
    cerrarReportes('curriculumId', c.id, 'Resuelto', adminId);
    registrar(adminId, 'CurriculumOcultado', `CV de ${nombreCompleto(usuarioDe(c.usuarioId))}`, motivo);
}

function reactivarCv(c, adminId) {
    Object.assign(c, { estado: 'Publicado', ocultoPorFiltro: false, terminos: [], revision: ahora() });
    registrar(adminId, 'CurriculumReactivado', `CV de ${nombreCompleto(usuarioDe(c.usuarioId))}`);
}

function postOcultarCvRevision(ctx, id, d) {
    const c = db.curriculums.find((x) => x.id === id && x.estado !== 'Borrador');
    if (!c) return null;
    if (!texto(d.motivo)) return { redirect: volverRevision(d.ver), alerta: 'Escribí el motivo para ocultarlo: queda en el registro de actividad.' };
    ocultarCv(c, ctx.usuario.id, d.motivo.trim());
    return { redirect: volverRevision(d.ver), aviso: 'Ocultaste el CV. Ya no se ve en el sitio.' };
}

function postPublicarCvRevision(ctx, id, d) {
    const c = db.curriculums.find((x) => x.id === id && x.estado === 'Oculto');
    if (!c) return null;
    reactivarCv(c, ctx.usuario.id);
    return { redirect: volverRevision(d.ver), aviso: 'Publicaste el CV. Ya se ve en Curriculum.' };
}

function postDesestimarCv(ctx, id, d) {
    const c = db.curriculums.find((x) => x.id === id);
    if (!c || cerrarReportes('curriculumId', id, 'Desestimado', ctx.usuario.id) === 0) return null;
    registrar(ctx.usuario.id, 'ReporteDesestimado', `CV de ${nombreCompleto(usuarioDe(c.usuarioId))}`, texto(d.motivo));
    return { redirect: volverRevision(d.ver), aviso: 'Listo, desestimaste los reportes. El CV sigue igual.' };
}

// ---------- Perfiles (D03) ----------

function textoPerfilPanel(estado, enPrueba) {
    if (estado === 'Activo' && enPrueba) return ['Prueba', 'estado--aviso'];
    return { Activo: ['Activo', 'estado--ok'], Vencido: ['Vencido', 'estado--apagado'], Bloqueado: ['Bloqueado', 'estado--error'], Eliminado: ['Eliminado', 'estado--apagado'] }[estado] || ['Borrador', 'estado--apagado'];
}

function urlPanel(ruta, partes) {
    const p = partes.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '').map(([n, v]) => `${n}=${encodeURIComponent(v)}`);
    return p.length ? `${ruta}?${p.join('&')}` : ruta;
}

const conPagina = (url, n) => (n <= 1 ? url : `${url}${url.includes('?') ? '&' : '?'}pagina=${n}`);

function paginacion(pagina, paginas, url) {
    if (paginas <= 1) return '';
    return html`<nav class="paginas-admin" aria-label="Páginas">
        ${pagina > 1 ? html`<a class="boton boton--secundario" href="${url(pagina - 1)}">Anterior</a>` : ''}
        <span class="paginas-admin__actual">Página ${pagina} de ${paginas}</span>
        ${pagina < paginas ? html`<a class="boton boton--secundario" href="${url(pagina + 1)}">Siguiente</a>` : ''}
    </nav>`;
}

function pPerfilesAdmin(ctx) {
    const ver = (ctx.query.get('ver') || '').toLowerCase();
    const filtro = ['activos', 'enprueba', 'vencidos', 'bloqueados', 'borradores'].includes(ver) ? ver : 'todos';
    const q = texto(ctx.query.get('q'));
    const todos = db.perfiles.filter((p) => p.estado !== 'Eliminado').map((p) => ({ p, prueba: !!suscripcionDe(p.id)?.esPrueba }));
    const cuenta = {
        todos: todos.length,
        activos: todos.filter((x) => x.p.estado === 'Activo' && !x.prueba).length,
        enprueba: todos.filter((x) => x.p.estado === 'Activo' && x.prueba).length,
        vencidos: todos.filter((x) => x.p.estado === 'Vencido').length,
        bloqueados: todos.filter((x) => x.p.estado === 'Bloqueado').length,
        borradores: todos.filter((x) => x.p.estado === 'Borrador').length
    };
    let filas = todos.filter((x) => filtro === 'todos' || (filtro === 'activos' && x.p.estado === 'Activo' && !x.prueba) || (filtro === 'enprueba' && x.p.estado === 'Activo' && x.prueba)
        || (filtro === 'vencidos' && x.p.estado === 'Vencido') || (filtro === 'bloqueados' && x.p.estado === 'Bloqueado') || (filtro === 'borradores' && x.p.estado === 'Borrador'));
    if (q) {
        const b = sinTildes(q);
        filas = filas.filter((x) => {
            const u = usuarioDe(x.p.usuarioId);
            return sinTildes(proveedorDe(x.p)).includes(b) || sinTildes(nombreCompleto(u)).includes(b) || sinTildes(u.correo || '').includes(b);
        });
    }
    filas.sort((a, b) => (b.p.alta ?? b.p.modificacion) - (a.p.alta ?? a.p.modificacion) || b.p.id - a.p.id);
    const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA_PANEL));
    const pagina = Math.min(Math.max(1, entero(ctx.query.get('pagina')) || 1), paginas);
    const pestanas = [['todos', 'Todos', 'Todos'], ['activos', 'Activos', 'Activos'], ['enprueba', 'En prueba', 'EnPrueba'], ['vencidos', 'Vencidos', 'Vencidos'], ['bloqueados', 'Bloqueados', 'Bloqueados'], ['borradores', 'Borradores', 'Borradores']];
    const url = (f) => urlPanel('/admin/perfiles', [['ver', f === 'todos' ? null : f], ['q', q]]);
    const cuerpo = html`
    <div class="titulo-admin-fila">
        <h1 class="titulo-admin">Perfiles <span class="titulo-admin__cuenta">${cuenta.todos}</span></h1>
        <form class="buscar-admin" method="get" action="/admin/perfiles" role="search">
            ${filtro !== 'todos' ? html`<input type="hidden" name="ver" value="${filtro}" />` : ''}
            <label class="sr-only" for="q">Buscar perfiles por nombre o correo</label>
            <input class="control" id="q" name="q" type="search" value="${q ?? ''}" placeholder="Buscar por nombre o correo" maxlength="100" />
        </form>
    </div>
    <nav class="filtros-admin" aria-label="Qué perfiles mostrar">
        ${pestanas.map(([f, n]) => html`<a href="${url(f)}"${attr('aria-current', filtro === f ? 'page' : null)}>${f === 'todos' ? n : `${n} (${cuenta[f]})`}</a>`)}
    </nav>
    ${filas.length === 0 ? html`<div class="vacio"><p class="vacio__titulo">${q ? `Ningún perfil coincide con «${q}».` : 'No hay perfiles en esta lista.'}</p></div>` : html`
    <div class="tabla-admin tabla-admin--perfiles">
        <div class="tabla-admin__cabecera" aria-hidden="true"><span>Proveedor</span><span>Gran rubro</span><span>Calificación</span><span>Alta</span><span>Estado</span><span></span></div>
        <ul class="tabla-admin__filas">${filas.slice((pagina - 1) * POR_PAGINA_PANEL, pagina * POR_PAGINA_PANEL).map(({ p, prueba }) => {
            const [estado, clase] = textoPerfilPanel(p.estado, prueba);
            const servs = db.servicios.filter((s) => s.perfilId === p.id && s.estado !== 'Borrador');
            const cats = [...new Set(servs.flatMap((s) => s.categoriaIds.map((c) => categoriaDe(c).nombre)))].sort((a, b) => a.localeCompare(b, 'es'));
            const grandes = [...new Set(servs.map((s) => granRubroDe(s).nombre))].sort();
            const cal = calificacionDe(p.id);
            return html`<li class="tabla-admin__fila">
                <span class="tabla-admin__principal">
                    <a class="tabla-admin__nombre" href="/admin/perfiles/${p.id}">${proveedorDe(p)}</a>
                    ${cats.length ? html`<span class="tabla-admin__detalle">${cats.join(', ')}</span>` : ''}
                </span>
                <span class="tabla-admin__estado"><span class="estado ${clase}">${estado}</span></span>
                <span class="tabla-admin__datos">
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Gran rubro: </span>${grandes.length ? grandes.join(' y ') : '—'}</span>
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Calificación: </span>${cal.cantidad ? F.rating(cal.promedio) : '—'}</span>
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Alta: </span>${F.fechaCorta(p.alta ?? p.modificacion)}</span>
                </span>
                <a class="tabla-admin__accion" href="/admin/perfiles/${p.id}" tabindex="-1" aria-hidden="true">Ver</a>
            </li>`;
        })}</ul>
    </div>
    ${paginacion(pagina, paginas, (n) => conPagina(url(filtro), n))}`}`;
    return paginaAdmin(ctx, 'Perfiles', '/admin/perfiles', cuerpo);
}

function pPerfilAdmin(ctx, id) {
    const p = perfilDe(id);
    if (!p || p.estado === 'Eliminado') return null;
    const u = usuarioDe(p.usuarioId);
    const s = suscripcionDe(p.id);
    const [estado, clase] = textoPerfilPanel(p.estado, !!s?.esPrueba);
    const sus = !s ? 'Todavía no publicó: la prueba empieza con el primer servicio.'
        : s.estado === 'Prueba' ? `Prueba gratis hasta el ${F.fechaLarga(s.cubiertoHasta)}`
        : s.estado === 'Activa' ? `Al día hasta el ${F.fechaLarga(s.cubiertoHasta)}`
        : s.estado === 'Vencida' ? `Vencida: cubierta hasta el ${F.fechaLarga(s.cubiertoHasta)}` : 'Cancelada';
    const cal = calificacionDe(p.id);
    const servicios = db.servicios.filter((x) => x.perfilId === p.id).sort((a, b) => a.id - b.id);
    const estadoServ = (e) => ({ Publicado: ['Publicado', 'estado--ok'], Pausado: ['Pausado', 'estado--aviso'], Oculto: ['Oculto', 'estado--error'] }[e] || ['Borrador', 'estado--apagado']);
    const cuerpo = html`
    <p class="volver-admin"><a class="enlace-fuerte" href="/admin/perfiles">‹ Perfiles</a></p>
    <div class="titulo-admin-fila">
        <h1 class="titulo-admin">${proveedorDe(p)}</h1>
        <span class="estado ${clase}">${estado}</span>
    </div>
    <dl class="ficha-admin">
        <div><dt>Correo</dt><dd>${u.correo ?? '—'}</dd></div>
        <div><dt>Persona</dt><dd>${p.tipoPersona === 'Empresa' ? 'Empresa' : 'Física'}</dd></div>
        <div><dt>Alta</dt><dd>${F.fechaCorta(p.alta ?? p.modificacion)}</dd></div>
        <div><dt>Calificación</dt><dd>${cal.cantidad ? `${F.rating(cal.promedio)} (${F.opiniones(cal.cantidad)})` : 'Sin opiniones'}</dd></div>
        <div><dt>Suscripción</dt><dd>${sus}${s ? (s.formaPago === 'DebitoAutomatico' ? ', débito automático' : ', pago manual') : ''}</dd></div>
        <div><dt>Cuenta</dt><dd><a href="/admin/usuarios/${u.id}">Ver la cuenta</a></dd></div>
        ${p.estado === 'Activo' ? html`<div><dt>Ficha pública</dt><dd><a href="/${p.slug}">/${p.slug}</a></dd></div>` : ''}
    </dl>
    <section class="seccion-admin" aria-labelledby="servicios-titulo">
        <h2 class="subtitulo-admin" id="servicios-titulo">Servicios</h2>
        ${servicios.length === 0 ? html`<p class="admin-texto">No tiene servicios.</p>` : html`<ul class="lista-admin">${servicios.map((x) => {
            const [e, c] = estadoServ(x.estado);
            const cats = x.categoriaIds.map((cid) => categoriaDe(cid).nombre).join(', ');
            return html`<li><span class="lista-admin__titulo">${texto(x.titulo) ? x.titulo : 'Sin título'}</span><span class="lista-admin__detalle">${cats || 'Sin categorías'}</span><span class="estado ${c}">${e}</span></li>`;
        })}</ul>`}
    </section>
    ${p.estado === 'Bloqueado' ? html`<section class="seccion-admin" aria-labelledby="desbloquear-titulo">
        <h2 class="subtitulo-admin" id="desbloquear-titulo">Desbloquear</h2>
        <p class="admin-texto">Vuelve a verse si la cuota está al día; si no, queda vencido hasta que pague. Los destacados que perdió no vuelven.</p>
        <form method="post" action="/admin/perfiles/${p.id}/desbloquear"><button type="submit" class="boton boton--secundario">Desbloquear el perfil</button></form>
    </section>` : html`<section class="seccion-admin" aria-labelledby="bloquear-titulo">
        <h2 class="subtitulo-admin" id="bloquear-titulo">Bloquear</h2>
        <p class="admin-texto">Deja de verse en el acto y pierde sus destacados, sin devolución. La cuenta puede seguir ingresando; para cortarla, bloqueá la cuenta.</p>
        <details class="confirmar">
            <summary class="boton boton--peligro-contorno">Bloquear el perfil</summary>
            <form class="confirmar__panel" method="post" action="/admin/perfiles/${p.id}/bloquear">
                <label class="campo__etiqueta" for="motivo">Motivo</label>
                <textarea class="control control--texto" id="motivo" name="motivo" rows="3" maxlength="500" required aria-describedby="motivo-ayuda"></textarea>
                <p class="campo__ayuda" id="motivo-ayuda">Queda en el registro de actividad.</p>
                <button type="submit" class="boton boton--peligro">Bloquear el perfil</button>
            </form>
        </details>
    </section>`}`;
    return paginaAdmin(ctx, proveedorDe(p), '/admin/perfiles', cuerpo, { volver: '/admin/perfiles', volverTexto: 'Perfiles' });
}

function bloquearPerfil(p, adminId, motivo) {
    p.estado = 'Bloqueado';
    for (const d of db.destacados.filter((x) => x.perfilId === p.id && x.estado !== 'Retirado')) d.estado = 'Retirado';
    registrar(adminId, 'PerfilBloqueado', `Perfil de ${proveedorDe(p)}`, motivo);
}

function estadoAlDesbloquear(p) {
    const s = suscripcionDe(p.id);
    if (!s) return 'Borrador';
    if (!publicadosDe(p.id).length && !db.servicios.some((x) => x.perfilId === p.id && x.estado !== 'Borrador')) return 'Borrador';
    return debe(s.cubiertoHasta, diaUy(ahora())) && partesDia(diaUy(ahora())).d > 10 ? 'Vencido' : 'Activo';
}

function postBloquearPerfil(ctx, id, d) {
    const p = perfilDe(id);
    if (!p) return null;
    if (!texto(d.motivo)) return { redirect: `/admin/perfiles/${id}`, alerta: 'Escribí el motivo: queda en el registro de actividad.' };
    if (p.estado === 'Bloqueado') return { redirect: `/admin/perfiles/${id}`, aviso: 'Ese perfil ya estaba bloqueado.' };
    bloquearPerfil(p, ctx.usuario.id, d.motivo.trim());
    return { redirect: `/admin/perfiles/${id}`, aviso: 'Listo, el perfil quedó bloqueado: ya no se ve y perdió sus destacados.' };
}

function postDesbloquearPerfil(ctx, id) {
    const p = perfilDe(id);
    if (!p) return null;
    if (p.estado !== 'Bloqueado') return { redirect: `/admin/perfiles/${id}`, aviso: 'Ese perfil no estaba bloqueado.' };
    if (usuarioDe(p.usuarioId).estado === 'Bloqueado') return { redirect: `/admin/perfiles/${id}`, alerta: 'La cuenta de este perfil está bloqueada: desbloqueá primero la cuenta.' };
    p.estado = estadoAlDesbloquear(p);
    registrar(ctx.usuario.id, 'PerfilDesbloqueado', `Perfil de ${proveedorDe(p)}`);
    return { redirect: `/admin/perfiles/${id}`, aviso: 'Listo, el perfil quedó desbloqueado. Vuelve a verse si la cuota está al día.' };
}

// ---------- Usuarios (D04) ----------

const textoUsuarioPanel = (u) => (u.estado === 'Bloqueado' ? ['Bloqueado', 'estado--error'] : u.estado === 'Eliminado' ? ['Eliminado', 'estado--apagado'] : !u.confirmado ? ['Sin confirmar', 'estado--aviso'] : ['Activo', 'estado--ok']);

function cuandoPanel(ms) {
    if (!ms) return '—';
    const d = diasEntre(ms, ahora());
    return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d < 30 ? `hace ${d} días` : F.fechaCorta(ms);
}

function pUsuariosAdmin(ctx) {
    const q = texto(ctx.query.get('q'));
    let filas = [...db.usuarios];
    if (q) {
        const b = sinTildes(q);
        filas = filas.filter((u) => u.estado !== 'Eliminado' && (sinTildes(nombreCompleto(u)).includes(b) || sinTildes(u.correo || '').includes(b)));
    }
    filas.sort((a, b) => b.registro - a.registro || b.id - a.id);
    const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA_PANEL));
    const pagina = Math.min(Math.max(1, entero(ctx.query.get('pagina')) || 1), paginas);
    const url = (n) => conPagina(urlPanel('/admin/usuarios', [['q', q]]), n);
    const cuerpo = html`
    <div class="titulo-admin-fila">
        <h1 class="titulo-admin">Usuarios <span class="titulo-admin__cuenta">${filas.length}</span></h1>
        <form class="buscar-admin" method="get" action="/admin/usuarios" role="search">
            <label class="sr-only" for="q">Buscar usuarios por nombre o correo</label>
            <input class="control" id="q" name="q" type="search" value="${q ?? ''}" placeholder="Buscar por nombre o correo" maxlength="100" />
        </form>
    </div>
    ${filas.length === 0 ? html`<div class="vacio"><p class="vacio__titulo">${q ? `Ningún usuario coincide con «${q}».` : 'Todavía no hay usuarios.'}</p></div>` : html`
    <div class="tabla-admin tabla-admin--usuarios">
        <div class="tabla-admin__cabecera" aria-hidden="true"><span>Nombre</span><span>Correo</span><span>Tiene</span><span>Últ. acceso</span><span>Estado</span><span></span></div>
        <ul class="tabla-admin__filas">${filas.slice((pagina - 1) * POR_PAGINA_PANEL, pagina * POR_PAGINA_PANEL).map((u) => {
            const [estado, clase] = textoUsuarioPanel(u);
            const eliminado = u.estado === 'Eliminado';
            const perfil = db.perfiles.some((p) => p.usuarioId === u.id && p.estado !== 'Eliminado');
            const cv = !!cvDeUsuario(u.id);
            const tiene = perfil && cv ? 'Perfil y CV' : perfil ? 'Perfil' : cv ? 'CV' : '—';
            return html`<li class="tabla-admin__fila">
                <span class="tabla-admin__principal">
                    ${eliminado ? html`<span class="tabla-admin__nombre">Usuario eliminado</span>` : html`<a class="tabla-admin__nombre" href="/admin/usuarios/${u.id}">${nombreCompleto(u)}</a>`}
                    ${u.admin ? html`<span class="tabla-admin__detalle">Administración</span>` : ''}
                </span>
                <span class="tabla-admin__estado"><span class="estado ${clase}">${estado}</span></span>
                <span class="tabla-admin__datos">
                    <span class="tabla-admin__celda tabla-admin__celda--larga"><span class="tabla-admin__etiqueta">Correo: </span>${eliminado ? '—' : u.correo ?? '—'}</span>
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Tiene: </span>${tiene}</span>
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Último acceso: </span>${cuandoPanel(u.ultimoAcceso)}</span>
                </span>
                ${eliminado ? html`<span class="tabla-admin__accion" aria-hidden="true">—</span>` : html`<a class="tabla-admin__accion" href="/admin/usuarios/${u.id}" tabindex="-1" aria-hidden="true">${u.estado === 'Activo' && !u.confirmado ? 'Reenviar' : 'Ver'}</a>`}
            </li>`;
        })}</ul>
    </div>
    ${paginacion(pagina, paginas, url)}`}`;
    return paginaAdmin(ctx, 'Usuarios', '/admin/usuarios', cuerpo);
}

function pUsuarioAdmin(ctx, id) {
    const u = usuarioDe(id);
    if (!u) return null;
    const eliminado = u.estado === 'Eliminado';
    const [estado, clase] = textoUsuarioPanel(u);
    const perfil = db.perfiles.find((p) => p.usuarioId === u.id && p.estado !== 'Eliminado');
    const sePuede = u.estado === 'Activo' && !u.admin && u.id !== ctx.usuario.id;
    const cuerpo = html`
    <p class="volver-admin"><a class="enlace-fuerte" href="/admin/usuarios">‹ Usuarios</a></p>
    <div class="titulo-admin-fila">
        <h1 class="titulo-admin">${eliminado ? 'Usuario eliminado' : nombreCompleto(u)}</h1>
        <span class="estado ${clase}">${estado}</span>
    </div>
    <dl class="ficha-admin">
        <div><dt>Correo</dt><dd>${eliminado ? '—' : u.correo ?? '—'}${u.confirmado || eliminado ? '' : ' (sin confirmar)'}</dd></div>
        <div><dt>Registro</dt><dd>${F.fechaCorta(u.registro)}</dd></div>
        <div><dt>Último acceso</dt><dd>${cuandoPanel(u.ultimoAcceso)}</dd></div>
        <div><dt>Opiniones escritas</dt><dd>${db.resenas.filter((r) => r.usuarioId === u.id).length}</dd></div>
        <div><dt>CV</dt><dd>${cvDeUsuario(u.id) ? 'Tiene un CV' : 'No tiene'}</dd></div>
        <div><dt>Perfil de proveedor</dt><dd>${perfil ? html`<a href="/admin/perfiles/${perfil.id}">${proveedorDe(perfil)}</a> (${textoPerfilPanel(perfil.estado, false)[0].toLowerCase()})` : 'No tiene'}</dd></div>
        ${u.admin ? html`<div><dt>Rol</dt><dd>Administración</dd></div>` : ''}
    </dl>
    ${u.estado === 'Activo' && !u.confirmado ? html`<section class="seccion-admin" aria-labelledby="reenviar-titulo">
        <h2 class="subtitulo-admin" id="reenviar-titulo">Confirmación del correo</h2>
        <p class="admin-texto">Todavía no confirmó el correo: puede ingresar, pero no opinar ni publicar.</p>
        <form method="post" action="/admin/usuarios/${u.id}/reenviar"><button type="submit" class="boton boton--secundario">Reenviar el enlace</button></form>
    </section>` : ''}
    ${u.estado === 'Bloqueado' ? html`<section class="seccion-admin" aria-labelledby="desbloquear-titulo">
        <h2 class="subtitulo-admin" id="desbloquear-titulo">Desbloquear</h2>
        <p class="admin-texto">Puede volver a ingresar. Su perfil, si tiene, vuelve a verse si la cuota está al día.</p>
        <form method="post" action="/admin/usuarios/${u.id}/desbloquear"><button type="submit" class="boton boton--secundario">Desbloquear la cuenta</button></form>
    </section>` : sePuede ? html`<section class="seccion-admin" aria-labelledby="bloquear-titulo">
        <h2 class="subtitulo-admin" id="bloquear-titulo">Bloquear</h2>
        <p class="admin-texto">No puede volver a ingresar y se cierran sus sesiones abiertas. Su perfil, si tiene, deja de verse y pierde sus destacados. Sus opiniones siguen publicadas.</p>
        <details class="confirmar">
            <summary class="boton boton--peligro-contorno">Bloquear la cuenta</summary>
            <form class="confirmar__panel" method="post" action="/admin/usuarios/${u.id}/bloquear">
                <label class="campo__etiqueta" for="motivo">Motivo</label>
                <textarea class="control control--texto" id="motivo" name="motivo" rows="3" maxlength="500" required aria-describedby="motivo-ayuda"></textarea>
                <p class="campo__ayuda" id="motivo-ayuda">Queda en el registro de actividad.</p>
                <button type="submit" class="boton boton--peligro">Bloquear la cuenta</button>
            </form>
        </details>
    </section>` : ''}`;
    return paginaAdmin(ctx, eliminado ? 'Usuario eliminado' : nombreCompleto(u), '/admin/usuarios', cuerpo, { volver: '/admin/usuarios', volverTexto: 'Usuarios' });
}

function bloquearUsuario(u, adminId, motivo) {
    u.estado = 'Bloqueado';
    const perfil = db.perfiles.find((p) => p.usuarioId === u.id && p.estado !== 'Eliminado' && p.estado !== 'Bloqueado');
    if (perfil) {
        perfil.estado = 'Bloqueado';
        for (const d of db.destacados.filter((x) => x.perfilId === perfil.id && x.estado !== 'Retirado')) d.estado = 'Retirado';
    }
    registrar(adminId, 'UsuarioBloqueado', `Cuenta de ${nombreCompleto(u)}`, motivo);
}

function postBloquearUsuario(ctx, id, d) {
    const u = usuarioDe(id);
    if (!u) return null;
    if (!texto(d.motivo)) return { redirect: `/admin/usuarios/${id}`, alerta: 'Escribí el motivo: queda en el registro de actividad.' };
    if (u.admin) return { redirect: `/admin/usuarios/${id}`, alerta: 'Una cuenta de la administración no se bloquea.' };
    if (u.estado === 'Bloqueado') return { redirect: `/admin/usuarios/${id}`, aviso: 'Esa cuenta ya estaba bloqueada.' };
    bloquearUsuario(u, ctx.usuario.id, d.motivo.trim());
    return { redirect: `/admin/usuarios/${id}`, aviso: 'Listo, la cuenta quedó bloqueada: no puede ingresar y su perfil, si tiene, ya no se ve.' };
}

function postDesbloquearUsuario(ctx, id) {
    const u = usuarioDe(id);
    if (!u) return null;
    if (u.estado !== 'Bloqueado') return { redirect: `/admin/usuarios/${id}`, aviso: 'Esa cuenta no estaba bloqueada.' };
    u.estado = 'Activo';
    const perfil = db.perfiles.find((p) => p.usuarioId === u.id && p.estado === 'Bloqueado');
    if (perfil) perfil.estado = estadoAlDesbloquear(perfil);
    registrar(ctx.usuario.id, 'UsuarioDesbloqueado', `Cuenta de ${nombreCompleto(u)}`);
    return { redirect: `/admin/usuarios/${id}`, aviso: 'Listo, la cuenta quedó desbloqueada y puede volver a ingresar.' };
}

function postReenviarAdmin(ctx, id) {
    const u = usuarioDe(id);
    if (!u) return null;
    if (u.confirmado || u.estado !== 'Activo') return { redirect: `/admin/usuarios/${id}`, alerta: 'A esa cuenta no hay que reenviarle la confirmación.' };
    enviarConfirmacion(u);
    return { redirect: `/admin/usuarios/${id}`, aviso: 'Listo, le reenviamos el enlace para confirmar el correo.' };
}

// ---------- CV publicados (D05) ----------

function pCvAdmin(ctx) {
    const filas = db.curriculums.filter((c) => c.estado !== 'Borrador' && usuarioDe(c.usuarioId).estado !== 'Eliminado').sort((a, b) => b.actualizacion - a.actualizacion || b.id - a.id);
    const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA_PANEL));
    const pagina = Math.min(Math.max(1, entero(ctx.query.get('pagina')) || 1), paginas);
    const textoCv = (c) => (c.estado === 'Publicado' ? ['Publicado', 'estado--ok'] : c.estado === 'Pausado' ? ['Pausado', 'estado--aviso'] : c.estado === 'Oculto' && c.ocultoPorFiltro ? ['Oculto por el filtro', 'estado--apagado'] : c.estado === 'Oculto' ? ['Oculto', 'estado--error'] : ['Borrador', 'estado--apagado']);
    const cuerpo = html`
    <h1 class="titulo-admin">CV publicados <span class="titulo-admin__cuenta">${filas.length}</span></h1>
    ${filas.length === 0 ? html`<div class="vacio"><p class="vacio__titulo">Todavía no hay CV publicados.</p></div>` : html`
    <div class="tabla-admin tabla-admin--cv">
        <div class="tabla-admin__cabecera" aria-hidden="true"><span>Persona</span><span>Qué sabe hacer</span><span>Actualizado</span><span>Estado</span><span></span></div>
        <ul class="tabla-admin__filas">${filas.slice((pagina - 1) * POR_PAGINA_PANEL, pagina * POR_PAGINA_PANEL).map((c) => {
            const u = usuarioDe(c.usuarioId);
            const nombre = nombreConInicial(u.nombre, u.apellido);
            const [estado, clase] = textoCv(c);
            return html`<li class="tabla-admin__fila">
                <span class="tabla-admin__principal">${c.estado === 'Publicado' ? html`<a class="tabla-admin__nombre" href="/curriculum/${c.id}" target="_blank" rel="noopener">${nombre}<span class="sr-only"> (se abre en otra pestaña)</span></a>` : html`<span class="tabla-admin__nombre">${nombre}</span>`}</span>
                <span class="tabla-admin__estado"><span class="estado ${clase}">${estado}</span></span>
                <span class="tabla-admin__datos">
                    <span class="tabla-admin__celda tabla-admin__celda--larga"><span class="tabla-admin__etiqueta">Qué sabe hacer: </span>${c.queSabeHacer}</span>
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Actualizado: </span>${F.fechaCorta(c.actualizacion)}</span>
                </span>
                <span class="tabla-admin__accion">${c.estado === 'Oculto'
                    ? html`<form method="post" action="/admin/cv/${c.id}/reactivar"><button type="submit" class="boton-enlace">Reactivar<span class="sr-only"> el CV de ${nombre}</span></button></form>`
                    : html`<details class="confirmar confirmar--fila">
                        <summary class="boton-enlace boton-enlace--peligro">Ocultar<span class="sr-only"> el CV de ${nombre}</span></summary>
                        <form class="confirmar__panel" method="post" action="/admin/cv/${c.id}/ocultar">
                            <label class="campo__etiqueta" for="motivo-${c.id}">Motivo</label>
                            <textarea class="control control--texto" id="motivo-${c.id}" name="motivo" rows="2" maxlength="500" required></textarea>
                            <button type="submit" class="boton boton--peligro">Ocultar el CV</button>
                        </form>
                    </details>`}</span>
            </li>`;
        })}</ul>
    </div>
    ${paginacion(pagina, paginas, (n) => conPagina('/admin/cv', n))}`}`;
    return paginaAdmin(ctx, 'CV publicados', '/admin/cv', cuerpo);
}

function postOcultarCvPanel(ctx, id, d) {
    const c = db.curriculums.find((x) => x.id === id);
    if (!c) return null;
    if (!texto(d.motivo)) return { redirect: '/admin/cv', alerta: 'Escribí el motivo: queda en el registro de actividad.' };
    if (c.estado === 'Oculto') return { redirect: '/admin/cv', aviso: 'Ese CV ya estaba oculto.' };
    ocultarCv(c, ctx.usuario.id, d.motivo.trim());
    return { redirect: '/admin/cv', aviso: 'Listo, el CV quedó oculto.' };
}

function postReactivarCvPanel(ctx, id) {
    const c = db.curriculums.find((x) => x.id === id);
    if (!c) return null;
    if (c.estado !== 'Oculto') return { redirect: '/admin/cv', aviso: 'Ese CV no estaba oculto.' };
    reactivarCv(c, ctx.usuario.id);
    return { redirect: '/admin/cv', aviso: 'Listo, el CV vuelve a verse.' };
}

// ---------- Moderación de opiniones (D06) ----------

function pModeracion(ctx, id = null) {
    const ver = ctx.query.get('ver');
    const listaNombre = ver === 'filtro' ? 'DelFiltro' : ver === 'ocultas' ? 'Ocultas' : 'Reportadas';
    const verParam = listaNombre === 'DelFiltro' ? 'filtro' : listaNombre === 'Ocultas' ? 'ocultas' : null;
    const urlLista = (l) => (l === 'DelFiltro' ? '/admin/resenas?ver=filtro' : l === 'Ocultas' ? '/admin/resenas?ver=ocultas' : '/admin/resenas');
    const urlDetalle = (rid) => (verParam ? `/admin/resenas/${rid}?ver=${verParam}` : `/admin/resenas/${rid}`);
    const r = resumenModeracion();
    const fechaReporte = (x) => db.reportesResena.filter((y) => y.resenaId === x.id && y.estado === 'Pendiente').sort((a, b) => b.fecha - a.fecha)[0]?.fecha ?? null;
    const items = db.resenas.filter((x) => (listaNombre === 'Reportadas' ? x.estado === 'Reportada' : listaNombre === 'DelFiltro' ? x.estado === 'Oculta' && x.ocultaPorFiltro : x.estado === 'Oculta' && !x.ocultaPorFiltro))
        .sort((a, b) => (fechaReporte(b) ?? b.modificacion ?? b.creacion) - (fechaReporte(a) ?? a.modificacion ?? a.creacion));
    const detalle = id !== null ? db.resenas.find((x) => x.id === id) : null;
    if (id !== null && !detalle) return null;
    const recortar = (t, n) => (t.length <= n ? t : t.slice(0, n).trimEnd() + '…');
    const extracto = (x) => (x.estado === 'Oculta' && x.ocultaPorFiltro ? `${x.calificacion}★, retenida por palabra prohibida` : `${x.calificacion}★ “${recortar(x.comentario, 32)}”`);
    const cuando = (x) => (fechaReporte(x) ? `reportada ${F.hace(fechaReporte(x)).toLowerCase()}` : F.hace(x.modificacion ?? x.creacion).toLowerCase());
    const actual = (l) => attr('aria-current', listaNombre === l ? 'page' : null);

    let panel = '';
    if (detalle) {
        const o = detalle;
        const perfil = perfilDe(o.perfilId);
        const prov = perfil.estado === 'Eliminado' ? 'Un proveedor que ya no está en Red Nexa' : proveedorDe(perfil);
        const [estado, clase] = o.estado === 'Reportada' ? ['Reportada, sigue visible', 'estado--aviso'] : o.estado === 'Oculta' && o.ocultaPorFiltro ? ['Retenida por el filtro, no se ve', 'estado--error'] : o.estado === 'Oculta' ? ['Oculta por la administración', 'estado--apagado'] : ['Publicada', 'estado--ok'];
        const retenida = o.estado === 'Oculta' && o.ocultaPorFiltro;
        const ocultaAdmin = o.estado === 'Oculta' && !o.ocultaPorFiltro;
        const autor = usuarioDe(o.usuarioId);
        const puedeBloquear = !ocultaAdmin && autor.estado === 'Activo' && !autor.admin;
        const reportes = db.reportesResena.filter((x) => x.resenaId === o.id && x.estado === 'Pendiente').sort((a, b) => b.fecha - a.fecha);
        const notas = db.resenas.filter((x) => x.usuarioId === autor.id).map((x) => x.calificacion);
        const reportadasAntes = new Set(db.reportesResena.filter((x) => x.resenaId !== o.id && db.resenas.find((y) => y.id === x.resenaId)?.usuarioId === autor.id).map((x) => x.resenaId)).size;
        const partes = [];
        if (autor.estado === 'Eliminado') partes.push('Eliminó su cuenta.');
        else {
            partes.push(`Cuenta creada ${F.hace(autor.registro).toLowerCase()}.`);
            if (autor.estado === 'Bloqueado') partes.push('Está bloqueada.');
        }
        partes.push(notas.length === 1 ? `Escribió sólo esta opinión, de ${notas[0]}★.` : new Set(notas).size === 1 ? `Escribió ${notas.length} opiniones, todas de ${notas[0]}★.` : `Escribió ${notas.length} opiniones, de ${Math.min(...notas)}★ a ${Math.max(...notas)}★.`);
        partes.push(reportadasAntes === 0 ? 'Sin reportes previos.' : reportadasAntes === 1 ? 'Le reportaron otra opinión antes.' : `Le reportaron ${reportadasAntes} opiniones antes.`);
        panel = html`<section class="moderacion__detalle" aria-labelledby="detalle-titulo">
            <a class="enlace-panel moderacion__volver" href="${urlLista(listaNombre)}">${icono('volver')}Por moderar (${r.porModerar})</a>
            <div class="moderacion__cabecera">
                <h2 class="moderacion__titulo" id="detalle-titulo">Opinión sobre ${prov}</h2>
                <span class="estado ${clase}">${estado}</span>
            </div>
            <div class="moderacion__opinion">
                <div class="opinion__cabecera">
                    <p class="opinion__autor">${autorDe(o.usuarioId)}</p>
                    <p class="estrellas" aria-hidden="true">${estrellas(o.calificacion)}</p>
                    <p class="sr-only">${o.calificacion} de 5</p>
                    <p class="opinion__cuando">${F.fechaLarga(o.modificacion ?? o.creacion)}</p>
                </div>
                <p class="opinion__texto texto-largo">${textoMarcado(o.comentario, o.terminos)}</p>
                ${o.respuesta ? html`<div class="opinion__respuesta"><p class="opinion__respuesta-autor">Respuesta de ${prov}:</p><p class="texto-largo">${o.respuesta.texto}</p></div>` : ''}
                ${perfil.estado === 'Activo' && !retenida && !ocultaAdmin ? html`<a class="enlace-accion" href="/${perfil.slug}#opiniones" target="_blank" rel="noopener">Ver en la ficha<span class="sr-only"> (se abre en otra pestaña)</span></a>` : ''}
            </div>
            <div class="moderacion__datos">
                ${reportes.length ? html`<div class="moderacion__dato">
                    <h3 class="moderacion__dato-titulo">${reportes.length === 1 ? 'Motivo del reporte' : `Motivos de los ${reportes.length} reportes`}</h3>
                    <ul class="moderacion__reportes">${reportes.map((x) => html`<li>
                        <span class="moderacion__reporte-motivo">${MOTIVOS[x.motivo]}${x.delProveedor ? ', del proveedor' : ''}, ${F.hace(x.fecha).toLowerCase()}</span>
                        ${x.comentario ? html`<span class="texto-largo">“${x.comentario}”</span>` : ''}
                    </li>`)}</ul>
                </div>` : ''}
                ${o.terminos && o.terminos.length ? html`<div class="moderacion__dato"><h3 class="moderacion__dato-titulo">Lo que encontró el filtro</h3><p>${listaTerminos(o.terminos)}, marcado en el texto.</p></div>` : ''}
                <div class="moderacion__dato"><h3 class="moderacion__dato-titulo">Historial del autor</h3><p>${partes.join(' ')}</p></div>
            </div>
            <form class="moderacion__decision" method="post" action="/admin/resenas/${o.id}">
                <input type="hidden" name="ver" value="${verParam ?? ''}" />
                <div class="campo">
                    <label class="campo__etiqueta" for="motivo">Motivo de la decisión <span class="campo__opcional">(queda en el registro)</span></label>
                    <textarea class="control control--texto" id="motivo" name="motivo" rows="3" maxlength="1000" placeholder="Explicá por qué" aria-describedby="motivo-ayuda"></textarea>
                    <p class="campo__ayuda" id="motivo-ayuda">${ocultaAdmin ? 'Opcional para volver a publicarla.' : 'Obligatorio para ocultar: le llega al autor por correo, tal cual lo escribas.'}</p>
                </div>
                <div class="moderacion__acciones">
                    ${o.estado === 'Reportada' ? html`<button type="submit" name="decision" value="Mantener" class="boton boton--secundario">Mantener publicada</button>` : ''}
                    ${retenida ? html`<button type="submit" name="decision" value="Publicar" class="boton boton--secundario">Publicar igual</button>` : ''}
                    ${ocultaAdmin ? html`<button type="submit" name="decision" value="Publicar" class="boton boton--primario">Volver a publicar</button>`
                        : html`<button type="submit" name="decision" value="Ocultar" class="boton boton--primario">${retenida ? 'Mantener oculta' : 'Ocultar'}</button>`}
                    ${puedeBloquear ? html`<button type="submit" name="decision" value="OcultarYBloquear" class="boton boton--peligro">${retenida ? 'Mantener oculta y bloquear al autor' : 'Ocultar y bloquear al autor'}</button>` : ''}
                </div>
                <p class="campo__ayuda">${ocultaAdmin ? 'Al publicarla vuelve a contar en el promedio del proveedor.'
                    : (retenida ? 'Si la mantenés oculta, le avisamos al autor por correo.' : 'Al ocultarla se recalculan el promedio del proveedor y les avisamos por correo al autor y al proveedor.')
                        + (puedeBloquear ? ` Bloquear la cuenta oculta todas sus opiniones (${notas.length}) y, si tiene un perfil de proveedor, también deja de verse.` : '')}</p>
            </form>
        </section>`;
    }
    const cuerpo = html`
    <div class="moderacion${detalle ? ' moderacion--detalle' : ''}">
        <section class="moderacion__lista" aria-labelledby="moderacion-titulo">
            <h1 class="titulo-admin" id="moderacion-titulo">Por moderar (${r.porModerar})</h1>
            <nav class="segmentado segmentado--enlaces" aria-label="Qué opiniones mostrar">
                <a href="/admin/resenas"${actual('Reportadas')}>Reportadas (${r.reportadas})</a>
                <a href="/admin/resenas?ver=filtro"${actual('DelFiltro')}>Del filtro (${r.delFiltro})</a>
            </nav>
            <a class="enlace-accion moderacion__ocultas" href="/admin/resenas?ver=ocultas"${actual('Ocultas')}>Ocultas por la administración (${r.ocultas})</a>
            ${items.length === 0 ? html`<p class="moderacion__vacio">${listaNombre === 'DelFiltro' ? 'No hay opiniones retenidas por el filtro.' : listaNombre === 'Ocultas' ? 'No hay opiniones ocultas por la administración.' : 'No hay opiniones reportadas.'}</p>`
                : html`<ul class="moderacion__items">${items.map((x) => {
                    const perfil = perfilDe(x.perfilId);
                    return html`<li><a class="moderacion__item" href="${urlDetalle(x.id)}"${attr('aria-current', detalle?.id === x.id ? 'page' : null)}>
                        <span class="moderacion__quien">${autorDe(x.usuarioId)} sobre ${proveedorDe(perfil)}</span>
                        <span class="moderacion__extracto">${extracto(x)}</span>
                        <span class="moderacion__cuando">${cuando(x)}</span>
                    </a></li>`;
                })}</ul>`}
        </section>
        ${detalle ? panel : items.length ? html`<p class="moderacion__elegir">Elegí una opinión de la lista para leerla y decidir.</p>` : ''}
    </div>`;
    const extra = detalle ? { volver: urlLista(listaNombre), volverTexto: `Por moderar (${r.porModerar})` } : {};
    const prov = detalle ? proveedorDe(perfilDe(detalle.perfilId)) : null;
    return paginaAdmin(ctx, detalle ? `Opinión sobre ${prov}` : 'Opiniones por moderar', '/admin/resenas', cuerpo, extra);
}

function postModeracion(ctx, id, d) {
    const o = db.resenas.find((x) => x.id === id);
    if (!o) return null;
    const ver = d.ver === 'filtro' || d.ver === 'ocultas' ? d.ver : null;
    const lista = ver ? `/admin/resenas?ver=${ver}` : '/admin/resenas';
    const detalle = ver ? `/admin/resenas/${id}?ver=${ver}` : `/admin/resenas/${id}`;
    const decision = d.decision;
    const motivo = texto(d.motivo);
    const retenida = o.estado === 'Oculta' && o.ocultaPorFiltro;
    const ocultaAdmin = o.estado === 'Oculta' && !o.ocultaPorFiltro;
    const perfil = perfilDe(o.perfilId);
    const autor = usuarioDe(o.usuarioId);
    const nombreAutor = autorDe(o.usuarioId);
    const prov = proveedorDe(perfil);
    const a = ctx.usuario.id;
    const detalleRegistro = `Opinión de ${nombreAutor} sobre ${prov}`;
    const cerrar = (estado) => { for (const x of db.reportesResena.filter((y) => y.resenaId === id && y.estado === 'Pendiente')) x.estado = estado; };
    if ((decision === 'Mantener' && o.estado !== 'Reportada') || (decision === 'Publicar' && o.estado !== 'Oculta') || ((decision === 'Ocultar' || decision === 'OcultarYBloquear') && ocultaAdmin)) {
        return { redirect: detalle, alerta: 'Esa decisión ya no corresponde: la opinión cambió mientras la mirabas. Fijate cómo quedó.' };
    }
    if ((decision === 'Ocultar' || decision === 'OcultarYBloquear') && !motivo) {
        return { redirect: detalle, alerta: 'Escribí el motivo de la decisión: queda en el registro y le llega al autor por correo.' };
    }
    const avisarAutor = () => {
        if (autor.correo) {
            enviarCorreo({
                para: autor.correo, asunto: 'Sobre una opinión publicada', nombre: autor.nombre,
                texto: retenida ? `La administración de Red Nexa revisó tu opinión sobre ${prov}, que había retenido el filtro de palabras, y decidió que no se publique. El motivo: ${motivo}`
                    : `La administración de Red Nexa ocultó tu opinión sobre ${prov}, que ya no se ve en el sitio. El motivo: ${motivo}`,
                boton: 'Ver mis reseñas', enlace: '/mi-cuenta/resenas', pie: 'Las opiniones ocultas no cuentan en el promedio del proveedor.'
            });
        }
        const p = usuarioDe(perfil.usuarioId);
        if (!retenida && p.correo) {
            enviarCorreo({
                para: p.correo, asunto: 'Sobre una opinión publicada', nombre: p.nombre,
                texto: `La administración de Red Nexa ocultó la opinión de ${nombreAutor} sobre tu perfil. Ya no se ve en tu ficha.`,
                boton: 'Ver mis opiniones', enlace: '/mi-perfil/opiniones', pie: 'Las opiniones ocultas no cuentan en tu promedio ni en la cantidad de opiniones.'
            });
        }
    };
    if (decision === 'Mantener') {
        o.estado = 'Publicada';
        cerrar('Desestimado');
        registrar(a, 'ReporteDesestimado', detalleRegistro, motivo);
        return { redirect: lista, aviso: `Listo: la opinión de ${nombreAutor} sigue publicada y sus reportes quedaron cerrados.` };
    }
    if (decision === 'Publicar') {
        Object.assign(o, { estado: 'Publicada', ocultaPorFiltro: false, terminos: [] });
        registrar(a, 'ResenaPublicada', detalleRegistro, motivo);
        return { redirect: lista, aviso: `Publicaste la opinión de ${nombreAutor} sobre ${prov}. Ya se ve en la ficha.` };
    }
    Object.assign(o, { estado: 'Oculta', ocultaPorFiltro: false });
    cerrar('Resuelto');
    registrar(a, 'ResenaOcultada', detalleRegistro, motivo);
    avisarAutor();
    if (decision === 'OcultarYBloquear') {
        let n = 0;
        for (const x of db.resenas.filter((y) => y.usuarioId === autor.id)) {
            if (x.estado !== 'Oculta') n++;
            Object.assign(x, { estado: 'Oculta', ocultaPorFiltro: false });
        }
        bloquearUsuario(autor, a, motivo);
        const total = n + 1;
        return { redirect: lista, aviso: total === 1 ? `Ocultaste la opinión y bloqueaste la cuenta de ${nombreAutor}.` : `Bloqueaste la cuenta de ${nombreAutor} y se ocultaron sus ${total} opiniones.` };
    }
    return { redirect: lista, aviso: retenida ? `La opinión de ${nombreAutor} queda oculta. Le avisamos por correo.` : `Ocultaste la opinión de ${nombreAutor}. Recalculamos el promedio y les avisamos al autor y al proveedor.` };
}

// ---------- Categorías (D07) ----------

function pCategoriasAdmin(ctx) {
    const grandes = db.categorias.filter((c) => !c.padreId).sort((a, b) => a.orden - b.orden);
    const gran = grandes.find((g) => g.slug === ctx.query.get('gran')) || grandes[0];
    const rubros = hijas(gran.id);
    const rubroId = entero(ctx.query.get('rubro'));
    const rubro = rubros.find((r) => r.id === rubroId) || rubros[0] || null;
    const cats = rubro ? hijas(rubro.id) : [];
    const contarServ = (c) => db.servicios.filter((s) => s.estado !== 'Borrador' && s.categoriaIds.includes(c.id)).length;
    const urlGran = (g) => `/admin/categorias?gran=${g.slug}`;
    const url = (r) => `/admin/categorias?gran=${gran.slug}${r ? `&rubro=${r.id}` : ''}`;
    const volver = url(rubro);
    const esOtros = (c) => c.slug === 'otros';
    const cuerpo = html`
    <h1 class="titulo-admin">Categorías</h1>
    <div class="catalogo-admin">
        <div class="catalogo-admin__rubros">
            <nav class="segmentos-admin" aria-label="Gran rubro">${grandes.map((g) => html`<a href="${urlGran(g)}"${attr('aria-current', g.id === gran.id ? 'page' : null)}>${g.nombre}</a>`)}</nav>
            <ul class="catalogo-admin__lista" aria-label="Rubros de ${gran.nombre}">${rubros.map((r) => html`<li><a href="${url(r)}"${attr('aria-current', r.id === rubro?.id ? 'page' : null)}>
                <span>${r.nombre}${r.activa ? '' : ' (desactivado)'}</span>
                <span class="catalogo-admin__cuenta">${hijas(r.id).length}<span class="sr-only"> categorías</span></span>
            </a></li>`)}</ul>
            <details class="desplegable-admin">
                <summary class="enlace-fuerte">Nuevo rubro</summary>
                <form class="desplegable-admin__panel" method="post" action="/admin/categorias/agregar">
                    <input type="hidden" name="padre" value="${gran.id}" />
                    <input type="hidden" name="volver" value="${urlGran(gran)}" />
                    <label class="campo__etiqueta" for="nuevo-rubro">Nombre del rubro</label>
                    <input class="control" id="nuevo-rubro" name="nombre" maxlength="80" required aria-describedby="nuevo-rubro-ayuda" />
                    <p class="campo__ayuda" id="nuevo-rubro-ayuda">Nace con su «Otros», para no dejar afuera servicios nuevos.</p>
                    <button type="submit" class="boton boton--primario">Agregar el rubro</button>
                </form>
            </details>
        </div>
        ${rubro ? html`<section class="catalogo-admin__categorias" aria-labelledby="rubro-titulo">
            <div class="titulo-admin-fila">
                <div class="catalogo-admin__titulo">
                    <h2 class="subtitulo-admin" id="rubro-titulo">${rubro.nombre}</h2>
                    <span class="catalogo-admin__ruta">/${rutaCategoria(rubro)}</span>
                </div>
                <details class="desplegable-admin">
                    <summary class="boton boton--primario">Nueva categoría</summary>
                    <form class="desplegable-admin__panel" method="post" action="/admin/categorias/agregar">
                        <input type="hidden" name="padre" value="${rubro.id}" />
                        <input type="hidden" name="volver" value="${volver}" />
                        <label class="campo__etiqueta" for="nueva-categoria">Nombre de la categoría</label>
                        <input class="control" id="nueva-categoria" name="nombre" maxlength="80" required />
                        <label class="casilla"><input type="checkbox" name="matricula" value="true" /><span>Pide matrícula, habilitación o acreditación (RN-51)</span></label>
                        <button type="submit" class="boton boton--primario">Agregar la categoría</button>
                    </form>
                </details>
            </div>
            <details class="desplegable-admin">
                <summary class="enlace-fuerte">Editar el rubro</summary>
                <form class="desplegable-admin__panel" method="post" action="/admin/categorias/${rubro.id}">
                    <input type="hidden" name="volver" value="${volver}" />
                    <label class="campo__etiqueta" for="rubro-nombre">Nombre</label>
                    <input class="control" id="rubro-nombre" name="nombre" value="${rubro.nombre}" maxlength="80" required />
                    <label class="casilla"><input type="checkbox" name="activa" value="true"${bool('checked', rubro.activa)} /><span>Activo: se ve en el sitio y se puede elegir al publicar</span></label>
                    <button type="submit" class="boton boton--primario">Guardar el rubro</button>
                </form>
            </details>
            <div class="categorias-admin__cabecera" aria-hidden="true"><span></span><span>Categoría</span><span>Servicios</span><span>Pide matrícula</span><span>Activa</span><span></span></div>
            <ul class="categorias-admin" aria-label="Categorías de ${rubro.nombre}">${cats.map((c, i) => {
                const otros = esOtros(c);
                const ultima = i === cats.length - 1 || (i + 1 < cats.length && esOtros(cats[i + 1]));
                const n = contarServ(c);
                return html`<li class="categorias-admin__fila">
                    <span class="categorias-admin__orden">${otros ? '' : html`
                        <form method="post" action="/admin/categorias/${c.id}/mover"><input type="hidden" name="direccion" value="-1" /><input type="hidden" name="volver" value="${volver}" /><button type="submit" class="boton-icono"${bool('disabled', i === 0)}>${icono('arriba')}<span class="sr-only">Subir «${c.nombre}»</span></button></form>
                        <form method="post" action="/admin/categorias/${c.id}/mover"><input type="hidden" name="direccion" value="1" /><input type="hidden" name="volver" value="${volver}" /><button type="submit" class="boton-icono"${bool('disabled', ultima)}>${icono('abajo')}<span class="sr-only">Bajar «${c.nombre}»</span></button></form>`}
                    </span>
                    <form class="categorias-admin__datos" method="post" action="/admin/categorias/${c.id}">
                        <input type="hidden" name="volver" value="${volver}" />
                        <label class="sr-only" for="categoria-${c.id}">Nombre de la categoría</label>
                        <input class="control categorias-admin__nombre" id="categoria-${c.id}" name="nombre" value="${c.nombre}" maxlength="80" required${bool('readonly', otros)} />
                        <span class="categorias-admin__cuenta">${n}<span class="categorias-admin__casilla">${n === 1 ? ' servicio' : ' servicios'}</span></span>
                        <label class="casilla"><input type="checkbox" name="matricula" value="true"${bool('checked', c.matricula)} /><span class="categorias-admin__casilla">Pide matrícula</span></label>
                        ${otros ? html`<input type="hidden" name="activa" value="true" /><label class="casilla"><input type="checkbox" checked disabled /><span class="categorias-admin__casilla">Activa, siempre</span></label>`
                            : html`<label class="casilla"><input type="checkbox" name="activa" value="true"${bool('checked', c.activa)} /><span class="categorias-admin__casilla">Activa</span></label>`}
                        <button type="submit" class="boton boton--secundario">Guardar<span class="sr-only"> «${c.nombre}»</span></button>
                    </form>
                </li>`;
            })}</ul>
            <p class="admin-texto">Cada rubro conserva su «Otros» al final, siempre activo (RN-50). Renombrar no cambia la dirección de la categoría: los enlaces que ya circulan siguen andando.</p>
        </section>` : ''}
    </div>`;
    return paginaAdmin(ctx, 'Categorías', '/admin/categorias', cuerpo);
}

const volverCategorias = (v) => (esLocal(v) && v.startsWith('/admin/categorias') ? v : '/admin/categorias');

function postAgregarCategoria(ctx, d) {
    const padre = categoriaDe(entero(d.padre));
    const volver = volverCategorias(d.volver);
    const nombre = (d.nombre || '').trim();
    if (!padre || nivel(padre) > 2) return { redirect: volver, alerta: 'Eso no se puede hacer.' };
    if (nombre.length < 2 || nombre.length > 80) return { redirect: volver, alerta: 'El nombre tiene que tener entre 2 y 80 caracteres.' };
    const hermanas = hijas(padre.id);
    if (hermanas.some((h) => sinTildes(h.nombre) === sinTildes(nombre) || h.slug === slug(nombre))) return { redirect: volver, alerta: 'Ya hay una con ese nombre en el mismo lugar.' };
    const otros = hermanas.find((h) => h.slug === 'otros');
    const orden = otros ? otros.orden : hermanas.length + 1;
    if (otros) otros.orden = orden + 1;
    const nueva = { id: nuevoId('categorias'), nombre, slug: slug(nombre), padreId: padre.id, orden, activa: true, matricula: d.matricula === 'true' };
    db.categorias.push(nueva);
    if (nivel(padre) === 1) db.categorias.push({ id: nuevoId('categorias'), nombre: 'Otros', slug: 'otros', padreId: nueva.id, orden: 1, activa: true, matricula: false });
    registrar(ctx.usuario.id, 'CategoriaAgregada', `«${nombre}» en ${padre.nombre}`);
    return { redirect: nivel(padre) === 1 ? `/admin/categorias?gran=${padre.slug}&rubro=${nueva.id}` : volver, aviso: `Listo, agregamos «${nombre}».` };
}

function postEditarCategoria(ctx, id, d) {
    const c = categoriaDe(id);
    const volver = volverCategorias(d.volver);
    if (!c) return null;
    const nombre = (d.nombre || '').trim();
    const activa = d.activa === 'true';
    const matricula = d.matricula === 'true';
    if (!c.padreId || (c.slug === 'otros' && (nombre !== c.nombre || !activa))) return { redirect: volver, alerta: 'El «Otros» de cada rubro no se renombra ni se desactiva, y los grandes rubros son fijos.' };
    if (nombre.length < 2 || nombre.length > 80) return { redirect: volver, alerta: 'El nombre tiene que tener entre 2 y 80 caracteres.' };
    if (hijas(c.padreId).some((h) => h.id !== c.id && sinTildes(h.nombre) === sinTildes(nombre))) return { redirect: volver, alerta: 'Ya hay una con ese nombre en el mismo lugar.' };
    if (nombre === c.nombre && activa === c.activa && matricula === c.matricula) return { redirect: volver, aviso: 'No había nada que cambiar.' };
    Object.assign(c, { nombre, activa, matricula });
    registrar(ctx.usuario.id, 'CategoriaModificada', `«${nombre}»`);
    return { redirect: volver, aviso: 'Listo, guardamos los cambios.' };
}

function postMoverCategoria(ctx, id, d) {
    const c = categoriaDe(id);
    const volver = volverCategorias(d.volver);
    if (!c || !c.padreId || c.slug === 'otros') return { redirect: volver, alerta: 'Eso no se puede hacer.' };
    const hermanas = hijas(c.padreId).filter((h) => h.slug !== 'otros');
    const i = hermanas.indexOf(c);
    const j = i + (entero(d.direccion) < 0 ? -1 : 1);
    if (j < 0 || j >= hermanas.length) return { redirect: volver, aviso: 'No había nada que cambiar.' };
    [hermanas[i].orden, hermanas[j].orden] = [hermanas[j].orden, hermanas[i].orden];
    registrar(ctx.usuario.id, 'CategoriaModificada', `«${c.nombre}», nuevo orden`);
    return { redirect: volver, aviso: 'Listo, cambiamos el orden.' };
}

// ---------- Palabras prohibidas (D08) ----------

function pPalabras(ctx) {
    const palabras = [...db.palabras].sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
    const rechazadas = ctx.flash.rechazadas || [];
    const cuerpo = html`
    <h1 class="titulo-admin">Palabras prohibidas <span class="titulo-admin__cuenta">${palabras.length}</span></h1>
    <p class="admin-texto">Un texto que contiene alguna no se publica: se le avisa al autor con las palabras marcadas para que lo corrija, y llega a moderación. Se busca la palabra completa; terminá una entrada con * para incluir sus variantes (promo* incluye promoción y promociones). Una expresión puede tener hasta 4 palabras.</p>
    <form class="agregar-palabras" action="/admin/palabras" method="post" enctype="multipart/form-data">
        <div class="agregar-palabras__fila">
            <label class="sr-only" for="Texto">Agregar palabra o expresión</label>
            <input class="control" id="Texto" name="Texto" maxlength="100" autocomplete="off" placeholder="Agregar palabra o expresión" />
            <button type="submit" class="boton boton--primario">Agregar</button>
        </div>
        <details class="agregar-palabras__lista">
            <summary class="enlace-fuerte">Cargar varias a la vez</summary>
            <div class="campo">
                <label class="campo__etiqueta" for="Lista">Pegá una por línea</label>
                <textarea class="control control--texto" id="Lista" name="Lista" rows="6"></textarea>
            </div>
            <div class="campo">
                <label class="boton-archivo"><input class="sr-only" type="file" name="Archivo" accept=".txt,.csv,text/plain" aria-describedby="archivo-ayuda" /><span>Elegir un archivo de texto</span></label>
                <p class="campo__ayuda" id="archivo-ayuda">Un .txt o .csv con una entrada por línea. Se lee y se descarta: no queda guardado.</p>
            </div>
            <button type="submit" class="boton boton--secundario">Cargar las entradas</button>
        </details>
    </form>
    ${rechazadas.length ? html`<div class="aviso aviso--alerta" role="alert">
        <p>${rechazadas.length === 1 ? 'Esta no entró:' : 'Estas no entraron:'}</p>
        <ul class="rechazadas">${rechazadas.map(([t, m]) => html`<li><strong>«${t}»</strong>: ${m}</li>`)}</ul>
    </div>` : ''}
    ${palabras.length === 0 ? html`<div class="vacio"><p class="vacio__titulo">La lista está vacía.</p><p>Hasta que cargues alguna entrada, el filtro no retiene nada y todo se publica en el acto.</p></div>`
        : html`<ul class="palabras" aria-label="Entradas de la lista">${palabras.map((p) => html`<li class="palabra"><span>${p.texto}</span>
            <form method="post" action="/admin/palabras/${p.id}/eliminar"><button type="submit" class="palabra__quitar">${icono('cerrar')}<span class="sr-only">Sacar «${p.texto}» de la lista</span></button></form>
        </li>`)}</ul>`}
    <p class="admin-pie"><span>Retenidos por el filtro ahora</span> <a href="/admin/revision?ver=retenidos">${resumenRevision().retenidas}</a></p>`;
    return paginaAdmin(ctx, 'Palabras prohibidas', '/admin/palabras', cuerpo);
}

async function postPalabras(ctx, d) {
    const entradas = [];
    if (texto(d.Texto)) entradas.push(d.Texto);
    for (const l of (d.Lista || '').split(/\r?\n/)) if (l.trim()) entradas.push(l);
    const archivo = (d.Archivo || []).find((f) => f.size > 0);
    if (archivo) {
        if (archivo.size > 256 * 1024 || !/\.(txt|csv)$/i.test(archivo.name)) return { redirect: '/admin/palabras', alerta: 'El archivo tiene que ser de texto (.txt o .csv), con una entrada por línea, y pesar menos de 256 KB.' };
        for (const l of (await archivo.text()).split(/\r?\n/)) if (l.trim()) entradas.push(l.split(/[,;]/)[0]);
    }
    if (entradas.length === 0) return { redirect: '/admin/palabras', alerta: 'Escribí una palabra o una expresión para agregar.' };
    const rechazadas = [];
    let agregadas = 0;
    for (const e of entradas) {
        const r = crearEntrada(e);
        if (r.error) { rechazadas.push([e.trim(), r.error]); continue; }
        if (db.palabras.some((p) => crearEntrada(p.texto).entrada?.normalizado === r.entrada.normalizado && p.texto.endsWith('*') === r.entrada.prefijo)) {
            rechazadas.push([e.trim(), 'Ya está en la lista.']);
            continue;
        }
        db.palabras.push({ id: nuevoId('palabras'), texto: r.entrada.texto });
        registrar(ctx.usuario.id, 'PalabraAgregada', `«${r.entrada.texto}»`);
        agregadas++;
    }
    return {
        redirect: '/admin/palabras',
        aviso: agregadas ? (agregadas === 1 ? 'Listo, agregamos 1 entrada a la lista.' : `Listo, agregamos ${agregadas} entradas a la lista.`) : null,
        flash: { rechazadas }
    };
}

function postEliminarPalabra(ctx, id) {
    const p = db.palabras.find((x) => x.id === id);
    if (!p) return null;
    db.palabras = db.palabras.filter((x) => x.id !== id);
    registrar(ctx.usuario.id, 'PalabraEliminada', `«${p.texto}»`);
    return { redirect: '/admin/palabras', aviso: 'Listo, la sacamos de la lista. Lo que ya estaba retenido sigue en la cola hasta que lo resuelvas.' };
}

// ---------- Pagos (D09) ----------

function pPagosAdmin(ctx) {
    const actual = periodoActual();
    const meses = [...new Set([...db.pagos.map((p) => p.periodo), actual])].filter((m) => m <= sumarMeses(actual, 1)).sort().reverse();
    const pedido = ctx.query.get('mes');
    const mes = pedido && meses.includes(`${pedido}-01`) ? `${pedido}-01` : actual;
    const ver = (ctx.query.get('ver') || '').toLowerCase();
    const filtro = ['aprobados', 'pendientes', 'rechazados', 'morosos'].includes(ver) ? ver : 'todos';
    const pagos = db.pagos.filter((p) => p.periodo === mes && (p.estado !== 'Pendiente' || p.tx)).sort((a, b) => b.fecha - a.fecha || b.id - a.id);
    const morosos = mes !== actual ? [] : db.perfiles.filter((p) => p.estado === 'Vencido').sort((a, b) => proveedorDe(a).localeCompare(proveedorDe(b), 'es'));
    const cuentas = {
        todos: pagos.length, aprobados: pagos.filter((p) => p.estado === 'Aprobado').length, pendientes: pagos.filter((p) => p.estado === 'Pendiente').length,
        rechazados: pagos.filter((p) => p.estado === 'Rechazado').length, morosos: morosos.length
    };
    const filas = filtro === 'aprobados' ? pagos.filter((p) => p.estado === 'Aprobado') : filtro === 'pendientes' ? pagos.filter((p) => p.estado === 'Pendiente')
        : filtro === 'rechazados' ? pagos.filter((p) => p.estado === 'Rechazado') : filtro === 'morosos' ? [] : pagos;
    const recaudado = pagos.filter((p) => p.estado === 'Aprobado').reduce((a, p) => a + p.monto, 0);
    const esActual = mes === actual;
    const url = (f) => urlPanel('/admin/pagos', [['mes', esActual ? null : mes.slice(0, 7)], ['ver', f === 'todos' ? null : f]]);
    const pestanas = [['todos', 'Todos'], ['aprobados', 'Aprobados'], ['pendientes', 'Pendientes'], ['rechazados', 'Rechazados'], ['morosos', 'Morosos']].filter(([f]) => f !== 'morosos' || esActual);
    const estadoPago = (e) => (e === 'Aprobado' ? ['Aprobado', 'estado--ok'] : e === 'Rechazado' ? ['Rechazado', 'estado--error'] : ['Pendiente', 'estado--aviso']);
    const concepto = (p) => {
        const s = db.suscripciones.find((x) => x.id === p.suscripcionId);
        const tar = s.tarifa === 'Profesionales' ? 'Profesionales' : 'Servicios';
        return p.concepto === 'CuotaAnual' ? `Cuota anual ${tar}` : p.concepto === 'Destacado' ? `Destacado de ${F.mes(p.periodo)}` : `Cuota mensual ${tar}`;
    };
    const titulo = `Pagos de ${F.mes(mes)}`;
    const cuerpo = html`
    <div class="titulo-admin-fila">
        <h1 class="titulo-admin">${titulo}</h1>
        <form class="buscar-admin" method="get" action="/admin/pagos">
            <label class="sr-only" for="mes">Mes</label>
            <select class="control" id="mes" name="mes">${meses.map((m) => html`<option value="${m.slice(0, 7)}"${bool('selected', m === mes)}>${F.mes(m)}</option>`)}</select>
            <button type="submit" class="boton boton--secundario">Ver</button>
        </form>
    </div>
    <nav class="filtros-admin" aria-label="Qué pagos mostrar">${pestanas.map(([f, n]) => html`<a href="${url(f)}"${attr('aria-current', filtro === f ? 'page' : null)}>${n} (${cuentas[f]})</a>`)}</nav>
    <p class="admin-texto">Recaudado: <strong>${F.money(recaudado)}</strong>, sumando los pagos aprobados que cubren ${F.mes(mes)}.</p>
    ${filtro === 'morosos' ? (morosos.length === 0 ? html`<div class="vacio"><p class="vacio__titulo">Este mes no venció ningún perfil.</p></div>` : html`
        <div class="tabla-admin tabla-admin--morosos">
            <div class="tabla-admin__cabecera" aria-hidden="true"><span>Perfil</span><span>Gran rubro</span><span>Cubierto hasta</span><span>Estado</span><span></span></div>
            <ul class="tabla-admin__filas">${morosos.map((p) => {
                const s = suscripcionDe(p.id);
                return html`<li class="tabla-admin__fila">
                    <span class="tabla-admin__principal"><a class="tabla-admin__nombre" href="/admin/perfiles/${p.id}">${proveedorDe(p)}</a></span>
                    <span class="tabla-admin__estado"><span class="estado estado--apagado">Vencido</span></span>
                    <span class="tabla-admin__datos">
                        <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Gran rubro: </span>${s?.tarifa ?? 'Servicios'}</span>
                        <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Cubierto hasta: </span>${s ? F.fechaLarga(s.cubiertoHasta) : '—'}</span>
                    </span>
                    <a class="tabla-admin__accion" href="/admin/perfiles/${p.id}" tabindex="-1" aria-hidden="true">Ver</a>
                </li>`;
            })}</ul>
        </div>`)
    : filas.length === 0 ? html`<div class="vacio"><p class="vacio__titulo">No hay pagos en esta lista.</p></div>` : html`
        <div class="tabla-admin tabla-admin--pagos">
            <div class="tabla-admin__cabecera" aria-hidden="true"><span>Perfil</span><span>Fecha</span><span>Concepto</span><span>Monto</span><span>Estado</span><span>ID Mercado Pago</span></div>
            <ul class="tabla-admin__filas">${filas.map((p) => {
                const [e, c] = estadoPago(p.estado);
                const perfil = perfilDe(db.suscripciones.find((x) => x.id === p.suscripcionId).perfilId);
                return html`<li class="tabla-admin__fila">
                    <span class="tabla-admin__principal">
                        <span class="tabla-admin__nombre">${proveedorDe(perfil)}</span>
                        <span class="tabla-admin__detalle tabla-admin__solo-celular">${concepto(p)}, ${F.money(p.monto)}</span>
                    </span>
                    <span class="tabla-admin__estado"><span class="estado ${c}">${e}</span></span>
                    <span class="tabla-admin__datos">
                        <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Fecha: </span>${F.fechaCorta(p.fecha)}</span>
                        <span class="tabla-admin__celda tabla-admin__solo-tabla">${concepto(p)}</span>
                        <span class="tabla-admin__celda tabla-admin__solo-tabla tabla-admin__monto">${F.money(p.monto)}</span>
                    </span>
                    <span class="tabla-admin__accion tabla-admin__codigo"><span class="tabla-admin__etiqueta">ID Mercado Pago: </span>${p.tx ?? '—'}</span>
                </li>`;
            })}</ul>
        </div>`}`;
    return paginaAdmin(ctx, titulo, '/admin/pagos', cuerpo);
}

// ---------- Destacados (D10) ----------

function pDestacadosAdmin(ctx) {
    const mes = periodoActual();
    const inicio = inicioDiaUtc(mes);
    const t = tarifasVigentes();
    const lugares = db.destacados.filter((d) => d.periodo === mes && (d.estado !== 'PendientePago' || d.alta < inicio || pagoPendienteReciente(d)));
    const porCategoria = new Map();
    for (const d of lugares) {
        if (!porCategoria.has(d.categoriaId)) porCategoria.set(d.categoriaId, []);
        porCategoria.get(d.categoriaId).push(d);
    }
    const categorias = [...porCategoria.entries()].map(([cid, ls]) => ({ nombre: categoriaDe(cid).nombre, lugares: ls })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const estado = (d) => (d.estado === 'Vigente' ? ['Vigente', 'estado--ok'] : d.estado === 'Retirado' ? ['Liberado', 'estado--apagado'] : d.alta < inicio ? ['Reservado', 'estado--aviso'] : ['Pagando', 'estado--aviso']);
    const nombreMes = F.mes(mes);
    const cuerpo = html`
    <h1 class="titulo-admin">Destacados de ${nombreMes}</h1>
    <p class="admin-texto">Los lugares de ${nombreMes} quedan reservados para quienes los tenían en ${F.mes(sumarMeses(mes, -1))}. Si no pagan al día 10, se liberan el 11. Un lugar liberado a mitad de mes queda libre hasta el 1 del mes siguiente. El cupo es de ${t.cupo} por categoría.</p>
    ${categorias.length === 0 ? html`<div class="vacio"><p class="vacio__titulo">Este mes no hay destacados: todas las categorías tienen sus ${t.cupo} lugares libres.</p></div>` : html`
    <ul class="destacados-admin">${categorias.map((c) => {
        const n = c.lugares.length;
        return html`<li class="destacados-admin__categoria">
            <div class="destacados-admin__cabecera">
                <h2 class="destacados-admin__nombre">${c.nombre}</h2>
                <span class="cupo-admin">
                    <span class="cupo-admin__lugares" aria-hidden="true">${Array.from({ length: t.cupo }, (_, i) => html`<span class="cupo-admin__lugar${i < n ? ' cupo-admin__lugar--ocupado' : ''}"></span>`)}</span>
                    <span class="cupo-admin__texto">${n >= t.cupo ? 'Cupo lleno' : `${n} de ${t.cupo}`}<span class="sr-only"> lugares ocupados</span></span>
                </span>
            </div>
            <ul class="destacados-admin__lugares">${c.lugares.map((d) => {
                const [e, cl] = estado(d);
                return html`<li><span><strong>${proveedorDe(perfilDe(d.perfilId))}</strong> · ${servicioDe(d.servicioId).titulo}</span><span class="estado ${cl}">${e}</span></li>`;
            })}</ul>
        </li>`;
    })}</ul>
    <p class="admin-texto">Las demás categorías tienen sus ${t.cupo} lugares libres.</p>`}`;
    return paginaAdmin(ctx, `Destacados de ${nombreMes}`, '/admin/destacados', cuerpo);
}

// ---------- Tarifas y cupos (D11) ----------

function pTarifasAdmin(ctx, m = null, errores = {}) {
    const vigente = tarifasVigentes();
    const proxima = db.tarifas.filter((x) => x.desde > ahora()).sort((a, b) => a.desde - b.desde)[0] || null;
    const anteriores = db.tarifas.filter((x) => x !== vigente && x !== proxima && x.desde <= ahora()).sort((a, b) => b.desde - a.desde);
    m ||= { Profesionales: vigente.prof, Servicios: vigente.serv, Destacado: vigente.dest, DescuentoAnual: vigente.desc, Cupo: vigente.cupo, VigenteDesde: sumarDias(diaUy(ahora()), 1) };
    const versiones = [...(proxima ? [[proxima, 'Próxima']] : []), [vigente, 'Vigente'], ...anteriores.map((a) => [a, null])];
    const campo = (id, nombre, valor, nota, previo = '$ ', posterior = '', extra = 'min="1" step="1"') => html`<div class="tarifa-admin">
        <label class="tarifa-admin__nombre" for="${id}">${nombre}</label>
        <span class="tarifa-admin__valor">${previo}<input class="control${conError(errores, id)}" id="${id}" name="${id}" type="number" ${crudo(extra)} inputmode="numeric" value="${valor}" />${posterior}</span>
        <span class="tarifa-admin__nota">${nota}</span>
        ${errorDe(errores, id)}
    </div>`;
    const cuerpo = html`
    <h1 class="titulo-admin">Tarifas y cupos</h1>
    <p class="admin-texto">Rigen desde el ${F.fechaCorta(vigente.desde)}: Profesionales ${F.money(vigente.prof)} y Servicios ${F.money(vigente.serv)} por mes, o ${F.money(cuotaAnual(vigente.prof, vigente.desc))} y ${F.money(cuotaAnual(vigente.serv, vigente.desc))} al año con el ${F.percent(vigente.desc)} de descuento. Un cambio es una versión nueva, desde el día que elijas: las suscripciones ya contratadas conservan su monto.</p>
    ${proxima ? html`<p class="aviso aviso--alerta" role="status">Ya hay una versión cargada desde el ${F.fechaCorta(proxima.desde)}. Si guardás otra, la reemplaza.</p>` : ''}
    <form class="tarifas-admin" method="post" action="/admin/tarifas" novalidate>
        ${resumen(errores, 'aviso aviso--error')}
        <div class="tarifas-admin__campos">
            ${campo('Profesionales', 'Profesionales', m.Profesionales, 'por mes')}
            ${campo('Servicios', 'Servicios', m.Servicios, 'por mes')}
            ${campo('Destacado', 'Destacado', m.Destacado, 'por mes, cuota incluida')}
            ${campo('DescuentoAnual', 'Descuento anual', m.DescuentoAnual, 'sobre doce cuotas', '', ' %', 'min="0" max="50" step="1"')}
            ${campo('Cupo', 'Cupo de destacados', m.Cupo, 'perfiles por categoría', '', '', 'min="1" max="50" step="1"')}
            <div class="tarifa-admin">
                <label class="tarifa-admin__nombre" for="VigenteDesde">Vigente desde</label>
                <span class="tarifa-admin__valor"><input class="control${conError(errores, 'VigenteDesde')}" id="VigenteDesde" name="VigenteDesde" type="date" value="${m.VigenteDesde}" /></span>
                <span class="tarifa-admin__nota">aplica a contrataciones nuevas</span>
                ${errorDe(errores, 'VigenteDesde')}
            </div>
        </div>
        <button type="submit" class="boton boton--primario">Guardar nueva versión</button>
    </form>
    <section class="seccion-admin" aria-labelledby="versiones-titulo">
        <h2 class="subtitulo-admin" id="versiones-titulo">Versiones</h2>
        <div class="tabla-admin tabla-admin--tarifas">
            <div class="tabla-admin__cabecera" aria-hidden="true"><span>Desde</span><span>Profesionales</span><span>Servicios</span><span>Destacado</span><span>Descuento</span><span>Cupo</span><span></span></div>
            <ul class="tabla-admin__filas">${versiones.map(([v, etiqueta]) => html`<li class="tabla-admin__fila">
                <span class="tabla-admin__principal"><span class="tabla-admin__nombre">${F.fechaCorta(v.desde)}</span></span>
                <span class="tabla-admin__estado">${etiqueta ? html`<span class="estado ${etiqueta === 'Vigente' ? 'estado--ok' : 'estado--aviso'}">${etiqueta}</span>` : ''}</span>
                <span class="tabla-admin__datos">
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Profesionales: </span>${F.money(v.prof)}</span>
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Servicios: </span>${F.money(v.serv)}</span>
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Destacado: </span>${F.money(v.dest)}</span>
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Descuento anual: </span>${F.percent(v.desc)}</span>
                    <span class="tabla-admin__celda"><span class="tabla-admin__etiqueta">Cupo: </span>${v.cupo}</span>
                </span>
            </li>`)}</ul>
        </div>
    </section>`;
    return paginaAdmin(ctx, 'Tarifas y cupos', '/admin/tarifas', cuerpo);
}

function postTarifasAdmin(ctx, d) {
    const errores = {};
    const num = (k) => Number(d[k]);
    for (const k of ['Profesionales', 'Servicios', 'Destacado']) if (!(num(k) >= 1 && num(k) <= 1000000)) errores[k] = 'Poné un importe mayor que cero.';
    if (!(num('DescuentoAnual') >= 0 && num('DescuentoAnual') <= 50) || d.DescuentoAnual === '') errores.DescuentoAnual = 'El descuento va de 0 a 50 %.';
    if (!(num('Cupo') >= 1 && num('Cupo') <= 50)) errores.Cupo = 'El cupo va de 1 a 50.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.VigenteDesde || '')) errores.VigenteDesde = 'Elegí desde qué día rige.';
    else if (d.VigenteDesde <= diaUy(ahora())) errores.VigenteDesde = 'Tiene que regir desde mañana o más adelante: lo de hoy ya se cobró con la versión vigente.';
    if (Object.keys(errores).length) return pTarifasAdmin(ctx, d, errores);
    db.tarifas = db.tarifas.filter((x) => x.desde <= ahora());
    db.tarifas.push({ id: nuevoId('tarifas'), prof: num('Profesionales'), serv: num('Servicios'), dest: num('Destacado'), desc: num('DescuentoAnual'), cupo: num('Cupo'), desde: inicioDiaUtc(d.VigenteDesde) });
    registrar(ctx.usuario.id, 'TarifasActualizadas', `Desde el ${F.fechaCorta(inicioDiaUtc(d.VigenteDesde))}: Profesionales ${F.money(num('Profesionales'))}, Servicios ${F.money(num('Servicios'))}, Destacado ${F.money(num('Destacado'))}`);
    return { redirect: '/admin/tarifas', aviso: 'Listo, guardamos la nueva versión de las tarifas. Las suscripciones ya contratadas conservan su monto.' };
}

// ---------- Registro de actividad (D12) ----------

const ACCIONES = {
    PublicacionRevisada: 'Publicación revisada', ServicioOcultado: 'Servicio ocultado', ServicioReactivado: 'Servicio reactivado', FotoEliminada: 'Foto eliminada',
    ResenaOcultada: 'Opinión ocultada', ResenaPublicada: 'Opinión publicada', CurriculumOcultado: 'CV ocultado', CurriculumReactivado: 'CV reactivado',
    ReporteDesestimado: 'Reporte desestimado', PerfilBloqueado: 'Perfil bloqueado', UsuarioBloqueado: 'Cuenta bloqueada', PalabraAgregada: 'Palabra agregada',
    PalabraEliminada: 'Palabra quitada', TarifasActualizadas: 'Tarifas', VencimientoAutomatico: 'Vencimiento automático', PerfilDesbloqueado: 'Perfil desbloqueado',
    UsuarioDesbloqueado: 'Cuenta desbloqueada', CategoriaAgregada: 'Categoría agregada', CategoriaModificada: 'Categoría modificada'
};

function pRegistroAdmin(ctx) {
    const pedido = (ctx.query.get('accion') || '').toLowerCase();
    const accion = Object.keys(ACCIONES).find((a) => a.toLowerCase() === pedido) || null;
    const filas = db.registro.filter((r) => !accion || r.accion === accion).sort((a, b) => b.fecha - a.fecha || b.id - a.id);
    const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA_PANEL));
    const pagina = Math.min(Math.max(1, entero(ctx.query.get('pagina')) || 1), paginas);
    const url = (n) => conPagina(urlPanel('/admin/registro', [['accion', accion?.toLowerCase()]]), n);
    const opciones = Object.entries(ACCIONES).sort((a, b) => a[1].localeCompare(b[1], 'es'));
    const cuerpo = html`
    <div class="titulo-admin-fila">
        <h1 class="titulo-admin">Registro de actividad</h1>
        <form class="buscar-admin" method="get" action="/admin/registro">
            <label class="sr-only" for="accion">Qué acciones mostrar</label>
            <select class="control" id="accion" name="accion">
                <option value="">Todas las acciones</option>
                ${opciones.map(([a, n]) => html`<option value="${a.toLowerCase()}"${bool('selected', a === accion)}>${n}</option>`)}
            </select>
            <button type="submit" class="boton boton--secundario">Ver</button>
        </form>
    </div>
    ${filas.length === 0 ? html`<div class="vacio"><p class="vacio__titulo">${accion ? 'No hay acciones de este tipo.' : 'Todavía no hay nada en el registro.'}</p></div>` : html`
    <ul class="registro-admin">${filas.slice((pagina - 1) * POR_PAGINA_PANEL, pagina * POR_PAGINA_PANEL).map((r) => html`<li class="registro-admin__fila">
        <span class="registro-admin__cuando">${F.hora(r.fecha)}</span>
        <span class="registro-admin__accion">${ACCIONES[r.accion] ?? r.accion}</span>
        <span class="registro-admin__que">
            <span>${r.detalle}</span>
            ${r.motivo ? html`<span class="registro-admin__motivo">«${r.motivo}»</span>` : ''}
            <span class="registro-admin__quien">${r.adminId ? nombreCompleto(usuarioDe(r.adminId)) : 'Proceso automático'}</span>
        </span>
    </li>`)}</ul>
    ${paginacion(pagina, paginas, url)}`}`;
    return paginaAdmin(ctx, 'Registro de actividad', '/admin/registro', cuerpo);
}
