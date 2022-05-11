require("v8-compile-cache");

const { isAMDCPU, isLinux } = require("./consts.js");
const path = require("path");
const { app, Menu, session, BrowserWindow, ipcMain } = require("electron");
const log = require("electron-log");

process.on('uncaughtException', (err) => {
	log.error('electron:event:uncaughtException');
	log.error(err);
	log.error(err.stack);
	app.quit();
} );

let greenworks = null;

try {
    greenworks = require("greenworks");

    if (!greenworks.init()) {
		greenworks = null;
	}
} catch (e) {
    console.error(e);
}

module.exports = function (options = {}, setting = {}) {
	const enableFutures = ["SharedArrayBuffer", "scheduler-configuration"];

	if (isAMDCPU) {
		app.commandLine.appendSwitch('disable-zero-copy', true);
		app.commandLine.appendSwitch('ui-disable-partial-swap', true);
	}
	
	app.commandLine.appendSwitch("no-referrers");

	app.commandLine.appendSwitch("disable-http-cache", true);
	app.commandLine.appendSwitch("disk-cache-size", 1);
	app.commandLine.appendSwitch("media-cache-size", 1);
	app.commandLine.appendSwitch("smooth-scrolling", true);

	app.commandLine.appendSwitch("disable-frame-rate-limit", true);
	app.commandLine.appendSwitch("disable-gpu-vsync", !setting.vsync);
	app.commandLine.appendSwitch("ignore-gpu-blacklist", true);
	app.commandLine.appendSwitch("disable-renderer-backgrounding", true);
	app.commandLine.appendSwitch("disable-2d-canvas-clip-aa");
	app.commandLine.appendSwitch("renderer-process-limit", 100);
	app.commandLine.appendSwitch("max-active-webgl-contexts", 100);
	
	app.commandLine.appendSwitch("disable-breakpad", true); 
	app.commandLine.appendSwitch("disable-component-update", true);
	app.commandLine.appendSwitch("disable-print-preview", true); 
	app.commandLine.appendSwitch("disable-metrics", true);
	app.commandLine.appendSwitch("disable-metrics-repo", true);
	app.commandLine.appendSwitch("disable-hang-monitor", true);

	app.commandLine.appendSwitch("enable-parallel-downloading", true);
	app.commandLine.appendSwitch("enable-quic", true);

	if (isLinux) {
		enableFutures.push("crostini-gpu-support", "exo-pointer-lock", "enable-pointer-lock-options");
	}

	if (options.hasUnSecure) {
		app.commandLine.appendSwitch("ignore-certificate-errors", true);
		app.commandLine.appendSwitch('enable-experimental-web-platform-features', true);
		app.commandLine.appendSwitch("enable-experimental-canvas-features", true)
		app.commandLine.appendSwitch("enable-javascript-harmony", true);
		app.commandLine.appendSwitch("enable-future-v8-vm-features", true);
		//app.commandLine.appendSwitch("disable-accelerated-2d-canvas", true);
		enableFutures.push("allow-insecure-localhost");
	}
	
	app.commandLine.appendSwitch("enable-features", enableFutures.join(","));
	
	let mainWindow = null;

	async function createWindow () {
		const width = setting.width || 300;
		const height = setting.height || 200;
	
		mainWindow = new BrowserWindow({
			width,
			height,
			
			minWidth: width,
			minHeight: height,
			
			useContentSize: true,

			icon: path.join(__dirname, `../${ options.linuxIcons || "icon.png" }`),

			show: false,

			webPreferences: {
				webSecurity: options.webSecurity,
				preload: path.join(__dirname, `../${ options.preloadScript || "preload.js" }`),
				nodeIntegration: false,
				contextIsolation: true,
				worldSafeExecuteJavaScript: true
			}
		} );
		
		mainWindow.once('ready-to-show', () => {
			if (mainWindow === null) {
				return
			}

			//mainWindow.setBackgroundThrottling(false);
			
			if (options.devtool) {
				mainWindow.webContents.openDevTools();
			}

			mainWindow.show();
			mainWindow.webContents.send("ready");
		} );

		mainWindow.on('focus', (event) => {
			if (mainWindow === null) {
				return
			}

			mainWindow.webContents.send("focus");
		} );
	
		mainWindow.on('blur', (event) => {
			if (mainWindow === null) {
				return
			}

			mainWindow.webContents.send("blur");
		} );

		mainWindow.on("closed", () => {
			if (
				!!options.close &&
				(options.close instanceof Function)
			) {
				options.close(mainWindow);
			}

			mainWindow = null;
		} );

		if (
			!!options.init &&
			(options.init instanceof Function)
		) {
			options.init(mainWindow);
		}

		const menu = Menu.buildFromTemplate([]);
		Menu.setApplicationMenu(menu);

		if (
			!!options.open &&
			typeof(options.open) === "string"
		) {
			await (options.dir ? mainWindow.loadFile(options.open) : mainWindow.loadURL(options.open));
		}
	}
	
	app.on("ready", () => {
		if (options.hasUnSecure) {
			session.defaultSession.setPermissionRequestHandler( (webContents, permission, callback) => {
				callback(true);
			} );
		}
		createWindow();
	} );
	
	app.on("window-all-closed", () => {
		if (process.platform !== 'darwin') {
			app.quit();
		}
	} );

	app.on('activate', () => {
		if (mainWindow !== null) {
			return;
		}
		createWindow();
	} );

	ipcMain.handle("init", (event) => {
		if (
			mainWindow !== null &&
			greenworks !== null &&
			greenworks.isSteamRunning()
		) {
			greenworks.on("game-overlay-activated", is_active => mainWindow.webContents.send(is_active ? "openSteamOverlay" : "closeSteamOverlay") );
			greenworks.on("steam-shutdown", () => app.quit() );

			mainWindow.webContents.send("enableSteam");
		}
		event.sender.send("ping");
	} );
	
	ipcMain.handle("requestFullscreen", (event) => {
		if (mainWindow !== null) {
			mainWindow.setFullScreen(true);
		}
		event.sender.send("ping");
	} );
	
	ipcMain.handle("exitFullscreen", (event) => {
		if (mainWindow !== null) {
			mainWindow.setFullScreen(false);
		}
		event.sender.send("ping");
	} );

	ipcMain.handle("activeSteamOverlay", (event) => {
		if (greenworks !== null) {
			greenworks.activateGameOverlay();
		}
		event.sender.send("ping");
	} );

	ipcMain.handle("activeAchivement", (event, name) => {
		if (greenworks !== null) {
			greenworks.activateAchievement(name, () => {
				event.sender.send("successActiveAchivement", name);
				event.sender.send("ping");
			}, () => {
				event.sender.send("failedActiveAchivement", name);
				event.sender.send("ping");
			} );
		} else {
			event.sender.send("ping");
		}
	} );
};