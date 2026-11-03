import { createRouter, createWebHashHistory } from 'vue-router'
import { authState, initializeAuth, refreshProfile } from '../stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/bestellen', name: 'order', component: () => import('../views/OrderView.vue'), meta: { auth: true, profile: true } },
    { path: '/ranglijst', name: 'leaderboard', component: () => import('../views/LeaderboardView.vue') },
    { path: '/profiel', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { auth: true } },
    { path: '/commissie', name: 'commission', component: () => import('../views/CommissionView.vue'), meta: { auth: true, admin: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  if (!authState.initialized) {
    await initializeAuth()
  }
  if (authState.user && !authState.profileLoaded) await refreshProfile()
  if (to.name === 'home' && authState.user) {
    return authState.profile?.display_name
      ? { name: 'order' }
      : { name: 'profile' }
  }
  if (to.meta.auth && !authState.user) return { name: 'home' }
  if (to.name === 'profile' && authState.profile?.display_name) return { name: 'order' }
  if (to.meta.profile && !authState.profile?.display_name) return { name: 'profile' }
  if (to.meta.admin && authState.profile?.role !== 'admin') return { name: 'home' }
  return true
})

export default router
