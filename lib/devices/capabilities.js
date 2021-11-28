module.exports.OnOff = (capability) => {
    return {
        type: "devices.capabilities.on_off",
        retrievable: capability.retrievable != undefined ? capability.retrievable : true,
        reportable: capability.reportable != undefined ? capability.reportable : false,

        parameters: capability.parameters != undefined ? capability.parameters : { split: false },

        onQuery: capability.onQuery != undefined ? capability.onQuery : null,
        onAction: capability.onAction != undefined ? capability.onAction : null
    }
}

module.exports.ColorSetting = (capability) => {
    if (capability.parameters == undefined)
        throw new Error("ColorSetting capability error: 'parameters' object has undefined value");

    if (capability.parameters.color_model == undefined && capability.parameters.temperature_k == undefined && capability.parameters.color_scene == undefined)
        throw new Error("ColorSetting capability error: 'parameters' object must have 'color_model', 'temperature_k' or 'color_scene' parameter");

    return {
        type: "devices.capabilities.color_setting",
        retrievable: capability.retrievable != undefined ? capability.retrievable : true,
        reportable: capability.reportable != undefined ? capability.reportable : false,

        parameters: capability.parameters != undefined ? capability.parameters : {},

        onQuery: capability.onQuery != undefined ? capability.onQuery : null,
        onAction: capability.onAction != undefined ? capability.onAction : null
    }
}

module.exports.Mode = (capability) => {
    if (capability.parameters == undefined)
        throw new Error("Mode capability error: 'parameters' object has undefined value");

    if (capability.parameters.instance == undefined)
        throw new Error("Mode capability error: 'parameters' object must have 'instance' parameter");

    if (capability.parameters.modes == undefined)
        throw new Error("Mode capability error: 'parameters' object must have 'modes' parameter");

    return {
        type: "devices.capabilities.mode",
        retrievable: capability.retrievable != undefined ? capability.retrievable : true,
        reportable: capability.reportable != undefined ? capability.reportable : false,

        parameters: capability.parameters != undefined ? capability.parameters : {},

        onQuery: capability.onQuery != undefined ? capability.onQuery : null,
        onAction: capability.onAction != undefined ? capability.onAction : null
    }
}

module.exports.Range = (capability) => {
    if (capability.parameters == undefined)
        throw new Error("Range capability error: 'parameters' object has undefined value");
        
    if (capability.parameters.instance == undefined)
        throw new Error("Range capability error: 'parameters' object must have 'instance' parameter");

    return {
        type: "devices.capabilities.range",
        retrievable: capability.retrievable != undefined ? capability.retrievable : true,
        reportable: capability.reportable != undefined ? capability.reportable : false,

        parameters: capability.parameters != undefined ? capability.parameters : {},

        onQuery: capability.onQuery != undefined ? capability.onQuery : null,
        onAction: capability.onAction != undefined ? capability.onAction : null
    }
}

module.exports.Toggle = (capability) => {
    if (capability.parameters == undefined)
        throw new Error("Toggle capability error: 'parameters' object has undefined value");

    if (capability.parameters.instance == undefined)
        throw new Error("Toggle capability error: 'parameters' object must have 'instance' parameter");

    return {
        type: "devices.capabilities.toggle",
        retrievable: capability.retrievable != undefined ? capability.retrievable : true,
        reportable: capability.reportable != undefined ? capability.reportable : false,

        parameters: capability.parameters != undefined ? capability.parameters : {},

        onQuery: capability.onQuery != undefined ? capability.onQuery : null,
        onAction: capability.onAction != undefined ? capability.onAction : null
    }
}