// ===================== Datos: la base de la demo, sembrada como SampleData =====================

const CLAVE_BASE = 'rednexa-demo-v3';
const DOMINIO = 'example.com';
const CLAVE_DEMO = 'RedNexa2026!';
const SITIO = { nombre: 'Red Nexa', correo: 'rednexaok@gmail.com', ubicacion: 'Melo, Cerro Largo' };
const TODO_EL_DEPARTAMENTO = 'Todo el departamento';
const MAXIMO_CATEGORIAS = 3;
const MAXIMO_FOTOS = 5;
const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024;
const DIAS_PRUEBA = 30;

const SLUGS_RESERVADOS = new Set(['admin', 'archivos', 'buscar', 'categorias', 'como-funciona', 'confirmar', 'contacto', 'css', 'cuenta-eliminada',
    'curriculum', 'destacados', 'estado', 'fonts', 'home', 'img', 'ingresar', 'js', 'lib', 'mi-cuenta', 'mi-curriculum', 'mi-perfil', 'ofrecer',
    'opiniones', 'privacidad', 'profesionales', 'recuperar', 'registrarse', 'restablecer', 'salir', 'servicios', 'terminos', 'pasarela-de-prueba']);

let db = null;

function nuevoId(tabla) {
    db.seq[tabla] = (db.seq[tabla] || 0) + 1;
    return db.seq[tabla];
}

function guardar() {
    try {
        localStorage.setItem(CLAVE_BASE, JSON.stringify(db));
    } catch {
        // Sin almacenamiento la demo sigue andando; sólo se pierde al recargar.
    }
}

function cargarBase() {
    let guardada = null;
    try {
        const texto = localStorage.getItem(CLAVE_BASE);
        guardada = texto ? JSON.parse(texto) : null;
    } catch {
        guardada = null;
    }
    // Una base sembrada en otro mes se vuelve a sembrar: las cuotas y los destacados son del mes.
    if (guardada && guardada.version === 4 && guardada.semilla && periodoActual(guardada.semilla) === periodoActual()) {
        db = guardada;
        return;
    }
    db = sembrar(ahora());
    guardar();
}

function reiniciarBase() {
    db = sembrar(ahora());
    guardar();
}

// "Juan Pérez" → "juan-perez"; si ya existe, "juan-perez-2" (ReglasPerfil.CrearSlug).
function crearSlug(nombre, ocupado) {
    let base = slug(nombre);
    if (base.length > 60) base = base.slice(0, 60).replace(/-+$/, '');
    if (base.length === 0) base = 'proveedor';
    let s = base;
    for (let n = 2; SLUGS_RESERVADOS.has(s) || ocupado(s); n++) {
        s = `${base}-${n}`;
    }
    return s;
}

const finDePrueba = (activacionMs) => ultimoDia(sumarDias(diaUy(activacionMs), DIAS_PRUEBA));

function sembrar(now) {
    db = {
        version: 4,
        semilla: now,
        seq: {},
        categorias: [],
        zonas: [],
        usuarios: [],
        perfiles: [],
        servicios: [],
        resenas: [],
        reportesResena: [],
        reportesPublicacion: [],
        curriculums: [],
        suscripciones: [],
        pagos: [],
        destacados: [],
        palabras: [],
        registro: [],
        correos: [],
        tarifas: [],
        sesion: null
    };

    // Catálogo (Anexo A) y zonas (Anexo B).
    SEED.grandes.forEach((g, i) => {
        const raiz = { id: nuevoId('categorias'), nombre: g.nombre, slug: g.slug, padreId: null, orden: i + 1, activa: true, matricula: false };
        db.categorias.push(raiz);
        g.rubros.forEach((r, j) => {
            const rubro = { id: nuevoId('categorias'), nombre: r.nombre, slug: r.slug, padreId: raiz.id, orden: j + 1, activa: true, matricula: false };
            db.categorias.push(rubro);
            r.categorias.forEach((c, k) => {
                db.categorias.push({ id: nuevoId('categorias'), nombre: c, slug: slug(c), padreId: rubro.id, orden: k + 1, activa: true, matricula: r.conMatricula.includes(c) });
            });
        });
    });
    db.zonas.push({ id: nuevoId('zonas'), nombre: TODO_EL_DEPARTAMENTO, tipo: 'General', orden: 0 });
    SEED.localidades.forEach((l, i) => db.zonas.push({ id: nuevoId('zonas'), nombre: l, tipo: 'Localidad', orden: i + 1 }));

    // RN-37, RN-39 y 3.9.
    db.tarifas.push({ id: nuevoId('tarifas'), prof: 400, serv: 150, dest: 2500, desc: 10, cupo: 6, desde: now - 330 * DIA });

    const porRuta = {};
    for (const c of db.categorias) porRuta[rutaCategoria(c)] = c;
    const zona = (nombre) => db.zonas.find((z) => z.nombre === nombre);
    const correos = new Set();
    const nuevoUsuario = (nombre, apellido, registro, extra = {}) => {
        const local = slug(`${nombre} ${apellido}`).replace(/-/g, '.');
        let correo = `${local}@${DOMINIO}`;
        for (let n = 2; correos.has(correo); n++) correo = `${local}${n}@${DOMINIO}`;
        correos.add(correo);
        const u = {
            id: nuevoId('usuarios'), nombre, apellido, correo, clave: null, confirmado: true, estado: 'Activo',
            registro, ultimoAcceso: null, telefono: null, foto: null, admin: false, modificado: null, ...extra
        };
        db.usuarios.push(u);
        return u;
    };

    const opinan = SEED.nombresOpinan.map((n, i) => nuevoUsuario(n, SEED.apellidosOpinan[i], now - (300 - i) * DIA));
    const periodo = periodoActual(now);
    let transaccion = 0;
    const tarifas = db.tarifas[0];

    const agregar = (lista, primerTelefono) => lista.forEach((datos, i) => {
        const telefono = primerTelefono + i;
        const alta = now - datos.diasDesdeAlta * DIA;
        const usuario = nuevoUsuario(datos.nombre, datos.apellido, alta - DIA);
        if (datos.estado === 'Bloqueado') usuario.estado = 'Bloqueado';
        const perfil = {
            id: nuevoId('perfiles'), usuarioId: usuario.id, tipoPersona: datos.tipoPersona, nombreComercial: datos.nombreComercial,
            rut: datos.rut, descripcion: datos.descripcion, estado: datos.estado, alta, modificacion: alta, slug: null, revision: null
        };
        db.perfiles.push(perfil);
        const modalidad = datos.modalidad.reduce((a, m) => a | MOD[m], 0);
        const servicio = {
            id: nuevoId('servicios'), perfilId: perfil.id, granRubroId: porRuta[datos.categorias[0].split('/')[0]].id,
            titulo: datos.titulo, descripcion: datos.descripcion, colaboradores: datos.colaboradores, modalidad, direccion: datos.direccion,
            telefono: `59899${String(telefono).padStart(6, '0')}`, precio: datos.precio, especialidad: datos.especialidad,
            formacion: datos.formacion, matricula: datos.matricula, video: null, estado: 'Publicado', ocultoPorFiltro: false, terminos: [],
            publicacion: alta, modificacion: alta, revision: null,
            categoriaIds: datos.categorias.map((r) => porRuta[r].id), zonaIds: [zona(datos.zona).id], fotos: []
        };
        db.servicios.push(servicio);

        // Las opiniones: la más reciente hace 3 días; el resto, repartidas desde el alta.
        const notas = datos.calificaciones;
        const paso = Math.max(1, Math.trunc((datos.diasDesdeAlta - 4) / Math.max(1, notas.length)));
        notas.forEach((nota, k) => {
            const comentario = k < datos.opinionesPropias.length ? datos.opinionesPropias[k]
                : nota >= 4 ? SEED.opinionesPositivas[k % SEED.opinionesPositivas.length]
                : nota === 3 ? SEED.opinionRegular : SEED.opinionNegativa;
            db.resenas.push({
                id: nuevoId('resenas'), perfilId: perfil.id, usuarioId: opinan[k].id, calificacion: nota, comentario,
                estado: 'Publicada', ocultaPorFiltro: false, terminos: [], creacion: now - (3 + k * paso) * DIA, modificacion: null,
                respuesta: k === 0 && datos.respuestaPrimeraOpinion ? { texto: datos.respuestaPrimeraOpinion, fecha: now - 2 * DIA } : null
            });
        });

        // RN-38 y la suscripción de ejemplo.
        const tarifa = datos.categorias.some((c) => c.startsWith('profesionales/')) ? 'Profesionales' : 'Servicios';
        const cuota = tarifa === 'Profesionales' ? tarifas.prof : tarifas.serv;
        const s = { id: nuevoId('suscripciones'), perfilId: perfil.id, tarifa, inicio: alta, monto: cuota, periodicidad: 'Mensual', formaPago: 'PagoManual', adhesion: null, esPrueba: false };
        if (datos.estado === 'Activo' && datos.diasDesdeAlta <= 60) {
            Object.assign(s, { estado: 'Prueba', esPrueba: true, monto: 0, cubiertoHasta: finDePrueba(alta) });
        } else if (datos.estado === 'Activo') {
            Object.assign(s, { estado: 'Activa', cubiertoHasta: ultimoDia(diaUy(now)) });
        } else if (datos.estado === 'Vencido') {
            Object.assign(s, { estado: 'Vencida', cubiertoHasta: ultimoDia(sumarMeses(periodo, -1)) });
        } else {
            Object.assign(s, { estado: 'Cancelada', cubiertoHasta: ultimoDia(sumarMeses(periodo, -1)) });
        }
        db.suscripciones.push(s);

        const tx = () => `DEV-${String(++transaccion).padStart(4, '0')}`;
        if (datos.destacadoEn) {
            const pago = { id: nuevoId('pagos'), suscripcionId: s.id, concepto: 'Destacado', periodo, monto: s.esPrueba ? tarifas.dest - cuota : tarifas.dest, fecha: now, estado: 'Aprobado', tx: tx() };
            db.pagos.push(pago);
            db.destacados.push({
                id: nuevoId('destacados'), perfilId: perfil.id, servicioId: servicio.id, categoriaId: porRuta[datos.destacadoEn].id,
                periodo, estado: 'Vigente', pagoId: pago.id, alta: now - Math.min(datos.diasDesdeAlta, 20) * DIA
            });
        } else if (s.estado === 'Activa') {
            db.pagos.push({ id: nuevoId('pagos'), suscripcionId: s.id, concepto: 'CuotaMensual', periodo, monto: cuota, fecha: now, estado: 'Aprobado', tx: tx() });
        }
    });

    agregar(SEED.proveedores, 1);
    agregar(SEED.unoPorCategoria, SEED.proveedores.length + 1);

    for (const c of SEED.curriculums) {
        const actualizado = now - c.diasDesdeActualizacion * DIA;
        const u = nuevoUsuario(c.nombre, c.apellido, actualizado - 30 * DIA);
        db.curriculums.push({
            id: nuevoId('curriculums'), usuarioId: u.id, queSabeHacer: c.queSabeHacer, cursos: c.cursos, experiencia: null, telefono: c.telefono,
            mostrarCorreo: false, oportunidades: c.oportunidades.reduce((a, o) => a | OPORT[o], 0), zonaIds: [zona(c.zona).id],
            estado: c.estado, ocultoPorFiltro: false, terminos: [], publicacion: actualizado, actualizacion: actualizado, revision: null
        });
    }

    // Las direcciones de las fichas, en el orden de alta.
    const usados = new Set();
    for (const p of db.perfiles) {
        const u = usuarioDe(p.usuarioId);
        p.slug = crearSlug(p.nombreComercial ?? `${u.nombre} ${u.apellido}`, (s) => usados.has(s));
        usados.add(p.slug);
    }

    // Las fotos de ejemplo, por la dirección de la ficha: juan-perez-1, juan-perez-2…
    for (const p of db.perfiles) {
        const principal = db.servicios.find((s) => s.perfilId === p.id);
        for (let n = 1; n <= MAXIMO_FOTOS && FOTOS[`${p.slug}-${n}`]; n++) {
            principal.fotos.push({ id: nuevoId('fotos'), src: `${p.slug}-${n}` });
        }
    }

    // Las cuentas para recorrer la demo: tienen contraseña, a diferencia de las de ejemplo.
    const juan = db.usuarios.find((u) => u.correo === `juan.perez@${DOMINIO}`);
    juan.clave = CLAVE_DEMO;
    juan.telefono = null;
    const maria = db.usuarios.find((u) => u.correo === `maria.gonzalez@${DOMINIO}`);
    maria.clave = CLAVE_DEMO;
    nuevoUsuario('Equipo', 'Red Nexa', now - 330 * DIA, { clave: CLAVE_DEMO, admin: true, ultimoAcceso: now - DIA });
    db.usuarios.find((u) => u.correo === `equipo.red.nexa@${DOMINIO}`).correo = `admin@${DOMINIO}`;

    // Para que la demo se vea igual cualquier día del mes: después del 10, las cuotas de ejemplo que
    // quedaron sin pagar se dan por pagadas el día 5 (en el sitio real, esos perfiles vencerían).
    const hoy = diaUy(now);
    if (partesDia(hoy).d > 10) {
        for (const s of db.suscripciones) {
            const perfil = perfilDe(s.perfilId);
            if (perfil.estado === 'Activo' && s.cubiertoHasta < primerDia(hoy)) {
                const cuota = s.tarifa === 'Profesionales' ? tarifas.prof : tarifas.serv;
                db.pagos.push({ id: nuevoId('pagos'), suscripcionId: s.id, concepto: 'CuotaMensual', periodo, monto: cuota, fecha: inicioDiaUtc(sumarDias(periodo, 4)) + 15 * 3600000, estado: 'Aprobado', tx: `DEV-${String(++transaccion).padStart(4, '0')}` });
                Object.assign(s, { estado: 'Activa', esPrueba: false, monto: cuota, cubiertoHasta: ultimoDia(hoy) });
            }
        }
    }

    return db;
}

// ---------- Lecturas básicas ----------

const usuarioDe = (id) => db.usuarios.find((u) => u.id === id);
const perfilDe = (id) => db.perfiles.find((p) => p.id === id);
const servicioDe = (id) => db.servicios.find((s) => s.id === id);
const categoriaDe = (id) => db.categorias.find((c) => c.id === id);
const zonaDe = (id) => db.zonas.find((z) => z.id === id);
const perfilDeUsuario = (usuarioId) => db.perfiles.find((p) => p.usuarioId === usuarioId && p.estado !== 'Eliminado');
const cvDeUsuario = (usuarioId) => db.curriculums.find((c) => c.usuarioId === usuarioId);
const suscripcionDe = (perfilId) => db.suscripciones.filter((s) => s.perfilId === perfilId).sort((a, b) => b.id - a.id)[0] || null;
const tarifasVigentes = () => db.tarifas.filter((t) => t.desde <= ahora()).sort((a, b) => b.desde - a.desde)[0];
const fotoSrc = (foto) => (foto.src.startsWith('data:') ? foto.src : FOTOS[foto.src]);

function rutaCategoria(c) {
    const padre = c.padreId ? categoriaDe(c.padreId) : null;
    return padre ? `${rutaCategoria(padre)}/${c.slug}` : c.slug;
}

function nivel(c) {
    return c.padreId ? nivel(categoriaDe(c.padreId)) + 1 : 1;
}

const hijas = (id) => db.categorias.filter((c) => c.padreId === id).sort((a, b) => a.orden - b.orden);

// El "Otros" de un rubro dice poco solo (M04).
function nombreVisible(c) {
    const padre = c.padreId ? categoriaDe(c.padreId) : null;
    return c.nombre === 'Otros' && padre && padre.padreId ? `Otros (${padre.nombre})` : c.nombre;
}

function proveedorDe(perfil) {
    const u = usuarioDe(perfil.usuarioId);
    return perfil.nombreComercial ?? `${u.nombre} ${u.apellido}`.trim();
}

function nombreCompleto(u) {
    return `${u.nombre} ${u.apellido}`.trim();
}

function autorDe(usuarioId) {
    const u = usuarioDe(usuarioId);
    return !u || u.estado === 'Eliminado' ? 'Usuario eliminado' : nombreConInicial(u.nombre, u.apellido);
}

// RN-16: sólo servicios publicados de perfiles activos.
const visible = (s) => s.estado === 'Publicado' && perfilDe(s.perfilId)?.estado === 'Activo';

function publicadosDe(perfilId) {
    return db.servicios.filter((s) => s.perfilId === perfilId && s.estado === 'Publicado').sort((a, b) => a.id - b.id);
}

function esPrincipal(s) {
    const publicados = publicadosDe(s.perfilId);
    return publicados.length > 0 && publicados[0].id === s.id;
}

function urlFicha(s) {
    const p = perfilDe(s.perfilId);
    return esPrincipal(s) ? `/${p.slug}` : `/${p.slug}/${s.id}`;
}

// RN-24: las ocultas no cuentan. Las reportadas siguen a la vista.
function calificacionDe(perfilId) {
    const visibles = db.resenas.filter((r) => r.perfilId === perfilId && r.estado !== 'Oculta');
    const cantidad = visibles.length;
    const promedio = cantidad ? redondear(visibles.reduce((a, r) => a + r.calificacion, 0) / cantidad, 2) : 0;
    return { promedio, cantidad };
}

function calificacionResumen(perfilId) {
    const { promedio, cantidad } = calificacionDe(perfilId);
    return cantidad > 0 ? { llenas: F.estrellasLlenas(promedio), promedio: F.rating(promedio), opiniones: F.opiniones(cantidad), pocas: cantidad < 3 } : null;
}

function destacadoVigente(servicioId, categoriaIds = null) {
    const periodo = periodoActual();
    return db.destacados.some((d) => d.servicioId === servicioId && d.periodo === periodo && d.estado === 'Vigente'
        && (categoriaIds === null || categoriaIds.includes(d.categoriaId)));
}

function hojas(c) {
    const h = hijas(c.id).filter((x) => x.activa);
    return h.length === 0 ? [c] : h.flatMap(hojas);
}

// Cuántos servicios visibles hay en cada categoría (y lo que tiene adentro).
function conteo() {
    const porCategoria = new Map();
    for (const s of db.servicios) {
        if (!visible(s)) continue;
        for (const id of s.categoriaIds) {
            if (!porCategoria.has(id)) porCategoria.set(id, new Set());
            porCategoria.get(id).add(s.id);
        }
    }
    return (c) => {
        const ids = new Set();
        for (const h of hojas(c)) for (const s of porCategoria.get(h.id) || []) ids.add(s);
        return ids.size;
    };
}

// Los correos no salen de la demo: quedan en "Correos de la demo", con su enlace (EmailTemplates.Armar).
function enviarCorreo(correo) {
    db.correos.unshift({ id: nuevoId('correos'), fecha: ahora(), leido: false, ...correo });
}

function registrar(adminId, accion, detalle, motivo = null) {
    db.registro.unshift({ id: nuevoId('registro'), fecha: ahora(), accion, detalle, motivo, adminId });
}
