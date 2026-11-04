// ===================== Mi suscripción (V06), destacados (CU-11) y pasarela de prueba =====================

function datosSuscripcion(perfil) {
    const s = suscripcionDe(perfil.id);
    if (!s) return null;
    const t = tarifasVigentes();
    const tarifa = tarifaDelPerfil(perfil.id, s.tarifa);
    const contratado = s.monto > 0 && s.tarifa === tarifa;
    const hoy = diaUy(ahora());
    const puedePagar = ['Activo', 'Vencido'].includes(perfil.estado) && s.estado !== 'Cancelada';
    return {
        s, tarifa, hoy,
        cuotaMensual: contratado && s.periodicidad === 'Mensual' ? s.monto : cuotaMensual(t, tarifa),
        cuotaAnual: contratado && s.periodicidad === 'Anual' ? s.monto : cuotaAnual(cuotaMensual(t, tarifa), t.desc),
        descuento: t.desc,
        etapa: perfil.estado === 'Vencido' ? 'Vencido' : etapa(s.cubiertoHasta, hoy),
        mesAPagar: puedePagar ? mesAPagar(s.cubiertoHasta, hoy) : null
    };
}

function misDestacados(perfil, d) {
    const t = tarifasVigentes();
    const mes = periodoActual();
    const siguiente = sumarMeses(mes, 1);
    const inicioMes = inicioDiaUtc(mes);
    const inicioSig = inicioDiaUtc(siguiente);
    const propios = db.destacados.filter((x) => x.perfilId === perfil.id && (x.periodo === mes || x.periodo === siguiente)
        && (x.estado === 'Vigente' || x.estado === 'PendientePago' && (x.periodo === mes && x.alta < inicioMes || x.periodo === siguiente && x.alta < inicioSig)))
        .sort((a, b) => a.periodo.localeCompare(b.periodo) || a.alta - b.alta || a.id - b.id)
        .map((x) => ({ servicio: servicioDe(x.servicioId).titulo, categoria: categoriaDe(x.categoriaId).nombre, periodo: x.periodo, estado: x.estado }));
    let renovacion = null;
    if (perfil.estado === 'Activo') {
        const r = renovables(perfil);
        if (r) {
            const cubierta = cuotaCubiertaEn(d.s.cubiertoHasta, r.mes);
            renovacion = { mes: r.mes, cantidad: r.items.length, monto: totalDestacados(t, d.tarifa, r.items.length, cubierta), cubierta };
        }
    }
    let opciones = [];
    if (perfil.estado === 'Activo') {
        opciones = publicadosDe(perfil.id).flatMap((s) => s.categoriaIds.map(categoriaDe).filter((c) => c.activa).map((c) => ({ s, c })))
            .filter(({ s, c }) => !db.destacados.some((x) => x.servicioId === s.id && x.categoriaId === c.id && x.periodo === mes && (x.estado !== 'PendientePago' || x.alta < inicioMes)))
            .sort((a, b) => a.s.titulo.localeCompare(b.s.titulo, 'es') || a.c.nombre.localeCompare(b.c.nombre, 'es'))
            .map(({ s, c }) => ({ servicioId: s.id, categoriaId: c.id, servicio: s.titulo, categoria: c.nombre, hayLugar: ocupados(c.id, mes) < t.cupo }));
    }
    const cubiertaEsteMes = cuotaCubiertaEn(d.s.cubiertoHasta, mes);
    return { propios, renovacion, opciones, importe: t.dest, precioNuevo: precioDestacado(t, d.tarifa, cubiertaEsteMes), cubierta: cubiertaEsteMes, cupo: t.cupo, mes };
}

function pSuscripcion(ctx) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    if (!perfil) return { redirect: '/ofrecer' };
    const pagoId = entero(ctx.query.get('pago'));
    if (ctx.query.get('adhesion') === '1') {
        const s = suscripcionDe(perfil.id);
        if (s && s.adhesion === 'Autorizada' && s.formaPago === 'DebitoAutomatico') return { redirect: '/mi-perfil/suscripcion', aviso: 'Listo, el débito automático quedó autorizado. Mercado Pago cobra cada cuota el día 1.' };
        return { redirect: '/mi-perfil/suscripcion', alerta: 'El débito automático no quedó autorizado en Mercado Pago.' };
    }
    const d = datosSuscripcion(perfil);
    const bloqueado = perfil.estado === 'Bloqueado';
    const mes = (x) => F.mes(x);
    const fecha = (x) => F.fechaLarga(x);
    let cuerpo;
    if (!d) {
        cuerpo = html`<h1 class="titulo-cuenta">Mi suscripción</h1>
        <div class="estado-cuota estado-cuota--aviso">
            <div class="estado-cuota__textos">
                <p class="estado-cuota__titulo">Tu prueba gratis empieza cuando publiques tu primer servicio</p>
                <p>Son ${DIAS_PRUEBA} días sin pagar, que se estiran hasta fin de ese mes para que la primera cuota caiga del 1 al 10.</p>
            </div>
            <a class="boton boton--primario" href="/mi-perfil/servicios">Ir a Mis servicios</a>
        </div>`;
        return paginaCuenta(ctx, 'Mi suscripción', '/mi-perfil/suscripcion', cuerpo);
    }
    const s = d.s;
    const conDebito = s.formaPago === 'DebitoAutomatico' && s.adhesion === 'Autorizada';
    const proximoMes = d.mesAPagar ?? sumarMeses(primerDia(s.cubiertoHasta), 1);
    const actual = primerDia(d.hoy);
    let estado;
    if (bloqueado) estado = ['La administración bloqueó tu perfil', `No se ve en el sitio y por ahora no se puede pagar. Si creés que es un error, escribinos a ${SITIO.correo}.`, 'estado-cuota--error'];
    else if (d.etapa === 'Vencido') estado = [`Tu perfil no se ve: la cuota de ${mes(d.mesAPagar ?? actual)} no se pagó`, `Tus datos, servicios y opiniones siguen guardados. Pagá ${mes(d.mesAPagar ?? actual)} y vuelve a verse enseguida.`, 'estado-cuota--error'];
    else if (d.etapa === 'PorPagar' || d.etapa === 'UltimosDias') estado = [`Tu cuota de ${mes(actual)} vence el ${fecha(sumarDias(actual, 9))}`,
        conDebito ? 'Mercado Pago todavía no pudo cobrarla con el débito automático y lo vuelve a intentar. Si preferís, pagala ahora: si el 11 no está paga, el perfil deja de verse.'
            : 'Hasta entonces tu perfil se sigue viendo. Si el 11 no está paga, deja de verse, pero no se borra nada.', 'estado-cuota--aviso'];
    else if (s.esPrueba) estado = [`Tu prueba gratis termina el ${fecha(s.cubiertoHasta)}`,
        conDebito ? `La primera cuota la cobra Mercado Pago con el débito automático, el 1 de ${mes(proximoMes)}.`
            : `La primera cuota se paga del 1 al 10 de ${mes(proximoMes)}. Si el 11 no está paga, el perfil deja de verse.`, 'estado-cuota--aviso'];
    else estado = [`Tu perfil está al día hasta el ${fecha(s.cubiertoHasta)}`,
        conDebito ? `La próxima cuota la cobra Mercado Pago con el débito automático, el 1 de ${mes(proximoMes)}.` : `La próxima cuota se paga del 1 al 10 de ${mes(proximoMes)}.`, 'estado-cuota--ok'];

    const botonPagar = d.mesAPagar && !(conDebito && d.etapa === 'AlDia') ? `Pagar ${mes(d.mesAPagar)}` : null;
    const pagos = db.pagos.filter((p) => db.suscripciones.some((x) => x.id === p.suscripcionId && x.perfilId === perfil.id)).sort((a, b) => b.fecha - a.fecha || b.id - a.id);
    const consultado = pagoId ? pagos.find((p) => p.id === pagoId) : null;
    let resultadoPago = null;
    if (consultado) {
        if (consultado.estado === 'Aprobado' && consultado.concepto === 'Destacado') resultadoPago = [`Listo, recibimos tu pago. Tu servicio aparece destacado hasta el ${fecha(ultimoDia(consultado.periodo))}.`, 'aviso'];
        else if (consultado.estado === 'Aprobado') resultadoPago = [`Listo, recibimos tu pago. Tu perfil está al día hasta el ${fecha(s.cubiertoHasta)}.`, 'aviso'];
        else if (consultado.estado === 'Rechazado') resultadoPago = ['El pago no se aprobó y no se cobró nada. Podés probar de nuevo.', 'aviso aviso--error'];
        else resultadoPago = ['Tu pago todavía no se confirmó. Cuando se apruebe, te avisamos por correo.', 'aviso aviso--alerta'];
    }
    const dest = misDestacados(perfil, d);
    const verDestacado = !bloqueado && (dest.propios.length > 0 || dest.renovacion || dest.opciones.length > 0);
    const lugar = (x) => `«${x.servicio}» en ${x.categoria}`;
    let textoDestacado;
    {
        const vigentes = dest.propios.filter((x) => x.periodo === dest.mes && x.estado === 'Vigente');
        const reservados = dest.propios.filter((x) => x.periodo === dest.mes && x.estado === 'PendientePago');
        const sig = sumarMeses(dest.mes, 1);
        if (vigentes.length) {
            const hasta = fecha(ultimoDia(dest.mes));
            const base = vigentes.length === 1 ? `Tu servicio «${vigentes[0].servicio}» aparece destacado en ${vigentes[0].categoria} hasta el ${hasta}.`
                : `Tus servicios aparecen destacados hasta el ${hasta}: ${F.lista(vigentes.map(lugar))}.`;
            textoDestacado = dest.renovacion && dest.renovacion.mes === sig ? `${base} Tu lugar queda reservado si pagás ${mes(sig)} del 1 al 10.`
                : dest.propios.some((x) => x.periodo === sig && x.estado === 'Vigente') ? `${base} El destacado de ${mes(sig)} ya está pago.` : base;
        } else if (reservados.length) {
            const lugares = F.lista(reservados.map(lugar));
            textoDestacado = dest.renovacion ? `Tu lugar está reservado: ${lugares}. Pagá ${mes(dest.mes)} hasta el 10 para seguir destacado; si no, el 11 se libera.`
                : `Tu lugar estaba reservado: ${lugares}. Para renovarlo, tu perfil tiene que estar activo.`;
        } else {
            textoDestacado = `Tu servicio aparece primero en los resultados de la categoría que elijas y en la portada. Hay ${dest.cupo} lugares por categoría y dura hasta fin de mes.`;
        }
    }
    const hayLugar = dest.opciones.some((o) => o.hayLugar);
    const concepto = (p) => (p.concepto === 'CuotaAnual' ? `Cuota anual desde ${mes(p.periodo)}` : p.concepto === 'Destacado' ? `Destacado de ${mes(p.periodo)}` : `Cuota de ${mes(p.periodo)}`);
    const estadoPago = (e) => (e === 'Aprobado' ? ['Aprobado', 'historial__estado--ok'] : e === 'Rechazado' ? ['Rechazado', 'historial__estado--error'] : ['Pendiente', 'historial__estado--aviso']);
    const tarifaNombre = d.tarifa === 'Profesionales' ? 'Profesionales' : 'Servicios';
    const estadoDebito = s.adhesion === 'Autorizada' && conDebito ? 'El débito automático está autorizado en Mercado Pago.'
        : s.adhesion === 'Pendiente' ? 'Todavía no autorizaste el débito automático en Mercado Pago. Hasta que lo hagas, la cuota se paga a mano: guardá el plan para volver a autorizarlo.' : null;

    cuerpo = html`
    <h1 class="titulo-cuenta">Mi suscripción</h1>
    ${resultadoPago ? html`<p class="${resultadoPago[1]}" role="status">${resultadoPago[0]}</p>` : ''}
    <form class="suscripcion" method="post" action="/mi-perfil/suscripcion" novalidate data-envio-unico>
        <div class="estado-cuota ${estado[2]}">
            <div class="estado-cuota__textos">
                <p class="estado-cuota__titulo">${estado[0]}</p>
                <p>${estado[1]}</p>
            </div>
            ${botonPagar && !bloqueado ? html`<button type="submit" class="boton boton--primario" name="Accion" value="pagar">${botonPagar}</button>` : ''}
        </div>
        ${bloqueado ? '' : html`
        <fieldset class="suscripcion__grupo">
            <legend class="suscripcion__titulo">Plan</legend>
            <div class="opciones-rubro">
                <label class="opcion-rubro">
                    <input class="opcion-rubro__radio" type="radio" name="Periodicidad" value="Mensual"${bool('checked', s.periodicidad === 'Mensual')} />
                    <span class="opcion-rubro__etiqueta">${tarifaNombre}, mensual</span>
                    <span class="opcion-rubro__titulo suscripcion__precio">${F.money(d.cuotaMensual)} <span>por mes</span></span>
                    <span class="opcion-rubro__texto">Se paga del 1 al 10 de cada mes.</span>
                </label>
                <label class="opcion-rubro">
                    <input class="opcion-rubro__radio" type="radio" name="Periodicidad" value="Anual"${bool('checked', s.periodicidad === 'Anual')} />
                    <span class="opcion-rubro__etiqueta">${tarifaNombre}, anual con ${F.percent(d.descuento)} menos</span>
                    <span class="opcion-rubro__titulo suscripcion__precio">${F.money(d.cuotaAnual)} <span>por año</span></span>
                    <span class="opcion-rubro__texto">Cubre ${mes(proximoMes)} y los once meses siguientes.</span>
                </label>
            </div>
        </fieldset>
        ${verDestacado ? html`<section class="destacado-tarjeta" aria-labelledby="destacado-titulo">
            <div class="destacado-tarjeta__textos">
                <div class="destacado-tarjeta__encabezado">
                    <span class="insignia-destacado">Destacado</span>
                    <h2 class="destacado-tarjeta__titulo" id="destacado-titulo">${F.money(dest.importe)} por mes, cuota incluida</h2>
                </div>
                <p>${textoDestacado}</p>
                ${dest.renovacion ? html`<p class="destacado-tarjeta__importe">Son ${F.money(dest.renovacion.monto)}${dest.renovacion.cantidad > 1 ? ` por los ${dest.renovacion.cantidad}` : ''}, ${dest.renovacion.cubierta ? `porque la cuota de ${mes(dest.renovacion.mes)} ya está cubierta` : `con la cuota de ${mes(dest.renovacion.mes)} incluida`}.</p>` : ''}
            </div>
            ${dest.renovacion ? html`<button type="submit" class="boton boton--secundario destacado-tarjeta__boton" name="Accion" value="renovar">Renovar para ${mes(dest.renovacion.mes)}</button>` : ''}
            ${dest.opciones.length ? html`<div class="destacado-tarjeta__nuevo">
                <div class="campo">
                    <label class="campo__etiqueta" for="Destacado">${dest.propios.length ? 'Destacar otro servicio o categoría' : 'Qué querés destacar'}</label>
                    <select class="control" id="Destacado" name="Destacado" aria-describedby="destacado-importe">
                        ${dest.opciones.map((o) => html`<option value="${o.servicioId}-${o.categoriaId}"${bool('disabled', !o.hayLugar)}>${o.servicio} · ${o.categoria}${o.hayLugar ? '' : ' (sin lugar este mes)'}</option>`)}
                    </select>
                </div>
                ${hayLugar ? html`<p class="destacado-tarjeta__importe" id="destacado-importe">Este mes son ${F.money(dest.precioNuevo)}, ${dest.cubierta ? 'porque tu cuota ya está cubierta' : 'con la cuota incluida'}. Vale hasta el ${fecha(ultimoDia(dest.mes))}.</p>
                    <button type="submit" class="boton boton--secundario destacado-tarjeta__boton" name="Accion" value="destacar">Destacar</button>`
                    : html`<p class="destacado-tarjeta__importe" id="destacado-importe">Por ahora no hay lugares destacados en tus categorías. Se liberan el 1 de cada mes.</p>`}
            </div>` : ''}
        </section>` : ''}
        <fieldset class="suscripcion__grupo">
            <legend class="suscripcion__titulo">Forma de pago</legend>
            <div class="opciones-rubro opciones-rubro--compactas">
                <label class="opcion-rubro">
                    <input class="opcion-rubro__radio" type="radio" name="FormaPago" value="DebitoAutomatico"${bool('checked', s.formaPago === 'DebitoAutomatico')} />
                    <span class="opcion-rubro__titulo">Débito automático</span>
                    <span class="opcion-rubro__texto">Mercado Pago cobra el día 1 y reintenta si falla. Podés darlo de baja cuando quieras.</span>
                </label>
                <label class="opcion-rubro">
                    <input class="opcion-rubro__radio" type="radio" name="FormaPago" value="PagoManual"${bool('checked', s.formaPago === 'PagoManual')} />
                    <span class="opcion-rubro__titulo">Pago manual</span>
                    <span class="opcion-rubro__texto">Te mandamos un enlace el día 1 y pagás hasta el 10.</span>
                </label>
            </div>
            ${estadoDebito ? html`<p class="suscripcion__nota" role="status">${estadoDebito}</p>` : ''}
            <p class="suscripcion__nota">Pagos con Mercado Pago. No hay devoluciones, tampoco del pago anual ni del destacado.</p>
            <p class="nota-desarrollo">En la demo, «Pagar» y el débito automático van a una pasarela de prueba: no se cobra nada.</p>
        </fieldset>
        <div class="suscripcion__acciones">
            <button type="submit" class="boton boton--secundario" name="Accion" value="guardar">Guardar el plan</button>
            <p class="suscripcion__ayuda">El plan y la forma de pago valen desde el próximo pago. El débito automático se autoriza en Mercado Pago.</p>
        </div>`}
    </form>
    <section class="suscripcion__grupo" aria-labelledby="historial-titulo">
        <h2 class="suscripcion__titulo" id="historial-titulo">Historial</h2>
        <ul class="historial">
            ${pagos.map((p) => {
                const [t, c] = estadoPago(p.estado);
                return html`<li class="historial__fila">
                    <span class="historial__concepto">${concepto(p)}</span>
                    <span class="historial__monto">${F.money(p.monto)}</span>
                    <span class="historial__fecha">${F.fechaCorta(p.fecha)}</span>
                    <span class="historial__estado ${c}">${t}</span>
                </li>`;
            })}
            <li class="historial__fila">
                <span class="historial__concepto">Primer servicio publicado e inicio de la prueba</span>
                <span class="historial__monto">${F.money(0)}</span>
                <span class="historial__fecha">${F.fechaCorta(s.inicio)}</span>
                <span class="historial__estado historial__estado--ok">Prueba</span>
            </li>
        </ul>
    </section>`;
    return paginaCuenta(ctx, 'Mi suscripción', '/mi-perfil/suscripcion', cuerpo);
}

function nuevoPago(s, concepto, periodo, monto) {
    const p = { id: nuevoId('pagos'), suscripcionId: s.id, concepto, periodo, monto, fecha: ahora(), estado: 'Pendiente', tx: null };
    db.pagos.push(p);
    return p;
}

function postSuscripcion(ctx, d) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    if (!perfil) return { redirect: '/ofrecer' };
    const datos = datosSuscripcion(perfil);
    if (!datos || perfil.estado === 'Bloqueado') return { redirect: '/mi-perfil/suscripcion', aviso: 'Por ahora no se puede cambiar el plan de este perfil.' };
    const s = datos.s;
    const accion = d.Accion || 'guardar';

    if (accion === 'destacar' || accion === 'renovar') {
        const dest = misDestacados(perfil, datos);
        const t = tarifasVigentes();
        if (accion === 'renovar') {
            const r = renovables(perfil);
            if (!r || perfil.estado !== 'Activo') return { redirect: '/mi-perfil/suscripcion', aviso: 'No hay destacados para renovar.' };
            const monto = totalDestacados(t, datos.tarifa, r.items.length, cuotaCubiertaEn(s.cubiertoHasta, r.mes));
            const pago = nuevoPago(s, 'Destacado', r.mes, monto);
            for (const it of r.items) {
                if (it.fila) it.fila.pagoId = pago.id;
                else db.destacados.push({ id: nuevoId('destacados'), perfilId: perfil.id, servicioId: it.origen.servicioId, categoriaId: it.origen.categoriaId, periodo: r.mes, estado: 'PendientePago', pagoId: pago.id, alta: it.origen.alta });
            }
            return { redirect: `/pasarela-de-prueba/${pago.id}` };
        }
        const [sid, cid] = (d.Destacado || '').split('-').map(entero);
        const opcion = dest.opciones.find((o) => o.servicioId === sid && o.categoriaId === cid);
        if (!sid || !cid) return { redirect: '/mi-perfil/suscripcion', alerta: 'Elegí el servicio y la categoría que querés destacar.' };
        if (!opcion) return { redirect: '/mi-perfil/suscripcion', alerta: 'Por ahora no se puede destacar este servicio. Tu perfil tiene que estar activo y el servicio, publicado.' };
        if (!opcion.hayLugar) return { redirect: '/mi-perfil/suscripcion', alerta: `Por ahora no hay lugares destacados en ${opcion.categoria}.` };
        const pago = nuevoPago(s, 'Destacado', dest.mes, dest.precioNuevo);
        db.destacados.push({ id: nuevoId('destacados'), perfilId: perfil.id, servicioId: sid, categoriaId: cid, periodo: dest.mes, estado: 'PendientePago', pagoId: pago.id, alta: ahora() });
        return { redirect: `/pasarela-de-prueba/${pago.id}` };
    }

    // El plan y la forma de pago valen desde el próximo pago (RN-32, RN-36).
    const periodicidad = d.Periodicidad === 'Anual' ? 'Anual' : 'Mensual';
    const forma = d.FormaPago === 'DebitoAutomatico' ? 'DebitoAutomatico' : 'PagoManual';
    const cambioForma = forma !== s.formaPago || periodicidad !== s.periodicidad;
    s.periodicidad = periodicidad;
    s.formaPago = forma;
    if (forma === 'PagoManual') s.adhesion = null;
    if (accion === 'pagar') {
        const mesPago = datos.mesAPagar;
        if (!mesPago) return { redirect: '/mi-perfil/suscripcion', aviso: 'Por ahora no hay nada que pagar: tu perfil ya está cubierto.' };
        const monto = periodicidad === 'Anual' ? datos.cuotaAnual : datos.cuotaMensual;
        const pago = nuevoPago(s, periodicidad === 'Anual' ? 'CuotaAnual' : 'CuotaMensual', mesPago, monto);
        return { redirect: `/pasarela-de-prueba/${pago.id}` };
    }
    if (forma === 'DebitoAutomatico' && (s.adhesion !== 'Autorizada' || cambioForma)) {
        s.adhesion = 'Pendiente';
        return { redirect: '/pasarela-de-prueba/debito' };
    }
    return { redirect: '/mi-perfil/suscripcion', aviso: 'Listo, guardamos el plan y la forma de pago. Valen desde el próximo pago.' };
}

function descripcionCobro(p) {
    const mes = F.mes(p.periodo);
    return p.concepto === 'CuotaAnual' ? `Red Nexa: cuota anual desde ${mes}` : p.concepto === 'Destacado' ? `Red Nexa: destacado de ${mes}` : `Red Nexa: cuota de ${mes}`;
}

function pagoPropio(ctx, id) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    const p = db.pagos.find((x) => x.id === id);
    return perfil && p && db.suscripciones.some((s) => s.id === p.suscripcionId && s.perfilId === perfil.id) ? p : null;
}

function pPasarela(ctx, id) {
    const p = pagoPropio(ctx, id);
    if (!p || p.estado !== 'Pendiente') return { redirect: `/mi-perfil/suscripcion?pago=${id}` };
    const cuerpo = html`
    <div class="acceso">
        <section class="acceso__tarjeta acceso__tarjeta--angosta" aria-labelledby="pasarela-titulo">
            <p class="nota-desarrollo">Pasarela de prueba: no se cobra nada. Con Mercado Pago, acá va su página de pago.</p>
            <div class="acceso__titulos">
                <h1 id="pasarela-titulo" class="acceso__titulo">${F.money(p.monto)}</h1>
                <p class="acceso__bajada">${descripcionCobro(p)}</p>
            </div>
            <form class="formulario" method="post" action="/pasarela-de-prueba/${p.id}" data-envio-unico>
                <button type="submit" class="boton boton--primario boton--ancho" name="decision" value="aprobar">Aprobar el pago</button>
                <button type="submit" class="boton boton--secundario boton--ancho" name="decision" value="rechazar">Rechazar el pago</button>
            </form>
            <a class="acceso__pie" href="/mi-perfil/suscripcion">Volver sin pagar</a>
        </section>
    </div>`;
    return { titulo: 'Pasarela de prueba', enfocado: true, volver: '/mi-perfil/suscripcion', volverTexto: 'Mi suscripción', cuerpo };
}

let numeroLocal = 0;
function postPasarela(ctx, id, d) {
    const p = pagoPropio(ctx, id);
    if (p && p.estado === 'Pendiente') {
        if (d.decision === 'aprobar') {
            p.estado = 'Aprobado';
            p.tx = `LOCAL-${Date.now().toString().slice(-7)}${++numeroLocal}`;
            p.fecha = ahora();
            aplicarPago(p);
            const u = ctx.usuario;
            const s = db.suscripciones.find((x) => x.id === p.suscripcionId);
            const mes = F.mes(p.periodo);
            const destacadosPago = db.destacados.filter((x) => x.pagoId === p.id).map((x) => `«${servicioDe(x.servicioId).titulo}» en ${categoriaDe(x.categoriaId).nombre}`);
            enviarCorreo({
                para: u.correo, asunto: 'Recibimos tu pago', nombre: u.nombre,
                texto: p.concepto === 'Destacado'
                    ? `Recibimos tu pago de ${F.money(p.monto)} por ${destacadosPago.length === 1 ? 'el destacado' : 'los destacados'} de ${mes}: ${F.lista(destacadosPago)}. ${destacadosPago.length === 1 ? 'Aparece' : 'Aparecen'} primero en su categoría hasta el ${F.fechaLarga(ultimoDia(p.periodo))}, y la cuota de ${mes} va incluida.`
                    : `Recibimos tu pago de ${F.money(p.monto)} por ${p.concepto === 'CuotaAnual' ? `la cuota anual desde ${mes}` : `la cuota de ${mes}`}. Tu perfil está al día hasta el ${F.fechaLarga(s.cubiertoHasta)}.`,
                boton: 'Ver mi suscripción', enlace: '/mi-perfil/suscripcion',
                pie: 'Guardá este correo como comprobante. Los pagos no tienen devolución.'
            });
        } else {
            p.estado = 'Rechazado';
            for (const x of db.destacados.filter((y) => y.pagoId === p.id && y.estado === 'PendientePago' && y.alta >= inicioDiaUtc(y.periodo))) {
                db.destacados = db.destacados.filter((y) => y !== x);
            }
        }
    }
    return { redirect: `/mi-perfil/suscripcion?pago=${id}` };
}

function pPasarelaDebito(ctx) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    const datos = perfil && datosSuscripcion(perfil);
    if (!datos || datos.s.adhesion !== 'Pendiente') return { redirect: '/mi-perfil/suscripcion' };
    const s = datos.s;
    const anual = s.periodicidad === 'Anual';
    const monto = anual ? datos.cuotaAnual : datos.cuotaMensual;
    const mesInicio = mesQueCubre(s.cubiertoHasta, datos.hoy);
    const desde = mesInicio > primerDia(datos.hoy) ? mesInicio : null;
    const cuerpo = html`
    <div class="acceso">
        <section class="acceso__tarjeta acceso__tarjeta--angosta" aria-labelledby="pasarela-titulo">
            <p class="nota-desarrollo">Pasarela de prueba: no se cobra nada. Con Mercado Pago, acá se autoriza el débito con una tarjeta.</p>
            <div class="acceso__titulos">
                <h1 id="pasarela-titulo" class="acceso__titulo">${F.money(monto)} por ${anual ? 'año' : 'mes'}</h1>
                <p class="acceso__bajada">${anual ? 'Red Nexa: cuota anual' : 'Red Nexa: cuota mensual'}, con débito automático. El primer débito es ${desde ? `el 1 de ${F.mes(desde)}` : 'al autorizarlo'}.</p>
            </div>
            <form class="formulario" method="post" action="/pasarela-de-prueba/debito" data-envio-unico>
                <button type="submit" class="boton boton--primario boton--ancho">Autorizar el débito automático</button>
            </form>
            <a class="acceso__pie" href="/mi-perfil/suscripcion?adhesion=1">Volver sin autorizar</a>
        </section>
    </div>`;
    return { titulo: 'Pasarela de prueba', enfocado: true, volver: '/mi-perfil/suscripcion', volverTexto: 'Mi suscripción', cuerpo };
}

function postPasarelaDebito(ctx) {
    const perfil = perfilDeUsuario(ctx.usuario.id);
    const datos = perfil && datosSuscripcion(perfil);
    if (datos && datos.s.adhesion === 'Pendiente') {
        const s = datos.s;
        s.adhesion = 'Autorizada';
        // Si el mes en curso está sin pagar, el primer débito se cobra apenas se autoriza.
        if (debe(s.cubiertoHasta, datos.hoy)) {
            const anual = s.periodicidad === 'Anual';
            const p = nuevoPago(s, anual ? 'CuotaAnual' : 'CuotaMensual', mesQueCubre(s.cubiertoHasta, datos.hoy), anual ? datos.cuotaAnual : datos.cuotaMensual);
            p.estado = 'Aprobado';
            p.tx = `LOCAL-${Date.now().toString().slice(-7)}${++numeroLocal}`;
            aplicarPago(p);
        }
    }
    return { redirect: '/mi-perfil/suscripcion?adhesion=1' };
}
