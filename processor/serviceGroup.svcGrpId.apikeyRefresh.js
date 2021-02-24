'use strict';

var AWS = require('aws-sdk');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

var apigateway = new AWS.APIGateway({ apiVersion: '2015-07-09' });


const serviceGroup_svcGrpId_apikeyRefresh_PUT = async(req, res) => {

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
    console.log('serviceGroupObject', serviceGroupObject)
    //pending always remove
    if (serviceGroupObject.pending_api_key_id && serviceGroupObject.pending_api_key_value) {

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
            return sendRes(res, 400, { code: 2021, message: 'AWS ERROR', info: removePlanApiKeyResult.error })
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
            return sendRes(res, 400, { code: 2021, message: 'AWS ERROR', info: removeApiKeyResult.error })
        }
    }

    //move origin key to pending
    if (serviceGroupObject.api_key_id && serviceGroupObject.api_key_value) {
        try {
            const pool = await dbPool.getPool();
            await pool.query(dbQuery.service_group_pending_apikey_update.queryString, [serviceGroupObject.api_key_id, serviceGroupObject.api_key_value, req.params.svc_grp_id]);
        }
        catch (err) {
            console.log(err);
            return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
        }
    }

    var createApiKeyParams = {
        name: serviceGroupObject.svc_grp_id + ' - ' + getFormatDate(new Date()),
        description: 'name : ' + serviceGroupObject.name + 'serviceGroup : ' + serviceGroupObject.svc_grp_id + ' register_day : ' + getFormatDate(new Date()),
        enabled: true
        //value : 'api key' <== 필요하면 직접 지정해줄 수도 있다.
    };

    let createApiKeyResult = await new Promise((resolve, reject) => {
        apigateway.createApiKey(createApiKeyParams, function(err, data) {
            if (err) return { error: err };
            resolve(data);
        });
    }).catch((error) => {
        console.log('catch error', error)
        return { error: error };
    });
    console.log('createApiKeyResult', createApiKeyResult)

    if (createApiKeyResult.error) {
        return (400, { code: 2021, message: 'AWS ERROR', info: createApiKeyResult.error })
    }

    const apiKeyId = createApiKeyResult.id;
    const apiKeyValue = createApiKeyResult.value;

    //add Usage plan
    var createApikeyParams = {
        keyId: apiKeyId,
        /* required */
        keyType: 'API_KEY',
        /* required */
        usagePlanId: process.env.PLAN_ID /* required */
    };

    let addPlanApiKeyResult = await new Promise((resolve, reject) => {
        apigateway.createUsagePlanKey(createApikeyParams, function(err, data) {
            if (err) return ({ error: err });
            resolve(data);
        });
    }).catch((error) => {
        console.log('catch error', error)
        return { error: error };
    });
    console.log('addPlanApiKeyResult', addPlanApiKeyResult)

    if (addPlanApiKeyResult.error) {
        return sendRes(res, 400, { code: 2021, message: 'AWS ERROR', info: addPlanApiKeyResult.error })
    }

    try {
        const pool = await dbPool.getPool();
        await pool.query(dbQuery.service_group_apikey_update.queryString, [apiKeyId, apiKeyValue, req.params.svc_grp_id]);
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

//create API Key
function getFormatDate(date) {
    var year = date.getFullYear(); //yyyy
    var month = (1 + date.getMonth()); //M
    month = month >= 10 ? month : '0' + month; //month 두자리로 저장
    var day = date.getDate(); //d
    day = day >= 10 ? day : '0' + day; //day 두자리로 저장
    return year + '' + month + '' + day; //'-' 추가하여 yyyy-mm-dd 형태 생성 가능
}

const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
};


module.exports = { serviceGroup_svcGrpId_apikeyRefresh_PUT };
