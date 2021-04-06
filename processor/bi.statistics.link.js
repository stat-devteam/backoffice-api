'use strict';

var moment = require('moment-timezone');

const dbPool = require('../modules/util_rds_pool.js');

const dbQuery = require('../resource/sql.json');


const bi_statistics_transfer_GET = async(req, res) => {
    console.log('params', req.query);
    const params = req.query;
    const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    const dateType = params.dateType; // day, week, month
    const year = params.year // 2020....2030
    const month = params.month // 1,2,3, ... 12
    const serviceGroupIdArray = params.serviceGroupId.split(',');
    let klipNew = req.query.klipNew;
    const klipNewArray = klipNew.split(',');


    if (!dateType) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - 필수 정보' })
    }


    console.log('year', year)
    console.log('month', month)

    if (dateType === 'month') {
        return serviceGroupMonthRequest(res, year, serviceGroupIdArray, klipNewArray)

    }
    else if (dateType === 'week') {
        return serviceGroupWeekRequest(res, year, serviceGroupIdArray, klipNewArray)

    }
    else if (dateType === 'day') {
        return serviceGroupDayRequest(res, year, month, serviceGroupIdArray, klipNewArray)
    }
}

async function serviceGroupDayRequest(res, year, month, serviceGroupIdArray, klipNewArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.link_bi_statistics_service_group_by_day.queryString, [year, month, serviceGroupIdArray, klipNewArray]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function serviceGroupWeekRequest(res, year, serviceGroupIdArray, klipNewArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.link_bi_statistics_service_group_by_week.queryString, [year, serviceGroupIdArray, klipNewArray]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function serviceGroupMonthRequest(res, year, serviceGroupIdArray, klipNewArray) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.link_bi_statistics_service_group_by_month.queryString, [year, serviceGroupIdArray, klipNewArray]);
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
