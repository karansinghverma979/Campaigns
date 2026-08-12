<script>
  import { store } from '../lib/store.svelte.js';
  import { Database, Folder, FolderSync, ExternalLink, X, Settings, HardDrive, FileText } from 'lucide-svelte';

  function handleOverlayKeyDown(e) {
    if (e.key === 'Escape') {
      store.isConfigModalOpen = false;
    }
  }

  async function handleRelocateStrategies() {
    await store.relocateDirectory();
  }

  async function handleRelocateDb() {
    await store.relocateDbDirectory();
  }

  async function handleOpenDb() {
    await store.openDbLocation();
  }

  async function handleOpenStrategiesFolder() {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.openStrategiesFolder();
      if (res.success) {
        store.showToast('Opened Strategies folder in File Explorer.', 'info');
      } else {
        store.showToast('Could not open Strategies folder: ' + res.error, 'warning');
      }
    } catch (e) {
      store.showToast('Could not open Strategies folder: ' + e.message, 'warning');
    }
  }
</script>

{#if store.isConfigModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay" 
    onclick={() => store.isConfigModalOpen = false}
    onkeydown={handleOverlayKeyDown}
  >
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      
      <!-- Header -->
      <div class="modal-header">
        <div class="title-wrap">
          <div class="icon-box">
            <Settings size={22} class="header-icon" />
          </div>
          <div>
            <h3>STORAGE PATH CONFIGURATION</h3>
            <span class="subtitle">CONFIGURE STRATEGIES & DATABASE LOCATIONS INDEPENDENTLY</span>
          </div>
        </div>
        <button type="button" class="close-btn" onclick={() => store.isConfigModalOpen = false} aria-label="Close modal">
          <X size={18} />
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">

        <!-- ─── Section 1: Strategies Folder ─── -->
        <div class="section-block">
          <div class="section-header">
            <div class="section-header-icon strategies">
              <FileText size={15} />
            </div>
            <div class="section-header-text">
              <span class="section-label">STRATEGIES WORKSPACE</span>
              <span class="section-sub">Markdown campaign files (.md) storage directory</span>
            </div>
          </div>

          <div class="path-value-box">
            <span class="path-text">{store.strategiesPath || 'Not Configured'}</span>
          </div>

          <div class="btn-row">
            <button type="button" class="btn-action relocate" onclick={handleRelocateStrategies}>
              <FolderSync size={14} />
              <span>CHANGE PATH...</span>
            </button>
            <button type="button" class="btn-action explorer" onclick={handleOpenStrategiesFolder}>
              <ExternalLink size={14} />
              <span>OPEN IN EXPLORER</span>
            </button>
          </div>
        </div>

        <div class="section-divider">
          <span class="divider-label">INDEPENDENT CONFIGURATION</span>
        </div>

        <!-- ─── Section 2: Database File ─── -->
        <div class="section-block">
          <div class="section-header">
            <div class="section-header-icon database">
              <Database size={15} />
            </div>
            <div class="section-header-text">
              <span class="section-label">SQLITE DATABASE FILE</span>
              <span class="section-sub">campaigns.sqlite — can be placed in any folder on your system</span>
            </div>
          </div>

          <div class="path-value-box">
            <span class="path-text">{store.dbPath || 'Not Initialized'}</span>
          </div>

          <div class="btn-row">
            <button type="button" class="btn-action db-relocate" onclick={handleRelocateDb}>
              <FolderSync size={14} />
              <span>CHANGE PATH...</span>
            </button>
            <button type="button" class="btn-action db-explorer" onclick={handleOpenDb}>
              <HardDrive size={14} />
              <span>OPEN IN EXPLORER</span>
            </button>
          </div>
        </div>

        <!-- Info note -->
        <div class="info-note">
          <span class="info-dot"></span>
          <span>Both paths are saved independently. Changing one does not affect the other. The database file is always named <code>campaigns.sqlite</code>.</span>
        </div>

      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <span class="footer-note">
          KEYBOARD SHORTCUT: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> TO TOGGLE
        </span>
        <button type="button" class="btn-close-modal" onclick={() => store.isConfigModalOpen = false}>
          CLOSE
        </button>
      </div>

    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 99990;
    background: rgba(4, 7, 14, 0.88);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1); }
  }

  .modal-card {
    width: 100%;
    max-width: 700px;
    background: rgba(12, 17, 29, 0.98);
    border: 1px solid rgba(139, 92, 246, 0.45);
    border-radius: 24px;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.95), 0 0 40px rgba(139, 92, 246, 0.22);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 30px;
    background: rgba(139, 92, 246, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .icon-box {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(139, 92, 246, 0.18);
    border: 1px solid rgba(139, 92, 246, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  :global(.header-icon) {
    color: #c4b5fd;
  }

  .title-wrap h3 {
    font-size: 15.5px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #f3e8ff;
    margin: 0;
  }

  .subtitle {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    display: block;
    margin-top: 2px;
  }

  .close-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.10);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  .close-btn:hover {
    background: rgba(239, 68, 68, 0.22);
    border-color: rgba(239, 68, 68, 0.45);
    color: #fca5a5;
  }

  .modal-body {
    padding: 26px 30px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
  }

  /* ─── Section blocks ─── */
  .section-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 18px 20px;
    transition: border-color 0.15s ease;
  }
  .section-block:hover {
    border-color: rgba(139, 92, 246, 0.3);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .section-header-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .section-header-icon.strategies {
    background: rgba(96, 165, 250, 0.15);
    border: 1px solid rgba(96, 165, 250, 0.35);
    color: #60a5fa;
  }
  .section-header-icon.database {
    background: rgba(196, 181, 253, 0.15);
    border: 1px solid rgba(196, 181, 253, 0.35);
    color: #c4b5fd;
  }

  .section-header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .section-label {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: #f3e8ff;
  }

  .section-sub {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }

  .path-value-box {
    background: rgba(4, 7, 14, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 10px 14px;
    overflow-x: auto;
  }

  .path-text {
    font-family: 'Courier New', monospace;
    font-size: 12.5px;
    font-weight: 700;
    color: #93c5fd;
    white-space: nowrap;
  }

  /* ─── Button row ─── */
  .btn-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .btn-action {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 16px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.06em;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* Strategies — change path */
  .btn-action.relocate {
    color: #fef3c7;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.30), rgba(217, 119, 6, 0.20));
    border: 1px solid rgba(245, 158, 11, 0.50);
  }
  .btn-action.relocate:hover {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.50), rgba(217, 119, 6, 0.40));
    box-shadow: 0 0 16px rgba(245, 158, 11, 0.30);
    transform: translateY(-1px);
  }

  /* Strategies — open in explorer */
  .btn-action.explorer {
    color: #dbeafe;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.15));
    border: 1px solid rgba(59, 130, 246, 0.45);
  }
  .btn-action.explorer:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.45), rgba(37, 99, 235, 0.35));
    box-shadow: 0 0 16px rgba(59, 130, 246, 0.28);
    transform: translateY(-1px);
  }

  /* DB — change path */
  .btn-action.db-relocate {
    color: #f3e8ff;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.28), rgba(109, 40, 217, 0.18));
    border: 1px solid rgba(139, 92, 246, 0.50);
  }
  .btn-action.db-relocate:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.48), rgba(109, 40, 217, 0.38));
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.30);
    transform: translateY(-1px);
  }

  /* DB — open in explorer */
  .btn-action.db-explorer {
    color: #e9d5ff;
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.20), rgba(139, 92, 246, 0.12));
    border: 1px solid rgba(167, 139, 250, 0.40);
  }
  .btn-action.db-explorer:hover {
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.38), rgba(139, 92, 246, 0.28));
    box-shadow: 0 0 16px rgba(167, 139, 250, 0.25);
    transform: translateY(-1px);
  }

  /* ─── Divider ─── */
  .section-divider {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .section-divider::before,
  .section-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
  }
  .divider-label {
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.12em;
    color: var(--text-dim);
    white-space: nowrap;
  }

  /* ─── Info note ─── */
  .info-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(96, 165, 250, 0.07);
    border: 1px solid rgba(96, 165, 250, 0.20);
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 11.5px;
    font-weight: 600;
    color: #93c5fd;
    line-height: 1.5;
  }

  .info-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #60a5fa;
    flex-shrink: 0;
    margin-top: 5px;
  }

  .info-note code {
    background: rgba(96, 165, 250, 0.15);
    border: 1px solid rgba(96, 165, 250, 0.25);
    border-radius: 4px;
    padding: 1px 5px;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: #bfdbfe;
  }

  /* ─── Footer ─── */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 30px;
    background: rgba(0, 0, 0, 0.4);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .footer-note {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  kbd {
    background: rgba(139, 92, 246, 0.20);
    border: 1px solid rgba(139, 92, 246, 0.45);
    color: #ddd6fe;
    font-family: inherit;
    font-size: 10px;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 5px;
  }

  .btn-close-modal {
    padding: 9px 22px;
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #f3e8ff;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-close-modal:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
  }
</style>
