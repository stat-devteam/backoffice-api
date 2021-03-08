'use strict';

var moment = require('moment-timezone');

const dbPool = require('../modules/util_rds_pool.js');

const dbQuery = require('../resource/sql.json');


const link_list_GET = async(req, res) => {

    if (req.query.type === 'date_range') {
        const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
        let pageOffset = parseInt(req.query.pageOffset) || 0; // optional query item, default 0
        let pageSize = parseInt(req.query.pageSize) || 10; // optional query item, default 10
        const startDate = req.query.startDate || 0; // optional query item, default 0
        const endDate = req.query.endDate || now; // optional query item, default now

        return linkListDateRangeType(res, pageOffset, pageSize, startDate, endDate);
    }
    else if (req.query.type === 'user') {
        if (!req.query.memberGroupId || !req.query.memberId) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Required Pamrameter Missing : memberGroupId | memberId' });
        }

        const memberGroupId = req.query.memberGroupId; // required query item
        const memberId = req.query.memberId; // required query item
        let pageOffset = parseInt(req.query.pageOffset) || 0; // optional query item, default 0
        let pageSize = parseInt(req.query.pageSize) || 10; // optional query item, dafault 10

        return linkListUserType(res, memberGroupId, memberId, pageOffset, pageSize);
    }

    return sendRes(res, 400, { code: 1101, message: '[Shift] Required Pamrameter Missing : type' });
}

async function linkListDateRangeType(res, pageOffset, pageSize, startDate, endDate) {
    try {
        const pool = await dbPool.getPool();
        const [linkListResult, f1] = await pool.query(dbQuery.link_get_list_date_range.queryString, [startDate, endDate, pageOffset, pageSize]);
        const [linkTotalCountResult, f2] = await pool.query(dbQuery.link_get_total_count_date_range.queryString, [startDate, endDate]);
        return sendRes(res, 200, {
            result: true,
            list: linkListResult,
            totalCount: linkTotalCountResult[0].total,
        });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function linkListUserType(res, memberGroupId, memberId, pageOffset, pageSize) {
    try {
        const pool = await dbPool.getPool();
        const [linkListResult, f1] = await pool.query(dbQuery.link_temp_get_list_user.queryString, [memberId, memberGroupId, pageOffset, pageSize]);
        const [linkTotalCountResult, f2] = await pool.query(dbQuery.link_temp_get_total_count_user.queryString, [memberId, memberGroupId]);
        const [linkInfoResult, f3] = await pool.query(dbQuery.link_get_info_user.queryString, [memberGroupId, memberId]);
        return sendRes(res, 200, {
            result: true,
            list: linkListResult,
            totalCount: linkTotalCountResult[0].total,
            info: linkInfoResult.length > 0 ? linkInfoResult[0] : null,
        });
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

module.exports = { link_list_GET };
