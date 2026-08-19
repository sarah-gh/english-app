import { createRouter, createWebHistory } from 'vue-router'
import AiQuizSetupView from '@/views/AiQuizSetupView.vue'
import AiQuizView from '@/views/AiQuizView.vue'
import CardEditorView from '@/views/CardEditorView.vue'
import CardManagementView from '@/views/CardManagementView.vue'
import DashboardView from '@/views/DashboardView.vue'
import DeckTagManagementView from '@/views/DeckTagManagementView.vue'
import ReviewSessionView from '@/views/ReviewSessionView.vue'
import ReviewSetupView from '@/views/ReviewSetupView.vue'
import SettingsView from '@/views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/cards', name: 'card-management', component: CardManagementView },
    { path: '/cards/new', name: 'card-create', component: CardEditorView },
    { path: '/cards/:id/edit', name: 'card-edit', component: CardEditorView },
    { path: '/decks', name: 'deck-management', component: DeckTagManagementView },
    { path: '/review', name: 'review-setup', component: ReviewSetupView },
    { path: '/review/session', name: 'review-session', component: ReviewSessionView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/ai-quiz', name: 'ai-quiz-setup', component: AiQuizSetupView },
    { path: '/ai-quiz/session', name: 'ai-quiz-session', component: AiQuizView },
  ],
})

export default router
