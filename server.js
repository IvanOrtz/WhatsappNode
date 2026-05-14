import express from 'express';
import { Server } from "socket.io";
import { createServer } from "node:http";
import cors from 'cors';
import path from 'path'; // Necesario para gestionar rutas de archivos
import { fileURLToPath } from 'url'; // Necesario para obtener la ruta en módulos ES (import)

// --- CONFIGURACIÓN DE RUTAS PARA ARCHIVOS ESTÁTICOS ---
// En Node con "import", __dirname no existe por defecto. Estas dos líneas lo activan:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// --- SERVIR EL FRONTEND DE VUE ---
// 'dist' es la carpeta que genera Vue al hacer "npm run build". 
// Esto permite que al entrar a la URL se cargue tu aplicación visual.
app.use(express.static(path.join(__dirname, 'dist')));

const server = createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" } 
});

let usuarios = {};

// --- RUTAS DE EXPRESS ---
// Definimos la ruta raíz para que Render no devuelva "Cannot GET /"
// Si hay un archivo index.html en /dist, express.static lo servirá automáticamente,
// pero esto asegura que cualquier ruta desconocida cargue tu app de Vue (Single Page App).
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    // Verificamos si existe el build para no dar error si aún no has compilado Vue
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(200).send("Servidor Node activo. (Nota: No se encontró la carpeta 'dist' del frontend)");
        }
    });
});


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

// --- PUERTO DINÁMICO PARA RENDER---
// Render asigna un puerto mediante la variable de entorno process.env.PORT.
// Si dejas el 3000 fijo, Render no podrá conectar externamente con tu app.
const PORT = process.env.PORT || 3000;

server.listen(PORT, function () {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});