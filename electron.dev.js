const window = require("./electron/window.js");

window( {
	open: "http://localhost:8080",
	preloadScript: "preload.js",
	linuxIcon: "icon.png",
	dir: false,
	devtool: true,
	webSecurity: false,
	hasUnSecure: true,
	vsync: false
}, {
	width: 640,
	height: 360
} );