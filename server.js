import express from 'express';
import { Server } from "socket.io";
import { createServer } from "node:http";
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let usuarios = {};

// Envia a todos los usuarios de una sala el aviso de que alguien ha entrado.
function avisarEntrada(socket, sala) {
    const usuario = usuarios[socket.id];
    if (!usuario) return;

    io.to(sala).emit("notificacionSistema", {
        texto: `${usuario.nombreUsuario} ha entrado`,
        room: sala
    });
}

// Envia a todos los usuarios de una sala el aviso de que alguien ha salido.
function avisarSalida(socket, sala) {
    const usuario = usuarios[socket.id];
    if (!usuario) return;

    io.to(sala).emit("notificacionSistema", {
        texto: `${usuario.nombreUsuario} ha salido`,
        room: sala
    });
}

// Saca al usuario de su sala actual y lo mete en la nueva.
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
        // Guardamos los datos del usuario conectado y lo metemos en la sala general.
        usuarios[socket.id] = { ...datosUsuario, roomActual: 'general' };
        socket.join('general');

        io.emit('listaUsuarios', Object.values(usuarios));
        avisarEntrada(socket, 'general');
    });
        //Cambia al usuario de sala
    socket.on("cambiarSala", function (nuevaSala) {
        cambiarSala(socket, nuevaSala);
        io.emit('listaUsuarios', Object.values(usuarios));
    });

    socket.on("mensajeTexto", function (mensaje) {
        const usuario = usuarios[socket.id];
        if (!usuario) return;

        // El mensaje se manda solo a la sala actual del usuario.
        io.to(usuario.roomActual).emit('mensajeTexto', {
            ...mensaje,
            tipo: 'mensaje',
            room: usuario.roomActual
        });
    });

    socket.on("escribiendo", function () {
        const usuario = usuarios[socket.id];
        if (!usuario) return;

        // Avisamos a la sala actual, no a toda la aplicacion.
        io.to(usuario.roomActual).emit("usuarioEscribiendo", {
            nombre: usuario.nombreUsuario,
            room: usuario.roomActual
        });
    });

    socket.on("dejandoDeEscribir", function () {
        const usuario = usuarios[socket.id];
        if (!usuario) return;

        // Quita el aviso de escritura en la sala actual.
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

server.listen(3000, function () {
    console.log("Servidor en puerto 3000");
});
