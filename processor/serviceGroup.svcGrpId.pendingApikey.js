'use strict';

var AWS = require('aws-sdk');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

var apigateway = new AWS.APIGateway({ apiVersion: '2015-07-09' });


const serviceGroup_svcGrpId_pendingApikey_DELETE = async(req, res) => {

    let serviceGroupObject = null;

    try {
        const pool = await dbPool.getPool();
        const [serviceGroupResult, f1] = await pool.query(dbQuery.service_group_get.queryString, [req.params.svc_grp_id]);

        if (serviceGroupResult.length === 0) {
            return sendRes(res, 400, { result: false, account: null });
        }

        // serviceGroupObject = {
        //     serviceGroupId: serviceGroupResult[0].serviceGroupId,
        //     name: serviceGroupResult[0].name,
        //     accountId: serviceGroupResult[0].accountId,
        //     apiKeyId: serviceGroupResult[0].apiKeyId,
        //     apiKeyValue: serviceGroupResult[0].apiKeyValue,
        //     pendingApiKeyId: serviceGroupResult[0].pendingApiKeyId,
        //     pendingApiKeyValue: serviceGroupResult[0].pendingApiKeyValue,
        // };
        serviceGroupObject = serviceGroupResult[0];

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }

    //remove usage plan pending key
    var removePlanApiKeyParams = {
        keyId: serviceGroupObject.pending_api_key_id,
        usagePlanId: process.env.PLAN_ID
    };


    let removePlanApiKeyResult = await new Promise((resolve, reject) => {
        apigateway.deleteUsagePlanKey(removePlanApiKeyParams, function(err, data) {
            if (err) return ({ error: err });
            resolve(data);
        });
    }).catch((error) => {
        console.log('catch error', error)
        return { error: error };
    });
    console.log('removePlanApiKeyResult', removePlanApiKeyResult)

    if (removePlanApiKeyResult.error) {
        return (400, { code: 2021, message: 'AWS ERROR', info: removePlanApiKeyResult.error })
    }

    // delete api key
    var removeApikeyParmas = {
        apiKey: serviceGroupObject.pending_api_key_id,
    };

    let removeApiKeyResult = await new Promise((resolve, reject) => {
        apigateway.deleteApiKey(removeApikeyParmas, function(err, data) {
            if (err) return ({ error: err });
            resolve(data);
        });
    }).catch((error) => {
        console.log('catch error', error)
        return { error: error };
    });
    console.log('removeApiKeyResult', removeApiKeyResult)

    if (removeApiKeyResult.error) {
        return (400, { code: 2021, message: 'AWS ERROR', info: removeApiKeyResult.error })
    }


    try {
        const pool = await dbPool.getPool();
        await pool.query(dbQuery.service_group_pending_apikey_update.queryString, [null, null, req.params.svc_grp_id]);

        const [newServiceGroupResult, f1] = await pool.query(dbQuery.service_group_get.queryString, [req.params.svc_grp_id]);

        if (newServiceGroupResult.length === 0) {
            return sendRes(res, 400, { result: false, account: null });
        }

        // const newServiceGroupObject = {
        //     serviceGroupId: newServiceGroupResult[0].serviceGroupId,
        //     name: newServiceGroupResult[0].name,
        //     accountId: newServiceGroupResult[0].accountId,
        //     apiKeyId: newServiceGroupResult[0].apiKeyId,
        //     apiKeyValue: newServiceGroupResult[0].apiKeyValue,
        //     pendingApiKeyId: newServiceGroupResult[0].pendingApiKeyId,
        //     pendingApiKeyValue: newServiceGroupResult[0].pendingApiKeyValue,
        // };
        const newServiceGroupObject = newServiceGroupResult[0];

        return sendRes(res, 200, { result: true, value: newServiceGroupObject });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
};


module.exports = { serviceGroup_svcGrpId_pendingApikey_DELETE };
