import { app, BrowserWindow, ipcMain, Notification, shell, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

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

ipcMain.handle('export:docx', async (event, { content, defaultName }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Save as Word Document',
    defaultPath: defaultName || 'resume.docx',
    filters: [{ name: 'Word Document', extensions: ['docx'] }]
  })
  if (canceled || !filePath) return null

  const paragraphs = content.split('\n').map((line) => {
    const trimmed = line.trim()
    if (/^#{1,2}\s/.test(trimmed)) {
      return new Paragraph({
        text: trimmed.replace(/^#{1,2}\s/, ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 }
      })
    }
    if (/^###\s/.test(trimmed)) {
      return new Paragraph({
        text: trimmed.replace(/^###\s/, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 160, after: 80 }
      })
    }
    if (trimmed === '') {
      return new Paragraph({ text: '' })
    }
    // Handle **bold** text
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/)
    const runs = parts.map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return new TextRun({ text: part.slice(2, -2), bold: true })
      }
      return new TextRun({ text: part })
    })
    return new Paragraph({ children: runs, spacing: { after: 80 } })
  })

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] })
  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(filePath, buffer)
  return filePath
})

ipcMain.handle('export:pdf', async (event, { content, defaultName }) => {
  const parentWin = BrowserWindow.fromWebContents(event.sender)
  const { filePath, canceled } = await dialog.showSaveDialog(parentWin, {
    title: 'Save as PDF',
    defaultPath: defaultName || 'resume.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (canceled || !filePath) return null

  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6;
             padding: 40px; max-width: 800px; margin: 0 auto; color: #111; }
      pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }
    </style></head><body><pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  const pdfData = await win.webContents.printToPDF({ margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 } })
  fs.writeFileSync(filePath, pdfData)
  win.close()
  return filePath
})

ipcMain.handle('file:pick', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Attach File',
    filters: [
      { name: 'Documents', extensions: ['pdf', 'txt', 'md', 'docx'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const fileName = filePath.split(/[\\/]/).pop()
  const ext = fileName.split('.').pop().toLowerCase()

  if (ext === 'pdf') {
    const buffer = fs.readFileSync(filePath)
    return { name: fileName, mediaType: 'application/pdf', data: buffer.toString('base64'), type: 'pdf' }
  } else {
    const text = fs.readFileSync(filePath, 'utf-8')
    return { name: fileName, text, type: 'text' }
  }
})

ipcMain.handle('claude:chat', async (_, { messages, attachment }) => {
  const apiKey = data.settings.apiKey
  if (!apiKey) return { success: false, error: 'No API key configured. Go to Settings to add your Anthropic API key.' }
  try {
    const client = new Anthropic({ apiKey })

    // If there's an attachment, inject it into the last user message
    let apiMessages = messages
    if (attachment) {
      apiMessages = messages.map((msg, i) => {
        if (i !== messages.length - 1 || msg.role !== 'user') return msg
        const fileContent = attachment.type === 'pdf'
          ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: attachment.data } }
          : { type: 'text', text: `--- Attached file: ${attachment.name} ---\n${attachment.text}\n--- End of file ---` }
        return { role: 'user', content: [fileContent, { type: 'text', text: msg.content }] }
      })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: `You are a helpful job search assistant. You help users manage their job search, customize resumes for specific roles, draft cover letters and follow-up emails, and give actionable career advice. Be concise and practical.`,
          cache_control: { type: 'ephemeral' }
        },
        {
          type: 'text',
          text: `Current applications:\n${JSON.stringify(data.applications, null, 2)}`,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: apiMessages
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
