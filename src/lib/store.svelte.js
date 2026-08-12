import { ChronosMath, getFormattedDate } from './ChronosMath.js';

// Central store using Svelte 5 $state
class CampaignStore {
  tasks = $state([]);
  activeTab = $state('EXECUTION'); // EXECUTION, ARSENAL, BREACH, ARCHIVED
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

  // Auto-Highlight System for created / updated / transferred items
  highlightedTaskId = $state(null);

  setHighlightedTaskId(id) {
    this.highlightedTaskId = id;
    setTimeout(() => {
      if (this.highlightedTaskId === id) {
        this.highlightedTaskId = null;
      }
    }, 3000);
  }

  // Derived tasks arrays
  arsenalTasks = $derived(this.tasks.filter(t => t.state === 'Arsenal'));
  executionTasks = $derived(this.tasks.filter(t => t.state === 'Execution'));
  breachTasks = $derived(this.tasks.filter(t => t.state === 'Breach'));
  archiveTasks = $derived(this.tasks.filter(t => t.state === 'Archive'));

  toastTimer = null;

  showToast(message, type = 'warning') {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { show: true, message, type };
    this.toastTimer = setTimeout(() => {
      this.toast.show = false;
    }, 4000);
  }

  logError(errorStr, severity = 'Low') {
    const time = new Date().toLocaleTimeString();
    this.errorLogs.unshift({ time, error: errorStr, severity });
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
          const currentDate = getFormattedDate();
          let newlyBreachedCount = 0;
          for (const t of this.tasks) {
            if (t.state === 'Execution' && t.deadline) {
              if (ChronosMath.isBreached(t.deadline, currentDate)) {
                t.state = 'Breach';
                t.stage = 'Overdue';
                newlyBreachedCount++;
                await window.electronAPI.moveTaskState({ id: t.id, newState: 'Breach', newStage: 'Overdue' });
              }
            }
          }
          if (newlyBreachedCount > 0 && window.electronAPI && window.electronAPI.sendNotification) {
            try {
              window.electronAPI.sendNotification({
                title: '🚨 CAMPAIGN BREACH ALERT',
                body: `${newlyBreachedCount} active campaign(s) have passed deadline and transferred to Breach Recovery.`
              }).catch(() => {});
            } catch (e) {}
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
    if (!window.electronAPI) return;
    try {
      const taskRes = await window.electronAPI.getTasks();
      if (taskRes.success) {
        const rawTasks = taskRes.tasks || [];
        this.tasks = rawTasks;
        this.syncTrayStatus();
      } else {
        this.logError(taskRes.error, 'High');
        this.showToast('Database read error: ' + taskRes.error, 'danger');
      }
    } catch (e) {
      this.logError('Data load exception: ' + e.message, 'High');
    }
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

  async triggerFullReload() {
    this.showToast('⚡ REFRESHING SYSTEM: Reloading latest configuration & state...', 'info');
    try {
      await this.forceSync();
      await this.loadAllData();
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
    
    // Optimistic UI insert
    const tempTask = { ...payload, id: Date.now(), reschedule_count: 0 };
    this.tasks.unshift(tempTask);

    try {
      const res = await window.electronAPI.createTask(payload);
      if (res.success) {
        // replace tempTask with real task
        const idx = this.tasks.findIndex(t => t.id === tempTask.id);
        if (idx !== -1) this.tasks[idx] = res.task;
        this.setHighlightedTaskId(res.task.id);
        this.showToast(`Campaign '${title}' logged in Arsenal.`, 'info');
        return true;
      } else {
        this.tasks = this.tasks.filter(t => t.id !== tempTask.id);
        this.showToast('Creation failed: ' + res.error, 'danger');
        return false;
      }
    } catch (e) {
      this.tasks = this.tasks.filter(t => t.id !== tempTask.id);
      this.logError(e.message, 'High');
      return false;
    }
  }

  async duplicateTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const copyTitle = `${task.title} (Copy)`;
    const origin_date = getFormattedDate();
    const tagNames = task.tags ? task.tags.map(t => t.tag_name) : [];
    const payload = {
      title: copyTitle,
      origin_date,
      priority: task.priority === 'Critical' ? 'High' : task.priority,
      state: 'Arsenal',
      stage: 'RawIntel',
      tags: tagNames
    };

    try {
      const res = await window.electronAPI.createTask(payload);
      if (res.success && res.task) {
        // Fetch original subtasks to clone them into the new task
        const subRes = await window.electronAPI.getSubtasks(taskId);
        if (subRes.success && subRes.subtasks && subRes.subtasks.length > 0) {
          for (const st of subRes.subtasks) {
            await window.electronAPI.createSubtask({
              taskId: res.task.id,
              title: st.title,
              creation_time: origin_date,
              status: st.status
            });
          }
        }

        // Re-fetch created task with updated subtask counts
        const refreshRes = await window.electronAPI.getTasks();
        if (refreshRes.success) {
          this.tasks = refreshRes.tasks || [];
        }

        this.setHighlightedTaskId(res.task.id);
        this.showToast(`Duplicated campaign as '${copyTitle}'.`, 'info');
        return res.task;
      } else {
        this.showToast('Duplication failed: ' + (res ? res.error : 'Unknown error'), 'danger');
        return false;
      }
    } catch (e) {
      this.logError(e.message, 'High');
      return false;
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

    // Optimistic UI state change
    const oldState = task.state;
    task.state = 'Execution';
    task.stage = 'Active';
    task.deadline = deadline;
    task.initiated_at = initiated_at;

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
        this.showToast('Deployment failed: ' + res.error, 'danger');
        this.logError(res.error, 'High');
        return false;
      }
      this.showToast(`Campaign '${task.title}' deployed to Execution battlefield.`, 'info');
      return true;
    } catch (e) {
      task.state = oldState;
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
        if (idx !== -1) this.tasks[idx] = res.task;
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
        if (idx !== -1) this.tasks[idx] = res.task;
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

    try {
      const res = await window.electronAPI.deleteTask(taskId);
      if (res && res.success) {
        this.tasks = this.tasks.filter(t => String(t.id) !== String(taskId));
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
