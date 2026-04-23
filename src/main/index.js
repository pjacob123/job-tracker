import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'

const dataPath = join(app.getPath('userData'), 'data.json')

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load data:', e)
  }
  return {
    applications: [],
    settings: {
      apiKey: '',
      defaultFollowUpDays: 7,
      notificationsEnabled: true
    }
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save data:', e)
  }
}

let data = loadData()

function getNextFollowUp(application) {
  const base = application.lastFollowUp || application.dateApplied
  if (!base) return null
  const d = new Date(base)
  d.setDate(d.getDate() + (Number(application.followUpDays) || 7))
  return d.toISOString().split('T')[0]
}

function checkFollowUps() {
  if (!data.settings.notificationsEnabled) return
  const today = new Date().toISOString().split('T')[0]
  data.applications.forEach((application) => {
    if (['Rejected', 'Withdrawn', 'Offer'].includes(application.status)) return
    const next = getNextFollowUp(application)
    if (next && next <= today) {
      new Notification({
        title: 'Job Application Follow-up',
        body: `Time to follow up with ${application.company} for ${application.role}`
      }).show()
    }
  })
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// --- IPC Handlers ---

ipcMain.handle('data:get', () => data)

ipcMain.handle('data:saveApplication', (_, application) => {
  if (application.id) {
    const idx = data.applications.findIndex((a) => a.id === application.id)
    if (idx !== -1) data.applications[idx] = application
    else data.applications.push(application)
  } else {
    application.id = Date.now().toString()
    application.createdAt = new Date().toISOString()
    data.applications.push(application)
  }
  saveData(data)
  return data.applications
})

ipcMain.handle('data:deleteApplication', (_, id) => {
  data.applications = data.applications.filter((a) => a.id !== id)
  saveData(data)
  return data.applications
})

ipcMain.handle('settings:save', (_, settings) => {
  data.settings = { ...data.settings, ...settings }
  saveData(data)
  return data.settings
})

ipcMain.handle('claude:chat', async (_, { messages }) => {
  const apiKey = data.settings.apiKey
  if (!apiKey) return { success: false, error: 'No API key configured. Go to Settings to add your Anthropic API key.' }
  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: `You are a helpful job search assistant. The user's current job applications are below. Help them manage their search, draft follow-up emails, analyze their pipeline, and give actionable advice. Be concise and practical.`,
          cache_control: { type: 'ephemeral' }
        },
        {
          type: 'text',
          text: `Current applications:\n${JSON.stringify(data.applications, null, 2)}`,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages
    })
    return { success: true, content: response.content[0].text }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('claude:import', async (_, { text }) => {
  const apiKey = data.settings.apiKey
  if (!apiKey) return { success: false, error: 'No API key configured.' }
  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Extract job application data from the following text and return a JSON array. Each object must have these fields (use null if unknown):
- company (string)
- role (string)
- status (one of: "Applied", "Phone Screen", "Interview", "Final Round", "Offer", "Rejected", "Withdrawn")
- dateApplied (YYYY-MM-DD or null)
- url (string or null)
- salaryRange (string or null)
- contactName (string or null)
- contactEmail (string or null)
- notes (string or null)

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.

Text:
${text}`
        }
      ]
    })
    const jsonText = response.content[0].text.trim()
    const applications = JSON.parse(jsonText)
    return { success: true, applications }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.jobtracker')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // Check follow-ups on startup and every hour
  checkFollowUps()
  setInterval(checkFollowUps, 60 * 60 * 1000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
