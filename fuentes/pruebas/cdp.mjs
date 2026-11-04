// Ayudas para manejar Edge sin interfaz por CDP (Node 24 trae WebSocket y fetch).
import { writeFileSync } from 'node:fs';

export async function conectar(puerto) {
    const nuevo = await (await fetch(`http://127.0.0.1:${puerto}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(nuevo.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r, { once: true }));
    let n = 0;
    const pendientes = new Map();
    const errores = [];
    const oyentes = [];
    ws.addEventListener('message', (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pendientes.has(m.id)) {
            pendientes.get(m.id)(m);
            pendientes.delete(m.id);
            return;
        }
        if (m.method === 'Runtime.exceptionThrown') {
            const d = m.params.exceptionDetails;
            errores.push(`EXCEPCION: ${d.exception?.description || d.text} (${d.url || ''}:${d.lineNumber})`);
        }
        if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
            errores.push(`CONSOLA ${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
        }
        if (m.method === 'Page.javascriptDialogOpening') {
            enviar('Page.handleJavaScriptDialog', { accept: true });
        }
        for (const o of oyentes) o(m);
    });
    const enviar = (method, params = {}) => new Promise((r) => {
        const id = ++n;
        pendientes.set(id, r);
        ws.send(JSON.stringify({ id, method, params }));
    });
    await enviar('Runtime.enable');
    await enviar('Page.enable');
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
    const evaluar = async (expr) => {
        const r = await enviar('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result?.exceptionDetails) {
            throw new Error('Evaluar: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
        }
        return r.result?.result?.value;
    };
    const ancho = async (w, h = 900) => {
        await enviar('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    };
    const ir = async (url) => {
        const carga = new Promise((r) => {
            const o = (m) => {
                if (m.method === 'Page.loadEventFired') {
                    oyentes.splice(oyentes.indexOf(o), 1);
                    r();
                }
            };
            oyentes.push(o);
        });
        await enviar('Page.navigate', { url });
        await carga;
        await esperar(400);
    };
    const hash = async (h) => {
        await evaluar(`location.hash = ${JSON.stringify(h)}`);
        await esperar(250);
    };
    const captura = async (archivo, completa = true) => {
        const r = await enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: completa });
        writeFileSync(archivo, Buffer.from(r.result.data, 'base64'));
    };
    const desborde = () => evaluar('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    return { enviar, evaluar, ancho, ir, hash, captura, desborde, esperar, errores, cerrar: () => ws.close() };
}
