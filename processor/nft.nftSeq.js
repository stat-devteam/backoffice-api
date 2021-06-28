'use strict';

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');


const nft_nftSeq_GET = async(req, res) => {

    let bulkSequence = req.params.bulk_seq;

    try {
        const pool = await dbPool.getPool();
        const [bulkInfoResult, f1] = await pool.query(dbQuery.bulk_transfer_get.queryString, [bulkSequence]);
        const [bulkStatusCount, f2] = await pool.query(dbQuery.bulk_transfer_get_detail_status_count.queryString, [bulkSequence]);

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


module.exports = { nft_nftSeq_GET };
