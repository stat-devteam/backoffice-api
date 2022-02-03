'use strict';

var moment = require('moment-timezone');
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const publisher_GET = async(req, res) => {
    console.log('publisher_GET', req);
    let params = req.query;
    console.log('params', params);
    
    let publisherSeq = req.params.publisher_seq;

    try {
        const pool = await dbPool.getPool();
        const [publisherResult, f1] = await pool.query(dbQuery.publisher_get_by_seq.queryString, [publisherSeq]);

        return sendRes(res, 200, { result: true, publisher: publisherResult[0] });
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

module.exports = { publisher_GET };
