"use strict";

var axios = require('axios').default;

const dbPool = require('../modules/util_rds_pool.js');
const smHandler = require('../modules/util_sm.js');

const dbQuery = require('../resource/sql.json');
const kasInfo = require('../resource/kas.json');


const kas_GET = async(req, res) => {
    try {
        const pool = await dbPool.getPool();
        const [klaytnAccountAllResult, f1] = await pool.query(dbQuery.hankyung_klaytn_account_get_all.queryString, []);

        return sendRes(res, 200, { result: true, list: klaytnAccountAllResult });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const kas_POST = async(req, res) => {
    if (!req.body.accountId || !req.body.name) {
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
        const [klaytnAccountAllResult, f1] = await pool.query(dbQuery.hankyung_klaytn_account_create.queryString, [req.body.accountId, req.body.name, address]);

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

module.exports = { kas_GET, kas_POST };
