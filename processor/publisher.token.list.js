'use strict';

var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const publisher_token_list_GET = async(req, res) => {
    console.log('publisher_token_list_GET', req);
    let params = req.query;
    console.log('params', params);
    let publisherSeq = req.params.publisher_seq;
    let page_offset = parseInt(params.pageOffset) || 0;
    let page_size = parseInt(params.pageSize) || 10;

    try {
        const pool = await dbPool.getPool();
        const [publisherTokenResult, f1] = await pool.query(dbQuery.publisher_get_token_by_seq.queryString, [publisherSeq, page_offset, page_size]);
        const [publisherTokenCountResult, f2] = await pool.query(dbQuery.publisher_get_token_count_by_seq.queryString, [publisherSeq]);

        return sendRes(res, 200, { result: true, tokenList: publisherTokenResult, count: publisherTokenCountResult[0].count });
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 9000, message: 'ERROR', info: err.message })
    }
}

const sendRes = (res, status, body) => {
    return res.status(status).cors({
        exposeHeaders: 'maintenance',
        headers: 'pass',
    }).json(body);
};

module.exports = { publisher_token_list_GET };
