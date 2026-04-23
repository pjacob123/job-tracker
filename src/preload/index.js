import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getData: () => ipcRenderer.invoke('data:get'),
  saveApplication: (app) => ipcRenderer.invoke('data:saveApplication', app),
  deleteApplication: (id) => ipcRenderer.invoke('data:deleteApplication', id),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  claudeChat: (params) => ipcRenderer.invoke('claude:chat', params),
  claudeImport: (params) => ipcRenderer.invoke('claude:import', params)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (e) {
    console.error(e)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
