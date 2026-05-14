<template>
  <router-view v-if="authReady" />
  
  <div v-else class="loading">
    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="80">
    <p>Cargando sesión...</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const authReady = ref(false);

onMounted(() => {
  const auth = getAuth();
  onAuthStateChanged(auth, () => {
    authReady.value = true;
  });
});
</script>