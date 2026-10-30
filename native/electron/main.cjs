const {app,BrowserWindow,protocol,net,Menu}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'umbra',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
app.setName('UMBRA');
let mainWindow;
if(!app.requestSingleInstanceLock())app.quit();
app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus();}});
app.whenReady().then(()=>{
  const root=path.join(__dirname,'game');
  protocol.handle('umbra',request=>{
    const url=new URL(request.url);if(url.hostname!=='app')return new Response('Not found',{status:404});
    const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!filename.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
    return net.fetch(pathToFileURL(filename).href);
  });
  Menu.setApplicationMenu(null);
  mainWindow=new BrowserWindow({width:1320,height:900,minWidth:800,minHeight:600,title:'UMBRA — Ecos do Eclipse',backgroundColor:'#0b0b14',icon:path.join(__dirname,'icon.ico'),autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('umbra://app/'))event.preventDefault();});
  mainWindow.webContents.session.setPermissionRequestHandler((_contents,permission,callback)=>callback(permission==='fullscreen'||permission==='clipboard-sanitized-write'));
  mainWindow.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'){mainWindow.setFullScreen(!mainWindow.isFullScreen());event.preventDefault();}});
  mainWindow.loadURL('umbra://app/index.html');
});
app.on('window-all-closed',()=>app.quit());
