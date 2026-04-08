<template>
<div class="damage-sim">
  <div class="damage-sim-topbar">
    <div class="damage-sim-credit">
      <LucideHeart :size="12" />
      <span>Based on veerserif's damage <a href="https://github.com/veerserif/gamma-dashboard" target="_blank" rel="noopener">calculator</a>.</span>
    </div>
    <div class="damage-sim-actions">
      <button class="copy-link-btn damage-sim-help-toggle" :class="{ active: showHelp }" @click="showHelp = !showHelp; saveToStorage()">
        <LucideCircleHelp :size="14" />
        <span>{{ t('app_sim_show_help') }}</span>
      </button>
      <button class="copy-link-btn" :class="{ copied: _shareFeedback }" @click="copyShareLink()" v-tooltip="_shareFeedback ? t('app_sim_link_copied') : t('app_sim_copy_link')">
        <LucideLink v-show="!_shareFeedback" :size="16" />
        <svg v-show="_shareFeedback" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <button class="copy-link-btn" @click="resetAll()" v-tooltip="t('app_sim_reset')">
        <LucideTrash2 :size="16" />
      </button>
    </div>
  </div>
  <div class="damage-sim-columns">

    <!-- Left: Inputs -->
    <div class="damage-sim-panel">
      <!-- Loadouts -->
      <div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_loadout_pre') }} {{ gboConstants.silencer_boost || '?' }}x. {{ t('app_sim_help_loadout_post') }}</div>
      <div v-for="(lo, idx) in loadouts" :key="idx" class="damage-sim-loadout-row">
        <span class="damage-sim-loadout-dot" :style="{ background: loadoutColor(idx) }"></span>
        <div class="damage-sim-slot" :class="lo.weapon ? 'filled' : 'empty'" :style="lo.weapon ? { borderLeftColor: loadoutColor(idx) } : {}" @click="openWeaponPicker(idx)" @mouseenter="lo.weapon && $emit('showBuildHover', lo.weapon, $event)" @mousemove="lo.weapon && $emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
          <span v-if="lo.weapon" class="damage-sim-slot-name">{{ tName(lo.weapon) }}</span>
          <span v-if="!lo.weapon" class="damage-sim-slot-hint">{{ t('app_sim_select_weapon') }}</span>
          <button v-if="lo.weapon" class="damage-sim-slot-remove" @click.stop="clearWeapon(idx)">&times;</button>
        </div>
        <div class="damage-sim-slot" :class="[!lo.weapon ? 'empty disabled' : selectedAmmoFor(idx) ? 'filled' : 'empty']" :style="selectedAmmoFor(idx) ? { borderLeftColor: loadoutColor(idx) } : {}" @click="lo.weapon && openAmmoPicker(idx)" @mouseenter="selectedAmmoFor(idx) && $emit('showBuildHover', selectedAmmoFor(idx), $event)" @mousemove="selectedAmmoFor(idx) && $emit('moveBuildHover', $event)" @mouseleave="$emit('hideBuildHover')">
          <span v-if="!lo.weapon" class="damage-sim-slot-hint">{{ t('app_sim_select_ammo') }}</span>
          <span v-else-if="selectedAmmoFor(idx)" class="damage-sim-slot-name">{{ shortAmmoName(tName(selectedAmmoFor(idx)!)) }}</span>
          <span v-else class="damage-sim-slot-hint">{{ t('app_sim_select_ammo') }}</span>
          <button v-if="selectedAmmoFor(idx)" class="damage-sim-slot-remove" @click.stop="clearAmmo(idx)">&times;</button>
        </div>
        <div class="damage-sim-silencer-toggle" @click="lo.silenced = !lo.silenced; saveToStorage()" v-tooltip="t('app_sim_silencer') + (gboConstants.silencer_boost ? ' (' + gboConstants.silencer_boost + 'x)' : '')">
          <span class="toggle-switch" :class="{ on: lo.silenced }"><span class="toggle-knob"></span></span>
        </div>
        <button class="damage-sim-icon-btn" :class="{ 'damage-sim-icon-btn-hidden': !lo.weapon || !canAddLoadout }" @click="lo.weapon && canAddLoadout && copyLoadout(idx)" v-tooltip="t('app_sim_copy_loadout')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </button>
        <button v-if="loadouts.length > 1" class="damage-sim-icon-btn damage-sim-icon-btn-danger" @click="removeLoadout(idx)" v-tooltip="t('app_sim_remove_loadout')">
          <LucideX :size="12" />
        </button>
      </div>
      <button v-if="canAddLoadout" class="damage-sim-add-btn" @click="addLoadout()">
        <LucidePlus :size="12" />
        {{ t('app_sim_add_loadout') }}
      </button>

      <div class="damage-sim-divider"></div>

      <!-- Target -->
      <div class="damage-sim-section-label">{{ t('app_sim_target') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_target') }}</div></div>
      <div class="damage-sim-toggle-group">
        <button :class="{ active: targetType === 'mutant' }" @click="targetType = 'mutant'; saveToStorage()">{{ t('app_sim_target_mutant') }}</button>
        <button :class="{ active: targetType === 'stalker' }" @click="targetType = 'stalker'; saveToStorage()">{{ t('app_sim_target_stalker') }}</button>
      </div>

      <template v-if="targetType === 'mutant'">
        <div class="damage-sim-slot damage-sim-target-slot" :class="selectedMutant ? 'filled' : 'empty'" @click="mutantPickerOpen = true">
          <template v-if="selectedMutant">
            <span class="damage-sim-slot-name">{{ mutantDisplayName(selectedMutant.id) }}</span>
            <button class="damage-sim-slot-remove" @click.stop="selectedMutantId = ''">&times;</button>
          </template>
          <template v-else>
            <span class="damage-sim-slot-hint">{{ t('app_sim_select_target') }}</span>
          </template>
        </div>
        <div class="damage-sim-section-label">{{ t('app_sim_hitzone') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_hitzone_mutant') }}</div></div>
        <div class="damage-sim-toggle-group">
          <button v-for="z in mutantHitzones" :key="z" :class="{ active: hitzone === z }" @click="hitzone = z; saveToStorage()">{{ t('app_sim_hitzone_' + z) }}<span v-if="selectedMutant" class="damage-sim-btn-sub">{{ selectedMutant['hitzone_' + z] }}x</span></button>
        </div>
      </template>

      <template v-if="targetType === 'stalker'">
        <div class="damage-sim-slot damage-sim-target-slot" :class="selectedNpcProfile ? 'filled' : 'empty'" @click="npcPickerOpen = true">
          <template v-if="selectedNpcProfile">
            <span class="damage-sim-slot-name">{{ npcProfileLabel(selectedNpcProfile) }}</span>
            <span class="damage-sim-slot-meta">Body {{ selectedNpcProfile.body_bonearmor }} · Head {{ selectedNpcProfile.head_bonearmor }} · AP Scale {{ selectedNpcProfile.ap_scale }} · Hit Frac {{ selectedNpcProfile.hit_fraction }}</span>
            <button class="damage-sim-slot-remove" @click.stop="selectedNpcProfileId = ''">&times;</button>
          </template>
          <template v-else>
            <span class="damage-sim-slot-hint">{{ t('app_sim_select_target') }}</span>
          </template>
        </div>
        <div class="damage-sim-section-label">{{ t('app_sim_hitzone') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_hitzone') }}</div></div>
        <div class="damage-sim-toggle-group">
          <button v-for="z in stalkerHitzones" :key="z" :class="{ active: hitzone === z }" @click="hitzone = z; saveToStorage()">{{ t('app_sim_hitzone_' + z) }}<span v-if="gboConstants.stalker_hitzones" class="damage-sim-btn-sub">{{ stalkerBoneDamageMult(z, gboConstants) }}x<template v-if="hitzoneApBoost(z)">, +{{ hitzoneApBoost(z) }} AP</template></span></button>
        </div>
        <div class="damage-sim-section-label">{{ t('app_sim_faction') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_faction') }}</div></div>
        <div class="damage-sim-toggle-group">
          <button :class="{ active: faction === 'default' }" @click="faction = 'default'; saveToStorage()">{{ t('app_sim_faction_default') }}<span v-if="gboConstants.faction_resistance" class="damage-sim-btn-sub">{{ resolveFactionRes('default', gboConstants).dmg_res }}x<template v-if="resolveFactionRes('default', gboConstants).ap_res !== resolveFactionRes('default', gboConstants).dmg_res">, {{ resolveFactionRes('default', gboConstants).ap_res }}x AP</template></span></button>
          <button v-for="f in factions" :key="f" :class="{ active: faction === f }" @click="faction = f; saveToStorage()">{{ t('app_sim_faction_' + f) }}<span v-if="gboConstants.faction_resistance" class="damage-sim-btn-sub">{{ resolveFactionRes(f, gboConstants).dmg_res }}x<template v-if="resolveFactionRes(f, gboConstants).ap_res !== resolveFactionRes(f, gboConstants).dmg_res">, {{ resolveFactionRes(f, gboConstants).ap_res }}x AP</template></span></button>
        </div>
      </template>

      <div class="damage-sim-divider"></div>

      <div class="damage-sim-section-label">{{ t('app_sim_distance') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_distance') }}</div></div>
      <div class="damage-sim-range-row">
        <input type="range" v-model.number="distance" min="0" max="300" step="5" @change="saveToStorage()" />
        <span class="damage-sim-range-value">{{ distance }}m</span>
      </div>

      <div class="damage-sim-section-label">{{ t('app_sim_barrel_condition') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_barrel_condition') }}</div></div>
      <div class="damage-sim-range-row">
        <input type="range" v-model.number="barrelCondition" min="0" max="100" step="1" @change="saveToStorage()" />
        <span class="damage-sim-range-value">{{ barrelCondition }}% ({{ barrelConditionCorrected(barrelCondition).toFixed(2) }}x)</span>
      </div>

      <div class="damage-sim-section-label">{{ t('app_sim_difficulty') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_difficulty') }}</div></div>
      <div class="damage-sim-toggle-group">
        <button v-for="d in difficulties" :key="d.key" :class="{ active: difficulty === d.key }" @click="difficulty = d.key; saveToStorage()">{{ t(d.label) }}<span v-if="gboConstants.difficulty" class="damage-sim-btn-sub">{{ gboConstants.difficulty[String(d.key)] }}x</span></button>
      </div>

    </div>

    <!-- Right: Results -->
    <div class="damage-sim-panel">
      <div v-if="activeResults.length" class="damage-sim-results-table-wrap damage-sim-stats-box">
        <table class="damage-sim-results-table">
          <thead>
            <tr>
              <th></th>
              <th v-for="ar in activeResults" :key="'h'+ar.idx" :style="{ color: loadoutColor(ar.idx) }">{{ loadoutLabel(ar.idx) }}</th>
            </tr>
          </thead>
          <tbody v-if="targetType === 'stalker'">
            <tr>
              <td class="damage-sim-table-label">{{ t('app_sim_result_ap') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_ap') }}</div></td>
              <td v-for="ar in activeResults" :key="'ap'+ar.idx">
                <span class="damage-sim-table-val">{{ fmt(ar.result.stalker?.ap) }}</span>
                <span class="damage-sim-table-vs">vs</span>
                <span class="damage-sim-table-val">{{ fmt(ar.result.stalker?.boneArmor) }}</span>
                <span class="damage-sim-pen-icon" :class="ar.result.stalker?.armor?.penetrated ? 'pen' : 'nopen'" v-tooltip="ar.result.stalker?.armor?.penetrated ? t('app_sim_result_pen') : t('app_sim_result_no_pen')">
                  <svg v-if="ar.result.stalker?.armor?.penetrated" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </span>
              </td>
            </tr>
            <tr>
              <td class="damage-sim-table-label">{{ t('app_sim_result_damage') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_damage') }}</div></td>
              <td v-for="ar in activeResults" :key="'dmg'+ar.idx">
                <span class="damage-sim-table-val damage-sim-table-val-primary" :class="compareClass(ar.idx, 'damage')">{{ fmt(ar.result.stalker?.armor?.damage) }}</span>
                <span v-if="hasComparison && compareDelta(ar.idx, 'damage')" class="damage-sim-compare-tag" :class="compareClass(ar.idx, 'damage')">{{ compareDelta(ar.idx, 'damage') }}</span>
                <div v-if="ar.result.stalker?.armor?.minDamage !== undefined" class="damage-sim-table-sub">{{ t('app_sim_non_pen_range') }}: {{ fmt(ar.result.stalker.armor.minDamage) }} &ndash; {{ fmt(ar.result.stalker.armor.maxDamage) }}</div>
              </td>
            </tr>
            <tr>
              <td class="damage-sim-table-label">{{ t('app_sim_result_stk') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_stk') }}</div></td>
              <td v-for="ar in activeResults" :key="'stk'+ar.idx">
                <span class="damage-sim-table-val damage-sim-table-val-primary" :class="compareClass(ar.idx, 'stk')">{{ ar.result.stalker?.stk?.stk }}</span>
                <span v-if="ar.result.stalker?.stk?.minStk !== ar.result.stalker?.stk?.maxStk" class="damage-sim-table-sub">({{ ar.result.stalker?.stk?.minStk }}&ndash;{{ ar.result.stalker?.stk?.maxStk }})</span>
                <span v-if="hasComparison && compareDelta(ar.idx, 'stk')" class="damage-sim-compare-tag" :class="compareClass(ar.idx, 'stk')">{{ compareDelta(ar.idx, 'stk') }}</span>
              </td>
            </tr>
            <tr v-if="activeResults.some(ar => ar.result.stalker?.stp > 1)">
              <td class="damage-sim-table-label">{{ t('app_sim_result_stp') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_stp') }}</div></td>
              <td v-for="ar in activeResults" :key="'stp'+ar.idx">
                <span class="damage-sim-table-val">{{ ar.result.stalker?.stp }}</span>
              </td>
            </tr>
          </tbody>
          <tbody v-if="targetType === 'mutant'">
            <tr>
              <td class="damage-sim-table-label">{{ t('app_sim_result_damage') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_damage_mutant') }}</div></td>
              <td v-for="ar in activeResults" :key="'dmg'+ar.idx">
                <span class="damage-sim-table-val damage-sim-table-val-primary" :class="compareClass(ar.idx, 'damage')">{{ fmt(ar.result.mutant?.damage) }}</span>
                <span v-if="hasComparison && compareDelta(ar.idx, 'damage')" class="damage-sim-compare-tag" :class="compareClass(ar.idx, 'damage')">{{ compareDelta(ar.idx, 'damage') }}</span>
                <div v-if="ar.result.mutant?.critMult > 1" class="damage-sim-crit-badge">{{ t('app_sim_result_crit') }} x{{ ar.result.mutant.critMult }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail toggle -->
      <div v-if="activeResults.length" class="damage-sim-detail-toggle">
        <div class="damage-sim-toggle-group damage-sim-toggle-sm">
          <button :class="{ active: detailView === 'chart' }" @click="detailView = 'chart'">{{ t('app_sim_radar_chart') }}</button>
          <button :class="{ active: detailView === 'breakdown' }" @click="detailView = 'breakdown'">{{ t('app_sim_breakdown') }}</button>
        </div>
      </div>

      <!-- Breakdown table -->
      <div v-if="detailView === 'breakdown' && activeResults.length" class="damage-sim-results-table-wrap damage-sim-stats-box">
        <!-- Mutant breakdown -->
        <table v-if="targetType === 'mutant'" class="damage-sim-results-table">
          <thead><tr>
            <th></th>
            <th v-for="ar in activeResults" :key="'bh'+ar.idx" :style="{ color: loadoutColor(ar.idx) }">{{ loadoutLabel(ar.idx) }}</th>
          </tr></thead>
          <tbody>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_raw_damage') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_raw_damage') }}</div></td><td v-for="ar in activeResults" :key="'rd'+ar.idx"><span class="damage-sim-table-val">{{ fmt(ar.result.mutant?.rawDmg) }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_air_res') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_air_res') }}</div></td><td v-for="ar in activeResults" :key="'ar'+ar.idx"><span class="damage-sim-table-val">&divide; {{ fmt(ar.result.mutant?.airDiv) }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_ammo_mult') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_ammo_mult') }}</div></td><td v-for="ar in activeResults" :key="'am'+ar.idx"><span class="damage-sim-table-val">&times; {{ ar.result.mutant?.ammoMult }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_spec_mult') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_spec_mult') }}</div></td><td v-for="ar in activeResults" :key="'sm'+ar.idx"><span class="damage-sim-table-val">&times; {{ ar.result.mutant?.specMult }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_bone_mult') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_bone_mult') }}</div></td><td v-for="ar in activeResults" :key="'bm'+ar.idx"><span class="damage-sim-table-val">&times; {{ ar.result.mutant?.boneMult }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_barrel') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_barrel') }}</div></td><td v-for="ar in activeResults" :key="'ba'+ar.idx"><span class="damage-sim-table-val">&times; {{ fmt(ar.result.mutant?.barrel) }}</span></td></tr>
            <tr class="damage-sim-table-total"><td class="damage-sim-table-label">{{ t('app_sim_result_damage') }}</td><td v-for="ar in activeResults" :key="'td'+ar.idx"><span class="damage-sim-table-val damage-sim-table-val-primary">{{ fmt(ar.result.mutant?.damage) }}</span></td></tr>
          </tbody>
        </table>

        <!-- Stalker breakdown -->
        <table v-if="targetType === 'stalker'" class="damage-sim-results-table">
          <thead><tr>
            <th></th>
            <th v-for="ar in activeResults" :key="'bh'+ar.idx" :style="{ color: loadoutColor(ar.idx) }">{{ loadoutLabel(ar.idx) }}</th>
          </tr></thead>
          <tbody>
            <tr class="damage-sim-table-section"><td :colspan="activeResults.length + 1">{{ t('app_sim_result_damage') }}</td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_hit_power') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_hit_power') }}</div></td><td v-for="ar in activeResults" :key="'hp'+ar.idx"><span class="damage-sim-table-val">{{ fmt(ar.result.stalker?.breakdown?.hitPower) }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_air_res') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_air_res') }}</div></td><td v-for="ar in activeResults" :key="'ar'+ar.idx"><span class="damage-sim-table-val">&divide; {{ fmt(ar.result.stalker?.breakdown?.airDiv) }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_k_hit') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_k_hit') }}</div></td><td v-for="ar in activeResults" :key="'kh'+ar.idx"><span class="damage-sim-table-val">&times; {{ ar.result.stalker?.breakdown?.kHit }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_bone_mult') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_bone_mult') }}</div></td><td v-for="ar in activeResults" :key="'bm'+ar.idx"><span class="damage-sim-table-val">&times; {{ ar.result.stalker?.breakdown?.boneDmgMult }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_ap_scale') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_ap_scale') }}</div></td><td v-for="ar in activeResults" :key="'as'+ar.idx"><span class="damage-sim-table-val">&times; {{ ar.result.stalker?.breakdown?.apScale }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_barrel') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_barrel') }}</div></td><td v-for="ar in activeResults" :key="'ba'+ar.idx"><span class="damage-sim-table-val">&times; {{ fmt(ar.result.stalker?.breakdown?.barrel) }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_difficulty') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_difficulty') }}</div></td><td v-for="ar in activeResults" :key="'df'+ar.idx"><span class="damage-sim-table-val">&times; {{ ar.result.stalker?.breakdown?.diffMult }}</span></td></tr>
            <tr v-if="activeResults.some(ar => ar.result.stalker?.breakdown?.ammoMult !== 1)"><td class="damage-sim-table-label">{{ t('app_sim_ammo_mult') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_ammo_mult') }}</div></td><td v-for="ar in activeResults" :key="'am'+ar.idx"><span class="damage-sim-table-val">&times; {{ ar.result.stalker?.breakdown?.ammoMult }}</span></td></tr>
            <tr v-if="activeResults.some(ar => ar.result.stalker?.breakdown?.silencerMult !== 1)"><td class="damage-sim-table-label">{{ t('app_sim_silencer_mult') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_silencer_mult') }}</div></td><td v-for="ar in activeResults" :key="'sl'+ar.idx"><span class="damage-sim-table-val">&times; {{ ar.result.stalker?.breakdown?.silencerMult }}</span></td></tr>
            <tr class="damage-sim-table-total"><td class="damage-sim-table-label">{{ t('app_sim_raw_damage') }}</td><td v-for="ar in activeResults" :key="'rd'+ar.idx"><span class="damage-sim-table-val damage-sim-table-val-primary">{{ fmt(ar.result.stalker?.rawDmg) }}</span></td></tr>

            <tr class="damage-sim-table-section"><td :colspan="activeResults.length + 1">{{ t('app_sim_result_ap') }}</td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_base_ap') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_base_ap') }}</div></td><td v-for="ar in activeResults" :key="'kap'+ar.idx"><span class="damage-sim-table-val">{{ fmt(ar.result.stalker?.breakdown?.kAp) }}</span></td></tr>
            <tr v-if="activeResults.some(ar => ar.result.stalker?.breakdown?.apBoost)"><td class="damage-sim-table-label">{{ t('app_sim_ap_boost') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_ap_boost') }}</div></td><td v-for="ar in activeResults" :key="'ab'+ar.idx"><span class="damage-sim-table-val">+ {{ ar.result.stalker?.breakdown?.apBoost || 0 }}</span></td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_difficulty') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_difficulty') }}</div></td><td v-for="ar in activeResults" :key="'df2'+ar.idx"><span class="damage-sim-table-val">&times; {{ ar.result.stalker?.breakdown?.diffMult }}</span></td></tr>
            <tr class="damage-sim-table-total"><td class="damage-sim-table-label">{{ t('app_sim_result_ap') }}</td><td v-for="ar in activeResults" :key="'tap'+ar.idx"><span class="damage-sim-table-val damage-sim-table-val-primary">{{ fmt(ar.result.stalker?.ap) }}</span></td></tr>

            <tr class="damage-sim-table-section"><td :colspan="activeResults.length + 1">{{ t('app_sim_armor_result') }}</td></tr>
            <tr><td class="damage-sim-table-label">{{ t('app_sim_result_damage') }}<div v-if="showHelp" class="damage-sim-help-text">{{ t('app_sim_help_armor_result') }}</div></td>
              <td v-for="ar in activeResults" :key="'ares'+ar.idx">
                <span class="damage-sim-pen-icon" :class="ar.result.stalker?.armor?.penetrated ? 'pen' : 'nopen'" v-tooltip="ar.result.stalker?.armor?.penetrated ? t('app_sim_result_pen') : ar.result.stalker?.armor?.partialPen ? t('app_sim_armor_partial_pen') : t('app_sim_result_no_pen')">
                  <svg v-if="ar.result.stalker?.armor?.penetrated" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </span>
                <span class="damage-sim-table-val">{{ fmt(ar.result.stalker?.armor?.damage) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Radar chart -->
      <div v-if="activeResults.length && detailView === 'chart'" class="damage-sim-radar-wrap">
        <canvas ref="radarCanvas"></canvas>
        <div class="damage-sim-radar-mode">
          <button :class="{ active: radarMode === 'relative' }" @click="radarMode = 'relative'">{{ t('app_sim_radar_each_other') }}</button>
          <button :class="{ active: radarMode === 'category' }" @click="radarMode = 'category'">{{ t('app_sim_radar_same_class') }}</button>
          <button :class="{ active: radarMode === 'global' }" @click="radarMode = 'global'">{{ t('app_sim_radar_all_weapons') }}</button>
        </div>
      </div>

      <div v-if="!results[0] && !results[1]" class="damage-sim-empty-state">
        <LucideCrosshair :size="32" />
        <p>{{ t('app_sim_select_all') }}</p>
      </div>
    </div>

  </div>

  <!-- Picker Modals -->
  <ItemPickerModal :open="weaponPickerSlot >= 0" :title="t('app_sim_weapon')" :placeholder="t('app_sim_search_weapon')" :empty-text="t('app_sim_no_results')" :items="pickerWeapons" :label-fn="(w: any) => tName(w) || w.id" :filter-fn="weaponFilter" @close="weaponPickerSlot = -1; weaponStartingFilter = false" @select="selectWeapon">
    <template #toolbar>
      <button class="damage-sim-picker-filter" :class="{ active: weaponStartingFilter }" @click.stop="toggleStartingFilter()">
        <LucideSlidersHorizontal :size="12" />
        {{ t('app_sim_starting_loadouts') }}
      </button>
    </template>
    <template #item="{ item }">
      <span class="build-picker-item-name">{{ tName(item) }}</span>
      <span class="build-picker-item-type build-picker-type-weapon">{{ item.id }}</span>
    </template>
  </ItemPickerModal>

  <ItemPickerModal :open="ammoPickerSlot >= 0" :title="t('app_sim_ammo')" :placeholder="t('app_sim_search_ammo')" :empty-text="t('app_sim_no_results')" :items="activePickerAmmo" :label-fn="(a: any) => tName(a) || a.id" :filter-fn="ammoFilter" @close="ammoPickerSlot = -1" @select="selectAmmo">
    <template #item="{ item }">
      <span class="build-picker-item-name">{{ tName(item) }}</span>
      <span v-if="isAltAmmoForSlot(item)" class="badge-ammo badge-ammo-alt ammo-alt-tag">ALT</span>
      <span class="build-picker-item-type build-picker-type-ammo">{{ item.id }}</span>
    </template>
  </ItemPickerModal>

  <ItemPickerModal :open="mutantPickerOpen" :title="t('app_sim_target_mutant')" :placeholder="t('app_sim_search_mutant')" :empty-text="t('app_sim_no_results')" :items="uniqueMutants" :label-fn="(m: any) => mutantDisplayName(m.id)" @close="mutantPickerOpen = false" @select="selectMutant" />

  <ItemPickerModal :open="npcPickerOpen" :title="t('app_sim_armor_profile')" :placeholder="t('app_sim_search_armor')" :empty-text="t('app_sim_no_results')" :items="uniqueNpcProfiles" :label-fn="(p: any) => npcProfileLabel(p)" @close="npcPickerOpen = false" @select="selectNpcProfile">
    <template #item="{ item }">
      <span class="build-picker-item-name">{{ npcProfileLabel(item) }}</span>
      <span class="build-picker-item-type">Body {{ item.body_bonearmor }} / Head {{ item.head_bonearmor }}</span>
    </template>
  </ItemPickerModal>

</div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { calcMutantDamage, calcStalkerDetailed, stalkerArmorCalc,
         stalkerShotsToKill, stalkerArmorGroup, shotsToPen, resolveHpNoPenPenalty,
         stalkerBoneDamageMult, resolveFactionRes, barrelConditionCorrected } from '../../js/damage-calc.js';
import ItemPickerModal from './modals/ItemPickerModal.vue';

interface GameItem {
  id: string;
  pda_encyclopedia_name?: string;
  displayName?: string;
  localeName?: string;
  ui_ammo_types?: string;
  st_data_export_ammo_types_alt?: string;
  st_data_export_hit_power?: string;
  st_data_export_k_hit?: string;
  st_data_export_k_ap?: string;
  st_data_export_k_air_resistance?: string;
  st_data_export_projectiles?: string;
  [key: string]: unknown;
}

interface MutantProfile {
  id: string;
  skin_armor: number;
  hit_fraction: number;
  fire_wound_immunity: number;
  hitzone_head: number;
  hitzone_torso: number;
  hitzone_limbs: number;
  hitzone_rear: number;
  [key: string]: unknown;
}

interface NpcArmorProfile {
  id: string;
  visual_item_id?: string;
  hit_fraction: number;
  ap_scale: number;
  body_bonearmor: number;
  head_bonearmor: number;
}

interface GboConstants {
  difficulty: Record<string, number>;
  [key: string]: unknown;
}

interface Loadout {
  weapon: GameItem | null;
  ammoId: string;
  silenced: boolean;
}

interface DifficultyOption {
  key: number;
  label: string;
}

const MAX_LOADOUTS = 5;
const LOADOUT_COLORS = ['#5b8abd', '#c89050', '#b8a048', '#9b6fb0', '#6b9ec8'];

export default defineComponent({
  name: 'DamageSimulator',
  components: { ItemPickerModal },
  props: {
    weaponCategories: { type: Object as PropType<Record<string, GameItem[]>>, default: () => ({}) },
    ammoItems: { type: Array as PropType<GameItem[]>, default: () => [] },
    mutantProfiles: { type: Array as PropType<MutantProfile[]>, default: () => [] },
    npcArmorProfiles: { type: Array as PropType<NpcArmorProfile[]>, default: () => [] },
    gboConstants: { type: Object as PropType<GboConstants>, default: () => ({}) },
    calibersData: { type: Object, default: () => ({}) },
    ballisticRanges: { type: Object as PropType<{ maxDamage?: number, maxAp?: number, maxDps?: number }>, default: () => ({}) },
    hideNoDrop: { type: Boolean, default: true },
    hideUnusedAmmo: { type: Boolean, default: true },
    ammoWeaponsCache: { type: Object as PropType<Record<string, any[]>>, default: () => ({}) },
  },
  emits: ['showBuildHover', 'moveBuildHover', 'hideBuildHover'],
  inject: ['t', 'tName', 'shortAmmoName'],
  data() {
    return {
      loadouts: [
        { weapon: null, ammoId: '', silenced: false },
      ] as Loadout[],
      targetType: 'stalker' as 'mutant' | 'stalker',
      selectedMutantId: '',
      selectedNpcProfileId: '',
      hitzone: 'torso',
      faction: 'default',
      distance: 25,
      barrelCondition: 70,
      difficulty: 3,
      weaponPickerSlot: -1,
      ammoPickerSlot: -1,
      mutantPickerOpen: false,
      npcPickerOpen: false,
      _shareFeedback: false as boolean,
      startingLoadoutIds: null as Set<string> | null,
      weaponStartingFilter: false,
      showHelp: false,
      detailView: 'chart' as 'breakdown' | 'chart',
      radarMode: 'relative' as 'relative' | 'category' | 'global',
    };
  },
  computed: {
    difficulties(): DifficultyOption[] {
      return [
        { key: 1, label: 'app_sim_difficulty_easy' },
        { key: 2, label: 'app_sim_difficulty_medium' },
        { key: 3, label: 'app_sim_difficulty_hard' },
      ];
    },

    allWeapons(): GameItem[] {
      const slugs = ['pistols', 'smgs', 'shotguns', 'rifles', 'snipers'];
      const seen = new Set<string>();
      const weapons: GameItem[] = [];
      for (const slug of slugs) {
        const items = this.weaponCategories[slug];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (!item.ui_ammo_types || seen.has(item.id)) continue;
          if (this.hideNoDrop && item.hasNpcWeaponDrop === false) continue;
          seen.add(item.id);
          weapons.push(item);
        }
      }
      return weapons.sort((a, b) => ((this as any).tName(a) || a.id).localeCompare((this as any).tName(b) || b.id));
    },

    activePickerAmmo(): GameItem[] {
      if (this.ammoPickerSlot < 0) return [];
      return this.compatibleAmmoFor(this.ammoPickerSlot);
    },

    uniqueMutants(): MutantProfile[] {
      const seen = new Map<string, MutantProfile>();
      for (const m of this.mutantProfiles) {
        const type = this.extractMutantType(m.id);
        if (!seen.has(type)) seen.set(type, m);
      }
      return [...seen.values()].sort((a, b) => this.mutantDisplayName(a.id).localeCompare(this.mutantDisplayName(b.id)));
    },

    uniqueNpcProfiles(): NpcArmorProfile[] {
      const seen = new Map<string, NpcArmorProfile>();
      for (const p of this.npcArmorProfiles) {
        const key = `${p.hit_fraction}_${p.ap_scale}_${p.body_bonearmor}_${p.head_bonearmor}`;
        if (!seen.has(key)) seen.set(key, p);
      }
      return [...seen.values()].sort((a, b) => this.npcProfileLabel(a).localeCompare(this.npcProfileLabel(b)));
    },

    selectedMutant(): MutantProfile | null {
      return this.mutantProfiles.find(m => m.id === this.selectedMutantId) || null;
    },

    selectedNpcProfile(): NpcArmorProfile | null {
      return this.npcArmorProfiles.find(p => p.id === this.selectedNpcProfileId) || null;
    },

    mutantHitzones(): string[] { return ['head', 'torso', 'limbs', 'rear']; },
    stalkerHitzones(): string[] { return ['head', 'torso', 'arms', 'legs']; },
    factions(): string[] { return ['greh', 'zombied', 'isg', 'monolith', 'bandit']; },

    results(): (Record<string, any> | null)[] {
      return this.loadouts.map((_, i) => this.calcForSlot(i));
    },

    pickerWeapons(): GameItem[] {
      if (this.weaponStartingFilter && this.startingLoadoutIds) {
        const ids = this.startingLoadoutIds;
        return this.allWeapons.filter(w => ids.has(w.id));
      }
      return this.allWeapons;
    },

    hasComparison(): boolean {
      return this.activeResults.length > 1;
    },

    activeResults(): { idx: number, result: Record<string, any> }[] {
      return this.results
        .map((r, i) => r ? { idx: i, result: r } : null)
        .filter(Boolean) as { idx: number, result: Record<string, any> }[];
    },

    canAddLoadout(): boolean {
      return this.loadouts.length < MAX_LOADOUTS;
    },

    defaultDetailView(): 'chart' | 'breakdown' {
      return this.hasComparison ? 'chart' : 'breakdown';
    },

    // Weapon categories that each loadout weapon belongs to
    loadoutWeaponSlugs(): (string | null)[] {
      const slugs = ['pistols', 'smgs', 'shotguns', 'rifles', 'snipers'];
      return this.loadouts.map(lo => {
        if (!lo.weapon) return null;
        for (const slug of slugs) {
          const items = this.weaponCategories[slug];
          if (Array.isArray(items) && items.some(w => w.id === lo.weapon!.id)) return slug;
        }
        return null;
      });
    },

    // Weapons in same categories as selected loadouts
    categoryWeapons(): GameItem[] {
      const activeSlugs = new Set(this.loadoutWeaponSlugs.filter(Boolean) as string[]);
      if (activeSlugs.size === 0) return this.allWeapons;
      const weapons: GameItem[] = [];
      for (const slug of activeSlugs) {
        const items = this.weaponCategories[slug];
        if (!Array.isArray(items)) continue;
        for (const w of items) {
          if (this.hideNoDrop && w.hasNpcWeaponDrop === false) continue;
          if (w.ui_ammo_types) weapons.push(w);
        }
      }
      return weapons;
    },

    // Weapon stat ranges for radar normalization
    weaponStatRanges(): { accuracy: [number, number], recoil: [number, number], magSize: [number, number] } {
      const pool = this.radarMode === 'category' ? this.categoryWeapons : this.allWeapons;
      let minAcc = 100, maxAcc = 0;
      let minCtrl = 999, maxCtrl = 0;
      let minMag = 999, maxMag = 0;

      for (const w of pool) {
        const acc = parseFloat((w.ui_inv_accuracy as string || '0').replace('%', '')) || 0;
        const rec = parseFloat(w.ui_inv_recoil as string || '0') || 0;
        const mag = parseFloat(w.ui_ammo_count as string || '0') || 0;
        if (acc > 0) { minAcc = Math.min(minAcc, acc); maxAcc = Math.max(maxAcc, acc); }
        if (rec > 0) { minCtrl = Math.min(minCtrl, rec); maxCtrl = Math.max(maxCtrl, rec); }
        if (mag > 0) { minMag = Math.min(minMag, mag); maxMag = Math.max(maxMag, mag); }
      }
      if (minAcc > maxAcc) { minAcc = 0; maxAcc = 100; }
      if (minCtrl > maxCtrl) { minCtrl = 0; maxCtrl = 100; }
      if (minMag > maxMag) { minMag = 0; maxMag = 100; }

      return {
        accuracy: [minAcc, maxAcc],
        recoil: [minCtrl, maxCtrl],
        magSize: [minMag, maxMag],
      };
    },

    radarData(): { labels: string[], datasets: any[], rawValues: number[][] } | null {
      const activeResults = this.results.filter(r => r != null);
      if (activeResults.length === 0) return null;

      const labels = [
        (this as any).t('app_sim_result_damage'),
        (this as any).t('app_sim_result_ap'),
        'DPS',
        (this as any).t('app_sim_radar_accuracy'),
        (this as any).t('app_sim_radar_recoil'),
        (this as any).t('app_sim_radar_range'),
        (this as any).t('app_sim_radar_mag_size'),
      ];

      // Global ranges for normalization
      // Weapon stats: from database min/max
      const ranges = this.weaponStatRanges;
      const br = this.ballisticRanges;
      const globalRanges = {
        damage: [0, br.maxDamage || 1],
        ap: [0, br.maxAp || 0.3],
        dps: [0, br.maxDps || 5],
        accuracy: ranges.accuracy,
        recoil: ranges.recoil,
        range: [0, 100],
        magSize: ranges.magSize,
      };

      const colors = LOADOUT_COLORS;
      const rawValues: number[][] = [];
      const datasets: any[] = [];

      for (let i = 0; i < this.loadouts.length; i++) {
        const res = this.results[i];
        const lo = this.loadouts[i];
        if (!res || !lo.weapon) continue;

        const damage = this.targetType === 'mutant' ? (res.mutant?.damage || 0) : (res.stalker?.armor?.damage || 0);
        const ammo = this.selectedAmmoFor(i);
        const kAp = ammo ? parseFloat(ammo.st_data_export_k_ap || '0') : 0;
        const ap = res.stalker?.ap || kAp * 10;
        const fireRate = parseFloat(lo.weapon.ui_inv_rate_of_fire as string || '0') || 0;
        const dps = damage * fireRate / 60;
        const accuracy = parseFloat((lo.weapon.ui_inv_accuracy as string || '0').replace('%', '')) || 0;
        const control = parseFloat(lo.weapon.ui_inv_recoil as string || '0') || 0; // higher = better control
        const kAirRes = ammo ? parseFloat(ammo.st_data_export_k_air_resistance || '0') : 0;
        const rangeEff = 1 / this.airResDivisorAt(this.distance, kAirRes) * 100;
        const magSize = parseFloat(lo.weapon.ui_ammo_count as string || '0') || 0;

        rawValues.push([damage, ap, dps, accuracy, control, rangeEff, magSize]);
      }

      if (rawValues.length === 0) return null;

      const normalize = (val: number, min: number, max: number): number => {
        if (max <= min) return 50;
        return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
      };

      // Build effective ranges based on mode
      const effectiveRanges = { ...globalRanges };
      if (this.radarMode === 'relative' && rawValues.length > 1) {
        const axisCount = 7;
        const keys: (keyof typeof effectiveRanges)[] = ['damage', 'ap', 'dps', 'accuracy', 'recoil', 'range', 'magSize'];
        for (let j = 0; j < axisCount; j++) {
          let min = Infinity, max = -Infinity;
          for (const vals of rawValues) {
            min = Math.min(min, vals[j]);
            max = Math.max(max, vals[j]);
          }
          if (min === max) {
            continue;
          }
          effectiveRanges[keys[j]] = [0, max];
        }
      }

      let datasetIdx = 0;
      for (let i = 0; i < this.loadouts.length; i++) {
        const res = this.results[i];
        const lo = this.loadouts[i];
        if (!res || !lo.weapon) continue;

        const vals = rawValues[datasetIdx];
        const normalized = [
          normalize(vals[0], effectiveRanges.damage[0], effectiveRanges.damage[1]),
          normalize(vals[1], effectiveRanges.ap[0], effectiveRanges.ap[1]),
          normalize(vals[2], effectiveRanges.dps[0], effectiveRanges.dps[1]),
          normalize(vals[3], effectiveRanges.accuracy[0], effectiveRanges.accuracy[1]),
          normalize(vals[4], effectiveRanges.recoil[0], effectiveRanges.recoil[1]), // control: higher = better
          normalize(vals[5], effectiveRanges.range[0], effectiveRanges.range[1]),
          normalize(vals[6], effectiveRanges.magSize[0], effectiveRanges.magSize[1]),
        ];

        datasets.push({
          label: this.loadoutLabel(i),
          data: normalized,
          borderColor: colors[i],
          backgroundColor: colors[i] + '26',
          pointBackgroundColor: colors[i],
          pointRadius: 3,
          borderWidth: 2,
          fill: true,
        });
        datasetIdx++;
      }

      return { labels, datasets, rawValues };
    },
  },
  methods: {
    stalkerBoneDamageMult(hitzone: string, gbo: any): number {
      return stalkerBoneDamageMult(hitzone, gbo);
    },
    resolveFactionRes(faction: string, gbo: any): { dmg_res: number, ap_res: number } {
      return resolveFactionRes(faction, gbo);
    },
    barrelConditionCorrected(conditionPct: number): number {
      return barrelConditionCorrected(conditionPct);
    },
    hitzoneApBoost(hitzone: string): number {
      const gbo = this.gboConstants;
      if (!gbo?.stalker_hitzones || !gbo?.ap_boost) return 0;
      const zone = gbo.stalker_hitzones[hitzone];
      const group = zone ? zone.group : 'upper_body';
      if (group === 'head') return gbo.ap_boost.head || 0;
      if (group === 'lower_body') return gbo.ap_boost.legs || 0;
      return 0;
    },
    selectedAmmoFor(slot: number): GameItem | null {
      const id = this.loadouts[slot].ammoId;
      return id ? (this.ammoItems.find(a => a.id === id) || null) : null;
    },

    compatibleAmmoFor(slot: number): GameItem[] {
      const weapon = this.loadouts[slot].weapon;
      if (!weapon) return [];
      const types = (weapon.ui_ammo_types || '').split(';').map(s => s.trim()).filter(Boolean);
      const altTypes = (weapon.st_data_export_ammo_types_alt || '').split(';').map(s => s.trim()).filter(Boolean);
      const allTypes = [...types, ...altTypes];
      return this.ammoItems.filter(a => {
        const name = a.pda_encyclopedia_name || a.displayName || '';
        if (!allTypes.some(t => name === t || name.startsWith(t))) return false;
        if (this.hideUnusedAmmo && this.ammoWeaponsCache) {
          const weapons = this.ammoWeaponsCache[a.id];
          if (!weapons || weapons.length === 0) return false;
          if (this.hideNoDrop && !weapons.some((w: any) => !w.noDrop)) return false;
        }
        return true;
      }).sort((a, b) => ((this as any).tName(a) || a.id).localeCompare((this as any).tName(b) || b.id));
    },

    calcForSlot(slot: number): Record<string, any> | null {
      const gbo = this.gboConstants;
      if (!gbo || !gbo.difficulty) return null;
      const weapon = this.loadouts[slot].weapon;
      const ammo = this.selectedAmmoFor(slot);
      if (!weapon || !ammo) return null;

      if (this.targetType === 'mutant') {
        if (!this.selectedMutant) return null;
        const hitPower = parseFloat(weapon.st_data_export_hit_power || '');
        const kHit = parseFloat(ammo.st_data_export_k_hit || '');
        const kAirRes = parseFloat(ammo.st_data_export_k_air_resistance || '');
        const pellets = parseInt(ammo.st_data_export_projectiles || '1') || 1;
        if (isNaN(hitPower) || isNaN(kHit)) return null;
        return { mutant: calcMutantDamage({ hitPower, kHit, pellets, kAirRes, distance: this.distance, barrelCond: this.barrelCondition, difficulty: this.difficulty, ammoId: ammo.id, mutantId: this.selectedMutant.id, hitzone: this.hitzone, mutantProfile: this.selectedMutant, gbo }) };
      }

      if (this.targetType === 'stalker') {
        if (!this.selectedNpcProfile) return null;
        const hitPower = parseFloat(weapon.st_data_export_hit_power || '');
        const kHit = parseFloat(ammo.st_data_export_k_hit || '');
        const kAp = parseFloat(ammo.st_data_export_k_ap || '');
        const kAirRes = parseFloat(ammo.st_data_export_k_air_resistance || '');
        const pellets = parseInt(ammo.st_data_export_projectiles || '1') || 1;
        if (isNaN(hitPower) || isNaN(kHit) || isNaN(kAp)) return null;
        const npc = this.selectedNpcProfile;
        const commonParams = { hitPower, kHit, kAp, pellets, kAirRes, distance: this.distance, barrelCond: this.barrelCondition, difficulty: this.difficulty, ammoId: ammo.id, weaponId: weapon.id, hitzone: this.hitzone, faction: this.faction, silenced: this.loadouts[slot].silenced, apScale: npc.ap_scale };
        const detailed = calcStalkerDetailed({ ...commonParams, gbo });
        const armorGroup = stalkerArmorGroup(this.hitzone);
        const boneArmor = armorGroup === 'head' ? npc.head_bonearmor : npc.body_bonearmor;
        const hpPenalty = resolveHpNoPenPenalty(ammo.id, gbo);
        const armor = stalkerArmorCalc(detailed.ap, detailed.rawDmg, boneArmor, npc.hit_fraction, hpPenalty);
        const stp = shotsToPen(detailed.ap, boneArmor);
        const stk = stalkerShotsToKill(commonParams, npc, gbo);
        return { stalker: { ap: detailed.ap, rawDmg: detailed.rawDmg, boneArmor, armor, stp, stk, breakdown: detailed.breakdown } };
      }
      return null;
    },

    getStatVal(res: Record<string, any> | null, stat: string): number | undefined {
      if (!res) return undefined;
      if (this.targetType === 'mutant') {
        if (stat === 'damage') return res.mutant?.damage;
      } else {
        if (stat === 'damage') return res.stalker?.armor?.damage;
        if (stat === 'stk') return res.stalker?.stk?.stk;
      }
      return undefined;
    },

    compareClass(idx: number, stat: string): string {
      if (!this.hasComparison) return '';
      const vals = this.results.map(r => this.getStatVal(r, stat));
      const defined = vals.filter(v => v != null) as number[];
      if (defined.length < 2) return '';
      const myVal = vals[idx];
      if (myVal == null) return '';
      const higherIsBetter = stat !== 'stk';
      const best = higherIsBetter ? Math.max(...defined) : Math.min(...defined);
      const worst = higherIsBetter ? Math.min(...defined) : Math.max(...defined);
      if (best === worst) return '';
      if (myVal === best) return 'damage-sim-better';
      if (myVal === worst) return 'damage-sim-worse';
      return '';
    },

    compareDelta(idx: number, stat: string): string {
      if (!this.hasComparison) return '';
      const vals = this.results.map(r => this.getStatVal(r, stat));
      const defined = vals.filter(v => v != null) as number[];
      if (defined.length < 2) return '';
      const myVal = vals[idx];
      if (myVal == null) return '';
      const higherIsBetter = stat !== 'stk';
      const best = higherIsBetter ? Math.max(...defined) : Math.min(...defined);
      if (myVal === best && defined.every(v => v === best)) return '';
      const diff = myVal - best;
      if (diff === 0) return '';
      const pct = best !== 0 ? Math.round((diff / Math.abs(best)) * 100) : 0;
      const isBetter = diff === 0;
      const arrow = (higherIsBetter ? diff > 0 : diff < 0) ? '\u25B2' : '\u25BC';
      const sign = diff > 0 ? '+' : '';
      return `${arrow} ${sign}${pct}%`;
    },

    breakdownArrow(idx: number, valA: number | undefined, valB: number | undefined, higherIsBetter = true): string {
      if (!this.hasComparison || valA == null || valB == null || valA === valB) return '';
      const myVal = idx === 0 ? valA : valB;
      const otherVal = idx === 0 ? valB : valA;
      const isBetter = higherIsBetter ? myVal > otherVal : myVal < otherVal;
      return isBetter ? '\u25B2' : '\u25BC';
    },

    breakdownArrowClass(idx: number, valA: number | undefined, valB: number | undefined, higherIsBetter = true): string {
      if (!this.hasComparison || valA == null || valB == null || valA === valB) return '';
      const myVal = idx === 0 ? valA : valB;
      const otherVal = idx === 0 ? valB : valA;
      const isBetter = higherIsBetter ? myVal > otherVal : myVal < otherVal;
      return isBetter ? 'damage-sim-better' : 'damage-sim-worse';
    },

    mutantBreakdownVal(idx: number, key: string): number | undefined {
      return this.results[idx]?.mutant?.[key];
    },

    stalkerBreakdownVal(idx: number, key: string): number | undefined {
      return this.results[idx]?.stalker?.breakdown?.[key];
    },

    airResDivisorAt(distance: number, kAirRes: number): number {
      return 1 + distance / 200 * (kAirRes * 0.5 / (1 - kAirRes + 0.1));
    },

    updateRadarChart(): void {
      const canvas = this.$refs.radarCanvas as HTMLCanvasElement | undefined;
      if (!canvas) return;
      const data = this.radarData;

      if ((this as any)._radarChart) {
        (this as any)._radarChart.destroy();
        (this as any)._radarChart = null;
      }

      if (!data || data.datasets.length === 0) return;

      const rawValues = data.rawValues;
      const labels = data.labels;

      (this as any)._radarChart = new (globalThis as any).Chart(canvas, {
        type: 'radar',
        data: { labels: data.labels, datasets: data.datasets },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              min: 0, max: 100,
              ticks: { display: false, stepSize: 20 },
              grid: { color: '#2a2a2a' },
              angleLines: { color: '#2a2a2a' },
              pointLabels: { color: '#d4d4d4', font: { size: 11 } },
            }
          },
          plugins: {
            legend: { display: data.datasets.length > 1, position: 'top' as const, labels: { color: '#d4d4d4', font: { size: 10 }, usePointStyle: true, pointStyle: 'circle', padding: 12 } },
            tooltip: {
              backgroundColor: '#1a1a1a',
              titleColor: '#d4d4d4',
              bodyColor: '#d4d4d4',
              borderColor: '#2a2a2a',
              borderWidth: 1,
              callbacks: {
                label(ctx: any) {
                  const val = rawValues[ctx.datasetIndex]?.[ctx.dataIndex];
                  const axis = labels[ctx.dataIndex];
                  const fmtVal = val != null ? (val < 1 ? val.toFixed(4) : val.toFixed(1)) : '--';
                  const suffix = axis === labels[5] ? '%' : '';
                  return `${ctx.dataset.label}: ${fmtVal}${suffix}`;
                }
              }
            }
          }
        }
      });
    },

    async loadStartingLoadouts(): Promise<void> {
      if (this.startingLoadoutIds) return;
      try {
        const packId = new URL(window.location.href).pathname.match(/\/db\/([^/]+)/)?.[1] || 'gamma-0.9.4';
        const res = await fetch(`/data/${packId}/starting-loadouts.json`);
        if (!res.ok) return;
        const data = await res.json();
        const ids = new Set<string>();
        for (const faction of (data.factions || [])) {
          for (const item of (faction.items || [])) {
            if (item.id) ids.add(item.id);
          }
        }
        this.startingLoadoutIds = ids;
      } catch { /* ignore */ }
    },

    toggleStartingFilter(): void {
      this.weaponStartingFilter = !this.weaponStartingFilter;
      if (this.weaponStartingFilter) this.loadStartingLoadouts();
    },

    resetAll(): void {
      this.loadouts.splice(0, this.loadouts.length, { weapon: null, ammoId: '', silenced: false });
      this.targetType = 'stalker';
      this.hitzone = 'torso';
      this.faction = 'default';
      this.distance = 25;
      this.barrelCondition = 70;
      this.difficulty = 3;
      // Restore defaults
      const sunrise = this.npcArmorProfiles.find(p =>
        p.visual_item_id === 'stalker_outfit' ||
        (p.visual_item_id?.startsWith('stalker_outfit') && !p.visual_item_id?.includes(',helm'))
      );
      this.selectedNpcProfileId = sunrise ? sunrise.id : '';
      const boar = this.mutantProfiles.find(p => p.id === 'boar_normal');
      this.selectedMutantId = boar ? boar.id : '';
      this.saveToStorage();
    },

    pushUrlParams(): void {
      const url = new URL(window.location.href);
      const p = url.searchParams;
      // Clear old sim params
      for (let i = 0; i < MAX_LOADOUTS; i++) {
        for (const prefix of ['bw','ba','bs']) p.delete(prefix + i);
      }
      for (const k of ['btt','bmid','bnid','bhz','bfc','bdi','bbc','bdf']) p.delete(k);
      // Set current state
      for (let i = 0; i < this.loadouts.length; i++) {
        const lo = this.loadouts[i];
        if (lo.weapon) p.set('bw' + i, lo.weapon.id);
        if (lo.ammoId) p.set('ba' + i, lo.ammoId);
        if (lo.silenced) p.set('bs' + i, '1');
      }
      p.set('btt', this.targetType === 'mutant' ? 'm' : 's');
      if (this.selectedMutantId) p.set('bmid', this.selectedMutantId);
      if (this.selectedNpcProfileId) p.set('bnid', this.selectedNpcProfileId);
      if (this.hitzone !== 'torso') p.set('bhz', this.hitzone);
      if (this.faction !== 'default') p.set('bfc', this.faction);
      if (this.distance !== 25) p.set('bdi', String(this.distance));
      if (this.barrelCondition !== 70) p.set('bbc', String(this.barrelCondition));
      if (this.difficulty !== 3) p.set('bdf', String(this.difficulty));
      window.history.replaceState(null, '', url.toString());
    },

    restoreFromUrl(): boolean {
      const p = new URLSearchParams(window.location.search);
      if (!p.has('bw0')) return false;
      // Restore non-weapon state
      const tt = p.get('btt');
      if (tt === 'm') this.targetType = 'mutant';
      else if (tt === 's') this.targetType = 'stalker';
      if (p.has('bmid')) this.selectedMutantId = p.get('bmid')!;
      if (p.has('bnid')) this.selectedNpcProfileId = p.get('bnid')!;
      if (p.has('bhz')) this.hitzone = p.get('bhz')!;
      if (p.has('bfc')) this.faction = p.get('bfc')!;
      if (p.has('bdi')) this.distance = parseInt(p.get('bdi')!) || 25;
      if (p.has('bbc')) this.barrelCondition = parseInt(p.get('bbc')!) || 70;
      if (p.has('bdf')) this.difficulty = parseInt(p.get('bdf')!) || 3;
      // Stash weapon/ammo IDs for deferred restore
      const savedLoadouts = [];
      for (let i = 0; i < MAX_LOADOUTS; i++) {
        if (p.has('bw' + i) || p.has('ba' + i)) {
          savedLoadouts.push({ weaponId: p.get('bw' + i) || '', ammoId: p.get('ba' + i) || '', silenced: p.get('bs' + i) === '1' });
        }
      }
      if (savedLoadouts.length === 0) savedLoadouts.push({ weaponId: '', ammoId: '', silenced: false });
      this._savedLoadouts = savedLoadouts;
      // Ensure loadouts array matches
      while (this.loadouts.length < savedLoadouts.length) this.loadouts.push({ weapon: null, ammoId: '', silenced: false });
      while (this.loadouts.length > savedLoadouts.length) this.loadouts.pop();
      this.restoreWeaponsFromStorage();
      // Save to localStorage so it persists
      this.saveToStorage();
      return true;
    },

    async copyShareLink(): Promise<void> {
      this.pushUrlParams();
      try {
        await navigator.clipboard.writeText(window.location.href);
        this._shareFeedback = true;
        setTimeout(() => { this._shareFeedback = false; }, 2000);
      } catch { /* fallback: URL is already in address bar */ }
    },

    saveToStorage(): void {
      try {
        const state = {
          loadouts: this.loadouts.map(lo => ({ weaponId: lo.weapon?.id || '', ammoId: lo.ammoId, silenced: lo.silenced })),
          targetType: this.targetType,
          mutantId: this.selectedMutantId,
          npcProfileId: this.selectedNpcProfileId,
          hitzone: this.hitzone,
          faction: this.faction,
          distance: this.distance,
          barrelCondition: this.barrelCondition,
          difficulty: this.difficulty,
          showHelp: this.showHelp,
        };
        localStorage.setItem('damageSimState', JSON.stringify(state));
      } catch (e) { /* quota */ }
      this.pushUrlParams();
    },

    restoreFromStorage(): void {
      // Always restore UI prefs from localStorage (not part of URL sharing)
      try {
        const raw = localStorage.getItem('damageSimState');
        if (raw) {
          const prefs = JSON.parse(raw);
          if (prefs.showHelp != null) this.showHelp = prefs.showHelp;
        }
      } catch (e) { /* ignore */ }

      // URL params take priority (shared link)
      if (this.restoreFromUrl()) return;

      try {
        const raw = localStorage.getItem('damageSimState');
        if (raw) {
          const data = JSON.parse(raw);
          this._savedLoadouts = data.loadouts || null;
          if (this._savedLoadouts) {
            while (this.loadouts.length < this._savedLoadouts.length) this.loadouts.push({ weapon: null, ammoId: '', silenced: false });
            while (this.loadouts.length > this._savedLoadouts.length && this.loadouts.length > 1) this.loadouts.pop();
          }
          if (data.targetType) this.targetType = data.targetType;
          if (data.hitzone) this.hitzone = data.hitzone;
          if (data.faction) this.faction = data.faction;
          if (data.distance != null) this.distance = data.distance;
          if (data.barrelCondition != null) this.barrelCondition = data.barrelCondition;
          if (data.difficulty != null) this.difficulty = data.difficulty;
          if (data.mutantId) this.selectedMutantId = data.mutantId;
          if (data.npcProfileId) this.selectedNpcProfileId = data.npcProfileId;
          if (data.showHelp != null) this.showHelp = data.showHelp;
          // Try weapon restore now (may succeed if data already loaded)
          this.restoreWeaponsFromStorage();
          return;
        }
      } catch (e) { /* ignore */ }

      // Defaults when no saved state
      this._restored = true;
      const sunrise = this.npcArmorProfiles.find(p =>
        p.visual_item_id === 'stalker_outfit' ||
        (p.visual_item_id?.startsWith('stalker_outfit') && !p.visual_item_id?.includes(',helm'))
      );
      if (sunrise) this.selectedNpcProfileId = sunrise.id;

      const boar = this.mutantProfiles.find(p => p.id === 'boar_normal');
      if (boar) this.selectedMutantId = boar.id;
    },

    findWeaponById(id: string): GameItem | null {
      const slugs = ['pistols', 'smgs', 'shotguns', 'rifles', 'snipers'];
      for (const slug of slugs) {
        const items = this.weaponCategories[slug];
        if (!Array.isArray(items)) continue;
        const found = items.find(w => w.id === id);
        if (found) return found;
      }
      return null;
    },

    restoreWeaponsFromStorage(): void {
      const saved = (this as any)._savedLoadouts;
      if (!saved) return;
      const hasData = ['pistols', 'smgs', 'shotguns', 'rifles', 'snipers'].some(
        s => Array.isArray(this.weaponCategories[s]) && this.weaponCategories[s].length > 0
      );
      if (!hasData) return;
      // Ensure loadouts array is the right size
      while (this.loadouts.length < saved.length) this.loadouts.push({ weapon: null, ammoId: '', silenced: false });
      for (let i = 0; i < saved.length; i++) {
        const lo = saved[i];
        if (!lo) continue;
        if (lo.weaponId) {
          const weapon = this.findWeaponById(lo.weaponId);
          if (weapon) this.loadouts[i].weapon = weapon;
        }
        if (lo.ammoId) this.loadouts[i].ammoId = lo.ammoId;
        if (lo.silenced != null) this.loadouts[i].silenced = lo.silenced;
      }
      this._restored = true;
      (this as any)._savedLoadouts = null;
    },

    isAltAmmoForSlot(ammoItem: GameItem): boolean {
      if (this.ammoPickerSlot < 0) return false;
      const weapon = this.loadouts[this.ammoPickerSlot].weapon;
      if (!weapon) return false;
      const altTypes = (weapon.st_data_export_ammo_types_alt || '').split(';').map(s => s.trim()).filter(Boolean);
      if (!altTypes.length) return false;
      const name = ammoItem.pda_encyclopedia_name || ammoItem.displayName || '';
      return altTypes.some(t => name === t || name.startsWith(t));
    },

    loadoutColor(idx: number): string {
      return LOADOUT_COLORS[idx % LOADOUT_COLORS.length];
    },

    loadoutLabel(slot: number): string {
      const lo = this.loadouts[slot];
      if (!lo.weapon) return '';
      const wpn = (this as any).tName(lo.weapon) || lo.weapon.id;
      const ammo = this.selectedAmmoFor(slot);
      if (!ammo) return wpn;
      return wpn + ' + ' + (this as any).shortAmmoName((this as any).tName(ammo));
    },

    openWeaponPicker(slot: number): void { this.weaponPickerSlot = slot; },
    openAmmoPicker(slot: number): void { this.ammoPickerSlot = slot; },

    weaponFilter(w: GameItem, q: string): boolean {
      const name = (w.localeName || (this as any).tName(w) || w.id).toLowerCase();
      return name.includes(q) || w.id.toLowerCase().includes(q);
    },
    ammoFilter(a: GameItem, q: string): boolean {
      const name = (a.localeName || (this as any).tName(a) || a.id).toLowerCase();
      return name.includes(q) || a.id.toLowerCase().includes(q);
    },
    selectWeapon(w: GameItem): void {
      if (this.weaponPickerSlot >= 0) {
        this.loadouts[this.weaponPickerSlot].weapon = w;
        this.loadouts[this.weaponPickerSlot].ammoId = '';
        this.weaponPickerSlot = -1;
        this.saveToStorage();
      }
    },
    clearWeapon(slot: number): void {
      this.loadouts[slot].weapon = null;
      this.loadouts[slot].ammoId = '';
      this.saveToStorage();
    },
    selectAmmo(a: GameItem): void {
      if (this.ammoPickerSlot >= 0) {
        this.loadouts[this.ammoPickerSlot].ammoId = a.id;
        this.ammoPickerSlot = -1;
        this.saveToStorage();
      }
    },
    addLoadout(): void {
      if (this.loadouts.length >= MAX_LOADOUTS) return;
      this.loadouts.push({ weapon: null, ammoId: '', silenced: false });
      this.saveToStorage();
    },

    removeLoadout(idx: number): void {
      if (this.loadouts.length <= 1) return;
      this.loadouts.splice(idx, 1);
      this.saveToStorage();
    },

    copyLoadout(fromSlot: number): void {
      if (this.loadouts.length >= MAX_LOADOUTS) return;
      const from = this.loadouts[fromSlot];
      this.loadouts.push({ weapon: from.weapon, ammoId: from.ammoId, silenced: from.silenced });
      this.saveToStorage();
    },

    clearAmmo(slot: number): void {
      this.loadouts[slot].ammoId = '';
      this.saveToStorage();
    },
    selectMutant(m: MutantProfile): void {
      this.selectedMutantId = m.id;
      this.mutantPickerOpen = false;
      this.saveToStorage();
    },
    selectNpcProfile(p: NpcArmorProfile): void {
      this.selectedNpcProfileId = p.id;
      this.npcPickerOpen = false;
      this.saveToStorage();
    },
    fmt(n: number | null | undefined): string {
      if (n == null || isNaN(n)) return '\u2014';
      if (Math.abs(n) < 0.0001) return '0';
      return n < 1 ? n.toFixed(4) : n.toFixed(2);
    },
    extractMutantType(id: string): string {
      const match = id.match(/(?:m_|agru_|arena_)?([\w]+?)(?:_\d+|_normal|_strong|_weak|_e)?$/);
      return match ? match[1] : id;
    },
    mutantDisplayName(id: string): string {
      const type = this.extractMutantType(id);
      return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
    },
    npcProfileLabel(p: NpcArmorProfile): string {
      const items = p.visual_item_id || '';
      const t = (this as any).t;
      const parts = items.split(',').map(s => {
        const id = s.trim();
        // Try: id_name, st_id_name, id (raw key)
        for (const key of [id + '_name', 'st_' + id + '_name', id]) {
          const translated = t(key);
          if (translated !== key) return translated;
        }
        return id.replace(/_/g, ' ');
      });
      return parts.join(' + ') || p.id.split('\\').pop() || p.id;
    },
  },
  mounted() {
    this.restoreFromStorage();
  },
  beforeUnmount() {
    if ((this as any)._radarChart) {
      (this as any)._radarChart.destroy();
      (this as any)._radarChart = null;
    }
  },
  watch: {
    allWeapons(weapons: GameItem[]): void {
      if (weapons.length > 0 && !this._restored) {
        this.restoreWeaponsFromStorage();
      }
    },
    radarData: {
      deep: true,
      handler(): void {
        clearTimeout((this as any)._radarDebounce);
        (this as any)._radarDebounce = setTimeout(() => {
          this.$nextTick(() => this.updateRadarChart());
        }, 80);
      },
    },
    detailView(val: string): void {
      if (val === 'chart') {
        this.$nextTick(() => this.updateRadarChart());
      }
    },
  },
});
</script>

<style scoped>
.damage-sim {
  padding: 0 1rem 2rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.damage-sim-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.damage-sim-credit {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6rem;
  color: var(--text-secondary);
}
.damage-sim-actions {
  display: flex;
  gap: 0.4rem;
}
.damage-sim-actions .copy-link-btn {
  border-radius: 4px;
}
.damage-sim-credit a {
  color: var(--accent-dim);
  text-decoration: none;
}
.damage-sim-credit a:hover {
  color: var(--accent);
  text-decoration: underline;
}
.damage-sim-credit svg {
  color: var(--color-red-warm-soft);
}
.damage-sim-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}
@media (max-width: 900px) {
  .damage-sim-columns { grid-template-columns: 1fr; }
}

/* Panels */
.damage-sim-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Loadout row: single line */
.damage-sim-loadout-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.damage-sim-icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.15rem;
  border-radius: 3px;
  display: flex;
  align-items: center;
  transition: color 0.15s, background 0.15s;
}
.damage-sim-icon-btn:hover {
  color: var(--accent);
  background: var(--color-accent-tint-8);
}
.damage-sim-icon-btn-hidden {
  visibility: hidden;
}
.damage-sim-icon-btn-danger:hover {
  color: var(--color-red-vibrant);
  background: var(--color-red-vibrant-tint-10);
}

/* Add loadout button */
.damage-sim-add-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: 2px dashed var(--color-overlay-white-15);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  align-self: flex-start;
}
.damage-sim-add-btn:hover {
  color: var(--accent);
  border-color: var(--accent-dim);
}

/* Loadout row */
.damage-sim-loadout-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.damage-sim-loadout-row .damage-sim-slot {
  flex: 1;
  min-width: 0;
}


/* Comparison highlights */
.damage-sim-better { color: var(--color-green-positive) !important; }
.damage-sim-worse { color: var(--color-red-warm-soft) !important; }

/* Compare tag (inline percentage delta) */
.damage-sim-compare-tag {
  font-family: var(--mono);
  font-size: 0.55rem;
  font-weight: 600;
  margin-left: 0.5rem;
  padding: 0.05rem 0.3rem;
  border-radius: 2px;
}
.damage-sim-compare-tag.damage-sim-better {
  background: var(--color-green-positive-tint-10);
}
.damage-sim-compare-tag.damage-sim-worse {
  background: var(--color-red-warm-soft-tint-10);
}

/* Section labels */
.damage-sim-section-label {
  font-size: 0.55rem;
  color: var(--accent-dim);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 600;
  margin-top: 0.25rem;
}

.damage-sim-silencer-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

/* Slots */
.damage-sim-slot {
  position: relative;
  border-radius: 4px;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  min-height: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
}
.damage-sim-slot.filled {
  background: var(--card-raised);
  border: 2px solid var(--border);
}
.damage-sim-slot.filled:hover {
  border-color: var(--accent-dim);
  background: var(--color-accent-tint-5);
}
.damage-sim-slot.empty {
  border: 2px dashed var(--color-overlay-white-15);
  display: flex;
  align-items: center;
  justify-content: center;
}
.damage-sim-slot.empty:hover {
  border-color: var(--accent-dim);
  background: var(--color-accent-tint-5);
}
.damage-sim-slot.disabled {
  opacity: 0.4;
  pointer-events: none;
}
.damage-sim-slot.filled { border-left: 3px solid var(--border); }
.damage-sim-slot-name {
  font-size: 0.7rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 1rem;
}
.damage-sim-target-slot {
  height: 2.8rem;
}
.damage-sim-slot-meta {
  font-size: 0.6rem;
  color: var(--text-secondary);
  margin-top: 0.05rem;
}
.damage-sim-slot-hint {
  font-size: 0.65rem;
  color: var(--text-secondary);
}
.damage-sim-slot-remove {
  position: absolute;
  top: 0.15rem;
  right: 0.3rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.15rem 0.25rem;
  border-radius: 3px;
  transition: color 0.15s, background 0.15s;
}
.damage-sim-slot-remove:hover {
  color: var(--color-red-vibrant);
  background: var(--color-red-vibrant-tint-10);
}

/* Toggle groups */
.damage-sim-toggle-group {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.damage-sim-toggle-group button {
  flex: 1;
  padding: 0.3rem 0.4rem;
  border: none;
  background: var(--card);
  color: var(--text-secondary);
  font-size: 0.65rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 600;
}
.damage-sim-toggle-group button + button {
  border-left: 1px solid var(--border);
}
.damage-sim-toggle-group button:hover {
  color: var(--text);
}
.damage-sim-toggle-group button.active {
  color: var(--accent);
  border-color: var(--accent-dim);
  background: var(--color-accent-tint-8);
}

/* Sub-line values in toggle buttons */
.damage-sim-btn-sub {
  display: block;
  font-size: 0.5rem;
  font-weight: 400;
  opacity: 0.7;
  margin-top: 0.1rem;
  letter-spacing: 0;
}

/* Range rows */
.damage-sim-range-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.damage-sim-range-row input[type="range"] {
  flex: 1;
  accent-color: var(--accent);
  height: 4px;
}
.damage-sim-range-value {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--text);
  min-width: 3rem;
  text-align: right;
}


/* Picker filter button — matches toggle-switch style */
.damage-sim-picker-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.65rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  flex-shrink: 0;
  height: 1.75rem;
}
.damage-sim-picker-filter:hover {
  color: var(--text);
  border-color: var(--accent-dim);
}
.damage-sim-picker-filter.active {
  color: var(--accent);
  border-color: var(--accent-dim);
  background: var(--color-accent-tint-8);
}

/* Divider */
.damage-sim-divider {
  height: 1px;
  background: var(--border);
  margin: 0.25rem 0;
}

/* Stats boxes */
.damage-sim-stats-box {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.damage-sim-stats-header {
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-secondary);
}
.damage-sim-stats-body {
  padding: 0.5rem 0.6rem;
}
.damage-sim-big-value {
  font-family: var(--mono);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}
.damage-sim-stat-range {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
}
.damage-sim-ap-row {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}
.damage-sim-ap-vs {
  font-size: 0.6rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

/* Pen icon */
.damage-sim-pen-icon {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-right: 0.25rem;
}
.damage-sim-pen-icon.pen { color: var(--color-green-positive); }
.damage-sim-pen-icon.nopen { color: var(--color-red-warm-soft); }

/* Pen badge */
.damage-sim-pen-badge {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  margin-top: 0.35rem;
}
.damage-sim-pen-badge.pen {
  background: var(--color-green-positive-tint-12);
  color: var(--color-green-positive);
}
.damage-sim-pen-badge.nopen {
  background: var(--color-red-warm-soft-tint-12);
  color: var(--color-red-warm-soft);
}

/* Crit badge */
.damage-sim-crit-badge {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  margin-top: 0.35rem;
  background: var(--color-accent-tint-12);
  color: var(--accent);
}

/* Stat breakdown rows */
.damage-sim-stat-rows {
  padding: 0.25rem 0.6rem 0.4rem;
}
.damage-sim-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.15rem 0;
  border-bottom: 1px solid var(--color-overlay-border-50);
  font-size: 0.65rem;
}
.damage-sim-stat-row span:first-child {
  color: var(--text-secondary);
}
.damage-sim-stat-row span:last-child {
  font-family: var(--mono);
  text-align: right;
  color: var(--text);
}
.damage-sim-stat-row-total {
  border-top: 1px solid var(--border);
  margin-top: 0.15rem;
  padding-top: 0.25rem;
  font-weight: 600;
}
.damage-sim-stat-row-total span:first-child {
  color: var(--text);
}
.damage-sim-breakdown-section {
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--accent-dim);
  margin-top: 0.4rem;
  margin-bottom: 0.15rem;
}
.damage-sim-breakdown-section:first-child {
  margin-top: 0;
}

/* Results table */
.damage-sim-results-table-wrap {
  overflow-x: auto;
}
.damage-sim-results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.7rem;
  table-layout: fixed;
}
.damage-sim-results-table th {
  font-size: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 0.3rem 0.4rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 8rem;
}
.damage-sim-results-table td {
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--color-overlay-border-50);
  vertical-align: top;
}
.damage-sim-table-label {
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 6rem;
}
.damage-sim-table-val {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text);
}
.damage-sim-table-val-primary {
  font-weight: 700;
  font-size: 0.85rem;
}
.damage-sim-table-vs {
  font-size: 0.5rem;
  color: var(--text-secondary);
  margin: 0 0.2rem;
}
.damage-sim-table-sub {
  font-size: 0.55rem;
  color: var(--text-secondary);
  font-family: var(--mono);
}

.damage-sim-table-section td {
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--accent-dim);
  padding-top: 0.5rem;
  padding-bottom: 0.15rem;
  border-bottom: 1px solid var(--accent-dim);
}
.damage-sim-table-total td {
  border-top: 1px solid var(--border);
  font-weight: 600;
}
.damage-sim-table-total .damage-sim-table-label {
  color: var(--text);
}

/* Help toggle — extends .copy-link-btn */
.damage-sim-help-toggle {
  width: auto;
  gap: 0.3rem;
  padding: 0 0.5rem;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.damage-sim-help-toggle:hover {
  color: #8db8d8;
  border-color: #6a9bbe;
}
.damage-sim-help-toggle.active {
  color: #8db8d8;
  border-color: #6a9bbe;
  background: rgba(80, 130, 170, 0.12);
}

/* Help text — inline callout */
.damage-sim-help-text {
  font-size: 0.65rem;
  color: #a0b8d0;
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
  white-space: normal;
  line-height: 1.4;
  margin-top: 0.35rem;
  padding: 0.35rem 0.5rem 0.35rem 1.5rem;
  background: rgba(80, 130, 170, 0.08);
  border: 1px solid rgba(100, 145, 180, 0.2);
  border-radius: 4px;
  position: relative;
}
.damage-sim-help-text::before {
  content: '';
  position: absolute;
  left: 0.4rem;
  top: 0.4rem;
  width: 0.7rem;
  height: 0.7rem;
  background: currentColor;
  opacity: 0.5;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 16v-4'/%3E%3Cpath d='M12 8h.01'/%3E%3C/svg%3E") center / contain no-repeat;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 16v-4'/%3E%3Cpath d='M12 8h.01'/%3E%3C/svg%3E") center / contain no-repeat;
}
.damage-sim-table-label:has(.damage-sim-help-text) {
  white-space: normal;
  overflow: visible;
  max-width: none;
}
.damage-sim-table-label .damage-sim-help-text {
  border: none;
  background: none;
  padding: 0;
  margin-top: 0.1rem;
  border-radius: 0;
  font-size: 0.6rem;
  opacity: 0.85;
  position: static;
}
.damage-sim-table-label .damage-sim-help-text::before {
  display: none;
}

/* Detail toggle */
.damage-sim-detail-toggle {
  grid-column: 1 / -1;
  margin-top: 0.25rem;
}
.damage-sim-toggle-sm button {
  padding: 0.2rem 0.5rem;
  font-size: 0.55rem;
}

/* Radar chart */
.damage-sim-radar-wrap {
  width: 100%;
  max-width: 500px;
  margin: 0.5rem auto 0;
}
.damage-sim-radar-mode {
  display: flex;
  justify-content: center;
  gap: 0;
  margin-top: 0.25rem;
}
.damage-sim-radar-mode button {
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.2rem 0.6rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.damage-sim-radar-mode button:first-child {
  border-radius: 3px 0 0 3px;
}
.damage-sim-radar-mode button:not(:first-child) {
  border-left: none;
}
.damage-sim-radar-mode button:last-child {
  border-radius: 0 3px 3px 0;
}
.damage-sim-radar-mode button.active {
  color: var(--accent);
  border-color: var(--accent-dim);
  background: var(--color-accent-tint-8);
  z-index: 1;
  position: relative;
  border-left: 1px solid var(--accent-dim);
}
.damage-sim-radar-mode button:hover {
  color: var(--text);
}


/* Empty state */
.damage-sim-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  color: var(--text-secondary);
  opacity: 0.5;
  grid-column: 1 / -1;
}
.damage-sim-empty-state p {
  font-size: 0.75rem;
  margin: 0;
}
</style>
