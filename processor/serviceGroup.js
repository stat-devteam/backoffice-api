'use strict';

var AWS = require('aws-sdk');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const apigateway = new AWS.APIGateway({ apiVersion: '2015-07-09' });


const serviceGroup_GET = async(req, res) => {
    console.log('serviceGroup_GET req', req)

    if (req.query && req.query.serviceGroupIds) {
        var serviceGroupIdsArray = req.query.serviceGroupIds.split(',');

        try {
            const pool = await dbPool.getPool();
            const [serviceGroupAllResult, f1] = await pool.query(dbQuery.service_group_get_in_id.queryString, [serviceGroupIdsArray]);
            return sendRes(res, 200, { result: true, list: serviceGroupAllResult })
        }
        catch (err) {
            console.log(err);
            return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
        }
    }
    else {
        try {
            const pool = await dbPool.getPool();
            const [serviceGroupAllResult, f1] = await pool.query(dbQuery.service_group_get_all.queryString, []);
            return sendRes(res, 200, { result: true, list: serviceGroupAllResult })
        }
        catch (err) {
            console.log(err);
            return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
        }
    }
}

const serviceGroup_POST = async(req, res) => {

    if (!req.body.name || !req.body.serviceGroupId) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
    }

    const serviceGroupId = req.body.serviceGroupId || null;
    const name = req.body.name || null;

    var createApiKeyParams = {
        name: serviceGroupId + ' - ' + getFormatDate(new Date()),
        description: 'name : ' + name + 'serviceGroup : ' + serviceGroupId + ' register_day : ' + getFormatDate(new Date()),
        enabled: true
        //value : 'api key' <== 필요하면 직접 지정해줄 수도 있다.
    };

    let createApiKeyResult = await new Promise((resolve, reject) => {
        apigateway.createApiKey(createApiKeyParams, function(err, data) {
            if (err) return ({ error: err });
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
        return (400, { code: 2021, message: 'AWS ERROR', info: addPlanApiKeyResult.error })
    }

    try {
        const pool = await dbPool.getPool();
        await pool.query(dbQuery.service_group_create.queryString, [serviceGroupId, name, apiKeyId, apiKeyValue]);
        return sendRes(res, 200, { result: true })
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
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};


module.exports = { serviceGroup_GET, serviceGroup_POST };
