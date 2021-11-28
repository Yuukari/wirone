const colors = {
    reset: "\x1b[0m",

    foreground: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m"
    },

    background: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m"
    }
};

const write = (text, type = "Info") => {
    let color = "";
    
    switch (type){
        case "Device": color = colors.foreground.magenta; break;
        case "OAuth": color = colors.foreground.green; break;
        case "Warning": color = colors.foreground.yellow; break;
        case "Error": color = colors.foreground.red; break;
    }

    let date = new Date(Date.now() + 10800000);
    console.log(color + "> " + date.toLocaleString() + " [Wirone] [" + type + "] " + text + colors.reset);
}

module.exports.write = write;