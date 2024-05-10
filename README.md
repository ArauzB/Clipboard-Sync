# Clipboard Sync

Este es un servidor para sincronizar el portapapeles entre múltiples nodos conectados a través de Socket.io.
Permite compartir y actualizar el contenido del portapapeles entre diferentes dispositivos en una red local.

## Requisitos
Node.js instalado en el sistema.

Las bibliotecas os, clipboardy, socket.io, y socket.io-client deben estar instaladas.

## Instalacion y Ejecucion

Clona el repositorio

```bash
  git clone https://github.com/ArauzB/Clipboard-Sync.git
```

Ve al directorio del proyecto

```bash
  cd Clipboard-Sync
```

Instalacion de dependencias

```bash
  npm install
```

Inicia el servidor

```bash
  npm run start
```

El servidor escuchará conexiones Socket.io en el puerto ```3000```.

Conecta otros nodos conocidos al servidor especificando sus direcciones IP en la matriz ```knownNodeAddresses```.

## Descripción del Código

Obtención de Direcciones IP Locales: 
El servidor obtiene todas las direcciones IP locales disponibles en el sistema para identificar los nodos en la red.

Lectura del Portapapeles: Utiliza la biblioteca clipboardy para leer y escribir en el portapapeles de forma segura.

Manejo de Conexiones: Establece conexiones con otros nodos a través de Socket.io para compartir y actualizar datos del portapapeles.

## Eventos Principales:
clipboardUpdate: Envía y actualiza los datos del portapapeles entre los nodos conectados.

disconnect: Maneja reconexiones automáticas en caso de pérdida de conexión.

## Personalización
Puerto de Escucha: Puedes cambiar el puerto de escucha modificando la constante ```PORT```.

Intervalo de Reconexión: Ajusta el intervalo de reconexión para nodos desconectados cambiando ```RECONNECT_INTERVAL```.

## Ejemplo de Uso
Inicia el servidor en una máquina.

Conecta otros dispositivos en la misma red local especificando la dirección IP del servidor en ```knownNodeAddresses```.

Comparte texto a través del portapapeles y observa cómo se actualiza automáticamente en otros dispositivos conectados.

Este servidor puede ser útil en entornos donde se necesite compartir información de manera rápida y eficiente entre múltiples dispositivos conectados en una red local.
