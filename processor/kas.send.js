"use strict";

var axios = require('axios').default;
var moment = require('moment-timezone');

const dbPool = require('../modules/util_rds_pool.js');
const smHandler = require('../modules/util_sm.js');

const dbQuery = require('../resource/sql.json');
const kasInfo = require('../resource/kas.json');

const BigNumber = require('bignumber.js');
const { DelegatedCheck } = require('../modules/util_klaytn.js');


const kas_send_POST = async(req, res) => {

    const body = req.body;
    console.log('[kas_send_POST] body', body);

    const from = body.from;
    const from_address = body.from_address;
    const to = body.to;
    const to_address = body.to_address;
    const amount = body.amount;
    const memo = body.memo;

    if (!from || !from_address || !to || !to_address || !amount) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
    }


    try {
        const pool = await dbPool.getPool();
        const secretValue = await smHandler.getSecretValue(process.env.SM_ID);
        const pebAmount = new BigNumber(amount).multipliedBy(new BigNumber(1e+18)).toString(10);

        //[Task] check Balance
        const jsonRpcHeader = {
            'x-chain-id': kasInfo.xChainId,
            "Content-Type": "application/json"
        }
        const jsonRpcAuth = {
            username: secretValue.kas_access_key,
            password: secretValue.kas_secret_access_key,
        }

        //발신 계정
        const fromJsonRpcBody = { "jsonrpc": "2.0", "method": "klay_getBalance", "params": [from_address, "latest"], "id": 1 }

        const fromKalynJsonRpcResponse = await axios
            .post(kasInfo.jsonRpcUrl, fromJsonRpcBody, {
                headers: jsonRpcHeader,
                auth: jsonRpcAuth
            })
            .catch((err) => {
                console.log('jsonrpc send fali', err);
                let errorBody = {
                    code: 1023,
                    message: '[KAS] 잔액 조회 에러 - 발신 계정',
                };
                return { error: errorBody }
            });
        console.log('fromKalynJsonRpcResponse', fromKalynJsonRpcResponse);

        if (fromKalynJsonRpcResponse.error) {
            return sendRes(res, 400, fromKalynJsonRpcResponse.error)
        }
        if (fromKalynJsonRpcResponse.data.error) {
            return sendRes(res, 400, {
                code: 1023,
                message: '[발신 계정- 잔액 조회 에러] ' + fromKalynJsonRpcResponse.data.error.message
            });
        }
        //result 0x1212kjsdvsdfo
        const from_balance = fromKalynJsonRpcResponse.data.result ? new BigNumber(fromKalynJsonRpcResponse.data.result).toString(10) : null;


        // 수신 계정
        const toJsonRpcBody = { "jsonrpc": "2.0", "method": "klay_getBalance", "params": [to_address, "latest"], "id": 1 }

        const toKalynJsonRpcResponse = await axios
            .post(kasInfo.jsonRpcUrl, toJsonRpcBody, {
                headers: jsonRpcHeader,
                auth: jsonRpcAuth
            })
            .catch((err) => {
                console.log('jsonrpc send fali', err);
                let errorBody = {
                    code: 1023,
                    message: '[KAS] 잔액 조회 에러 - 수신 계정',
                };
                return { error: errorBody }
            });
        console.log('toKalynJsonRpcResponse', toKalynJsonRpcResponse);

        if (toKalynJsonRpcResponse.error) {
            return sendRes(res, 400, toKalynJsonRpcResponse.error)
        }
        if (toKalynJsonRpcResponse.data.error) {
            return sendRes(res, 400, {
                code: 1023,
                message: '[수신 계정 - 잔액 조회 에러] ' + toKalynJsonRpcResponse.data.error.message
            });
        }
        //result 0x1212kjsdvsdfo
        const to_balance = toKalynJsonRpcResponse.data.result ? new BigNumber(toKalynJsonRpcResponse.data.result).toString(10) : null;


        //[TASK] insert befroe submit transfer row
        const [insertResult, f1] = await pool.query(dbQuery.klaytn_account_transfer_create.queryString, [
            from, to, to_address, pebAmount, 'before_submit', from_balance, to_balance, memo
        ]);

        const transferSeq = insertResult.insertId;
        console.log('[SQL] transferSeq', transferSeq);

        //send klay
        const bigNumberAmount = new BigNumber(amount).multipliedBy(new BigNumber(1e+18));
        const hexAmount = '0x' + bigNumberAmount.toString(16);
        console.log('hexAmount', hexAmount)

        const axiosHeader = {
            'Authorization': secretValue.kas_authorization,
            'x-krn': secretValue.kas_x_krn,
            'Content-Type': 'application/json',
            'x-chain-id': kasInfo.xChainId,
        };

        const sendBody = {
            from: from_address,
            value: hexAmount,
            to: to_address,
            memo: memo || 'memo',
            nonce: 0,
            gas: 0,
            submit: true,
        };
        console.log('[KAS] sendBody', sendBody)

        const sendResponse = await axios
            .post(kasInfo.apiUrl + 'tx/fd/value', sendBody, {
                headers: axiosHeader,
            })
            .catch((err) => {
                return { error: err.response }
            });

        if (sendResponse.error) {
            let code = sendResponse.error.data.code;
            let message = sendResponse.error.data.message;

            let errorBody = {
                code: 2002,
                message: '[KAS] 클레이 전송 실패',
                info: '[' + code + '] ' + message
            }
            console.log('[400] - (2002) 클레이 전송 실패');
            console.log('[SEND KLAY ERROR]', sendResponse.error);
            console.log('[code]', code)
            console.log('[message]', message)
            const [updateResult, f1] = await pool.query(dbQuery.klaytn_account_transfer_update_status.queryString, ['fail', transferSeq]);
            return sendRes(res, 400, errorBody)
        }

        const sendResponseData = sendResponse.data;
        const txHash = sendResponseData.transactionHash;
        console.log('[KAS] sendResponse', sendResponse);
        console.log('[KAS] txHash', sendResponseData.transactionHash);

        //[TASK] POLL Transaction check
        const satusCheckUrl = kasInfo.apiUrl + 'tx/' + txHash;
        const checkHeader = {
            'Authorization': secretValue.kas_authorization,
            'Content-Type': 'application/json',
            'x-chain-id': kasInfo.xChainId,
        };

        const pollFn = () => {
            return axios.get(satusCheckUrl, { headers: checkHeader });
        };
        const pollTimeout = 5000;
        const pollInteval = 300;

        let updateTxStatus = null;
        let updateFee = null;

        await poll(pollFn, pollTimeout, pollInteval).then(
            (res) => {
                console.log('[poll] response', res);

                if (res.status === 'Committed') {

                    let isDelegated = DelegatedCheck(res);
                    console.log('[isDelegated]', isDelegated)
                    if (isDelegated) {
                        updateFee = 0;
                    }
                    else {
                        updateFee = new BigNumber(res.gasPrice * res.gasUsed).toString(10);
                    }
                    updateTxStatus = 'success';

                }
                else if (res.status === 'CommitError') {
                    updateTxStatus = 'fail';
                }
            },
            (err) => {
                console.log('[poll] error', err);
                updateTxStatus = 'submit';
            },
        );

        console.log('[POLL - Result] updateTxStatus', updateTxStatus)
        console.log('[POLL - Result] updateFee', updateFee)

        // [TASK] Update Transfer Status
        switch (updateTxStatus) {
            case 'success':
                // code
                let resultBody = {
                    result: true,
                    transactionHash: txHash,
                    transferSequence: transferSeq,
                    status: 'success'
                };

                try {
                    const [updateResult, f5] = await pool.query(dbQuery.klaytn_account_transfer_update_status_hash_fee.queryString, [updateTxStatus, txHash, updateFee, transferSeq]);
                    console.log('[success] response', resultBody);
                    return sendRes(res, 200, resultBody);
                }
                catch (err) {
                    console.log('[success] update Fail');
                    console.log('[update value] tx_status : ', updateTxStatus);
                    console.log('[update value] fee : ', updateFee);
                    console.log('[update value] txHash : ', txHash);
                    return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
                }

            case 'submit':

                try {
                    const [updateResult, f5] = await pool.query(dbQuery.klaytn_account_transfer_update_status_hash.queryString, [updateTxStatus, txHash, transferSeq]);
                    console.log('[success] updateResult', updateResult);
                    return sendRes(res, 400, {
                        code: 1051,
                        message: 'transfer transaction 결과를 알 수 없습니다.',
                        info: {
                            transactionHash: txHash,
                            transferSequence: transferSeq,
                        }
                    })
                }
                catch (err) {
                    console.log('[submit] update Fail');
                    console.log('[update value] tx_status : ', updateTxStatus);
                    console.log('[update value] txHash : ', txHash);
                    return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
                }

            case 'fail':
                try {
                    const [updateResult, f5] = await pool.query(dbQuery.klaytn_account_transfer_update_status.queryString, [updateTxStatus, transferSeq]);
                    console.log('[fail] updateResult', updateResult);
                    return sendRes(res, 400, { code: 1052, message: 'trnasfer transaction CommitError' })
                }
                catch (err) {
                    console.log('[submit] update Fail');
                    console.log('[update value] tx_status : ', updateTxStatus);
                    return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
                }

            default:
                return sendRes(res, 400, { code: 2011, message: 'ERROR', info: 'status empty' })
        }

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }

}


function poll(fn, timeout, interval) {
    var endTime = Number(new Date()) + (timeout || 2000);
    interval = interval || 100;

    var checkCondition = function(resolve, reject) {
        var ajax = fn();
        // dive into the ajax promise
        ajax.then(function(response) {
            // If the condition is met, we're done!
            console.log('[POLL] condiftion response', response);
            console.log('[POLL] condiftion status', response.data.status);

            if (response.data.status === 'Committed') {
                resolve(response.data);
            }
            else if (response.data.status === 'CommitError') {
                resolve(response.data);
            }
            else if (Number(new Date()) < endTime) {
                // pending은 지속적으로 polling
                setTimeout(checkCondition, interval, resolve, reject);
            }
            else {
                //time out case
                reject(new Error('timed out for ' + fn + ': ' + arguments));
            }
        });
    };

    return new Promise(checkCondition);
}


const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};

module.exports = { kas_send_POST };
