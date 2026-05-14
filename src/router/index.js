import { createRouter, createWebHistory } from 'vue-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import LoginPage from '../components/LoginPage.vue';
import RegisterPage from '../components/RegisterPage.vue';
import CompletarPerfil from '../components/CompletarPerfil.vue';
import Chat from '../components/Chat.vue';

// Definimos los avatares válidos
const AVATARES_VALIDOS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Boots",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
];

const routes = [
  { path: '/', redirect: '/chat' },
  { path: '/login', name: 'Login', component: LoginPage },
  { path: '/register', name: 'Register', component: RegisterPage },
  { 
    path: '/completar-perfil', 
    name: 'CompletarPerfil', 
    component: CompletarPerfil,
    meta: { requiresAuth: true }
  },
  { 
    path: '/chat', 
    name: 'Chat', 
    component: Chat, 
    meta: { requiresAuth: true } 
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const removeListener = onAuthStateChanged(getAuth(), (user) => {
        removeListener();
        resolve(user);
      }, reject);
  });
};

router.beforeEach(async (to, from, next) => {
  const user = await getCurrentUser();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  // tiene nombre Y la foto es una de las permitidas
  const tienePerfilValido = user && 
                            user.displayName && 
                            AVATARES_VALIDOS.includes(user.photoURL);

  if (requiresAuth && !user) {
    next('/login');
  } 
  else if (user && (to.path === '/login' || to.path === '/register')) {
    tienePerfilValido ? next('/chat') : next('/completar-perfil');
  }
  else if (user && requiresAuth) {
    if (!tienePerfilValido && to.path !== '/completar-perfil') {
      // Si el perfil no es válido (o la foto no es de la lista), forzamos completar-perfil
      next('/completar-perfil');
    } else if (tienePerfilValido && to.path === '/completar-perfil') {
      // Si ya está todo bien, no le dejamos volver a completar-perfil
      next('/chat');
    } else {
      next();
    }
  } 
  else {
    next();
  }
});

export default router;