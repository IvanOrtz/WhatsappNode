<template>
  <div class="whatsapp-layout">
    <ChatSidebar
      :user-session="userSession"
      :usuarios="usuarios"
      :salas="salas"
      :sala-actual="roomActual"
      @cerrar-sesion="cerrarSesion"
      @seleccionar-sala="seleccionarSala"
    />

    <main class="chat-main">
      <header class="chat-header">
        <div class="chat-header-info">
          <div class="avatar-header emoji">{{ salaActual.icono }}</div>
          <div>
            <h4>{{ salaActual.nombre }}</h4>
            <small>{{ salaActual.descripcion }}</small>
          </div>
        </div>
      </header>

      <div class="messages" ref="messagesBox">
        <div v-for="(mensaje, indice) in mensajesActuales" :key="indice"
             :class="['row', mensaje.tipo === 'sistema' ? 'system-msg-row' : (mensaje.id === userSession.id ? 'sent' : 'received')]">
          <div v-if="mensaje.tipo === 'mensaje'" class="bubble">
            <b v-if="mensaje.id !== userSession.id">{{ mensaje.nombre }}</b>
            <p>{{ mensaje.texto }}</p>
          </div>

          <div v-else class="system-msg">{{ mensaje.texto }}</div>
        </div>
      </div>

      <footer class="footer">
        <div v-if="escribiendo" class="typing-status">{{ escribiendo }} esta escribiendo...</div>
        <div class="message-input-row">
          <input
            v-model="inputMsg"
            @keyup.enter="enviar"
            :placeholder="'Mensaje a ' + salaActual.nombre + '...'"
          >
          <button @click="enviar">Enviar</button>
        </div>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'vue-router';
import socket from '../socket';
import ChatSidebar from './ChatSidebar.vue';

const auth = getAuth();
const db = getFirestore();
const router = useRouter();

let userSession = {
  nombre: auth.currentUser.displayName,
  foto: auth.currentUser.photoURL,
  id: auth.currentUser.uid,
  uid: auth.currentUser.uid,
  estado: 'En linea'
};

const salas = [
  { id: 'general', nombre: 'Sala Comun', descripcion: 'Chat grupal', icono: 'G' },
  { id: 'clase', nombre: 'Clase', descripcion: 'Dudas y tareas', icono: 'C' },
  { id: 'ocio', nombre: 'Ocio', descripcion: 'Charla libre', icono: 'O' }
];

const usuarios = ref([]);
const mensajesPorSala = ref({ general: [], clase: [], ocio: [] });
const inputMsg = ref("");
const escribiendo = ref("");
const estaEscribiendo = ref(false);
const temporizadorEscribiendo = ref(null);
const messagesBox = ref(null);
const roomActual = ref("general");

const salaActual = computed(function () {
  return salas.find(s => s.id === roomActual.value) || salas[0];
});

const mensajesActuales = computed(function () {
  return mensajesPorSala.value[roomActual.value] || [];
});

function seleccionarSala(salaSeleccionada) {
  if (salaSeleccionada.id === roomActual.value) return;
  limpiarEstadoEscribiendo();
  roomActual.value = salaSeleccionada.id;
  if (!mensajesPorSala.value[roomActual.value]) {
    mensajesPorSala.value[roomActual.value] = [];
  }
  socket.emit("cambiarSala", roomActual.value);
}

function enviar() {
  const textoMensaje = inputMsg.value.trim();
  if (!textoMensaje) return;
  socket.emit("mensajeTexto", {
    texto: textoMensaje,
    nombre: userSession.nombre,
    id: userSession.id,
    room: roomActual.value
  });
  inputMsg.value = "";
  detenerEscritura();
}

function cerrarSesion() {
  detenerEscritura();
  signOut(auth).then(function () {
    socket.disconnect();
    router.push('/login');
  });
}

function guardarMensajeEnSala(mensaje) {
  if (!mensajesPorSala.value[mensaje.room]) {
    mensajesPorSala.value[mensaje.room] = [];
  }
  mensajesPorSala.value[mensaje.room].push(mensaje);
}

function bajarAlUltimoMensaje() {
  nextTick(function () {
    if (messagesBox.value) {
      messagesBox.value.scrollTop = messagesBox.value.scrollHeight;
    }
  });
}

function limpiarEstadoEscribiendo() {
  detenerEscritura();
  escribiendo.value = "";
}

onMounted(async function () {
  // Consultamos Firestore y sobreescribimos el estado dentro de userSession
  const estadoFirestore = await getDoc(doc(db, 'users', userSession.uid));
  userSession.estado = estadoFirestore.exists() ? estadoFirestore.data().estado : 'En linea';

  socket.connect();

  socket.emit('nombreUsuario', {
    nombreUsuario: userSession.nombre,
    foto: userSession.foto,
    id: userSession.id,
    estado: userSession.estado
  });

  socket.on('listaUsuarios', function (listaUsuarios) {
    usuarios.value = listaUsuarios;
  });

  socket.on('mensajeTexto', function (mensaje) {
    guardarMensajeEnSala(mensaje);
  });

  socket.on('notificacionSistema', function (notificacion) {
    guardarMensajeEnSala({
      texto: notificacion.texto,
      tipo: 'sistema',
      room: notificacion.room
    });
  });

  socket.on('usuarioEscribiendo', function (avisoEscritura) {
    if (avisoEscritura.room === roomActual.value && avisoEscritura.nombre !== userSession.nombre) {
      escribiendo.value = avisoEscritura.nombre;
    }
  });

  socket.on('usuarioDejoDeEscribir', function (avisoEscritura) {
    if (avisoEscritura.room === roomActual.value && escribiendo.value === avisoEscritura.nombre) {
      escribiendo.value = "";
    }
  });
});

watch(inputMsg, function (valorInput) {
  if (!valorInput.trim()) {
    detenerEscritura();
    return;
  }
  if (!estaEscribiendo.value) {
    estaEscribiendo.value = true;
    socket.emit('escribiendo');
  }
  if (temporizadorEscribiendo.value) {
    clearTimeout(temporizadorEscribiendo.value);
  }
  temporizadorEscribiendo.value = setTimeout(function () {
    detenerEscritura();
  }, 2000);
});

watch(function () {
  return mensajesActuales.value.length;
}, function () {
  bajarAlUltimoMensaje();
});

function detenerEscritura() {
  if (temporizadorEscribiendo.value) {
    clearTimeout(temporizadorEscribiendo.value);
    temporizadorEscribiendo.value = null;
  }
  if (estaEscribiendo.value) {
    estaEscribiendo.value = false;
    socket.emit('dejandoDeEscribir');
  }
}
</script>

<style scoped>
.whatsapp-layout { display: flex; height: 100vh; background: #f0f2f5; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
.chat-main { flex: 1; display: flex; flex-direction: column; background: #efeae2; position: relative; }
.chat-main::before { content: ""; position: absolute; inset: 0; background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); opacity: 0.06; pointer-events: none; }
.chat-header { background: #f0f2f5; padding: 10px 16px; z-index: 1; border-bottom: 1px solid #d1d7db; }
.chat-header-info { display: flex; align-items: center; gap: 12px; }
.avatar-header { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.avatar-header.emoji { display: flex; align-items: center; justify-content: center; background: #dfe5e7; font-size: 18px; font-weight: bold; color: #54656f; }
h4 { margin: 0; color: #111b21; }
small { color: #667781; }
.messages { flex: 1; overflow-y: auto; padding: 16px 7%; display: flex; flex-direction: column; gap: 2px; z-index: 1; }
.row { display: flex; flex-direction: column; margin-bottom: 2px; }
.sent { align-items: flex-end; }
.received { align-items: flex-start; }
.bubble { padding: 6px 12px 8px; border-radius: 8px; max-width: 65%; font-size: 14.2px; box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); }
.sent .bubble { background: #dcf8c6; border-top-right-radius: 0; }
.received .bubble { background: white; border-top-left-radius: 0; }
.bubble b { display: block; font-size: 12px; color: #075e54; margin-bottom: 2px; }
.bubble p { margin: 0; }
.system-msg { align-self: center; background: #e1f3fb; padding: 5px 14px; border-radius: 6px; font-size: 12px; color: #54656f; margin: 8px 0; }
.footer { background: #f0f2f5; padding: 6px 16px 10px; display: flex; flex-direction: column; gap: 6px; z-index: 1; }
.typing-status { min-height: 16px; color: #667781; font-size: 12px; padding-left: 6px; }
.message-input-row { display: flex; align-items: center; gap: 10px; }
.footer input { flex: 1; border: none; padding: 9px 15px; border-radius: 8px; font-size: 15px; outline: none; }
.footer button { border: none; border-radius: 8px; padding: 9px 14px; cursor: pointer; background: #00a884; color: #111b21; font-weight: bold; }
</style>
