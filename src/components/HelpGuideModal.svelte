<script>
  import { store } from '../lib/store.svelte.js';
  import { 
    HelpCircle, X, Command, Shield, Flame, Archive, Terminal, 
    Zap, BookOpen, Cpu, HardDrive, FileText, Layers, CheckCircle2, 
    RotateCcw, Sparkles, FolderCog, Compass, ShieldCheck, Tag, Calendar, AlertTriangle, XOctagon, CheckSquare, Trash2
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
    onkeydown={handleOverlayKeyDown}
  >
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="title-wrap">
          <HelpCircle size={24} class="header-icon" />
          <div class="title-text">
            <h3>COMMAND CENTER TACTICAL GUIDE &amp; SYSTEM MANUAL</h3>
            <span class="subtitle">CAMPAIGNS v3.0 • OPERATIONAL PROTOCOLS, SMART SYNTAX &amp; SHORTCUTS</span>
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
            <span>ABOUT THE APPLICATION &amp; SYSTEM ARCHITECTURE (v3.0)</span>
          </div>

          <div class="about-card">
            <div class="about-header">
              <div class="about-badge">
                <Sparkles size={14} />
                <span>CAMPAIGNS SYSTEM v3.0 • ZERO-DATA-LOSS DESKTOP COMMAND CENTER</span>
              </div>
            </div>

            <p class="about-desc">
              <strong>Campaigns System</strong> is a high-discipline, local-first operational suite engineered for elite personal campaign tracking, tactical strikes, and markdown strategy briefings. Built with <strong>Electron</strong>, <strong>Svelte 5 (Runes Reactive Engine)</strong>, and an embedded <strong>SQLite Database</strong> seamlessly synchronized with <strong>Obsidian (.md)</strong> strategy documents.
            </p>

            <div class="highlights-grid">
              <div class="highlight-item">
                <HardDrive size={15} class="hl-icon db" />
                <div>
                  <strong>Resilient SQLite Database Engine</strong>
                  <p>In-place reactive object patching, indexed foreign keys, and bulk IPC transactions ensure 0% DOM thrashing and instant responsiveness.</p>
                </div>
              </div>

              <div class="highlight-item">
                <FileText size={15} class="hl-icon md" />
                <div>
                  <strong>Strategies Markdown Protocol 3.0</strong>
                  <p>On-demand non-destructive `.md` materialization with immutable Task ID headers and sentinel user-notes preservation.</p>
                </div>
              </div>

              <div class="highlight-item">
                <ShieldCheck size={15} class="hl-icon perf" />
                <div>
                  <strong>Tactical Mutability Lockdown</strong>
                  <p>Zero accidental data loss: Strikes only delete in Standby (converting to Abort otherwise); subtasks only delete in Initiated (converting to Failed).</p>
                </div>
              </div>

              <div class="highlight-item">
                <Zap size={15} class="hl-icon chronos" />
                <div>
                  <strong>Chronos Real-Time Temporal Engine</strong>
                  <p>Advanced natural language date parsing, real-time deadline countdowns, auto-breach detection, and schedule calendar theater.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 2: SMART INLINE SYNTAX GUIDE -->
        <div class="guide-section">
          <div class="section-title">
            <Zap size={16} class="sec-icon amber" />
            <span>⚡ SMART INLINE SYNTAX GUIDE (ZERO-MOUSE SPEED ENTRY)</span>
          </div>

          <p class="section-intro-text">
            Type natural priority hashtags and date tags directly into the title input box when creating tasks (<kbd>Ctrl</kbd>+<kbd>N</kbd>) or dispatching strikes (<kbd>N</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd>). All tags are evaluated in real time with live visual UI feedback and cleanly stripped upon submitting!
          </p>

          <div class="syntax-grid">
            <!-- Syntax Card 1: Priority Hashtags -->
            <div class="syntax-card">
              <div class="syntax-card-header">
                <Tag size={15} class="syntax-icon pri" />
                <strong>1. PRIORITY HASHTAGS (#PRIORITY)</strong>
              </div>
              <div class="syntax-list">
                <div class="syntax-row">
                  <span class="syntax-code">#High</span>
                  <span class="syntax-meaning">Sets Priority to <strong>HIGH</strong> (Red Glow, <Flame size={12} class="inline-icon red" />)</span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">#Med</span> or <span class="syntax-code">#Medium</span>
                  <span class="syntax-meaning">Sets Priority to <strong>MEDIUM</strong> (Amber Glow, <AlertTriangle size={12} class="inline-icon amber" />)</span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">#Low</span>
                  <span class="syntax-meaning">Sets Priority to <strong>LOW</strong> (Blue Glow, <Shield size={12} class="inline-icon blue" />)</span>
                </div>
              </div>
              <div class="syntax-example">
                <span class="ex-lbl">EXAMPLE:</span>
                <code>Upgrade TLS Certificates #High</code> ➔ <em>Priority: High, Title: "Upgrade TLS Certificates"</em>
              </div>
            </div>

            <!-- Syntax Card 2: Natural Language Date Keywords -->
            <div class="syntax-card">
              <div class="syntax-card-header">
                <Calendar size={15} class="syntax-icon date" />
                <strong>2. NATURAL RELATIVE DATES (@DATE)</strong>
              </div>
              <div class="syntax-list">
                <div class="syntax-row">
                  <span class="syntax-code">@today</span> or <span class="syntax-code">@tod</span>
                  <span class="syntax-meaning">Today's current execution date (+0 days)</span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">@tom</span> or <span class="syntax-code">@tomorrow</span> or <span class="syntax-code">@next</span>
                  <span class="syntax-meaning">Tomorrow's execution date (+1 day)</span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">@over</span> or <span class="syntax-code">@overmorrow</span>
                  <span class="syntax-meaning">Day after tomorrow (+2 days)</span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">@+3d</span> or <span class="syntax-code">@in3days</span> or <span class="syntax-code">@+1w</span>
                  <span class="syntax-meaning">Relative day/week offset (+N days or +N weeks)</span>
                </div>
              </div>
              <div class="syntax-example">
                <span class="ex-lbl">EXAMPLE:</span>
                <code>Database Backup @tom #High</code> ➔ <em>Schedules for Tomorrow with High Priority</em>
              </div>
            </div>

            <!-- Syntax Card 3: Weekdays & Calendar Bounds -->
            <div class="syntax-card">
              <div class="syntax-card-header">
                <Compass size={15} class="syntax-icon cal" />
                <strong>3. UPCOMING WEEKDAYS &amp; BOUNDS (@DAY)</strong>
              </div>
              <div class="syntax-list">
                <div class="syntax-row">
                  <span class="syntax-code">@nextmon</span> / <span class="syntax-code">@mon</span>
                  <span class="syntax-meaning">Upcoming next <strong>Monday</strong></span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">@nexttue</span> … <span class="syntax-code">@nextsun</span>
                  <span class="syntax-meaning">Upcoming target weekday (Tue, Wed, Thu, Fri, Sat, Sun)</span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">@weekend</span> / <span class="syntax-code">@nextweekend</span>
                  <span class="syntax-meaning">Upcoming target Saturday</span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">@nextmonth</span> or <span class="syntax-code">@eom</span>
                  <span class="syntax-meaning">1st of next month (<span class="syntax-code">@nextmonth</span>) or End of current month (<span class="syntax-code">@eom</span>)</span>
                </div>
              </div>
              <div class="syntax-example">
                <span class="ex-lbl">EXAMPLE:</span>
                <code>Plan Sprint Directives @nextmon</code> ➔ <em>Schedules for coming Monday</em>
              </div>
            </div>

            <!-- Syntax Card 4: Numeric Dates & Past Guard -->
            <div class="syntax-card">
              <div class="syntax-card-header">
                <ShieldCheck size={15} class="syntax-icon guard" />
                <strong>4. EXPLICIT DATES &amp; ANTI-PAST LOCK</strong>
              </div>
              <div class="syntax-list">
                <div class="syntax-row">
                  <span class="syntax-code">@DD</span> (e.g. <span class="syntax-code">@31</span>)
                  <span class="syntax-meaning">Resolves against current month and year</span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">@DD-MM</span> (e.g. <span class="syntax-code">@01-09</span>)
                  <span class="syntax-meaning">Resolves day &amp; month against current year</span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">@DD-MM-YYYY</span>
                  <span class="syntax-meaning">Explicit calendar date (also accepts <span class="syntax-code">/</span> or <span class="syntax-code">.</span>)</span>
                </div>
                <div class="syntax-row">
                  <span class="syntax-code">Anti-Past Lock</span>
                  <span class="syntax-meaning">Past dates are blocked with <span class="syntax-code red">⚠️ PAST DATE BLOCKED</span> alert</span>
                </div>
              </div>
              <div class="syntax-example">
                <span class="ex-lbl">EXAMPLE:</span>
                <code>Monthly Audit @01-09 #Med</code> ➔ <em>Schedules for 01-09-2026 with Medium Priority</em>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 3: MUTABILITY LOCKDOWN & DIRECTIVE INTEGRITY -->
        <div class="guide-section">
          <div class="section-title">
            <ShieldCheck size={16} class="sec-icon purple" />
            <span>⚔️ TACTICAL DIRECTIVE &amp; SUBTASK MUTABILITY RULES (RELEASE 3)</span>
          </div>

          <div class="lockdown-grid">
            <div class="lockdown-card strike-lockdown">
              <div class="lockdown-header">
                <Zap size={16} class="lockdown-icon amber" />
                <strong>STRIKES DIRECTIVE INTEGRITY PROTOCOL</strong>
              </div>
              <div class="lockdown-body">
                <div class="lockdown-item">
                  <span class="status-badge standby">STANDBY STATUS</span>
                  <p>Unengaged strikes in Standby display the <Trash2 size={13} class="inline-icon" /> <strong>Delete</strong> button (<kbd>Delete</kbd> / <kbd>X</kbd> key) for full removal.</p>
                </div>
                <div class="lockdown-item">
                  <span class="status-badge engaged">ENGAGED / PENDING STATUS</span>
                  <p>Active/in-progress strikes display the compact <span class="btn-symbol abort">A</span> <strong>Abort Button</strong> to mark <code>ABORTED</code> without losing telemetry.</p>
                </div>
                <div class="lockdown-item">
                  <span class="status-badge completed">NEUTRALIZED STATUS</span>
                  <p>Successfully executed/completed strikes are locked and finalized. They cannot be aborted or deleted.</p>
                </div>
              </div>
            </div>

            <div class="lockdown-card subtask-lockdown">
              <div class="lockdown-header">
                <Layers size={16} class="lockdown-icon emerald" />
                <strong>GRANULAR SUBTASK INTEGRITY PROTOCOL</strong>
              </div>
              <div class="lockdown-body">
                <div class="lockdown-item">
                  <span class="status-badge initiated">INITIATED STATUS</span>
                  <p>Only unstarted subtasks in Initiated status can be deleted via the <Trash2 size={13} class="inline-icon" /> <strong>Delete</strong> button (<kbd>Delete</kbd> / <kbd>X</kbd> key).</p>
                </div>
                <div class="lockdown-item">
                  <span class="status-badge doing">DOING STATUS</span>
                  <p>In-progress subtasks can be advanced to <code>Completed</code> (<kbd>Space</kbd>) or marked with the <span class="btn-symbol fail">F</span> <strong>FAILED Button</strong>.</p>
                </div>
                <div class="lockdown-item">
                  <span class="status-badge completed">COMPLETED STATUS</span>
                  <p>Finished and completed subtasks are finalized successes. They are locked and cannot be failed or deleted.</p>
                </div>
                <div class="lockdown-item">
                  <span class="status-badge failed">FAILED STATUS</span>
                  <p>Subtasks marked failed are preserved permanently for mission audit and markdown sync.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 4: STRATEGIES PROTOCOL & VERIFICATION SYSTEM -->
        <div class="guide-section">
          <div class="section-title">
            <FileText size={16} class="sec-icon blue" />
            <span>📁 STRATEGIES PROTOCOL &amp; VERIFICATION AUDIT SYSTEM</span>
          </div>

          <div class="strategies-info-card">
            <div class="strat-row">
              <div class="strat-col">
                <strong>6-Tier Workspace Structure</strong>
                <p>Strategies documents reside in <code>Arsenal/RawIntel</code>, <code>Arsenal/Strategizing</code>, <code>Execution</code>, <code>Breach</code>, <code>Archive/Victory</code>, and <code>Archive/Aborted</code>.</p>
              </div>
              <div class="strat-col">
                <strong>Immutable Frontmatter ID</strong>
                <p>Every file is anchored with <code>Task Id: &lt;id&gt;</code> in its YAML header, ensuring persistent identity even if renamed in Obsidian.</p>
              </div>
              <div class="strat-col">
                <strong>Sentinel Notes Protection</strong>
                <p>Personal notes below <code>&lt;!-- @@CAMPAIGNS_NOTES_START@@ --&gt;</code> are 100% immune from overwrites during state shifts and syncs.</p>
              </div>
              <div class="strat-col">
                <strong>One-Click Integrity Audit</strong>
                <p>Open Storage Config (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>) and click <strong>VERIFY INTEGRITY</strong> to audit directory health, synced files, and notes boundaries.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 5: CATEGORIZED KEYBOARD SHORTCUTS -->
        <div class="guide-section">
          <div class="section-title">
            <Command size={16} class="sec-icon blue" />
            <span>CATEGORIZED KEYBOARD SHORTCUTS DIRECTORY</span>
          </div>

          <!-- Category A: Global Navigation -->
          <div class="category-block">
            <div class="category-header nav">
              <Compass size={14} />
              <span>1. GLOBAL NAVIGATION &amp; THEATER SWITCHING</span>
            </div>
            <div class="shortcut-grid">
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>1</kbd></span>
                <span class="shortcut-desc">Switch to <strong>EXECUTION</strong> (Active Battlefield)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>2</kbd></span>
                <span class="shortcut-desc">Switch to <strong>ARSENAL</strong> (Intel &amp; Planning)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>3</kbd></span>
                <span class="shortcut-desc">Switch to <strong>BREACH</strong> (Overdue Recovery)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>4</kbd></span>
                <span class="shortcut-desc">Switch to <strong>ARCHIVE</strong> (Victory &amp; Aborted)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>5</kbd></span>
                <span class="shortcut-desc">Switch to <strong>STRIKES</strong> (Temporal Directives)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>D</kbd></span>
                <span class="shortcut-desc">Switch Strikes to <strong>DAY</strong> view</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>W</kbd></span>
                <span class="shortcut-desc">Switch Strikes to <strong>WEEK</strong> view</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>3</kbd></span>
                <span class="shortcut-desc">Switch Strikes to <strong>3 DAYS</strong> view</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>S</kbd></span>
                <span class="shortcut-desc">Switch Strikes to <strong>SCHEDULE</strong> view</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>T</kbd></span>
                <span class="shortcut-desc"><strong>RETURN TO TODAY</strong> in Strikes</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>←</kbd> / <kbd>→</kbd></span>
                <span class="shortcut-desc"><strong>STEP DATE</strong> backward / forward</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd></span>
                <span class="shortcut-desc">Single-Key <strong>TAB CYCLING</strong> across all 5 theaters</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>N</kbd></span>
                <span class="shortcut-desc"><strong>NEW DIRECTIVE / CAMPAIGN</strong> (Auto-focused creation)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>F</kbd> or <kbd>/</kbd></span>
                <span class="shortcut-desc">Instant <strong>SEARCH BAR FOCUS</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>P</kbd></span>
                <span class="shortcut-desc">Cycle <strong>PRIORITY FILTERS</strong> (ALL / HIGH / MED / LOW)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Esc</kbd></span>
                <span class="shortcut-desc"><strong>SMART ESCAPE</strong> (Dismiss Pickers → Clear Text → Close Windows)</span>
              </div>
            </div>
          </div>

          <!-- Category B: Battlefield & Card Controls -->
          <div class="category-block">
            <div class="category-header card-ctrl">
              <Shield size={14} />
              <span>2. BATTLEFIELD &amp; CARD CONTROLS</span>
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
                <span class="shortcut-desc">Trigger <strong>TYPE-TO-CONFIRM PURGE</strong> on Raw Intel Card</span>
              </div>
            </div>
          </div>

          <!-- Category C: Strikes Day View Card Controls -->
          <div class="category-block">
            <div class="category-header strikes-kb">
              <Zap size={14} />
              <span>3. STRIKES DAY VIEW — CARD KEYBOARD CONTROLS</span>
            </div>
            <div class="shortcut-grid">
              <div class="shortcut-card">
                <span class="key-combo"><kbd>J</kbd> / <kbd>K</kbd> or <kbd>↓</kbd> / <kbd>↑</kbd></span>
                <span class="shortcut-desc">Navigate &amp; Focus <strong>STRIKE CARDS</strong> in Day View</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Space</kbd></span>
                <span class="shortcut-desc">Toggle <strong>STATUS</strong> of focused Strike (Standby → Engaged → Neutralized)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Enter</kbd> or <kbd>E</kbd></span>
                <span class="shortcut-desc">Open <strong>EDIT MODAL</strong> for focused Strike</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Delete</kbd> or <kbd>X</kbd></span>
                <span class="shortcut-desc"><strong>DELETE (if Standby) or ABORT (if Engaged/Pending)</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>N</kbd> or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd></span>
                <span class="shortcut-desc">Open <strong>NEW STRIKE DIRECTIVE</strong> Creation Modal</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Esc</kbd></span>
                <span class="shortcut-desc"><strong>CLEAR</strong> card focus / Close active Strikes modal</span>
              </div>
            </div>
          </div>

          <!-- Category D: Subtask & Micro-Step Protocols -->
          <div class="category-block">
            <div class="category-header subtasks">
              <Layers size={14} />
              <span>4. SUBTASK &amp; MICRO-STEP PROTOCOLS (INSIDE TASK WINDOW)</span>
            </div>
            <div class="shortcut-grid">
              <div class="shortcut-card">
                <span class="key-combo"><kbd>N</kbd> (in Task Window)</span>
                <span class="shortcut-desc">Focus <strong>ADD SUBTASK</strong> Input Box</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>J</kbd> / <kbd>K</kbd> or <kbd>↓</kbd> / <kbd>↑</kbd></span>
                <span class="shortcut-desc">Navigate &amp; Highlight <strong>SUBTASK CARDS</strong></span>
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
                <span class="shortcut-desc"><strong>DELETE (if Initiated) or MARK FAILED (if Doing/Completed)</strong></span>
              </div>
            </div>
          </div>

          <!-- Category E: System, Storage & Debug Commands -->
          <div class="category-block">
            <div class="category-header system">
              <FolderCog size={14} />
              <span>5. SYSTEM, STORAGE &amp; VERIFICATION COMMANDS</span>
            </div>
            <div class="shortcut-grid">
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>N</kbd></span>
                <span class="shortcut-desc">Open <strong>LOG NEW CAMPAIGN / STRIKE</strong> (Context-aware)</span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> (in Dialog)</span>
                <span class="shortcut-desc">Instant Priority Toggle <strong>(1: HIGH, 2: MED, 3: LOW)</strong></span>
              </div>
              <div class="shortcut-card">
                <span class="key-combo"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd></span>
                <span class="shortcut-desc">Open <strong>WORKSPACE, .DB &amp; VERIFY INTEGRITY</strong> Modal</span>
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
            </div>
          </div>

        </div>

        <!-- SECTION 6: CAMPAIGN LIFE CYCLE STATES & RULES -->
        <div class="guide-section">
          <div class="section-title">
            <BookOpen size={16} class="sec-icon amber" />
            <span>CAMPAIGN THEATERS &amp; LIFECYCLE DIRECTIVES</span>
          </div>

          <div class="rules-grid">
            <div class="rule-card arsenal">
              <div class="rule-header">
                <Shield size={16} class="rule-icon" />
                <strong>ARSENAL THEATER</strong>
              </div>
              <p>Staging hub for campaign intelligence. Formulate strategic plans in <em>Raw Intel</em> and <em>Strategizing</em> columns. Structure subtasks and prepare briefings prior to battlefield deployment.</p>
            </div>

            <div class="rule-card execution">
              <div class="rule-header">
                <Zap size={16} class="rule-icon" />
                <strong>EXECUTION THEATER</strong>
              </div>
              <p>Active operational battlefield. Requires an active target deadline. Real-time countdown tracks days remaining. Completed missions advance to <em>Victory</em>.</p>
            </div>

            <div class="rule-card breach">
              <div class="rule-header">
                <Flame size={16} class="rule-icon" />
                <strong>BREACH THEATER</strong>
              </div>
              <p>Overdue recovery zone triggered when a deadline lapses. Maximum <strong>2 Reschedule Permits</strong> allowed per campaign to extend timeline and redeploy to Execution.</p>
            </div>

            <div class="rule-card archive">
              <div class="rule-header">
                <Archive size={16} class="rule-icon" />
                <strong>ARCHIVE THEATER</strong>
              </div>
              <p>Permanent historical ledger storing concluded operations (<em>Victory</em> or <em>Aborted</em>). Requires an operational End Note and seals the immutable campaign audit trail.</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <span class="footer-note">CAMPAIGNS COMMAND CENTER v3.0 • PRESS ESCAPE OR CLICK CLOSE</span>
        <button type="button" class="btn-guide-close" onclick={() => store.isHelpModalOpen = false}>CLOSE GUIDE</button>
      </div>

    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 64px;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 8000;
    background: rgba(4, 7, 14, 0.88);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
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
    max-width: 1040px;
    max-height: 80vh;
    background: rgba(12, 17, 29, 0.98);
    border: 1px solid rgba(139, 92, 246, 0.40);
    border-radius: 26px;
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
    width: 36px;
    height: 36px;
    border-radius: 50% !important;
    background: rgba(255, 255, 255, 0.06);
    border: 1.5px solid rgba(255, 255, 255, 0.14);
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .close-btn:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.7);
    color: #fca5a5;
    transform: rotate(90deg) scale(1.08);
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.45);
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

  .section-intro-text {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-main);
    line-height: 1.5;
    margin: 0;
  }

  /* ─── SMART INLINE SYNTAX GRID ─── */
  .syntax-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .syntax-card {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  }

  .syntax-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #f3e8ff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 6px;
  }
  :global(.syntax-icon.pri) { color: #f87171; }
  :global(.syntax-icon.date) { color: #c4b5fd; }
  :global(.syntax-icon.cal) { color: #60a5fa; }
  :global(.syntax-icon.guard) { color: #34d399; }

  .syntax-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .syntax-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
  }

  .syntax-code {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 6px;
    background: rgba(139, 92, 246, 0.18);
    border: 1px solid rgba(139, 92, 246, 0.4);
    color: #ddd6fe;
    white-space: nowrap;
  }
  .syntax-code.red {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
    color: #fca5a5;
  }

  .syntax-meaning {
    color: var(--text-muted);
    font-weight: 600;
    line-height: 1.35;
  }
  .syntax-meaning strong { color: #f3e8ff; }

  .syntax-example {
    margin-top: 4px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ex-lbl {
    font-size: 9.5px;
    font-weight: 900;
    color: #fbbf24;
    letter-spacing: 0.08em;
  }
  .syntax-example code {
    font-family: 'Courier New', monospace;
    color: #93c5fd;
    font-weight: 700;
  }
  .syntax-example em {
    color: #a7f3d0;
    font-style: normal;
    font-weight: 600;
  }

  :global(.inline-icon) { vertical-align: middle; }
  :global(.inline-icon.red) { color: #f87171; }
  :global(.inline-icon.amber) { color: #fbbf24; }
  :global(.inline-icon.blue) { color: #60a5fa; }

  /* ─── LOCKDOWN GRID ─── */
  .lockdown-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .lockdown-card {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .lockdown-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: #f3e8ff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 8px;
  }
  :global(.lockdown-icon.amber) { color: #fbbf24; }
  :global(.lockdown-icon.emerald) { color: #34d399; }

  .lockdown-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .lockdown-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .lockdown-item p {
    font-size: 11.5px;
    line-height: 1.45;
    color: var(--text-muted);
    margin: 0;
  }
  .lockdown-item p strong { color: #f3e8ff; }

  .status-badge {
    display: inline-block;
    align-self: flex-start;
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.07em;
    padding: 2px 8px;
    border-radius: 6px;
    text-transform: uppercase;
  }
  .status-badge.standby { background: rgba(245, 158, 11, 0.2); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.4); }
  .status-badge.engaged { background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); }
  .status-badge.doing { background: rgba(245, 158, 11, 0.2); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.4); }
  .status-badge.completed { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); }
  .status-badge.initiated { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4); }
  .status-badge.failed { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); }

  .btn-symbol {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 10px;
    font-weight: 900;
    vertical-align: middle;
  }
  .btn-symbol.abort {
    background: rgba(245, 158, 11, 0.25);
    border: 1px solid rgba(245, 158, 11, 0.6);
    color: #fde047;
  }
  .btn-symbol.fail {
    background: rgba(239, 68, 68, 0.25);
    border: 1px solid rgba(239, 68, 68, 0.6);
    color: #fca5a5;
  }

  /* ─── STRATEGIES INFO CARD ─── */
  .strategies-info-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 16px 20px;
  }
  .strat-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .strat-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .strat-col strong {
    font-size: 11.5px;
    font-weight: 800;
    color: #93c5fd;
    letter-spacing: 0.02em;
  }
  .strat-col p {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.4;
    margin: 0;
  }
  .strat-col code {
    font-family: 'Courier New', monospace;
    color: #ddd6fe;
    font-size: 10.5px;
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
  .category-header.strikes-kb { color: #fcd34d; }
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
    padding: 10px 24px;
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.06em;
    word-spacing: 0.06em;
    color: #f3e8ff;
    background: rgba(139, 92, 246, 0.25);
    border: 1px solid rgba(139, 92, 246, 0.5);
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-guide-close:hover {
    background: rgba(139, 92, 246, 0.4);
    border-color: rgba(168, 85, 247, 0.7);
    transform: translateY(-1px);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.35);
  }
</style>
