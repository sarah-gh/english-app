<script setup lang="ts">
import { computed } from 'vue';
import Add from 'vue-iconsax/dist/components/icons/Add.vue.js';
import AddSquare from 'vue-iconsax/dist/components/icons/AddSquare.vue.js';
import ArrowDown2 from 'vue-iconsax/dist/components/icons/ArrowDown2.vue.js';
import ArrowLeft from 'vue-iconsax/dist/components/icons/ArrowLeft.vue.js';
import ArrowRight2 from 'vue-iconsax/dist/components/icons/ArrowRight2.vue.js';
import Book1 from 'vue-iconsax/dist/components/icons/Book1.vue.js';
import CalendarTick from 'vue-iconsax/dist/components/icons/CalendarTick.vue.js';
import Category2 from 'vue-iconsax/dist/components/icons/Category2.vue.js';
import ClipboardText from 'vue-iconsax/dist/components/icons/ClipboardText.vue.js';
import CloseCircle from 'vue-iconsax/dist/components/icons/CloseCircle.vue.js';
import CloudConnection from 'vue-iconsax/dist/components/icons/CloudConnection.vue.js';
import CloudCross from 'vue-iconsax/dist/components/icons/CloudCross.vue.js';
import Code from 'vue-iconsax/dist/components/icons/Code.vue.js';
import Colorfilter from 'vue-iconsax/dist/components/icons/Colorfilter.vue.js';
import Copy from 'vue-iconsax/dist/components/icons/Copy.vue.js';
import Danger from 'vue-iconsax/dist/components/icons/Danger.vue.js';
import Discover from 'vue-iconsax/dist/components/icons/Discover.vue.js';
import DocumentDownload from 'vue-iconsax/dist/components/icons/DocumentDownload.vue.js';
import DocumentText from 'vue-iconsax/dist/components/icons/DocumentText.vue.js';
import DocumentUpload from 'vue-iconsax/dist/components/icons/DocumentUpload.vue.js';
import Edit2 from 'vue-iconsax/dist/components/icons/Edit2.vue.js';
import Eye from 'vue-iconsax/dist/components/icons/Eye.vue.js';
import EyeSlash from 'vue-iconsax/dist/components/icons/EyeSlash.vue.js';
import Flash from 'vue-iconsax/dist/components/icons/Flash.vue.js';
import Folder2 from 'vue-iconsax/dist/components/icons/Folder2.vue.js';
import Home2 from 'vue-iconsax/dist/components/icons/Home2.vue.js';
import Import from 'vue-iconsax/dist/components/icons/Import.vue.js';
import Logout from 'vue-iconsax/dist/components/icons/Logout.vue.js';
import Minus from 'vue-iconsax/dist/components/icons/Minus.vue.js';
import Play from 'vue-iconsax/dist/components/icons/Play.vue.js';
import ProfileCircle from 'vue-iconsax/dist/components/icons/ProfileCircle.vue.js';
import Refresh from 'vue-iconsax/dist/components/icons/Refresh.vue.js';
import RefreshCircle from 'vue-iconsax/dist/components/icons/RefreshCircle.vue.js';
import SearchNormal1 from 'vue-iconsax/dist/components/icons/SearchNormal1.vue.js';
import Setting2 from 'vue-iconsax/dist/components/icons/Setting2.vue.js';
import Star1 from 'vue-iconsax/dist/components/icons/Star1.vue.js';
import TickCircle from 'vue-iconsax/dist/components/icons/TickCircle.vue.js';
import Trash from 'vue-iconsax/dist/components/icons/Trash.vue.js';
import VolumeHigh from 'vue-iconsax/dist/components/icons/VolumeHigh.vue.js';

/** Statically imported per-icon, so the bundler only ever ships the ~20 Iconsax glyphs this app
 *  actually uses — importing the library's own dynamic `VsxIcon` wrapper instead pulls its whole
 *  ~2000-icon import map into the build, which the PWA's precache then downloads in full. Add new
 *  icons here (matching an Iconsax name from https://vue-iconsax-preview.vercel.app/) as needed. */
const ICONS = {
  Add,
  AddSquare,
  ArrowDown2,
  ArrowLeft,
  ArrowRight2,
  Book1,
  CalendarTick,
  Category2,
  ClipboardText,
  CloseCircle,
  CloudConnection,
  CloudCross,
  Code,
  Colorfilter,
  Copy,
  Danger,
  Discover,
  DocumentDownload,
  DocumentText,
  DocumentUpload,
  Edit2,
  Eye,
  EyeSlash,
  Flash,
  Folder2,
  Home2,
  Import,
  Logout,
  Minus,
  Play,
  ProfileCircle,
  Refresh,
  RefreshCircle,
  SearchNormal1,
  Setting2,
  Star1,
  TickCircle,
  Trash,
  VolumeHigh,
} as const;

const props = withDefaults(
  defineProps<{
    iconName: keyof typeof ICONS;
    size?: string | number;
    color?: string;
    /** Iconsax style variant. Defaults to the thin-stroke "linear" look used across this app. */
    type?: 'linear' | 'outline' | 'twotone' | 'bulk' | 'broken' | 'bold';
    viewBox?: string
  }>(),
  {
    size: 24,
    color: 'currentColor',
    type: 'linear',
    viewBox: '0 0 24 24'
  },
);

const component = computed(() => ICONS[props.iconName]);
</script>

<template>
  <component
    :is="component"
    :size="size"
    :color="color"
    :type="type"
    :viewBox="viewBox"
  />
</template>
