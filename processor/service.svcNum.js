'use strict';

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');


const service_SvcNum_GET = async(req, res) => {
    console.log('service_SvcNum_GET req', req)
    console.log('req.params.svc_num', req.params.svc_num)
    try {
        const pool = await dbPool.getPool();
        const [serviceResult, f1] = await pool.query(dbQuery.service_get.queryString, [req.params.svc_num]);

        if (serviceResult.length === 0) {
            return sendRes(res, 400, { result: false, value: {} });
        }

        // const serviceGroupObject = {
        //     serviceNumber: serviceResult[0].serviceNumber,
        //     name: serviceResult[0].name,
        //     serviceGroupId: serviceResult[0].serviceGroupId,
        //     memberGroupId: serviceResult[0].memberGroupId,
        //     description: serviceResult[0].description,
        //     regDate: serviceResult[0].regDate,
        // };
        const serviceGroupObject = serviceResult[0]
        return sendRes(res, 200, { result: true, value: serviceGroupObject });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const service_SvcNum_PUT = async(req, res) => {

    const name = req.body.name || null;
    const description = req.body.description || null;

    try {
        const pool = await dbPool.getPool();
        await pool.query(dbQuery.service_info_update.queryString, [name, description, req.params.svc_num]);
        return sendRes(res, 200, { result: true });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const service_SvcNum_DELETE = async(req, res) => {

    try {
        const pool = await dbPool.getPool();
        await pool.query(dbQuery.service_delete.queryString, [req.params.svc_num]);
        return sendRes(res, 200, { result: true });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
};


module.exports = { service_SvcNum_GET, service_SvcNum_PUT, service_SvcNum_DELETE };
