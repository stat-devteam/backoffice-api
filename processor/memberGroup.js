'use strict';

const dbPool = require('../modules/util_rds_pool.js');

const dbQuery = require('../resource/sql.json');


const memberGroup_GET = async(req, res) => {

    try {
        const pool = await dbPool.getPool();
        const [memberGroupAllResult, f1] = await pool.query(dbQuery.member_group_get_all.queryString, []);
        return sendRes(res, 200, { result: true, list: memberGroupAllResult })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
};

module.exports = { memberGroup_GET };
