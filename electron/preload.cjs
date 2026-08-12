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
  updateTask: (taskData) => ipcRenderer.invoke('update-task', taskData),
  moveTaskState: (payload) => ipcRenderer.invoke('move-task-state', payload),
  rescheduleTask: (payload) => ipcRenderer.invoke('reschedule-task', payload),
  deleteTask: (taskId) => ipcRenderer.invoke('delete-task', taskId),
  
  // Tags CRUD
  getTags: () => ipcRenderer.invoke('get-tags'),
  addTag: (payload) => ipcRenderer.invoke('add-tag', payload),
  removeTag: (tagId) => ipcRenderer.invoke('remove-tag', tagId),
  
  // Subtasks CRUD
  getSubtasks: (taskId) => ipcRenderer.invoke('get-subtasks', taskId),
  createSubtask: (payload) => ipcRenderer.invoke('create-subtask', payload),
  updateSubtaskStatus: (payload) => ipcRenderer.invoke('update-subtask-status', payload),
  updateSubtaskTitle: (payload) => ipcRenderer.invoke('update-subtask-title', payload),
  deleteSubtask: (subtaskId) => ipcRenderer.invoke('delete-subtask', subtaskId),
  
  // Markdown & OS integration
  openMarkdownFile: (payload) => ipcRenderer.invoke('open-markdown-file', payload),
  
  // Sync & Storage
  syncData: () => ipcRenderer.invoke('sync-data'),
  openDbLocation: () => ipcRenderer.invoke('open-db-location'),
  
  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  reloadWindow: () => ipcRenderer.invoke('reload-window')
});
