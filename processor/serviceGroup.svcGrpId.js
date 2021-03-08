'use strict';

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');


const serviceGroup_svcGrpId_GET = async(req, res) => {

    let serviceGroupId = req.params.svc_grp_id;

    try {
        const pool = await dbPool.getPool();
        const [serviceGroupResult, f1] = await pool.query(dbQuery.service_group_get.queryString, [serviceGroupId]);

        if (serviceGroupResult.length === 0) {
            return sendRes(res, 400, { result: false, value: null });
        }

        // const serviceGroupObject = {
        //     serviceGroupId: serviceGroupResult[0].serviceGroupId,
        //     name: serviceGroupResult[0].name,
        //     accountId: serviceGroupResult[0].accountId,
        //     apiKeyId: serviceGroupResult[0].apiKeyId,
        //     apiKeyValue: serviceGroupResult[0].apiKeyValue,
        //     pendingApiKeyId: serviceGroupResult[0].pendingApiKeyId,
        //     pendingApiKeyValue: serviceGroupResult[0].pendingApiKeyValue,
        // };

        return sendRes(res, 200, { result: true, value: serviceGroupResult[0] })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const serviceGroup_svcGrpId_PUT = async(req, res) => {

    if (!req.body.name) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
    }

    try {
        const pool = await dbPool.getPool();
        await pool.query(dbQuery.service_group_name_update.queryString, [req.body.name, req.params.svc_grp_id]);
        return sendRes(res, 200, { result: true })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const serviceGroup_svcGrpId_DELETE = async(req, res) => {
    try {
        const pool = await dbPool.getPool();
        await pool.query(dbQuery.service_group_delete.queryString, [req.params.svc_grp_id]);
        return sendRes(res, 200, { result: true })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};


module.exports = { serviceGroup_svcGrpId_GET, serviceGroup_svcGrpId_PUT, serviceGroup_svcGrpId_DELETE };
