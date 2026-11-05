# Fuentes de la demo

Con esto se rearma `sitio/index.html` cuando cambia el sitio de Red Nexa. Hace falta Node 24 y, para las fotos y las pruebas, Microsoft Edge. Los comandos van desde esta carpeta, con `WEB` como la ruta a `RedNexa.Web` del proyecto.

- `src/`: la demo. Cada archivo replica una parte de las vistas Razor y de las reglas del proyecto; `12-app.js` es el enrutador, los formularios y el panel "Demo"; `11-puerta.js`, la pantalla de usuario y contraseña; `demo.css`, el estilo del panel.
- `leer-seed.mjs`: lee los datos de ejemplo de `RedNexa.Infrastructure/Data/Seed` (catálogo, zonas, proveedores, CV) y los deja en `seed.json`.
- `convertir-fotos.mjs`: achica las fotos de `RedNexa.Web/DatosDeEjemplo/Fotos` a 560 × 420 en WEBP, en `fotos/`.
- `build.mjs`: arma el HTML con el `site.css`, las fuentes y la portada del proyecto, las fotos, los datos y `src/`.
- `pruebas/`: recorridos por CDP contra Edge sin interfaz.

`seed.json`, `fotos/` y `app-armada.js` se generan: no se versionan.

## ¿La demo está al día?

`sincronia.json` guarda una huella de cada archivo del proyecto que la demo copia (vistas, CSS, scripts, datos de ejemplo, controladores y reglas), tomada la última vez que se puso al día.

```
node sincronia.mjs revisar "$WEB/.."
```

Lista lo que cambió desde entonces, en dos grupos: lo que hay que pasar a mano a `src/` (vistas, textos, reglas) y lo que se resuelve rearmando (CSS, fuentes, fotos, datos de ejemplo). Con `--estricto` sale con código 1 si la demo quedó atrás.

Después de poner la demo al día, rearmarla y probarla:

```
node sincronia.mjs marcar "$WEB/.."
```

y subir `sincronia.json` junto con `sitio/index.html`.

## Rearmar la demo

```
node leer-seed.mjs "$WEB/../RedNexa.Infrastructure/Data/Seed" seed.json
msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<carpeta temporal> about:blank
node convertir-fotos.mjs "$WEB/DatosDeEjemplo/Fotos" fotos 9333
node build.mjs "$WEB" ../sitio/index.html
```

Las fotos ya convertidas se saltean: para cambiar una, borrá su `.webp`.

## Probarla

Con el mismo Edge abierto:

```
node pruebas/recorrido.mjs ../sitio/index.html 9333 1280 capturas
node pruebas/celular.mjs ../sitio/index.html 9333 capturas
node pruebas/flujos.mjs ../sitio/index.html 9333 capturas
CLAVE_PUERTA=<la contraseña de la puerta> node pruebas/puerta.mjs ../sitio/index.html 9333 capturas
```

La contraseña de la puerta no está escrita en el repositorio: el código guarda sólo su huella (`HUELLA_PUERTA` en `src/11-puerta.js`). Para cambiarla, calculá la huella nueva con la función `huella` de ese archivo sobre `usuario:contraseña`, con el usuario en minúsculas.

Al terminar, cerrá el Edge sin interfaz.
