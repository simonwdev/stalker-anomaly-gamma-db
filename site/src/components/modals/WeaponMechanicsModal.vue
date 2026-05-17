<template>
<Transition name="fade">
<div class="modal-backdrop" v-if="open" @click.self="$emit('close')" style="z-index: 220;">
    <Transition name="modal" appear>
    <div class="modal wm-modal" v-if="open">
        <button class="modal-close" @click="$emit('close')">&times;</button>
        <div class="modal-body">
            <h2 class="wm-title">
                <svg class="wm-title-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                Weapon Mechanics Guide
            </h2>

            <!-- Section 1: Stat Card -->
            <div class="wm-source">
                Taken from the <a class="wm-link" href="https://discord.com/channels/912320241713958912/976570969768476753/1400944581960274011" target="_blank" rel="noopener noreferrer">GAMMA channel</a>
            </div>
            <div class="wm-section">
                <h3 class="wm-section-title">📋 Stat Card: What Do They Mean?</h3>
                <ul class="wm-list">
                    <li>
                        <span class="wm-stat-name">Accuracy</span>
                        Measures the amplitude of the weapon's ADS aim cone. At <code>0%</code> the cone is <code>1.5°</code> wide; at <code>100%</code> the cone is <code>0°</code>.
                    </li>
                    <li>
                        <span class="wm-stat-name">Handling</span>
                        <span class="wm-muted">Literally means nothing on the stat card itself.</span> Its effect is only visible through upgrades (see below).
                    </li>
                    <li>
                        <span class="wm-stat-name">Fire Rate</span>
                        Rounds Per Minute — how many shots the weapon can fire per minute.
                    </li>
                    <li>
                        <span class="wm-stat-name">Muzzle Velocity</span>
                        Display value calculated as:
                        <pre class="wm-formula">display = ((base bullet speed) × (first ammo's speed modifier)) × 0.7</pre>
                        The <code>× 0.7</code> only affects the displayed number — it does <strong>not</strong> change the actual in-game bullet velocity.
                    </li>
                    <li>
                        <span class="wm-stat-name">Reliability</span>
                        Relates to the chance of a weapon part taking condition damage on each shot. See the deep-dive section below.
                    </li>
                    <li>
                        <span class="wm-stat-name">Recoil Control</span>
                        Result of an arbitrary formula that does not reflect actual recoil behaviour (which is random).
                        <span class="wm-warning">⚠ Not a reliable indicator — steer clear of this stat.</span>
                    </li>
                </ul>
            </div>

            <!-- Section 2: Upgrades -->
            <div class="wm-section">
                <h3 class="wm-section-title">🔧 Weapon Upgrades: What Do They Actually Do?</h3>
                <ul class="wm-list">
                    <li>
                        <span class="wm-stat-name">Handling</span>
                        Reduces inaccuracy modifiers that apply only <strong>outside</strong> ADS — i.e. movement, stance (standing / crouched / prone). Has no effect on ADS spread.
                    </li>
                    <li>
                        <span class="wm-stat-name">Reliability</span>
                        Reduces the chance of a part taking condition damage per shot. See the formula below.
                    </li>
                    <li>
                        <span class="wm-stat-name">Accuracy</span>
                        Tightens the dispersion cone both hip-fire and ADS. Note: a <code>0%</code> accuracy weapon still only has a <code>1.5°</code> cone, so gains are smaller than they look.
                    </li>
                    <li>
                        <span class="wm-stat-name">Flatness</span>
                        Increases bullet velocity and slightly improves accuracy. Damage drop-off over range is <em>not</em> affected.
                    </li>
                    <li>
                        <span class="wm-stat-name">Recoil</span>
                        Decreases camera <em>climb</em> when shooting. Does <strong>not</strong> reduce camera shake.
                    </li>
                    <li>
                        <span class="wm-stat-name">Fire Rate</span>
                        Adds a flat RPM bonus, not multiplicative. A <code>+60%</code> upgrade is literally <code>+60 RPM</code> — the displayed percentage equals the RPM gained.
                    </li>
                </ul>
            </div>

            <!-- Section 3: Reliability deep-dive -->
            <div class="wm-section">
                <h3 class="wm-section-title">🎲 Reliability: How It Actually Works</h3>
                <p class="wm-note wm-note--warn">⚠ Contains algebra</p>

                <h4 class="wm-sub">Step 1 — Convert stat to internal value</h4>
                <p>The reliability stat is derived from the weapon's <code>condition_shot_dec</code> field via:</p>
                <pre class="wm-formula">f(x) = 10000 × (1.0 − x − 0.99)
         ↑ where x = condition_shot_dec (i.e. rel)</pre>

                <h4 class="wm-sub">Step 2 — The trigger condition</h4>
                <p>When you fire, a damage roll only happens if the item's <em>hidden</em> general condition is below a threshold. In GAMMA the values are:</p>
                <ul class="wm-list wm-list--tight">
                    <li>Hidden condition locked at <code>83%</code></li>
                    <li>Threshold: <code>85%</code></li>
                    <li>Because <code>83% &lt; 85%</code>, the roll <strong>always</strong> triggers in GAMMA.</li>
                </ul>

                <h4 class="wm-sub">Step 3 — The damage roll chance</h4>
                <pre class="wm-formula">chance = (85 − (0.83 × 100)) × rel × 2000
       = (85 − 83) × rel × 2000
       = 2 × rel × 2000</pre>
                <p>A random number between <code>0</code> and <code>1000</code> is generated. If it falls <strong>below</strong> <code>chance</code>, a random weapon part takes damage.</p>

                <h4 class="wm-sub">Example — 93% reliability</h4>
                <p>First, solve for <code>rel</code>:</p>
                <pre class="wm-formula">93 = 10000 × (1.0 − x − 0.99)
93 = 10000 − 10000x − 9900
93 = −10000x + 100
93 − 100 = −10000x
−7 = −10000x
x = 0.0007   → rel = condition_shot_dec = 0.0007</pre>
                <p>Then compute the damage chance:</p>
                <pre class="wm-formula">chance = 2 × 0.0007 × 2000 = 2.8</pre>
                <p>The random roll is <code>0 – 1000</code>, so there is a <code>2.8 / 1000 = 0.28%</code> chance per shot that a part takes damage.</p>

                <h4 class="wm-sub">Notes</h4>
                <ul class="wm-list wm-list--tight">
                    <li>The <strong>part</strong> chosen to take damage is completely random — no factors influence it.</li>
                    <li>The <strong>damage amount</strong> is a random value between <code>5%</code> and <code>12%</code> condition — also unaffected by any factor.</li>
                </ul>
            </div>
        </div>
    </div>
    </Transition>
</div>
</Transition>
</template>

<script>
export default {
    name: "WeaponMechanicsModal",
    inject: ["t"],
    props: {
        open: Boolean,
    },
    emits: ["close"],
};
</script>

<style scoped>
.wm-modal {
    max-width: 680px;
    width: 100%;
}
.wm-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
}
.wm-title-icon {
    color: var(--color-accent);
    flex-shrink: 0;
}
.wm-credit {
    margin-left: auto;
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--text-tertiary);
    font-style: italic;
}
.wm-section {
    margin-bottom: 1.5rem;
}
.wm-section:last-child {
    margin-bottom: 0;
}
.wm-section-title {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-accent-lighter, var(--color-accent));
    margin: 0 0 0.75rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid var(--border);
}
.wm-sub {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 1rem 0 0.35rem;
}
.wm-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}
.wm-list li {
    font-size: 0.82rem;
    line-height: 1.55;
    color: var(--text-secondary);
    padding-left: 0.9rem;
    position: relative;
}
.wm-list li::before {
    content: "•";
    position: absolute;
    left: 0.1rem;
    color: var(--color-accent);
}
.wm-list--tight {
    gap: 0.35rem;
}
.wm-stat-name {
    display: inline-block;
    font-weight: 700;
    color: var(--text-primary);
    margin-right: 0.4rem;
    min-width: 5rem;
}
.wm-muted {
    color: var(--text-tertiary);
    font-style: italic;
}
.wm-warning {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.77rem;
    color: #c87a3a;
}
.wm-note {
    font-size: 0.78rem;
    margin: 0 0 0.75rem;
    color: var(--text-tertiary);
}
.wm-note--warn {
    color: #c87a3a;
    font-weight: 600;
}
.wm-formula {
    background: var(--color-surface-3, #1a1a1a);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 0.55rem 0.8rem;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.78rem;
    color: var(--text-primary);
    white-space: pre;
    overflow-x: auto;
    margin: 0.4rem 0 0.6rem;
    line-height: 1.6;
}
p {
    font-size: 0.82rem;
    line-height: 1.55;
    color: var(--text-secondary);
    margin: 0 0 0.4rem;
}
code {
    background: var(--color-surface-3, #1a1a1a);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 0.1em 0.35em;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.8em;
    color: var(--text-primary);
}
</style>

