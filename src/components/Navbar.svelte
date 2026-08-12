<script>
  import { store } from '../lib/store.svelte.js';
  import {
    RefreshCw, X, Brain, AlertTriangle,
    Archive, Flame, Swords, Minus, Maximize2, Database
  } from 'lucide-svelte';

  function handleTabChange(tab) { store.activeTab = tab; }

  function minimize() { if (window.electronAPI) window.electronAPI.minimizeWindow(); }
  function maximize() { if (window.electronAPI && window.electronAPI.maximizeWindow) window.electronAPI.maximizeWindow(); }
  function close() { if (window.electronAPI) window.electronAPI.closeWindow(); }
</script>

<header class="navbar">

  <!-- ── Brand ── -->
  <button type="button" class="brand-btn" onclick={() => store.triggerFullReload()}
    title="Sync DB & Strategies (Ctrl+R)" aria-label="Sync data">
    <span class="brand-logo" class:syncing={store.isLoading}>
      {#if store.isLoading}
        <RefreshCw size={20} class="logo-spin" strokeWidth={2.5} />
      {:else}
        <Swords size={21} class="logo-swords" strokeWidth={2.5} />
      {/if}
    </span>
    <span class="brand-text">CAMPAIGNS</span>
  </button>

  <!-- ── Divider ── -->
  <span class="divider"></span>

  <!-- ── Tabs ── -->
  <nav class="nav-tabs" aria-label="Main Navigation">
    <button type="button" class="tab-btn execution"
      class:active={store.activeTab === 'EXECUTION'}
      onclick={() => handleTabChange('EXECUTION')}
      title="Execution Theater (Ctrl+1)">
      <Flame size={16} strokeWidth={2.2} />
      <span>EXECUTION</span>
    </button>

    <button type="button" class="tab-btn arsenal"
      class:active={store.activeTab === 'ARSENAL'}
      onclick={() => handleTabChange('ARSENAL')}
      title="Arsenal Command (Ctrl+2)">
      <Brain size={16} strokeWidth={2.2} />
      <span>ARSENAL</span>
    </button>

    <button type="button" class="tab-btn breach"
      class:active={store.activeTab === 'BREACH'}
      onclick={() => handleTabChange('BREACH')}
      title="Breach Recovery (Ctrl+3)">
      <AlertTriangle size={16} strokeWidth={2.2} />
      <span>BREACH</span>
      {#if store.breachTasks.length > 0}
        <span class="breach-dot"></span>
      {/if}
    </button>

    <button type="button" class="tab-btn archive"
      class:active={store.activeTab === 'ARCHIVED'}
      onclick={() => handleTabChange('ARCHIVED')}
      title="Historical Archive (Ctrl+4)">
      <Archive size={16} strokeWidth={2.2} />
      <span>ARCHIVE</span>
    </button>
  </nav>

  <!-- ── Divider ── -->
  <span class="divider"></span>

  <!-- ── Window Controls ── -->
  <div class="window-controls">
    <button type="button" class="win-btn minimize" onclick={minimize} title="Minimize">
      <Minus size={16} strokeWidth={2.8} />
    </button>
    <button type="button" class="win-btn maximize" onclick={maximize} title="Maximize / Restore">
      <Maximize2 size={14} strokeWidth={2.5} />
    </button>
    <button type="button" class="win-btn close" onclick={close} title="Close">
      <span class="close-icon"><X size={16} strokeWidth={2.8} /></span>
    </button>
  </div>

</header>

<style>
  /* ─────────────────────────────────────────
     NAVBAR SHELL
  ───────────────────────────────────────── */
  .navbar {
    display: flex;
    align-items: center;
    height: 64px;
    padding: 0 18px;
    gap: 16px;
    user-select: none;
    flex-shrink: 0;
    position: relative;
    z-index: 100;

    /* Layered glass background */
    background:
      linear-gradient(180deg, rgba(139,92,246,0.06) 0%, transparent 100%),
      rgba(4, 7, 14, 0.95);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);

    /* Gradient border-bottom: purple → blue */
    border-bottom: 1px solid transparent;
    border-image: linear-gradient(
      90deg,
      transparent 0%,
      rgba(139,92,246,0.5) 25%,
      rgba(59,130,246,0.5) 75%,
      transparent 100%
    ) 1;
  }

  /* Subtle top edge highlight */
  .navbar::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(139,92,246,0.3) 30%,
      rgba(59,130,246,0.3) 70%,
      transparent 100%
    );
    pointer-events: none;
  }

  /* ─────────────────────────────────────────
     DIVIDERS
  ───────────────────────────────────────── */
  .divider {
    width: 1px;
    height: 28px;
    background: linear-gradient(180deg, transparent, rgba(255,255,255,0.10), transparent);
    flex-shrink: 0;
  }

  /* ─────────────────────────────────────────
     BRAND
  ───────────────────────────────────────── */
  .brand-btn {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 4px 8px;
    border: none;
    background: transparent;
    color: var(--text-main);
    border-radius: 9999px;
    transition: opacity 0.15s ease, transform 0.15s ease;
    flex-shrink: 0;
  }

  .brand-btn:hover { opacity: 0.80; }
  .brand-btn:active { transform: scale(0.96); }

  /* Perfect circle logo */
  .brand-logo {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(59,130,246,0.25) 100%);
    border: 1.5px solid rgba(139,92,246,0.65);
    box-shadow:
      0 0 0 3px rgba(139,92,246,0.08),
      0 0 20px rgba(139,92,246,0.38),
      inset 0 1px 0 rgba(255,255,255,0.20);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .brand-logo.syncing {
    animation: logo-spin-ring 1s linear infinite;
    border-color: rgba(59,130,246,0.80);
    box-shadow: 0 0 24px rgba(59,130,246,0.50), inset 0 1px 0 rgba(255,255,255,0.20);
  }

  .brand-btn:hover .brand-logo {
    box-shadow:
      0 0 0 4px rgba(139,92,246,0.14),
      0 0 32px rgba(139,92,246,0.60),
      inset 0 1px 0 rgba(255,255,255,0.25);
    border-color: rgba(139,92,246,0.90);
    animation: logo-breathe 1s ease-in-out;
  }

  /* Swords icon */
  :global(.logo-swords) {
    color: #e9d5ff;
    filter: drop-shadow(0 0 7px rgba(167,139,250,0.90));
    transition: transform 0.3s ease;
  }
  .brand-btn:hover :global(.logo-swords) {
    transform: rotate(-15deg) scale(1.1);
  }

  :global(.logo-spin) {
    color: #93c5fd;
    animation: spin 0.9s linear infinite;
  }

  /* Gradient text */
  .brand-text {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.14em;
    background: linear-gradient(90deg, #c4b5fd 0%, #93c5fd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ─────────────────────────────────────────
     TABS
  ───────────────────────────────────────── */
  .nav-tabs {
    display: flex;
    align-items: center;
    gap: 28px;
    flex: 1;
    justify-content: center;
  }

  .tab-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 24px;
    height: 40px;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.07em;
    color: var(--text-muted);
    border: 1px solid transparent;
    border-radius: 9999px;
    transition: color 0.15s ease, background 0.15s ease,
                border-color 0.15s ease, box-shadow 0.15s ease;
    white-space: nowrap;
    overflow: hidden;
  }

  /* Shimmer sweep on hover */
  .tab-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: linear-gradient(105deg,
      transparent 40%,
      rgba(255,255,255,0.06) 50%,
      transparent 60%
    );
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .tab-btn:hover::after { opacity: 1; }

  .tab-btn:hover {
    color: #e2e8f0;
    background: rgba(255,255,255,0.07);
    border-color: rgba(255,255,255,0.13);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.10);
  }

  /* Icon scale on hover */
  .tab-btn:hover :global(svg) { transform: scale(1.12); }
  .tab-btn :global(svg) { transition: transform 0.15s ease; }

  /* Active states — full colored border + glow */
  .tab-btn.active { color: #fff; }

  .tab-btn.execution.active {
    background: rgba(59,130,246,0.16);
    border-color: rgba(59,130,246,0.58);
    color: #bfdbfe;
    box-shadow: 0 0 20px rgba(59,130,246,0.25), inset 0 1px 0 rgba(59,130,246,0.25);
  }
  .tab-btn.arsenal.active {
    background: rgba(139,92,246,0.16);
    border-color: rgba(139,92,246,0.58);
    color: #ddd6fe;
    box-shadow: 0 0 20px rgba(139,92,246,0.25), inset 0 1px 0 rgba(139,92,246,0.25);
  }
  .tab-btn.breach.active {
    background: rgba(239,68,68,0.16);
    border-color: rgba(239,68,68,0.58);
    color: #fecaca;
    box-shadow: 0 0 20px rgba(239,68,68,0.25), inset 0 1px 0 rgba(239,68,68,0.25);
  }
  .tab-btn.archive.active {
    background: rgba(16,185,129,0.14);
    border-color: rgba(16,185,129,0.52);
    color: #a7f3d0;
    box-shadow: 0 0 20px rgba(16,185,129,0.22), inset 0 1px 0 rgba(16,185,129,0.22);
  }

  /* Breach pulse dot */
  .breach-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #ef4444;
    box-shadow: 0 0 8px rgba(239,68,68,0.8);
    animation: pulse-dot 2s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes pulse-dot {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.5; transform: scale(0.65); }
  }

  /* ─────────────────────────────────────────
     WINDOW CONTROLS
  ───────────────────────────────────────── */
  .window-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .win-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .win-btn.minimize {
    background: linear-gradient(145deg, #d97706, #b45309);
    color: #fef3c7;
    box-shadow: 0 2px 12px rgba(180,83,9,0.50), inset 0 1px 0 rgba(255,255,255,0.18);
  }
  .win-btn.minimize:hover {
    background: linear-gradient(145deg, #f59e0b, #d97706);
    box-shadow: 0 4px 20px rgba(245,158,11,0.65), inset 0 1px 0 rgba(255,255,255,0.25);
    transform: scale(1.08);
  }
  .win-btn.minimize:active { transform: scale(0.93); }

  .win-btn.maximize {
    background: linear-gradient(145deg, #2563eb, #1d4ed8);
    color: #dbeafe;
    box-shadow: 0 2px 12px rgba(37,99,235,0.50), inset 0 1px 0 rgba(255,255,255,0.18);
  }
  .win-btn.maximize:hover {
    background: linear-gradient(145deg, #3b82f6, #2563eb);
    box-shadow: 0 4px 20px rgba(59,130,246,0.65), inset 0 1px 0 rgba(255,255,255,0.25);
    transform: scale(1.08);
  }
  .win-btn.maximize:active { transform: scale(0.93); }

  .win-btn.close {
    background: linear-gradient(145deg, #dc2626, #b91c1c);
    color: #fee2e2;
    box-shadow: 0 2px 12px rgba(185,28,28,0.50), inset 0 1px 0 rgba(255,255,255,0.18);
  }
  .win-btn.close:hover {
    background: linear-gradient(145deg, #ef4444, #dc2626);
    box-shadow: 0 4px 20px rgba(239,68,68,0.65), inset 0 1px 0 rgba(255,255,255,0.25);
    transform: scale(1.08);
  }
  .win-btn.close:active { transform: scale(0.93); }

  /* X rotation */
  .close-icon {
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .win-btn.close:hover .close-icon { transform: rotate(90deg); }
  .win-btn.close:active .close-icon { transform: rotate(45deg); }

  /* ─────────────────────────────────────────
     KEYFRAMES
  ───────────────────────────────────────── */
  @keyframes logo-breathe {
    0%,100% { box-shadow: 0 0 0 3px rgba(139,92,246,0.08), 0 0 20px rgba(139,92,246,0.38), inset 0 1px 0 rgba(255,255,255,0.20); }
    50%      { box-shadow: 0 0 0 5px rgba(139,92,246,0.12), 0 0 30px rgba(139,92,246,0.55), inset 0 1px 0 rgba(255,255,255,0.22); }
  }
  @keyframes logo-spin-ring {
    100% { transform: rotate(360deg); }
  }
  @keyframes spin { 100% { transform: rotate(360deg); } }
</style>
