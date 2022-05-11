const os = require('os');

module.exports.isAMDCPU = os.cpus().some(x => /amd/i.test(x.model));
module.exports.isLinux = /linux/i.test(os.platform());