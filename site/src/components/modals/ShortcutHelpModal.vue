<template>
<!-- Keyboard Shortcuts Help -->
<Transition name="fade">
<div class="modal-backdrop" v-if="open" @click.self="$emit('close')" style="z-index: 220;">
    <Transition name="modal" appear>
    <div class="modal shortcut-modal" v-if="open">
        <button class="modal-close" @click="$emit('close')">&times;</button>
        <div class="modal-body">
            <h2 class="shortcut-modal-title">{{ t('app_shortcuts_title') }}</h2>
            <div class="shortcut-columns">
                <div class="shortcut-group">
                    <h3>{{ t('app_shortcuts_group_global') }}</h3>
                    <dl class="shortcut-list">
                        <div class="shortcut-row shortcut-row--highlight"><dt><kbd>Ctrl</kbd> <kbd>K</kbd></dt><dd>{{ t('app_shortcuts_quick_nav') }}</dd></div>
                        <div class="shortcut-row shortcut-row--highlight"><dt><kbd>Alt</kbd> <kbd>←</kbd> / <kbd>→</kbd></dt><dd>{{ t('app_shortcuts_nav_tabs') }}</dd></div>
                        <div class="shortcut-row shortcut-row--touch shortcut-row--highlight shortcut-row--touch-highlight"><dt><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5a2 2 0 0 0-2-2a2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h2a6 6 0 0 0 6-6V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="m7 15-1.8-1.8a2 2 0 0 0-2.8 2.8L5 18.8"/></svg> ← / →</dt><dd>{{ t('app_shortcuts_swipe_tabs') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>/</kbd></dt><dd>{{ t('app_shortcuts_search') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>S</kbd></dt><dd>{{ t('app_shortcuts_toggle_sidebar') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>V</kbd></dt><dd>{{ t('app_shortcuts_toggle_view') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>Shift</kbd> <kbd>F</kbd></dt><dd>{{ t('app_shortcuts_toggle_filters') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>C</kbd></dt><dd>{{ t('app_shortcuts_compare') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>X</kbd></dt><dd>{{ t('app_shortcuts_clear_filters') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>G</kbd> {{ t('app_shortcuts_then') }} <kbd>B</kbd></dt><dd>{{ t('app_shortcuts_build_planner') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>Shift</kbd> <kbd>/</kbd></dt><dd>{{ t('app_shortcuts_show_help') }}</dd></div>
                    </dl>
                </div>
                <div class="shortcut-group">
                    <h3>{{ t('app_shortcuts_group_browsing') }}</h3>
                    <dl class="shortcut-list">
                        <div class="shortcut-row"><dt><kbd>[</kbd></dt><dd>{{ t('app_shortcuts_prev_category') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>]</kbd></dt><dd>{{ t('app_shortcuts_next_category') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>Esc</kbd></dt><dd>{{ t('app_shortcuts_close') }}</dd></div>
                    </dl>
                    <h3>{{ t('app_shortcuts_group_item_modal') }}</h3>
                    <dl class="shortcut-list">
                        <div class="shortcut-row"><dt><kbd>&larr;</kbd></dt><dd>{{ t('app_shortcuts_prev_item') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>&rarr;</kbd></dt><dd>{{ t('app_shortcuts_next_item') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>F</kbd></dt><dd>{{ t('app_shortcuts_favorite') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>P</kbd></dt><dd>{{ t('app_shortcuts_pin') }}</dd></div>
                    </dl>
                </div>
            </div>
        </div>
    </div>
    </Transition>
</div>
</Transition>
</template>

<script>
export default {
  name: "ShortcutHelpModal",
  inject: ["t"],
  props: {
    open: Boolean,
  },
  emits: ["close"],
};
</script>
