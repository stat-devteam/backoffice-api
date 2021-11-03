"use strict";

var axios = require('axios').default;
var moment = require('moment-timezone');

const dbPool = require('../modules/util_rds_pool.js');
const smHandler = require('../modules/util_sm.js');

const dbQuery = require('../resource/sql.json');
const kasInfo = require('../resource/kas.json');

const BigNumber = require('bignumber.js');
const { DelegatedCheck } = require('../modules/util_klaytn.js');
const tokenUtil = require("../modules/util_token.js");
const klayHandler = require('../modules/util_klay.js');


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

        //발신 계정
        const fromBalanceData = await klayHandler.getBalanceOf(from_address);

        if (fromBalanceData.result) {}
        else {
            return sendRes(res, 400, { result: false, code: 1023, message: '[KAS] 잔액 조회 에러 - 발신 계정', info: { code: fromBalanceData.code, message: fromBalanceData.message } });

        }

        const from_balance = fromBalanceData.balance;


        // 수신 계정
        const toBalanceData = await klayHandler.getBalanceOf(to_address);

        if (toBalanceData.result) {}
        else {
            return sendRes(res, 400, { result: false, code: 1023, message: '[KAS] 잔액 조회 에러 - 수신 계정', info: { code: toBalanceData.code, message: toBalanceData.message } });
        }

        const to_balance = toBalanceData.balance;


        //[TASK] insert befroe submit transfer row
        const [insertResult, f1] = await pool.query(dbQuery.klaytn_account_transfer_create.queryString, [
            from, to, to_address, pebAmount, 'before_submit', from_balance, to_balance, memo
        ]);

        const transferSeq = insertResult.insertId;
        console.log('[SQL] transferSeq', transferSeq);

        const sendResult = await klayHandler.sendToken(from_address, to_address, amount);
        console.log('sendResult', sendResult);

        if (sendResult.result) {

        }
        else {
            let errorBody = {
                code: 2002,
                message: '[KAS] 클레이 전송 실패',
            }

            const [updateResult, f11] = await pool.query(dbQuery.klaytn_account_transfer_update_status.queryString, ['fail', transferSeq]);
            return sendRes(res, 400, errorBody)
        }


        //testing 

        const sendResponseData = sendResult.data;
        const txHash = sendResponseData.transactionHash;
        console.log('[KAS] sendResponseData', sendResponseData);
        console.log('[KAS] txHash', sendResponseData.transactionHash);

        //[TASK] POLL Transaction check
        const satusCheckUrl = kasInfo.apiUrl + 'tx/' + txHash;
        const checkHeader = {
            'Authorization': secretValue.kas_authorization,
            'Content-Type': 'application/json',
            'x-chain-id': process.env.KAS_xChainId,
        };

        const pollFn = () => {
            return axios.get(satusCheckUrl, { headers: checkHeader });
        };
        const pollTimeout = 20000;
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
