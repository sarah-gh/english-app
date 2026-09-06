<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { sanitizeRichText } from '@/utils/html';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    id?: string;
    placeholder?: string;
    invalid?: boolean;
  }>(),
  {
    id: undefined,
    placeholder: '',
    invalid: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
}>();

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      blockquote: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      strike: false,
    }),
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  editorProps: {
    attributes: { id: props.id ?? '', class: 'rich-text-content' },
  },
  onUpdate: ({ editor }) => emit('update:modelValue', sanitizeRichText(editor.getHTML())),
  onBlur: () => emit('blur'),
});

/** Keeps the editor in sync with external writes to `modelValue`, AI Auto-Fill sets it directly
 *  rather than through the editor. Guarded so the editor's own `onUpdate` emissions don't bounce
 *  back in and reset the cursor/selection mid-typing. */
watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value || value === editor.value.getHTML()) return;
    editor.value.commands.setContent(value, { emitUpdate: false });
  },
);

onBeforeUnmount(() => editor.value?.destroy());

function isActive(name: string, attrs?: Record<string, unknown>) {
  return editor.value?.isActive(name, attrs) ?? false;
}

function toggleHeading(level: 2 | 3) {
  editor.value?.chain().focus().toggleHeading({ level }).run();
}

function setParagraph() {
  editor.value?.chain().focus().setParagraph().run();
}
</script>

<template>
  <div
    class="rich-text-editor bg-card-surface w-full overflow-hidden rounded border text-sm"
    :class="invalid ? 'border-danger/80' : 'border-text/20'"
  >
    <div class="border-text/10 flex flex-wrap items-center gap-1 border-b px-2 py-0.5">
      <button
        type="button"
        title="Bold"
        class="hover:bg-text/10 flex h-7 w-7 items-center justify-center rounded text-sm font-bold"
        :class="isActive('bold') ? 'bg-primary/15 text-primary' : 'text-text/70'"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        B
      </button>
      <button
        type="button"
        title="Italic"
        class="hover:bg-text/10 flex h-7 w-7 items-center justify-center rounded text-sm italic"
        :class="isActive('italic') ? 'bg-primary/15 text-primary' : 'text-text/70'"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        I
      </button>
      <span class="bg-text/15 mx-1 h-4 w-px" />
      <button
        type="button"
        title="Heading 2"
        class="hover:bg-text/10 flex h-7 w-7 items-center justify-center rounded text-xs font-bold"
        :class="isActive('heading', { level: 2 }) ? 'bg-primary/15 text-primary' : 'text-text/70'"
        @click="toggleHeading(2)"
      >
        H2
      </button>
      <button
        type="button"
        title="Heading 3"
        class="hover:bg-text/10 flex h-7 w-7 items-center justify-center rounded text-xs font-bold"
        :class="isActive('heading', { level: 3 }) ? 'bg-primary/15 text-primary' : 'text-text/70'"
        @click="toggleHeading(3)"
      >
        H3
      </button>
      <button
        type="button"
        title="Normal Paragraph"
        class="hover:bg-text/10 flex h-7 w-7 items-center justify-center rounded text-xs font-bold"
        :class="isActive('paragraph') ? 'bg-primary/15 text-primary' : 'text-text/70'"
        @click="setParagraph"
      >
        ¶
      </button>
      <span class="bg-text/15 mx-1 h-4 w-px" />
      <button
        type="button"
        title="Bullet List"
        class="hover:bg-text/10 flex h-7 w-7 items-center justify-center rounded text-sm"
        :class="isActive('bulletList') ? 'bg-primary/15 text-primary' : 'text-text/70'"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        &bull;&#8202;≡
      </button>
      <button
        type="button"
        title="Ordered List"
        class="hover:bg-text/10 flex h-7 w-7 items-center justify-center rounded text-sm"
        :class="isActive('orderedList') ? 'bg-primary/15 text-primary' : 'text-text/70'"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        1.≡
      </button>
    </div>
    <EditorContent
      :editor="editor"
      class="min-h-20 px-3 py-2"
    />
  </div>
</template>

<style>
.rich-text-content {
  min-height: 2rem;
  outline: none;
  line-height: 1.6;
}

.rich-text-content p {
  margin: 0 0 0.5em;
}

.rich-text-content p:last-child {
  margin-bottom: 0;
}

.rich-text-content ul,
.rich-text-content ol {
  margin: 0 0 0.5em;
  padding-left: 1.25em;
}

.rich-text-content ul {
  list-style: disc;
}

.rich-text-content ol {
  list-style: decimal;
}

.rich-text-content h1,
.rich-text-content h2,
.rich-text-content h3,
.rich-text-content h4 {
  margin: 0.7em 0 0.3em;
  color: var(--color-card-gold);
}

.rich-text-content h1:first-child,
.rich-text-content h2:first-child,
.rich-text-content h3:first-child,
.rich-text-content h4:first-child {
  margin-top: 0;
}

.rich-text-content h1 {
  font-family: var(--font-serif);
  font-size: 1.3em;
  font-weight: 700;
}

.rich-text-content h2 {
  font-family: var(--font-serif);
  font-size: 1.15em;
  font-weight: 600;
}

.rich-text-content h3 {
  font-size: 1.05em;
  font-weight: 600;
}

.rich-text-content h4 {
  font-size: 1em;
  font-weight: 600;
}

.rich-text-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: color-mix(in srgb, var(--color-text) 40%, transparent);
}
</style>
