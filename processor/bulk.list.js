'use strict';

var moment = require('moment-timezone');

const dbPool = require('../modules/util_rds_pool.js');

const dbQuery = require('../resource/sql.json');


const bulk_list_GET = async(req, res) => {

    const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    const startDate = req.query.startDate || 0;
    const endDate = req.query.endDate || now;
    let pageOffset = parseInt(req.query.pageOffset) || 0;
    let pageSize = parseInt(req.query.pageSize) || 10;
    const optionType = req.query.optionType; //none, service,service_group
    const optionValue = req.query.optionValue;

    if (optionType === 'none') {
        return bulkListOptionTypeNone(res, startDate, endDate, pageOffset, pageSize);
    }
    else if (optionType === 'service' && optionValue) {
        return bulkListOptionTypeService(res, optionValue, startDate, endDate, pageOffset, pageSize);
    }
    else if (optionType === 'admin_id' && optionValue) {
        return bulkListOptionTypeAdminId(res, optionValue, startDate, endDate, pageOffset, pageSize);
    }

    return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - 옵션 타입' })
}

async function bulkListOptionTypeNone(res, startDate, endDate, pageOffset, pageSize) {
    try {
        const pool = await dbPool.getPool();
        const [bulkListResult, f1] = await pool.query(dbQuery.bulk_transfer_get_list.queryString, [startDate, endDate, pageOffset, pageSize]);
        const [bulkTotalCountResult, f2] = await pool.query(dbQuery.bulk_transfer_get_total_count.queryString, [startDate, endDate]);
        return sendRes(res, 200, { result: true, list: bulkListResult, totalCount: bulkTotalCountResult[0].total, })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function bulkListOptionTypeService(res, optionValue, startDate, endDate, pageOffset, pageSize) {
    try {
        const pool = await dbPool.getPool();
        const [bulkListResult, f1] = await pool.query(dbQuery.bulk_transfer_get_list_by_service.queryString, [optionValue, startDate, endDate, pageOffset, pageSize]);
        const [bulkTotalCountResult, f2] = await pool.query(dbQuery.bulk_transfer_get_total_count_by_service.queryString, [optionValue, startDate, endDate]);
        return sendRes(res, 200, { result: true, list: bulkListResult, totalCount: bulkTotalCountResult[0].total, })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function bulkListOptionTypeAdminId(res, optionValue, startDate, endDate, pageOffset, pageSize) {
    try {
        const pool = await dbPool.getPool();
        const [bulkListResult, f1] = await pool.query(dbQuery.bulk_transfer_get_list_by_admin_id.queryString, [optionValue, startDate, endDate, pageOffset, pageSize]);
        const [bulkTotalCountResult, f2] = await pool.query(dbQuery.bulk_transfer_get_total_count_by_admin_id.queryString, [optionValue, startDate, endDate]);
        return sendRes(res, 200, { result: true, list: bulkListResult, totalCount: bulkTotalCountResult[0].total, })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
};


module.exports = { bulk_list_GET };
