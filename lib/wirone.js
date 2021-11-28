const request = require("request");

const capabilities = require("./devices/capabilities.js");
const properties = require("./devices/properties.js");

const oauth = require("./oauth.js");
const logger = require("./logger.js");

const wirone = () => {
    let _app = null;
    let _config = null;

    let queryHandler = null;

    /********************* Public methods **********************/

    const init = (app, config) => {
        _app = app;
        _config = config;

        oauth.init(app, config);
    
        app.head("/v1.0", (req, res) => res.send());
        app.get("/v1.0/user/devices", devices);
        app.post("/v1.0/user/devices/query", devicesQuery);
        app.post("/v1.0/user/devices/action", devicesAction);
        app.post("/v1.0/user/unlink", unlinkAccount);

        checkConfig();
    };

    const query = (handler) => {
        queryHandler = handler;
    }

    /********************* Private methods *********************/

    const checkConfig = () => {
        if (_config.debug || _config.show_logo)
            drawLogo();
    
        if (_config.debug)
            logger.write("Ohayo! Wirone starting");
    }

    const drawLogo = () => {
        console.log(
            "            __                                \n" +
            " __  __  __/\\_\\  _ __   ___     ___      __   \n" +
            "/\\ \\/\\ \\/\\ \\/\\ \\/\\`'__\\/ __`\\ /' _ `\\  /'__`\\ \n" +
            "\\ \\ \\_/ \\_/ \\ \\ \\ \\ \\//\\ \\L\\ \\/\\ \\/\\ \\/\\  __/ \n" +
            " \\ \\___x___/'\\ \\_\\ \\_\\\\ \\____/\\ \\_\\ \\_\\ \\____\\\n" +
            "  \\/__//__/   \\/_/\\/_/ \\/___/  \\/_/\\/_/\\/____/\n"
        );
    }

    const devices = (req, res) => {
        queryHandler(req.wirone.userId)
            .then((userDevices) => {
                return getDevices(userDevices);
            })
            .then((devices) => {
                if (_config.debug)
                    logger.write("----------------------- Sending devices list -----------------------");

                res.json({
                    request_id: req.headers["x-request-id"],
                    payload: {
                        user_id: req.wirone.userId.toString(),
                        devices: devices.map((device) => { 
                            let deviceInfo = Object.assign({}, device.info);
            
                            if (deviceInfo.capabilities != null)
                                deviceInfo.capabilities = deviceInfo.capabilities.map((capability) => {
                                    return {
                                        type: capability.type,
                                        retrievable: capability.retrievable,
                                        parameters: capability.parameters
                                    }
                                });
            
                            if (deviceInfo.properties != null)
                                deviceInfo.properties = deviceInfo.properties.map((property) => {
                                    return {
                                        type: property.type,
                                        retrievable: property.retrievable,
                                        parameters: property.parameters
                                    }
                                });
            
                            return deviceInfo;
                        })
                    }
                });
            })
            .catch((error) => {
                if (_config.debug)
                    logger.write("Devices query error: " + error + (error.stack ? "\r\n\r\n" + error.stack : ""), "Error");

                res.statusCode = 404;
                res.send();
            });
    }

    const devicesQuery = (req, res) => {
        if (_config.debug)
            logger.write("---------------------- Getting devices status ----------------------");
    
        let devicesArray = [];
        let requestDevices = req.body.devices.map((device) => { return device });
        
        queryHandler(req.wirone.userId)
            .then((userDevices) => {
                return getDevices(userDevices);
            })
            .then((devices) => {
                requestDevices.map((requestDevice) => {
                    let device = findDeviceById(devices, requestDevice.id);
            
                    if (device !== null){
                        let globalQuery = device.info.globalQuery;
            
                        devicesArray.push(new Promise((resolve, reject) => {
                            if (_config.debug)
                                logger.write("Query device '" + device.info.name + "'");
            
                            globalQuery()
                                .then((globalState) => {
                                    let capabilitiesArray = device.info.capabilities != null ? device.info.capabilities.map((capability) => new Promise((resolve, reject) => {
                                        if (capability.onQuery != undefined && typeof(capability.onQuery) == "function"){
                                            if (_config.debug)
                                                logger.write(
                                                    capability.parameters.instance == undefined ? 
                                                    "Query on capability '" + capability.type + "'" :
                                                    "Query on capability '" + capability.type + "', instance '" + capability.parameters.instance + "'"
                                                , device.info.name);
            
                                            capability.onQuery(globalState)
                                                .then((result) => {
                                                    if (result === null)
                                                        return resolve(null);

                                                    resolve({
                                                        type: capability.type,
                                                        state: result
                                                    });
                                                })
                                                .catch((error) => reject(error));
                                        }
                                    })) : [];
                
                                    let propertiesArray = device.info.properties != null ? device.info.properties.map((property) => new Promise((resolve, reject) => {
                                        if (property.onQuery != undefined && typeof(property.onQuery) == "function"){
                                            if (_config.debug)
                                                logger.write(
                                                    property.parameters.instance == undefined ? 
                                                    "Query on property '" + property.type + "'" : 
                                                    "Query on property '" + property.type + "', instance '" + property.parameters.instance + "'"
                                                , device.info.name);
            
                                            property.onQuery(globalState)
                                                .then((result) => {
                                                    if (result === null)
                                                        return resolve(null);

                                                    resolve({
                                                        type: property.type,
                                                        state: result
                                                    });
                                                })
                                                .catch((error) => reject(error));
                                        }
                                    })) : [];
                
                                    let capabilitiesResult = null;
                
                                    Promise.all(capabilitiesArray)
                                        .then((capabilities) => {
                                            capabilitiesResult = capabilities;
                                            return Promise.all(propertiesArray);
                                        })
                                        .then((properties) => {
                                            resolve({
                                                id: device.info.id,

                                                capabilities: capabilitiesResult.filter((capability) => {
                                                    return capability !== null;
                                                }),
                                                properties: properties.filter((property) => {
                                                    return property !== null;
                                                })
                                            });
                                        })
                                        .catch((error) => {
                                            resolve({
                                                id: device.info.id,
                                                error_code: error != undefined ? error : "INTERNAL_ERROR"
                                            });
                                        });
                                })
                                .catch((error) => resolve({
                                    id: device.info.id,
                                    error_code: error != undefined ? error : "INTERNAL_ERROR"
                                }));
                        }));
                    }
                });

                return Promise.all(devicesArray);
            })
            .then((devices) => {
                if (_config.debug)
                    logger.write("-------------------- Sending response to server --------------------");

                res.json({
                    request_id: req.headers["x-request-id"],
                    payload: {
                        devices: devices
                    }
                });
            })
            .catch((error) => {
                if (_config.debug)
                    logger.write("Device query error: " + error + (error.stack ? "\r\n\r\n" + error.stack : ""), "Error");
            });
    }

    const devicesAction = (req, res) => {
        if (_config.debug)
            logger.write("-------------------- Processing devices actions --------------------");
    
        let devicesArray = [];
        let requestDevices = req.body.payload.devices.map((device) => { return device });
        
        queryHandler(req.wirone.userId)
            .then((userDevices) => {
                return getDevices(userDevices);
            })
            .then((devices) => {
                requestDevices.map((requestDevice) => {
                    let device = findDeviceById(devices, requestDevice.id);
            
                    if (device !== null){
                        devicesArray.push(new Promise((resolve, reject) => {
                            if (_config.debug)
                                logger.write("Handling device '" + device.info.name + "'");
            
                            let capabilitiesArray = requestDevice.capabilities.map((requestCapability) => new Promise((resolve, reject) => {
                                let capability = findDeviceCapability(device, requestCapability);
            
                                if (capability === null)
                                    return resolve({
                                        type: requestCapability.type,
                                        state: {
                                            instance: requestCapability.state.instance,
                                            action_result: {
                                                status: "ERROR",
                                                error_code: "INVALID_ACTION"
                                            }
                                        }
                                    });
            
                                if (capability.onAction != undefined && typeof(capability.onAction) == "function"){
                                    capability.onAction(requestCapability.state)
                                        .then((result) => {
                                            if (result === null)
                                                return resolve(null);

                                            if (_config.debug)
                                                logger.write(
                                                    capability.parameters.instance == undefined ? 
                                                    "Handling capability '" + capability.type + "', status: " + result.action_result.status :
                                                    "Handling capability '" + capability.type + "', instance '" + capability.parameters.instance + "', status: " + result.action_result.status
                                                , device.info.name);
            
                                            resolve({
                                                type: capability.type,
                                                state: {
                                                    instance: result.instance,
                                                    action_result: result.action_result
                                                }
                                            });
                                        })
                                        .catch((error) => reject(error));
                                }
                            }));
            
                            Promise.all(capabilitiesArray)
                                .then((capabilities) => {
                                    resolve({
                                        id: device.info.id,
                                        capabilities: capabilities
                                    });
                                })
                                .catch((error) => {
                                    logger.write("Device action error: " + device.info.name + " - " + error + (error.stack ? "\r\n\r\n" + error.stack : ""), "Error");
            
                                    resolve({
                                        id: device.info.id,
                                        action_result: {
                                            status: "ERROR",
                                            error_code: error
                                        }
                                    });
                                });
                        }));
                    }
                });
            
                Promise.all(devicesArray)
                    .then((devices) => {
                        if (_config.debug)
                            logger.write("-------------------- Sending response to server --------------------");
            
                        res.json({
                            request_id: req.headers["x-request-id"],
                            payload: {
                                devices: devices
                            }
                        });
                    })
                    .catch((error) => {
                        if (_config.debug)
                            logger.write(error, "Error");
                    });
            });
    }

    const unlinkAccount = (req, res) => {
        res.json({
            request_id: req.headers["x-request-id"]
        });
    }
    
    const getDevices = (userDevices) => new Promise((resolve, reject) => {
        let devices = [];

        userDevices.forEach((device) => {
            if (device.info.id == undefined)
                device.info.id = (devices.length + 1).toString();



            if (device.info.name == null)
                return throwOrWriteDeviceError("Device with id '" + device.info.id + "' has no 'name' parameter in 'info' object");

            if (device.info.type == null)
                return throwOrWriteDeviceError("Device '" + device.info.name + "' (id " + device.info.id + ") has no 'type' parameter in 'info' object");



            if (device.info.capabilities == null && device.info.properties == null)
                return throwOrWriteDeviceError("Device '" + device.info.name + "' (id " + device.info.id + ") must have 'capabilities' or 'properties' parameter in 'info' object");
        
            if (
                device.info.capabilities != null && device.info.capabilities.length == 0 ||
                device.info.properties != null && device.info.properties.length == 0
            )
                return throwOrWriteDeviceError("Device '" + device.info.name + "' (id " + device.info.id + ") must have at least one capability or property");
                


            if (device.info.globalQuery == undefined || typeof(device.info.globalQuery) != "function")
                device.info.globalQuery = () => new Promise((resolve, reject) => resolve(null));

            devices.push(device);
        });

        resolve(devices);
    });

    const throwError = (message) => {
        if (_config.debug)
            logger.write(message, "Error");

        throw new Error(message);
    }

    const throwOrWriteDeviceError = (message) => {
        if (!(_config.skip_wrong_devices === true))
            throw new Error(message);
        if (_config.debug)
            logger.write(message + ", skipping it", "Warning");
    }

    const findDeviceById = (devices, id) => {
        for (i in devices){
            let device = devices[i];
    
            if (device.info.id == id)
                return device;
        }
    
        return null;
    }
    
    const findDeviceCapability = (device, requestCapability) => {
        for (i in device.info.capabilities){
            let capability = device.info.capabilities[i];
    
            if (capability.type == requestCapability.type)
                switch (capability.type){
                    case "devices.capabilities.on_off": 
                        return capability;
    
                    case "devices.capabilities.color_setting":
                        if (
                            capability.parameters.color_model == requestCapability.state.instance || 
                            (capability.parameters.temperature_k != undefined && requestCapability.state.instance == "temperature_k") ||
                            (capability.parameters.color_scene != undefined && requestCapability.state.instance == "color_scene")
                        )
                        return capability;
    
                    case "devices.capabilities.mode":
                    case "devices.capabilities.range":
                    case "devices.capabilities.toggle":
                        if (capability.parameters.instance == requestCapability.state.instance)
                            return capability;
                }
        }
    
        return null;
    }

    return Object.freeze({
        capabilities,
        properties,

        logger,

        init,
        query
    });
}

module.exports = wirone();