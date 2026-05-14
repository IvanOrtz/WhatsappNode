<template>
  <div class="auth-wrapper">
    <div class="auth-box">
      <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" class="logo">
      <h1>Crear cuenta</h1>
      <p>Unete para empezar a chatear</p>
      <input v-model="email" @keyup.enter="registrar" type="email" placeholder="Correo electronico" />
      <input v-model="password" @keyup.enter="registrar" type="password" placeholder="Contrasena (min. 6 caracteres)" />
      <p v-if="mensaje" class="error-message">{{ mensaje }}</p>
      <button @click="registrar" :disabled="loading">
        {{ loading ? 'Creando cuenta...' : 'REGISTRARSE' }}
      </button>
      <div class="social-buttons">
        <button class="social-button" @click="iniciarSesionProvider(providerGoogle)" :disabled="loading" title="Registrarse con Google">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
        </button>
        <button class="social-button" @click="iniciarSesionProvider(providerTwitter)" :disabled="loading" title="Registrarse con Twitter">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/twitter.svg" alt="Twitter">
        </button>
      </div>
      <div class="footer-links">
        Ya tienes cuenta? <router-link to="/login">Inicia sesion</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, TwitterAuthProvider } from 'firebase/auth';
import { useRouter } from 'vue-router';

const auth = getAuth();
const router = useRouter();
const providerGoogle = new GoogleAuthProvider();
const providerTwitter = new TwitterAuthProvider();

const email = ref("");
const password = ref("");
const loading = ref(false);
const mensaje = ref("");

function redirigirACompletarPerfil() {
  router.push('/completar-perfil');
}

async function iniciarSesionProvider(provider) {
  loading.value = true;
  mensaje.value = "";

  try {
    await signInWithPopup(auth, provider);
    redirigirACompletarPerfil();
  } catch (error) {
    mensaje.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function registrar() {
  mensaje.value = "";

  if (!email.value || !password.value) {
    mensaje.value = "Por favor, rellena todos los campos obligatorio.";
    return;
  }

  loading.value = true;

  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value);
    redirigirACompletarPerfil();
  } catch (error) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        mensaje.value = "Este correo ya esta registrado. Intenta iniciar sesion.";
        break;
      case 'auth/invalid-email':
        mensaje.value = "El formato del correo electronico no es valido.";
        break;
      case 'auth/weak-password':
        mensaje.value = "La contrasena es muy debil. Debe tener al menos 6 caracteres.";
        break;
      case 'auth/network-request-failed':
        mensaje.value = "Error de conexion. Revisa tu internet.";
        break;
      default:
        mensaje.value = "Ocurrio un error inesperado al crear la cuenta.";
        console.error("Error original:", error.code, error.message);
        break;
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-wrapper { height: 100vh; background: #111b21; display: flex; align-items: center; justify-content: center; font-family: sans-serif; }
.auth-box { background: #222e35; padding: 40px; border-radius: 10px; width: 400px; text-align: center; color: #e9edef; }
.logo { width: 60px; margin-bottom: 20px; }
h1 { margin-bottom: 10px; font-size: 24px; }
p { color: #8696a0; margin-bottom: 30px; }
input { width: 100%; padding: 12px; margin-bottom: 15px; background: #2a3942; border: 1px solid #3b4a54; border-radius: 8px; color: white; outline: none; box-sizing: border-box; }
input:focus { border-color: #00a884; }
button { width: 100%; padding: 12px; background: #00a884; color: #111b21; border: none; border-radius: 20px; font-weight: bold; cursor: pointer; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.social-buttons { display: flex; justify-content: center; gap: 16px; margin-top: 18px; }
.social-button { width: 52px; height: 52px; padding: 0; background: #2a3942; border: 1px solid #3b4a54; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.social-button:hover { border-color: #00a884; transform: translateY(-2px); }
.social-button img { width: 26px; height: 26px; }
.error-message { color: #ff6b6b; margin: 0 0 15px; font-size: 14px; }
.footer-links { margin-top: 20px; font-size: 14px; color: #8696a0; }
.footer-links a { color: #00a884; text-decoration: none; font-weight: bold; }
</style>
