// Recorre las pantallas de la demo en un ancho: título, errores y desbordes; captura algunas.
import { conectar } from './cdp.mjs';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const [archivo, puerto, anchoTexto, carpeta, ...soloCapturas] = process.argv.slice(2);
const w = Number(anchoTexto);
mkdirSync(carpeta, { recursive: true });
const b = await conectar(puerto);
await b.ancho(w);
const url = pathToFileURL(archivo).href;
await b.ir(url + '#/');
await b.evaluar("localStorage.clear(); localStorage.setItem('rednexa-demo-puerta', 'ee4c4e3a'); location.reload()");
await b.esperar(1500);

const entrar = async (correo) => {
    await b.evaluar(`(() => { const btn = document.querySelector('[data-demo-accion=abrir]'); btn.click(); })()`);
    await b.esperar(100);
    await b.evaluar(`document.querySelector('[data-demo-entrar="${correo}"]').click()`);
    await b.esperar(400);
};

const rutas = {
    anonimo: ['/', '/buscar?q=electricista', '/servicios/construccion', '/servicios/construccion/electricidad', '/profesionales', '/destacados', '/categorias',
        '/juan-perez', '/juan-perez?todas=true', '/electro-melo', '/curriculum', '/curriculum/1', '/como-funciona', '/contacto', '/terminos', '/privacidad',
        '/registrarse', '/ingresar', '/recuperar', '/buscar?q=zzzz', '/no-existe-esto'],
    maria: ['/mi-cuenta', '/mi-cuenta/menu', '/mi-cuenta/resenas', '/mi-cuenta/contrasena', '/mi-cuenta/eliminar', '/mi-curriculum', '/ofrecer', '/juan-perez/opinar', '/opiniones/1/reportar', '/juan-perez/1/reportar', '/curriculum/1'],
    juan: ['/mi-perfil', '/mi-perfil/servicios', '/mi-perfil/servicios/1/datos', '/mi-perfil/servicios/1/donde', '/mi-perfil/servicios/1/categorias', '/mi-perfil/opiniones', '/mi-perfil/suscripcion', '/mi-perfil/servicios/nuevo'],
    admin: ['/admin', '/admin/revision', '/admin/revision?ver=reportadas', '/admin/perfiles', '/admin/perfiles/1', '/admin/usuarios', '/admin/usuarios/1', '/admin/cv', '/admin/resenas', '/admin/categorias', '/admin/palabras', '/admin/pagos', '/admin/destacados', '/admin/tarifas', '/admin/registro']
};
const cuentas = { anonimo: null, maria: 'maria.gonzalez@example.com', juan: 'juan.perez@example.com', admin: 'admin@example.com' };

for (const [quien, lista] of Object.entries(rutas)) {
    if (cuentas[quien]) await entrar(cuentas[quien]);
    for (const r of lista) {
        await b.hash('#' + r);
        const titulo = await b.evaluar('document.title');
        const h1 = await b.evaluar("document.querySelector('h1')?.textContent.trim().replace(/\\s+/g, ' ') || '(sin h1)'");
        const sobra = await b.desborde();
        const ruta = await b.evaluar('location.hash');
        console.log(`[${quien}] ${r} -> ${ruta} | ${titulo} | h1: ${h1}${sobra > 0 ? ` | DESBORDE ${sobra}px` : ''}`);
        const nombre = `${quien}${r.replace(/[^a-z0-9]+/gi, '_')}`;
        if (soloCapturas.length === 0 || soloCapturas.some((s) => nombre.includes(s))) await b.captura(`${carpeta}/${w}-${nombre}.png`);
    }
}
console.log('ERRORES:', b.errores.length ? '\n' + b.errores.join('\n') : 'ninguno');
b.cerrar();
