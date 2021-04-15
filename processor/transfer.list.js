'use strict';

var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');


const transfer_list_GET = async(req, res) => {

    let params = req.query;
    console.log('params', params);


    const type = params.type;
    const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    const memberGroupId = params.memberGroupId;
    const memberId = params.memberId;
    let transferType = params.transferType;
    if (transferType === 'all') {
        transferType = ['pay', 'rwd']
    }
    const startDate = params.startDate || 0;
    const endDate = params.endDate || now;
    let pageOffset = parseInt(params.pageOffset) || 0;
    let pageSize = parseInt(params.pageSize) || 10;
    const optionType = params.optionType; //none, service,service_group
    const optionValue = params.optionValue;
    let klipNew = params.klipNew;
    const klipNewArray = klipNew.split(',');
    console.log('transferType', transferType)
    console.log('klipNewArray', klipNewArray)

    if (type === 'user') {
        if (!memberGroupId || !memberId) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - memberGroupId or memberId' })
        }

        if (!optionValue) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - 옵션 타입' })
        }

        if (optionType === 'service' && optionValue) {
            return transferListUserOptionTypeService(res, memberGroupId, memberId, optionValue, startDate, endDate, transferType, klipNewArray, pageOffset, pageSize);
        }
        else if (optionType === 'service_group' && optionValue) {
            const serviceGroupIdsArray = optionValue.split(',');
            return transferListUserOptionTypeServiceGroup(res, memberGroupId, memberId, serviceGroupIdsArray, startDate, endDate, transferType, klipNewArray, pageOffset, pageSize);
        }
    }
    else if (type === 'service') {
        if (!params.serviceNumber) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - serviceNumber' })
        }

        const serviceNumber = params.serviceNumber;
        return transferListService(res, serviceNumber, transferType, klipNewArray, startDate, endDate, pageOffset, pageSize);

    }
    else if (type === 'service_group') {
        if (!params.serviceGroupId) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - serviceGroupId' })
        }

        const serviceGroupId = params.serviceGroupId;
        const serviceGroupIdsArray = serviceGroupId.split(',');
        return transferListServiceGroup(res, serviceGroupIdsArray, transferType, klipNewArray, startDate, endDate, pageOffset, pageSize);
    }

}

async function transferListUserOptionTypeService(res, memberGroupId, memberId, optionValue, startDate, endDate, transferType, klipNewArray, pageOffset, pageSize) {
    try {
        const pool = await dbPool.getPool();
        const [transferListResult, f1] = await pool.query(dbQuery.transfer_get_list_by_user_service.queryString, [memberGroupId, memberId, optionValue, startDate, endDate, transferType, klipNewArray, pageOffset, pageSize]);
        const [transferTotalCountResult, f2] = await pool.query(dbQuery.transfer_get_total_count_by_user_service.queryString, [memberGroupId, memberId, optionValue, startDate, endDate, transferType, klipNewArray]);
        return sendRes(res, 200, { result: true, list: transferListResult, totalCount: transferTotalCountResult[0].total, })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function transferListUserOptionTypeServiceGroup(res, memberGroupId, memberId, optionValue, startDate, endDate, transferType, klipNewArray, pageOffset, pageSize) {
    try {
        const pool = await dbPool.getPool();
        const [transferListResult, f1] = await pool.query(dbQuery.transfer_get_list_by_user_service_group.queryString, [memberGroupId, memberId, optionValue, startDate, endDate, transferType, klipNewArray, pageOffset, pageSize]);
        const [transferTotalCountResult, f2] = await pool.query(dbQuery.transfer_get_total_count_by_user_service_group.queryString, [memberGroupId, memberId, optionValue, startDate, endDate, transferType, klipNewArray]);
        return sendRes(res, 200, { result: true, list: transferListResult, totalCount: transferTotalCountResult[0].total, })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function transferListService(res, serviceNumber, transferType, klipNewArray, startDate, endDate, pageOffset, pageSize) {
    try {
        const pool = await dbPool.getPool();
        const [transferListResult, f1] = await pool.query(dbQuery.transfer_get_list_by_service.queryString, [serviceNumber, transferType, klipNewArray, startDate, endDate, pageOffset, pageSize]);
        const [transferTotalCountResult, f2] = await pool.query(dbQuery.transfer_get_total_count_by_service.queryString, [serviceNumber, transferType, klipNewArray, startDate, endDate]);
        return sendRes(res, 200, { result: true, list: transferListResult, totalCount: transferTotalCountResult[0].total, })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function transferListServiceGroup(res, serviceGroupIdsArray, transferType, klipNewArray, startDate, endDate, pageOffset, pageSize) {
    try {
        const pool = await dbPool.getPool();
        const [transferListResult, f1] = await pool.query(dbQuery.transfer_get_list_by_service_group.queryString, [serviceGroupIdsArray, transferType, klipNewArray, startDate, endDate, pageOffset, pageSize]);
        const [transferTotalCountResult, f2] = await pool.query(dbQuery.transfer_get_total_count_by_service_group.queryString, [serviceGroupIdsArray, transferType, klipNewArray, startDate, endDate]);
        return sendRes(res, 200, { result: true, list: transferListResult, totalCount: transferTotalCountResult[0].total, })
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

module.exports = { transfer_list_GET };
