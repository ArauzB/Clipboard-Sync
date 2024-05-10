import os from 'os';
import clipboardy from 'clipboardy';
import { Server as SocketIoServer } from 'socket.io';
import { io as socketIoClient } from 'socket.io-client'; // Importa 'io' desde 'socket.io-client'

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

const io = new SocketIoServer(PORT);

io.on('connection', (socket) => {
    const nodeAddress = socket.handshake.address;
    console.log(`Nodo conectado: ${nodeAddress}`);

    socket.emit('clipboardData', lastClipboardData);

    socket.on('disconnect', () => {
        console.log(`Nodo desconectado: ${nodeAddress}`);
        connectedNodes.delete(nodeAddress);
    });

    socket.on('clipboardUpdate', (data) => {
        handleClipboardUpdate(data, nodeAddress);
    });

    connectedNodes.set(nodeAddress, socket);
});

console.log(`El servidor está escuchando conexiones Socket.io en el puerto ${PORT}`);

// Conexión a otros nodos conocidos
const knownNodeAddresses = ['100.64.196.59', '100.68.51.19'];

knownNodeAddresses.forEach((nodeAddress) => {
    if (!localIpAddresses.includes(nodeAddress) && nodeAddress !== '127.0.0.1') {
        console.log(`Intentando conectar al nodo en ${nodeAddress}`);
        connectToNode(nodeAddress);
    }
});

setInterval(() => {
    const newClipboardData = getClipboardText();
    if (newClipboardData !== lastClipboardData) {
        handleClipboardUpdate(newClipboardData); // Manejar actualización del portapapeles
    }
}, 1000);

function connectToNode(nodeAddress) {
    const nodeSocket = socketIoClient(`http://${nodeAddress}:${PORT}`); // Utiliza socketIoClient para conectarse

    nodeSocket.on('connect', () => {
        console.log(`Conectado al nodo en ${nodeAddress}`);
        connectedNodes.set(nodeAddress, nodeSocket);

        if (lastClipboardData) {
            nodeSocket.emit('clipboardData', lastClipboardData);
        }
    });

    nodeSocket.on('disconnect', () => {
        console.log(`Desconectado del nodo en ${nodeAddress}`);
        connectedNodes.delete(nodeAddress);

        setTimeout(() => {
            connectToNode(nodeAddress);
        }, RECONNECT_INTERVAL);
    });

    nodeSocket.on('clipboardData', (data) => {
        handleClipboardUpdate(data, nodeAddress);
    });
}

function handleClipboardUpdate(data, senderAddress) {
    if (typeof data !== 'string' || data.trim().length === 0) {
        console.log('Datos de portapapeles no válidos.');
        return;
    }

    const receivedData = data.trim();
    console.log(`Recibido del nodo ${senderAddress}: ${receivedData}`);

    if (receivedData !== lastClipboardData) {
        updateClipboard(receivedData);
        broadcastUpdate(receivedData, senderAddress);
    }
}

function updateClipboard(newData) {
    try {
        clipboardy.writeSync(newData);
        console.log(`Actualizado el portapapeles local con datos recibidos: ${newData}`);
        lastClipboardData = newData;
    } catch (error) {
        console.error('Error al intentar actualizar el portapapeles:', error.message);
    }
}

function broadcastUpdate(data, senderAddress) {
    connectedNodes.forEach((socket, nodeAddr) => {
        if (nodeAddr !== senderAddress) {
            socket.emit('clipboardData', data);
            console.log(`Enviado datos actualizados al nodo ${nodeAddr}: ${data}`);
        }
    });
}
