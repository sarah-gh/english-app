<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const props = withDefaults(
  defineProps<{
    /** primary=solid teal CTA, secondary=solid amber CTA, ghost=neutral outline, link=underlined text, tile=nav grid tile */
    variant?: 'primary' | 'secondary' | 'ghost' | 'link' | 'tile';
    size?: 'sm' | 'md';
    type?: 'button' | 'submit';
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    /** Dims ghost/link variants to text/50 for lower-emphasis actions. */
    muted?: boolean;
    /** Recolors primary/ghost/link toward danger red for destructive actions (e.g. "Delete", "Remove Key"). */
    danger?: boolean;
    /** Renders as a RouterLink instead of a <button> when set. */
    to?: string;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
    muted: false,
    danger: false,
    to: undefined,
  },
);

const isLink = computed(() => Boolean(props.to));
const isDisabled = computed(() => !isLink.value && (props.disabled || props.loading));

const variantClasses = computed(() => {
  if (props.danger) {
    switch (props.variant) {
      case 'ghost':
        return 'rounded border border-danger/30 text-danger hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:border-text/10 disabled:text-text/25 disabled:hover:border-text/10 disabled:hover:text-text/25';
      case 'link':
        return 'underline underline-offset-2 hover:no-underline text-danger hover:text-danger/70 disabled:cursor-not-allowed disabled:text-text/25 disabled:no-underline';
      default:
        return 'rounded bg-danger text-background hover:bg-danger/90 disabled:bg-danger/30';
    }
  }
  switch (props.variant) {
    case 'primary':
      return 'rounded bg-primary text-background hover:bg-primary/90 disabled:bg-primary/30';
    case 'secondary':
      return 'rounded bg-secondary text-text hover:bg-secondary/90 disabled:bg-secondary/30 disabled:text-text/30';
    case 'ghost':
      return [
        'rounded border',
        props.muted ? 'border-text/15 text-text/50' : 'border-text/15 text-text/70',
        'hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-text/10 disabled:text-text/25 disabled:hover:border-text/10 disabled:hover:text-text/25',
      ].join(' ');
    case 'link':
      return [
        'underline underline-offset-2 hover:no-underline',
        props.muted ? 'text-text/50 hover:text-primary' : 'text-primary',
        'disabled:cursor-not-allowed disabled:text-text/25 disabled:no-underline',
      ].join(' ');
    case 'tile':
      return 'rounded-xl border border-primary/30 px-4 py-3 text-center text-text hover:bg-primary hover:text-background';
    default:
      return '';
  }
});

const sizeClasses = computed(() => {
  if (props.variant === 'tile') return '';
  if (props.variant === 'link') return props.size === 'sm' ? 'text-xs' : 'text-sm';
  return props.size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
});

/** "link" stays flat — a shadow/press-scale on underlined text doesn't read as a button. */
const tactileClasses = computed(() =>
  props.variant === 'link' ? '' : 'shadow-sm hover:shadow active:scale-[0.98] disabled:shadow-none disabled:active:scale-100',
);
</script>

<template>
  <component
    :is="isLink ? RouterLink : 'button'"
    :to="isLink ? to : undefined"
    :type="!isLink ? type : undefined"
    :disabled="isDisabled"
    class="inline-flex items-center justify-center gap-1.5 font-medium transition duration-150"
    :class="[variantClasses, sizeClasses, tactileClasses, block ? 'w-full' : '']"
  >
    <svg
      v-if="loading"
      class="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
    <slot />
  </component>
</template>
