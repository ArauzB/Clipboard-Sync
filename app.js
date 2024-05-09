//Si desea conectarse necesita cambiar la linea 114 con las IPs que desea conectar, puede ser local o con una VPN

import net from 'net';
import os from 'os';
import clipboardy from 'clipboardy';

const PORT = 3000;
const RECONNECT_INTERVAL = 5000;


//Obtener todas la IP
const networkInterfaces = os.networkInterfaces();
const localIpAddresses = Object.keys(networkInterfaces)
    .flatMap((key) => networkInterfaces[key])
    .filter((iface) => iface.family === 'IPv4' && !iface.internal)
    .map((iface) => iface.address);

let lastClipboardData = clipboardy.readSync();
const connectedNodes = new Map();




function connectToNode(nodeAddress) {
    if (connectedNodes.has(nodeAddress)) {
        console.log(`Already connected to node at ${nodeAddress}:${PORT}`);
        return;
    }

    const client = new net.Socket();

    client.on('error', (err) => {
        console.error(`TCP connection error with node ${nodeAddress}:${PORT}:`, err.message);
        client.destroy();
        connectedNodes.delete(nodeAddress);

        setTimeout(() => {
            connectToNode(nodeAddress);
        }, RECONNECT_INTERVAL);
    });

    client.connect(PORT, nodeAddress, () => {
        console.log(`Connected to node at ${nodeAddress}:${PORT}`);
        connectedNodes.set(nodeAddress, client);

        client.write(lastClipboardData);
    });

    client.on('close', () => {
        console.log(`Connection closed with node ${nodeAddress}:${PORT}`);
        connectedNodes.delete(nodeAddress);

        setTimeout(() => {
            connectToNode(nodeAddress);
        }, RECONNECT_INTERVAL);
    });

    client.on('data', (data) => {
        const receivedData = data.toString().trim();
        console.log(`Received from node ${nodeAddress}:${PORT}: ${receivedData}`);

        // Actualizar el portapapeles local solo si el mensaje recibido es diferente
        if (receivedData !== lastClipboardData) {
            clipboardy.writeSync(receivedData);
            console.log(`Updated local clipboard with data received from ${nodeAddress}:${PORT}: ${receivedData}`);
            lastClipboardData = receivedData; // Actualizar el último contenido del portapapeles
        }
    });
}

//Crea el servidor socket

const server = net.createServer((socket) => {
    const normalizedAddress = socket.remoteAddress.replace(/^.*:/, '');
    console.log(`Node connected: ${normalizedAddress}:${socket.remotePort}`);

    socket.write(lastClipboardData);

    socket.on('error', (err) => {
        console.error(`TCP connection error with node ${normalizedAddress}:${socket.remotePort}:`, err.message);
        socket.destroy();
    });

    socket.on('data', (data) => {
        const receivedData = data.toString().trim();
        console.log(`Received from node ${normalizedAddress}:${socket.remotePort}: ${receivedData}`);

        // Actualizar el portapapeles local solo si el mensaje recibido es diferente
        if (receivedData !== lastClipboardData) {
            clipboardy.writeSync(receivedData);
            console.log(`Updated local clipboard with data received from ${normalizedAddress}:${socket.remotePort}: ${receivedData}`);
            lastClipboardData = receivedData; // Actualizar el último contenido del portapapeles

            // Enviar la actualización a todos los nodos conectados, excepto al nodo actual
            connectedNodes.forEach((client, nodeAddr) => {
                if (nodeAddr !== normalizedAddress) {
                    client.write(receivedData);
                    console.log(`Sent updated clipboard data to ${nodeAddr}:${PORT}: ${receivedData}`);
                }
            });
        }
    });

    socket.on('end', () => {
        console.log(`Node disconnected: ${normalizedAddress}:${socket.remotePort}`);
    });

    connectedNodes.set(normalizedAddress, socket);
});


//Escucha las conexiones 
server.on('listening', () => {
    console.log(`Node is listening for TCP connections on port ${PORT}`);

    const knownNodeAddresses = ['100.64.196.59', '100.68.51.19']; //Cambiar la ips que desea conectarse

    knownNodeAddresses.forEach((nodeAddress) => {
        if (!localIpAddresses.includes(nodeAddress) && nodeAddress !== '127.0.0.1') {
            console.log(`Attempting to connect to node at ${nodeAddress}:${PORT}`);
            connectToNode(nodeAddress);
        }
    });

    setInterval(() => {
        const newClipboardData = clipboardy.readSync();
        if (newClipboardData !== lastClipboardData) {
            lastClipboardData = newClipboardData;

            // Enviar la actualización a todos los nodos conectados
            connectedNodes.forEach((client, nodeAddr) => {
                client.write(lastClipboardData);
                console.log(`Sent updated clipboard data to ${nodeAddr}:${PORT}: ${lastClipboardData}`);
            });
        }
    }, 1000);
});

server.listen(PORT);

process.on('SIGINT', () => {
    console.log('Server terminated by user.');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});
