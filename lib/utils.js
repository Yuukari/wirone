const md5 = require("md5");

const utils = () => {
    const getUID = (length = 32) => {
        return md5(Math.random()).substr(0, length);
    }

    return Object.freeze({
        getUID
    });
}

module.exports = utils();