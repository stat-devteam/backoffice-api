'use strict';

const dbPool = require('../modules/util_rds_pool.js');

const dbQuery = require('../resource/sql.json');


const bulk_linkCheck_POST = async(req, res) => {

    let memberIdList = [];
    for (let i in req.body.list) {
        memberIdList.push(req.body.list[i].memberId);
    }
    console.log('memberIdList', memberIdList);

    try {
        const pool = await dbPool.getPool();
        const [linkListResult, f1] = await pool.query(dbQuery.link_get_all_where_in.queryString, [memberIdList]);

        const linkIdList = [];
        for (let i in linkListResult) {
            linkIdList.push(linkListResult[i].mbr_id)
        }
        return sendRes(res, 200, { result: true, list: linkIdList })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
};


module.exports = { bulk_linkCheck_POST };
