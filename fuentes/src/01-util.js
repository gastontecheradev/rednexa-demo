// ===================== Utilidades: plantillas, fechas y formatos (DisplayFormat) =====================

class Crudo {
    constructor(s) { this.s = s; }
    toString() { return this.s; }
}
const crudo = (s) => new Crudo(s);

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function valor(v) {
    if (v === null || v === undefined || v === false) return '';
    if (v instanceof Crudo) return v.s;
    if (Array.isArray(v)) return v.map(valor).join('');
    return esc(String(v));
}

// Plantilla con escape automático: lo que no viene marcado como crudo se codifica, como Razor.
function html(partes, ...valores) {
    let salida = partes[0];
    for (let i = 0; i < valores.length; i++) {
        salida += valor(valores[i]) + partes[i + 1];
    }
    return new Crudo(salida);
}

// Un atributo que sólo aparece si tiene valor (Razor omite los null).
function attr(nombre, v) {
    return v === null || v === undefined || v === false ? crudo('') : crudo(` ${nombre}="${esc(v)}"`);
}

function bool(nombre, v) {
    return v ? crudo(` ${nombre}`) : crudo('');
}

// ---------- Fechas de Uruguay (UTC-3, sin horario de verano) ----------

const DIA = 86400000;
const OFFSET_UY = 3 * 3600000;

const ahora = () => Date.now() + (window.__desfaseDemo || 0);

// Un día calendario como 'AAAA-MM-DD'.
function diaUy(ms) {
    return new Date(ms - OFFSET_UY).toISOString().slice(0, 10);
}

function partesDia(dia) {
    const [y, m, d] = dia.split('-').map(Number);
    return { y, m, d };
}

function dia(y, m, d) {
    const f = new Date(Date.UTC(y, m - 1, d));
    return f.toISOString().slice(0, 10);
}

function sumarDias(diaTexto, n) {
    const { y, m, d } = partesDia(diaTexto);
    return dia(y, m, d + n);
}

function sumarMeses(diaTexto, n) {
    const { y, m, d } = partesDia(diaTexto);
    return dia(y, m + n, d);
}

function primerDia(diaTexto) {
    const { y, m } = partesDia(diaTexto);
    return dia(y, m, 1);
}

function ultimoDia(diaTexto) {
    return sumarDias(sumarMeses(primerDia(diaTexto), 1), -1);
}

function periodoActual(ms = ahora()) {
    return primerDia(diaUy(ms));
}

// El comienzo de un día de Uruguay, en UTC.
function inicioDiaUtc(diaTexto) {
    return Date.parse(diaTexto + 'T00:00:00Z') + OFFSET_UY;
}

function diasEntre(desdeMs, hastaMs) {
    return Math.round((Date.parse(diaUy(hastaMs)) - Date.parse(diaUy(desdeMs))) / DIA);
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// ---------- DisplayFormat ----------

function redondear(valor, decimales) {
    const f = Math.pow(10, decimales);
    return Math.sign(valor) * Math.round(Math.abs(valor) * f + 1e-9) / f;
}

const F = {
    rating(promedio) {
        return redondear(promedio, 1).toFixed(1).replace('.', ',');
    },
    estrellasLlenas(promedio) {
        return Math.max(0, Math.min(5, Math.ceil(redondear(promedio, 1) - 0.5)));
    },
    money(importe) {
        const entero = Math.trunc(importe);
        const miles = Math.abs(entero).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const signo = importe < 0 ? '-' : '';
        if (importe % 1 === 0) return `$ ${signo}${miles}`;
        const dec = Math.round(Math.abs(importe % 1) * 100).toString().padStart(2, '0');
        return `$ ${signo}${miles},${dec}`;
    },
    percent(v) {
        return String(redondear(v, 2)).replace('.', ',') + ' %';
    },
    opiniones(n) {
        return n === 1 ? '1 opinión' : `${n} opiniones`;
    },
    hace(fechaMs, ahoraMs = ahora()) {
        const d = diasEntre(fechaMs, ahoraMs);
        if (d <= 0) return 'Hoy';
        if (d === 1) return 'Ayer';
        if (d < 7) return `Hace ${d} días`;
        if (d < 14) return 'Hace 1 semana';
        if (d < 30) return `Hace ${Math.floor(d / 7)} semanas`;
        if (d < 60) return 'Hace 1 mes';
        if (d < 365) return `Hace ${Math.floor(d / 30)} meses`;
        if (d < 730) return 'Hace 1 año';
        return `Hace ${Math.floor(d / 365)} años`;
    },
    // "26 de setiembre", con el año si no es el actual. Acepta milisegundos o un día 'AAAA-MM-DD'.
    fechaLarga(f, ahoraMs = ahora()) {
        const texto = typeof f === 'number' ? diaUy(f) : f;
        const { y, m, d } = partesDia(texto);
        const base = `${d} de ${MESES[m - 1]}`;
        return y === partesDia(diaUy(ahoraMs)).y ? base : `${base} de ${y}`;
    },
    fechaCorta(ms) {
        const { y, m, d } = partesDia(diaUy(ms));
        return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    },
    mes(diaTexto, ahoraMs = ahora()) {
        const { y, m } = partesDia(diaTexto);
        return y === partesDia(diaUy(ahoraMs)).y ? MESES[m - 1] : `${MESES[m - 1]} de ${y}`;
    },
    lista(partes) {
        const l = [...partes];
        return l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} y ${l.at(-1)}`;
    },
    modalidad(m) {
        return F.lista([[MOD.EnLocal, 'en local'], [MOD.ADomicilio, 'a domicilio'], [MOD.Remoto, 'remoto']]
            .filter(([v]) => m & v).map(([, n]) => n));
    },
    iniciales(nombre) {
        return nombre.split(' ').filter((p) => p && /\p{L}/u.test(p[0])).slice(0, 2).map((p) => p[0].toLocaleUpperCase('es-UY')).join('');
    },
    capitalizar(t) {
        return t ? t[0].toUpperCase() + t.slice(1) : t;
    },
    hora(ms) {
        const f = new Date(ms - OFFSET_UY);
        const dd = String(f.getUTCDate()).padStart(2, '0');
        const mm = String(f.getUTCMonth() + 1).padStart(2, '0');
        return `${dd}/${mm} ${String(f.getUTCHours()).padStart(2, '0')}:${String(f.getUTCMinutes()).padStart(2, '0')}`;
    }
};

const MOD = { Ninguna: 0, EnLocal: 1, ADomicilio: 2, Remoto: 4 };
const OPORT = { EmpleoFijo: 1, TrabajosPuntuales: 2, PorHoras: 4 };

// "Médico/a" → "medico"; la ñ pasa a n (SlugHelper).
function slug(texto) {
    return texto.replace(/\/(a|as)\b/g, '')
        .toLowerCase()
        .normalize('NFD').replace(/\p{Mn}/gu, '').normalize('NFC')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const sinTildes = (t) => (t || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

// Teléfonos de Uruguay (TelefonoUruguay).
const Tel = {
    normalizar(texto) {
        if (!texto || !texto.trim()) return null;
        let d = texto.replace(/[^0-9]/g, '');
        if (d.startsWith('598') && d.length === 11) d = d.slice(3);
        else if (d.length === 9 && d.startsWith('0')) d = d.slice(1);
        return d.length === 8 && '924'.includes(d[0]) ? '598' + d : null;
    },
    esCelular(n) {
        return n.length === 11 && n[3] === '9';
    },
    formato(n) {
        const nac = n.startsWith('598') ? n.slice(3) : n;
        if (nac.length !== 8) return n;
        return nac[0] === '9' ? `0${nac.slice(0, 2)} ${nac.slice(2, 5)} ${nac.slice(5)}` : `${nac.slice(0, 4)} ${nac.slice(4)}`;
    },
    whatsapp(telefono, mensaje) {
        const n = Tel.normalizar(telefono);
        return n && Tel.esCelular(n) ? `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}` : null;
    }
};

const mensajeWhatsApp = (titulo) => `Hola, llegué a tu servicio «${titulo}» a través de la plataforma Red Nexa. Quería hacerte una consulta.`;
const MENSAJE_CV = 'Hola, vi tu CV en la plataforma Red Nexa. Quería hacerte una consulta.';

const nombreConInicial = (nombre, apellido) => {
    const a = (apellido || '').trim();
    return a.length > 0 ? `${nombre.trim()} ${a[0].toLocaleUpperCase('es-UY')}.` : nombre.trim();
};

const correoValido = (c) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((c || '').trim());

// Iconos de trazo (_Icono.cshtml).
const ICONOS = {
    menu: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>',
    cerrar: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>',
    buscar: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>',
    siguiente: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6" /></svg>',
    arriba: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m18 15-6-6-6 6" /></svg>',
    abajo: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg>',
    desplegar: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg>',
    volver: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6" /></svg>',
    mas: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14" /><path d="M12 5v14" /></svg>',
    tilde: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5" /></svg>',
    alerta: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>',
    correo: '<svg class="icono icono--grande" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>',
    reloj: '<svg class="icono icono--grande" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>',
    hecho: '<svg class="icono icono--grande" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>',
    lugar: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>',
    candado: '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>'
};
const icono = (n) => crudo(ICONOS[n] || '');

const estrellas = (llenas) => html`${'★'.repeat(llenas)}<span class="estrellas__vacias">${'★'.repeat(5 - llenas)}</span>`;

// ---------- Formularios: errores como los deja ModelState ----------

// errores: { Campo: 'mensaje', '': ['mensaje', ...] }
function resumen(errores, clase = 'formulario__resumen') {
    const generales = errores && errores[''] ? [].concat(errores['']) : [];
    if (generales.length === 0) {
        return html`<div class="${clase} validation-summary-valid" role="alert" data-valmsg-summary="true"><ul><li style="display:none"></li></ul></div>`;
    }
    return html`<div class="${clase} validation-summary-errors" role="alert" data-valmsg-summary="true"><ul>${generales.map((m) => html`<li>${m}</li>`)}</ul></div>`;
}

function errorDe(errores, campo, extra = {}) {
    const m = errores && errores[campo];
    const id = extra.id ? attr('id', extra.id) : '';
    const datos = extra.datos || '';
    return m
        ? html`<span class="campo__error field-validation-error"${id} data-valmsg-for="${campo}" data-valmsg-replace="true"${crudo(datos)}>${m}</span>`
        : html`<span class="campo__error field-validation-valid"${id} data-valmsg-for="${campo}" data-valmsg-replace="true"${crudo(datos)}></span>`;
}

const conError = (errores, campo) => (errores && errores[campo] ? ' input-validation-error' : '');
const invalido = (errores, campo) => (errores && errores[campo] ? attr('aria-invalid', 'true') : crudo(''));

function leerFormulario(form, submitter) {
    const datos = {};
    const fd = new FormData(form);
    if (submitter && submitter.name) {
        fd.append(submitter.name, submitter.value);
    }
    for (const [k, v] of fd.entries()) {
        if (v instanceof File) {
            (datos[k] ||= []).push(v);
            continue;
        }
        if (k in datos) {
            datos[k] = [].concat(datos[k], v);
        } else {
            datos[k] = v;
        }
    }
    return datos;
}

const lista = (v) => (v === undefined || v === null ? [] : [].concat(v));
const texto = (v) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null);
const entero = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
};
