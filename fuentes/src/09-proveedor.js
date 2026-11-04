// ===================== Perfil de proveedor y servicios (U07, V01 a V04) =====================

function opcionesGranRubro(elegido, conCurriculum) {
    const t = tarifasVigentes();
    const grandes = db.categorias.filter((c) => !c.padreId && c.activa).sort((a, b) => (a.slug !== 'servicios') - (b.slug !== 'servicios'));
    return html`<fieldset class="opciones-rubro" aria-describedby="GranRubroId-error">
        <legend class="sr-only">Gran rubro</legend>
        ${grandes.map((g) => {
            const cuota = g.slug === 'profesionales' ? t.prof : t.serv;
            const prof = g.slug === 'profesionales';
            return html`<label class="opcion-rubro">
                <input class="opcion-rubro__radio" type="radio" name="GranRubroId" value="${g.id}"${bool('checked', String(elegido) === String(g.id))} />
                <span class="opcion-rubro__etiqueta">${g.nombre}, ${F.money(cuota)} por mes</span>
                <span class="opcion-rubro__titulo">${prof ? 'Tengo una profesión' : 'Sé hacer algo'}</span>
                <span class="opcion-rubro__texto">${prof ? 'Salud, derecho, contabilidad, arquitectura, tecnología…' : 'Oficios y servicios: electricidad, limpieza, fletes, peluquería…'}</span>
            </label>`;
        })}
        ${conCurriculum ? html`<div class="opcion-rubro opcion-rubro--aparte">
            <span class="opcion-rubro__etiqueta">Curriculum, gratis</span>
            <span class="opcion-rubro__titulo">Busco trabajo</span>
            <span class="opcion-rubro__texto">No es un perfil de proveedor. <a href="/mi-curriculum">Ir a Mi curriculum</a></span>
        </div>` : ''}
    </fieldset>`;
}

function publicasComo(m, errores, terminos, etiquetaEmpresa = 'Empresa') {
    const empresa = m.TipoPersona === 'Empresa';
    return html`
    <fieldset class="campo">
        <legend class="campo__etiqueta">Publicás como</legend>
        <div class="segmentado">
            <label class="segmentado__opcion"><input type="radio" name="TipoPersona" value="Fisica"${bool('checked', !empresa)} data-tipo-persona /><span>Persona</span></label>
            <label class="segmentado__opcion"><input type="radio" name="TipoPersona" value="Empresa"${bool('checked', empresa)} data-tipo-persona /><span>${etiquetaEmpresa}</span></label>
        </div>
        ${errorDe(errores, 'TipoPersona')}
    </fieldset>
    <div class="formulario__par">
        <div class="campo">
            <label class="campo__etiqueta" for="NombreComercial">Nombre comercial <span class="campo__opcional" data-solo-persona>(opcional para personas)</span></label>
            <input class="control${conError(errores, 'NombreComercial')}" type="text" id="NombreComercial" name="NombreComercial" autocomplete="organization" aria-describedby="nombre-comercial-ayuda" value="${m.NombreComercial ?? ''}" />
            <p class="campo__ayuda" id="nombre-comercial-ayuda">
                <span data-solo-persona>Si tu trabajo tiene un nombre propio. Si lo dejás vacío, se muestra tu nombre y apellido.</span>
                <span data-solo-empresa>Como querés que aparezca la empresa en el sitio.</span>
            </p>
            ${errorDe(errores, 'NombreComercial')}
            ${resaltado(m.NombreComercial, terminos)}
        </div>
        <div class="campo" data-solo-empresa>
            <label class="campo__etiqueta" for="Rut">RUT <span class="campo__opcional">(sólo empresas)</span></label>
            <input class="control${conError(errores, 'Rut')}" type="text" id="Rut" name="Rut" inputmode="numeric" autocomplete="off" aria-describedby="rut-ayuda" value="${m.Rut ?? ''}" />
            <p class="campo__ayuda" id="rut-ayuda">Las 12 cifras. No se muestra en el sitio.</p>
            ${errorDe(errores, 'Rut')}
        </div>
    </div>`;
}

function campoPresentacion(m, errores, terminos, placeholder, ayuda) {
    return html`<div class="campo">
        <label class="campo__etiqueta" for="Descripcion">Presentación general</label>
        <textarea class="control control--texto${conError(errores, 'Descripcion')}" id="Descripcion" name="Descripcion" rows="5" maxlength="2000"${placeholder ? attr('placeholder', placeholder) : ''}${ayuda ? attr('aria-describedby', 'presentacion-ayuda') : ''}>${m.Descripcion ?? ''}</textarea>
        <div class="campo__pie">
            ${ayuda ? html`<p class="campo__ayuda" id="presentacion-ayuda">${ayuda}</p>` : html`<span></span>`}
            <span class="campo__contador" data-contador-de="Descripcion">${(m.Descripcion || '').length} / 2000</span>
        </div>
        ${errorDe(errores, 'Descripcion')}
        ${resaltado(m.Descripcion, terminos)}
    </div>`;
}

function validarPerfil(d, errores) {
    const empresa = d.TipoPersona === 'Empresa';
    if (!['Fisica', 'Empresa'].includes(d.TipoPersona)) errores.TipoPersona = 'Elegí si publicás como persona o como empresa.';
    if ((d.NombreComercial || '').length > 120) errores.NombreComercial = 'El nombre comercial puede tener hasta 120 caracteres.';
    else if (empresa && !texto(d.NombreComercial)) errores.NombreComercial = 'Escribí el nombre de la empresa, como querés que aparezca.';
    const rut = (d.Rut || '').replace(/[^0-9]/g, '');
    if (empresa && rut.length !== 12) errores.Rut = 'Revisá el RUT: tiene que tener 12 cifras.';
    if (!texto(d.Descripcion)) errores.Descripcion = 'Contá en pocas líneas quién sos y cómo trabajás.';
    else if (d.Descripcion.length > 2000) errores.Descripcion = 'La presentación puede tener hasta 2000 caracteres.';
    let terminos = [];
    if (!errores.NombreComercial && !errores.Descripcion) {
        const f = filtroActual();
        const enNombre = f.analizar(d.NombreComercial);
        const enDescripcion = f.analizar(d.Descripcion);
        if (enNombre.length) errores.NombreComercial = `Incluye palabras que no se permiten: ${listaTerminos(enNombre)}. Cambialas para poder guardar.`;
        if (enDescripcion.length) errores.Descripcion = `Incluye palabras que no se permiten: ${listaTerminos(enDescripcion)}. Cambialas para poder guardar.`;
        terminos = [...new Set([...enNombre, ...enDescripcion])];
    }
    return { empresa, rut, terminos };
}

// ---------- Quiero ofrecer un servicio (U07) ----------

function pOfrecer(ctx, m = null, errores = {}, terminos = []) {
    if (perfilDeUsuario(ctx.usuario.id)) return { redirect: '/mi-perfil/servicios' };
    m ||= { TipoPersona: 'Fisica' };
    const confirmado = ctx.usuario.confirmado;
    const cuerpo = html`
    <div class="paso-pagina">
        <div class="progreso progreso--siempre">
            <p class="progreso__texto">Paso 1 de 5: tu perfil</p>
            <div class="progreso__barra" aria-hidden="true"><span style="width: 20%"></span></div>
        </div>
        ${!confirmado ? html`
            <h1 class="titulo-paso titulo-paso--grande">Primero, confirmá tu correo</h1>
            <p class="bajada-paso">Para publicar un servicio necesitamos saber que el correo es tuyo. Te mandamos un enlace cuando creaste la cuenta: al abrirlo, volvés acá para seguir.</p>
            <p><a class="boton boton--primario" href="${conVolver('/confirmar', '/ofrecer')}">Ver cómo confirmarlo</a></p>` : html`
            <h1 class="titulo-paso titulo-paso--grande">¿Cómo te presentás?</h1>
            <form class="formulario" action="/ofrecer" method="post" novalidate>
                ${resumen(errores)}
                <div class="campo">
                    ${opcionesGranRubro(m.GranRubroId, true)}
                    ${errorDe(errores, 'GranRubroId', { id: 'GranRubroId-error' })}
                    <p class="campo__ayuda">El gran rubro se elige por servicio: después podés sumar uno del otro.</p>
                </div>
                ${publicasComo(m, errores, terminos, 'Empresa (con RUT)')}
                ${campoPresentacion(m, errores, terminos, 'Contá quién sos y cómo trabajás. Se muestra en todas tus fichas.', null)}
                <div class="formulario__acciones formulario__acciones--pasos">
                    <p class="formulario__acciones-nota">Se guarda como borrador: podés seguir después.</p>
                    <button type="submit" class="boton boton--primario">Continuar</button>
                </div>
            </form>`}
    </div>`;
    return { titulo: 'Quiero ofrecer un servicio', enfocado: true, volver: '/', volverTexto: 'Atrás', barraDetalle: 'Paso 1 de 5', cuerpo };
}

function postOfrecer(ctx, d) {
    const u = ctx.usuario;
    if (perfilDeUsuario(u.id)) return { redirect: '/mi-perfil/servicios' };
    if (!u.confirmado) return pOfrecer(ctx, d);
    const errores = {};
    const gran = categoriaDe(entero(d.GranRubroId));
    if (!gran || gran.padreId) errores.GranRubroId = 'Elegí cómo te presentás: si sabés hacer algo o si tenés una profesión.';
    const { empresa, rut, terminos } = validarPerfil(d, errores);
    if (Object.keys(errores).length) return pOfrecer(ctx, d, errores, terminos);
    const t = ahora();
    const nombre = texto(d.NombreComercial);
    const usados = new Set(db.perfiles.map((p) => p.slug));
    const perfil = {
        id: nuevoId('perfiles'), usuarioId: u.id, tipoPersona: empresa ? 'Empresa' : 'Fisica', nombreComercial: nombre,
        rut: empresa ? rut : null, descripcion: d.Descripcion.trim(), estado: 'Borrador', alta: null, modificacion: t, revision: null,
        slug: crearSlug(nombre ?? nombreCompleto(u), (s) => usados.has(s))
    };
    db.perfiles.push(perfil);
    const s = nuevoBorrador(perfil, gran);
    return { redirect: urlPaso(s.id, 2) };
}

function nuevoBorrador(perfil, gran) {
    const t = ahora();
    const s = {
        id: nuevoId('servicios'), perfilId: perfil.id, granRubroId: gran.id, titulo: '', descripcion: perfil.descripcion || '', colaboradores: null,
        modalidad: 0, direccion: null, telefono: '', precio: null, especialidad: null, formacion: null, matricula: null, video: null,
        estado: 'Borrador', ocultoPorFiltro: false, terminos: [], publicacion: null, modificacion: t, revision: null, categoriaIds: [], zonaIds: [], fotos: []
    };
    // El primer borrador arranca con la presentación del perfil como descripción, para no escribirla dos veces.
    if (db.servicios.some((x) => x.perfilId === perfil.id)) s.descripcion = '';
    const u = usuarioDe(perfil.usuarioId);
    if (u.telefono) s.telefono = u.telefono;
    db.servicios.push(s);
    return s;
}

// ---------- Datos del perfil (V01) ----------

function pDatosPerfil(ctx, m = null, errores = {}, terminos = []) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    if (!perfil) return { redirect: '/ofrecer' };
    m ||= { TipoPersona: perfil.tipoPersona, NombreComercial: perfil.nombreComercial ?? '', Rut: perfil.rut ?? '', Descripcion: perfil.descripcion };
    const s = suscripcionDe(perfil.id);
    const cal = calificacionDe(perfil.id);
    const enUso = categoriasEnUso(perfil.id);
    const publicados = publicadosDe(perfil.id).length;
    const ficha = perfil.estado === 'Activo' && publicados > 0 ? `/${perfil.slug}` : null;
    const e = perfil.estado;
    let textoEstado;
    if (e === 'Borrador') textoEstado = html`Todavía no se ve en el sitio. Se activa cuando publicás tu primer servicio, y ahí empiezan los 30 días gratis. <a href="/mi-perfil/servicios">Ir a Mis servicios</a>`;
    else if (e === 'Activo') textoEstado = html`Visible desde el ${F.fechaLarga(perfil.alta)}, cuando publicaste tu primer servicio.${s && s.esPrueba ? ` Período de prueba hasta el ${F.fechaLarga(s.cubiertoHasta)}.` : ''}`;
    else if (e === 'Vencido') textoEstado = html`No se ve en el sitio porque la cuota no está paga. Tus datos, servicios y opiniones se conservan: al pagar, vuelve tal como estaba. <a href="/mi-perfil/suscripcion">Ir a Mi suscripción</a>`;
    else textoEstado = html`La administración bloqueó tu perfil: no se ve en el sitio y no se puede editar. Si creés que es un error, escribinos a <a href="mailto:${SITIO.correo}">${SITIO.correo}</a>.`;
    const cuerpo = html`
    <h1 class="titulo-cuenta">Datos del perfil</h1>
    <section class="estado-perfil" aria-labelledby="estado-perfil-titulo">
        <h2 class="estado-perfil__titulo" id="estado-perfil-titulo">Estado</h2>
        ${e === 'Borrador' || e === 'Activo' ? html`<p class="estado-perfil__ciclo">
            <span class="estado estado--apagado${e === 'Borrador' ? ' estado--actual' : ''}"${attr('aria-current', e === 'Borrador' ? 'true' : null)}>Borrador</span>
            ${icono('siguiente')}
            <span class="estado estado--ok${e === 'Activo' ? ' estado--actual' : ''}"${attr('aria-current', e === 'Activo' ? 'true' : null)}>Activo</span>
        </p>` : html`<p class="estado-perfil__ciclo"><span class="estado ${e === 'Vencido' ? 'estado--aviso' : 'estado--error'} estado--actual">${e === 'Vencido' ? 'Vencido' : 'Bloqueado'}</span></p>`}
        <p class="estado-perfil__texto">${textoEstado}</p>
    </section>
    ${e === 'Bloqueado' ? '' : html`<form class="formulario" action="/mi-perfil" method="post" novalidate>
        ${resumen(errores)}
        ${publicasComo(m, errores, terminos)}
        ${campoPresentacion(m, errores, terminos, null, 'Se muestra en todas tus fichas.')}
        <dl class="datos-perfil">
            <dt>Calificación</dt>
            <dd>${cal.cantidad > 0 ? html`<strong>${F.rating(cal.promedio)}</strong> con ${F.opiniones(cal.cantidad)}` : 'Todavía sin opiniones'}</dd>
            <dt>Categorías usadas</dt>
            <dd><strong>${enUso} de ${MAXIMO_CATEGORIAS}</strong>, sumando todos tus servicios</dd>
        </dl>
        <div class="formulario__acciones">
            <button type="submit" class="boton boton--primario">Guardar cambios</button>
            ${ficha ? html`<a class="enlace-fuerte" href="${ficha}">Ver mi ficha pública</a>` : ''}
        </div>
    </form>`}`;
    return paginaCuenta(ctx, 'Datos del perfil', '/mi-perfil', cuerpo);
}

function postDatosPerfil(ctx, d) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    if (!perfil) return { redirect: '/ofrecer' };
    if (perfil.estado === 'Bloqueado') return { redirect: '/mi-perfil' };
    const errores = {};
    const { empresa, rut, terminos } = validarPerfil(d, errores);
    if (Object.keys(errores).length) return pDatosPerfil(ctx, d, errores, terminos);
    Object.assign(perfil, {
        tipoPersona: empresa ? 'Empresa' : 'Fisica', nombreComercial: texto(d.NombreComercial), rut: empresa ? rut : null,
        descripcion: d.Descripcion.trim(), modificacion: ahora()
    });
    return { redirect: '/mi-perfil', aviso: 'Listo, guardamos los datos del perfil.' };
}

// ---------- Mis servicios (V02) ----------

function pasoPendiente(s) {
    const f = faltantes(s);
    return f.length ? Math.max(2, f[0][0]) : 5;
}

function pMisServicios(ctx) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    if (!perfil) return { redirect: '/ofrecer' };
    const servicios = db.servicios.filter((s) => s.perfilId === perfil.id).sort((a, b) => a.id - b.id);
    const bloqueado = perfil.estado === 'Bloqueado';
    const sinPublicados = perfil.estado === 'Activo' && servicios.every((s) => s.estado !== 'Publicado');
    const borradorSinCategorias = servicios.some((s) => s.estado === 'Borrador' && s.categoriaIds.length === 0);
    const fila = (s) => {
        const fotos = s.fotos.length === 1 ? '1 foto' : `${s.fotos.length} fotos`;
        const [txt, clase] = { Publicado: ['Publicado', 'estado--ok'], Pausado: ['Pausado', 'estado--apagado'], Oculto: [s.ocultoPorFiltro ? 'Oculto por el filtro' : 'Oculto', 'estado--error'] }[s.estado] || ['Borrador', 'estado--apagado'];
        const gran = granRubroDe(s).nombre;
        const detalle = s.estado === 'Pausado' ? `${fotos}. Pausado: no se ve en el sitio hasta que lo reanudes.`
            : s.estado === 'Borrador' ? fotos
            : s.modalidad === 0 ? `${fotos}. ${gran}.` : `${fotos}. ${gran}, ${F.modalidad(s.modalidad)}.`;
        const avisoFila = s.estado !== 'Oculto' ? null : s.ocultoPorFiltro
            ? `Incluye palabras que no se permiten: ${listaTerminos(s.terminos)}. Editalo y se publica solo.`
            : 'La administración lo ocultó. Si lo corregís, queda para que lo revisen.';
        const titulo = texto(s.titulo) ? s.titulo : 'Servicio sin título';
        const editar = urlPaso(s.id, s.estado === 'Borrador' ? pasoPendiente(s) : 2);
        const cats = s.categoriaIds.map(categoriaDe).map((c) => (c.nombre === 'Otros' && categoriaDe(c.padreId).padreId ? `Otros (${categoriaDe(c.padreId).nombre})` : c.nombre));
        let accion = '';
        if (!bloqueado) {
            if (s.estado === 'Publicado') accion = html`<form method="post" action="/mi-perfil/servicios/${s.id}/pausar"><button type="submit" class="boton boton--texto">Pausar<span class="sr-only"> «${titulo}»</span></button></form>`;
            else if (s.estado === 'Pausado') accion = html`<form method="post" action="/mi-perfil/servicios/${s.id}/reanudar"><button type="submit" class="boton boton--texto">Reanudar<span class="sr-only"> «${titulo}»</span></button></form>`;
            else if (s.estado === 'Borrador') accion = html`<details class="confirmar">
                <summary class="boton boton--texto">Eliminar<span class="sr-only"> «${titulo}»</span></summary>
                <div class="confirmar__panel">
                    <p>Se borra el borrador con sus fotos. No hay vuelta atrás.</p>
                    <form method="post" action="/mi-perfil/servicios/${s.id}/eliminar"><button type="submit" class="boton boton--peligro">Eliminar el borrador</button></form>
                </div>
            </details>`;
        }
        const foto = primeraFoto(s);
        return html`<li class="servicio-propio">
            ${foto ? html`<img class="servicio-propio__foto" src="${foto}" alt="" loading="lazy" />` : html`<span class="servicio-propio__foto servicio-propio__foto--vacia" aria-hidden="true"></span>`}
            <div class="servicio-propio__cuerpo">
                <div class="servicio-propio__cabecera">
                    <h2 class="servicio-propio__titulo">${titulo}</h2>
                    <span class="estado ${clase}">${txt}</span>
                </div>
                <p class="servicio-propio__categorias">${cats.length ? cats.join(', ') : 'Sin categorías asignadas'}</p>
                <p class="servicio-propio__detalle">${detalle}</p>
                ${avisoFila ? html`<p class="servicio-propio__aviso">${avisoFila}</p>` : ''}
            </div>
            ${bloqueado ? '' : html`<div class="servicio-propio__acciones">
                <a class="boton boton--secundario" href="${editar}">Editar<span class="sr-only"> «${titulo}»</span></a>
                ${accion}
            </div>`}
        </li>`;
    };
    const cuerpo = html`
    <div class="titulo-cuenta-fila">
        <h1 class="titulo-cuenta">Mis servicios</h1>
        ${bloqueado ? '' : html`<a class="boton boton--primario" href="/mi-perfil/servicios/nuevo">${icono('mas')}Nuevo servicio</a>`}
    </div>
    ${bloqueado ? html`<p class="aviso aviso--error">La administración bloqueó tu perfil: no se ve en el sitio y no se puede editar. Si creés que es un error, escribinos a <a href="mailto:${SITIO.correo}">${SITIO.correo}</a>.</p>`
        : perfil.estado === 'Vencido' ? html`<p class="aviso aviso--error">Tu perfil no se ve porque la cuota no está paga. No se borró nada: <a href="/mi-perfil/suscripcion">pagala en Mi suscripción</a> y vuelve a verse enseguida.</p>`
        : sinPublicados ? html`<p class="aviso aviso--alerta">No tenés servicios publicados: tu perfil no aparece en las búsquedas. Publicá o reanudá alguno.</p>` : ''}
    ${servicios.length === 0 ? html`<div class="vacio">
        <p class="vacio__titulo">Todavía no cargaste ningún servicio.</p>
        <p>Tu perfil se publica con el primero, y ahí empiezan los 30 días gratis.</p>
        ${bloqueado ? '' : html`<a class="boton boton--primario" href="/mi-perfil/servicios/nuevo">Cargar mi primer servicio</a>`}
    </div>` : html`<ul class="servicios-propios">${servicios.map(fila)}</ul>`}
    <p class="nota-suave">Estás en ${categoriasEnUso(perfil.id)} de ${MAXIMO_CATEGORIAS} categorías entre todos tus servicios.${borradorSinCategorias ? ' Un borrador sin categorías necesita al menos una para publicarse.' : ''}</p>`;
    return paginaCuenta(ctx, 'Mis servicios', '/mi-perfil/servicios', cuerpo);
}

function servicioPropio(ctx, id) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    const s = perfil && db.servicios.find((x) => x.id === id && x.perfilId === perfil.id);
    return s && perfil.estado !== 'Bloqueado' ? s : null;
}

function postPausar(ctx, id) {
    const s = servicioPropio(ctx, id);
    if (!s || s.estado !== 'Publicado') return null;
    s.estado = 'Pausado';
    return { redirect: '/mi-perfil/servicios', aviso: `Pausaste «${s.titulo}». No se ve en el sitio hasta que lo reanudes.` };
}

function postReanudar(ctx, id) {
    const s = servicioPropio(ctx, id);
    if (!s || s.estado !== 'Pausado') return null;
    s.estado = 'Publicado';
    return { redirect: '/mi-perfil/servicios', aviso: `Reanudaste «${s.titulo}». Ya se ve de nuevo en el sitio.` };
}

function postEliminarBorrador(ctx, id) {
    const s = servicioPropio(ctx, id);
    if (!s || s.estado !== 'Borrador') return null;
    db.servicios = db.servicios.filter((x) => x.id !== id);
    return { redirect: '/mi-perfil/servicios', aviso: texto(s.titulo) ? `Eliminamos el borrador «${s.titulo}».` : 'Eliminamos el borrador.' };
}

// ---------- El marco de un servicio: pasos (V03) o pestañas (V04) ----------

function marcoServicio(ctx, s, paso, titulo, contenido) {
    const borrador = !s || s.estado === 'Borrador';
    const id = s?.id ?? null;
    const conFaltantes = new Set(s ? faltantes(s).map((f) => f[0]) : []);
    const hecho = (n) => id !== null && n !== paso && n !== 5 && !conFaltantes.has(n);
    const terminos = s ? s.terminos || [] : [];
    const porPaso = s && terminos.length ? (() => {
        const f = new Filtro(terminos);
        const set = new Set();
        if (f.analizar(s.titulo, s.descripcion, s.colaboradores, s.especialidad, s.formacion).length) set.add(2);
        if (f.analizar(s.precio).length) set.add(3);
        if (f.analizar(s.matricula).length) set.add(4);
        return set;
    })() : new Set();
    let cuerpo;
    if (borrador) {
        cuerpo = html`<div class="servicio-pagina servicio-pagina--pasos">
            <nav class="pasos" aria-label="Pasos para publicar el servicio">
                <p class="pasos__titulo">${s && texto(s.titulo) ? s.titulo : 'Nuevo servicio'}</p>
                <ol class="pasos__lista">${PASOS.map((p) => {
                    const estado = p.n === paso ? 'actual' : hecho(p.n) ? 'hecho' : 'pendiente';
                    const marca = html`<span class="pasos__marca" aria-hidden="true">${estado === 'hecho' ? icono('tilde') : p.n}</span>`;
                    return html`<li class="pasos__item pasos__item--${estado}">${p.n === paso || id === null
                        ? html`<span class="pasos__enlace"${attr('aria-current', p.n === paso ? 'step' : null)}>${marca}${p.nombre}</span>`
                        : html`<a class="pasos__enlace" href="${urlPaso(id, p.n)}">${marca}${p.nombre}</a>`}</li>`;
                })}</ol>
            </nav>
            <div class="servicio-pagina__contenido">
                <div class="progreso">
                    <p class="progreso__texto">Paso ${paso} de 5: ${PASOS[paso - 1].nombre}</p>
                    <div class="progreso__barra" aria-hidden="true"><span style="width: ${paso * 20}%"></span></div>
                </div>
                ${ctx.flash.aviso ? html`<p class="aviso" role="status">${ctx.flash.aviso}</p>` : ''}
                ${contenido}
            </div>
        </div>`;
    } else {
        const pestanas = [[2, 'Datos'], [3, 'Dónde'], [4, 'Categorías y fotos']];
        const donde = F.lista(pestanas.filter(([n]) => porPaso.has(n)).map(([, n]) => `«${n}»`));
        cuerpo = html`<div class="servicio-pagina servicio-pagina--edicion">
            <a class="enlace-panel" href="/mi-perfil/servicios">${icono('volver')}Mis servicios</a>
            <h1 class="titulo-cuenta servicio-pagina__titulo">${s.titulo}</h1>
            <nav class="pestanas" aria-label="Partes del servicio">
                ${pestanas.map(([n, nombre]) => html`<a class="pestanas__enlace" href="${urlPaso(s.id, n)}"${attr('aria-current', n === paso ? 'page' : null)}>${nombre}${porPaso.has(n) ? html`<span class="pestanas__marca" aria-hidden="true"></span><span class="sr-only"> (tiene palabras marcadas)</span>` : ''}</a>`)}
            </nav>
            <div class="servicio-pagina__contenido">
                ${ctx.flash.aviso ? html`<p class="aviso" role="status">${ctx.flash.aviso}</p>` : ''}
                ${ctx.flash.alerta ? html`<p class="aviso aviso--alerta" role="alert">${ctx.flash.alerta}</p>`
                    : terminos.length ? html`<p class="aviso aviso--alerta">No se publicó porque incluye palabras que no se permiten: ${listaTerminos(terminos)}. ${donde ? `Están marcadas en ${donde}: si las cambiás, se publica solo.` : 'Si las cambiás, se publica solo.'}</p>`
                    : s.estado === 'Oculto' && !s.ocultoPorFiltro ? html`<p class="aviso aviso--alerta">La administración ocultó este servicio. Si lo corregís, queda para que lo revisen y decidan si vuelve a publicarse.</p>` : ''}
                ${contenido}
            </div>
        </div>`;
    }
    const enfocadoVolver = borrador && id !== null && paso > 1 ? { volver: urlPaso(id, paso - 1), volverTexto: 'Atrás' } : { volver: '/mi-perfil/servicios', volverTexto: 'Mis servicios' };
    return { titulo, enfocado: true, ...enfocadoVolver, barraDetalle: borrador ? `Paso ${paso} de 5` : null, cuerpo };
}

function accionesServicio(s, paso) {
    if (!s || s.estado === 'Borrador') {
        return html`<div class="formulario__acciones formulario__acciones--pasos">
            ${s && paso > 1 ? html`<a class="boton boton--secundario" href="${urlPaso(s.id, paso - 1)}">${icono('volver')}Atrás</a>` : ''}
            ${s ? html`<p class="formulario__acciones-nota">${icono('tilde')}Guardado como borrador</p>` : ''}
            <button type="submit" class="boton boton--primario" name="Accion" value="continuar">Continuar</button>
        </div>`;
    }
    return html`<div class="formulario__acciones">
        <button type="submit" class="boton boton--primario" name="Accion" value="guardar">Guardar cambios</button>
        <p class="formulario__acciones-nota">${s.estado === 'Publicado' ? 'Los cambios se ven en el sitio enseguida.' : s.estado === 'Pausado' ? 'Está pausado: los cambios se ven cuando lo reanudes.' : 'No se ve en el sitio mientras esté oculto.'}</p>
    </div>`;
}

// Al guardar uno ya publicado: el filtro vuelve a mirar (RN-56, RN-57). Devuelve el aviso o null si quedó retenido.
function guardarPublicado(s) {
    s.modificacion = ahora();
    if (s.estado === 'Borrador' || s.estado === 'Pausado') return 'Listo, guardamos los cambios.';
    if (s.estado === 'Oculto' && !s.ocultoPorFiltro) return 'Listo, guardamos los cambios.';
    const terminos = filtrarServicio(s);
    if (terminos.length) {
        Object.assign(s, { estado: 'Oculto', ocultoPorFiltro: true, terminos });
        return null;
    }
    if (s.estado === 'Oculto' && s.ocultoPorFiltro) {
        const prueba = publicarServicio(s);
        return 'Listo: ya no tiene palabras que no se permiten y se publicó.' + (prueba ? ` Tu perfil ya está activo y la prueba gratis va hasta el ${F.fechaLarga(prueba)}.` : '');
    }
    return 'Listo, guardamos los cambios.';
}

function siguiente(s, paso) {
    if (s.estado === 'Borrador') return { redirect: urlPaso(s.id, paso + 1) };
    const avisoCambio = guardarPublicado(s);
    return avisoCambio ? { redirect: urlPaso(s.id, paso), aviso: avisoCambio } : { redirect: urlPaso(s.id, paso) };
}

// ---------- Paso 1: gran rubro ----------

function pRubro(ctx, id, m = null, errores = {}) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    if (!perfil) return { redirect: '/ofrecer' };
    if (perfil.estado === 'Bloqueado') return { redirect: '/mi-perfil/servicios' };
    const s = id === null ? null : servicioPropio(ctx, id);
    if (id !== null && !s) return null;
    if (s && s.estado !== 'Borrador') return { redirect: urlPaso(s.id, 2) };
    m ||= { GranRubroId: s ? s.granRubroId : null };
    const contenido = html`
    <h1 class="titulo-paso">¿En qué gran rubro va este servicio?</h1>
    <p class="bajada-paso">Define qué categorías se ofrecen y qué datos pide el formulario.</p>
    <form class="formulario" action="${s ? urlPaso(s.id, 1) : '/mi-perfil/servicios/nuevo'}" method="post" novalidate>
        ${resumen(errores)}
        ${opcionesGranRubro(m.GranRubroId, false)}
        ${errorDe(errores, 'GranRubroId', { id: 'GranRubroId-error' })}
        <p class="campo__ayuda">La cuota es una por perfil: con algún servicio en Profesionales, pagás la de Profesionales, aunque tengas otros en Servicios.</p>
        ${s ? html`<p class="campo__ayuda">Si lo cambiás, se quitan las categorías que ya elegiste: cada gran rubro tiene las suyas.</p>` : ''}
        ${accionesServicio(s, 1)}
    </form>`;
    return marcoServicio(ctx, s, 1, 'Nuevo servicio', contenido);
}

function postRubro(ctx, id, d) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    if (!perfil) return { redirect: '/ofrecer' };
    const s = id === null ? null : servicioPropio(ctx, id);
    if (id !== null && !s) return null;
    const gran = categoriaDe(entero(d.GranRubroId));
    if (!gran || gran.padreId) return pRubro(ctx, id, d, { GranRubroId: 'Elegí en qué gran rubro va este servicio.' });
    if (!s) {
        const nuevo = nuevoBorrador(perfil, gran);
        return { redirect: urlPaso(nuevo.id, 2) };
    }
    if (s.granRubroId !== gran.id) {
        s.granRubroId = gran.id;
        s.categoriaIds = [];
        s.matricula = null;
        if (gran.slug !== 'profesionales') {
            s.especialidad = null;
            s.formacion = null;
        }
    }
    s.modificacion = ahora();
    return { redirect: urlPaso(s.id, 2) };
}

// ---------- Paso 2: qué ofrecés ----------

function pDatosServicio(ctx, id, m = null, errores = {}) {
    const s = servicioPropio(ctx, id);
    if (!s) return null;
    m ||= { Titulo: s.titulo, Descripcion: s.descripcion, Colaboradores: s.colaboradores ?? '', Especialidad: s.especialidad ?? '', Formacion: s.formacion ?? '', VideoUrl: s.video ?? '' };
    const borrador = s.estado === 'Borrador';
    const terminos = s.terminos || [];
    const prof = esProfesional(s);
    const contenido = html`
    ${borrador ? html`<h1 class="titulo-paso">¿Qué ofrecés?</h1><p class="bajada-paso">En ${granRubroDe(s).nombre}. Contalo como se lo contarías a alguien que te llama por primera vez.</p>` : ''}
    <form class="formulario" action="${urlPaso(s.id, 2)}" method="post" novalidate>
        ${resumen(errores)}
        <div class="campo">
            <label class="campo__etiqueta" for="Titulo">Título del servicio</label>
            <input class="control${conError(errores, 'Titulo')}" type="text" id="Titulo" name="Titulo" maxlength="120" aria-describedby="titulo-ayuda" value="${m.Titulo ?? ''}" />
            <p class="campo__ayuda" id="titulo-ayuda">Lo primero que se lee en los resultados, como «Instalaciones eléctricas domiciliarias».</p>
            ${errorDe(errores, 'Titulo')}
            ${resaltado(m.Titulo, terminos)}
        </div>
        <div class="campo">
            <label class="campo__etiqueta" for="Descripcion">Descripción</label>
            <textarea class="control control--texto${conError(errores, 'Descripcion')}" id="Descripcion" name="Descripcion" rows="7" maxlength="3000" aria-describedby="descripcion-ayuda">${m.Descripcion ?? ''}</textarea>
            <div class="campo__pie">
                <p class="campo__ayuda" id="descripcion-ayuda">Qué hacés, cómo trabajás y qué incluye.</p>
                <span class="campo__contador" data-contador-de="Descripcion">${(m.Descripcion || '').length} / 3000</span>
            </div>
            ${errorDe(errores, 'Descripcion')}
            ${resaltado(m.Descripcion, terminos)}
        </div>
        <div class="campo">
            <label class="campo__etiqueta" for="Colaboradores">Con quién trabajás <span class="campo__opcional">(opcional)</span></label>
            <input class="control${conError(errores, 'Colaboradores')}" type="text" id="Colaboradores" name="Colaboradores" maxlength="300" aria-describedby="colaboradores-ayuda" value="${m.Colaboradores ?? ''}" />
            <p class="campo__ayuda" id="colaboradores-ayuda">Si trabajás con un ayudante o con un equipo.</p>
            ${errorDe(errores, 'Colaboradores')}
            ${resaltado(m.Colaboradores, terminos)}
        </div>
        ${prof ? html`
        <div class="campo">
            <label class="campo__etiqueta" for="Especialidad">Especialidad <span class="campo__opcional">(opcional)</span></label>
            <input class="control${conError(errores, 'Especialidad')}" type="text" id="Especialidad" name="Especialidad" maxlength="120" value="${m.Especialidad ?? ''}" />
            ${errorDe(errores, 'Especialidad')}
            ${resaltado(m.Especialidad, terminos)}
        </div>
        <div class="campo">
            <label class="campo__etiqueta" for="Formacion">Formación <span class="campo__opcional">(opcional)</span></label>
            <textarea class="control control--texto${conError(errores, 'Formacion')}" id="Formacion" name="Formacion" rows="4" maxlength="1000" aria-describedby="formacion-ayuda">${m.Formacion ?? ''}</textarea>
            <div class="campo__pie">
                <p class="campo__ayuda" id="formacion-ayuda">Títulos, cursos y dónde los hiciste.</p>
                <span class="campo__contador" data-contador-de="Formacion">${(m.Formacion || '').length} / 1000</span>
            </div>
            ${errorDe(errores, 'Formacion')}
            ${resaltado(m.Formacion, terminos)}
        </div>` : ''}
        <div class="campo">
            <label class="campo__etiqueta" for="VideoUrl">Video <span class="campo__opcional">(opcional)</span></label>
            <input class="control${conError(errores, 'VideoUrl')}" type="url" inputmode="url" id="VideoUrl" name="VideoUrl" maxlength="400" placeholder="https://youtu.be/…" aria-describedby="video-ayuda" value="${m.VideoUrl ?? ''}" />
            <p class="campo__ayuda" id="video-ayuda">El enlace de un video tuyo en YouTube o en Vimeo. El video no se sube al sitio.</p>
            ${errorDe(errores, 'VideoUrl')}
        </div>
        ${accionesServicio(s, 2)}
    </form>`;
    return marcoServicio(ctx, s, 2, borrador ? 'Qué ofrecés' : 'Datos del servicio', contenido);
}

function normalizarVideo(url) {
    const t = texto(url);
    if (!t) return null;
    try {
        const u = new URL(t.startsWith('http') ? t : `https://${t}`);
        const host = u.hostname.replace(/^www\.|^m\./, '');
        if (['youtube.com', 'youtu.be', 'vimeo.com', 'player.vimeo.com'].includes(host)) return u.toString();
    } catch {
        return null;
    }
    return null;
}

function postDatosServicio(ctx, id, d) {
    const s = servicioPropio(ctx, id);
    if (!s) return null;
    const errores = {};
    if (!texto(d.Titulo)) errores.Titulo = 'Escribí el título del servicio.';
    else if (d.Titulo.length > 120) errores.Titulo = 'El título puede tener hasta 120 caracteres.';
    if (!texto(d.Descripcion)) errores.Descripcion = 'Contá en la descripción qué hacés y cómo trabajás.';
    else if (d.Descripcion.length > 3000) errores.Descripcion = 'La descripción puede tener hasta 3000 caracteres.';
    if ((d.Colaboradores || '').length > 300) errores.Colaboradores = 'Puede tener hasta 300 caracteres.';
    const video = normalizarVideo(d.VideoUrl);
    if (texto(d.VideoUrl) && !video) errores.VideoUrl = 'Pegá el enlace de un video de YouTube o de Vimeo, como lo copiás del navegador.';
    if (Object.keys(errores).length) return pDatosServicio(ctx, id, d, errores);
    const prof = esProfesional(s);
    Object.assign(s, {
        titulo: d.Titulo.trim(), descripcion: d.Descripcion.trim(), colaboradores: texto(d.Colaboradores),
        especialidad: prof ? texto(d.Especialidad) : null, formacion: prof ? texto(d.Formacion) : null, video
    });
    return siguiente(s, 2);
}

// ---------- Paso 3: dónde ----------

function pDonde(ctx, id, m = null, errores = {}) {
    const s = servicioPropio(ctx, id);
    if (!s) return null;
    m ||= {
        Modalidad: MODALIDADES.filter(([v]) => s.modalidad & MOD[v]).map(([v]) => v), Direccion: s.direccion ?? '', ZonaIds: s.zonaIds.map(String),
        PrecioOrientativo: s.precio ?? '', TelefonoContacto: s.telefono ? Tel.formato(s.telefono) : ''
    };
    const mods = lista(m.Modalidad);
    const zonasElegidas = lista(m.ZonaIds).map(String);
    const zonas = [...db.zonas].sort((a, b) => (b.tipo === 'General') - (a.tipo === 'General') || a.orden - b.orden);
    const terminos = s.terminos || [];
    const contenido = html`
    ${s.estado === 'Borrador' ? html`<h1 class="titulo-paso">Dónde trabajás</h1>` : ''}
    <form class="formulario" action="${urlPaso(s.id, 3)}" method="post" novalidate>
        ${resumen(errores)}
        <fieldset class="campo" aria-describedby="Modalidad-error"${invalido(errores, 'Modalidad')}>
            <legend class="campo__etiqueta">Modalidad <span class="campo__opcional">(al menos una)</span></legend>
            <div class="chips chips--tres">${MODALIDADES.map(([v, n]) => html`<label class="chip"><input class="chip__casilla" type="checkbox" name="Modalidad" value="${v}"${bool('checked', mods.includes(v))} data-modalidad="${v}" /><span class="chip__texto">${n}</span></label>`)}</div>
            ${errorDe(errores, 'Modalidad', { id: 'Modalidad-error' })}
        </fieldset>
        <div class="campo">
            <label class="campo__etiqueta" for="Direccion">Dirección del local <span class="campo__opcional" data-direccion-opcional>(si atendés en local)</span></label>
            <input class="control${conError(errores, 'Direccion')}" type="text" id="Direccion" name="Direccion" autocomplete="street-address" placeholder="Calle y número" aria-describedby="direccion-ayuda" value="${m.Direccion ?? ''}" />
            <p class="campo__ayuda" id="direccion-ayuda">Sólo la ven las personas que iniciaron sesión.</p>
            ${errorDe(errores, 'Direccion')}
        </div>
        <fieldset class="campo" aria-describedby="zonas-ayuda ZonaIds-error"${invalido(errores, 'ZonaIds')}>
            <legend class="campo__etiqueta">Zonas donde trabajás</legend>
            <p class="campo__ayuda" id="zonas-ayuda">Si trabajás en todo Cerro Largo, elegí «Todo el departamento».</p>
            <div class="chips">${zonas.map((z) => html`<label class="chip chip--chico"><input class="chip__casilla" type="checkbox" name="ZonaIds" value="${z.id}"${bool('checked', zonasElegidas.includes(String(z.id)))} /><span class="chip__texto">${z.nombre}</span></label>`)}</div>
            ${errorDe(errores, 'ZonaIds', { id: 'ZonaIds-error' })}
        </fieldset>
        <div class="formulario__par">
            <div class="campo">
                <label class="campo__etiqueta" for="PrecioOrientativo">Precio orientativo <span class="campo__opcional">(opcional)</span></label>
                <input class="control${conError(errores, 'PrecioOrientativo')}" type="text" id="PrecioOrientativo" name="PrecioOrientativo" maxlength="100" placeholder="Desde $ 800 la visita" value="${m.PrecioOrientativo ?? ''}" />
                ${errorDe(errores, 'PrecioOrientativo')}
                ${resaltado(m.PrecioOrientativo, terminos)}
            </div>
            <div class="campo">
                <label class="campo__etiqueta" for="TelefonoContacto">Teléfono de contacto</label>
                <input class="control${conError(errores, 'TelefonoContacto')}" type="tel" inputmode="tel" autocomplete="tel" placeholder="099 000 000" aria-describedby="telefono-ayuda" id="TelefonoContacto" name="TelefonoContacto" value="${m.TelefonoContacto ?? ''}" />
                <p class="campo__ayuda" id="telefono-ayuda">Se ve en tu ficha, con un botón para llamar y otro de WhatsApp si es un celular.</p>
                ${errorDe(errores, 'TelefonoContacto')}
            </div>
        </div>
        ${accionesServicio(s, 3)}
    </form>`;
    return marcoServicio(ctx, s, 3, 'Dónde trabajás', contenido);
}

function postDonde(ctx, id, d) {
    const s = servicioPropio(ctx, id);
    if (!s) return null;
    const errores = {};
    const modalidad = lista(d.Modalidad).reduce((a, m) => a | (MOD[m] || 0), 0);
    const direccion = texto(d.Direccion);
    const telefono = Tel.normalizar(d.TelefonoContacto);
    const zonas = [...new Set(lista(d.ZonaIds).map(entero))].filter((z) => zonaDe(z));
    if (modalidad === 0) errores.Modalidad = 'Elegí al menos una: en local, a domicilio o remoto.';
    else if ((modalidad & MOD.EnLocal) && !direccion) errores.Direccion = 'Si atendés en local necesitamos la dirección para que te encuentren.';
    if ((d.Direccion || '').length > 200) errores.Direccion = 'La dirección puede tener hasta 200 caracteres.';
    if (zonas.length === 0) errores.ZonaIds = 'Elegí al menos una zona. Si trabajás en todo Cerro Largo, elegí «Todo el departamento».';
    if (!telefono) errores.TelefonoContacto = 'Revisá el teléfono: un celular es como 099 123 456 y un fijo, como 4642 1234.';
    if ((d.PrecioOrientativo || '').length > 100) errores.PrecioOrientativo = 'El precio puede tener hasta 100 caracteres: es un texto corto, como «desde $ 800».';
    if (Object.keys(errores).length) return pDonde(ctx, id, d, errores);
    Object.assign(s, { modalidad, direccion, zonaIds: zonas, precio: texto(d.PrecioOrientativo), telefono });
    return siguiente(s, 3);
}

// ---------- Paso 4: categorías y fotos ----------

function asignables(granRubroId) {
    return hijas(granRubroId).filter((r) => r.activa).flatMap((r) => {
        const cats = hijas(r.id).filter((c) => c.activa);
        return cats.length ? cats.map((c) => ({ id: c.id, nombre: c.nombre, rubro: r.nombre, matricula: c.matricula })) : [{ id: r.id, nombre: r.nombre, rubro: r.nombre, matricula: r.matricula }];
    });
}

const nombreOpcion = (o) => (o.nombre === 'Otros' && o.rubro !== o.nombre ? `Otros (${o.rubro})` : o.nombre);

function pCategoriasServicio(ctx, id, m = null, errores = {}, rechazadas = []) {
    const s = servicioPropio(ctx, id);
    if (!s) return null;
    m ||= { CategoriaIds: s.categoriaIds.map(String), Matricula: s.matricula ?? '' };
    const marcadas = lista(m.CategoriaIds).map(entero);
    const gran = granRubroDe(s).nombre;
    const opciones = asignables(s.granRubroId);
    const elegidas = opciones.filter((o) => marcadas.includes(o.id));
    const otros = db.servicios.filter((x) => x.perfilId === s.perfilId && x.id !== s.id);
    const deOtros = new Map();
    for (const x of otros) for (const cid of x.categoriaIds) {
        if (!deOtros.has(cid)) deOtros.set(cid, []);
        deOtros.get(cid).push(x);
    }
    const enUso = new Set([...deOtros.keys(), ...marcadas]).size;
    const reguladas = elegidas.filter((o) => o.matricula).map(nombreOpcion);
    const ruta = (o) => (o.rubro === o.nombre ? gran : `${gran} › ${o.rubro}`);
    const estadoDe = (e) => ({ Borrador: ' (borrador)', Pausado: ' (pausado)', Oculto: ' (oculto)' }[e] || '');
    const principal = s.estado === 'Borrador' ? 'continuar' : 'guardar';
    const terminos = s.terminos || [];
    const grupos = [];
    for (const o of opciones) {
        let g = grupos.find((x) => x.rubro === o.rubro);
        if (!g) grupos.push(g = { rubro: o.rubro, opciones: [] });
        g.opciones.push(o);
    }
    const lugares = MAXIMO_FOTOS - s.fotos.length;
    const contenido = html`
    <form class="formulario" action="${urlPaso(s.id, 4)}" method="post" enctype="multipart/form-data" novalidate>
        <button type="submit" name="Accion" value="${principal}" class="sr-only" tabindex="-1" aria-hidden="true">${s.estado === 'Borrador' ? 'Continuar' : 'Guardar cambios'}</button>
        ${resumen(errores)}
        <div class="categorias-y-fotos">
            <section class="seccion-servicio" aria-labelledby="titulo-categorias" data-categorias data-maximo="${MAXIMO_CATEGORIAS}" data-otras="${[...deOtros.keys()].join(',')}" data-gran-rubro="${gran}">
                <div class="seccion-servicio__cabecera">
                    ${s.estado === 'Borrador' ? html`<h1 class="titulo-paso" id="titulo-categorias">¿En qué categorías te buscan?</h1>` : html`<h2 class="seccion-servicio__titulo" id="titulo-categorias">Categorías</h2>`}
                    <p class="seccion-servicio__contador" data-contador-categorias aria-live="polite">${enUso} de ${MAXIMO_CATEGORIAS} usadas</p>
                </div>
                <p class="campo__ayuda">Podés estar en hasta ${MAXIMO_CATEGORIAS} categorías entre todos tus servicios. Repetir una que ya usás en otro servicio no suma.</p>
                <ul class="categorias-elegidas" data-elegidas aria-label="Categorías de este servicio">
                    ${elegidas.map((o) => html`<li class="categoria-elegida" data-elegida="${o.id}"><span class="categoria-elegida__nombre">${nombreOpcion(o)}</span><span class="categoria-elegida__ruta">${ruta(o)}</span></li>`)}
                    ${[...deOtros.entries()].map(([cid, servs]) => {
                        const c = categoriaDe(cid);
                        const otro = servs[0];
                        const titulo = texto(otro.titulo) ? `«${otro.titulo}»${estadoDe(otro.estado)}` : 'un borrador sin título';
                        return html`<li class="categoria-elegida categoria-elegida--otra" data-otra="${cid}"${bool('hidden', marcadas.includes(cid))}><span class="categoria-elegida__nombre">${c.nombre}</span><span class="categoria-elegida__ruta">En ${titulo}${servs.length > 1 ? ' y otros' : ''}</span></li>`;
                    })}
                </ul>
                <div class="campo buscador-categorias" data-buscador hidden>
                    <label class="sr-only" for="buscar-categoria">Buscar una categoría</label>
                    <span class="buscador-categorias__control">${icono('buscar')}<input class="control" id="buscar-categoria" type="search" autocomplete="off" placeholder="Buscar una categoría" data-buscar-categoria /></span>
                    <p class="campo__ayuda" data-sin-resultados hidden>No hay categorías con ese nombre. Si no encontrás la tuya, elegí «Otros» en el rubro más cercano.</p>
                </div>
                <fieldset class="grupos-categorias" aria-describedby="CategoriaIds-error">
                    <legend class="sr-only">Categorías de ${gran}</legend>
                    ${grupos.map((g) => {
                        const cuenta = g.opciones.filter((o) => marcadas.includes(o.id)).length;
                        return html`<details class="grupo-categorias" data-grupo>
                            <summary class="grupo-categorias__titulo"><span>${g.rubro}</span><span class="grupo-categorias__cuenta" data-cuenta-grupo>${cuenta === 0 ? '' : cuenta === 1 ? '1 elegida' : `${cuenta} elegidas`}</span>${icono('desplegar')}</summary>
                            <div class="grupo-categorias__opciones">${g.opciones.map((o) => html`<label class="opcion-categoria" data-opcion data-texto="${nombreOpcion(o)}">
                                <input class="opcion-categoria__casilla" type="checkbox" name="CategoriaIds" value="${o.id}"${bool('checked', marcadas.includes(o.id))} data-nombre="${nombreOpcion(o)}" data-ruta="${ruta(o)}" data-matricula="${o.matricula ? 'si' : 'no'}" />
                                <span class="opcion-categoria__nombre">${nombreOpcion(o)}</span>
                                ${icono('tilde')}
                            </label>`)}</div>
                        </details>`;
                    })}
                </fieldset>
                ${errorDe(errores, 'CategoriaIds', { id: 'CategoriaIds-error' })}
                <div class="campo" data-campo-matricula>
                    <label class="campo__etiqueta" for="Matricula">Matrícula, habilitación o acreditación <span class="campo__opcional">(opcional)</span></label>
                    <input class="control${conError(errores, 'Matricula')}" type="text" id="Matricula" name="Matricula" maxlength="100" aria-describedby="matricula-ayuda" value="${m.Matricula ?? ''}" />
                    <p class="campo__ayuda" id="matricula-ayuda" data-ayuda-matricula>${reguladas.length
                        ? `${F.lista(reguladas)} ${reguladas.length === 1 ? 'es una actividad regulada' : 'son actividades reguladas'}. Se muestra como «Matrícula declarada»: Red Nexa no la verifica.`
                        : 'Sólo en actividades reguladas, como electricidad, gas o salud. Se muestra como «Matrícula declarada»: Red Nexa no la verifica.'}</p>
                    ${errorDe(errores, 'Matricula')}
                    ${resaltado(m.Matricula, terminos)}
                </div>
            </section>
            <section class="seccion-servicio" id="fotos" aria-labelledby="titulo-fotos">
                <div class="seccion-servicio__cabecera">
                    <h2 class="seccion-servicio__titulo" id="titulo-fotos">Fotos <span class="campo__opcional">(opcional)</span></h2>
                    <p class="seccion-servicio__contador">${s.fotos.length} de ${MAXIMO_FOTOS}</p>
                </div>
                <ul class="fotos-servicio">
                    ${s.fotos.map((f, i) => html`<li class="foto-servicio">
                        <img class="foto-servicio__imagen" src="${fotoSrc(f)}" alt="Foto ${i + 1} de ${s.fotos.length}" loading="lazy" />
                        ${i === 0 ? html`<span class="foto-servicio__principal">Principal</span>` : ''}
                        <span class="foto-servicio__acciones">
                            ${i > 0 ? html`<button type="submit" class="foto-servicio__boton" name="Accion" value="mover-${f.id}-${i - 1}">${icono('volver')}<span class="sr-only">Mover la foto ${i + 1} antes</span></button>` : ''}
                            ${i < s.fotos.length - 1 ? html`<button type="submit" class="foto-servicio__boton" name="Accion" value="mover-${f.id}-${i + 1}">${icono('siguiente')}<span class="sr-only">Mover la foto ${i + 1} después</span></button>` : ''}
                            <button type="submit" class="foto-servicio__boton foto-servicio__boton--quitar" name="Accion" value="quitar-${f.id}">${icono('cerrar')}<span class="sr-only">Quitar la foto ${i + 1}</span></button>
                        </span>
                    </li>`)}
                    ${lugares > 0 ? html`<li class="foto-servicio foto-servicio--agregar">
                        <label class="foto-servicio__agregar">
                            <input class="sr-only" type="file" id="Fotos" name="Fotos" multiple accept="image/jpeg,image/png,image/webp" data-fotos data-lugares="${lugares}" data-maximo="${TAMANO_MAXIMO_FOTO}" aria-describedby="fotos-ayuda" />
                            ${icono('mas')}<span>Agregar</span>
                        </label>
                    </li>` : html`<li class="foto-servicio foto-servicio--lleno"><span>Ya están las ${MAXIMO_FOTOS}. Quitá una para agregar otra.</span></li>`}
                </ul>
                <ul class="fotos-elegidas" data-fotos-elegidas aria-live="polite"></ul>
                ${rechazadas.map(([archivo, motivo]) => html`<div class="foto-rechazada" role="alert"><span class="foto-rechazada__archivo">${archivo}</span><span class="campo__error">${motivo}</span></div>`)}
                ${errorDe(errores, 'Fotos')}
                ${lugares > 0 ? html`<button type="submit" class="boton boton--contorno boton--subir" name="Accion" value="subir" data-subir-fotos>Subir las fotos elegidas</button>` : ''}
                <p class="campo__ayuda" id="fotos-ayuda">JPG, PNG o WEBP, hasta 5 MB cada una. La primera es la que se ve en los resultados: con las flechas cambiás el orden.</p>
            </section>
        </div>
        ${accionesServicio(s, 4)}
    </form>`;
    return marcoServicio(ctx, s, 4, 'Categorías y fotos', contenido);
}

async function postCategoriasServicio(ctx, id, d) {
    const s = servicioPropio(ctx, id);
    if (!s) return null;
    const accion = d.Accion || 'guardar';
    const elegidas = [...new Set(lista(d.CategoriaIds).map(entero))];
    const opciones = asignables(s.granRubroId);
    const errores = {};
    const esFoto = accion === 'subir' || accion.startsWith('quitar-') || accion.startsWith('mover-');
    if (elegidas.length === 0 && !esFoto) {
        errores.CategoriaIds = 'Elegí al menos una categoría, para que te encuentren.';
    } else if (elegidas.some((c) => !opciones.some((o) => o.id === c))) {
        errores.CategoriaIds = 'Elegí las categorías de la lista.';
    } else {
        const usadas = categoriasEnUso(s.perfilId, s.id, elegidas);
        if (usadas > MAXIMO_CATEGORIAS) errores.CategoriaIds = `Podés estar en hasta ${MAXIMO_CATEGORIAS} categorías entre todos tus servicios, y así serían ${usadas}. Quitá alguna para seguir.`;
    }
    if ((d.Matricula || '').length > 100) errores.Matricula = 'Puede tener hasta 100 caracteres.';
    if (Object.keys(errores).length) return pCategoriasServicio(ctx, id, d, errores);

    if (elegidas.length > 0) {
        s.categoriaIds = elegidas;
        const regulada = elegidas.some((c) => opciones.find((o) => o.id === c)?.matricula);
        s.matricula = regulada ? texto(d.Matricula) : null;
    }

    const rechazadas = [];
    let agregadas = 0;
    if (accion === 'subir') {
        const archivos = (d.Fotos || []).filter((f) => f.size > 0);
        if (archivos.length === 0) return pCategoriasServicio(ctx, id, d, { Fotos: 'Elegí una o más fotos para subir.' });
        for (const archivo of archivos) {
            if (s.fotos.length >= MAXIMO_FOTOS) rechazadas.push([archivo.name, `Ya hay ${MAXIMO_FOTOS} fotos: quitá una para agregar otra.`]);
            else if (archivo.size > TAMANO_MAXIMO_FOTO) rechazadas.push([`${archivo.name} (${(archivo.size / 1048576).toFixed(1).replace('.', ',')} MB)`, 'Pesa más de 5 MB. Probá reducirla o sacarla con menos calidad.']);
            else if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) rechazadas.push([archivo.name, 'Sólo se admiten JPG, PNG o WEBP.']);
            else {
                const datos = await achicarImagen(archivo, 560, 420);
                if (!datos) rechazadas.push([archivo.name, 'No pudimos abrir esa imagen. Probá con otra foto en JPG, PNG o WEBP.']);
                else {
                    s.fotos.push({ id: nuevoId('fotos'), src: datos });
                    agregadas++;
                }
            }
        }
    } else if (accion.startsWith('quitar-')) {
        const fid = entero(accion.slice(7));
        s.fotos = s.fotos.filter((f) => f.id !== fid);
    } else if (accion.startsWith('mover-')) {
        const [, fid, pos] = accion.split('-').map(Number);
        const i = s.fotos.findIndex((f) => f.id === fid);
        if (i >= 0 && pos >= 0 && pos < s.fotos.length) {
            const [f] = s.fotos.splice(i, 1);
            s.fotos.splice(pos, 0, f);
        }
    }

    if (accion === 'continuar' && s.estado === 'Borrador') return { redirect: urlPaso(s.id, 5), flash: rechazadas.length ? { rechazadas } : {} };
    let avisoFinal = null;
    if (s.estado !== 'Borrador') {
        const cambio = guardarPublicado(s);
        if (cambio && cambio !== 'Listo, guardamos los cambios.') avisoFinal = cambio;
        else if (cambio === null) avisoFinal = null;
        else if (accion === 'guardar') avisoFinal = cambio;
    }
    if (!avisoFinal && agregadas > 0) avisoFinal = agregadas === 1 ? 'Listo, subimos la foto.' : `Listo, subimos ${agregadas} fotos.`;
    if (!avisoFinal && accion === 'guardar') avisoFinal = 'Listo, guardamos los cambios.';
    return { redirect: urlPaso(s.id, 4) + '#fotos', aviso: avisoFinal, flash: { rechazadas } };
}

// ---------- Paso 5: revisar y publicar ----------

function pRevisar(ctx, id, errores = {}) {
    const s = servicioPropio(ctx, id);
    if (!s) return null;
    if (s.estado !== 'Borrador') return { redirect: urlPaso(s.id, 2) };
    const yo = ctx.usuario;
    const perfil = perfilDe(s.perfilId);
    const f = faltantes(s);
    if (!yo.confirmado) f.unshift([5, 'Confirmá tu correo para publicar: buscá el enlace que te mandamos al crear la cuenta.']);
    const faltan = f.length > 0;
    const t = tarifasVigentes();
    const tarifa = tarifaDelPerfil(perfil.id, null) === 'Profesionales' || esProfesional(s) ? 'Profesionales' : 'Servicios';
    const cuota = `${F.money(cuotaMensual(t, tarifa))} por mes`;
    const pruebaHasta = perfil.estado === 'Borrador' ? F.fechaLarga(finDePrueba(ahora())) : null;
    const cats = s.categoriaIds.map((cid) => {
        const c = categoriaDe(cid);
        const rubro = c.padreId ? categoriaDe(c.padreId) : null;
        return nombreOpcion({ nombre: c.nombre, rubro: rubro && rubro.padreId ? rubro.nombre : c.nombre });
    });
    const cambiar = (n, sr) => html`<a class="resumen-servicio__cambiar" href="${urlPaso(s.id, n)}">Cambiar<span class="sr-only"> ${sr}</span></a>`;
    const contenido = html`
    <h1 class="titulo-paso">Revisá y publicá</h1>
    <p class="bajada-paso">Se publica en el acto, sin esperar ninguna aprobación. Después lo podés editar cuando quieras.</p>
    ${resumen(errores)}
    ${faltan ? html`<div class="faltantes" role="status">
        <p class="faltantes__titulo">Para publicarlo falta:</p>
        <ul class="faltantes__lista">${f.map(([paso, msg]) => html`<li><a href="${paso === 5 ? '/confirmar' : urlPaso(s.id, paso)}">${msg}</a></li>`)}</ul>
    </div>` : ''}
    <div class="resumen-servicio">
        <section class="resumen-servicio__parte" aria-labelledby="resumen-rubro">
            <div class="resumen-servicio__cabecera"><h2 class="resumen-servicio__titulo" id="resumen-rubro">Gran rubro</h2>${cambiar(1, 'el gran rubro')}</div>
            <p>${granRubroDe(s).nombre}, ${cuota}</p>
        </section>
        <section class="resumen-servicio__parte" aria-labelledby="resumen-datos">
            <div class="resumen-servicio__cabecera"><h2 class="resumen-servicio__titulo" id="resumen-datos">Qué ofrecés</h2>${cambiar(2, 'qué ofrecés')}</div>
            <dl class="resumen-servicio__datos">
                <dt>Título</dt><dd>${texto(s.titulo) ? s.titulo : 'Sin completar'}</dd>
                <dt>Descripción</dt><dd class="texto-largo">${texto(s.descripcion) ? s.descripcion : 'Sin completar'}</dd>
                ${s.colaboradores ? html`<dt>Con quién trabajás</dt><dd>${s.colaboradores}</dd>` : ''}
                ${s.especialidad ? html`<dt>Especialidad</dt><dd>${s.especialidad}</dd>` : ''}
                ${s.formacion ? html`<dt>Formación</dt><dd class="texto-largo">${s.formacion}</dd>` : ''}
                ${s.video ? html`<dt>Video</dt><dd class="texto-cortable">${s.video}</dd>` : ''}
            </dl>
        </section>
        <section class="resumen-servicio__parte" aria-labelledby="resumen-donde">
            <div class="resumen-servicio__cabecera"><h2 class="resumen-servicio__titulo" id="resumen-donde">Dónde</h2>${cambiar(3, 'dónde trabajás')}</div>
            <dl class="resumen-servicio__datos">
                <dt>Modalidad</dt><dd>${s.modalidad === 0 ? 'Sin completar' : F.modalidad(s.modalidad)}</dd>
                ${s.direccion ? html`<dt>Dirección</dt><dd>${s.direccion}</dd>` : ''}
                <dt>Zonas</dt><dd>${s.zonaIds.length === 0 ? 'Sin completar' : F.lista(s.zonaIds.map(zonaDe).sort((a, b) => a.orden - b.orden).map((z) => z.nombre))}</dd>
                ${s.precio ? html`<dt>Precio orientativo</dt><dd>${s.precio}</dd>` : ''}
                <dt>Teléfono</dt><dd>${s.telefono ? Tel.formato(s.telefono) : 'Sin completar'}</dd>
            </dl>
        </section>
        <section class="resumen-servicio__parte" aria-labelledby="resumen-categorias">
            <div class="resumen-servicio__cabecera"><h2 class="resumen-servicio__titulo" id="resumen-categorias">Categorías y fotos</h2>${cambiar(4, 'las categorías y las fotos')}</div>
            <dl class="resumen-servicio__datos">
                <dt>Categorías</dt><dd>${cats.length === 0 ? 'Sin completar' : F.lista(cats)}</dd>
                ${s.matricula ? html`<dt>Matrícula declarada</dt><dd>${s.matricula}</dd>` : ''}
                <dt>Fotos</dt>
                <dd>${s.fotos.length === 0 ? 'Sin fotos. Los servicios con fotos propias reciben más consultas.'
                    : html`<ul class="resumen-servicio__fotos">${s.fotos.map((foto, i) => html`<li><img src="${fotoSrc(foto)}" alt="Foto ${i + 1} de ${s.fotos.length}" loading="lazy" /></li>`)}</ul>`}</dd>
            </dl>
        </section>
    </div>
    ${pruebaHasta ? html`<p class="aviso">Es tu primer servicio: al publicarlo, tu perfil pasa a Activo y empieza la prueba gratis, hasta el ${pruebaHasta}. Después, la cuota es de ${cuota}.</p>` : ''}
    <form class="formulario" action="${urlPaso(s.id, 5)}" method="post" data-envio-unico>
        <div class="formulario__acciones formulario__acciones--pasos">
            <a class="boton boton--secundario" href="${urlPaso(s.id, 4)}">${icono('volver')}Atrás</a>
            <p class="formulario__acciones-nota">${faltan ? 'Completá lo que falta para publicar.' : 'Todo listo.'}</p>
            <button type="submit" class="boton boton--primario"${bool('disabled', faltan)}>Publicar servicio</button>
        </div>
    </form>`;
    return marcoServicio(ctx, s, 5, 'Revisar y publicar', contenido);
}

function postPublicar(ctx, id) {
    const s = servicioPropio(ctx, id);
    if (!s) return null;
    if (s.estado !== 'Borrador') return { redirect: '/mi-perfil/servicios' };
    const yo = ctx.usuario;
    const f = faltantes(s);
    if (!yo.confirmado) f.unshift([5, 'Confirmá tu correo para publicar: buscá el enlace que te mandamos al crear la cuenta.']);
    if (f.length) return pRevisar(ctx, id, { '': f.map((x) => x[1]) });
    const terminos = filtrarServicio(s);
    s.modificacion = ahora();
    if (terminos.length) {
        Object.assign(s, { estado: 'Oculto', ocultoPorFiltro: true, terminos, publicacion: null });
        return { redirect: urlPaso(s.id, 2) };
    }
    const prueba = publicarServicio(s);
    const perfil = perfilDe(s.perfilId);
    if (prueba) {
        const cat = categoriaDe(s.categoriaIds[0]);
        enviarCorreo({
            para: yo.correo, asunto: '¡Tu perfil ya está publicado!', nombre: yo.nombre,
            texto: `Tu perfil ya está visible en Red Nexa. Desde ahora cualquier persona que busque ${cat.nombre} en Melo puede encontrarte.`,
            boton: 'Ver mi perfil', enlace: `/${perfil.slug}`,
            pie: 'Un consejo: los perfiles con fotos propias y una descripción detallada reciben muchas más consultas. Podés editarlo cuando quieras desde tu panel.'
        });
        return { redirect: '/mi-perfil/servicios', aviso: `Publicaste «${s.titulo}». Tu perfil ya está activo y la prueba gratis va hasta el ${F.fechaLarga(prueba)}.` };
    }
    return { redirect: '/mi-perfil/servicios', aviso: `Publicaste «${s.titulo}». Ya se ve en el sitio.` };
}
