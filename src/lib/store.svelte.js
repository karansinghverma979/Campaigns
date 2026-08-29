import { ChronosMath, getFormattedDate } from './ChronosMath.js';

// Central store using Svelte 5 $state
class CampaignStore {
  tasks = $state([]);
  strikes = $state([]);
  activeTab = $state('EXECUTION'); // EXECUTION, ARSENAL, BREACH, ARCHIVED, STRIKES
  isTaskModalOpen = $state(false);
  isConfigured = $state(false);
  strategiesPath = $state(null);
  dbPath = $state(null);
  isLoading = $state(true);

  // Toast alert system
  toast = $state({ show: false, message: '', type: 'warning' });

  // Debug Log System (Ctrl+Shift+E)
  errorLogs = $state([]);
  isDebugModalOpen = $state(false);

  // Help Guide Modal (Ctrl+?)
  isHelpModalOpen = $state(false);

  // Storage & DB Path Configuration Modal (Ctrl+Shift+C)
  isConfigModalOpen = $state(false);

  // Tag Manager Modal (Ctrl+Shift+T)
  isTagManagerOpen = $state(false);

  // Strike Creation Modal (Ctrl+Shift+K or + pill button)
  isStrikeModalOpen = $state(false);

  // Auto-Highlight System for created / updated / transferred items
  highlightedTaskId = $state(null);
  highlightedStrikeId = $state(null);
  #taskHighlightTimer = null;
  #strikeHighlightTimer = null;
  #midnightUnsubscribe = null;

  get activeModal() {
    if (this.isTaskModalOpen) return 'TASK';
    if (this.isHelpModalOpen) return 'HELP';
    if (this.isConfigModalOpen) return 'CONFIG';
    if (this.isTagManagerOpen) return 'TAG';
    if (this.isStrikeModalOpen) return 'STRIKE';
    return null;
  }

  closeAllModals() {
    this.isTaskModalOpen = false;
    this.isHelpModalOpen = false;
    this.isConfigModalOpen = false;
    this.isTagManagerOpen = false;
    this.isStrikeModalOpen = false;
  }

  updateTaskSubtaskStats(taskId, subtasks) {
    if (!taskId || !this.tasks) return;
    const t = this.tasks.find(task => task.id === taskId);
    if (t && Array.isArray(subtasks)) {
      t.subtask_total = subtasks.length;
      t.subtask_completed = subtasks.filter(s => s.status === 'Completed').length;
      t.subtask_doing = subtasks.filter(s => s.status === 'Doing').length;
      t.subtask_failed = subtasks.filter(s => s.status === 'Failed').length;
    }
  }

  setHighlightedTaskId(id) {
    if (this.#taskHighlightTimer) {
      clearTimeout(this.#taskHighlightTimer);
      this.#taskHighlightTimer = null;
    }
    this.highlightedTaskId = id;
    this.#taskHighlightTimer = setTimeout(() => {
      this.highlightedTaskId = null;
      this.#taskHighlightTimer = null;
    }, 3000);
  }

  setHighlightedStrikeId(id) {
    if (this.#strikeHighlightTimer) {
      clearTimeout(this.#strikeHighlightTimer);
      this.#strikeHighlightTimer = null;
    }
    this.highlightedStrikeId = id;
    this.#strikeHighlightTimer = setTimeout(() => {
      this.highlightedStrikeId = null;
      this.#strikeHighlightTimer = null;
    }, 3500);
  }

  navigateToStrike(strikeId) {
    if (!strikeId) return;
    this.activeTab = 'STRIKES';
    this.setHighlightedStrikeId(strikeId);
  }

  navigateToTask(taskId) {
    if (!taskId) return;
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      if (task.state === 'Arsenal') this.activeTab = 'ARSENAL';
      else if (task.state === 'Execution') this.activeTab = 'EXECUTION';
      else if (task.state === 'Breach') this.activeTab = 'BREACH';
      else if (task.state === 'Archive') this.activeTab = 'ARCHIVED';
      else this.activeTab = 'EXECUTION';
    } else {
      this.activeTab = 'EXECUTION';
    }
    this.setHighlightedTaskId(taskId);
  }

  // Derived tasks arrays
  arsenalTasks = $state([]);
  executionTasks = $state([]);
  breachTasks = $state([]);
  archiveTasks = $state([]);

  rebuildBuckets() {
    this.arsenalTasks = this.tasks.filter(t => t.state === 'Arsenal');
    this.executionTasks = this.tasks.filter(t => t.state === 'Execution');
    this.breachTasks = this.tasks.filter(t => t.state === 'Breach');
    this.archiveTasks = this.tasks.filter(t => t.state === 'Archive');
  }

  toastTimer = null;

  showToast(message, type = 'warning', options = {}) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = {
      show: true,
      message,
      type,
      action: options.action || null,
      actionLabel: options.actionLabel || ''
    };
    this.toastTimer = setTimeout(() => {
      this.toast.show = false;
      this.toast.action = null;
    }, 4000);
  }

  logError(errorStr, severity = 'Low') {
    const time = new Date().toLocaleTimeString();
    this.errorLogs.unshift({ time, error: errorStr, severity });
    if (this.errorLogs.length > 100) {
      this.errorLogs = this.errorLogs.slice(0, 100);
    }
    console.error(`[${severity}] ${errorStr}`);
  }

  async init() {
    this.isLoading = true;
    try {
      if (window.electronAPI) {
        const config = await window.electronAPI.getConfig();
        if (config && config.isConfigured) {
          this.isConfigured = true;
          this.strategiesPath = config.strategiesPath;
          this.dbPath = config.dbPath;
          await this.loadAllData();

          // One-time startup breach detection
          if (window.electronAPI.bulkMoveBreachedTasks) {
            try {
              const breachRes = await window.electronAPI.bulkMoveBreachedTasks();
              if (breachRes && breachRes.success && breachRes.breachedTasks && breachRes.breachedTasks.length > 0) {
                const newlyBreachedCount = breachRes.breachedTasks.length;
                // Patch tasks in-place
                for (const bt of breachRes.breachedTasks) {
                  const idx = this.tasks.findIndex(t => t.id === bt.id);
                  if (idx !== -1) {
                    this.tasks[idx] = { ...this.tasks[idx], state: 'Breach', stage: 'Overdue' };
                  }
                }
                this.rebuildBuckets();
                if (window.electronAPI.sendNotification) {
                  window.electronAPI.sendNotification({
                    title: '🚨 CAMPAIGN BREACH ALERT',
                    body: `${newlyBreachedCount} active campaign(s) have passed deadline and transferred to Breach Recovery.`
                  }).catch(() => {});
                }
              }
            } catch (err) {
              this.logError('Failed to run startup breach detection: ' + err.message, 'High');
            }
          } else {
            const currentDate = getFormattedDate();
            let newlyBreachedCount = 0;
            for (const t of this.tasks) {
              if (t.state === 'Execution' && t.deadline) {
                if (ChronosMath.isBreached(t.deadline, currentDate)) {
                  try {
                    const res = await window.electronAPI.moveTaskState({ id: t.id, newState: 'Breach', newStage: 'Overdue' });
                    if (res && res.success) {
                      const idx = this.tasks.findIndex(tt => tt.id === t.id);
                      if (idx !== -1) {
                        this.tasks[idx] = { ...this.tasks[idx], state: 'Breach', stage: 'Overdue' };
                      }
                      newlyBreachedCount++;
                    }
                  } catch (err) {
                    this.logError(`Failed to update breach state for task ${t.id}: ` + err.message, 'High');
                  }
                }
              }
            }
            if (newlyBreachedCount > 0) {
              this.rebuildBuckets();
            }
            if (newlyBreachedCount > 0 && window.electronAPI && window.electronAPI.sendNotification) {
              try {
                window.electronAPI.sendNotification({
                  title: '🚨 CAMPAIGN BREACH ALERT',
                  body: `${newlyBreachedCount} active campaign(s) have passed deadline and transferred to Breach Recovery.`
                }).catch(() => {});
              } catch (e) {}
            }
          }

          // Clean up any existing listener before re-registering
          if (this.#midnightUnsubscribe) {
            this.#midnightUnsubscribe();
            this.#midnightUnsubscribe = null;
          }

          // Register reactive listener for midnight transitions from main process
          if (window.electronAPI && window.electronAPI.onMidnightDateChange) {
            this.#midnightUnsubscribe = window.electronAPI.onMidnightDateChange(async ({ today, newlyBreachedCount }) => {
              await this.loadAllData();
              if (newlyBreachedCount > 0) {
                this.showToast(
                  `${newlyBreachedCount} campaign(s) breached deadline — moved to Breach.`,
                  'warning',
                  { action: () => { this.activeTab = 'BREACH'; }, actionLabel: '→ GO TO BREACH' }
                );
              }
            });
          }
        } else {
          this.isConfigured = false;
        }
      } else {
        // Fallback for browser testing if ran without electron
        this.isConfigured = false;
        this.logError('Electron API not detected. Browser mode.', 'Warning');
      }
    } catch (e) {
      this.logError('Failed to initialize application: ' + e.message, 'High');
    } finally {
      this.isLoading = false;
    }
  }

  async selectDirectory() {
    if (!window.electronAPI) return;
    this.isLoading = true;
    try {
      const res = await window.electronAPI.selectStrategiesDir();
      if (res.success) {
        this.isConfigured = true;
        this.strategiesPath = res.strategiesPath;
        if (res.dbPath) this.dbPath = res.dbPath;
        await this.loadAllData();
        this.showToast('Strategies Command Center established successfully.', 'info');
      } else if (res.error !== 'Cancelled by user') {
        this.showToast('Failed to select directory: ' + res.error, 'danger');
        this.logError(res.error, 'High');
      }
    } catch (e) {
      this.showToast('Error during directory setup: ' + e.message, 'danger');
      this.logError(e.message, 'Fatal');
    } finally {
      this.isLoading = false;
    }
  }

  async relocateDirectory() {
    if (!window.electronAPI) return;
    this.isLoading = true;
    try {
      const res = await window.electronAPI.relocateStrategiesDir();
      if (res.success) {
        this.isConfigured = true;
        this.strategiesPath = res.strategiesPath;
        if (res.dbPath) this.dbPath = res.dbPath;
        await this.loadAllData();
        this.showToast('Strategies workspace relocated successfully.', 'info');
        this.isConfigModalOpen = false;
      } else if (res.error !== 'Cancelled by user') {
        this.showToast('Failed to relocate directory: ' + res.error, 'danger');
        this.logError(res.error, 'High');
      }
    } catch (e) {
      this.showToast('Error during directory relocation: ' + e.message, 'danger');
      this.logError(e.message, 'Fatal');
    } finally {
      this.isLoading = false;
    }
  }

  async relocateDbDirectory() {
    if (!window.electronAPI) return;
    this.isLoading = true;
    try {
      const res = await window.electronAPI.relocateDbDir();
      if (res.success) {
        this.dbPath = res.dbPath;
        this.showToast('Database file relocated successfully.', 'info');
      } else if (res.error !== 'Cancelled by user') {
        this.showToast('Failed to relocate database: ' + res.error, 'danger');
        this.logError(res.error, 'High');
      }
    } catch (e) {
      this.showToast('Error during database relocation: ' + e.message, 'danger');
      this.logError(e.message, 'Fatal');
    } finally {
      this.isLoading = false;
    }
  }

  syncTrayStatus() {
    if (!window.electronAPI || !window.electronAPI.updateTrayStatus) return;
    try {
      const execCount = this.executionTasks.length;
      const arsCount  = this.arsenalTasks.length;
      const breachCount = this.breachTasks.length;
      window.electronAPI.updateTrayStatus({
        titleText: `${execCount} Active Execution | ${arsCount} Arsenal | ${breachCount} Breach`
      }).catch(() => {});
    } catch (e) {}
  }

  async loadAllData() {
    if (this.toastTimer) { clearTimeout(this.toastTimer); this.toastTimer = null; this.toast.show = false; }
    if (!window.electronAPI) return;
    try {
      const taskRes = await window.electronAPI.getTasks();
      if (taskRes.success) {
        const rawTasks = taskRes.tasks || [];
        // Patch in-place to avoid destroying Svelte DOM refs
        const existingIds = new Set(this.tasks.map(t => t.id));
        const incomingIds = new Set(rawTasks.map(t => t.id));
        // Update or add
        for (const incoming of rawTasks) {
          const idx = this.tasks.findIndex(t => t.id === incoming.id);
          if (idx !== -1) {
            // Patch changed fields in place
            Object.assign(this.tasks[idx], incoming);
          } else {
            this.tasks.push(incoming);
          }
        }
        // Remove deleted tasks
        this.tasks = this.tasks.filter(t => incomingIds.has(t.id));
        this.rebuildBuckets();
        this.syncTrayStatus();
      } else {
        this.logError(taskRes.error, 'High');
        this.showToast('Database read error: ' + taskRes.error, 'danger');
      }

      const strikeRes = await window.electronAPI.getStrikes();
      if (strikeRes.success) {
        const rawStrikes = strikeRes.strikes || [];
        const strikesToPend = [];
        
        for (const s of rawStrikes) {
          if (s.status !== 'NEUTRALIZED' && s.status !== 'ABORTED' && s.status !== 'PENDING' && s.status !== 'TEMPLATE' && s.status !== 'UNDATED') {
            if (s.execution_date) {
              const parsed = ChronosMath.parseSubtaskDate('@' + s.execution_date);
              if (parsed && parsed.isPast) {
                strikesToPend.push(s.id);
                s.status = 'PENDING'; // Optimistic update
              }
            }
          }
        }

        if (strikesToPend.length > 0 && window.electronAPI.bulkUpdateStrikesPending) {
          window.electronAPI.bulkUpdateStrikesPending({ ids: strikesToPend }).catch(err => {
            this.logError('Failed to bulk-mark strikes PENDING: ' + err.message, 'Medium');
          });
          this.showToast(`⚡ ${strikesToPend.length} Strike(s) marked PENDING (past execution date).`, 'warning');
        }

        const existingStrikeIds = new Set(this.strikes.map(s => s.id));
        const incomingStrikeIds = new Set(rawStrikes.map(s => s.id));
        for (const incoming of rawStrikes) {
          const idx = this.strikes.findIndex(s => s.id === incoming.id);
          if (idx !== -1) {
            Object.assign(this.strikes[idx], incoming);
          } else {
            this.strikes.push(incoming);
          }
        }
        this.strikes = this.strikes.filter(s => incomingStrikeIds.has(s.id));
      }
    } catch (e) {
      this.logError(e.message, 'High');
    }
  }

  // ⚡ STRIKES CRUD OPERATIONS
  async createStrike({ title, execution_date, priority = 'Medium', status = 'STANDBY', notes = '', subtask_id = null, recurrence_id = null }) {
    if (!window.electronAPI) return null;
    try {
      const created_at = getFormattedDate();
      const res = await window.electronAPI.createStrike({
        title,
        created_at,
        execution_date: status === 'UNDATED' ? '' : (execution_date || created_at),
        priority,
        status,
        notes,
        subtask_id: subtask_id ? Number(subtask_id) : null,
        recurrence_id: recurrence_id || null
      });
      if (res.success) {
        this.strikes = [res.strike, ...this.strikes];
        this.setHighlightedStrikeId(res.strike.id);
        this.showToast('⚡ STRIKE INITIALIZED', 'info');
        return res.strike;
      } else {
        this.showToast('Failed to create Strike: ' + res.error, 'danger');
      }
    } catch (e) {
      this.showToast('Strike error: ' + e.message, 'danger');
    }
    return null;
  }

  async updateStrikeStatus(id, status) {
    if (!window.electronAPI) return false;
    try {
      const res = await window.electronAPI.updateStrikeStatus({ id, status });
      if (res.success) {
        const idx = this.strikes.findIndex(s => s.id === id);
        if (idx !== -1) this.strikes[idx] = res.strike;
        this.setHighlightedStrikeId(id);
        return true;
      }
    } catch (e) {
      this.showToast('Status update failed: ' + e.message, 'danger');
    }
    return false;
  }

  async rescheduleStrike(id, newExecutionDate) {
    if (!window.electronAPI) return false;
    const strike = this.strikes.find(s => s.id === id);
    if (strike && strike.reschedule_count >= 2) {
      this.showToast('Tactical Block: Maximum 2 reschedule permits allowed for this Strike.', 'warning');
      return false;
    }
    try {
      const res = await window.electronAPI.rescheduleStrike({ id, newExecutionDate });
      if (res.success) {
        const idx = this.strikes.findIndex(s => s.id === id);
        if (idx !== -1) this.strikes[idx] = res.strike;
        this.setHighlightedStrikeId(id);
        this.showToast(`Strike rescheduled to ${newExecutionDate}.`, 'info');
        return true;
      } else {
        this.showToast('Reschedule failed: ' + res.error, 'danger');
      }
    } catch (e) {
      this.showToast('Reschedule error: ' + e.message, 'danger');
    }
    return false;
  }

  async deployUndatedStrike(id, targetDate) {
    if (!window.electronAPI) return false;
    const strike = this.strikes.find(s => s.id === id);
    if (!strike) return false;
    try {
      const res = await window.electronAPI.updateStrike({
        id,
        title: strike.title,
        execution_date: targetDate,
        priority: strike.priority || 'Medium',
        status: 'STANDBY',
        notes: strike.notes || '',
        subtask_id: strike.subtask_id || null,
        recurrence_id: strike.recurrence_id || null
      });
      if (res.success) {
        const idx = this.strikes.findIndex(s => s.id === id);
        if (idx !== -1) this.strikes[idx] = res.strike;
        this.setHighlightedStrikeId(id);
        this.showToast(`⚡ Directive deployed to ${targetDate} (STANDBY).`, 'info');
        return true;
      }
    } catch (e) {
      this.showToast('Deploy error: ' + e.message, 'danger');
    }
    return false;
  }

  async updateStrike(strikeData) {
    if (!window.electronAPI) return false;
    try {
      const res = await window.electronAPI.updateStrike(strikeData);
      if (res.success) {
        const idx = this.strikes.findIndex(s => s.id === strikeData.id);
        if (idx !== -1) this.strikes[idx] = res.strike;
        this.setHighlightedStrikeId(strikeData.id);
        this.showToast('Strike directive updated.', 'info');
        return true;
      }
    } catch (e) {
      this.showToast('Update failed: ' + e.message, 'danger');
    }
    return false;
  }

  async deleteStrike(id) {
    if (!window.electronAPI) return false;
    try {
      const res = await window.electronAPI.deleteStrike(id);
      if (res.success) {
        this.strikes = this.strikes.filter(s => s.id !== id);
        this.showToast('Strike purged from radar.', 'info');
        return true;
      }
    } catch (e) {
      this.showToast('Delete failed: ' + e.message, 'danger');
    }
    return false;
  }

  async forceSync() {
    this.isLoading = true;
    try {
      await window.electronAPI.syncData();
      await this.loadAllData();
      this.showToast('System synchronized with Strategies directory.', 'info');
    } catch (e) {
      this.showToast('Sync error: ' + e.message, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async verifyStrategies() {
    if (!window.electronAPI || !window.electronAPI.verifyStrategiesIntegrity) {
      this.showToast('Verification API not available in current environment.', 'warning');
      return null;
    }
    this.isLoading = true;
    try {
      const res = await window.electronAPI.verifyStrategiesIntegrity();
      if (res && res.success) {
        this.showToast(`🛡️ STRATEGIES AUDIT COMPLETE: ${res.validSyncedFiles} files verified, ${res.sentinelProtectedCount} notes protected.`, 'info');
        this.logError(`[Strategies Verification] ${res.summary} (DB Tasks: ${res.totalDbTasks}, MD Files: ${res.totalMarkdownFiles})`, 'Low');
        return res;
      } else {
        this.showToast('Verification error: ' + (res?.error || 'Unknown error'), 'danger');
        return null;
      }
    } catch (e) {
      this.showToast('Verification failed: ' + e.message, 'danger');
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async triggerFullReload() {
    this.showToast('⚡ REFRESHING SYSTEM: Reloading latest configuration & state...', 'info');
    try {
      if (window.electronAPI && window.electronAPI.syncData) {
        await window.electronAPI.syncData();
      }
      if (window.electronAPI && window.electronAPI.reloadWindow) {
        window.electronAPI.reloadWindow();
      } else {
        window.location.reload();
      }
    } catch (e) {
      window.location.reload();
    }
  }

  // --- Task Operations ---
  async createArsenalTask({ title, priority, tags }) {
    if (!title || !title.trim()) {
      this.showToast('Campaign Title is required.', 'warning');
      return false;
    }
    const origin_date = getFormattedDate();
    const payload = { title: title.trim(), origin_date, priority, state: 'Arsenal', stage: 'RawIntel', tags };
    
    // Optimistic UI insert with UUID collision safety
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? `temp-${crypto.randomUUID()}` 
      : `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const tempTask = { ...payload, id: tempId, reschedule_count: 0 };
    this.tasks.unshift(tempTask);
    this.rebuildBuckets();

    try {
      const res = await window.electronAPI.createTask(payload);
      if (res.success) {
        // replace tempTask with real task
        const idx = this.tasks.findIndex(t => t.id === tempTask.id);
        if (idx !== -1) this.tasks[idx] = res.task;
        this.rebuildBuckets();
        this.setHighlightedTaskId(res.task.id);
        this.showToast(`Campaign '${title}' logged in Arsenal.`, 'info');
        return true;
      } else {
        this.tasks = this.tasks.filter(t => t.id !== tempTask.id);
        this.rebuildBuckets();
        this.showToast('Creation failed: ' + res.error, 'danger');
        return false;
      }
    } catch (e) {
      this.tasks = this.tasks.filter(t => t.id !== tempTask.id);
      this.rebuildBuckets();
      this.logError(e.message, 'High');
      return false;
    }
  }

  async duplicateTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const origin_date = getFormattedDate();
    try {
      if (window.electronAPI && window.electronAPI.duplicateTask) {
        const res = await window.electronAPI.duplicateTask({ taskId, origin_date });
        if (res && res.success && res.task) {
          this.tasks = [res.task, ...this.tasks];
          this.rebuildBuckets();
          this.setHighlightedTaskId(res.task.id);
          const dest = res.task.stage === 'Strategizing' ? 'Strategizing' : 'Raw Intel';
          this.showToast(`Duplicated to ${dest}: '${res.task.title}'.`, 'info');
          return res.task;
        } else {
          this.showToast('Duplication failed: ' + (res ? res.error : 'Unknown error'), 'danger');
          return false;
        }
      }
      return false;
    } catch (e) {
      this.logError(e.message, 'High');
      return false;
    }
  }

  async updateTask({ id, title, priority, stage, state, tags }) {
    try {
      const res = await window.electronAPI.updateTask({ id, title, priority, stage, state, tags });
      if (res && res.success && res.task) {
        const idx = this.tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
          this.tasks[idx] = { ...this.tasks[idx], ...res.task };
        }
        this.rebuildBuckets();
        this.setHighlightedTaskId(id);
        return { success: true, task: res.task };
      }
      return res || { success: false, error: 'Update failed' };
    } catch (e) {
      this.logError(e.message, 'High');
      return { success: false, error: e.message };
    }
  }

  async assignDeadlineAndExecute(taskId, deadline) {
    if (!deadline) {
      this.showToast('Valid deadline date required for deployment to Execution.', 'warning');
      return false;
    }
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const initiated_at = getFormattedDate();

    // Snapshot all mutated fields for comprehensive rollback
    const oldState = task.state;
    const oldStage = task.stage;
    const oldDeadline = task.deadline;
    const oldInitiatedAt = task.initiated_at;

    // Optimistic UI state change
    task.state = 'Execution';
    task.stage = 'Active';
    task.deadline = deadline;
    task.initiated_at = initiated_at;
    this.rebuildBuckets();

    try {
      const res = await window.electronAPI.moveTaskState({
        id: taskId,
        newState: 'Execution',
        newStage: 'Active',
        deadline,
        initiated_at
      });
      if (!res.success) {
        task.state = oldState;
        task.stage = oldStage;
        task.deadline = oldDeadline;
        task.initiated_at = oldInitiatedAt;
        this.rebuildBuckets();
        this.showToast('Deployment failed: ' + res.error, 'danger');
        this.logError(res.error, 'High');
        return false;
      }
      if (res.task) {
        const idx = this.tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
          this.tasks[idx] = { ...this.tasks[idx], ...res.task };
          this.rebuildBuckets();
        }
      }
      this.showToast(`Campaign '${task.title}' deployed to Execution battlefield.`, 'info');
      return true;
    } catch (e) {
      task.state = oldState;
      task.stage = oldStage;
      task.deadline = oldDeadline;
      task.initiated_at = oldInitiatedAt;
      this.rebuildBuckets();
      this.logError(e.message, 'High');
      return false;
    }
  }

  async rescheduleTask(taskId, newDeadline) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    if (task.reschedule_count >= 2) {
      this.showToast('Tactical Block: Maximum 2 reschedule permits allowed.', 'warning');
      return false;
    }

    try {
      const res = await window.electronAPI.rescheduleTask({ id: taskId, newDeadline });
      if (res.success) {
        const idx = this.tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
          this.tasks[idx] = res.task;
          this.rebuildBuckets();
        }
        this.showToast(`Campaign rescheduled to ${newDeadline}. State restored to Execution.`, 'info');
        return true;
      } else {
        this.showToast('Reschedule failed: ' + res.error, 'danger');
        return false;
      }
    } catch (e) {
      this.logError(e.message, 'High');
      return false;
    }
  }

  async archiveTask(taskId, victoryOrAbort, end_note) {
    if (!end_note || !end_note.trim()) {
      this.showToast('Action Block: A tactical End Note is mandatory before Archiving.', 'warning');
      return false;
    }

    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const ended_date = getFormattedDate();
    const stage = victoryOrAbort === 'Victory' ? 'Victory' : 'Aborted';

    try {
      const res = await window.electronAPI.moveTaskState({
        id: taskId,
        newState: 'Archive',
        newStage: stage,
        ended_date,
        end_note: end_note.trim()
      });

      if (res.success) {
        const idx = this.tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
          this.tasks[idx] = res.task;
          this.rebuildBuckets();
        }
        this.showToast(`Campaign archived with status: ${stage}.`, 'info');
        return true;
      } else {
        this.showToast('Archive transition failed: ' + res.error, 'danger');
        return false;
      }
    } catch (e) {
      this.logError(e.message, 'High');
      return false;
    }
  }

  async deleteTask(taskId) {
    const task = this.tasks.find(t => String(t.id) === String(taskId));

    if (!task) {
      this.showToast('Campaign not found.', 'error');
      return { success: false, error: 'Not found' };
    }
    if (task.state !== 'Arsenal') {
      this.showToast('PURGE DENIED: Only Arsenal campaigns can be permanently purged.', 'error');
      return { success: false, error: 'State guard' };
    }

    try {
      const res = await window.electronAPI.deleteTask(taskId);
      if (res && res.success) {
        this.tasks = this.tasks.filter(t => String(t.id) !== String(taskId));
        this.rebuildBuckets();
        const titleText = task ? `'${task.title}'` : '';
        this.showToast(`Campaign ${titleText} permanently purged.`, 'info');
        return true;
      } else {
        this.showToast('Purge failed: ' + (res ? res.error : 'Unknown error'), 'danger');
        return false;
      }
    } catch (e) {
      this.logError(e.message, 'High');
      return false;
    }
  }

  async openStrategiesFile(task) {
    try {
      const res = await window.electronAPI.openMarkdownFile({ taskId: task.id, state: task.state, title: task.title });
      if (!res.success) {
        this.showToast('Could not open Strategies file: ' + res.error, 'danger');
      }
    } catch (e) {
      this.logError(e.message, 'Medium');
    }
  }

  async openStrategiesFolder() {
    if (!window.electronAPI || !window.electronAPI.openStrategiesFolder) {
      this.showToast('Strategies folder access unavailable in browser mode.', 'warning');
      return;
    }
    try {
      const res = await window.electronAPI.openStrategiesFolder();
      if (res.success) {
        this.showToast('Opened Strategies folder in File Explorer.', 'info');
      } else {
        this.showToast('Could not open Strategies folder: ' + res.error, 'danger');
      }
    } catch (e) {
      this.showToast('Error opening Strategies folder: ' + e.message, 'danger');
      this.logError(e.message, 'Medium');
    }
  }

  async openDbLocation() {
    if (!window.electronAPI || !window.electronAPI.openDbLocation) {
      this.showToast('Database file access unavailable in browser mode.', 'warning');
      return;
    }
    try {
      const res = await window.electronAPI.openDbLocation();
      if (res.success) {
        this.showToast('Opened SQLite database location in File Explorer.', 'info');
      } else {
        this.showToast('Could not open DB location: ' + res.error, 'danger');
      }
    } catch (e) {
      this.showToast('Error opening DB location: ' + e.message, 'danger');
      this.logError(e.message, 'Medium');
    }
  }
}

export const store = new CampaignStore();
