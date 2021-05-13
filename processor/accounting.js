'use strict';

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
var axios = require("axios").default;
const kasInfo = require('../resource/kas.json');
const smHandler = require('../modules/util_sm.js');
const BigNumber = require('bignumber.js');


const accounting_GET = async(req, res) => {
    console.log('[accounting_GET]');

    let params = req.query;
    console.log('params', params);
    const dateType = params.dateType; // day, week, month
    const year = params.year // 2020....2030
    const month = params.month // 1,2,3, ... 12
    const day = params.day // 1,2,3, ... 31
    const accountIdArray = params.accountId.split(',');


    if (!params) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
    }

    try {
        if (dateType === 'day') {
            return dayRequest(res, year, month, day, accountIdArray)

        }
        else if (dateType === 'month') {
            return monthRequest(res, year, month, day, accountIdArray)

        }
        else if (dateType === 'year') {
            return yearRequest(res, year, month, day, accountIdArray)
        }
        else {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - dateType' })
        }


    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }

}

async function dayRequest(res, year, month, day, accountIdArray) {
    try {
        const pool = await dbPool.getRoPool();
        let startDate = new Date(year, month - 1, day);
        startDate.setHours(0);
        startDate.setMinutes(0);
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);
        let endDate = new Date(year, month - 1, day);
        endDate.setHours(23);
        endDate.setMinutes(59);
        endDate.setSeconds(59);
        endDate.setMilliseconds(999);
        console.log('startDate', startDate)
        console.log('endDate', endDate)


        let resultArray = [];

        for (let i in accountIdArray) {
            let resultItem = {};
            let targetAccountId = accountIdArray[i];
            resultItem.accnt_id = targetAccountId;
            const [balanceResult, f1] = await pool.query(dbQuery.kas_trnasfer_get_balance.queryString, [targetAccountId, startDate]);
            let balance = 0;
            if (balanceResult.length > 0) {
                balance = balanceResult[0].balance;
            }
            const [kastLastRowResult, f2] = await pool.query(dbQuery.kas_transfer_get_last_by_date.queryString, [targetAccountId, startDate, endDate]);
            const [statsResult, f3] = await pool.query(dbQuery.accounting_stats_day.queryString, [targetAccountId, year, month, day]);
            let statsItem = {
                withdrawal: [],
                deposit: [],
            };
            for (let i in statsResult) {
                let targetRow = statsResult[i];
                let type = targetRow.type;
                if (type === 'withdrawal') {
                    statsItem.withdrawal.push(targetRow);
                }
                else {
                    statsItem.deposit.push(targetRow);
                }

            }
            resultItem.stats = statsItem;
            //info
            let infoItem = {
                openingBalance: balance,
                endingBalance: kastLastRowResult.length === 0 ? balance : kastLastRowResult[0].balance,
                withdrawalSum: calculateSum(statsItem.withdrawal),
                depositSum: calculateSum(statsItem.deposit),
            }
            infoItem.withdrawTotal = new BigNumber(infoItem.withdrawalSum).plus(new BigNumber(infoItem.endingBalance)).toString(10);
            infoItem.depositTotal = new BigNumber(infoItem.depositSum).plus(new BigNumber(infoItem.openingBalance)).toString(10);
            resultItem.info = infoItem;
            resultArray.push(resultItem);
        }

        return sendRes(res, 200, { result: true, list: resultArray })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function monthRequest(res, year, month, day, accountIdArray) {
    try {
        const pool = await dbPool.getRoPool();
        let startDate = new Date(year, month - 1, 1);
        startDate.setHours(0);
        startDate.setMinutes(0);
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);
        let endDate = new Date(year, month, 0);
        endDate.setHours(23);
        endDate.setMinutes(59);
        endDate.setSeconds(59);
        endDate.setMilliseconds(999);
        console.log('startDate', startDate)
        console.log('endDate', endDate)


        let resultArray = [];

        for (let i in accountIdArray) {
            let resultItem = {};
            let targetAccountId = accountIdArray[i];
            resultItem.accnt_id = targetAccountId;
            //db data
            const [balanceResult, f1] = await pool.query(dbQuery.kas_trnasfer_get_balance.queryString, [targetAccountId, startDate]);
            let balance = 0;
            if (balanceResult.length > 0) {
                balance = balanceResult[0].balance;
            }
            const [kastLastRowResult, f2] = await pool.query(dbQuery.kas_transfer_get_last_by_date.queryString, [targetAccountId, startDate, endDate]);
            const [statsResult, f3] = await pool.query(dbQuery.accounting_stats_month.queryString, [targetAccountId, year, month, day]);
            let statsItem = {
                withdrawal: [],
                deposit: [],
            };
            for (let i in statsResult) {
                let targetRow = statsResult[i];
                let type = targetRow.type;
                if (type === 'withdrawal') {
                    statsItem.withdrawal.push(targetRow);
                }
                else {
                    statsItem.deposit.push(targetRow);
                }
            }
            resultItem.stats = statsItem;
            //info
            let infoItem = {
                openingBalance: balance,
                endingBalance: kastLastRowResult.length === 0 ? balance : kastLastRowResult[0].balance,
                withdrawalSum: calculateSum(statsItem.withdrawal),
                depositSum: calculateSum(statsItem.deposit),
            }
            infoItem.withdrawTotal = new BigNumber(infoItem.withdrawalSum).plus(new BigNumber(infoItem.endingBalance)).toString(10);
            infoItem.depositTotal = new BigNumber(infoItem.depositSum).plus(new BigNumber(infoItem.openingBalance)).toString(10);
            resultItem.info = infoItem;
            resultArray.push(resultItem);
        }

        return sendRes(res, 200, { result: true, list: resultArray })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

async function yearRequest(res, year, month, day, accountIdArray) {
    try {
        const pool = await dbPool.getRoPool();
        let startDate = new Date(year, 0, 1);
        startDate.setHours(0);
        startDate.setMinutes(0);
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);
        let endDate = new Date(year, 12, 0);
        endDate.setHours(23);
        endDate.setMinutes(59);
        endDate.setSeconds(59);
        endDate.setMilliseconds(999);
        console.log('startDate', startDate)
        console.log('endDate', endDate)


        let resultArray = [];

        for (let i in accountIdArray) {
            let resultItem = {};
            let targetAccountId = accountIdArray[i];
            resultItem.accnt_id = targetAccountId;
            //db data
            const [balanceResult, f1] = await pool.query(dbQuery.kas_trnasfer_get_balance.queryString, [targetAccountId, startDate]);
            let balance = 0;
            if (balanceResult.length > 0) {
                balance = balanceResult[0].balance;
            }
            const [kastLastRowResult, f2] = await pool.query(dbQuery.kas_transfer_get_last_by_date.queryString, [targetAccountId, startDate, endDate]);
            const [statsResult, f3] = await pool.query(dbQuery.accounting_stats_year.queryString, [targetAccountId, year, month, day]);
            let statsItem = {
                withdrawal: [],
                deposit: [],
            };
            for (let i in statsResult) {
                let targetRow = statsResult[i];
                let type = targetRow.type;
                if (type === 'withdrawal') {
                    statsItem.withdrawal.push(targetRow);
                }
                else {
                    statsItem.deposit.push(targetRow);
                }
            }
            resultItem.stats = statsItem;
            //info
            let infoItem = {
                openingBalance: balance,
                endingBalance: kastLastRowResult.length === 0 ? balance : kastLastRowResult[0].balance,
                withdrawalSum: calculateSum(statsItem.withdrawal),
                depositSum: calculateSum(statsItem.deposit),
            }
            infoItem.withdrawTotal = new BigNumber(infoItem.withdrawalSum).plus(new BigNumber(infoItem.endingBalance)).toString(10);
            infoItem.depositTotal = new BigNumber(infoItem.depositSum).plus(new BigNumber(infoItem.openingBalance)).toString(10);
            resultItem.info = infoItem;
            resultArray.push(resultItem);
        }

        return sendRes(res, 200, { result: true, list: resultArray })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}


const calculateSum = (list) => {
    let returnValue = new BigNumber(0);

    for (let i in list) {
        let targetItem = list[i];
        let amount = new BigNumber(targetItem.amount_sum);
        let fee = new BigNumber(targetItem.fee_sum);
        returnValue = returnValue.plus(amount).plus(fee);
    }
    return returnValue.toString(10);
};

const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};

module.exports = { accounting_GET };
