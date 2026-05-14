import express from 'express';
import { Server } from "socket.io";
import { createServer } from "node:http";
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// --- SERVIR FRONTEND ---
// Según tus logs, Vite está generando la carpeta 'dist', así que usamos 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

const server = createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" } 
});

let usuarios = {};

// --- RUTAS DE EXPRESS ---
// CORRECCIÓN DEL ERROR: En versiones nuevas de Express/path-to-regexp 
// se debe usar '(.*)' en lugar de '*' para capturar todas las rutas.
app.get('(.*)', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(200).send("Servidor Node activo. Si ves esto, es que el build de Vite no dejó los archivos en /dist.");
        }
    });
});

// --- LÓGICA DE SOCKET.IO ---
function avisarEntrada(socket, sala) {
    const usuario = usuarios[socket.id];
    if (!usuario) return;
    io.to(sala).emit("notificacionSistema", {
        texto: `${usuario.nombreUsuario} ha entrado`,
        room: sala
    });
}

function avisarSalida(socket, sala) {
    const usuario = usuarios[socket.id];
    if (!usuario) return;
    io.to(sala).emit("notificacionSistema", {
        texto: `${usuario.nombreUsuario} ha salido`,
        room: sala
    });
}

function cambiarSala(socket, nuevaSala) {
    const usuario = usuarios[socket.id];
    if (!usuario || usuario.roomActual === nuevaSala) return;
    avisarSalida(socket, usuario.roomActual);
    socket.leave(usuario.roomActual);
    usuario.roomActual = nuevaSala;
    socket.join(nuevaSala);
    avisarEntrada(socket, nuevaSala);
}

io.on('connection', function (socket) {
    socket.on("nombreUsuario", function (datosUsuario) {
        usuarios[socket.id] = { ...datosUsuario, roomActual: 'general' };
        socket.join('general');
        io.emit('listaUsuarios', Object.values(usuarios));
        avisarEntrada(socket, 'general');
    });

    socket.on("cambiarSala", function (nuevaSala) {
        cambiarSala(socket, nuevaSala);
        io.emit('listaUsuarios', Object.values(usuarios));
    });

    socket.on("mensajeTexto", function (mensaje) {
        const usuario = usuarios[socket.id];
        if (!usuario) return;
        io.to(usuario.roomActual).emit('mensajeTexto', {
            ...mensaje,
            tipo: 'mensaje',
            room: usuario.roomActual
        });
    });

    socket.on("escribiendo", function () {
        const usuario = usuarios[socket.id];
        if (!usuario) return;
        io.to(usuario.roomActual).emit("usuarioEscribiendo", {
            nombre: usuario.nombreUsuario,
            room: usuario.roomActual
        });
    });

    socket.on("dejandoDeEscribir", function () {
        const usuario = usuarios[socket.id];
        if (!usuario) return;
        io.to(usuario.roomActual).emit("usuarioDejoDeEscribir", {
            nombre: usuario.nombreUsuario,
            room: usuario.roomActual
        });
    });

    socket.on("disconnect", function () {
        const usuario = usuarios[socket.id];
        if (!usuario) return;
        io.to(usuario.roomActual).emit("notificacionSistema", {
            texto: `${usuario.nombreUsuario} ha salido`,
            room: usuario.roomActual
        });
        delete usuarios[socket.id];
        io.emit('listaUsuarios', Object.values(usuarios));
    });
});

// --- PUERTO ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});