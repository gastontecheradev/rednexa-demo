// ===================== La puerta de la demo: usuario y contraseña antes de ver el sitio =====================
// No es seguridad: sólo evita que cualquiera que reciba el enlace entre sin más. Se compara una huella
// (FNV-1a) para que la contraseña no quede escrita tal cual en el archivo.

const CLAVE_PUERTA = 'rednexa-demo-puerta';
const HUELLA_PUERTA = 'ee4c4e3a';
let puertaAbiertaEnMemoria = false;

function huella(textoHuella) {
    let h = 0x811c9dc5;
    for (const c of new TextEncoder().encode(textoHuella)) {
        h ^= c;
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16);
}

function puertaAbierta() {
    if (puertaAbiertaEnMemoria) return true;
    try {
        return localStorage.getItem(CLAVE_PUERTA) === HUELLA_PUERTA;
    } catch {
        return false;
    }
}

function abrirPuerta() {
    puertaAbiertaEnMemoria = true;
    try {
        localStorage.setItem(CLAVE_PUERTA, HUELLA_PUERTA);
    } catch {
        // Sin almacenamiento, queda abierta hasta que se recargue la página.
    }
}

function pintarPuerta(m = {}, errores = {}) {
    document.title = `Ingresar a la demo | ${SITIO.nombre}`;
    document.body.className = '';
    document.body.innerHTML = String(html`
    <header class="encabezado">
        <div class="encabezado__barra">
            <span class="logo"><picture class="logo__marca"><source media="(min-width: 700px)" srcset="${LOGO_26}" width="25" height="26" /><img src="${LOGO}" alt="" width="22" height="24" /></picture>${SITIO.nombre}</span>
        </div>
    </header>
    <main id="contenido" data-puerta>
        <div class="acceso">
            <section class="acceso__tarjeta acceso__tarjeta--angosta" aria-labelledby="puerta-titulo">
                <div class="acceso__titulos">
                    <h1 id="puerta-titulo" class="acceso__titulo">Demo de Red Nexa</h1>
                    <p class="acceso__bajada">Escribí el usuario y la contraseña que te pasamos para verla.</p>
                </div>
                <form class="formulario" novalidate data-puerta-formulario>
                    ${resumen(errores)}
                    <div class="campo">
                        <label class="campo__etiqueta" for="PuertaUsuario">Usuario</label>
                        <input class="control${conError(errores, 'PuertaUsuario')}" type="text" id="PuertaUsuario" name="PuertaUsuario" autocomplete="username" autocapitalize="none" spellcheck="false" value="${m.usuario ?? ''}" />
                        ${errorDe(errores, 'PuertaUsuario')}
                    </div>
                    <div class="campo">
                        <label class="campo__etiqueta" for="PuertaContrasena">Contraseña</label>
                        <div class="control-contrasena">
                            <input class="control${conError(errores, 'PuertaContrasena')}" type="password" id="PuertaContrasena" name="PuertaContrasena" autocomplete="current-password" />
                            <button type="button" class="control-contrasena__mostrar" data-mostrar="PuertaContrasena" aria-pressed="false" hidden>Mostrar</button>
                        </div>
                        ${errorDe(errores, 'PuertaContrasena')}
                    </div>
                    <button type="submit" class="boton boton--primario boton--ancho">Ver la demo</button>
                </form>
            </section>
        </div>
    </main>`);
    mejorar();
    const foco = errores.PuertaContrasena || errores[''] ? 'PuertaContrasena' : 'PuertaUsuario';
    document.getElementById(foco)?.focus();
    document.querySelector('[data-puerta-formulario]').addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('PuertaUsuario').value.trim();
        const contrasena = document.getElementById('PuertaContrasena').value;
        const faltan = {};
        if (!usuario) faltan.PuertaUsuario = 'Escribí el usuario.';
        if (!contrasena) faltan.PuertaContrasena = 'Escribí la contraseña.';
        if (Object.keys(faltan).length) {
            pintarPuerta({ usuario }, faltan);
            return;
        }
        if (huella(`${usuario.toLowerCase()}:${contrasena}`) !== HUELLA_PUERTA) {
            pintarPuerta({ usuario }, { '': 'El usuario o la contraseña no coinciden. Revisalos y probá de nuevo.' });
            return;
        }
        abrirPuerta();
        navegando = true;
        dibujar();
    });
}
