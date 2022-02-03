'use strict';

var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const fee_stat_list_GET = async(req, res) => {
    console.log('fee_stat_list_GET', req);
    let params = req.query;
    console.log('params', params);
    const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    const start_date = params.startDate || 0;
    const end_date = params.endDate || now;
    let page_offset = parseInt(params.pageOffset) || 0;
    let page_size = parseInt(params.pageSize) || 10;

    try {
        const pool = await dbPool.getPool();
        const [feeStatResult, f1] = await pool.query(dbQuery.fee_stat_by_date.queryString, [start_date, end_date, page_offset, page_size]);
        const [feeStatCountResult, f2] = await pool.query(dbQuery.fee_stat_count_by_date.queryString, [start_date, end_date]);
        const [feeStatSummaryResult, f3] = await pool.query(dbQuery.fee_stat_summary_by_date.queryString, [start_date, end_date]);

        return sendRes(res, 200, { result: true, list: feeStatResult, count: feeStatCountResult[0].count, summary: feeStatSummaryResult[0] });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 9000, message: 'ERROR', info: err.message })
    }
}

const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};

module.exports = { fee_stat_list_GET };
