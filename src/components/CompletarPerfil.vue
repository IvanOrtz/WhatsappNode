<template>
  <div class="setup-container">
    <div class="setup-card">
      <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" class="logo" alt="Logo">
      <h2>Configura tu Perfil</h2>
      <p>Elige cómo te verán los demás</p>

      <div class="avatar-grid">
        <img v-for="a in avatares" :key="a" :src="a"
             :class="{ active: avatarSel === a }"
             @click="avatarSel = a">
      </div>

      <div class="inputs">
        <input v-model="nombre" @keyup.enter="guardarPerfil" type="text" placeholder="Tu nombre" />
        <input v-model="estado" @keyup.enter="guardarPerfil" type="text" placeholder="Tu estado (ej: Disponible)" />
      </div>

      <button @click="guardarPerfil" :disabled="!avatarSel || !nombre || loading">
        {{ loading ? 'GUARDANDO...' : 'ENTRAR AL CHAT' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getAuth, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const auth = getAuth();
const db = getFirestore();
const router = useRouter();

const nombre = ref("");
const estado = ref("Disponible");
const avatarSel = ref("");
const loading = ref(false);

const avatares = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Boots",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
];

async function guardarPerfil() {
  if (!avatarSel.value || !nombre.value) return;

  loading.value = true;
  const user = auth.currentUser;

  try {
    // 1. Guardamos Nombre y Foto en Firebase Auth
    // Estos datos son los que leerá el Router para dejarte pasar
    await updateProfile(user, {
      displayName: nombre.value,
      photoURL: avatarSel.value
    });

    // 2. Guardamos solo UID y Estado en Firestore
    // No guardamos nombre ni avatar aquí para cumplir con tu requisito
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      estado: estado.value
      // Eliminamos nombre y avatar de esta parte
    });

    router.push('/chat');
  } catch (e) {
    console.error("Error:", e);
    alert("Error al guardar: " + e.message);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.setup-container { 
  height: 100vh; 
  background: #111b21; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
}

.setup-card { 
  background: #222e35; 
  padding: 40px; 
  border-radius: 10px; 
  width: 100%;
  max-width: 400px; 
  text-align: center; 
  color: #e9edef; 
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.logo { width: 50px; margin-bottom: 15px; }

h2 { margin-bottom: 5px; font-weight: 500; }

p { color: #8696a0; margin-bottom: 25px; font-size: 0.9rem; }

.avatar-grid { 
  display: flex; 
  flex-wrap: wrap; 
  justify-content: center; 
  gap: 15px; 
  margin-bottom: 30px; 
}

.avatar-grid img { 
  width: 65px; 
  height: 65px; 
  cursor: pointer; 
  border: 3px solid transparent; 
  border-radius: 50%; 
  transition: all 0.2s ease;
  background: #2a3942;
}

.avatar-grid img:hover { transform: scale(1.05); }

.avatar-grid img.active { 
  border-color: #00a884; 
  transform: scale(1.1); 
  background: #3b4a54;
}

.inputs { margin-bottom: 20px; }

input { 
  width: 100%; 
  padding: 12px 15px; 
  margin-bottom: 15px; 
  background: #2a3942; 
  border: 1px solid #3b4a54; 
  border-radius: 8px; 
  color: white; 
  outline: none; 
  box-sizing: border-box; 
  font-size: 1rem;
}

input:focus { border-color: #00a884; }

button { 
  width: 100%; 
  padding: 14px; 
  background: #00a884; 
  color: #111b21; 
  border: none; 
  border-radius: 25px; 
  font-weight: bold; 
  font-size: 0.9rem;
  cursor: pointer; 
  transition: background 0.3s;
}

button:hover:not(:disabled) { background: #06cf9c; }

button:disabled { 
  opacity: 0.5; 
  cursor: not-allowed; 
}
</style>