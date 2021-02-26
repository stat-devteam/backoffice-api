"use strict";

const axios = require('axios').default;
const BigNumber = require('bignumber.js');

const dbPool = require('../modules/util_rds_pool.js');
const smHandler = require('../modules/util_sm.js');

const dbQuery = require('../resource/sql.json');
const kasInfo = require('../resource/kas.json');


const kas_accountId_GET = async(req, res) => {

    const accountObject = {};

    try {
        const pool = await dbPool.getPool();
        const [klaytnAccountResult, f1] = await pool.query(dbQuery.hankyung_klaytn_account_get.queryString, [req.params.account_id]);

        accountObject.accnt_id = klaytnAccountResult[0].accnt_id;
        accountObject.name = klaytnAccountResult[0].name;
        accountObject.address = klaytnAccountResult[0].address;
        accountObject.svc_grp_id = klaytnAccountResult[0].svc_grp_id;

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }

    const secretValue = await smHandler.getSecretValue(process.env.SM_ID);

    // Get current Balance
    const jsonRpcHeader = {
        'x-chain-id': kasInfo.xChainId,
        "Content-Type": "application/json"
    }
    const jsonRpcAuth = {
        username: secretValue.kas_access_key,
        password: secretValue.kas_secret_access_key,
    }
    const jsonRpcBody = { "jsonrpc": "2.0", "method": "klay_getBalance", "params": [accountObject.address, "latest"], "id": 1 }

    const kalynJsonRpcResponse = await axios
        .post(kasInfo.jsonRpcUrl, jsonRpcBody, {
            headers: jsonRpcHeader,
            auth: jsonRpcAuth
        })
        .catch((err) => {
            console.log('jsonrpc send fali', err);
            let errorBody = {
                code: 1023,
                message: '[KAS] 잔액 조회 에러',
            };
            return { error: errorBody }
        });
    console.log('kalynJsonRpcResponse', kalynJsonRpcResponse);

    if (kalynJsonRpcResponse.error) {
        return sendRes(res, 400, kalynJsonRpcResponse.error)
    }
    //result 0x1212kjsdvsdfo
    const currentBalance = kalynJsonRpcResponse.data.result ? new BigNumber(kalynJsonRpcResponse.data.result).toString(10) : null;
    accountObject.currentBalance = currentBalance;

    return sendRes(res, 200, { result: true, value: accountObject });
}

const kas_accountId_PUT = async(req, res) => {
    console.log('kas_accountId_PUT - req', req)
    if (!req.body.name) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
    }

    try {
        const pool = await dbPool.getPool();
        await pool.query(dbQuery.hankyung_klaytn_account_name_update.queryString, [req.body.name, req.params.account_id]);
        return sendRes(res, 200, { result: true });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const kas_accountId_DELETE = async(req, res) => {
    try {
        const pool = await dbPool.getPool();
        await pool.query(dbQuery.hankyung_klaytn_account_delete.queryString, [req.params.account_id]);
        return sendRes(res, 200, { result: true });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
};

module.exports = { kas_accountId_GET, kas_accountId_PUT, kas_accountId_DELETE };
