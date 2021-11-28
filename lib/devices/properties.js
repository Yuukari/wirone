module.exports.Float = (property) => {
    if (property.parameters == undefined)
        throw new Error("Float property error: 'parameters' object has undefined value");

    if (property.parameters.instance == undefined)
        throw new Error("Float property error: 'parameters' object must have 'instance' parameter");

    return {
        type: "devices.properties.float",

        retrievable: property.retrievable != undefined ? property.retrievable : true,
        reportable: property.reportable != undefined ? property.reportable : false,
        parameters: property.parameters != undefined ? property.parameters : {},

        onQuery: property.onQuery != undefined ? property.onQuery : null
    }
}

module.exports.Bool = (property) => {
    if (property.parameters == undefined)
        throw new Error("Bool property error: 'parameters' object has undefined value");

    if (property.parameters.instance == undefined)
        throw new Error("Bool property error: 'parameters' object must have 'instance' parameter");

    return {
        type: "devices.properties.bool",

        retrievable: property.retrievable != undefined ? property.retrievable : true,
        reportable: property.reportable != undefined ? property.reportable : false,
        parameters: property.parameters != undefined ? property.parameters : {},

        onQuery: property.onQuery != undefined ? property.onQuery : null
    }
}