import { createRouter, createWebHistory } from 'vue-router'
import AiQuizSetupView from '@/views/AiQuizSetupView.vue'
import AiQuizView from '@/views/AiQuizView.vue'
import AllCardsView from '@/views/AllCardsView.vue'
import CardBrowseCardsView from '@/views/CardBrowseCardsView.vue'
import CardBrowseDecksView from '@/views/CardBrowseDecksView.vue'
import CardEditorView from '@/views/CardEditorView.vue'
import CardImportView from '@/views/CardImportView.vue'
import DashboardView from '@/views/DashboardView.vue'
import DataManagementView from '@/views/DataManagementView.vue'
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
    { path: '/cards/all', name: 'card-browse-all', component: AllCardsView },
    { path: '/cards/new', name: 'card-create', component: CardEditorView },
    { path: '/cards/import', name: 'card-import', component: CardImportView },
    { path: '/cards/:id/edit', name: 'card-edit', component: CardEditorView },
    {
      path: '/cards/:deckId',
      redirect: (to) => ({ path: '/cards', query: { deck: to.params.deckId } }),
    },
    { path: '/cards/:deckId/:topicId', name: 'card-browse-cards', component: CardBrowseCardsView },
    { path: '/decks', name: 'deck-management', component: DeckTagManagementView },
    { path: '/data-management', name: 'data-management', component: DataManagementView },
    { path: '/profile', name: 'profile', component: ProfileView },
    { path: '/study', name: 'study-setup', component: StudySetupView },
    { path: '/study/session', name: 'study-session', component: StudySessionView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/ai-quiz', name: 'ai-quiz-setup', component: AiQuizSetupView },
    { path: '/ai-quiz/session', name: 'ai-quiz-session', component: AiQuizView },
  ],
})

// Vue Router preserves scroll position across navigations by default; without this the user lands
// mid-page on the next view whenever the previous one had been scrolled down.
router.afterEach(() => {
  window.scrollTo(0, 0)
})

export default router
