<script lang="ts">
    import { onMount } from "svelte";

    // ── Obstacle state ──────────────────────────────────────────
    let obstacles: Obstacle[] = $state([]);
    let nextId = $state(1);

    // ── "Add" form state ────────────────────────────────────────
    let newShape: Obstacle['shape'] = $state('rectangle');
    let newWidth  = $state(60);
    let newHeight = $state(60);
    let newColor  = $state('#1e293b');
    let newLabel  = $state('');

    // ── Drag state ──────────────────────────────────────────────
    let dragId:     number | null = $state(null);
    let dragOffset = $state({ x: 0, y: 0 });

    // ── Resize state ────────────────────────────────────────────
    let resizeId:      number | null = $state(null);
    let resizeStart    = $state({ x: 0, y: 0, w: 0, h: 0 });

    // ── Panel toggle ────────────────────────────────────────────
    let panelOpen = $state(true);

    // ── Presets ─────────────────────────────────────────────────
    const presets: { name: string; shape: Obstacle['shape']; w: number; h: number; color: string }[] = [
        { name: 'Small Box',    shape: 'rectangle', w: 30,  h: 30,  color: '#1e293b' },
        { name: 'Large Box',    shape: 'rectangle', w: 100, h: 100, color: '#334155' },
        { name: 'Long Wall',    shape: 'wall',      w: 300, h: 14,  color: '#78716c' },
        { name: 'Short Wall',   shape: 'wall',      w: 120, h: 14,  color: '#78716c' },
        { name: 'Pillar',       shape: 'circle',    w: 30,  h: 30,  color: '#a16207' },
        { name: 'Barrel',       shape: 'circle',    w: 50,  h: 50,  color: '#ea580c' },
        { name: 'Jersey Barrier', shape: 'wall',    w: 200, h: 20,  color: '#9ca3af' },
    ];

    // ── Actions ─────────────────────────────────────────────────
    function addObstacle() {
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;
        obstacles.push({
            id: nextId++,
            x: viewW / 2 - newWidth / 2,
            y: viewH / 2 - newHeight / 2,
            width: newWidth,
            height: newHeight,
            shape: newShape,
            color: newColor,
            label: newLabel || `Obstacle ${nextId - 1}`,
            locked: false,
        });
        newLabel = '';
    }

    function addPreset(preset: typeof presets[number]) {
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;
        obstacles.push({
            id: nextId++,
            x: viewW / 2 - preset.w / 2,
            y: viewH / 2 - preset.h / 2,
            width: preset.w,
            height: preset.h,
            shape: preset.shape,
            color: preset.color,
            label: preset.name + ` #${nextId - 1}`,
            locked: false,
        });
    }

    function removeObstacle(id: number) {
        obstacles = obstacles.filter(o => o.id !== id);
    }

    function clearAll() {
        obstacles = [];
    }

    function toggleLock(id: number) {
        const o = obstacles.find(o => o.id === id);
        if (o) o.locked = !o.locked;
    }

    function duplicateObstacle(id: number) {
        const src = obstacles.find(o => o.id === id);
        if (!src) return;
        obstacles.push({
            ...src,
            id: nextId++,
            x: src.x + 20,
            y: src.y + 20,
            label: src.label + ' (copy)',
            locked: false,
        });
    }

    // ── Pointer handlers (drag) ─────────────────────────────────
    function onObstaclePointerDown(e: PointerEvent, obs: Obstacle) {
        if (obs.locked) return;
        dragId = obs.id;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    function onObstaclePointerMove(e: PointerEvent) {
        if (dragId === null) return;
        const obs = obstacles.find(o => o.id === dragId);
        if (obs) {
            obs.x = e.clientX - dragOffset.x;
            obs.y = e.clientY - dragOffset.y;
        }
    }

    function onObstaclePointerUp(e: PointerEvent) {
        dragId = null;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }

    // ── Pointer handlers (resize via corner handle) ─────────────
    function onResizePointerDown(e: PointerEvent, obs: Obstacle) {
        e.stopPropagation();
        resizeId = obs.id;
        resizeStart = { x: e.clientX, y: e.clientY, w: obs.width, h: obs.height };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    function onResizePointerMove(e: PointerEvent) {
        if (resizeId === null) return;
        const obs = obstacles.find(o => o.id === resizeId);
        if (!obs) return;
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        obs.width  = Math.max(10, resizeStart.w + dx);
        obs.height = Math.max(10, resizeStart.h + dy);
    }

    function onResizePointerUp(e: PointerEvent) {
        resizeId = null;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
</script>

<!-- ╔══════════════════════════════════════════════════════════╗ -->
<!-- ║  Rendered obstacles on the canvas                       ║ -->
<!-- ╚══════════════════════════════════════════════════════════╝ -->
{#each obstacles as obs (obs.id)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        data-obstacle
        class="obstacle-item"
        style="
            position: absolute;
            left: {obs.x}px;
            top: {obs.y}px;
            width: {obs.width}px;
            height: {obs.height}px;
            background-color: {obs.color};
            border-radius: {obs.shape === 'circle' ? '50%' : obs.shape === 'wall' ? '3px' : '4px'};
            cursor: {obs.locked ? 'not-allowed' : 'grab'};
            z-index: 10;
            touch-action: none;
            user-select: none;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid rgba(255,255,255,0.15);
            transition: box-shadow 0.15s;
        "
        onpointerdown={(e: PointerEvent) => onObstaclePointerDown(e, obs)}
        onpointermove={onObstaclePointerMove}
        onpointerup={onObstaclePointerUp}
    >
        <!-- label (only if big enough) -->
        {#if obs.width > 40 && obs.height > 20}
            <span style="color: white; font-size: 10px; pointer-events: none; text-shadow: 0 1px 2px black; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 90%;">{obs.label}</span>
        {/if}

        <!-- resize handle (bottom-right corner) -->
        {#if !obs.locked}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="resize-handle"
                style="
                    position: absolute;
                    right: -4px;
                    bottom: -4px;
                    width: 10px;
                    height: 10px;
                    background: white;
                    border: 1px solid #888;
                    border-radius: 2px;
                    cursor: nwse-resize;
                    touch-action: none;
                "
                onpointerdown={(e: PointerEvent) => onResizePointerDown(e, obs)}
                onpointermove={onResizePointerMove}
                onpointerup={onResizePointerUp}
            ></div>
        {/if}
    </div>
{/each}

<!-- ╔══════════════════════════════════════════════════════════╗ -->
<!-- ║  Obstacle control panel (floating UI)                   ║ -->
<!-- ╚══════════════════════════════════════════════════════════╝ -->
<div class="panel" class:collapsed={!panelOpen}>
    <button class="toggle-btn" onclick={() => panelOpen = !panelOpen}>
        {panelOpen ? '◀ Hide' : '▶ Obstacles'}
    </button>

    {#if panelOpen}
        <h3>🚧 Obstacles</h3>

        <!-- Quick presets -->
        <section class="section">
            <span class="section-label">Quick Add</span>
            <div class="preset-grid">
                {#each presets as preset}
                    <button class="preset-btn" onclick={() => addPreset(preset)}>
                        {preset.name}
                    </button>
                {/each}
            </div>
        </section>

        <!-- Custom add -->
        <section class="section">
            <span class="section-label">Custom Obstacle</span>

            <div class="form-row">
                <label>Shape
                    <select bind:value={newShape}>
                        <option value="rectangle">Rectangle</option>
                        <option value="circle">Circle</option>
                        <option value="wall">Wall</option>
                    </select>
                </label>
            </div>

            <div class="form-row">
                <span>W × H</span>
                <div style="display:flex; gap:4px; align-items:center;">
                    <input type="number" bind:value={newWidth} min="10" max="800" style="width:60px;" />
                    <span>×</span>
                    <input type="number" bind:value={newHeight} min="10" max="800" style="width:60px;" />
                </div>
            </div>

            <div class="form-row">
                <label>Color
                    <input type="color" bind:value={newColor} />
                </label>
            </div>

            <div class="form-row">
                <label>Label
                    <input type="text" bind:value={newLabel} placeholder="Optional label…" style="width:120px;" />
                </label>
            </div>

            <button class="add-btn" onclick={addObstacle}>+ Add Obstacle</button>
        </section>

        <!-- List of placed obstacles -->
        {#if obstacles.length > 0}
            <section class="section">
                <span class="section-label">Placed ({obstacles.length})</span>
                <div class="obstacle-list">
                    {#each obstacles as obs (obs.id)}
                        <div class="list-item">
                            <span class="color-dot" style="background:{obs.color}; border-radius:{obs.shape === 'circle' ? '50%' : '2px'};"></span>
                            <span class="list-label">{obs.label}</span>
                            <button class="icon-btn" title="Duplicate" onclick={() => duplicateObstacle(obs.id)}>📋</button>
                            <button class="icon-btn" title={obs.locked ? 'Unlock' : 'Lock'} onclick={() => toggleLock(obs.id)}>{obs.locked ? '🔒' : '🔓'}</button>
                            <button class="icon-btn danger" title="Delete" onclick={() => removeObstacle(obs.id)}>✕</button>
                        </div>
                    {/each}
                </div>
                <button class="clear-btn" onclick={clearAll}>🗑 Clear All</button>
            </section>
        {/if}
    {/if}
</div>

<style>
    /* ── Panel ──────────────────────────────────────── */
    .panel {
        position: fixed;
        top: 12px;
        left: 12px;
        width: 260px;
        max-height: calc(100vh - 24px);
        overflow-y: auto;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 14px;
        z-index: 1000;
        color: #e2e8f0;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .panel.collapsed {
        width: auto;
        padding: 6px;
    }
    .panel h3 {
        margin: 0 0 10px;
        font-size: 15px;
    }

    .toggle-btn {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 12px;
        padding: 2px 6px;
        margin-bottom: 4px;
    }
    .toggle-btn:hover { color: #fff; }

    /* ── Sections ───────────────────────────────────── */
    .section {
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .section-label {
        display: block;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        margin-bottom: 6px;
    }

    /* ── Presets ────────────────────────────────────── */
    .preset-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    .preset-btn {
        padding: 4px 8px;
        font-size: 11px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 6px;
        color: #cbd5e1;
        cursor: pointer;
        transition: background 0.15s;
    }
    .preset-btn:hover {
        background: rgba(255,255,255,0.18);
        color: #fff;
    }

    /* ── Form rows ─────────────────────────────────── */
    .form-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
    }
    .form-row label {
        font-size: 12px;
        color: #94a3b8;
    }
    .form-row input[type="number"],
    .form-row input[type="text"],
    .form-row select {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 4px;
        color: #e2e8f0;
        padding: 3px 6px;
        font-size: 12px;
    }
    .form-row input[type="color"] {
        width: 32px;
        height: 24px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    /* ── Buttons ────────────────────────────────────── */
    .add-btn {
        width: 100%;
        padding: 6px;
        margin-top: 4px;
        border: none;
        border-radius: 6px;
        background: #2563eb;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
    }
    .add-btn:hover { background: #1d4ed8; }

    .clear-btn {
        width: 100%;
        padding: 5px;
        margin-top: 6px;
        border: 1px solid rgba(239,68,68,0.4);
        border-radius: 6px;
        background: rgba(239,68,68,0.1);
        color: #fca5a5;
        font-size: 11px;
        cursor: pointer;
        transition: background 0.15s;
    }
    .clear-btn:hover { background: rgba(239,68,68,0.25); }

    /* ── Obstacle list ─────────────────────────────── */
    .obstacle-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
        max-height: 200px;
        overflow-y: auto;
    }
    .list-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        background: rgba(255,255,255,0.04);
        border-radius: 6px;
    }
    .color-dot {
        flex-shrink: 0;
        width: 12px;
        height: 12px;
        border: 1px solid rgba(255,255,255,0.2);
    }
    .list-label {
        flex: 1;
        font-size: 11px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 12px;
        padding: 1px 3px;
        border-radius: 3px;
        color: #94a3b8;
        transition: background 0.15s;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .icon-btn.danger:hover { background: rgba(239,68,68,0.3); color: #fca5a5; }
</style>
