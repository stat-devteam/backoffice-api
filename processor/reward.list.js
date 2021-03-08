'use strict';

const dbPool = require('../modules/util_rds_pool.js');

const dbQuery = require('../resource/sql.json');


const reward_list_GET = async(req, res) => {

    if (req.query.type === 'user') {
        if (!req.query.memberGroupId || !req.query.memberId) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Required Pamrameter Missing : memberGroupId | memberId' });
        }

        const memberGroupId = req.query.memberGroupId;
        const memberId = req.query.memberId;
        let pageOffset = parseInt(req.query.pageOffset) || 0;
        let pageSize = parseInt(req.query.pageSize) || 10;
        const optionType = req.query.optionType; //service,service_group
        const optionValue = req.query.optionValue;

        if (req.query.optionType === 'none') {
            return rewardListOptionTypeNone(res, memberId, memberGroupId, pageOffset, pageSize);
        }
        else if (req.query.optionType === 'service' && optionValue) {
            return rewardListOptionTypeService(res, memberId, memberGroupId, pageOffset, pageSize, optionValue);
        }
        else if (req.query.optionType === 'service_group' && optionValue) {
            const serviceGroupIdsArray = optionValue.split(',');
            return rewardListOptionTypeServiceGroup(res, memberId, memberGroupId, pageOffset, pageSize, serviceGroupIdsArray);
        }
    }

    return sendRes(res, 400, { code: 1101, message: '[Shift] Required Pamrameter Missing : type | optionType' });
}


async function rewardListOptionTypeNone(res, memberId, memberGroupId, pageOffset, pageSize) {
    try {
        const pool = await dbPool.getPool();
        const [rewardListResult, f1] = await pool.query(dbQuery.reward_get_list_by_user.queryString, [memberId, memberGroupId, pageOffset, pageSize]);
        const [rewardTotalCountResult, f2] = await pool.query(dbQuery.reward_get_total_count_by_user.queryString, [memberId, memberGroupId]);
        return sendRes(res, 200, { result: true, list: rewardListResult, totalCount: rewardTotalCountResult[0].total, })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function rewardListOptionTypeService(res, memberId, memberGroupId, pageOffset, pageSize, optionValue) {
    try {
        const pool = await dbPool.getPool();
        const [rewardListResult, f1] = await pool.query(dbQuery.reward_get_list_by_user_service.queryString, [memberId, memberGroupId, optionValue, pageOffset, pageSize]);
        const [rewardTotalCountResult, f2] = await pool.query(dbQuery.reward_get_total_count_by_user_service.queryString, [memberId, memberGroupId, optionValue]);
        return sendRes(res, 200, { result: true, list: rewardListResult, totalCount: rewardTotalCountResult[0].total, })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function rewardListOptionTypeServiceGroup(res, memberId, memberGroupId, pageOffset, pageSize, serviceGroupIdsArray) {

    try {
        const pool = await dbPool.getPool();
        const [rewardListResult, f1] = await pool.query(dbQuery.reward_get_list_by_user_service_group.queryString, [serviceGroupIdsArray, memberId, memberGroupId, pageOffset, pageSize]);
        const [rewardTotalCountResult, f2] = await pool.query(dbQuery.reward_get_total_count_by_user_service_group.queryString, [serviceGroupIdsArray, memberId, memberGroupId]);
        return sendRes(res, 200, { result: true, list: rewardListResult, totalCount: rewardTotalCountResult[0].total, })
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


module.exports = { reward_list_GET };
