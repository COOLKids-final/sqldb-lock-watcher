const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  saveDbConfig: (dbConfig) => ipcRenderer.invoke('save-db-config', dbConfig),
  connectToDatabase: (dbConfig) => ipcRenderer.invoke('connect-to-database', dbConfig),
  executeQuery: (sqlQuery) => ipcRenderer.invoke('execute-query', sqlQuery),
  getDatabaseName: () => ipcRenderer.invoke('get-database-name'),
  navigateToQueryPage: () => ipcRenderer.send('navigate-to-query-page'),
  killSession: (sessionId, dbConfig) => ipcRenderer.invoke('kill-session', sessionId, dbConfig)
});
