<script>
  import { store } from '../lib/store.svelte.js';
  import { Terminal, FolderPlus, ShieldAlert, Cpu } from 'lucide-svelte';

  async function handleSelectFolder() {
    await store.selectDirectory();
  }
</script>

<div class="loading-container">
  <div class="hud-box">
    <div class="header">
      <Cpu size={26} class="icon-pulse" />
      <span class="title">CAMPAIGNS SYSTEM INITIALIZATION</span>
    </div>

    {#if store.isLoading}
      <div class="status-box">
        <div class="terminal-line">
          <Terminal size={14} />
          <span>VERIFYING DATABASE INTEGRITY AND FILESYSTEM PERMISSIONS...</span>
        </div>
        <div class="progress-bar" role="progressbar" aria-label="System Loading Progress" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill"></div></div>
      </div>
    {:else if !store.isConfigured}
      <div class="setup-box">
        <div class="warning-banner">
          <ShieldAlert size={22} class="alert-icon" />
          <div>
            <strong>COMMAND CENTER WORKSPACE UNSET</strong>
            <p>Select a location for your Strategies folder. All campaign databases (.sqlite) and tactical briefing files (.md) will reside strictly within this folder.</p>
          </div>
        </div>

        <button type="button" class="btn-tactical btn-primary action-btn" onclick={handleSelectFolder}>
          <FolderPlus size={18} />
          <span>ESTABLISH STRATEGIES LOCATION</span>
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 64px);
    width: 100vw;
    background: #05070a;
    padding: 24px;
    box-sizing: border-box;
  }

  .hud-box {
    width: 100%;
    max-width: 540px;
    background: #0f141d;
    border: 1px solid var(--border-bright);
    border-radius: var(--radius-xl);
    padding: 36px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border-dim);
    padding-bottom: 16px;
  }

  :global(.icon-pulse) {
    color: var(--accent-execution);
    animation: pulse 2s infinite ease-in-out;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  .title {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: var(--text-main);
  }

  .status-box {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .terminal-line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
  }

  .progress-bar {
    height: 6px;
    background: var(--border-dim);
    border-radius: 99px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    width: 60%;
    background: var(--accent-execution);
    border-radius: 99px;
    animation: indeterminate 1.5s infinite linear;
  }

  @keyframes indeterminate {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }

  .setup-box {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .warning-banner {
    display: flex;
    gap: 12px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-md);
    padding: 16px;
    font-size: 12px;
    color: #fbbf24;
    line-height: 1.5;
  }

  :global(.alert-icon) {
    flex-shrink: 0;
  }

  .warning-banner strong {
    display: block;
    font-size: 14px;
    font-weight: 800;
    margin-bottom: 4px;
    letter-spacing: 0.04em;
  }

  .warning-banner p {
    color: var(--text-muted);
    font-size: 12px;
  }

  .action-btn {
    width: 100%;
    padding: 14px;
    font-size: 13px;
  }
</style>
