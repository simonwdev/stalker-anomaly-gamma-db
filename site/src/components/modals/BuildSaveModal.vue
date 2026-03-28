<template>
<!-- Build Save Name modal -->
<Transition name="fade">
<div class="modal-backdrop" v-if="open" @click.self="$emit('close')" style="z-index: 210;">
    <Transition name="modal" appear>
    <div class="modal build-save-modal" v-if="open">
        <button class="modal-close" @click="$emit('close')">&times;</button>
        <div class="modal-body">
            <h2 class="build-picker-title">{{ t('app_build_save') }}</h2>
            <div class="build-save-form">
                <input type="text" :value="buildSaveName" @input="$emit('update:buildSaveName', $event.target.value)" :placeholder="t('app_build_name_placeholder')" class="build-save-input" ref="buildSaveInput" @keydown.enter="$emit('save')">
                <button class="build-toolbar-btn" @click="$emit('save')" :disabled="!buildSaveName.trim()">{{ t('app_build_save') }}</button>
            </div>
        </div>
    </div>
    </Transition>
</div>
</Transition>
</template>

<script>
export default {
  name: "BuildSaveModal",
  inject: ["t"],
  props: {
    open: Boolean,
    buildSaveName: String,
  },
  emits: ["close", "update:buildSaveName", "save"],
  watch: {
    open(val) {
      if (val) {
        this.$nextTick(() => {
          setTimeout(() => {
            const input = this.$refs.buildSaveInput;
            if (input) { input.focus(); input.select(); }
          }, 50);
        });
      }
    },
  },
};
</script>
