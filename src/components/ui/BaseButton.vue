<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const props = withDefaults(
  defineProps<{
    /** primary=solid black CTA, secondary=black outline, ghost=neutral outline, link=underlined text, tile=nav grid tile */
    variant?: 'primary' | 'secondary' | 'ghost' | 'link' | 'tile';
    size?: 'sm' | 'md';
    type?: 'button' | 'submit';
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    /** Dims ghost/link variants to gray-500 for lower-emphasis actions (e.g. "Remove Key"). */
    muted?: boolean;
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
    to: undefined,
  },
);

const isLink = computed(() => Boolean(props.to));
const isDisabled = computed(() => !isLink.value && (props.disabled || props.loading));

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'rounded bg-black text-white hover:bg-gray-800 disabled:bg-gray-300';
    case 'secondary':
      return 'rounded border border-black text-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent';
    case 'ghost':
      return [
        'rounded border',
        props.muted ? 'border-gray-300 text-gray-500' : 'border-gray-300 text-gray-700',
        'hover:border-black hover:text-black disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:hover:border-gray-200 disabled:hover:text-gray-300',
      ].join(' ');
    case 'link':
      return [
        'underline underline-offset-2 hover:no-underline',
        props.muted ? 'text-gray-500 hover:text-black' : 'text-black',
        'disabled:cursor-not-allowed disabled:text-gray-300 disabled:no-underline',
      ].join(' ');
    case 'tile':
      return 'rounded-xl border border-black px-4 py-3 text-center text-black hover:bg-black hover:text-white';
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
