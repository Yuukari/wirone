const utils = require("./utils.js");
const logger = require("./logger.js");

const oauth = () => {
    let _app = null;
    let _config = null;

    let onAuthorize = null;
    let onGranted = null;
    let onRefresh = null;
    let onVerify = null;

    /********************* Public methods **********************/

    const init = (app, config) => {
        _app = app;
        _config = config;

        if (_config.oauth == undefined){
            if (_config.debug)
                logger.write("'oauth' parameter in config object was undefined, OAuth service won't be initialized", "Warning")

            return;
        }

        app.get("/auth", renderAuthView);
    
        app.get("/oauth", begin);
        app.post("/oauth/authorize", authorize);
        app.post("/oauth/token", token);
        app.post("/oauth/refresh", refresh);
        app.use(verify);

        checkConfig();
    }

    /********************* Private methods *********************/

    const throwError = (message) => {
        if (_config.debug)
            logger.write(message, "Error");

        throw new Error("Wirone OAuth error - " + message);
    }

    const checkConfig = () => {
        if (_config.oauth.client == undefined)
            throwError("'client' parameter in OAuth config was undefined");

        if (_config.oauth.secret == undefined)
            throwError("'secret' parameter in OAuth config was undefined");

        if (_config.oauth.lifetime == undefined){
            if (_config.debug)
                logger.write("'lifetime' parameter in OAuth config was undefined. Setting lifetime to default value (3600 seconds)");

            _config.oauth.lifetime = 3600;
        }

        if (_config.oauth.authorization_page != undefined){
            if (_config.oauth.authorization_page.type == "static_page"){
                if (_config.oauth.authorization_page.path == undefined)
                    throwError("'path' parameter of 'authorization_page' object in OAuth config was undefined");
            } else if (_config.oauth.authorization_page.type == "callback_url"){
                if (_config.oauth.authorization_page.url == undefined)
                    throwError("'url' parameter of 'authorization_page' object in OAuth config was undefined");
            } else {
                throwError("Unknown authorization type was passed in 'type' parameter of 'authorization_page' object in OAuth config");
            }
        } else {
            throwError("'authorization_page' object in OAuth config was undefined");
        }

        if (_config.oauth.onAuthorize == undefined)
            throwError("'onAuthorize' OAuth handler was undefined");

        if (_config.oauth.onGranted == undefined)
            throwError("'onGranted' OAuth handler was undefined");

        if (_config.oauth.onRefresh == undefined)
            throwError("'onRefresh' OAuth handler was undefined");

        if (_config.oauth.onVerify == undefined)
            throwError("'onVerify' OAuth handler was undefined");

        onAuthorize = _config.oauth.onAuthorize;
        onGranted = _config.oauth.onGranted;
        onRefresh = _config.oauth.onRefresh;
        onVerify = _config.oauth.onVerify;
    }

    const renderAuthView = (req, res) => {
        if (_config.oauth.authorization_page.type == "static_page"){
            res.sendFile(_config.oauth.authorization_page.path);
        } else if (_config.oauth.authorization_page.type == "callback_url"){
            res.statusCode = 302;
            res.setHeader("Location", _config.oauth.authorization_page.url);
            res.send();
        }
    }

    const begin = (req, res) => {    
        if (req.query.client_id == _config.oauth.client){
           let redirect = req.query.redirect_uri;
           let state = req.query.state;

           res.statusCode = 302;
           res.setHeader("Location", "/auth?redirect=" + encodeURIComponent(redirect) + "&state=" + encodeURIComponent(state));
           res.send();
        } else {
            if (_config.debug)
                logger.write("Received request with unknown client id '" + req.query.client_id + "'", "Warning");
        }
    }

    const authorize = (req, res) => {
        if (_config.debug)
            logger.write("Generating code for new user", "OAuth");

        let code = utils.getUID(6);

        try {
            onAuthorize(req, res, code);
        } catch (error) {
            throwError("Error while authorization user throught 'onAuthorize' OAuth handler: " + error);
        }
    }

    const token = (req, res) => {
        if (_config.debug)
            logger.write("Generating access and refresh tokens", "OAuth");
    
        if (req.body.client_secret == _config.oauth.secret){    
            onGranted(req.body.code, _config.oauth.lifetime)
                .then((tokens) => {
                    if (_config.debug)
                        logger.write("Sending tokens to user", "OAuth");
    
                    res.json({
                        access_token: tokens.accessToken,
                        token_type: "bearer",
                        expires_in: _config.oauth.lifetime,
                        refresh_token: tokens.refreshToken
                    });
                })
                .catch((error) => {
                    if (_config.debug)
                        logger.write("Error while saving access token: " + error, "Error");

                    res.json({
                        error: "invalid_grant"
                    });
                });
        }
    }
    
    const refresh = (req, res) => {
        if (req.body.client_secret == _config.oauth.secret && req.body.refresh_token != undefined){        
            logger.write("Refreshing token", "OAuth");
    
            onRefresh(req.body.refresh_token)
                .then((accessToken) => {
                    if (_config.debug)
                        logger.write("Sending new access token to server", "OAuth");
    
                    res.json({
                        access_token: accessToken,
                        token_type: "bearer",
                        expires_in: _config.oauth.lifetime,
                        refresh_token: req.body.refresh_token
                    });
                })
                .catch((error) => {
                    if (_config.debug)
                        logger.write("Error while refreshing OAuth token: " + error, "Error");
    
                    res.json({
                        error: "invalid_grant"
                    });
                });
        }
    }
    
    const verify = (req, res, next) => {
        if (
            req.url != "/v1.0/user/devices" && 
            req.url != "/v1.0/user/devices/query" && 
            req.url != "/v1.0/user/devices/action" && 
            req.url != "/v1.0/user/unlink"
        ) return next();
    
        if (req.headers.authorization == undefined){
            res.status(403);
            return res.send();
        }
    
        let token = req.headers.authorization.split(" ")[1];
    
        onVerify(token)
            .then((result) => {
                if (result === false){
                    if (_config.debug)
                        logger.write("Received provider request with unknown token " + token, "Warning");
    
                    res.status(403);
                    return res.send();
                }
    
                req.wirone = {
                    userId: result
                };
                next();
            })
            .catch((error) => {
                if (_config.debug)
                    logger.write(error, "Error");
    
                throw new Error("Wirone OAuth error: " + error);
            });
    }

    return Object.freeze({
        init
    })
}

module.exports = oauth();