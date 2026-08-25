import { createRouter, createWebHistory } from 'vue-router'
import AiQuizSetupView from '@/views/AiQuizSetupView.vue'
import AiQuizView from '@/views/AiQuizView.vue'
import CardBrowseCardsView from '@/views/CardBrowseCardsView.vue'
import CardBrowseDecksView from '@/views/CardBrowseDecksView.vue'
import CardBrowseTopicsView from '@/views/CardBrowseTopicsView.vue'
import CardEditorView from '@/views/CardEditorView.vue'
import CardImportView from '@/views/CardImportView.vue'
import DashboardView from '@/views/DashboardView.vue'
import DeckTagManagementView from '@/views/DeckTagManagementView.vue'
import ProfileView from '@/views/ProfileView.vue'
import SettingsView from '@/views/SettingsView.vue'
import StudySessionView from '@/views/StudySessionView.vue'
import StudySetupView from '@/views/StudySetupView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/cards', name: 'card-browse-decks', component: CardBrowseDecksView },
    { path: '/cards/new', name: 'card-create', component: CardEditorView },
    { path: '/cards/import', name: 'card-import', component: CardImportView },
    { path: '/cards/:id/edit', name: 'card-edit', component: CardEditorView },
    { path: '/cards/:deckId', name: 'card-browse-topics', component: CardBrowseTopicsView },
    { path: '/cards/:deckId/:topicId', name: 'card-browse-cards', component: CardBrowseCardsView },
    { path: '/decks', name: 'deck-management', component: DeckTagManagementView },
    { path: '/profile', name: 'profile', component: ProfileView },
    { path: '/study', name: 'study-setup', component: StudySetupView },
    { path: '/study/session', name: 'study-session', component: StudySessionView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/ai-quiz', name: 'ai-quiz-setup', component: AiQuizSetupView },
    { path: '/ai-quiz/session', name: 'ai-quiz-session', component: AiQuizView },
  ],
})

export default router
