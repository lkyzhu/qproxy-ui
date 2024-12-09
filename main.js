const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron/main')
const path = require('node:path')
const fs = require('node:fs')
const rootDir = path.join(__dirname, '..');
const extraDir = path.join(rootDir, 'extras');

let mainWindow

function createWindow () {
    //const mainWindow = new BrowserWindow({
    mainWindow = new BrowserWindow({
        webPreferences: {
            //preload: path.join(rootDir, 'preload.js'),
            nodeIntegration: true, //设置开启nodejs环境
            contextIsolation: false
        },
        autoHideMenuBar:true,
        menuBarVisible:false,
        //fullScreen:true,
        maximizable:false,
		icon: 'icon.gif', // 设置窗口图标
		transparent: true // 让窗口透明

    });
    mainWindow.removeMenu();

    ipcMain.on("logger2main", (event, msg) => {
            mainWindow.webContents.send("logger2render", msg);
    });

    ipcMain.on('open-devtools', (event, arg) => {
        mainWindow.webContents.openDevTools();
    });
	
	ipcMain.on('update-conf', saveConf);

    mainWindow.loadFile('index.html');	

	initRunEnv();
	
	initConf();
	
	globalShortcut.register('Alt+CommandOrControl+D', () => {
		mainWindow.webContents.openDevTools();
	});
}

// 初始化Env
function initRunEnv () {
	const conf = path.join(extraDir, 'conf');
	if (!fs.existsSync(conf)) {
		fs.mkdirSync(conf, { recursive: true });
	}
	
	const pki = path.join(extraDir, 'pki');
	if (!fs.existsSync(pki)) {
		fs.mkdirSync(pki, { recursive: true });
	}
}


// 设置背景
function setBackgroundImage() {
	const file = path.join(rootDir, 'dd.png');
	// 使用NativeImage来创建一个透明的背景图片
	const background = nativeImage.createFromPath('dd.png');
	// 设置窗口的背景图片
	mainWindow.setBackgroundImage(background);
}

// 初始化配置
function initConf () {
	const conf = path.join(extraDir, 'conf', 'conf.json');
	
	// 读取配置文件
	fs.readFile(conf, 'utf8', (err, data) => {
		if (err) {
			throw err;
		} else {
			// 解析JSON数据
			const obj = JSON.parse(data);
			// 发送数据到渲染进程
			mainWindow.webContents.send("init_conf", obj);
		}
	});
}

// 更新配置文件
function saveConf (event, msg) {	
	if ((!msg.hasOwnProperty('local')) || (!msg.local.hasOwnProperty("addr"))) {
		throw "local conf is nil";
	} else {		
	}
		
	if ((!msg.hasOwnProperty('agent')) || 
		(!msg.agent.hasOwnProperty('addr') || msg.agent.addr == "") || 
		(!msg.agent.hasOwnProperty('cert') || !msg.agent.cert.hasOwnProperty('certData') || msg.agent.cert.certData == "") || 
		(!msg.agent.hasOwnProperty('cert') || !msg.agent.cert.hasOwnProperty('keyData') || msg.agent.cert.keyData == "")
	) {
		throw "agent conf is invalid";
	}

	const conf = path.join(extraDir, 'conf', 'conf.json');		
	const data = JSON.stringify(msg, null, 2);
	// 写入配置文件
	fs.writeFile(conf, data, 'utf8', (writeErr) => {
		if (writeErr) {
			throw writeErr;
		} else {
			console.log('配置文件已更新。');
		}
	});
}


app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('start-subprocess', (event, args) => {
    const { spawn } = require('child_process');

    const bin = path.join(extraDir, 'qproxy');
    const conf = path.join(extraDir, 'conf', 'conf.json');
    const subprocess = spawn(bin, ['client', '--conf', `${conf}`] );
	//const subprocess = spawn(bin, ['client', '--conf', args] )

    subprocess.stdout.on('data', (data) => {
        mainWindow.webContents.send("logger2render", `${data}`);
    });
    subprocess.stderr.on('data', (data) => {
        mainWindow.webContents.send("logger2render", `${data}`);
    });
    subprocess.on('close', (code) => {
        mainWindow.webContents.send("logger2render", `子进程退出:${code}`);
    });
});

