// Capturas en celular: portada, resultados, filtros abiertos, ficha, menú y una pantalla con sesión.
import { conectar } from './cdp.mjs';
import { pathToFileURL } from 'node:url';

const [archivo, puerto, carpeta] = process.argv.slice(2);
const b = await conectar(puerto);
await b.ancho(390, 844);
await b.ir(pathToFileURL(archivo).href + '#/');
await b.evaluar("localStorage.clear(); localStorage.setItem('rednexa-demo-puerta', 'ee4c4e3a'); location.reload()");
await b.esperar(1500);

const anchos = [];
const paso = async (nombre, completa = true) => {
    anchos.push(`${nombre}: desborde ${await b.desborde()}px`);
    await b.captura(`${carpeta}/390-${nombre}.png`, completa);
};

await paso('portada');
await b.hash('#/buscar?q=electricista');
await paso('buscar');
await b.evaluar("document.querySelector('.boton-filtrar').click()");
await b.esperar(200);
await paso('filtros-abiertos', false);
await b.hash('#/juan-perez');
await paso('ficha');
await b.evaluar("document.querySelector('[data-menu-abrir]').click()");
await b.esperar(200);
await paso('menu', false);
await b.evaluar("document.querySelector('[data-menu-cerrar]').click()");
await b.evaluar("document.querySelector('[data-demo-accion=abrir]').click()");
await b.esperar(200);
await paso('panel-demo', false);
await b.evaluar(`document.querySelector('[data-demo-entrar="juan.perez@example.com"]').click()`);
await b.esperar(400);
await paso('mis-servicios');
await b.hash('#/mi-perfil/servicios/1/categorias');
await paso('categorias');
await b.hash('#/curriculum');
await paso('curriculum');
console.log(anchos.join('\n'));
console.log('ERRORES:', b.errores.length ? '\n' + b.errores.join('\n') : 'ninguno');
b.cerrar();
