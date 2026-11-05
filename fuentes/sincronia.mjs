// Avisa qué archivos del proyecto cambiaron desde la última vez que la demo se puso al día.
//   node sincronia.mjs revisar <carpeta RedNexa>   lista lo cambiado, lo nuevo y lo borrado
//   node sincronia.mjs marcar  <carpeta RedNexa>   guarda las huellas actuales en sincronia.json
// Revisar no frena nada; con --estricto sale con código 1 si la demo quedó atrás.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const aqui = dirname(fileURLToPath(import.meta.url));
const registro = join(aqui, 'sincronia.json');
const [accion, proyecto, ...opciones] = process.argv.slice(2);
if (!['revisar', 'marcar'].includes(accion) || !proyecto) {
    console.error('Uso: node sincronia.mjs revisar|marcar <carpeta RedNexa> [--estricto]');
    process.exit(2);
}

// Lo que la demo copia del proyecto. "solo": se resuelve rearmando; "mano": hay que pasarlo a src/.
const SEGUIDOS = [
    { carpeta: 'RedNexa.Web/wwwroot/css', patron: /\.css$/, como: 'solo' },
    { carpeta: 'RedNexa.Web/wwwroot/fonts', patron: /\.woff2$/, como: 'solo' },
    { carpeta: 'RedNexa.Web/wwwroot/img', patron: /\.(jpg|png|webp)$/, como: 'solo' },
    { carpeta: 'RedNexa.Web/DatosDeEjemplo/Fotos', patron: /\.(jpg|jpeg|png|webp)$/, como: 'solo' },
    { carpeta: 'RedNexa.Infrastructure/Data/Seed', patron: /\.cs$/, como: 'solo' },
    { carpeta: 'RedNexa.Web/Views', patron: /\.cshtml$/, como: 'mano' },
    { carpeta: 'RedNexa.Web/wwwroot/js', patron: /\.js$/, como: 'mano' },
    { carpeta: 'RedNexa.Web/ViewModels', patron: /\.cs$/, como: 'mano' },
    { carpeta: 'RedNexa.Web/Controllers', patron: /\.cs$/, como: 'mano' },
    { carpeta: 'RedNexa.Web/ViewComponents', patron: /\.cs$/, como: 'mano' },
    { carpeta: 'RedNexa.Web', patron: /^(Rutas|Sitio)\.cs$/, como: 'mano', soloRaiz: true },
    { carpeta: 'RedNexa.Web/Auth', patron: /IdentityErrorDescriberEs\.cs$/, como: 'mano' },
    { carpeta: 'RedNexa.Core/Services', patron: /\.cs$/, como: 'mano' },
    { carpeta: 'RedNexa.Core/Text', patron: /\.cs$/, como: 'mano' },
    { carpeta: 'RedNexa.Core/Filtro', patron: /\.cs$/, como: 'mano' },
    { carpeta: 'RedNexa.Core/Email', patron: /\.cs$/, como: 'mano' },
    { carpeta: 'RedNexa.Core/Auth', patron: /\.cs$/, como: 'mano' },
    { carpeta: 'RedNexa.Infrastructure/Services', patron: /\.cs$/, como: 'mano' }
];

const TEXTO = /\.(cs|cshtml|css|js|md)$/;

function archivos(base, seguido) {
    const raiz = join(base, seguido.carpeta);
    if (!existsSync(raiz)) return [];
    const salida = [];
    const recorrer = (dir) => {
        for (const nombre of readdirSync(dir)) {
            const ruta = join(dir, nombre);
            if (statSync(ruta).isDirectory()) {
                if (!seguido.soloRaiz && !['bin', 'obj'].includes(nombre)) recorrer(ruta);
            } else if (seguido.patron.test(nombre)) {
                salida.push(ruta);
            }
        }
    };
    recorrer(raiz);
    return salida;
}

// Los fines de línea no cuentan: git los puede cambiar entre Windows y el repositorio.
function huella(ruta) {
    let datos = readFileSync(ruta);
    if (TEXTO.test(ruta)) datos = Buffer.from(datos.toString('utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n'));
    return createHash('sha256').update(datos).digest('hex').slice(0, 16);
}

function actuales() {
    const mapa = {};
    for (const s of SEGUIDOS) {
        for (const ruta of archivos(proyecto, s)) {
            mapa[relative(proyecto, ruta).replace(/\\/g, '/')] = { huella: huella(ruta), como: s.como };
        }
    }
    return mapa;
}

function versionProyecto() {
    try {
        const commit = execSync('git rev-parse --short HEAD', { cwd: proyecto }).toString().trim();
        const sucios = execSync('git status --porcelain', { cwd: proyecto }).toString().trim();
        return sucios ? `${commit}, con cambios sin commit` : commit;
    } catch {
        return 'sin git';
    }
}

const ahora = actuales();

if (accion === 'marcar') {
    const huellas = Object.fromEntries(Object.entries(ahora).sort().map(([k, v]) => [k, v.huella]));
    writeFileSync(registro, JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), proyecto: versionProyecto(), huellas }, null, 2) + '\n');
    console.log(`Marcado: ${Object.keys(huellas).length} archivos del proyecto (${versionProyecto()}).`);
    process.exit(0);
}

if (!existsSync(registro)) {
    console.error('No hay sincronia.json: corré "marcar" después de poner la demo al día.');
    process.exit(2);
}
const antes = JSON.parse(readFileSync(registro, 'utf8'));
const cambios = { mano: [], solo: [] };
for (const [ruta, v] of Object.entries(ahora)) {
    const previa = antes.huellas[ruta];
    if (previa === undefined) cambios[v.como].push(`nuevo     ${ruta}`);
    else if (previa !== v.huella) cambios[v.como].push(`cambiado  ${ruta}`);
}
for (const ruta of Object.keys(antes.huellas)) {
    if (!ahora[ruta]) {
        const como = SEGUIDOS.find((s) => ruta.startsWith(s.carpeta + '/') && s.patron.test(ruta.split('/').pop()))?.como ?? 'mano';
        cambios[como].push(`borrado   ${ruta}`);
    }
}

const total = cambios.mano.length + cambios.solo.length;
console.log(`Última puesta al día de la demo: ${antes.fecha} (proyecto en ${antes.proyecto}).`);
if (total === 0) {
    console.log('La demo está al día con el proyecto.');
    process.exit(0);
}
if (cambios.mano.length) {
    console.log(`\nHay que pasarlo a mano a fuentes/src/ (${cambios.mano.length}):`);
    for (const l of cambios.mano.sort()) console.log('  ' + l);
}
if (cambios.solo.length) {
    console.log(`\nSe resuelve rearmando con leer-seed, convertir-fotos y build (${cambios.solo.length}):`);
    for (const l of cambios.solo.sort()) console.log('  ' + l);
}
console.log('\nCuando la demo quede al día, rearmala, probala y corré "marcar".');
process.exit(opciones.includes('--estricto') ? 1 : 0);
