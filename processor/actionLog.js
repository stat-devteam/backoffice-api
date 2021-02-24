"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
var moment = require('moment-timezone');

const actionLog_GET = async(req, res) => {

    console.log('req.query', req.query);

    const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    const startDate = req.query.startDate || 0;
    const endDate = req.query.endDate || now;
    let pageOffset = parseInt(req.query.pageOffset) || 0;
    let pageSize = parseInt(req.query.pageSize) || 10;
    var adminIdArray = req.query.adminId.split(',');

    try {
        const pool = await dbPool.getPool();
        const [actionLogListResult, f1] = await pool.query(dbQuery.admin_action_log_list.queryString, [adminIdArray, startDate, endDate, pageOffset, pageSize]);
        const [actionLogTotalCountResult, f2] = await pool.query(dbQuery.admin_action_total_count.queryString, [adminIdArray, startDate, endDate]);

        return sendRes(res, 200, {
            result: true,
            list: actionLogListResult,
            totalCount: actionLogTotalCountResult[0].total
        })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }

}



const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
};

module.exports = { actionLog_GET };
