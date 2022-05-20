'use strict';

var axios = require("axios").default;
var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const trader_nft_list_GET = async(req, res) => {
    console.log('trader_nft_list_GET', req); 
    let params = req.query;
    console.log('params', params);
    const memberGroupId = params.memberGroupId;
    const memberId = params.memberId;
    const pageOffset = parseInt(params.pageOffset) || 0;
    const pageSize = parseInt(params.pageSize) || 10;

    try {
        const pool = await dbPool.getPool();

        if (!params) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Parameter Missing' });
        }

        if (!params.memberId || !params.memberGroupId) {
            return sendRes(res, 400, { code: 1101, message: '[Shift] Parameter Missing Check' });
        }

        //1.check Link
        const [linkInfoResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);
        console.log('linkInfoResult', linkInfoResult);

        if (linkInfoResult.length === 0) {
            return sendRes(res, 400, { code: 1001, message: "Link가 연결되지 않음." })
        }

        const linkNum = linkInfoResult[0].link_num;

        //[TASK] Get offset list
        const [trader_publish_list, f2] = await pool.query(dbQuery.trader_publish_list.queryString, [linkNum, pageOffset, pageSize]);
        console.log('trader_publish_list', trader_publish_list);

        //[TASK] Get summery 
        const [trader_publish_list_count, f3] = await pool.query(dbQuery.trader_publish_list_count.queryString, [linkNum]);
        console.log('trader_publish_list_count', trader_publish_list_count);

        return sendRes(res, 200, { result: true, list: trader_publish_list, count: trader_publish_list_count[0].count });

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message });
    }
    
}

const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};

module.exports = { trader_nft_list_GET };
