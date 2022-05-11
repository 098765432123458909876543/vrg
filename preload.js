const fs = require("fs");
const path = require("path");
const { contextBridge, ipcRenderer } = require("electron");

const screenChangeRequests = new Array();

let isBlur = false;
let isSteam = false;
let isOpenSteamOverlay = false;

function execScreenChange () {
    requestAnimationFrame( () => screenChangeRequests.forEach( fn => fn.call() ) );
}

ipcRenderer.on("ping", () => {} );
ipcRenderer.on("ready", () => execScreenChange() );
ipcRenderer.on("focus", () => isBlur = false, execScreenChange() );
ipcRenderer.on("blur", () => isBlur = true, execScreenChange() );
ipcRenderer.on("enableSteam", () => isSteam = true, console.log("enable steam api") );
ipcRenderer.on("openSteamOverlay", () => isOpenSteamOverlay = true );
ipcRenderer.on("closeSteamOverlay", () => isOpenSteamOverlay = false );

contextBridge.exposeInMainWorld(
    "api", {
        async init () {
            await ipcRenderer.invoke("init");
        },

        request (url) { 
            return new Promise( (resolve, reject) => {
				fs.readFile(path.join(__dirname, url), {}, (err, data) => {
                    if (err) {
                        reject(new Error(`Not found file "${ url }"`));
                    } else {
                        resolve(data);
                    }
				} );
			} );
        },

        async fullscreen (value) {
            await new Promise( resolve => {
                requestAnimationFrame( async () => {
                    await (value ? ipcRenderer.invoke('requestFullscreen') : ipcRenderer.invoke('exitFullscreen'));
                    resolve(null);
                } );
            } );
            
            execScreenChange();
        },

        async activeSteamOverlay () {
            await new Promise( resolve => {
                requestAnimationFrame( async () => {
                    await ipcRenderer.invoke('activeSteamOverlay');
                    resolve(null);
                } );
            } );
        },

        async activeSteamAchivement (name) {
            await ipcRenderer.invoke("activeAchivement", name);
        },

        requestScreenChange (fn) {
            screenChangeRequests.push(fn);
        },

        hasBlur () {
            return isBlur;
        },
        
        hasSteam () {
            return isSteam;
        },

        hasOpenSteamOverlay () {
            return isOpenSteamOverlay;
        }
    }
);