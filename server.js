import express from 'express';
import { Server } from "socket.io";
import { createServer } from "node:http";
import cors from 'cors';

const app = express();

// Configuracion CORS
app.use(cors({
    origin: "https://whatsappnode-vxf0.onrender.com"
}));

// Endpoint basico para comprobar que el servidor funciona
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

// Devuelve los usuarios de una sala
function usuariosEnSala(sala) {
    return Object.values(usuarios).filter(
        usuario => usuario.roomActual === sala
    );
}

// Envia aviso de entrada
function avisarEntrada(socket, sala) {
    const usuario = usuarios[socket.id];

    if (!usuario) return;

    io.to(sala).emit("notificacionSistema", {
        texto: `${usuario.nombreUsuario} ha entrado`,
        room: sala
    });
}

// Envia aviso de salida
function avisarSalida(socket, sala) {
    const usuario = usuarios[socket.id];

    if (!usuario) return;

    io.to(sala).emit("notificacionSistema", {
        texto: `${usuario.nombreUsuario} ha salido`,
        room: sala
    });
}

// Cambia al usuario de sala
function cambiarSala(socket, nuevaSala) {
    const usuario = usuarios[socket.id];

    if (!usuario || usuario.roomActual === nuevaSala) return;

    // Avisar salida
    avisarSalida(socket, usuario.roomActual);

    // Salir de la sala actual
    socket.leave(usuario.roomActual);

    // Entrar en la nueva sala
    usuario.roomActual = nuevaSala;
    socket.join(nuevaSala);

    // Avisar entrada
    avisarEntrada(socket, nuevaSala);

    // Actualizar lista de usuarios en ambas salas
    io.to(usuario.roomActual).emit(
        'listaUsuarios',
        usuariosEnSala(usuario.roomActual)
    );

    io.to(nuevaSala).emit(
        'listaUsuarios',
        usuariosEnSala(nuevaSala)
    );
}

io.on('connection', (socket) => {

    console.log(`Usuario conectado: ${socket.id}`);

    // Usuario entra al chat
    socket.on("nombreUsuario", (datosUsuario) => {

        usuarios[socket.id] = {
            ...datosUsuario,
            roomActual: 'general'
        };

        socket.join('general');

        // Actualizar lista de usuarios de la sala
        io.to('general').emit(
            'listaUsuarios',
            usuariosEnSala('general')
        );

        avisarEntrada(socket, 'general');
    });

    // Cambiar de sala
    socket.on("cambiarSala", (nuevaSala) => {

        const usuario = usuarios[socket.id];

        if (!usuario) return;

        const salaAnterior = usuario.roomActual;

        cambiarSala(socket, nuevaSala);

        // Actualizar usuarios de ambas salas
        io.to(salaAnterior).emit(
            'listaUsuarios',
            usuariosEnSala(salaAnterior)
        );

        io.to(nuevaSala).emit(
            'listaUsuarios',
            usuariosEnSala(nuevaSala)
        );
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

        // Actualizar lista
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