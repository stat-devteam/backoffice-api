'use strict';

var axios = require("axios").default;
var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const snsHandler = require('../modules/util_sns.js');

const trader_nft_DELETE = async(req, res) => {
    console.log('trader_nft_DELETE', req);
    let params = req.query;
    console.log('params', params);
    const memberId = params.memberId;
    const memberGroupId = params.memberGroupId;
    const publisherId = params.publisherId;

    try {

        const pool = await dbPool.getPool();
        
        const serviceCallbackUrl = params.serviceCallbackUrl ? decodeURIComponent(params.serviceCallbackUrl) : null;

        //1.check Link
        const [linkInfoResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);
        console.log('linkInfoResult', linkInfoResult);


        if (linkInfoResult.length === 0) {
            return sendRes(res, 400, { code: 1001, message: "Link가 연결되지 않음." })
        }

        const linkNum = linkInfoResult[0].link_num;

        //[TASK] Check validation
        const [trader_publish_get, f2] = await pool.query(dbQuery.trader_publish_get.queryString, [publisherId, linkNum]);
        console.log('trader_publish_get', trader_publish_get);
        if (trader_publish_get.length === 0) {
            return sendRes(res, 400, { code: 5001, message: "발급 정보를 찾을 수 없습니다." })
        }

        if (trader_publish_get[0].link_num !== linkNum) {
            return sendRes(res, 400, { code: 5001, message: '유효하지 않는 링크 입니다.' });
        }
        if (trader_publish_get[0].status === 'Close') {
            return sendRes(res, 400, { code: 5001, message: '이미 취소 처리가 되었습니다.' });
        }

        //[TASK] serviceCallback Url 있을 경우 Insesrt
        var serviceCallbackSeq = null;
        if (serviceCallbackUrl) {
            console.log('serviceCallbackUrl', serviceCallbackUrl)

            const [createServiceCallbackResult, f3] = await pool.query(dbQuery.service_callback_insert.queryString, [serviceCallbackUrl]);
            serviceCallbackSeq = parseInt(createServiceCallbackResult.insertId);

            const [trader_cancel_callback_update, f4] = await pool.query(dbQuery.trader_cancel_callback_update.queryString, [serviceCallbackSeq, publisherId]);
            console.log('trader_cancel_callback_update', trader_cancel_callback_update);
            console.log('serviceCallbackSeq', serviceCallbackSeq)
        }

        //[TASK] Send cancel notification 
        const message = {
            publisherId: publisherId
        };

        const resultNotification = await snsHandler.sendNotification(process.env.SNS_CANCEL_ARN, message);
        console.log('resultNotification', resultNotification);

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

module.exports = { trader_nft_DELETE };
