// Recorridos de punta a punta en la demo, manejando el DOM como lo haría una persona.
import { conectar } from './cdp.mjs';
import { pathToFileURL } from 'node:url';

const [archivo, puerto, carpeta] = process.argv.slice(2);
const b = await conectar(puerto);
await b.ancho(1280, 900);
await b.ir(pathToFileURL(archivo).href + '#/');
await b.evaluar("localStorage.clear(); localStorage.setItem('rednexa-demo-puerta', 'ee4c4e3a'); location.reload()");
await b.esperar(1500);

const fallas = [];
const ok = (cond, msg) => {
    console.log(`${cond ? 'OK  ' : 'FALLA'} ${msg}`);
    if (!cond) fallas.push(msg);
};
const ir = (h) => b.hash('#' + h);
const llenar = (sel, v) => b.evaluar(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
const marcar = (sel) => b.evaluar(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
const clic = async (sel) => {
    await b.evaluar(`document.querySelector(${JSON.stringify(sel)}).click()`);
    await b.esperar(350);
};
const texto = (sel) => b.evaluar(`document.querySelector(${JSON.stringify(sel)})?.textContent.trim().replace(/\\s+/g, ' ') ?? null`);
const hash = () => b.evaluar('location.hash');
const entrarComo = async (correo) => {
    await clic('[data-demo-accion=abrir]');
    await clic(`[data-demo-entrar="${correo}"]`);
};
const botonCon = (t) => `(() => [...document.querySelectorAll('button, a')].find((x) => x.textContent.trim().startsWith(${JSON.stringify(t)})))()`;
const clicTexto = async (t) => {
    await b.evaluar(`${botonCon(t)}.click()`);
    await b.esperar(350);
};

// 1. Crear una cuenta y confirmarla con el correo de la demo.
await ir('/registrarse');
await llenar('#Nombre', 'Laura');
await llenar('#Apellido', 'Techera');
await llenar('#Correo', 'laura@example.com');
await llenar('#Contrasena', 'corta');
await llenar('#RepetirContrasena', 'corta');
await marcar('#AceptaTerminos');
await clic('#crear-cuenta');
ok((await texto('[data-valmsg-for="Contrasena"]'))?.includes('8 caracteres'), 'registro: contraseña corta da error junto al campo');
await llenar('#Contrasena', 'Clave2026!');
await llenar('#RepetirContrasena', 'Clave2026!');
await clic('#crear-cuenta');
ok((await hash()).startsWith('#/confirmar'), 'registro: lleva a Revisá tu correo');
ok((await texto('h1')) === 'Revisá tu correo', 'confirmar: título Revisá tu correo');
await ir('/juan-perez/opinar');
ok((await texto('.aviso--alerta')) === 'Confirmá tu correo para poder opinar.', 'opinar sin confirmar: pide confirmar');
await clic('[data-demo-accion=abrir]');
await clic('[data-demo-accion=correos]');
await clic('[data-demo-correo]');
ok((await texto('.demo-correo__asunto')) === 'Confirmá tu cuenta en Red Nexa', 'correo de confirmación en la bandeja');
await clic('.demo-correo a.boton');
await b.esperar(300);
ok((await texto('h1')) === 'Listo, tu correo quedó confirmado', 'el enlace del correo confirma la cuenta');

// 2. Opinar.
await ir('/juan-perez/opinar?volver=%2Fjuan-perez');
await marcar('#calificacion-5');
await llenar('#Comentario', 'Muy bien');
await clic('form.formulario button[type=submit]');
ok((await texto('[data-valmsg-for="Comentario"]'))?.startsWith('Contá un poco más'), 'opinar: comentario corto pide más');
await llenar('#Comentario', 'Vino rápido y dejó todo funcionando. Muy recomendable.');
await clic('form.formulario button[type=submit]');
ok((await hash()).startsWith('#/juan-perez'), 'opinar: vuelve a la ficha');
ok((await texto('#opiniones .aviso')) === 'Listo, publicamos tu opinión. Gracias por contar cómo te fue.', 'opinar: aviso de publicada');
ok((await texto('.opiniones__cuenta'))?.startsWith('13 opiniones'), 'ficha: ahora son 13 opiniones');

// 3. Ofrecer un servicio y publicarlo.
await ir('/ofrecer');
await marcar('input[name=GranRubroId][value="' + (await b.evaluar(`document.querySelectorAll('input[name=GranRubroId]')[0].value`)) + '"]');
await llenar('#Descripcion', 'Paseo perros y cuido mascotas en Melo, con experiencia y mucha paciencia.');
ok((await b.evaluar(`document.querySelectorAll('.declaracion__lista li').length`)) === 10, 'ofrecer: la declaración del prestador a la vista');
await clic('form.formulario button[type=submit]');
ok((await texto('[data-valmsg-for="DeclaraPrestador"]')) === 'Marcá la casilla: para ofrecer servicios tenés que aceptar la declaración.', 'ofrecer: sin la declaración no sigue');
ok((await b.evaluar(`document.querySelector('#Descripcion').value`)).startsWith('Paseo perros'), 'ofrecer: sin la declaración conserva lo escrito');
await marcar('#DeclaraPrestador');
await clic('form.formulario button[type=submit]');
const servicioUrl = await hash();
ok(/#\/mi-perfil\/servicios\/\d+\/datos/.test(servicioUrl), 'ofrecer: crea el perfil y va al paso 2');
await llenar('#Titulo', 'Paseo y cuidado de perros');
await clic('button[value=continuar]');
ok((await hash()).endsWith('/donde'), 'paso 2 → paso 3');
await marcar('input[name=Modalidad][value=ADomicilio]');
await marcar('input[name=ZonaIds][value="2"]');
await llenar('#TelefonoContacto', '099 123 456');
await clic('button[value=continuar]');
ok((await hash()).endsWith('/categorias'), 'paso 3 → paso 4');
await b.evaluar(`(() => { const c = [...document.querySelectorAll('input[name=CategoriaIds]')].find((x) => x.dataset.nombre === 'Paseo de perros'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); })()`);
ok((await texto('[data-contador-categorias]')) === '1 de 3 usadas', 'categorías: contador en vivo');
await clic('.formulario__acciones button[value=continuar]');
ok((await hash()).endsWith('/revisar'), 'paso 4 → revisar');
ok((await texto('.aviso'))?.startsWith('Es tu primer servicio'), 'revisar: aviso de la prueba gratis');
await clicTexto('Publicar servicio');
ok((await hash()) === '#/mi-perfil/servicios', 'publicar: vuelve a Mis servicios');
ok((await texto('.aviso'))?.startsWith('Publicaste «Paseo y cuidado de perros». Tu perfil ya está activo'), 'publicar: aviso con la prueba');
await ir('/buscar?q=perros');
ok((await b.evaluar(`[...document.querySelectorAll('.resultado__nombre')].map((x) => x.textContent)`)).includes('Laura Techera'), 'búsqueda: aparece el servicio nuevo');
await ir('/laura-techera');
ok((await texto('h1')) === 'Paseo y cuidado de perros', 'ficha nueva: /laura-techera');

// 4. Juan paga noviembre con la pasarela de prueba.
await entrarComo('juan.perez@example.com');
await ir('/mi-perfil/suscripcion');
const pagar = await texto('.estado-cuota button');
if (pagar) {
    await clic('.estado-cuota button');
    ok((await hash()).startsWith('#/pasarela-de-prueba/'), 'pagar: va a la pasarela');
    await clic('button[value=aprobar]');
    ok((await texto('main > .cuenta-pagina .aviso, .cuenta-pagina__contenido > .aviso'))?.startsWith('Listo, recibimos tu pago'), 'pasarela: pago aprobado');
    ok((await texto('.estado-cuota__titulo'))?.startsWith('Tu perfil está al día hasta el'), 'suscripción: al día');
} else {
    console.log('(sin cuota para pagar hoy)');
}
await ir('/mi-perfil/opiniones');
ok((await b.evaluar(`document.querySelectorAll('.recibida').length`)) === 13, 'Juan ve 13 opiniones recibidas');
await b.evaluar(`document.querySelector('.recibida:first-child details').open = true`);
await llenar('.recibida:first-child textarea', '¡Gracias Laura!');
await b.evaluar(`document.querySelector('.recibida:first-child form button[type=submit]').click()`);
await b.esperar(350);
ok((await texto('.cuenta-pagina__contenido > .aviso'))?.startsWith('Listo, publicamos tu respuesta'), 'responder una opinión');

// 5. Filtro de palabras: la administración carga una palabra inventada y una opinión queda retenida.
await entrarComo('admin@example.com');
await ir('/admin/palabras');
await llenar('#Texto', 'pina');
await clic('.agregar-palabras__fila button');
ok((await texto('.admin__contenido > .aviso')) === 'Listo, agregamos 1 entrada a la lista.', 'palabras: agregar');
await entrarComo('maria.gonzalez@example.com');
await ir('/juan-perez/opinar');
await llenar('#Comentario', 'Vino puntual, resolvió el problema y además me regaló una pina.');
await clic('form.formulario button[type=submit]');
ok((await hash()).startsWith('#/juan-perez/opinar'), 'opinión con palabra prohibida: queda en la edición');
ok((await texto('.aviso--error span'))?.startsWith('Tu opinión no se publicó'), 'opinión retenida: aviso');
ok((await texto('.resaltado mark')) === 'pina', 'opinión retenida: palabra marcada');

// 6. Reportar la publicación de Juan y la administración lo desestima; modera la retenida.
await ir('/juan-perez/1/reportar');
await marcar('input[name=Motivo][value=DatosFalsos]');
await clic('form.formulario button[type=submit]');
ok((await texto('h1')) === 'Gracias. La administración va a revisarlo.', 'reporte enviado');
await entrarComo('admin@example.com');
await ir('/admin/revision?ver=reportadas');
ok((await b.evaluar(`document.querySelectorAll('.publicacion').length`)) === 1, 'revisión: 1 reportada');
await b.evaluar(`document.querySelector('.publicacion details.confirmar').open = true`);
await clicTexto('Desestimar los reportes');
ok((await texto('.admin__contenido > .aviso'))?.startsWith('Listo, desestimaste'), 'desestimar reportes');
await ir('/admin/resenas?ver=filtro');
await clic('.moderacion__item');
await clicTexto('Publicar igual');
ok((await texto('.admin__contenido > .aviso'))?.startsWith('Publicaste la opinión de María G.'), 'moderación: publicar igual');
await ir('/admin/registro');
ok((await b.evaluar(`document.querySelectorAll('.registro-admin__fila').length`)) >= 3, 'registro de actividad con filas');

// 7. Un CV nuevo.
await entrarComo('maria.gonzalez@example.com');
await ir('/mi-curriculum');
await llenar('#QueSabeHacer', 'Atención al público y manejo de caja.');
await llenar('#Cursos', '2024 Atención al cliente (INEFOP)');
await clic('.cv-propio__acciones button[type=submit]');
ok((await texto('[data-valmsg-for="MayorDeEdad"]')) === 'Marcá la casilla: el Curriculum es sólo para mayores de 18 años.', 'CV nuevo: sin declarar la edad no se publica');
await marcar('#MayorDeEdad');
await clic('.cv-propio__acciones button[type=submit]');
ok((await texto('.cuenta-pagina__contenido > .aviso')) === 'Listo, tu CV ya se ve en Curriculum.', 'CV publicado');
await ir('/mi-curriculum');
ok(!(await b.evaluar(`!!document.querySelector('#MayorDeEdad')`)), 'CV publicado: al editarlo no vuelve a pedir la edad');
await ir('/curriculum');
ok((await b.evaluar(`[...document.querySelectorAll('.cv-tarjeta__nombre')].map((x) => x.textContent.trim())`)).includes('María González'), 'CV en el listado, con el nombre completo');

// 8. Salir y volver a la página después de ingresar.
await b.evaluar(`document.querySelector('details.cuenta form button').click()`);
await b.esperar(300);

// RN-49: sin sesión, el CV se ve entero, con el teléfono y WhatsApp.
await ir('/curriculum/1');
ok((await texto('.ficha__titulo')) === 'Lucía Ramírez', 'CV sin sesión: nombre completo');
ok((await texto('.contacto__telefono')) === '099 100 001', 'CV sin sesión: teléfono');
ok(await b.evaluar(`!!document.querySelector('.contacto a[href^="https://wa.me/59899100001"]')`), 'CV sin sesión: WhatsApp');
await ir('/juan-perez');
await clicTexto('Escribir una opinión');
ok((await hash()).startsWith('#/ingresar?volver='), 'sin sesión, opinar pide ingresar');
await clic('[data-completar-ingreso="maria.gonzalez@example.com"]');
await clic('form.formulario button[type=submit]');
ok((await hash()).startsWith('#/juan-perez/opinar'), 'después de ingresar vuelve a opinar');

await b.captura(`${carpeta}/flujo-final.png`, false);
console.log('ERRORES JS:', b.errores.length ? '\n' + b.errores.join('\n') : 'ninguno');
console.log(fallas.length ? `${fallas.length} FALLAS` : 'TODO OK');
b.cerrar();
