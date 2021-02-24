'use strict';

const dbPool = require('../modules/util_rds_pool.js');

const dbQuery = require('../resource/sql.json');


const service_GET = async(req, res) => {

    let pageOffset = parseInt(req.query.pageOffset) || 0;
    let pageSize = parseInt(req.query.pageSize) || 10;
    let serviceGroupId = req.query.serviceGroupId;

    try {
        const pool = await dbPool.getPool();

        let serviceGroupIdsArray = serviceGroupId.split(',');
        const [serviceListResult, f2] = await pool.query(dbQuery.service_get_list.queryString, [serviceGroupIdsArray, pageOffset, pageSize]);
        const [serviceTotalCountResult, f3] = await pool.query(dbQuery.service_get_total_count.queryString, [serviceGroupIdsArray]);

        return sendRes(res, 200, { result: true, list: serviceListResult, totalCount: serviceTotalCountResult[0].total });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const service_POST = async(req, res) => {

    if (!req.body.serviceGroupId || !req.body.memberGroupId || !req.body.name) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' });
    }

    const serviceGroupId = req.body.serviceGroupId;
    const memberGroupId = req.body.memberGroupId;
    const name = req.body.name || null;
    const description = req.body.description || null;

    try {
        const pool = await dbPool.getPool();
        const [createService, f1] = await pool.query(dbQuery.service_create.queryString, [serviceGroupId, name, description, memberGroupId]);

        return sendRes(res, 200, { result: true, serviceNumber: createService.insertId });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
};


module.exports = { service_GET, service_POST };
