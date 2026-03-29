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
                        <div class="shortcut-row shortcut-row--highlight"><dt><kbd>Ctrl</kbd><kbd>K</kbd></dt><dd>{{ t('app_shortcuts_quick_nav') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>/</kbd></dt><dd>{{ t('app_shortcuts_search') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>S</kbd></dt><dd>{{ t('app_shortcuts_toggle_sidebar') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>V</kbd></dt><dd>{{ t('app_shortcuts_toggle_view') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>Shift</kbd><kbd>F</kbd></dt><dd>{{ t('app_shortcuts_toggle_filters') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>C</kbd></dt><dd>{{ t('app_shortcuts_compare') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>X</kbd></dt><dd>{{ t('app_shortcuts_clear_filters') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>G</kbd> {{ t('app_shortcuts_then') }} <kbd>B</kbd></dt><dd>{{ t('app_shortcuts_build_planner') }}</dd></div>
                        <div class="shortcut-row"><dt><kbd>Shift</kbd><kbd>/</kbd></dt><dd>{{ t('app_shortcuts_show_help') }}</dd></div>
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
