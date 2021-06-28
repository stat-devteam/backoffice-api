'use strict';

var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');


const bi_statistics_nft_GET = async(req, res) => {
    console.log('[bi_statistics_link_GET] ]params', req.query);
    const params = req.query;
    const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    const dateType = params.dateType; // day, week, month
    const year = params.year // 2020....2030
    const month = params.month // 1,2,3, ... 12

    if (!dateType) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - 필수 정보' })
    }


    console.log('year', year)
    console.log('month', month)

    if (dateType === 'day') {
        return dayRequest(res, year, month)
    }
    else if (dateType === 'week') {
        return weekRequest(res, year)

    }
    else if (dateType === 'month') {
        return monthRequest(res, year)

    }
    else if (dateType === 'year') {
        return yearRequest(res)

    }
    else {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - 필수 정보' })

    }
}

async function dayRequest(res, year, month) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.nft_bi_statistics_by_day.queryString, [year, month]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function weekRequest(res, year, month, trader_id) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.nft_bi_statistics_by_week.queryString, [year]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function monthRequest(res, year, month, trader_id) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.nft_bi_statistics_by_month.queryString, [year]);
        return sendRes(res, 200, { result: true, list: result })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function yearRequest(res, year, month, trader_id) {
    try {
        const pool = await dbPool.getRoPool();
        const [result, f1] = await pool.query(dbQuery.nft_bi_statistics_by_year.queryString, [year]);
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


module.exports = { bi_statistics_nft_GET };
