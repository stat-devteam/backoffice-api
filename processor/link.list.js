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
        let serviceGroupId = req.query.serviceGroupId;
        // let memberGroupId = req.query.memberGroupId;
        const serviceGroupIdArray = serviceGroupId.split(',');
        let klipNew = req.query.klipNew;
        const klipNewArray = klipNew.split(',');
        const serviceNumber = req.query.serviceNumber;

        return linkListDateRangeType(res, klipNewArray, serviceGroupIdArray, serviceNumber, pageOffset, pageSize, startDate, endDate);
    }
    else if (req.query.type === 'user') {
        if (!req.query.memberGroupId || !req.query.memberId) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Required Pamrameter Missing : memberGroupId | memberId' });
        }

        const memberGroupId = req.query.memberGroupId; // required query item
        const memberId = req.query.memberId; // required query item
        let pageOffset = parseInt(req.query.pageOffset) || 0; // optional query item, default 0
        let pageSize = parseInt(req.query.pageSize) || 10; // optional query item, dafault 10
        let serviceGroupId = req.query.serviceGroupId;
        const serviceGroupIdArray = serviceGroupId.split(',');
        let klipNew = req.query.klipNew;
        const klipNewArray = klipNew.split(',');
        const serviceNumber = req.query.serviceNumber;

        return linkListUserType(res, memberGroupId, memberId, serviceGroupIdArray, klipNewArray, serviceNumber, pageOffset, pageSize);
    }

    return sendRes(res, 400, { code: 1101, message: '[Shift] Required Pamrameter Missing : type' });
}

async function linkListDateRangeType(res, klipNewArray, serviceGroupIdArray, serviceNumber, pageOffset, pageSize, startDate, endDate) {
    try {
        const pool = await dbPool.getPool();
        if (serviceNumber === 'none') {
            const [linkListResult, f1] = await pool.query(dbQuery.link_get_list_date_range.queryString, [klipNewArray, serviceGroupIdArray, startDate, endDate, pageOffset, pageSize]);
            console.log('linkListResult', linkListResult);

            const [linkTotalCountResult, f2] = await pool.query(dbQuery.link_get_total_count_date_range.queryString, [klipNewArray, serviceGroupIdArray, startDate, endDate]);
            console.log('linkTotalCountResult', linkTotalCountResult);

            return sendRes(res, 200, {
                result: true,
                list: linkListResult,
                totalCount: linkTotalCountResult[0].total,
            });
        }
        else {
            const [linkListResult, f1] = await pool.query(dbQuery.link_get_list_date_range_svc_num.queryString, [klipNewArray, serviceGroupIdArray, serviceNumber, startDate, endDate, pageOffset, pageSize]);
            const [linkTotalCountResult, f2] = await pool.query(dbQuery.link_get_total_count_date_range_svc_num.queryString, [klipNewArray, serviceGroupIdArray, serviceNumber, startDate, endDate]);
            return sendRes(res, 200, {
                result: true,
                list: linkListResult,
                totalCount: linkTotalCountResult[0].total,
            });
        }

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function linkListUserType(res, memberGroupId, memberId, serviceGroupIdArray, klipNewArray, serviceNumber, pageOffset, pageSize) {

    try {
        const pool = await dbPool.getPool();

        if (serviceNumber === 'none') {
            const [linkListResult, f1] = await pool.query(dbQuery.link_temp_get_list_user.queryString, [memberId, memberGroupId, serviceGroupIdArray, pageOffset, pageSize]);
            const [linkTotalCountResult, f2] = await pool.query(dbQuery.link_temp_get_total_count_user.queryString, [memberId, memberGroupId, serviceGroupIdArray]);
            const [linkInfoResult, f3] = await pool.query(dbQuery.link_get_info_user.queryString, [memberGroupId, memberId, serviceGroupIdArray, klipNewArray]);
            return sendRes(res, 200, {
                result: true,
                list: linkListResult,
                totalCount: linkTotalCountResult[0].total,
                info: linkInfoResult.length > 0 ? linkInfoResult[0] : null,
            });
        }
        else {
            const [linkListResult, f1] = await pool.query(dbQuery.link_temp_get_list_user_svc_num.queryString, [memberId, memberGroupId, serviceGroupIdArray, serviceNumber, pageOffset, pageSize]);
            const [linkTotalCountResult, f2] = await pool.query(dbQuery.link_temp_get_total_count_user_svc_num.queryString, [memberId, memberGroupId, serviceGroupIdArray, serviceNumber]);
            const [linkInfoResult, f3] = await pool.query(dbQuery.link_get_info_user_svc_num.queryString, [memberGroupId, memberId, serviceGroupIdArray, klipNewArray, serviceNumber]);
            return sendRes(res, 200, {
                result: true,
                list: linkListResult,
                totalCount: linkTotalCountResult[0].total,
                info: linkInfoResult.length > 0 ? linkInfoResult[0] : null,
            });
        }

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
