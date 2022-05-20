'use strict';

var axios = require("axios").default;
var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const snsHandler = require('../modules/util_sns.js');

const trader_nft_POST = async(req, res) => {
    console.log('trader_nft_POST', req);
    let params = req.query;
    console.log('params', params);

    try {

        const pool = await dbPool.getPool();
        
        const memberId = params.memberId;
        const memberGroupId = params.memberGroupId;
        const serviceCallbackUrl = params.serviceCallbackUrl ? decodeURIComponent(params.serviceCallbackUrl) : null;

        const body = req.body;
        console.log('[Req] body', body);

        if (!body) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Body Missing' });
        }

        if (!body.type || !body.title || !body.description || !body.imagePath || !body.maxPublish || !body.traderName || !body.traderCompany || !body.videoPath) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Body Missing Check' });
        }

        if (body.maxPublish < 1 || body.maxPublish > 100) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Body Missing Check' });
        }

        if (body.type === 'BuyNow') {
            if (!body.price) {
                return sendRes(res, 400, { code: 1101, message: '[Shift] Body Missing Check' });
            }
            body.directPrice = body.price;
            body.period = 0;
        }
        else if (body.type === 'Auction') {

            if (!body.price || !body.directPrice || !body.period) {
                return sendRes(res, 400, { code: 1101, message: '[Shift] Body Missing Check' });
            }
        }
        else {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Invalid type value in body' });
        }

        //1.check Link
        const [linkInfoResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);
        console.log('linkInfoResult', linkInfoResult);

        if (linkInfoResult.length === 0) {
            return sendRes(res, 400, { code: 1001, message: "Link가 연결되지 않음." })
        }

        const linkNum = linkInfoResult[0].link_num;

        //[TASK] Check validation
        const [trader_publish_check, f2] = await pool.query(dbQuery.trader_publish_check.queryString, [linkNum]);
        console.log('trader_publish_check', trader_publish_check);
        if (trader_publish_check[0].cnt > 0) {
            return sendRes(res, 400, { code: 5001, message: '현재 판매중인 상품이 있습니다.' });
        }

        //[TASK] serviceCallback Url 있을 경우 Insesrt
        var serviceCallbackSeq = null;
        if (serviceCallbackUrl) {
            console.log('serviceCallbackUrl', serviceCallbackUrl)

            const [createServiceCallbackResult, f3] = await pool.query(dbQuery.service_callback_insert.queryString, [serviceCallbackUrl]);
            serviceCallbackSeq = parseInt(createServiceCallbackResult.insertId);
        }
        console.log('serviceCallbackSeq', serviceCallbackSeq)

        //[TASK] Insert publish data 
        const [trader_publish_insert, f4] = await pool.query(dbQuery.trader_publish_insert.queryString, [body.type, body.title, body.description, body.imagePath, body.videoPath, body.maxPublish, body.price, body.directPrice, linkNum, body.period, body.traderName, body.traderCompany, serviceCallbackSeq]);
        console.log('trader_publish_insert', trader_publish_insert);
        const seq = trader_publish_insert.insertId;
        console.log('trader_publish_insert seq', seq);

        const message = {
            publisherId: seq,
            isNew: true
        };
        const resultNotification = await snsHandler.sendNotification(process.env.SNS_PUBLISH_ARN, message);
        console.log('resultNotification', resultNotification);

        return sendRes(res, 200, { result: true, seq: seq });

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

module.exports = { trader_nft_POST };
