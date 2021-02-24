"use strict";

var AWS = require('aws-sdk');
var mysql2 = require('mysql2'); //https://www.npmjs.com/package/mysql2
var smHandler = require('./util_sm.js');

const connectRDSProxy = async(region_info, proxy_endpoint, proxy_port, dbname, dbuser) => {

    // Get IAM Token
    var signer = new AWS.RDS.Signer({
        region: region_info,
        hostname: proxy_endpoint,
        port: parseInt(proxy_port),
        username: dbuser,
    });

    var token = await new Promise((resolve, reject) => {
        let token = signer.getAuthToken({
            username: dbuser,
        });
        resolve(token);
    }).catch((error) => {
        return JSON.stringify(error);
    });

    console.log("[RDS Util]", "[connectRDSProxy]", "IAM Token obtained\n", token);


    let connectionConfig = {
        host: proxy_endpoint, // Store your endpoint as an env var
        user: dbuser,
        port: parseInt(proxy_port),
        database: dbname, // Store your DB schema name as an env var
        ssl: { rejectUnauthorized: false },
        password: token,
        authSwitchHandler: function({ pluginName, pluginData }, cb) {
            console.log("[RDS Util]", "[connectRDSProxy]", "Setting new auth handler.");
        },
    };

    // Adding the mysql_clear_password handler
    connectionConfig.authSwitchHandler = (data, cb) => {
        if (data.pluginName === "mysql_clear_password") {
            // See https://dev.mysql.com/doc/internals/en/clear-text-authentication.html
            console.log("[RDS Util]", "[connectRDSProxy]", "pluginName: " + data.pluginName);
            let password = token + "\0";
            let buffer = Buffer.from(password);
            cb(null, password);
        }
    };
    const connection = await mysql2.createConnection(connectionConfig);

    connection.connect(function(err) {
        if (err) {
            console.log("[RDS Util]", "[connectRDSProxy]", "error connecting: " + err.stack);
            return (new Error("error connecting: " + err.stack));
        }

        console.log("[RDS Util]", "[connectRDSProxy]", "connected as id " + connection.threadId + "\n");
    });

    return connection;
}

const connectRDS = async(proxy_endpoint, proxy_port, dbname, dbuser) => {

    //console.log("[RDS Util]", "[connectRDS]", 'proxy_endpoint', proxy_endpoint)
    //console.log("[RDS Util]", "[connectRDS]", 'proxy_port', proxy_port)
    //console.log("[RDS Util]", "[connectRDS]", 'dbname', dbname)
    //console.log("[RDS Util]", "[connectRDS]", 'dbuser', dbuser)
    //console.log("[RDS Util]", "[connectRDS]", 'process.env.DB_SM_ID', process.env.DB_SM_ID)
    const secretValue = await smHandler.getSecretValue(process.env.DB_SM_ID);
    // console.log('connectRDS secretValue', secretValue)

    const connectionConfig = {
        host: proxy_endpoint, // Store your endpoint as an env var
        user: dbuser,
        port: parseInt(proxy_port),
        database: dbname, // Store your DB schema name as an env var
        password: secretValue.password,
        // password: 'dlXd1dtcE',
    };

    console.log("[RDS Util]", "[connectRDS]", 'create connection start.... connection config :', connectionConfig);
    const connection = await mysql2.createConnection(connectionConfig);
    console.log("[RDS Util]", "[connectRDS]", 'create connection finish...');

    return connection;
}

module.exports = { connectRDSProxy, connectRDS }
