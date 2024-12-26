const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const queryDatabase = require('./src/query');
const fs = require('fs');
// const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));
const sql = require('mssql');
const envPath = path.join(__dirname, '.env');

let mainWindow;
let dbConfig = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, './src/preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    },
    icon: path.join(__dirname, './img/logo_icon.png')
  });

  mainWindow.loadFile('./page/index.html');
  Menu.setApplicationMenu(null);
}

app.disableHardwareAcceleration();
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('navigate-to-query-page', (event) => {
  mainWindow.loadFile('./page/query.html');
});

ipcMain.handle('save-db-config', async (event, newConfig) => {
  try {
    //const result = await saveConfig(newConfig);
    dbConfig = { ...newConfig };
    const result = { success: true, message: 'success' }  
    return { success: true, message: result.message };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// async function saveConfig(dbConfig) {
//   const envData = [
//     `DB_SERVER=${dbConfig.server || ''}`,
//     `DB_PORT=${dbConfig.port || 1433}`,
//     `DB_DATABASE=${dbConfig.database || ''}`,
//     `DB_INSTANCE_NAME=${(dbConfig.options && dbConfig.options.instanceName) || ''}`,
//     `DB_USER=${(dbConfig.authentication && dbConfig.authentication.options && dbConfig.authentication.options.userName) || ''}`,
//     `DB_PASSWORD=${(dbConfig.authentication && dbConfig.authentication.options && dbConfig.authentication.options.password) || ''}`
//   ].join('\n');

//   try {
//     fs.writeFileSync(envPath, envData);
//     return { success: true, message: envPath };
//   } catch (err) {
//     throw new Error(`Error saving to .env file: ${err.message}`);
//   }
// }
 

ipcMain.handle('connect-to-database', async (event, dbConfig) => {
  try {
    await sql.connect(dbConfig);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('execute-query', async (event, sqlQuery) => {
  try {
    // 讀取並解析 .env 檔案
    //const envConfig = dotenv.parse(fs.readFileSync(envPath));
    // 設定環境變數
    // const connectionConfig = {
    //   server: envConfig.DB_SERVER,
    //   port: parseInt(envConfig.DB_PORT) || 1433,
    //   database: envConfig.DB_DATABASE,
    //   options: {
    //     encrypt: envConfig.DB_ENCRYPT === 'true',
    //     instanceName: envConfig.DB_INSTANCE_NAME || ''
    //   },
    //   authentication: {
    //     options: {
    //       userName: envConfig.DB_USER,
    //       password: envConfig.DB_PASSWORD
    //     }
    //   }
    // };
    // const results = await queryDatabase(sqlQuery, connectionConfig);
    const results = await queryDatabase(sqlQuery, dbConfig);
    return results;
  } catch (error) {
    throw error.message;
  }
});

ipcMain.handle('kill-session', async (event, sessionId) => {
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().query(`KILL ${sessionId}`);
    await pool.close();
    return { success: true, message: `Session ${sessionId} 已成功終止。` };
  } catch (error) {
    return { success: false, message: `終止失敗: ${error.message}` };
  }
});

ipcMain.handle('get-database-name', () => dbConfig.database || '未定義');

