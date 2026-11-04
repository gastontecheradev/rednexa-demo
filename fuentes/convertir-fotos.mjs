// Achica las fotos de ejemplo a 640x480 (recorte centrado, como la miniatura del sitio) y las pasa a WEBP
// con Edge sin interfaz, por CDP. Uso: node convertir-fotos.mjs <carpeta-origen> <carpeta-destino> <puerto>
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [origen, destino, puerto] = process.argv.slice(2);
const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
const pagina = lista.find((t) => t.type === 'page');
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let n = 0;
const pendientes = new Map();
ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendientes.has(m.id)) {
        pendientes.get(m.id)(m);
        pendientes.delete(m.id);
    }
});
const enviar = (method, params) => new Promise((r) => {
    const id = ++n;
    pendientes.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
});

const ancho = 560, alto = 420, calidad = 0.55;
let total = 0;
for (const archivo of readdirSync(origen).filter((f) => f.endsWith('.jpg')).sort()) {
    const salida = join(destino, archivo.replace(/\.jpg$/, '.webp'));
    if (existsSync(salida)) {
        continue;
    }
    const b64 = readFileSync(join(origen, archivo)).toString('base64');
    const expr = `(async () => {
        const img = new Image();
        img.src = 'data:image/jpeg;base64,${b64}';
        await img.decode();
        const c = document.createElement('canvas');
        c.width = ${ancho}; c.height = ${alto};
        const x = c.getContext('2d');
        const escala = Math.max(${ancho} / img.naturalWidth, ${alto} / img.naturalHeight);
        const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
        x.imageSmoothingQuality = 'high';
        x.drawImage(img, (${ancho} - w) / 2, (${alto} - h) / 2, w, h);
        return c.toDataURL('image/webp', ${calidad});
    })()`;
    const r = await enviar('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    const url = r.result?.result?.value;
    if (!url || !url.startsWith('data:image/webp')) {
        console.error('Falló', archivo, JSON.stringify(r).slice(0, 300));
        continue;
    }
    const bytes = Buffer.from(url.split(',')[1], 'base64');
    writeFileSync(salida, bytes);
    total += bytes.length;
}
console.log('listo, bytes nuevos:', total);
ws.close();

