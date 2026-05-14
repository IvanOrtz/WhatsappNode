import express from 'express';
import { Server } from "socket.io";
import { createServer } from "node:http";
import cors from 'cors';

const app = express();

// Variable de entorno para el frontend
const FRONTEND_URL =
    process.env.FRONTEND_URL || "http://localhost:5173";

// Configuracion CORS
app.use(cors({
    origin: FRONTEND_URL
}));

// Endpoint basico
app.get("/", (req, res) => {
    res.send("Servidor funcionando");
});

const server = createServer(app);

// Configuracion Socket.IO
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL
    }
});

let usuarios = {};

// Obtener usuarios de una sala
function usuariosEnSala(sala) {
    return Object.values(usuarios).filter(
        usuario => usuario.roomActual === sala
    );
}

// Aviso de entrada
function avisarEntrada(socket, sala) {

    const usuario = usuarios[socket.id];

    if (!usuario) return;

    io.to(sala).emit("notificacionSistema", {
        texto: `${usuario.nombreUsuario} ha entrado`,
        room: sala
    });
}

// Aviso de salida
function avisarSalida(socket, sala) {

    const usuario = usuarios[socket.id];

    if (!usuario) return;

    io.to(sala).emit("notificacionSistema", {
        texto: `${usuario.nombreUsuario} ha salido`,
        room: sala
    });
}

// Cambio de sala
function cambiarSala(socket, nuevaSala) {

    const usuario = usuarios[socket.id];

    if (!usuario || usuario.roomActual === nuevaSala) return;

    const salaAnterior = usuario.roomActual;

    // Avisar salida
    avisarSalida(socket, salaAnterior);

    // Salir de la sala anterior
    socket.leave(salaAnterior);

    // Entrar en nueva sala
    usuario.roomActual = nuevaSala;
    socket.join(nuevaSala);

    // Avisar entrada
    avisarEntrada(socket, nuevaSala);

    // Actualizar usuarios en ambas salas
    io.to(salaAnterior).emit(
        'listaUsuarios',
        usuariosEnSala(salaAnterior)
    );

    io.to(nuevaSala).emit(
        'listaUsuarios',
        usuariosEnSala(nuevaSala)
    );
}

io.on('connection', (socket) => {

    console.log(`Usuario conectado: ${socket.id}`);

    // Registrar usuario
    socket.on("nombreUsuario", (datosUsuario) => {

        usuarios[socket.id] = {
            ...datosUsuario,
            roomActual: 'general'
        };

        socket.join('general');

        // Actualizar usuarios de la sala general
        io.to('general').emit(
            'listaUsuarios',
            usuariosEnSala('general')
        );

        avisarEntrada(socket, 'general');
    });

    // Cambiar sala
    socket.on("cambiarSala", (nuevaSala) => {

        const usuario = usuarios[socket.id];

        if (!usuario) return;

        cambiarSala(socket, nuevaSala);
    });

    // Mensajes
    socket.on("mensajeTexto", (mensaje) => {

        const usuario = usuarios[socket.id];

        if (!usuario) return;

        io.to(usuario.roomActual).emit('mensajeTexto', {
            ...mensaje,
            tipo: 'mensaje',
            room: usuario.roomActual
        });
    });

    // Usuario escribiendo
    socket.on("escribiendo", () => {

        const usuario = usuarios[socket.id];

        if (!usuario) return;

        socket.to(usuario.roomActual).emit("usuarioEscribiendo", {
            nombre: usuario.nombreUsuario,
            room: usuario.roomActual
        });
    });

    // Usuario deja de escribir
    socket.on("dejandoDeEscribir", () => {

        const usuario = usuarios[socket.id];

        if (!usuario) return;

        socket.to(usuario.roomActual).emit("usuarioDejoDeEscribir", {
            nombre: usuario.nombreUsuario,
            room: usuario.roomActual
        });
    });

    // Desconexion
    socket.on("disconnect", () => {

        console.log(`Usuario desconectado: ${socket.id}`);

        const usuario = usuarios[socket.id];

        if (!usuario) return;

        // Avisar salida
        io.to(usuario.roomActual).emit("notificacionSistema", {
            texto: `${usuario.nombreUsuario} ha salido`,
            room: usuario.roomActual
        });

        // Eliminar usuario
        delete usuarios[socket.id];

        // Actualizar usuarios de la sala
        io.to(usuario.roomActual).emit(
            'listaUsuarios',
            usuariosEnSala(usuario.roomActual)
        );
    });
});

// Puerto Render
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Servidor funcionando en puerto ${PORT}`);
});