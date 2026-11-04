// ===================== Pantallas públicas: portada, búsqueda, categorías y ficha =====================

function calificacionLinea(cal, sinOpiniones) {
    if (!cal) return html`<p class="calificacion calificacion--vacia">${sinOpiniones}</p>`;
    return html`<p class="calificacion">
        <span class="estrellas" aria-hidden="true">${estrellas(cal.llenas)}</span>
        <span class="calificacion__promedio"><span class="sr-only">Calificación </span>${cal.promedio}<span class="sr-only"> de 5</span></span>
        <span>${cal.opiniones}</span>
        ${cal.pocas ? html`<span class="etiqueta">Pocas opiniones aún</span>` : ''}
    </p>`;
}

const primeraFoto = (s) => (s.fotos.length ? fotoSrc(s.fotos[0]) : null);

// ---------- Portada (P01) ----------

function pPortada(ctx) {
    const conSesion = !!ctx.usuario;
    const publicarServicio = conSesion ? '/ofrecer' : '/registrarse';
    const publicarCv = conSesion ? '/mi-curriculum' : '/registrarse';
    const periodo = periodoActual();

    const vigentes = db.destacados.filter((d) => d.periodo === periodo && d.estado === 'Vigente' && categoriaDe(d.categoriaId).activa && visible(servicioDe(d.servicioId)));
    const mezclados = vigentes.map((d) => [Math.random(), d]).sort((a, b) => a[0] - b[0]).map(([, d]) => d);
    const elegidos = [];
    const cats = new Set();
    const servs = new Set();
    for (const uno of [true, false]) {
        for (const d of mezclados) {
            if (elegidos.length === 4) break;
            if (servs.has(d.servicioId)) continue;
            if (uno && cats.has(d.categoriaId)) continue;
            cats.add(d.categoriaId);
            servs.add(d.servicioId);
            elegidos.push(d);
        }
    }

    const categorias = db.categorias
        .filter((c) => c.activa && c.slug !== 'otros' && nivel(c) === 3 && categoriaDe(c.padreId).activa && categoriaDe(categoriaDe(c.padreId).padreId).activa)
        .map((c) => ({ c, n: db.servicios.filter((s) => visible(s) && s.categoriaIds.includes(c.id)).length }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n || a.c.nombre.localeCompare(b.c.nombre, 'es'))
        .slice(0, 7);

    const ultimos = db.servicios.filter(visible).sort((a, b) => b.publicacion - a.publicacion).slice(0, 4);
    const grandes = db.categorias.filter((c) => !c.padreId && c.activa).sort((a, b) => a.orden - b.orden);
    const t = tarifasVigentes();

    const tarjeta = (d) => {
        const s = servicioDe(d.servicioId);
        const p = perfilDe(s.perfilId);
        const prov = proveedorDe(p);
        const foto = primeraFoto(s);
        const cal = calificacionResumen(p.id);
        const hace = F.hace(s.publicacion);
        return html`<article class="tarjeta">
            <div class="tarjeta__foto">
                ${foto ? html`<img src="${foto}" alt="Foto de ${s.titulo}" loading="lazy" />` : html`<span class="tarjeta__iniciales" aria-hidden="true">${F.iniciales(prov)}</span>`}
                <span class="insignia-destacado">Destacado</span>
            </div>
            <div class="tarjeta__texto">
                <h3 class="tarjeta__nombre"><a class="tarjeta__enlace" href="${urlFicha(s)}">${prov}</a></h3>
                <p class="tarjeta__categoria">${categoriaDe(d.categoriaId).nombre}</p>
                <p class="tarjeta__titulo">${s.titulo}</p>
                ${cal ? calificacionLinea(cal) : html`<p class="calificacion calificacion--vacia">Sin opiniones todavía. Publicado ${hace[0].toLowerCase() + hace.slice(1)}.</p>`}
            </div>
        </article>`;
    };

    const cuerpo = html`
    <section class="hero" aria-labelledby="hero-titulo">
        <img class="hero__foto" src="${PORTADA[1280]}" srcset="${PORTADA[800]} 800w, ${PORTADA[1280]} 1280w, ${PORTADA[1960]} 1960w"
             sizes="100vw" width="1960" height="802" fetchpriority="high" alt="Una pareja mira el celular en el living de su casa" />
        <div class="hero__contenido">
            <div class="hero__texto">
                <h1 id="hero-titulo" class="hero__titulo">La solución que necesitás,<br />está <span class="hero__acento">acá.</span></h1>
                <p class="hero__bajada">La guía de servicios de Melo. Buscá por rubro, leé la opinión de los usuarios y contactá directo, sin comisiones.</p>
                <form class="buscador" role="search" action="/buscar" method="get">
                    <div class="buscador__campo buscador__campo--texto">
                        <label for="buscar-texto">Qué necesitás</label>
                        <input id="buscar-texto" name="q" type="search" maxlength="100" autocomplete="off" placeholder="Electricista, peluquería, flete…" />
                    </div>
                    <div class="buscador__campo buscador__campo--categoria">
                        <label for="buscar-categoria">Categoría</label>
                        <select id="buscar-categoria" name="categoria">
                            <option value="">Todas</option>
                            ${grandes.map((g) => html`<optgroup label="${g.nombre}">${hijas(g.id).filter((r) => r.activa).map((r) => html`<option value="${g.slug}/${r.slug}">${r.nombre}</option>`)}</optgroup>`)}
                        </select>
                    </div>
                    <button type="submit" class="boton boton--primario buscador__boton">${icono('buscar')} Buscar</button>
                </form>
                <nav class="explorar" aria-label="Explorar por gran rubro">
                    <span class="explorar__etiqueta">Explorar:</span>
                    <a href="/profesionales">Profesionales</a>
                    <a href="/servicios">Servicios</a>
                    <a href="/curriculum">Curriculum</a>
                </nav>
            </div>
        </div>
    </section>

    ${elegidos.length ? html`<section class="seccion destacados" aria-labelledby="destacados-titulo">
        <div class="seccion__cabecera">
            <div class="seccion__titulos">
                <h2 id="destacados-titulo" class="titulo-seccion">Destacados</h2>
                <p class="seccion__bajada solo-tablet-escritorio">Lugares pagos. La selección rota entre todas las categorías.</p>
            </div>
            <a class="enlace-fuerte" href="/destacados"><span class="solo-tablet-escritorio">Ver todos los destacados</span><span class="solo-celular">Ver todos</span></a>
        </div>
        <div class="destacados__lista" role="group" tabindex="0" aria-label="Servicios destacados">${elegidos.map(tarjeta)}</div>
        <p class="destacados__nota solo-celular">Lugares pagos. Deslizá para ver más.</p>
    </section>` : ''}

    ${categorias.length ? html`<section class="seccion categorias" aria-labelledby="categorias-titulo">
        <div class="categorias__intro">
            <h2 id="categorias-titulo" class="titulo-seccion">Buscá por categoría</h2>
            <p class="seccion__bajada solo-escritorio">Las que tienen más servicios publicados. El número es la cantidad de fichas activas.</p>
            <a class="enlace-fuerte solo-escritorio" href="/categorias">Ver todas las categorías</a>
        </div>
        <ul class="categorias__lista">
            ${categorias.map(({ c, n }) => html`<li><a class="categoria-fila" href="/${rutaCategoria(c)}">
                <span class="categoria-fila__nombre">${c.nombre}</span>
                <span class="categoria-fila__guia" aria-hidden="true"></span>
                <span class="categoria-fila__cantidad">${n}<span class="sr-only"> ${n === 1 ? 'servicio' : 'servicios'}</span></span>
                ${icono('siguiente')}
            </a></li>`)}
        </ul>
        <a class="enlace-fuerte solo-celular-tablet" href="/categorias">Ver todas las categorías</a>
    </section>` : ''}

    ${ultimos.length ? html`<section class="seccion ultimos" aria-labelledby="ultimos-titulo">
        <h2 id="ultimos-titulo" class="titulo-subseccion">Últimos agregados</h2>
        <ul class="ultimos__lista">
            ${ultimos.map((s) => {
                const p = perfilDe(s.perfilId);
                const prov = proveedorDe(p);
                const foto = primeraFoto(s);
                const cat = s.categoriaIds.map(categoriaDe).sort((a, b) => a.orden - b.orden)[0];
                return html`<li class="ultimo">
                    <span class="ultimo__foto">${foto ? html`<img src="${foto}" alt="" loading="lazy" />` : html`<span aria-hidden="true">${F.iniciales(prov)}</span>`}</span>
                    <a class="ultimo__nombre ultimo__enlace" href="${urlFicha(s)}">${prov}</a>
                    <span class="ultimo__categoria">${cat ? cat.nombre : ''}</span>
                    <span class="ultimo__cuando">${F.hace(s.publicacion)}</span>
                </li>`;
            })}
        </ul>
    </section>` : ''}

    <section class="publicar" aria-labelledby="publicar-titulo">
        <div class="publicar__interior">
            <div class="publicar__intro">
                <h2 id="publicar-titulo" class="titulo-seccion">¿Qué querés publicar?</h2>
                <p class="publicar__bajada">Primeros 30 días sin costo desde que publicás tu primer servicio. Cuota anual con ${F.percent(t.desc)} de descuento.</p>
            </div>
            <ul class="publicar__opciones">
                <li class="opcion">
                    <div class="opcion__texto">
                        <h3 class="opcion__titulo">Soy profesional</h3>
                        <p>Tengo una profesión o especialidad. Sumo formación y matrícula si corresponde.</p>
                    </div>
                    <p class="opcion__precio"><span class="opcion__importe">${F.money(t.prof)}</span> <span class="opcion__periodo">por mes</span></p>
                    <a class="opcion__accion" href="${publicarServicio}"><span class="opcion__accion-texto">Publicar como profesional</span>${icono('siguiente')}</a>
                </li>
                <li class="opcion">
                    <div class="opcion__texto">
                        <h3 class="opcion__titulo">Ofrezco un servicio</h3>
                        <p>Sé hacer algo y quiero ofrecerlo: zona, modalidad y precio orientativo.</p>
                    </div>
                    <p class="opcion__precio"><span class="opcion__importe">${F.money(t.serv)}</span> <span class="opcion__periodo">por mes</span></p>
                    <a class="opcion__accion" href="${publicarServicio}"><span class="opcion__accion-texto">Publicar mi servicio</span>${icono('siguiente')}</a>
                </li>
                <li class="opcion">
                    <div class="opcion__texto">
                        <h3 class="opcion__titulo">Busco una oportunidad</h3>
                        <p>Mostrá lo que sabés hacer, aunque no tengas título ni oficio formal.</p>
                    </div>
                    <p class="opcion__precio"><span class="opcion__importe">Gratis</span> <span class="opcion__periodo">sin cuota</span></p>
                    <a class="opcion__accion" href="${publicarCv}"><span class="opcion__accion-texto">Publicar mi CV</span>${icono('siguiente')}</a>
                </li>
            </ul>
        </div>
    </section>`;
    return { titulo: 'Guía de servicios de Melo', tituloCompleto: false, cuerpo };
}

// ---------- Resultados (P02, M01, M02, P07) ----------

const MODALIDADES = [['EnLocal', 'En local'], ['ADomicilio', 'A domicilio'], ['Remoto', 'Remoto']];

function leerConsulta(q) {
    const modalidad = q.getAll('modalidad').map((m) => MODALIDADES.find(([v]) => v.toLowerCase() === m.toLowerCase())?.[0]).filter(Boolean);
    const ordenTexto = q.get('orden');
    const orden = ORDENES.find((o) => o.toLowerCase() === (ordenTexto || '').toLowerCase()) || null;
    const calificacion = entero(q.get('calificacion'));
    return {
        q: q.get('q'),
        categoria: q.get('categoria'),
        cat: q.getAll('cat').map(entero).filter((n) => n !== null),
        calificacion: calificacion >= 1 && calificacion <= 5 ? calificacion : null,
        zona: entero(q.get('zona')),
        modalidad,
        orden,
        pagina: entero(q.get('pagina'))
    };
}

const textoConsulta = (c) => (texto(c.q) ? c.q.trim() : null);

function urlConsulta(c, ruta, cambio) {
    const x = { ...c, cat: [...c.cat], modalidad: [...c.modalidad] };
    if (cambio) cambio(x);
    const partes = [];
    const agregar = (n, v) => {
        if (v !== null && v !== undefined && String(v).length > 0) partes.push(`${n}=${encodeURIComponent(v)}`);
    };
    agregar('q', textoConsulta(x));
    x.cat.forEach((v) => agregar('cat', v));
    agregar('calificacion', x.calificacion);
    agregar('zona', x.zona);
    x.modalidad.forEach((v) => agregar('modalidad', v));
    if (x.orden && x.orden !== 'Recomendados') agregar('orden', x.orden);
    if (x.pagina > 1) agregar('pagina', x.pagina);
    return partes.length ? `${ruta}?${partes.join('&')}` : ruta;
}

function pBuscar(ctx) {
    const c = leerConsulta(ctx.query);
    if (c.categoria && /^(profesionales|servicios)(\/[a-z0-9-]+){0,2}$/.test(c.categoria)) {
        return { redirect: urlConsulta(c, '/' + c.categoria) };
    }
    return resultados(ctx, c, null, false);
}

function pCategoria(ctx) {
    return resultados(ctx, leerConsulta(ctx.query), ctx.ruta.slice(1), false);
}

function pDestacados(ctx) {
    return resultados(ctx, leerConsulta(ctx.query), null, true);
}

function resultados(ctx, c, categoria, soloDestacados) {
    const filtros = {
        texto: textoConsulta(c)?.slice(0, 100) ?? null,
        categoria,
        cat: c.cat,
        calificacion: c.calificacion,
        zona: c.zona,
        modalidad: c.modalidad.reduce((a, m) => a | MOD[m], 0),
        orden: c.orden || 'Recomendados',
        pagina: c.pagina > 0 ? c.pagina : 1,
        soloDestacados
    };
    const r = buscar(filtros);
    if (!r) return null;
    const alcance = r.alcance;
    const ruta = soloDestacados ? '/destacados' : alcance ? '/' + alcance.ruta : '/buscar';
    const rutaFormulario = alcance && alcance.nivel === 3 ? '/' + alcance.camino[1].ruta : ruta;
    const marcadas = alcance && alcance.nivel === 3 && c.cat.length === 0 ? [alcance.id] : c.cat;
    const delFiltro = alcance?.nivel === 2 ? alcance.hijos : alcance?.nivel === 3 ? alcance.hermanas : [];
    const txt = textoConsulta(c);
    const titulo = soloDestacados ? 'Destacados' : alcance ? alcance.nombre : txt ? `Resultados para «${txt}»` : 'Todos los servicios';
    const subtitulo = soloDestacados
        ? (r.total === 1 ? '1 servicio destacado este mes' : `${r.total} servicios destacados este mes`)
        : r.total === 1 ? '1 servicio en Melo' : `${r.total} servicios en Melo`;
    const cantidadFiltros = c.cat.length + (c.calificacion ? 1 : 0) + (c.zona ? 1 : 0) + c.modalidad.length;
    const zonas = [...db.zonas].sort((a, b) => (b.tipo === 'General') - (a.tipo === 'General') || a.orden - b.orden);
    const granRubro = alcance?.camino[0].ruta ?? null;
    const publicar = ctx.usuario ? '/ofrecer' : '/registrarse';
    const limpiar = urlConsulta(c, ruta, (x) => { x.cat = []; x.calificacion = null; x.zona = null; x.modalidad = []; x.pagina = null; });
    const ordenado = NOMBRE_ORDEN[filtros.orden];

    const chips = [];
    const sin = (quitar) => urlConsulta(c, ruta, (x) => { quitar(x); x.pagina = null; });
    for (const id of c.cat) {
        const n = delFiltro.find((x) => x.id === id);
        if (n) chips.push([n.nombre, urlConsulta(c, rutaFormulario, (x) => { x.cat = x.cat.filter((y) => y !== id); x.pagina = null; })]);
    }
    if (c.calificacion) chips.push([`${c.calificacion}★ o más`, sin((x) => { x.calificacion = null; })]);
    const z = c.zona && zonaDe(c.zona);
    if (z) chips.push([z.nombre, sin((x) => { x.zona = null; })]);
    for (const m of [...new Set(c.modalidad)]) chips.push([F.capitalizar(F.modalidad(MOD[m])), sin((x) => { x.modalidad = x.modalidad.filter((y) => y !== m); })]);

    const conServicios = delFiltro.filter((x) => x.servicios > 0 || marcadas.includes(x.id));
    const casilla = (cat) => html`<label class="filtro__casilla">
        <input type="checkbox" name="cat" value="${cat.id}"${bool('checked', marcadas.includes(cat.id))} />
        <span>${cat.nombre}</span>
        <span class="filtro__cuenta">${cat.servicios}</span>
    </label>`;

    const tarjetas = r.servicios.map(({ s, perfil }) => {
        const prov = proveedorDe(perfil);
        const foto = primeraFoto(s);
        const matricula = !!s.matricula && s.categoriaIds.some((id) => categoriaDe(id).matricula);
        return html`<li class="resultado">
            <span class="resultado__foto">${foto ? html`<img src="${foto}" alt="" loading="lazy" />` : html`<span class="resultado__iniciales" aria-hidden="true">${F.iniciales(prov)}</span>`}</span>
            <div class="resultado__cuerpo">
                <div class="resultado__cabecera">
                    <h2 class="resultado__nombre">${prov}</h2>
                    ${destacadoVigente(s.id, alcance ? hojas(categoriaDe(alcance.id)).map((h) => h.id) : null) ? html`<span class="insignia-destacado">Destacado</span>` : ''}
                </div>
                <p class="resultado__titulo">${s.titulo}</p>
                ${calificacionLinea(calificacionResumen(perfil.id), `Sin opiniones todavía. Publicado ${F.hace(s.publicacion).toLowerCase()}.`)}
                <p class="resultado__datos">
                    <span>${F.capitalizar(F.modalidad(s.modalidad))}</span>
                    ${matricula ? html`<span class="resultado__matricula">Matrícula declarada</span>` : ''}
                </p>
            </div>
            <a class="boton boton--secundario resultado__enlace" href="${urlFicha(s)}">Ver ficha<span class="sr-only"> de ${prov}: ${s.titulo}</span></a>
        </li>`;
    });

    const pagina = r.pagina;
    const urlPagina = (n) => urlConsulta(c, ruta, (x) => { x.pagina = n; });
    const cuerpo = html`
    <div class="resultados-pagina">
        ${alcance ? html`<nav class="migas" aria-label="Estás en"><ol>
            ${alcance.camino.map((paso, i) => html`<li>${i < alcance.camino.length - 1
                ? html`<a href="/${paso.ruta}">${paso.nombre}</a>${icono('siguiente')}`
                : html`<span aria-current="page">${paso.nombre}</span>`}</li>`)}
        </ol></nav>` : ''}

        <form class="buscar-otra" role="search" action="${ruta}" method="get">
            <label class="sr-only" for="buscar-de-nuevo">Qué necesitás</label>
            <span class="buscar-otra__campo">
                ${icono('buscar')}
                <input class="control" id="buscar-de-nuevo" name="q" type="search" maxlength="100" value="${txt ?? ''}" autocomplete="off" placeholder="Electricista, peluquería, flete…" />
            </span>
            <button type="submit" class="boton boton--primario">Buscar</button>
        </form>

        <div class="resultados">
            <aside id="filtros" class="filtros" aria-labelledby="filtros-titulo">
                <div class="filtros__cabecera">
                    <h2 class="filtros__titulo" id="filtros-titulo">Filtrar</h2>
                    <a class="filtros__limpiar" href="${limpiar}">Limpiar</a>
                    <a class="filtros__cerrar" href="#resultados">${icono('cerrar')}<span class="sr-only">Cerrar los filtros</span></a>
                </div>
                <form class="filtros__formulario" action="${rutaFormulario}" method="get">
                    ${txt ? html`<input type="hidden" name="q" value="${txt}" />` : ''}
                    ${c.orden && c.orden !== 'Recomendados' ? html`<input type="hidden" name="orden" value="${c.orden}" />` : ''}
                    <div class="filtro">
                        <h3 class="filtro__titulo">Gran rubro</h3>
                        <ul class="filtro__enlaces">
                            <li><a href="${urlConsulta(c, '/buscar', (x) => { x.cat = []; x.pagina = null; })}"${attr('aria-current', granRubro === null ? 'page' : null)}>Todos</a></li>
                            <li><a href="${urlConsulta(c, '/profesionales', (x) => { x.cat = []; x.pagina = null; })}"${attr('aria-current', granRubro === 'profesionales' ? 'page' : null)}>Profesionales</a></li>
                            <li><a href="${urlConsulta(c, '/servicios', (x) => { x.cat = []; x.pagina = null; })}"${attr('aria-current', granRubro === 'servicios' ? 'page' : null)}>Servicios</a></li>
                        </ul>
                    </div>
                    ${alcance && alcance.nivel === 1 && alcance.hijos.length > 0 ? html`<div class="filtro">
                        <h3 class="filtro__titulo">Rubro</h3>
                        <ul class="filtro__enlaces">
                            ${alcance.hijos.filter((h) => h.servicios > 0).map((h) => html`<li><a href="${urlConsulta(c, '/' + h.ruta, (x) => { x.pagina = null; })}">${h.nombre} <span class="filtro__cuenta">${h.servicios}</span></a></li>`)}
                        </ul>
                    </div>` : delFiltro.length > 0 ? html`<fieldset class="filtro">
                        <legend class="filtro__titulo">Categoría</legend>
                        ${conServicios.slice(0, 6).map(casilla)}
                        ${conServicios.length > 6 ? html`<details class="filtro__mas"><summary>Ver ${conServicios.length - 6} categorías más</summary>${conServicios.slice(6).map(casilla)}</details>` : ''}
                    </fieldset>` : ''}
                    <fieldset class="filtro">
                        <legend class="filtro__titulo">Calificación</legend>
                        ${[[4, '4★ o más'], [3, '3★ o más'], [null, 'Todas']].map(([v, n]) => html`<label class="filtro__casilla">
                            <input type="radio" name="calificacion" value="${v ?? ''}"${bool('checked', c.calificacion === v)} />
                            <span>${n}</span>
                        </label>`)}
                    </fieldset>
                    <div class="filtro">
                        <label class="filtro__titulo" for="filtro-zona">Zona</label>
                        <select class="control" id="filtro-zona" name="zona">
                            <option value="">Todas las zonas</option>
                            ${zonas.map((zz) => html`<option value="${zz.id}"${bool('selected', c.zona === zz.id)}>${zz.nombre}</option>`)}
                        </select>
                    </div>
                    <fieldset class="filtro">
                        <legend class="filtro__titulo">Modalidad</legend>
                        ${MODALIDADES.map(([v, n]) => html`<label class="filtro__casilla">
                            <input type="checkbox" name="modalidad" value="${v}"${bool('checked', c.modalidad.includes(v))} />
                            <span>${n}</span>
                        </label>`)}
                    </fieldset>
                    <div class="filtros__acciones">
                        <button type="submit" class="boton boton--primario">Ver resultados</button>
                        <a class="boton boton--secundario" href="${limpiar}">Limpiar filtros</a>
                    </div>
                </form>
            </aside>

            <section id="resultados" class="resultados__lista" aria-labelledby="titulo-resultados">
                <div class="resultados__cabecera">
                    <div class="resultados__titulos">
                        <h1 class="titulo-resultados" id="titulo-resultados">${titulo}</h1>
                        <p class="resultados__cuenta">${subtitulo}</p>
                    </div>
                    <div class="resultados__herramientas">
                        <a class="boton boton--secundario boton-filtrar" href="#filtros">Filtrar${cantidadFiltros > 0 ? ` (${cantidadFiltros})` : ''}</a>
                        ${r.total > 1 ? html`<details class="orden">
                            <summary class="orden__boton"><span class="orden__etiqueta">Ordenar por</span> <strong>${ordenado}</strong>${icono('desplegar')}</summary>
                            <ul class="orden__opciones">
                                ${ORDENES.map((o) => html`<li><a href="${urlConsulta(c, ruta, (x) => { x.orden = o; x.pagina = null; })}"${attr('aria-current', NOMBRE_ORDEN[o] === ordenado ? 'true' : null)}>${NOMBRE_ORDEN[o]}</a></li>`)}
                            </ul>
                        </details>` : ''}
                    </div>
                </div>

                ${chips.length ? html`<ul class="filtros-activos" aria-label="Filtros puestos">
                    ${chips.map(([t, u]) => html`<li><a href="${u}">${t}${icono('cerrar')}<span class="sr-only">: quitar este filtro</span></a></li>`)}
                </ul>` : ''}

                ${tarjetas.length === 0 ? html`<div class="sin-resultados">
                    <h2 class="sin-resultados__titulo">${txt ? `No encontramos servicios de “${txt}” en Melo`
                        : cantidadFiltros > 0 ? 'Ningún servicio cumple con estos filtros'
                        : soloDestacados ? 'Este mes todavía no hay servicios destacados'
                        : `Todavía no hay servicios en ${titulo}`}</h2>
                    <p>Probá quitar algún filtro o buscá en una categoría cercana.</p>
                    ${r.cercanas.length ? html`<ul class="cercanas">${r.cercanas.map((x) => html`<li><a href="/${x.ruta}">
                        <span class="cercanas__nombre">${x.nombre}</span>
                        <span class="cercanas__cuenta">${x.cantidad === 1 ? '1 servicio' : `${x.cantidad} servicios`}</span>
                    </a></li>`)}</ul>` : ''}
                    <div class="invitacion">
                        <h3 class="invitacion__titulo">¿Hacés este trabajo?</h3>
                        <p>Todavía nadie lo ofrece en Red Nexa. Publicalo y usalo 30 días sin pagar.</p>
                        <a class="boton boton--primario" href="${publicar}">Publicar mi servicio</a>
                    </div>
                </div>` : html`<ol class="lista-resultados">${tarjetas}</ol>
                ${r.paginas > 1 ? html`<nav class="paginas" aria-label="Páginas de resultados">
                    ${pagina > 1 ? html`<a class="paginas__flecha" href="${urlPagina(pagina - 1)}">${icono('volver')}<span class="sr-only">Página anterior</span></a>` : ''}
                    ${Array.from({ length: r.paginas }, (_, i) => i + 1).map((n) => html`<a class="paginas__numero" href="${urlPagina(n)}"${attr('aria-current', n === pagina ? 'page' : null)}><span class="sr-only">Página </span>${n}</a>`)}
                    ${pagina < r.paginas ? html`<a class="paginas__flecha" href="${urlPagina(pagina + 1)}">${icono('siguiente')}<span class="sr-only">Página siguiente</span></a>` : ''}
                </nav>` : ''}`}
            </section>
        </div>
    </div>`;
    return { titulo, cuerpo };
}

// ---------- Todas las categorías (P04) ----------

function pCategorias() {
    const contar = conteo();
    const grandes = db.categorias.filter((c) => !c.padreId && c.activa).sort((a, b) => a.orden - b.orden);
    const cuerpo = html`
    <div class="categorias-pagina">
        <h1 class="titulo-resultados">Todas las categorías</h1>
        <nav class="categorias-pagina__saltos" aria-label="Grandes rubros">
            ${grandes.map((g) => html`<a href="#${g.slug}">${g.nombre}</a>`)}
            <a href="/curriculum">Curriculum</a>
        </nav>
        <div class="campo buscador-categorias categorias-pagina__buscador" data-buscador-indice hidden>
            <label class="sr-only" for="buscar-en-categorias">Buscar una categoría</label>
            <span class="buscador-categorias__control">
                ${icono('buscar')}
                <input class="control" id="buscar-en-categorias" type="search" autocomplete="off" placeholder="Por ejemplo: sanitaria" data-buscar-indice />
            </span>
            <p class="campo__ayuda" data-indice-vacio hidden>No hay categorías con ese nombre. Probá con otra palabra o buscá un servicio por lo que hace.</p>
        </div>
        ${grandes.map((g) => html`<section class="indice" id="${g.slug}" aria-labelledby="titulo-${g.slug}" data-grupo-indice>
            <h2 class="indice__titulo" id="titulo-${g.slug}"><a href="/${g.slug}">${g.nombre}</a></h2>
            <div class="indice__rubros">
                ${hijas(g.id).filter((r) => r.activa).map((r) => {
                    const cats = hijas(r.id).filter((c) => c.activa);
                    return html`<div class="indice__rubro" data-rubro-indice>
                        <h3 class="indice__rubro-titulo" data-texto="${r.nombre}">
                            <a href="/${rutaCategoria(r)}">${r.nombre}</a>
                            <span class="indice__cuenta">${contar(r)}</span>
                        </h3>
                        ${cats.length ? html`<ul class="indice__categorias">${cats.map((c) => {
                            const n = contar(c);
                            return html`<li data-texto="${nombreVisible(c)}">
                                <a href="/${rutaCategoria(c)}">${nombreVisible(c)}</a>
                                <span class="indice__cuenta${n === 0 ? ' indice__cuenta--cero' : ''}">${n}</span>
                            </li>`;
                        })}</ul>` : ''}
                    </div>`;
                })}
            </div>
        </section>`)}
    </div>`;
    return { titulo: 'Todas las categorías', cuerpo };
}

// ---------- Ficha (P03, U01) ----------

function pFicha(ctx, slugPerfil, servicioId) {
    const perfil = db.perfiles.find((p) => p.slug === slugPerfil && p.estado === 'Activo');
    if (!perfil) return null;
    const publicados = publicadosDe(perfil.id);
    const id = servicioId ?? publicados[0]?.id;
    const s = publicados.find((x) => x.id === id);
    if (!s) return null;
    if (servicioId !== null && publicados[0].id === s.id) return { redirect: `/${perfil.slug}` };

    const u = usuarioDe(perfil.usuarioId);
    const yo = ctx.usuario;
    const conSesion = !!yo;
    const prov = proveedorDe(perfil);
    const url = urlFicha(s);
    const todas = ctx.query.get('todas') === 'true';
    const visibles = db.resenas.filter((r) => r.perfilId === perfil.id && r.estado !== 'Oculta');
    const ultimas = [...visibles].sort((a, b) => (b.modificacion ?? b.creacion) - (a.modificacion ?? a.creacion)).slice(0, todas ? 200 : 5);
    const distribucion = [5, 4, 3, 2, 1].map((e) => visibles.filter((r) => r.calificacion === e).length);
    const cal = calificacionResumen(perfil.id);
    const esPropia = yo && perfil.usuarioId === yo.id;
    const opino = yo && db.resenas.some((r) => r.perfilId === perfil.id && r.usuarioId === yo.id);
    const regulada = s.categoriaIds.some((cid) => categoriaDe(cid).matricula);
    const conDireccion = (s.modalidad & MOD.EnLocal) && s.direccion;
    const telefono = Tel.formato(s.telefono);
    const llamar = `tel:+${s.telefono}`;
    const whatsapp = Tel.whatsapp(s.telefono, mensajeWhatsApp(s.titulo));
    const modalidad = F.capitalizar(F.modalidad(s.modalidad)) + (s.modalidad & MOD.EnLocal ? '' : ', no atiende en local');
    const zonas = F.lista(s.zonaIds.map(zonaDe).sort((a, b) => (b.tipo === 'General') - (a.tipo === 'General') || a.orden - b.orden).map((z) => z.nombre));
    const categorias = s.categoriaIds.map(categoriaDe).sort((a, b) => a.orden - b.orden);
    const fotos = s.fotos;
    const volverA = ctx.anterior && /^\/(buscar|servicios|profesionales)/.test(ctx.anterior) ? ctx.anterior : null;
    const escribir = esPropia ? '' : html`<a class="boton boton--contorno opiniones__escribir" href="${conVolver(`/${perfil.slug}/opinar`, url)}">${opino ? 'Editar tu opinión' : 'Escribir una opinión'}</a>`;

    const cuerpo = html`
    <article class="ficha">
        ${volverA ? html`<a class="enlace-panel ficha__volver" href="${volverA}">${icono('volver')}Volver a resultados</a>` : ''}
        <header class="ficha__cabecera">
            ${u.foto ? html`<img class="ficha__retrato" src="${u.foto}" alt="" />` : html`<span class="ficha__retrato ficha__retrato--iniciales" aria-hidden="true">${F.iniciales(prov)}</span>`}
            <div class="ficha__identidad">
                <p class="ficha__proveedor">${prov}</p>
                <h1 class="ficha__titulo">${s.titulo}</h1>
                ${calificacionLinea(cal, 'Sin opiniones todavía.')}
                <ul class="ficha__categorias" aria-label="Categorías">
                    ${categorias.map((c) => html`<li><a href="/${rutaCategoria(c)}">${nombreVisible(c)}</a></li>`)}
                </ul>
            </div>
        </header>

        <div class="ficha__cuerpo">
            <div class="ficha__principal">
                ${fotos.length ? html`<ul class="galeria" aria-label="Fotos del servicio">
                    ${fotos.map((f, i) => html`<li class="galeria__foto" id="foto-${i + 1}">
                        <img src="${fotoSrc(f)}" alt="Foto ${i + 1} de ${fotos.length} de ${s.titulo}" loading="${i === 0 ? 'eager' : 'lazy'}" />
                        ${fotos.length > 1 ? html`<span class="galeria__cuenta" aria-hidden="true">${i + 1} / ${fotos.length}</span>` : ''}
                    </li>`)}
                </ul>` : ''}
                <section class="ficha__seccion" aria-labelledby="descripcion">
                    <h2 class="ficha__subtitulo" id="descripcion">Descripción</h2>
                    <p class="texto-largo">${s.descripcion}</p>
                </section>
                <dl class="ficha__datos">
                    <dt>Modalidad</dt>
                    <dd>${modalidad}</dd>
                    <dt>Zonas</dt>
                    <dd>${zonas}</dd>
                    ${s.precio ? html`<dt>Precio orientativo</dt><dd>${s.precio}</dd>` : ''}
                    ${s.colaboradores ? html`<dt>Con quién trabaja</dt><dd>${s.colaboradores}</dd>` : ''}
                    ${s.especialidad ? html`<dt>Especialidad</dt><dd>${s.especialidad}</dd>` : ''}
                    ${s.formacion ? html`<dt>Formación</dt><dd class="texto-largo">${s.formacion}</dd>` : ''}
                    ${regulada && s.matricula ? html`<dt>Matrícula declarada</dt><dd>${s.matricula}<span class="ficha__nota">La declara el proveedor. Red Nexa no la verifica.</span></dd>` : ''}
                    ${s.video ? html`<dt>Video</dt><dd><a href="${s.video}" rel="noopener noreferrer nofollow" target="_blank">Ver el video<span class="sr-only"> (se abre en otra pestaña)</span></a></dd>` : ''}
                </dl>
            </div>
            <aside class="ficha__lateral">
                <section class="contacto" aria-labelledby="contacto-titulo">
                    <h2 class="ficha__subtitulo" id="contacto-titulo">Contacto</h2>
                    <p class="contacto__etiqueta">Teléfono</p>
                    <p class="contacto__telefono">${telefono}</p>
                    <div class="contacto__botones">
                        ${whatsapp ? html`<a class="boton boton--primario" href="${whatsapp}" rel="noopener noreferrer" target="_blank">Escribir por WhatsApp<span class="sr-only"> (se abre WhatsApp)</span></a>` : ''}
                        <a class="boton boton--secundario" href="${llamar}">Llamar<span class="sr-only"> al ${telefono}</span></a>
                    </div>
                    ${conSesion && conDireccion ? html`<p class="contacto__etiqueta">Dirección</p><p>${s.direccion}</p>`
                        : !conSesion && conDireccion ? html`<p class="contacto__oculta">La dirección del local se ve con la sesión iniciada. <a href="${conVolver('/ingresar', ctx.aqui)}">Ingresar</a></p>` : ''}
                </section>
            </aside>
        </div>

        <section class="opiniones" id="opiniones" aria-labelledby="opiniones-titulo">
            <h2 class="ficha__subtitulo" id="opiniones-titulo">Opiniones</h2>
            ${ctx.flash.aviso ? html`<p class="aviso" role="status">${ctx.flash.aviso}</p>` : ''}
            ${cal ? html`
            <div class="opiniones__resumen">
                <p class="opiniones__promedio">${cal.promedio}</p>
                <div>
                    <p class="estrellas estrellas--grandes" aria-hidden="true">${estrellas(cal.llenas)}</p>
                    <p class="opiniones__cuenta">${cal.opiniones} de usuarios con cuenta</p>
                    ${cal.pocas ? html`<span class="etiqueta">Pocas opiniones aún</span>` : ''}
                </div>
                <ul class="opiniones__barras" aria-label="Cuántas opiniones hay de cada calificación">
                    ${distribucion.map((cantidad, i) => {
                        const ancho = Math.round(100 * cantidad / Math.max(1, visibles.length));
                        return html`<li>
                            <span class="opiniones__barra-etiqueta">${5 - i}<span aria-hidden="true">★</span><span class="sr-only"> estrellas</span></span>
                            <span class="opiniones__barra" aria-hidden="true"><span style="width: ${ancho}%"></span></span>
                            <span class="opiniones__barra-cuenta">${cantidad}</span>
                        </li>`;
                    })}
                </ul>
            </div>
            ${escribir}
            <ul class="opiniones__lista">
                ${ultimas.map((o) => {
                    const autor = autorDe(o.usuarioId);
                    const esMia = yo && o.usuarioId === yo.id;
                    return html`<li class="opinion">
                        <div class="opinion__cabecera">
                            <p class="opinion__autor">${autor}</p>
                            <p class="estrellas" aria-hidden="true">${estrellas(o.calificacion)}</p>
                            <p class="sr-only">${o.calificacion} de 5</p>
                            <p class="opinion__cuando">${F.hace(o.modificacion ?? o.creacion).toLowerCase()}${o.modificacion ? ', editada' : ''}</p>
                        </div>
                        <p class="opinion__texto texto-largo">${o.comentario}</p>
                        ${o.respuesta ? html`<div class="opinion__respuesta">
                            <p class="opinion__respuesta-autor">Respuesta de ${prov}:</p>
                            <p class="texto-largo">${o.respuesta.texto}</p>
                        </div>` : ''}
                        ${conSesion && !esMia ? html`<a class="opinion__reportar" href="${conVolver(`/opiniones/${o.id}/reportar`, url)}">Reportar<span class="sr-only"> la opinión de ${autor}</span></a>` : ''}
                    </li>`;
                })}
            </ul>
            ${!todas && visibles.length > ultimas.length ? html`<a class="boton boton--secundario" href="${url}?todas=true#opiniones">Ver las ${visibles.length} opiniones</a>` : ''}
            ` : html`<p class="opiniones__vacio">Todavía no tiene opiniones.</p>${escribir}`}
        </section>

        ${publicados.length > 1 ? html`<section class="otros-servicios" aria-labelledby="otros-titulo">
            <h2 class="ficha__subtitulo" id="otros-titulo">Otros servicios de ${prov}</h2>
            <ul>${publicados.filter((x) => x.id !== s.id).map((x) => html`<li><a href="${urlFicha(x)}">${x.titulo}</a></li>`)}</ul>
        </section>` : ''}

        ${conSesion && !esPropia ? html`<p class="ficha__reportar"><a href="/${perfil.slug}/${s.id}/reportar">Reportar esta publicación</a></p>` : ''}
    </article>

    <div class="contacto-fijo">
        <a class="boton boton--secundario" href="${llamar}">Llamar</a>
        ${whatsapp ? html`<a class="boton boton--primario" href="${whatsapp}" rel="noopener noreferrer" target="_blank">WhatsApp</a>` : ''}
    </div>`;
    return { titulo: `${s.titulo} | ${prov}`, cuerpo };
}
