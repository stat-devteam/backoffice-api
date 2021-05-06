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
    const memberId = params.memberId;
    const memberGroupId = params.memberGroupId;

    if (!params) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 memberId, memberGroupId' })
    }

    try {
        const pool = await dbPool.getRoPool();

        return sendRes(res, 200, { result: true, test: 'work' })


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

module.exports = { accounting_GET };
