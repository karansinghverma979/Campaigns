const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  selectStrategiesDir: () => ipcRenderer.invoke('select-strategies-dir'),
  relocateStrategiesDir: () => ipcRenderer.invoke('relocate-strategies-dir'),
  selectDbDir: () => ipcRenderer.invoke('select-db-dir'),
  relocateDbDir: () => ipcRenderer.invoke('relocate-db-dir'),
  openStrategiesFolder: () => ipcRenderer.invoke('open-strategies-folder'),
  sendNotification: (payload) => ipcRenderer.invoke('send-notification', payload),
  updateTrayStatus: (payload) => ipcRenderer.invoke('update-tray-status', payload),


  
  // Tasks CRUD
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  createTask: (taskData) => ipcRenderer.invoke('create-task', taskData),
  duplicateTask: (payload) => ipcRenderer.invoke('duplicate-task', payload),
  updateTask: (taskData) => ipcRenderer.invoke('update-task', taskData),
  moveTaskState: (payload) => ipcRenderer.invoke('move-task-state', payload),
  rescheduleTask: (payload) => ipcRenderer.invoke('reschedule-task', payload),
  deleteTask: (taskId) => ipcRenderer.invoke('delete-task', taskId),
  bulkMoveBreachedTasks: () => ipcRenderer.invoke('bulk-move-breached-tasks'),
  onMidnightDateChange: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('midnight-date-change', listener);
    return () => ipcRenderer.removeListener('midnight-date-change', listener);
  },
  
  // Tags CRUD
  getTags: () => ipcRenderer.invoke('get-tags'),
  addTag: (payload) => ipcRenderer.invoke('add-tag', payload),
  removeTag: (tagId) => ipcRenderer.invoke('remove-tag', tagId),
  deleteTagByName: (tagName) => ipcRenderer.invoke('delete-tag-by-name', tagName),
  renameTag: (payload) => ipcRenderer.invoke('rename-tag', payload),
  purgeAllTags: () => ipcRenderer.invoke('purge-all-tags'),
  
  // Subtasks CRUD
  getAllSubtasks: () => ipcRenderer.invoke('get-all-subtasks'),
  getSubtasks: (taskId) => ipcRenderer.invoke('get-subtasks', taskId),
  createSubtask: (payload) => ipcRenderer.invoke('create-subtask', payload),
  updateSubtaskStatus: (payload) => ipcRenderer.invoke('update-subtask-status', payload),
  updateSubtaskTitle: (payload) => ipcRenderer.invoke('update-subtask-title', payload),
  deleteSubtask: (subtaskId) => ipcRenderer.invoke('delete-subtask', subtaskId),
  reorderSubtasks: (payload) => ipcRenderer.invoke('reorder-subtasks', payload),
  
  // Strikes Operations
  getStrikes: () => ipcRenderer.invoke('get-strikes'),
  createStrike: (payload) => ipcRenderer.invoke('create-strike', payload),
  updateStrikeStatus: (payload) => ipcRenderer.invoke('update-strike-status', payload),
  updateStrike: (payload) => ipcRenderer.invoke('update-strike', payload),
  rescheduleStrike: (payload) => ipcRenderer.invoke('reschedule-strike', payload),
  deleteStrike: (id) => ipcRenderer.invoke('delete-strike', id),
  bulkUpdateStrikesPending: (data) => ipcRenderer.invoke('bulk-update-strikes-pending', data),
  
  // Markdown & OS integration
  openMarkdownFile: (payload) => ipcRenderer.invoke('open-markdown-file', payload),
  
  // Sync & Storage
  syncData: () => ipcRenderer.invoke('sync-data'),
  openDbLocation: () => ipcRenderer.invoke('open-db-location'),
  
  // Window Controls & Lifecycle
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  reloadWindow: () => ipcRenderer.invoke('reload-window'),
  onWindowFocusChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('window-focus-change', handler);
    return () => ipcRenderer.removeListener('window-focus-change', handler);
  }
});
