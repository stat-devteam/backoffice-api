'use strict';

var axios = require("axios").default;
var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const trader_nft_GET = async(req, res) => {
    console.log('trader_nft_GET', req); 
    let params = req.query;
    console.log('params', params);
    const memberGroupId = params.memberGroupId;
    const memberId = params.memberId;
    
    try {
        const pool = await dbPool.getPool();

        const nftCardInfoResult = await axios
                .get(process.env.NFT_CARD_INFO, {
                    params: {
                        memberId: memberId
                    }
                })
                .catch((err) => {
                    console.log('err', err);
                });
        console.log('nftCardInfoResult', nftCardInfoResult);
        
        if (!nftCardInfoResult) {
            return sendRes(res, 400, { code: 5000, message: "NFT Card Info 호출에 예외가 발생함." });
        }
        
        if (!nftCardInfoResult.data) {
            return sendRes(res, 400, { code: 5001, message: "NFT Card Info 정보가 없음." });
        }

        //1.check Link
        const [linkInfoResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);
        console.log('linkInfoResult', linkInfoResult);

        if (linkInfoResult.length === 0) {
            return sendRes(res, 400, { code: 1001, message: "Link가 연결되지 않음." })
        }

        const linkNum = linkInfoResult[0].link_num;
        //[TASK] Get summery 
        const [trader_sales_sum, f2] = await pool.query(dbQuery.trader_sales_sum.queryString, [linkNum]);
        console.log('trader_sales_sum', trader_sales_sum);

        var sales = 0;
        if (trader_sales_sum[0].sum_sales) {
            sales = parseInt(trader_sales_sum[0].sum_sales);
        }

        return sendRes(res, 200, { result: true, nftCardInfo: nftCardInfoResult.data, sales: sales });
        
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

module.exports = { trader_nft_GET };
