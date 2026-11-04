// La puerta de la demo: aparece sin haber entrado, rechaza datos equivocados, deja pasar con el usuario y la contraseña
// y se recuerda al recargar. También que "Volver a empezar la demo" no la vuelva a cerrar.
import { conectar } from './cdp.mjs';
import { pathToFileURL } from 'node:url';

const [archivo, puerto, carpeta, ancho = '1280'] = process.argv.slice(2);
const CLAVE = process.env.CLAVE_PUERTA;
if (!CLAVE) throw new Error('Falta la contraseña de la puerta en la variable de entorno CLAVE_PUERTA');
const b = await conectar(puerto);
await b.ancho(Number(ancho), 844);
await b.ir(pathToFileURL(archivo).href + '#/juan-perez');
await b.evaluar('localStorage.clear(); location.reload()');
await b.esperar(1500);

const fallas = [];
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FALLA'} ${m}`); if (!c) fallas.push(m); };
const texto = (s) => b.evaluar(`document.querySelector(${JSON.stringify(s)})?.textContent.trim().replace(/\\s+/g, ' ') ?? null`);
const llenar = (s, v) => b.evaluar(`document.querySelector(${JSON.stringify(s)}).value = ${JSON.stringify(v)}`);
const enviar = async () => { await b.evaluar(`document.querySelector('[data-puerta-formulario] button[type=submit]').click()`); await b.esperar(350); };

ok((await texto('h1')) === 'Demo de Red Nexa', 'sin entrar se ve la puerta');
ok((await b.evaluar('document.querySelector(".ficha, .demo")')) === null, 'no se ve nada del sitio ni el botón Demo');
ok((await b.evaluar('document.activeElement.id')) === 'PuertaUsuario', 'el foco arranca en Usuario');
await b.captura(`${carpeta}/${ancho}-puerta.png`, false);

await enviar();
ok((await texto('[data-valmsg-for="PuertaUsuario"]')) === 'Escribí el usuario.', 'vacío: pide el usuario');
ok((await texto('[data-valmsg-for="PuertaContrasena"]')) === 'Escribí la contraseña.', 'vacío: pide la contraseña');

await llenar('#PuertaUsuario', 'rednexa');
await llenar('#PuertaContrasena', 'otra');
await enviar();
ok((await texto('.validation-summary-errors')) === 'El usuario o la contraseña no coinciden. Revisalos y probá de nuevo.', 'contraseña equivocada: error');
ok((await b.evaluar('document.getElementById("PuertaUsuario").value')) === 'rednexa', 'conserva el usuario escrito');
await b.captura(`${carpeta}/${ancho}-puerta-error.png`, false);

await llenar('#PuertaContrasena', CLAVE);
await enviar();
ok((await texto('h1')) === 'Instalaciones eléctricas domiciliarias', 'con el usuario y la contraseña entra a la página pedida');
ok((await b.evaluar('!!document.querySelector(".demo-boton")')), 'aparece el botón Demo');

await b.evaluar('location.reload()');
await b.esperar(1500);
ok((await texto('h1')) === 'Instalaciones eléctricas domiciliarias', 'al recargar no la vuelve a pedir');

await b.evaluar(`document.querySelector('[data-demo-accion=abrir]').click()`);
await b.esperar(150);
await b.evaluar(`document.querySelector('[data-demo-accion=reiniciar]').click()`);
await b.esperar(600);
ok((await texto('h1'))?.startsWith('La solución que necesitás'), 'volver a empezar la demo no cierra la puerta');

await b.evaluar("localStorage.removeItem('rednexa-demo-puerta'); location.reload()");
await b.esperar(1500);
await llenar('#PuertaUsuario', '  RedNexa ');
await llenar('#PuertaContrasena', CLAVE);
await enviar();
ok((await texto('h1'))?.startsWith('La solución que necesitás'), 'el usuario no distingue mayúsculas ni espacios');
ok(!(await b.evaluar('document.documentElement.outerHTML.includes(' + JSON.stringify(CLAVE) + ')')), 'la contraseña no está escrita en la página');

console.log('ERRORES JS:', b.errores.length ? '\n' + b.errores.join('\n') : 'ninguno');
console.log(fallas.length ? `${fallas.length} FALLAS` : 'TODO OK');
b.cerrar();
