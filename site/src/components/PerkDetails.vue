<template>
<div v-if="entry" class="perk-details">
    <div v-if="triggerChips.length || cooldownChips.length" class="perk-details-chips">
        <span v-for="(c, i) in triggerChips" :key="'t' + i" class="perk-chip perk-chip-trigger" :class="c.cls">{{ c.label }}</span>
        <span v-for="(c, i) in cooldownChips" :key="'c' + i" class="perk-chip perk-chip-cooldown" v-tooltip="c.tooltip">
            <LucideTimer :size="11" />{{ c.label }}
        </span>
        <a v-for="syn in synergyChips" :key="'s' + syn.id" class="perk-chip perk-chip-synergy" :href="itemHref(syn.id)" @click.prevent="$emit('navigateToItem', syn.id)">
            <LucideLink :size="11" />{{ syn.label }}
        </a>
    </div>

    <div v-if="entry.scaling && Array.isArray(entry.scaling.values)" class="perk-details-scaling">
        <div class="perk-details-scaling-label">{{ scalingLabel }}</div>
        <div class="perk-details-scaling-table">
            <div v-for="(v, i) in compactedScalingValues" :key="i" class="perk-details-scaling-cell">
                <div class="perk-details-scaling-key">{{ scalingKeyLabel(i) }}</div>
                <div class="perk-details-scaling-val">{{ formatScalingCell(v) }}</div>
            </div>
        </div>
        <div v-if="entry.scaling.formula" class="perk-details-scaling-formula">{{ t('app_perk_formula') }}: <code>{{ entry.scaling.formula }}</code></div>
    </div>

    <ul v-if="passiveBullets.length" class="perk-details-passive">
        <template v-for="(b, i) in passiveBullets" :key="i">
            <li v-if="b.kind === 'header'" class="perk-details-passive-header">{{ b.text }}</li>
            <li v-else class="perk-details-passive-bullet">
                <span v-if="b.label" class="perk-details-passive-label">{{ b.label }}:</span>
                <span class="perk-details-passive-value">{{ b.value }}</span>
                <span v-if="b.suffix" class="perk-details-passive-suffix">{{ b.suffix }}</span>
            </li>
        </template>
    </ul>

    <div v-if="detailTables.length" class="perk-details-disclosure">
        <button class="perk-details-disclosure-btn" @click="expanded = !expanded">
            <LucideChevronRight :size="12" class="perk-details-disclosure-chevron" :class="{ open: expanded }" />
            {{ expanded ? t('app_perk_hide_details') : t('app_perk_show_details') }}
        </button>
        <div v-if="expanded" class="perk-details-disclosure-body">
            <div v-for="(tbl, i) in detailTables" :key="i" class="perk-details-table">
                <div class="perk-details-table-title">{{ tbl.title }}</div>
                <div class="perk-details-table-rows">
                    <div v-for="row in tbl.rows" :key="row.key" class="perk-details-table-row">
                        <span class="perk-details-table-key">{{ row.key }}</span>
                        <span class="perk-details-table-val">{{ row.value }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <p v-if="entry.notes" class="perk-details-notes">{{ entry.notes }}</p>
</div>
</template>

<script>
const TRIGGER_TYPE_LABELS = {
    'on_before_hit': 'app_perk_trigger_on_hit',
    'on_before_hit_and_on_death': 'app_perk_trigger_on_hit_or_kill',
    'on_before_hit_and_on_weapon_fired': 'app_perk_trigger_on_hit_or_fire',
    'on_before_hit_and_per_tick': 'app_perk_trigger_on_hit_or_tick',
    'on_npc_death': 'app_perk_trigger_on_kill',
    'on_before_actor_death': 'app_perk_trigger_on_actor_death',
    'on_item_use': 'app_perk_trigger_on_use',
    'on_item_sell': 'app_perk_trigger_on_sell',
    'passive_per_tick': 'app_perk_trigger_per_tick',
    'passive_per_tick_and_on_before_hit': 'app_perk_trigger_per_tick_or_hit',
    'passive': 'app_perk_trigger_passive',
    'active': 'app_perk_trigger_active',
    'one_shot_activator': 'app_perk_trigger_one_shot',
    'on_before_hit_and_on_weapon_fired': 'app_perk_trigger_on_hit_or_fire',
};

const HIT_TYPE_LABELS = {
    fire_wound: 'Bullet',
    wound: 'Wound',
    strike: 'Strike',
    shock: 'Shock',
    telepatic: 'Psy',
    light_burn: 'Light burn',
    burn: 'Burn',
    chemical_burn: 'Chemical',
    radiation: 'Radiation',
    explosion: 'Explosion',
};

const HIT_TYPE_CLS = {
    fire_wound: 'hit-fire',
    wound: 'hit-wound',
    strike: 'hit-strike',
    shock: 'hit-shock',
    telepatic: 'hit-psy',
    light_burn: 'hit-burn',
    burn: 'hit-burn',
    chemical_burn: 'hit-chem',
    radiation: 'hit-rad',
    explosion: 'hit-explosion',
};

function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function humanizeKey(k) {
    return String(k)
        .replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase());
}

function capitalizeFirst(s) {
    const str = String(s);
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export default {
    name: 'PerkDetails',
    inject: ['t', 'itemHref'],
    props: {
        itemId: { type: String, required: true },
        pbaConstants: { type: Object, default: () => ({}) },
    },
    emits: ['navigateToItem'],
    data() {
        return { expanded: false };
    },
    computed: {
        entry() {
            return this.pbaConstants?.[this.itemId] || null;
        },
        triggerChips() {
            const e = this.entry;
            if (!e || !e.trigger) return [];
            const chips = [];
            const type = e.trigger.type;
            if (type) {
                const key = TRIGGER_TYPE_LABELS[type];
                const label = key ? this.t(key) : humanizeKey(type);
                chips.push({ label, cls: 'trigger-type' });
            }
            const hits = Array.isArray(e.trigger.hitTypes) ? e.trigger.hitTypes : [];
            for (const h of hits) {
                chips.push({ label: HIT_TYPE_LABELS[h] || humanizeKey(h), cls: HIT_TYPE_CLS[h] || '' });
            }
            if (e.trigger.condition) chips.push({ label: capitalizeFirst(e.trigger.condition), cls: 'trigger-cond' });
            if (e.trigger.binding) chips.push({ label: '⌨ ' + e.trigger.binding, cls: 'trigger-cond' });
            if (typeof e.trigger.radius === 'number') chips.push({ label: e.trigger.radius + ' m', cls: 'trigger-cond' });
            if (typeof e.trigger.scanRadius === 'number') chips.push({ label: e.trigger.scanRadius + ' m', cls: 'trigger-cond' });
            if (e.trigger.boneFilter) chips.push({ label: capitalizeFirst(e.trigger.boneFilter), cls: 'trigger-cond' });
            return chips;
        },
        cooldownChips() {
            const cd = this.entry?.cooldown;
            if (cd == null) return [];
            if (typeof cd === 'number') return [{ label: cd + 's', tooltip: this.t('app_perk_cooldown') }];
            if (isPlainObject(cd)) {
                return Object.entries(cd).map(([k, v]) => ({
                    label: humanizeKey(k) + ': ' + (typeof v === 'number' ? v + 's' : v),
                    tooltip: this.t('app_perk_cooldown'),
                }));
            }
            return [];
        },
        synergyChips() {
            const syn = this.entry?.synergy;
            if (!Array.isArray(syn)) return [];
            return syn
                .filter((s) => typeof s === 'string' && s.startsWith('af_'))
                .map((id) => ({ id, label: humanizeKey(id.replace(/^af_/, '')) }));
        },
        scalingLabel() {
            const s = this.entry?.scaling;
            if (!s) return '';
            const stat = humanizeKey(s.stat || 'scaling');
            return stat;
        },
        compactedScalingValues() {
            const s = this.entry?.scaling;
            if (!s || !Array.isArray(s.values)) return [];
            // For 5-value LUTs render all 5. For 10/11-value LUTs sample at edges + midpoint.
            if (s.values.length <= 6) return s.values;
            const last = s.values.length - 1;
            const indices = [0, Math.floor(last / 4), Math.floor(last / 2), Math.floor((3 * last) / 4), last];
            this._sampleIndices = indices;
            return indices.map((i) => s.values[i]);
        },
        passiveBullets() {
            const e = this.entry;
            if (!e || !e.passive) return [];
            const out = [];
            this.walkPassive(e.passive, out, 0);
            return out;
        },
        detailTables() {
            const e = this.entry;
            if (!e) return [];
            const tables = [];

            // Kogot — monster -> meat
            if (isPlainObject(e.monsterToMeat)) {
                tables.push({
                    title: this.t('app_perk_table_meat'),
                    rows: Object.entries(e.monsterToMeat).map(([k, v]) => ({
                        key: humanizeKey(k),
                        value: humanizeKey(v.replace(/^mutant_part_/, '')),
                    })),
                });
            }

            // Moss — per-meat effects
            if (isPlainObject(e.meatEffects)) {
                tables.push({
                    title: this.t('app_perk_table_meat_effects'),
                    rows: Object.entries(e.meatEffects).map(([k, eff]) => ({
                        key: humanizeKey(k.replace(/^mutant_part_/, '')),
                        value: Object.entries(eff).map(([sk, sv]) => `${humanizeKey(sk)} ${sv}`).join('; '),
                    })),
                });
            }

            // Ball — monster tiers
            if (isPlainObject(e.scaling?.tiers)) {
                tables.push({
                    title: this.t('app_perk_table_tiers'),
                    rows: Object.entries(e.scaling.tiers).map(([tier, mons]) => ({
                        key: this.t('app_perk_tier') + ' ' + tier,
                        value: Array.isArray(mons) ? mons.join(', ') : String(mons),
                    })),
                });
            }

            return tables;
        },
    },
    methods: {
        formatScalingCell(v) {
            const unit = this.entry?.scaling?.unit;
            if (!unit) return String(v);
            // % and × multiplier sit flush; word/letter units get a hair space.
            const flush = unit === '%' || unit === 'x' || unit === '×';
            return flush ? `${v}${unit}` : `${v} ${unit}`;
        },
        scalingKeyLabel(i) {
            const s = this.entry?.scaling;
            if (!s || !Array.isArray(s.values)) return '';
            // cocoon-style 0-10 stacks
            if (s.stackRange) {
                if (s.values.length <= 6) return String(s.stackRange[0] + i);
                const indices = this._sampleIndices || [];
                const stackBase = s.stackRange[0];
                return String(stackBase + (indices[i] || 0));
            }
            // default: belt count 1-N
            if (s.values.length <= 6) return String(i + 1);
            const indices = this._sampleIndices || [];
            return String((indices[i] || 0) + 1);
        },
        walkPassive(node, out, depth) {
            if (Array.isArray(node)) {
                for (const item of node) this.walkPassive(item, out, depth);
                return;
            }
            if (!isPlainObject(node)) {
                if (node != null) out.push({ kind: 'bullet', label: '', value: String(node) });
                return;
            }
            // Leaf bullet: has stat + (value or formula)
            if (node.stat && (node.value !== undefined || node.formula !== undefined)) {
                const label = humanizeKey(node.stat);
                let value;
                if (node.value !== undefined) value = String(node.value);
                else value = node.formula;
                if (node.unit) value += ' ' + node.unit;
                const suffixParts = [];
                if (node.perCount) suffixParts.push(this.t('app_perk_per_count'));
                if (node.condition) suffixParts.push('(' + node.condition + ')');
                if (node.scope) suffixParts.push('[' + node.scope + ']');
                out.push({
                    kind: 'bullet',
                    label,
                    value,
                    suffix: suffixParts.length ? suffixParts.join(' ') : null,
                });
                return;
            }
            // Branch object: emit subheaders for each key, recurse
            for (const [k, v] of Object.entries(node)) {
                // Skip nested data exposed via detailTables
                if (k === 'tiers') continue;
                // Faction list: render as one bullet with translated names instead of recursing
                if (k === 'factions' && Array.isArray(v)) {
                    const names = v.map((id) => this.t(String(id).replace(/^actor_/, '')));
                    out.push({
                        kind: 'bullet',
                        label: v.length > 1 ? this.t('app_perk_factions') : this.t('app_perk_faction'),
                        value: names.join(', '),
                    });
                    continue;
                }
                if (depth === 0 || isPlainObject(v) || Array.isArray(v)) {
                    out.push({ kind: 'header', text: humanizeKey(k) });
                }
                if (Array.isArray(v) || isPlainObject(v)) {
                    this.walkPassive(v, out, depth + 1);
                } else if (v != null) {
                    out.push({ kind: 'bullet', label: humanizeKey(k), value: String(v) });
                }
            }
        },
    },
};
</script>

<style scoped>
.perk-details {
    margin-top: 0.55rem;
    padding-top: 0.55rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.85rem;
    color: #c8c8c8;
}

.perk-details-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.4rem;
}

.perk-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    font-size: 0.72rem;
    line-height: 1.4;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #e0e0e0;
    white-space: nowrap;
}

.perk-chip-trigger.trigger-type { background: rgba(80, 130, 220, 0.18); border-color: rgba(80, 130, 220, 0.35); }
.perk-chip-trigger.hit-fire   { background: rgba(220, 100, 60, 0.18); border-color: rgba(220, 100, 60, 0.4); }
.perk-chip-trigger.hit-wound  { background: rgba(190, 70, 70, 0.18); border-color: rgba(190, 70, 70, 0.4); }
.perk-chip-trigger.hit-strike { background: rgba(180, 130, 60, 0.18); border-color: rgba(180, 130, 60, 0.4); }
.perk-chip-trigger.hit-shock  { background: rgba(120, 170, 230, 0.18); border-color: rgba(120, 170, 230, 0.4); }
.perk-chip-trigger.hit-psy    { background: rgba(180, 100, 200, 0.18); border-color: rgba(180, 100, 200, 0.4); }
.perk-chip-trigger.hit-burn   { background: rgba(230, 130, 60, 0.18); border-color: rgba(230, 130, 60, 0.4); }
.perk-chip-trigger.hit-chem   { background: rgba(140, 200, 90, 0.18); border-color: rgba(140, 200, 90, 0.4); }
.perk-chip-trigger.hit-rad    { background: rgba(180, 220, 80, 0.18); border-color: rgba(180, 220, 80, 0.4); }
.perk-chip-trigger.hit-explosion { background: rgba(220, 80, 60, 0.18); border-color: rgba(220, 80, 60, 0.4); }
.perk-chip-trigger.trigger-cond { background: rgba(255, 255, 255, 0.04); }

.perk-chip-cooldown {
    background: rgba(200, 160, 60, 0.15);
    border-color: rgba(200, 160, 60, 0.35);
    color: #ddc88a;
}

.perk-chip-synergy {
    background: rgba(200, 80, 80, 0.18);
    border-color: rgba(200, 80, 80, 0.4);
    color: #f0c8c8;
    text-decoration: none;
}
.perk-chip-synergy:hover { background: rgba(220, 100, 100, 0.28); }

.perk-details-scaling {
    margin: 0.5rem 0;
}

.perk-details-scaling-label {
    font-size: 0.75rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.25rem;
}

.perk-details-scaling-table {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
}

.perk-details-scaling-cell {
    flex: 0 0 auto;
    min-width: 2.6rem;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    text-align: center;
}

.perk-details-scaling-key {
    font-size: 0.65rem;
    color: #888;
    line-height: 1;
}

.perk-details-scaling-val {
    font-size: 0.85rem;
    color: #f0f0f0;
    font-weight: 600;
    margin-top: 0.1rem;
}

.perk-details-scaling-formula {
    margin-top: 0.3rem;
    font-size: 0.7rem;
    color: #888;
}

.perk-details-scaling-formula code {
    background: rgba(255, 255, 255, 0.04);
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
    font-size: 0.7rem;
}

.perk-details-passive {
    margin: 0.4rem 0;
    padding: 0;
    list-style: none;
}

.perk-details-passive-header {
    margin-top: 0.4rem;
    font-size: 0.72rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.perk-details-passive-bullet {
    padding-left: 0.7rem;
    position: relative;
    line-height: 1.5;
    font-size: 0.82rem;
}

.perk-details-passive-bullet::before {
    content: '•';
    position: absolute;
    left: 0;
    color: #666;
}

.perk-details-passive-label {
    color: #aaa;
    margin-right: 0.2rem;
}

.perk-details-passive-value {
    color: #e8e8e8;
    font-variant-numeric: tabular-nums;
}

.perk-details-passive-suffix {
    color: #888;
    margin-left: 0.3rem;
    font-size: 0.75rem;
}

.perk-details-disclosure {
    margin-top: 0.4rem;
}

.perk-details-disclosure-btn {
    background: transparent;
    border: none;
    color: #8aa;
    cursor: pointer;
    font-size: 0.78rem;
    padding: 0.1rem 0;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
}

.perk-details-disclosure-btn:hover { color: #cdd; }

.perk-details-disclosure-chevron {
    transition: transform 0.15s;
}
.perk-details-disclosure-chevron.open { transform: rotate(90deg); }

.perk-details-disclosure-body {
    margin-top: 0.3rem;
    padding-left: 0.6rem;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.perk-details-table {
    margin-bottom: 0.5rem;
}

.perk-details-table-title {
    font-size: 0.72rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.2rem;
}

.perk-details-table-rows {
    display: grid;
    grid-template-columns: minmax(7rem, auto) 1fr;
    gap: 0.15rem 0.75rem;
    font-size: 0.78rem;
}

.perk-details-table-row {
    display: contents;
}

.perk-details-table-key {
    color: #aaa;
}

.perk-details-table-val {
    color: #e0e0e0;
}

.perk-details-notes {
    margin-top: 0.4rem;
    font-size: 0.78rem;
    color: #aaa;
    font-style: italic;
    line-height: 1.5;
}
</style>
