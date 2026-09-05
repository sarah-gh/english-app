<template>
  <section class="relative rounded-2xl border border-card-gold/20 bg-card-surface px-6 p-5">
    <span class="pointer-events-none absolute top-2 left-2 h-4 w-4 rounded-tl border-t border-l border-card-gold/60" />
    <span class="pointer-events-none absolute top-2 right-2 h-4 w-4 rounded-tr border-t border-r border-card-gold/60" />
    <span class="pointer-events-none absolute bottom-2 left-2 h-4 w-4 rounded-bl border-b border-l border-card-gold/60" />
    <span class="pointer-events-none absolute right-2 bottom-2 h-4 w-4 rounded-br border-r border-b border-card-gold/60" />

    <slot />
  </section>
</template>
