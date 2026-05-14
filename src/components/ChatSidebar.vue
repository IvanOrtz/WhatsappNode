<template>
  <aside class="sidebar">
    <header class="header-side">
      <img :src="userSession.foto" class="avatar-mini" title="Avatar">
      <div class="user-info-top">
        <strong>{{ userSession.nombre }}</strong>
        <span>{{ userSession.estado }}</span>
      </div>
      <button class="logout-button" @click="emit('cerrar-sesion')">Cerrar sesion</button>
    </header>

    <div class="rooms-list">
      <p class="list-title">SALAS</p>
      <div v-for="sala in salas" :key="sala.id"
           @click="emit('seleccionar-sala', sala)"
           class="room-item"
           :class="{ active: salaActual === sala.id }">
        <div class="avatar-chat emoji">{{ sala.icono }}</div>
        <div class="info">
          <span class="name">{{ sala.nombre }}</span>
          <span class="status">{{ sala.descripcion }}</span>
        </div>
      </div>
    </div>

    <div class="user-list">
      <p class="list-title">USUARIOS CONECTADOS ({{ usuarios.length }})</p>
      <div v-for="usuario in usuarios" :key="usuario.id" class="user-item">
        <img :src="usuario.foto" class="avatar-chat">
        <div class="info">
          <span class="name">{{ usuario.nombreUsuario }}</span>
          <span class="status">{{ usuario.estado }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  userSession: Object,
  usuarios: Array,
  salas: Array,
  salaActual: String
});

const emit = defineEmits(['cerrar-sesion', 'seleccionar-sala']);
</script>

<style scoped>
.sidebar { width: 30%; min-width: 280px; background: white; border-right: 1px solid #d1d7db; display: flex; flex-direction: column; }
.header-side { background: #f0f2f5; padding: 10px 16px; display: flex; align-items: center; gap: 12px; }
.avatar-mini { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #00a884; object-fit: cover; }
.user-info-top { display: flex; flex-direction: column; }
.user-info-top strong { font-size: 15px; color: #111b21; }
.user-info-top span { font-size: 12px; color: #667781; }
.logout-button { margin-left: auto; border: none; border-radius: 8px; padding: 8px 10px; background: rgb(200, 3, 3); color: #111b21; font-size: 12px; font-weight: bold; cursor: pointer; }
.rooms-list { border-bottom: 1px solid #d1d7db; }
.room-item, .user-item { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f0f2f5; }
.room-item { cursor: pointer; }
.user-item { cursor: default; }
.active { background: #ebebeb !important; border-left: 4px solid #00a884; }
.avatar-chat { width: 46px; height: 46px; border-radius: 50%; margin-right: 14px; object-fit: cover; }
.avatar-chat.emoji { display: flex; align-items: center; justify-content: center; background: #dfe5e7; font-size: 18px; font-weight: bold; color: #54656f; }
.info { display: flex; flex-direction: column; overflow: hidden; }
.name { font-weight: 500; color: #111b21; }
.status { font-size: 13px; color: #667781; }
.user-list { flex: 1; overflow-y: auto; }
.list-title { padding: 12px 16px 6px; font-size: 11px; color: #00a884; font-weight: bold; }
</style>
