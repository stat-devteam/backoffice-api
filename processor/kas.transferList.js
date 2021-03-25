'use strict';

var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');


const kas_transferList_GET = async(req, res) => {

    let params = req.query;
    console.log('params', params);

    const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    const startDate = params.startDate || 0;
    const endDate = params.endDate || now;
    let pageOffset = parseInt(params.pageOffset) || 0;
    let pageSize = parseInt(params.pageSize) || 10;
    let fromAccountId = params.fromAccountId;
    let txStatus = params.txStatus;
    const fromAccountIdArray = fromAccountId.split(',');
    const txStatusArray = txStatus.split(',');
    console.log('fromAccountIdArray', fromAccountIdArray)
    console.log('txStatusArray', txStatusArray)

    try {

        const pool = await dbPool.getPool();
        const [transferListResult, f1] = await pool.query(dbQuery.klaytn_account_transfer_list.queryString, [fromAccountIdArray, txStatusArray, startDate, endDate, pageOffset, pageSize]);
        const [transferTotalCountResult, f2] = await pool.query(dbQuery.klaytn_account_transfer_list_total.queryString, [fromAccountIdArray, txStatusArray, startDate, endDate, pageOffset, pageSize]);
        return sendRes(res, 200, { result: true, list: transferListResult, totalCount: transferTotalCountResult[0].total, })
    }
    catch (err) {
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })

    }

}


const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};

module.exports = { kas_transferList_GET };
