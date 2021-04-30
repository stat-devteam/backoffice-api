"use strict";

var axios = require('axios').default;

const dbPool = require('../modules/util_rds_pool.js');
const smHandler = require('../modules/util_sm.js');

const dbQuery = require('../resource/sql.json');
const kasInfo = require('../resource/kas.json');

const BigNumber = require('bignumber.js');


const kas_GET = async(req, res) => {

    try {
        const pool = await dbPool.getPool();

        if (req.query.balance) {

            const secretValue = await smHandler.getSecretValue(process.env.SM_ID);


            let klaytnAccountResult = [];
            const serviceGroupId = req.query.svc_grp_id;

            if (serviceGroupId) {
                const serviceGroupIdsArray = serviceGroupId.split(',');
                const [klaytnAccountAllResult, f1] = await pool.query(dbQuery.hankyung_klaytn_account_get_in_svc_grp_id.queryString, [serviceGroupIdsArray]);
                klaytnAccountResult = klaytnAccountAllResult;
            }
            else {
                const [klaytnAccountAllResult, f1] = await pool.query(dbQuery.hankyung_klaytn_account_get_all.queryString, []);
                klaytnAccountResult = klaytnAccountAllResult;

            }


            for (let i in klaytnAccountResult) {
                let target = klaytnAccountResult[i];
                // Get current Balance
                const jsonRpcHeader = {
                    'x-chain-id': kasInfo.xChainId,
                    "Content-Type": "application/json"
                }
                const jsonRpcAuth = {
                    username: secretValue.kas_access_key,
                    password: secretValue.kas_secret_access_key,
                }
                const jsonRpcBody = { "jsonrpc": "2.0", "method": "klay_getBalance", "params": [target.address, "latest"], "id": 1 }

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
                target.currentBalance = currentBalance;
            }

            return sendRes(res, 200, { result: true, list: klaytnAccountResult });


        }
        else if (req.query.svc_grp_id) {
            const serviceGroupIdsArray = req.query.svc_grp_id.split(',');
            const [klaytnAccountAllResult, f1] = await pool.query(dbQuery.hankyung_klaytn_account_get_in_svc_grp_id.queryString, [serviceGroupIdsArray]);
            return sendRes(res, 200, { result: true, list: klaytnAccountAllResult });
        }
        else {
            const [klaytnAccountAllResult, f1] = await pool.query(dbQuery.hankyung_klaytn_account_get_all.queryString, []);
            return sendRes(res, 200, { result: true, list: klaytnAccountAllResult });
        }

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const kas_POST = async(req, res) => {
    if (!req.body.accountId || !req.body.name || !req.body.serviceGroupId) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
    }

    const secretValue = await smHandler.getSecretValue(process.env.SM_ID);

    //create Klaytn account
    const axiosHeader = {
        'Authorization': secretValue.kas_authorization,
        'x-krn': secretValue.kas_x_krn,
        'Content-Type': 'application/json',
        'x-chain-id': kasInfo.xChainId,
    };

    const createKasAddressResponse = await axios
        .post(kasInfo.apiUrl + 'account', {}, {
            headers: axiosHeader,
        })
        .catch((err) => {
            console.log('klay account create fali', err);
            let errorBody = {
                code: 2002,
                message: '[KAS] 계정 생성실패',
                KASMessage: err.response.data.message,
            };

            //status fail insert  해주긴 해야함
            return { error: errorBody };
        });
    console.log('createKasAddressResponse', createKasAddressResponse);

    if (createKasAddressResponse.error) {
        return sendRes(res, 400, createKasAddressResponse.error)
    }

    let address = createKasAddressResponse.data.address;

    try {
        const pool = await dbPool.getPool();
        const [klaytnAccountAllResult, f1] = await pool.query(dbQuery.hankyung_klaytn_account_create.queryString, [req.body.accountId, req.body.name, address, req.body.serviceGroupId]);

        return sendRes(res, 200, { result: true });
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

module.exports = { kas_GET, kas_POST };
