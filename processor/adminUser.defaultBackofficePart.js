"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');

const adminUser_defaultBackOfficePart_GET = async(req, res) => {

    try {
        const pool = await dbPool.getPool();
        const [bakcofficePartResult, f1] = await pool.query(dbQuery.backoffice_part_get.queryString, []);

        return sendRes(res, 200, {
            result: true,
            list: bakcofficePartResult,
        })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }

}



const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
    };

module.exports = { adminUser_defaultBackOfficePart_GET, };
