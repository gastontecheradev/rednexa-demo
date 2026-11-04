// ===================== Reglas: filtro de palabras, búsqueda, servicios y cuotas =====================

// ---------- Filtro de palabras (14.6, RN-53 a RN-60) ----------

function letra(c) {
    const m = c.toLowerCase();
    if (m === 'ñ') return 'ñ';
    return m.normalize('NFD').replace(/\p{Mn}/gu, '');
}

function tokensFiltro(texto) {
    const tokens = [];
    if (!texto) return tokens;
    let palabra = '';
    let inicio = -1;
    for (let i = 0; i < texto.length; i++) {
        const c = texto[i];
        if (/[\p{L}\p{Nd}]/u.test(c)) {
            if (inicio < 0) inicio = i;
            palabra += letra(c);
        } else if (inicio >= 0 && /\p{Mn}/u.test(c)) {
            if (c === '̃' && palabra.endsWith('n')) palabra = palabra.slice(0, -1) + 'ñ';
        } else if (inicio >= 0) {
            tokens.push({ n: palabra, i: inicio, l: i - inicio });
            palabra = '';
            inicio = -1;
        }
    }
    if (inicio >= 0) tokens.push({ n: palabra, i: inicio, l: texto.length - inicio });
    return tokens;
}

function crearEntrada(texto) {
    const limpio = (texto || '').trim();
    if (limpio.length === 0) return { error: 'Escribí una palabra o una expresión.' };
    if (limpio.length > 100) return { error: 'Puede tener hasta 100 caracteres.' };
    const prefijo = limpio.endsWith('*');
    const cuerpo = prefijo ? limpio.slice(0, -1) : limpio;
    if (cuerpo.includes('*')) return { error: 'El * va sólo al final, para incluir las variantes de una palabra.' };
    const palabras = tokensFiltro(cuerpo).map((t) => t.n);
    if (palabras.length === 0) return { error: 'Escribí una palabra o una expresión: con letras o números.' };
    if (palabras.length > 4) return { error: 'Una expresión puede tener hasta 4 palabras.' };
    if (prefijo && palabras.length > 1) return { error: 'El * sirve para una sola palabra, no para una expresión.' };
    if (prefijo && palabras[0].length < 4) return { error: 'Antes del * tiene que haber al menos 4 letras, para no atrapar palabras que no tienen nada que ver.' };
    return { entrada: { texto: limpio, palabras, prefijo, normalizado: palabras.join(' ') } };
}

class Filtro {
    constructor(textos) {
        this.palabras = new Map();
        this.prefijos = [];
        this.expresiones = new Map();
        for (const t of textos) {
            const e = crearEntrada(t).entrada;
            if (!e) continue;
            if (e.prefijo) this.prefijos.push(e);
            else if (e.palabras.length === 1) { if (!this.palabras.has(e.palabras[0])) this.palabras.set(e.palabras[0], e); }
            else {
                if (!this.expresiones.has(e.palabras[0])) this.expresiones.set(e.palabras[0], []);
                this.expresiones.get(e.palabras[0]).push(e);
            }
        }
    }

    *coincidencias(texto) {
        const tokens = tokensFiltro(texto);
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (this.palabras.has(t.n)) yield { e: this.palabras.get(t.n), i: t.i, l: t.l };
            for (const p of this.prefijos) if (t.n.startsWith(p.palabras[0])) yield { e: p, i: t.i, l: t.l };
            for (const x of this.expresiones.get(t.n) || []) {
                if (i + x.palabras.length > tokens.length) continue;
                let ok = true;
                for (let j = 1; j < x.palabras.length && ok; j++) ok = tokens[i + j].n === x.palabras[j];
                if (ok) {
                    const ultima = tokens[i + x.palabras.length - 1];
                    yield { e: x, i: t.i, l: ultima.i + ultima.l - t.i };
                }
            }
        }
    }

    analizar(...textos) {
        const terminos = [];
        for (const texto of textos) for (const c of this.coincidencias(texto)) if (!terminos.includes(c.e.texto)) terminos.push(c.e.texto);
        return terminos;
    }

    resaltar(texto) {
        if (!texto) return [];
        const marcas = [...this.coincidencias(texto)].map((c) => [c.i, c.i + c.l]).sort((a, b) => a[0] - b[0]);
        const tramos = [];
        let pos = 0;
        for (let k = 0; k < marcas.length; k++) {
            let [ini, fin] = marcas[k];
            while (k + 1 < marcas.length && marcas[k + 1][0] <= fin) fin = Math.max(fin, marcas[++k][1]);
            if (ini < pos) ini = pos;
            if (ini > pos) tramos.push([texto.slice(pos, ini), false]);
            tramos.push([texto.slice(ini, fin), true]);
            pos = fin;
        }
        if (pos < texto.length) tramos.push([texto.slice(pos), false]);
        return tramos;
    }
}

const filtroActual = () => new Filtro(db.palabras.map((p) => p.texto));
const listaTerminos = (terminos) => F.lista(terminos.map((t) => `«${t}»`));

// El texto con lo detectado dentro de <mark> (_TextoMarcado).
function textoMarcado(texto, terminos) {
    if (!terminos || terminos.length === 0) return html`${texto ?? ''}`;
    return new Filtro(terminos).resaltar(texto).map(([t, m]) => (m ? html`<mark>${t}</mark>` : html`${t}`));
}

// RN-56: debajo del campo, el texto con lo que hay que cambiar marcado (_Resaltado).
function resaltado(texto, terminos) {
    if (!terminos || terminos.length === 0 || new Filtro(terminos).analizar(texto).length === 0) return '';
    return html`<p class="resaltado"><span class="resaltado__titulo">Marcado en tu texto:</span> ${textoMarcado(texto, terminos)}</p>`;
}

// ---------- Búsqueda (CU-03) ----------

const ORDENES = ['Recomendados', 'Calificacion', 'Antiguedad', 'Alfabetico'];
const NOMBRE_ORDEN = { Calificacion: 'Mejor calificación', Antiguedad: 'Más antigüedad', Alfabetico: 'Nombre, de la A a la Z', Recomendados: 'Recomendados' };
const POR_PAGINA = 12;

function buscarNodo(ruta) {
    const partes = ruta.replace(/^\/+|\/+$/g, '').toLowerCase().split('/');
    if (partes.length > 3) return null;
    let actual = null;
    for (const parte of partes) {
        const candidatas = db.categorias.filter((c) => c.activa && c.padreId === (actual ? actual.id : null));
        actual = candidatas.find((c) => c.slug === parte) || null;
        if (!actual) return null;
    }
    return actual;
}

function camino(c) {
    const lista = [];
    for (let n = c; n; n = n.padreId ? categoriaDe(n.padreId) : null) lista.unshift(n);
    return lista;
}

function palabrasDe(textoBuscado) {
    const vistas = new Set();
    const res = [];
    for (const p of (textoBuscado || '').split(/[ ,.;:¿?¡!"«»()]+/)) {
        if (p.length < 2) continue;
        const k = p.toLowerCase();
        if (vistas.has(k)) continue;
        vistas.add(k);
        res.push(p);
        if (res.length === 6) break;
    }
    return res;
}

function coincideTexto(s, palabra) {
    const p = sinTildes(palabra);
    const perfil = perfilDe(s.perfilId);
    const u = usuarioDe(perfil.usuarioId);
    return [s.titulo, s.descripcion, s.especialidad, perfil.nombreComercial, u.nombre, u.apellido, ...s.categoriaIds.map((id) => categoriaDe(id).nombre)]
        .some((campo) => campo && sinTildes(campo).includes(p));
}

function buscar(filtros) {
    const contar = conteo();
    let alcance = null;
    if (filtros.categoria) {
        alcance = buscarNodo(filtros.categoria);
        if (!alcance) return null;
    }
    const niv = alcance ? nivel(alcance) : 0;
    let lista = db.servicios.filter(visible);
    if (niv === 1) lista = lista.filter((s) => s.granRubroId === alcance.id);
    else if (niv === 2) lista = lista.filter((s) => s.categoriaIds.some((id) => id === alcance.id || categoriaDe(id).padreId === alcance.id));
    else if (niv === 3) lista = lista.filter((s) => s.categoriaIds.includes(alcance.id));

    const marcadas = [...new Set(filtros.cat)];
    if (marcadas.length) lista = lista.filter((s) => s.categoriaIds.some((id) => marcadas.includes(id)));
    for (const p of palabrasDe(filtros.texto)) lista = lista.filter((s) => coincideTexto(s, p));
    if (filtros.calificacion) {
        lista = lista.filter((s) => {
            const c = calificacionDe(s.perfilId);
            return c.cantidad > 0 && c.promedio >= filtros.calificacion;
        });
    }
    if (filtros.zona) lista = lista.filter((s) => s.zonaIds.some((z) => z === filtros.zona || zonaDe(z).tipo === 'General'));
    if (filtros.modalidad) lista = lista.filter((s) => (s.modalidad & filtros.modalidad) !== 0);

    const categoriasDestacado = alcance ? hojas(alcance).map((h) => h.id) : null;
    if (filtros.soloDestacados) lista = lista.filter((s) => destacadoVigente(s.id, categoriasDestacado));

    const total = lista.length;
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const pagina = Math.min(Math.max(1, filtros.pagina || 1), paginas);
    const filas = lista.map((s) => {
        const perfil = perfilDe(s.perfilId);
        return { s, perfil, cal: calificacionDe(perfil.id), destacado: destacadoVigente(s.id, categoriasDestacado), nombre: proveedorDe(perfil) };
    });
    const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    const porCalificacion = (a, b) => (b.cal.cantidad > 0) - (a.cal.cantidad > 0) || b.cal.promedio - a.cal.promedio || b.cal.cantidad - a.cal.cantidad;
    const orden = {
        Calificacion: porCalificacion,
        Antiguedad: (a, b) => a.perfil.alta - b.perfil.alta,
        Alfabetico: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
        Recomendados: (a, b) => (b.destacado - a.destacado) || porCalificacion(a, b) || a.perfil.alta - b.perfil.alta
    }[filtros.orden] || null;
    filas.sort((a, b) => orden(a, b) || cmp(a.s.id, b.s.id));

    const servicios = filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
    const nodo = (c) => ({ id: c.id, nombre: nombreVisible(c), ruta: rutaCategoria(c), servicios: contar(c) });
    let dto = null;
    if (alcance) {
        const padre = alcance.padreId ? categoriaDe(alcance.padreId) : null;
        dto = {
            id: alcance.id, nombre: nombreVisible(alcance), ruta: rutaCategoria(alcance), nivel: niv,
            camino: camino(alcance).map(nodo), hijos: hijas(alcance.id).filter((c) => c.activa).map(nodo),
            hermanas: niv === 3 && padre ? hijas(padre.id).filter((c) => c.activa).map(nodo) : []
        };
    }
    return { servicios, total, pagina, paginas, alcance: dto, cercanas: total === 0 ? cercanas(contar, alcance, niv, filtros.texto) : [] };
}

function cercanas(contar, alcance, niv, textoBuscado) {
    const raices = db.categorias.filter((c) => c.activa && !c.padreId);
    const todas = raices.flatMap(hojas).filter((h) => contar(h) > 0);
    const rubro = niv === 3 ? categoriaDe(alcance.padreId) : niv === 2 ? alcance : null;
    const palabras = palabrasDe(textoBuscado).filter((p) => p.length >= 4).map(slug);
    let candidatas = rubro ? todas.filter((h) => h.padreId === rubro.id && h !== alcance)
        : palabras.length ? todas.filter((h) => palabras.some((p) => slug(h.nombre).includes(p))) : [];
    if (candidatas.length === 0) candidatas = todas;
    return candidatas
        .sort((a, b) => contar(b) - contar(a) || a.nombre.localeCompare(b.nombre, 'es'))
        .slice(0, 3)
        .map((h) => ({ nombre: nombreVisible(h), ruta: rutaCategoria(h), cantidad: contar(h) }));
}

// ---------- Servicios (RN-11 a RN-13) ----------

const PASOS = [
    { n: 1, clave: 'rubro', nombre: 'Gran rubro' },
    { n: 2, clave: 'datos', nombre: 'Qué ofrecés' },
    { n: 3, clave: 'donde', nombre: 'Dónde' },
    { n: 4, clave: 'categorias', nombre: 'Categorías y fotos' },
    { n: 5, clave: 'revisar', nombre: 'Revisar y publicar' }
];
const urlPaso = (id, n) => `/mi-perfil/servicios/${id}/${PASOS[n - 1].clave}`;

function faltantes(s) {
    const f = [];
    if (!texto(s.titulo)) f.push([2, 'Escribí el título del servicio.']);
    if (!texto(s.descripcion)) f.push([2, 'Contá en la descripción qué hacés y cómo trabajás.']);
    if (s.modalidad === 0) f.push([3, 'Elegí al menos una modalidad: en local, a domicilio o remoto.']);
    else if ((s.modalidad & MOD.EnLocal) && !texto(s.direccion)) f.push([3, 'Escribí la dirección del local: si atendés en local, la necesitan para encontrarte.']);
    if (s.zonaIds.length === 0) f.push([3, 'Elegí al menos una zona donde trabajás.']);
    if (!texto(s.telefono)) f.push([3, 'Escribí el teléfono de contacto: es como te van a llamar.']);
    if (s.categoriaIds.length === 0) f.push([4, 'Elegí al menos una categoría, para que te encuentren.']);
    return f;
}

function categoriasEnUso(perfilId, exceptoServicioId = null, elegidas = []) {
    const ids = new Set(elegidas);
    for (const s of db.servicios) {
        if (s.perfilId === perfilId && s.id !== exceptoServicioId) for (const id of s.categoriaIds) ids.add(id);
    }
    return ids.size;
}

const granRubroDe = (s) => categoriaDe(s.granRubroId);
const esProfesional = (s) => granRubroDe(s)?.slug === 'profesionales';

function tarifaDelPerfil(perfilId, actual) {
    const grandes = new Set(db.servicios.filter((s) => s.perfilId === perfilId && s.estado !== 'Borrador').map((s) => granRubroDe(s).slug));
    if (grandes.size === 0) return actual;
    return grandes.has('profesionales') ? 'Profesionales' : 'Servicios';
}

function textosDeServicio(s) {
    return [['Título', s.titulo], ['Descripción', s.descripcion], ['Con quién trabaja', s.colaboradores], ['Precio orientativo', s.precio],
        ['Especialidad', s.especialidad], ['Formación', s.formacion], ['Matrícula declarada', s.matricula]].filter(([, t]) => texto(t));
}

// RN-53 a RN-55: lo único que se controla antes de publicar.
function filtrarServicio(s) {
    return filtroActual().analizar(s.titulo, s.descripcion, s.colaboradores, s.precio, s.especialidad, s.formacion, s.matricula);
}

// 4.1 y RN-31: con el primer servicio, el perfil se activa y empieza la prueba. Devuelve hasta cuándo, o null.
function publicarServicio(s) {
    const t = ahora();
    s.estado = 'Publicado';
    s.ocultoPorFiltro = false;
    s.terminos = [];
    s.publicacion ??= t;
    s.modificacion = t;
    const perfil = perfilDe(s.perfilId);
    if (perfil.estado === 'Borrador') {
        perfil.estado = 'Activo';
        perfil.alta = t;
        const tar = tarifaDelPerfil(perfil.id, 'Servicios');
        const s2 = {
            id: nuevoId('suscripciones'), perfilId: perfil.id, tarifa: tar, estado: 'Prueba', esPrueba: true, inicio: t, monto: 0,
            cubiertoHasta: finDePrueba(t), periodicidad: 'Mensual', formaPago: 'PagoManual', adhesion: null
        };
        db.suscripciones.push(s2);
        return s2.cubiertoHasta;
    }
    return null;
}

// ---------- Cuotas (RN-31 a RN-39) ----------

const cuotaMensual = (t, tarifa) => (tarifa === 'Profesionales' ? t.prof : t.serv);
const cuotaAnual = (mensual, desc) => redondear(mensual * 12 * (100 - desc) / 100, 2);
const debe = (cubierto, hoy) => cubierto < primerDia(hoy);

function etapa(cubierto, hoy) {
    if (!debe(cubierto, hoy)) return 'AlDia';
    const d = partesDia(hoy).d;
    return d > 10 ? 'Vencido' : d >= 8 ? 'UltimosDias' : 'PorPagar';
}

function mesQueCubre(cubierto, hoy) {
    const actual = primerDia(hoy);
    const siguiente = sumarMeses(primerDia(cubierto), 1);
    return siguiente < actual ? actual : siguiente;
}

function mesAPagar(cubierto, hoy) {
    const mes = mesQueCubre(cubierto, hoy);
    return mes <= sumarMeses(primerDia(hoy), 1) ? mes : null;
}

const cubreHasta = (periodo, periodicidad) => ultimoDia(sumarMeses(primerDia(periodo), periodicidad === 'Anual' ? 11 : 0));

// Un pago aprobado (CU-09, paso 5): extiende la cobertura y, si estaba vencido, el perfil vuelve.
function aplicarPago(pago) {
    const s = db.suscripciones.find((x) => x.id === pago.suscripcionId);
    const perfil = perfilDe(s.perfilId);
    const hoy = diaUy(ahora());
    if (pago.concepto === 'Destacado') {
        for (const d of db.destacados.filter((x) => x.pagoId === pago.id)) d.estado = 'Vigente';
        if (s.cubiertoHasta < pago.periodo) s.cubiertoHasta = ultimoDia(pago.periodo);
    } else {
        const mes = mesQueCubre(s.cubiertoHasta, hoy);
        pago.periodo = mes;
        s.cubiertoHasta = cubreHasta(mes, pago.concepto === 'CuotaAnual' ? 'Anual' : 'Mensual');
        s.monto = pago.monto;
    }
    if (s.estado === 'Prueba' && pago.concepto !== 'Destacado') {
        s.esPrueba = false;
    }
    if (!s.esPrueba) s.estado = 'Activa';
    if (perfil.estado === 'Vencido' && !debe(s.cubiertoHasta, hoy)) perfil.estado = 'Activo';
}

// Los lugares de una categoría que se cuentan este mes (QueOcupan).
function ocupados(categoriaId, periodo = periodoActual()) {
    const inicio = inicioDiaUtc(periodo);
    return db.destacados.filter((d) => d.categoriaId === categoriaId && d.periodo === periodo
        && (d.estado !== 'PendientePago' || d.alta < inicio || pagoPendienteReciente(d))).length;
}

function pagoPendienteReciente(d) {
    const pago = db.pagos.find((p) => p.id === d.pagoId);
    return pago && pago.estado === 'Pendiente' && pago.fecha >= ahora() - 3600000;
}

const precioDestacado = (t, tarifa, cuotaCubierta) => (cuotaCubierta ? Math.max(0, t.dest - cuotaMensual(t, tarifa)) : t.dest);
const totalDestacados = (t, tarifa, n, cubierta) => (n <= 0 ? 0 : precioDestacado(t, tarifa, cubierta) + (n - 1) * precioDestacado(t, tarifa, true));
const cuotaCubiertaEn = (cubierto, mes) => cubierto >= primerDia(mes);

function renovables(perfil) {
    const mes = periodoActual();
    const siguiente = sumarMeses(mes, 1);
    const inicioMes = inicioDiaUtc(mes);
    const filas = db.destacados.filter((d) => d.perfilId === perfil.id && (d.periodo === mes || d.periodo === siguiente)).sort((a, b) => a.alta - b.alta || a.id - b.id);
    const reservadas = filas.filter((d) => d.periodo === mes && d.estado === 'PendientePago' && d.alta < inicioMes);
    if (reservadas.length && partesDia(diaUy(ahora())).d <= 10) return { mes, items: reservadas.map((r) => ({ origen: r, fila: r })) };
    const publicados = publicadosDe(perfil.id).map((s) => s.id);
    const items = filas.filter((d) => d.periodo === mes && d.estado === 'Vigente' && publicados.includes(d.servicioId))
        .map((v) => ({ origen: v, fila: filas.find((n) => n.periodo === siguiente && n.servicioId === v.servicioId && n.categoriaId === v.categoriaId) || null }))
        .filter((x) => !x.fila || x.fila.estado === 'PendientePago');
    return items.length ? { mes: siguiente, items } : null;
}

// ---------- Curriculum (3.12) ----------

const NOMBRE_OPORTUNIDAD = { EmpleoFijo: 'Empleo fijo', TrabajosPuntuales: 'Trabajos puntuales', PorHoras: 'Por horas' };
const OPORTUNIDADES = ['EmpleoFijo', 'TrabajosPuntuales', 'PorHoras'];
const nombresOportunidad = (bits) => OPORTUNIDADES.filter((o) => bits & OPORT[o]).map((o) => NOMBRE_OPORTUNIDAD[o]);

const REGEX_PERIODO = /^(((enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)( de)?\s+)?(19|20)\d{2}(\s*(a|al|-|–)\s*((19|20)\d{2}|hoy|la fecha|ahora|actualidad))?)\s*[-–—:·.,]?\s+(\S.*)$/i;

function lineasCv(textoLibre) {
    if (!texto(textoLibre)) return [];
    const lineas = [];
    for (const renglon of textoLibre.split('\n')) {
        const limpio = renglon.trim().replace(/^[-–—•·*]\s*/, '');
        if (!limpio) continue;
        const m = REGEX_PERIODO.exec(limpio);
        lineas.push(m ? { cuando: m[1][0].toUpperCase() + m[1].slice(1), texto: m[10] } : { cuando: null, texto: limpio });
    }
    return lineas;
}

const cvVisible = (c) => c.estado === 'Publicado' && usuarioDe(c.usuarioId)?.estado === 'Activo';

// ---------- Opiniones ----------

const NOMBRE_CALIFICACION = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];
const MOTIVOS = { ContenidoInapropiado: 'Contenido inapropiado', FotoInapropiada: 'Foto inapropiada', NoEsUnServicio: 'No es un servicio', DatosFalsos: 'Datos falsos o engaño', Otro: 'Otro' };
const MOTIVOS_OPINION = ['ContenidoInapropiado', 'DatosFalsos', 'Otro'];
const MOTIVOS_PUBLICACION = ['ContenidoInapropiado', 'FotoInapropiada', 'NoEsUnServicio', 'DatosFalsos', 'Otro'];

// RN-64: hasta 10 reportes por día de Uruguay, sumando opiniones y publicaciones.
function reportesDeHoy(usuarioId) {
    const inicio = inicioDiaUtc(diaUy(ahora()));
    return db.reportesResena.filter((r) => r.usuarioId === usuarioId && r.fecha >= inicio).length
        + db.reportesPublicacion.filter((r) => r.usuarioId === usuarioId && r.fecha >= inicio).length;
}
