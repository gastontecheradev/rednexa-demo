// Arma rednexademo.html: el CSS del sitio con las fuentes adentro, las fotos, los datos de ejemplo y la app.
// Uso: node build.mjs <carpeta RedNexa.Web> <salida.html>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const [web, salida] = process.argv.slice(2);
const b64 = (ruta) => readFileSync(ruta).toString('base64');

let css = readFileSync(join(web, 'wwwroot/css/site.css'), 'utf8').replace(/^﻿/, '');
css = css.replace(/url\("\.\.\/fonts\/([a-z-]+\.woff2)"\)/g, (_, f) => `url("data:font/woff2;base64,${b64(join(web, 'wwwroot/fonts', f))}")`);
// En la demo la dirección va después del #: el panel de filtros se abre con una clase en lugar de :target.
css = css.replace(/\.filtros:target/g, '.filtros.es-objetivo').replace(/\.filtros--cv:target/g, '.filtros--cv.es-objetivo');
if (css.includes('../fonts') || css.includes(':target')) throw new Error('Quedó una referencia sin resolver en el CSS');
const cssDemo = readFileSync(join(aqui, 'src/demo.css'), 'utf8');

const fotos = {};
for (const f of readdirSync(join(aqui, 'fotos')).filter((x) => x.endsWith('.webp')).sort()) {
    fotos[f.replace(/\.webp$/, '')] = `data:image/webp;base64,${b64(join(aqui, 'fotos', f))}`;
}
const portada = {};
for (const ancho of [800, 1280, 1960]) portada[ancho] = `data:image/jpeg;base64,${b64(join(web, `wwwroot/img/portada-${ancho}.jpg`))}`;
const favicon = `data:image/x-icon;base64,${b64(join(web, 'wwwroot/favicon.ico'))}`;

const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const seed = JSON.parse(readFileSync(join(aqui, 'seed.json'), 'utf8'));
const partes = readdirSync(join(aqui, 'src')).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
const app = partes.map((f) => `// ---- ${f} ----\n` + readFileSync(join(aqui, 'src', f), 'utf8')).join('\n');
if (/<\/script/i.test(app)) throw new Error('La app tiene un </script> literal');

const js = `(() => {
'use strict';
const SEED = ${json(seed)};
const FOTOS = ${json(fotos)};
const PORTADA = ${json(portada)};
${app}
})();`;
writeFileSync(join(aqui, 'app-armada.js'), js);

const html = `<!DOCTYPE html>
<html lang="es-UY">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Red Nexa</title>
    <meta name="description" content="Demo de Red Nexa, la guía de servicios de Melo: el sitio completo, con datos de ejemplo, en un solo archivo." />
    <meta name="robots" content="noindex" />
    <meta name="theme-color" content="#08694f" />
    <link rel="icon" href="${favicon}" />
    <style>
${css}
    </style>
    <style>
${cssDemo}
    </style>
</head>
<body>
    <noscript><p style="padding:24px;font:16px/1.5 system-ui,sans-serif">Esta demo necesita JavaScript para funcionar. Abrila en Chrome, Edge, Firefox o Safari con JavaScript activado.</p></noscript>
    <script>
${js}
    </script>
</body>
</html>
`;
writeFileSync(salida, html);
console.log('Listo:', salida, (Buffer.byteLength(html) / 1048576).toFixed(2), 'MB;', Object.keys(fotos).length, 'fotos');
