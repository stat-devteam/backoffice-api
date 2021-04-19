'use strict';

var moment = require('moment-timezone');

const dbPool = require('../modules/util_rds_pool.js');

const dbQuery = require('../resource/sql.json');


const bi_statistics_transfer_GET = async(req, res) => {
    console.log('params', req.query);
    const params = req.query;
    const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    let transferType = params.transferType;
    if (transferType === 'all') {
        transferType = ['pay', 'rwd']
    }
    const dateType = params.dateType; // day, week, month
    const contentType = params.contentType; // service_group or service
    const year = params.year // 2020....2030
    const month = params.month // 1,2,3, ... 12
    const serviceGroupIdsArray = params.serviceGroupIds.split(',');


    if (!dateType || !contentType) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - 필수 정보' })
    }


    console.log('transferType', transferType)
    console.log('contentType', contentType)
    console.log('year', year)

    if (contentType === 'service_group') {
        if (dateType === 'month') {
            return serviceGroupMonthRequest(res, transferType, year, serviceGroupIdsArray)

        }
        else if (dateType === 'week') {
            return serviceGroupWeekRequest(res, transferType, year, serviceGroupIdsArray)

        }
        else if (dateType === 'day') {
            return serviceGroupDayRequest(res, transferType, year, month, serviceGroupIdsArray)
        }
        else if (dateType === 'year') {
            return serviceGroupYearRequest(res, transferType, serviceGroupIdsArray)
        }
    }
    else {
        if (dateType === 'month') {
            return serviceMonthRequest(res, transferType, year, serviceGroupIdsArray)

        }
        else if (dateType === 'week') {
            return serviceWeekRequest(res, transferType, year, serviceGroupIdsArray)

        }
        else if (dateType === 'day') {
            return serviceDayRequest(res, transferType, year, month, serviceGroupIdsArray)
        }
        else if (dateType === 'year') {
            return serviceYearRequest(res, transferType, serviceGroupIdsArray)
        }

    }
}

async function serviceDayRequest(res, transferType, year, month, serviceGroupIdsArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.transfer_bi_statistics_transfer_service_by_day.queryString, [transferType, year, month, serviceGroupIdsArray]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function serviceWeekRequest(res, transferType, year, serviceGroupIdsArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.transfer_bi_statistics_transfer_service_by_week.queryString, [transferType, year, serviceGroupIdsArray]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function serviceMonthRequest(res, transferType, year, serviceGroupIdsArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.transfer_bi_statistics_transfer_service_by_month.queryString, [transferType, year, serviceGroupIdsArray]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function serviceYearRequest(res, transferType, serviceGroupIdsArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.transfer_bi_statistics_transfer_service_by_year.queryString, [transferType, serviceGroupIdsArray]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}
//service-group
async function serviceGroupDayRequest(res, transferType, year, month, serviceGroupIdsArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.transfer_bi_statistics_transfer_service_group_by_day.queryString, [transferType, year, month, serviceGroupIdsArray]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function serviceGroupWeekRequest(res, transferType, year, serviceGroupIdsArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.transfer_bi_statistics_transfer_service_group_by_week.queryString, [transferType, year, serviceGroupIdsArray]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function serviceGroupMonthRequest(res, transferType, year, serviceGroupIdsArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.transfer_bi_statistics_transfer_service_group_by_month.queryString, [transferType, year, serviceGroupIdsArray]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function serviceGroupYearRequest(res, transferType, serviceGroupIdsArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.transfer_bi_statistics_transfer_service_group_by_year.queryString, [transferType, serviceGroupIdsArray]);
        return sendRes(res, 200, { result: true, list: result })
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


module.exports = { bi_statistics_transfer_GET };
