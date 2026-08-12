<script>
  import { store } from '../lib/store.svelte.js';
  import { 
    HelpCircle, X, Command, Shield, Flame, Archive, Terminal, 
    Zap, BookOpen, Cpu, HardDrive, FileText, Layers, CheckCircle2, 
    RotateCcw, Sparkles, FolderCog, Compass
  } from 'lucide-svelte';

  function handleOverlayKeyDown(e) {
    if (e.key === 'Escape') {
      store.isHelpModalOpen = false;
    }
  }
</script>

{#if store.isHelpModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="modal-overlay" 
    onclick={() => store.isHelpModalOpen = false}
    onkeydown={handleOverlayKeyDown}
  >
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="title-wrap">
          <HelpCircle size={24} class="header-icon" />
          <div class="title-text">
            <h3>COMMAND CENTER TACTICAL GUIDE & KEYBOARD SHORTCUTS</h3>
            <span class="subtitle">SYSTEM OPERATION PROTOCOLS & ARCHITECTURE MANUAL</span>
          </div>
        </div>
        <button type="button" class="close-btn" onclick={() => store.isHelpModalOpen = false} aria-label="Close Guide">
          <X size={18} />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="guide-body">

        <!-- SECTION 1: ABOUT THE APPLICATION -->
        <div class="guide-section">
          <div class="section-title">
            <Cpu size={16} class="sec-icon purple" />
            <span>ABOUT THE APPLICATION & SYSTEM ARCHITECTURE</span>
          </div>

          <div class="about-card">
            <div class="about-header">
              <div class="about-badge">
                <Sparkles size={14} />
                <span>CAMPAIGNS SYSTEM v1.0 • HIGH-PERFORMANCE DESKTOP COMMAND CENTER</span>
              </div>
            </div>

            <p class="about-desc">
              <strong>Campaigns System</strong> is a local-first, zero-latency campaign and mission management desktop application engineered for personal laptops. Built with <strong>Electron</strong>, <strong>Svelte 5 (Runes State Engine)</strong>, and an embedded <strong>SQLite Database (`sql.js`)</strong> paired with <strong>Markdown (`.md`)</strong> strategy briefings.
            </p>

            <div class="highlights-grid">
              <div class="highlight-item">
                <HardDrive size={15} class="hl-icon db" />
                <div>
                  <strong>Resilient SQLite Database Engine</strong>
                  <p>Fail-safe auto-recovery automatically re-creates missing or corrupted database files on startup with zero application crashes.</p>
                </div>
              </div>

              <div class="highlight-item">
                <FileText size={15} class="hl-icon md" />
                <div>
                  <strong>Strategies Markdown Integration</strong>
                  <p>Every campaign automatically maintains a dedicated `.md` briefing document inside your local `Strategies/` workspace folder.</p>
                </div>
              </div>

              <div class="highlight-item">
                <Zap size={15} class="hl-icon perf" />
                <div>
                  <strong>Minimum CPU / GPU / RAM Load</strong>
                  <p>Hardware-accelerated CSS animations and disabled GPU shader disk cache switches ensure instantaneous response and minimal power consumption.</p>
                </div>
              </div>

              <div class="highlight-item">
                <RotateCcw size={15} class="hl-icon chronos" />
                <div>
                  <strong>Chronos Real-Time Deadline Math</strong>
                  <p>Dynamic date calculations track target deadlines, auto-detect overdue breaches, and manage 2 tactical reschedule permits per campaign.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 2: CATEGORIZED KEYBOARD SHORTCUTS -->
        <div class="guide-section">
          <div class="section-title">
            <Command size={16} class="sec-icon blue" />
            <span>CATEGORIZED KEYBOARD SHORTCUTS DIRECTORY</span>
          </div>

          <!-- Category A: Global Navigation -->
          <div class="category-block">
            <div class="category-header nav">
              <Compass size={14} />
              <span>1. GLOBAL NAVIGATION & THEATER SWITCHING</span>
            </div>
            <div class="shortcut-grid">
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>1</kbd></span>
                <span class="shortcut-desc">Switch to <strong>EXECUTION</strong> (Active Theater)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>2</kbd></span>
                <span class="shortcut-desc">Switch to <strong>ARSENAL</strong> (Intel & Planning)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>3</kbd></span>
                <span class="shortcut-desc">Switch to <strong>BREACH</strong> (Overdue Theater)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>4</kbd></span>
                <span class="shortcut-desc">Switch to <strong>ARCHIVE</strong> (Victory & Aborted)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd></span>
                <span class="shortcut-desc">Single-Key <strong>TAB CYCLING</strong> (Exec ↔ Ars ↔ Breach ↔ Arch)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>F</kbd> or <kbd>/</kbd></span>
                <span class="shortcut-desc">Instant <strong>SEARCH BAR FOCUS</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>P</kbd></span>
                <span class="shortcut-desc">Cycle <strong>PRIORITY FILTERS</strong> (ALL/HIGH/MED/LOW)</span>
              </div>
            </div>
          </div>

          <!-- Category B: Battlefield & Card Controls -->
          <div class="category-block">
            <div class="category-header card-ctrl">
              <Shield size={14} />
              <span>2. BATTLEFIELD & CARD CONTROLS</span>
            </div>
            <div class="shortcut-grid">
              <div class="shortcut-card">
                <span class="key-combo"><kbd>J</kbd> / <kbd>K</kbd> or <kbd>↓</kbd> / <kbd>↑</kbd></span>
                <span class="shortcut-desc">High-Speed <strong>TASK CARD NAVIGATION</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Enter</kbd> or <kbd>E</kbd></span>
                <span class="shortcut-desc">Open <strong>FOCUSED TASK CARD / WINDOW</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>M</kbd> or <kbd>S</kbd></span>
                <span class="shortcut-desc">Move Raw Intel Card to <strong>STRATEGIZING</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>B</kbd></span>
                <span class="shortcut-desc">Move Strategizing Card <strong>BACK TO RAW INTEL</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>D</kbd> or <kbd>R</kbd></span>
                <span class="shortcut-desc">Open <strong>DEPLOYMENT / RESCHEDULE MODAL</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Double-Click</kbd> (on Title)</span>
                <span class="shortcut-desc">Open <strong>MARKDOWN BRIEFING NOTE (.MD)</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>P</kbd></span>
                <span class="shortcut-desc">Trigger 60s <strong>PURGE MODAL</strong> on Raw Intel Card</span>
              </div>
            </div>
          </div>

          <!-- Category C: Subtask & Micro-Step Protocols -->
          <div class="category-block">
            <div class="category-header subtasks">
              <Layers size={14} />
              <span>3. SUBTASK & MICRO-STEP PROTOCOLS (INSIDE TASK WINDOW)</span>
            </div>
            <div class="shortcut-grid">
              <div class="shortcut-card">
                <span class="key-combo"><kbd>N</kbd> (in Task Window)</span>
                <span class="shortcut-desc">Focus <strong>ADD SUBTASK</strong> Input Box</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>J</kbd> / <kbd>K</kbd> or <kbd>↓</kbd> / <kbd>↑</kbd></span>
                <span class="shortcut-desc">Navigate & Highlight <strong>SUBTASK CARDS</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Space</kbd></span>
                <span class="shortcut-desc">Cycle <strong>SUBTASK STAGE</strong> (Initiated → Doing → Completed)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>E</kbd> or <kbd>F2</kbd></span>
                <span class="shortcut-desc">Inline Edit Title of <strong>FOCUSED SUBTASK</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>U</kbd></span>
                <span class="shortcut-desc">Move Focused Subtask <strong>UP IN ORDERING</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Delete</kbd> or <kbd>X</kbd></span>
                <span class="shortcut-desc">Delete <strong>FOCUSED SUBTASK</strong></span>
              </div>
            </div>
          </div>

          <!-- Category D: System, Storage & Debug Commands -->
          <div class="category-block">
            <div class="category-header system">
              <FolderCog size={14} />
              <span>4. SYSTEM, STORAGE & DEBUG COMMANDS</span>
            </div>
            <div class="shortcut-grid">
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>N</kbd></span>
                <span class="shortcut-desc">Open <strong>LOG NEW INTEL</strong> Campaign Creator</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> (in Dialog)</span>
                <span class="shortcut-desc">Instant Priority Toggle <strong>(1: HIGH, 2: MED, 3: LOW)</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd></span>
                <span class="shortcut-desc">Open <strong>WORKSPACE & .DB PATH CONFIG</strong> Popup</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd></span>
                <span class="shortcut-desc">Open <strong>CLASSIFICATION TAGS MANAGER</strong> Popup</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd></span>
                <span class="shortcut-desc">Open <strong>SQLITE DB LOCATION</strong> in File Explorer</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd></span>
                <span class="shortcut-desc">Force <strong>SYSTEM SYNC</strong> with Strategies Folder</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd></span>
                <span class="shortcut-desc">Toggle <strong>TACTICAL DEBUG LOG CONSOLE</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>?</kbd> or <kbd>Ctrl</kbd> + <kbd>/</kbd></span>
                <span class="shortcut-desc">Toggle <strong>TACTICAL USER GUIDE</strong> (This Modal)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>S</kbd> or <kbd>Ctrl</kbd> + <kbd>Enter</kbd></span>
                <span class="shortcut-desc">Submit / Save Active Manifest or Modal</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Esc</kbd></span>
                <span class="shortcut-desc">Unfocus Input / Close Active Modal</span>
              </div>
            </div>
          </div>

        </div>

        <!-- SECTION 3: CAMPAIGN LIFE CYCLE STATES & RULES -->
        <div class="guide-section">
          <div class="section-title">
            <BookOpen size={16} class="sec-icon amber" />
            <span>CAMPAIGN LIFE CYCLE STATES & PROTOCOLS</span>
          </div>

          <div class="rules-grid">
            
            <div class="rule-card arsenal">
              <div class="rule-header">
                <Shield size={16} class="rule-icon" />
                <strong>ARSENAL STATE</strong>
              </div>
              <p>Staging hub for campaign intelligence. Organizes campaigns into <em>Raw Intel</em> and <em>Strategizing</em> columns. Formulate strategies and attach markdown documentation (.md) before battlefield deployment.</p>
            </div>

            <div class="rule-card execution">
              <div class="rule-header">
                <Zap size={16} class="rule-icon" />
                <strong>EXECUTION STATE</strong>
              </div>
              <p>Active operational battlefield. Requires a valid target deadline. Tracks real-time <strong>DAYS LEFT</strong> countdown. Successfully completed tasks move to <em>Victory</em>.</p>
            </div>

            <div class="rule-card breach">
              <div class="rule-header">
                <Flame size={16} class="rule-icon" />
                <strong>BREACH STATE</strong>
              </div>
              <p>Overdue theater automatically triggered when a deadline expires. Maximum <strong>2 Reschedule Permits</strong> allowed per campaign to extend deadline and redeploy to Execution.</p>
            </div>

            <div class="rule-card archive">
              <div class="rule-header">
                <Archive size={16} class="rule-icon" />
                <strong>ARCHIVE STATE</strong>
              </div>
              <p>Historical repository storing completed (<em>Victory</em>) or cancelled (<em>Aborted</em>) campaigns. Requires a mandatory tactical End Note upon archiving and preserves the complete timeline history.</p>
            </div>

          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <span class="footer-note">CAMPAIGNS SYSTEM v1.0 • PRESS ESCAPE OR CLICK OUTSIDE TO CLOSE</span>
        <button type="button" class="btn-guide-close" onclick={() => store.isHelpModalOpen = false}>CLOSE GUIDE</button>
      </div>

    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 99995;
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
    max-width: 920px;
    max-height: calc(100vh - 74px);
    background: rgba(12, 17, 29, 0.98);
    border: 1px solid rgba(139, 92, 246, 0.40);
    border-radius: 24px;
    box-shadow: 0 28px 72px rgba(0, 0, 0, 0.92), 0 0 44px rgba(139, 92, 246, 0.22);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 30px;
    background: rgba(139, 92, 246, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  :global(.header-icon) {
    color: #c4b5fd;
    flex-shrink: 0;
  }

  .title-text h3 {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #f3e8ff;
    margin: 0;
  }

  .subtitle {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-muted);
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
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    color: #fca5a5;
  }

  .guide-body {
    flex: 1;
    padding: 26px 30px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .guide-body::-webkit-scrollbar { width: 6px; }
  .guide-body::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.45); border-radius: 99px; }

  .guide-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13.5px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: #f3e8ff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 9px;
  }

  :global(.sec-icon.purple) { color: #c4b5fd; }
  :global(.sec-icon.blue)   { color: #60a5fa; }
  :global(.sec-icon.amber)  { color: #fbbf24; }

  /* ABOUT APPLICATION CARD */
  .about-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(139, 92, 246, 0.25);
    border-radius: 18px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .about-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #c4b5fd;
    background: rgba(139, 92, 246, 0.15);
    border: 1px solid rgba(139, 92, 246, 0.35);
    padding: 5px 12px;
    border-radius: 99px;
  }

  .about-desc {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.55;
    color: var(--text-main);
    margin: 0;
  }
  .about-desc strong { color: #f3e8ff; font-weight: 800; }

  .highlights-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-top: 4px;
  }

  .highlight-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 12px 14px;
  }

  :global(.hl-icon) { flex-shrink: 0; margin-top: 2px; }
  :global(.hl-icon.db) { color: #c4b5fd; }
  :global(.hl-icon.md) { color: #60a5fa; }
  :global(.hl-icon.perf) { color: #34d399; }
  :global(.hl-icon.chronos) { color: #fbbf24; }

  .highlight-item strong {
    display: block;
    font-size: 12px;
    font-weight: 800;
    color: #f3e8ff;
    margin-bottom: 3px;
  }

  .highlight-item p {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    line-height: 1.4;
    margin: 0;
  }

  /* CATEGORIZED SHORTCUTS */
  .category-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 14px 16px;
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .category-header.nav { color: #60a5fa; }
  .category-header.card-ctrl { color: #c4b5fd; }
  .category-header.subtasks { color: #a7f3d0; }
  .category-header.system { color: #fbbf24; }

  .shortcut-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .shortcut-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    transition: background 0.15s ease;
  }
  .shortcut-card:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .key-combo {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  kbd {
    background: rgba(139, 92, 246, 0.22);
    border: 1px solid rgba(139, 92, 246, 0.48);
    color: #ddd6fe;
    font-family: inherit;
    font-size: 10.5px;
    font-weight: 900;
    padding: 3px 7px;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  }

  .shortcut-desc {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-main);
  }

  .rules-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .rule-card {
    padding: 14px 16px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rule-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  .rule-card.arsenal .rule-header { color: #c4b5fd; }
  .rule-card.execution .rule-header { color: #60a5fa; }
  .rule-card.breach .rule-header { color: #f87171; }
  .rule-card.archive .rule-header { color: #34d399; }

  .rule-card p {
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--text-muted);
    margin: 0;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 28px;
    background: rgba(0, 0, 0, 0.4);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }

  .footer-note {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }

  .btn-guide-close {
    padding: 8px 18px;
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #f3e8ff;
    background: rgba(139, 92, 246, 0.25);
    border: 1px solid rgba(139, 92, 246, 0.5);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-guide-close:hover {
    background: rgba(139, 92, 246, 0.4);
    border-color: rgba(168, 85, 247, 0.7);
    transform: translateY(-1px);
  }
</style>
