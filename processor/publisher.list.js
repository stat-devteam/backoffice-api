'use strict';

var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const publisher_list_GET = async(req, res) => {
    console.log('publisher_list_GET', req);
    let params = req.query;
    console.log('params', params);
    const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    const mbr_grp_id = params.memberGroupId;
    const mbr_id = params.memberId;
    const start_dt = params.startDate || 0;
    const end_dt = params.endDate || now;
    let page_offset = parseInt(params.pageOffset) || 0;
    let page_size = parseInt(params.pageSize) || 10;

    if (mbr_id) {
        return publisherListMember(res, start_dt, end_dt, mbr_id, mbr_grp_id, page_offset, page_size)
    }
    else {
        return publisherList(res, start_dt, end_dt, page_offset, page_size)
    }
}

async function publisherList(res, start_date, end_date, page_offset, page_size) {
    try {
        const pool = await dbPool.getPool();
        const [publisher_list_result, f1] = await pool.query(dbQuery.publisher_list_by_date.queryString, [start_date, end_date, page_offset, page_size]);
        const [publisher_count_result, f2] = await pool.query(dbQuery.publisher_list_count_by_date.queryString, [start_date, end_date]);
        return sendRes(res, 200, { result: true, list: publisher_list_result, count: publisher_count_result[0].count })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 9000, message: 'ERROR', info: err.message })
    }
}

async function publisherListMember(res, start_date, end_date, mbr_id, mbr_grp_id, page_offset, page_size) {
    try {
        const pool = await dbPool.getPool();
        const [publisher_list_result, f1] = await pool.query(dbQuery.publisher_list_by_date_member.queryString, [start_date, end_date, mbr_id, mbr_grp_id, page_offset, page_size]);
        const [publisher_count_result, f2] = await pool.query(dbQuery.publisher_list_count_by_date_member.queryString, [start_date, end_date, mbr_id, mbr_grp_id, ]);
        return sendRes(res, 200, { result: true, list: publisher_list_result, count: publisher_count_result[0].count })
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

module.exports = { publisher_list_GET };
