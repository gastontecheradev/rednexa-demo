// Lee los datos de ejemplo del proyecto (C#) y los deja en JSON para la demo: catálogo, zonas,
// proveedores, CV y quienes opinan. Uso: node leer-seed.mjs <carpeta Seed> <salida.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [carpeta, salida] = process.argv.slice(2);

function tokens(texto) {
    const t = [];
    let i = 0;
    while (i < texto.length) {
        const c = texto[i];
        if (/\s/.test(c)) { i++; continue; }
        if (c === '/' && texto[i + 1] === '/') { while (i < texto.length && texto[i] !== '\n') i++; continue; }
        if (c === '"') {
            let s = '';
            i++;
            while (texto[i] !== '"') {
                if (texto[i] === '\\') { s += texto[i + 1] === 'n' ? '\n' : texto[i + 1]; i += 2; continue; }
                s += texto[i++];
            }
            i++;
            t.push({ k: 's', v: s });
            continue;
        }
        if (/[0-9]/.test(c)) {
            let s = '';
            while (/[0-9.m]/.test(texto[i])) s += texto[i++];
            t.push({ k: 'n', v: Number(s.replace('m', '')) });
            continue;
        }
        if (/[A-Za-z_]/.test(c)) {
            let s = '';
            while (/[A-Za-z0-9_]/.test(texto[i])) s += texto[i++];
            t.push({ k: 'i', v: s });
            continue;
        }
        t.push({ k: 'p', v: c });
        i++;
    }
    return t;
}

function parser(t) {
    let p = 0;
    const ver = () => t[p];
    const es = (v) => t[p] && t[p].k === 'p' && t[p].v === v;
    const tomar = (v) => {
        if (v !== undefined && !es(v)) throw new Error(`Se esperaba ${v} y vino ${JSON.stringify(t[p])} en ${p}`);
        return t[p++];
    };
    function expr() {
        const a = ver();
        if (a.k === 'i' && a.v === 'new') {
            p++;
            tomar('(');
            const args = [];
            const nombrados = {};
            while (!es(')')) {
                if (ver().k === 'i' && t[p + 1].k === 'p' && t[p + 1].v === ':') {
                    const nombre = ver().v;
                    p += 2;
                    nombrados[nombre] = expr();
                } else {
                    args.push(expr());
                }
                if (es(',')) p++;
            }
            tomar(')');
            const inits = {};
            if (es('{')) {
                p++;
                while (!es('}')) {
                    const nombre = tomar().v;
                    tomar('=');
                    inits[nombre] = expr();
                    if (es(',')) p++;
                }
                tomar('}');
            }
            return { args, nombrados, inits };
        }
        if (es('[')) {
            p++;
            const lista = [];
            while (!es(']')) {
                lista.push(expr());
                if (es(',')) p++;
            }
            tomar(']');
            return lista;
        }
        if (a.k === 's' || a.k === 'n') { p++; return a.v; }
        if (a.k === 'i') {
            const partes = [];
            do {
                let s = tomar().v;
                while (es('.')) { p++; s += '.' + tomar().v; }
                partes.push(s);
                if (es('|')) { p++; continue; }
                break;
            } while (true);
            if (partes.length === 1 && partes[0] === 'null') return null;
            if (partes.length === 1 && partes[0] === 'true') return true;
            if (partes.length === 1 && partes[0] === 'false') return false;
            return { enum: partes };
        }
        throw new Error('Inesperado ' + JSON.stringify(a) + ' en ' + p);
    }
    return { expr, fin: () => p >= t.length };
}

function arreglo(texto, nombre) {
    const desde = texto.indexOf(nombre);
    if (desde < 0) throw new Error('No está ' + nombre);
    const inicio = texto.indexOf('[', texto.indexOf('=', desde));
    // Hasta el "];" que cierra, contando corchetes fuera de las cadenas.
    let nivel = 0, i = inicio, enCadena = false;
    for (; i < texto.length; i++) {
        const c = texto[i];
        if (enCadena) {
            if (c === '\\') { i++; continue; }
            if (c === '"') enCadena = false;
            continue;
        }
        if (c === '/' && texto[i + 1] === '/') { while (texto[i] !== '\n') i++; continue; }
        if (c === '"') { enCadena = true; continue; }
        if (c === '[') nivel++;
        if (c === ']') { nivel--; if (nivel === 0) break; }
    }
    return parser(tokens(texto.slice(inicio, i + 1))).expr();
}

function cadena(texto, nombre) {
    const m = new RegExp(nombre + '\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(texto);
    return m[1];
}

const enumValor = (e) => (e && e.enum ? e.enum.map((x) => x.split('.').pop()) : e);

function proveedor(n) {
    const [nombre, apellido, titulo, descripcion, categorias, calificaciones] = n.args;
    const i = n.inits;
    return {
        nombre, apellido, titulo, descripcion, categorias,
        diasDesdeAlta: n.nombrados.DiasDesdeAlta,
        calificaciones: n.nombrados.Calificaciones ?? calificaciones ?? n.args[5],
        nombreComercial: i.NombreComercial ?? null,
        tipoPersona: i.TipoPersona ? enumValor(i.TipoPersona)[0] : 'Fisica',
        rut: i.Rut ?? null,
        estado: i.Estado ? enumValor(i.Estado)[0] : 'Activo',
        modalidad: i.Modalidad ? enumValor(i.Modalidad) : ['ADomicilio'],
        direccion: i.Direccion ?? null,
        zona: i.Zona ? (i.Zona.enum ? 'Todo el departamento' : i.Zona) : 'Melo',
        precio: i.Precio ?? null,
        colaboradores: i.Colaboradores ?? null,
        especialidad: i.Especialidad ?? null,
        formacion: i.Formacion ?? null,
        matricula: i.Matricula ?? null,
        destacadoEn: i.DestacadoEn ?? null,
        opinionesPropias: i.OpinionesPropias ?? [],
        respuestaPrimeraOpinion: i.RespuestaPrimeraOpinion ?? null
    };
}

const catalogo = readFileSync(join(carpeta, 'CategoriaCatalog.cs'), 'utf8');
const grandes = arreglo(catalogo, 'GrandesRubros').map((g) => ({
    nombre: g.args[0], slug: g.args[1],
    rubros: g.args[2].map((r) => ({ nombre: r.args[0], slug: r.args[1], categorias: r.args[2], conMatricula: r.args[3] }))
}));

const zonas = readFileSync(join(carpeta, 'ZonaCatalog.cs'), 'utf8');
const localidades = arreglo(zonas, 'Localidades');

const sample = readFileSync(join(carpeta, 'SampleData.cs'), 'utf8');
const uno = readFileSync(join(carpeta, 'SampleData.UnoPorCategoria.cs'), 'utf8');

const proveedores = arreglo(sample, 'Proveedor[] Proveedores').map(proveedor);
const unoPorCategoria = arreglo(uno, 'Proveedor[] UnoPorCategoria').map(proveedor);
const curriculums = arreglo(sample, 'CvDePrueba[] Curriculums').map((c) => ({
    nombre: c.args[0], apellido: c.args[1], queSabeHacer: c.args[2],
    oportunidades: enumValor(c.args[3]),
    zona: c.args[4].enum ? 'Todo el departamento' : c.args[4],
    diasDesdeActualizacion: c.args[5],
    estado: c.args[6] ? enumValor(c.args[6])[0] : 'Publicado',
    cursos: c.nombrados.Cursos ?? null,
    telefono: c.nombrados.Telefono ?? null
}));

const datos = {
    grandes,
    localidades,
    proveedores,
    unoPorCategoria,
    curriculums,
    nombresOpinan: arreglo(sample, 'NombresOpinan'),
    apellidosOpinan: arreglo(sample, 'ApellidosOpinan'),
    opinionesPositivas: arreglo(sample, 'OpinionesPositivas'),
    opinionRegular: cadena(sample, 'OpinionRegular'),
    opinionNegativa: cadena(sample, 'OpinionNegativa')
};
writeFileSync(salida, JSON.stringify(datos));
console.log('grandes', grandes.length, 'proveedores', proveedores.length, 'uno', unoPorCategoria.length, 'cv', curriculums.length,
    'opinan', datos.nombresOpinan.length, 'localidades', localidades.length);
console.log(JSON.stringify(proveedores[0]).slice(0, 400));
console.log(JSON.stringify(unoPorCategoria.at(-1)));
console.log(JSON.stringify(curriculums));
