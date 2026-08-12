<script>
  import { store } from '../../lib/store.svelte.js';
  import { BarChart2, TrendingUp, DollarSign, Layers } from 'lucide-svelte';
</script>

<div class="view-container">
  <div class="view-header">
    <div class="header-title">
      <BarChart2 size={22} class="icon-economy" />
      <h2>ECONOMY COMMAND CENTER</h2>
    </div>
    <p class="header-desc">
      Resource allocation, budget tracking, and economic intelligence. Module under development.
    </p>
  </div>

  <div class="coming-soon-body">
    <div class="cs-glow"></div>
    <div class="cs-card">
      <div class="cs-icon-ring">
        <BarChart2 size={38} class="cs-main-icon" />
      </div>
      <h3 class="cs-title">ECONOMY MODULE</h3>
      <p class="cs-sub">INITIALIZING RESOURCE INTELLIGENCE GRID</p>
      <div class="cs-modules">
        <div class="cs-mod">
          <TrendingUp size={16} />
          <span>Budget Allocation Tracker</span>
          <span class="mod-status pending">PENDING</span>
        </div>
        <div class="cs-mod">
          <DollarSign size={16} />
          <span>Campaign Cost Analysis</span>
          <span class="mod-status pending">PENDING</span>
        </div>
        <div class="cs-mod">
          <Layers size={16} />
          <span>Resource Distribution Matrix</span>
          <span class="mod-status pending">PENDING</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .view-container {
    padding: 28px;
    height: calc(100vh - 64px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .view-header {
    margin-bottom: 32px;
    border-bottom: 1px solid var(--border-dim);
    padding-bottom: 18px;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-title h2 {
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: var(--text-main);
  }

  :global(.icon-economy) { color: var(--accent-economy); }

  .header-desc {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    margin-top: 8px;
  }

  .coming-soon-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .cs-glow {
    position: absolute;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(6, 182, 212, 0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .cs-card {
    background: var(--bg-card);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: var(--radius-xl);
    padding: 48px;
    max-width: 480px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    box-shadow: 0 0 48px rgba(6, 182, 212, 0.08), 0 16px 48px rgba(0,0,0,0.4);
    position: relative;
    z-index: 1;
  }

  .cs-icon-ring {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 32px rgba(6, 182, 212, 0.15);
  }

  :global(.cs-main-icon) {
    color: var(--accent-economy);
  }

  .cs-title {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: var(--text-main);
    text-align: center;
  }

  .cs-sub {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--accent-economy);
    opacity: 0.7;
    text-align: center;
  }

  .cs-modules {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cs-mod {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(6, 182, 212, 0.05);
    border: 1px solid rgba(6, 182, 212, 0.12);
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
  }

  .mod-status {
    margin-left: auto;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.06em;
    padding: 2px 8px;
    border-radius: 99px;
  }

  .mod-status.pending {
    background: rgba(245, 158, 11, 0.12);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.25);
  }
</style>
