const window = require("./electron/window.js");

window( {
	open: 'index.html',
	preloadScript: "preload.js",
	linuxIcon: "icon.png",
	dir: true,
	devtool: false,
	webSecurity: true,
	hasUnSecure: false,
	vsync: false
}, {
	width: 640,
	height: 360
} );