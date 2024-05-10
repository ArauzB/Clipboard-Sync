import net from 'net';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const PORT = 3000;
const RECONNECT_INTERVAL = 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const networkInterfaces = os.networkInterfaces();
const localIpAddresses = Object.values(networkInterfaces)
    .flatMap((iface) => iface)
    .filter((iface) => iface.family === 'IPv4' && !iface.internal)
    .map((iface) => iface.address);

const eventEmitter = new EventEmitter();

function connectToNode(nodeAddress) {
    const client = new net.Socket();

    client.on('error', (err) => {
        console.error(`Error de conexión TCP con el nodo ${nodeAddress}:${PORT}:`, err.message);
        client.destroy();
    });

    client.connect(PORT, nodeAddress, () => {
        console.log(`Conectado al nodo en ${nodeAddress}:${PORT}`);

        client.on('data', (data) => {
            const receivedData = data.toString().trim();
            console.log(`Recibido del nodo ${nodeAddress}:${PORT}: ${receivedData}`);

            if (receivedData.startsWith('FILE:')) {
                const parts = receivedData.split(':');
                const fileName = parts[1];
                const fileContents = parts.slice(2).join(':');
                const filePath = path.join(__dirname, fileName);

                try {
                    fs.writeFileSync(filePath, fileContents);
                    console.log(`Archivo ${fileName} recibido y guardado localmente.`);

                    // Emitir evento para indicar que se recibió un archivo
                    eventEmitter.emit('fileReceived', { fileName, filePath });
                } catch (error) {
                    console.error(`Error al guardar el archivo ${fileName}:`, error.message);
                }
            }
        });
    });

    client.on('close', () => {
        console.log(`Conexión cerrada con el nodo ${nodeAddress}:${PORT}`);
        setTimeout(() => {
            connectToNode(nodeAddress);
        }, RECONNECT_INTERVAL);
    });
}

// Conectar a los nodos remotos conocidos
const knownNodeAddresses = ['100.64.196.59', '100.68.51.19']; // Direcciones IP de nodos remotos

knownNodeAddresses.forEach((nodeAddress) => {
    if (!localIpAddresses.includes(nodeAddress) && nodeAddress !== '127.0.0.1') {
        console.log(`Intentando conectar al nodo en ${nodeAddress}:${PORT}`);
        connectToNode(nodeAddress);
    }
});

export { eventEmitter };
