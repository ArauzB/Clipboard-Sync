import net from 'net';
import os from 'os';
import clipboardy from 'clipboardy';

const PORT = 3000;
const RECONNECT_INTERVAL = 5000;

// Obtener todas las direcciones IP locales
const networkInterfaces = os.networkInterfaces();
const localIpAddresses = Object.values(networkInterfaces)
    .flatMap((iface) => iface)
    .filter((iface) => iface.family === 'IPv4' && !iface.internal)
    .map((iface) => iface.address);

let lastClipboardData = getClipboardText();
const connectedNodes = new Map();

// Función para obtener el texto del portapapeles de manera segura
function getClipboardText() {
    try {
        return clipboardy.readSync().trim();
    } catch (error) {
        console.error('Error al intentar leer el portapapeles:', error.message);
        return ''; // Devolver una cadena vacía en caso de error
    }
}

function connectToNode(nodeAddress) {
    if (connectedNodes.has(nodeAddress)) {
        console.log(`Ya conectado al nodo en ${nodeAddress}:${PORT}`);
        return;
    }

    const client = new net.Socket();

    client.on('error', (err) => {
        console.error(`Error de conexión TCP con el nodo ${nodeAddress}:${PORT}:`, err.message);
        client.destroy();
        connectedNodes.delete(nodeAddress);

        setTimeout(() => {
            connectToNode(nodeAddress);
        }, RECONNECT_INTERVAL);
    });

    client.connect(PORT, nodeAddress, () => {
        console.log(`Conectado al nodo en ${nodeAddress}:${PORT}`);
        connectedNodes.set(nodeAddress, client);

        if (lastClipboardData) {
            client.write(lastClipboardData);
        }
    });

    client.on('close', () => {
        console.log(`Conexión cerrada con el nodo ${nodeAddress}:${PORT}`);
        connectedNodes.delete(nodeAddress);

        setTimeout(() => {
            connectToNode(nodeAddress);
        }, RECONNECT_INTERVAL);
    });

    client.on('data', (data) => {
        const receivedData = data.toString().trim();
        console.log(`Recibido del nodo ${nodeAddress}:${PORT}: ${receivedData}`);

        if (receivedData !== lastClipboardData) {
            updateClipboard(receivedData);
        }
    });
}

function updateClipboard(newData) {
    if (typeof newData !== 'string' || newData.trim().length === 0) {
        console.log('No se puede actualizar el portapapeles con datos no válidos.');
        return;
    }

    try {
        clipboardy.writeSync(newData);
        console.log(`Actualizado el portapapeles local con datos recibidos: ${newData}`);
        lastClipboardData = newData;
    } catch (error) {
        console.error('Error al intentar actualizar el portapapeles:', error.message);
    }
}

const server = net.createServer((socket) => {
    const normalizedAddress = socket.remoteAddress.replace(/^.*:/, '');
    console.log(`Nodo conectado: ${normalizedAddress}:${socket.remotePort}`);

    socket.write(lastClipboardData);

    socket.on('error', (err) => {
        console.error(`Error de conexión TCP con el nodo ${normalizedAddress}:${socket.remotePort}:`, err.message);
        socket.destroy();
    });

    socket.on('data', (data) => {
        const receivedData = data.toString().trim();
        console.log(`Recibido del nodo ${normalizedAddress}:${socket.remotePort}: ${receivedData}`);

        if (receivedData !== lastClipboardData) {
            updateClipboard(receivedData);
            broadcastUpdate(receivedData, normalizedAddress);
        }
    });

    socket.on('end', () => {
        console.log(`Nodo desconectado: ${normalizedAddress}:${socket.remotePort}`);
    });

    connectedNodes.set(normalizedAddress, socket);
});

server.on('listening', () => {
    console.log(`El nodo está escuchando conexiones TCP en el puerto ${PORT}`);

    const knownNodeAddresses = ['100.64.196.59', '100.68.51.19']; // Cambiar las direcciones IP deseadas

    knownNodeAddresses.forEach((nodeAddress) => {
        if (!localIpAddresses.includes(nodeAddress) && nodeAddress !== '127.0.0.1') {
            console.log(`Intentando conectar al nodo en ${nodeAddress}:${PORT}`);
            connectToNode(nodeAddress);
        }
    });

    setInterval(() => {
        const newClipboardData = getClipboardText();
        if (newClipboardData !== lastClipboardData) {
            updateClipboard(newClipboardData);
            broadcastUpdate(newClipboardData);
        }
    }, 1000);
});

server.listen(PORT);

process.on('SIGINT', () => {
    console.log('Servidor terminado por el usuario.');
    server.close(() => {
        console.log('Servidor cerrado.');
        process.exit(0);
    });
});

function broadcastUpdate(data, senderAddress) {
    connectedNodes.forEach((client, nodeAddr) => {
        if (nodeAddr !== senderAddress) {
            client.write(data);
            console.log(`Enviado datos actualizados al nodo ${nodeAddr}:${PORT}: ${data}`);
        }
    });
}
