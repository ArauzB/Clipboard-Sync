import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const app = express();
const PORT = 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const writeFileAsync = promisify(fs.writeFile);

app.use(express.json());

app.post('/receiveFile', async (req, res) => {
    const { fileName, fileContents } = req.body;

    if (!fileName || !fileContents) {
        return res.status(400).send('Nombre de archivo o contenido faltante en la solicitud.');
    }

    try {
        const filePath = path.join(__dirname, fileName);
        await writeFileAsync(filePath, fileContents);
        res.status(200).send('Archivo recibido y guardado exitosamente.');
    } catch (error) {
        console.error('Error al guardar el archivo:', error.message);
        res.status(500).send('Error al procesar la solicitud.');
    }
});

// Iniciar el servidor Express
app.listen(PORT, () => {
    console.log(`Servidor Express iniciado en el puerto ${PORT}`);
});

export default app;
