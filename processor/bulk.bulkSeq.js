'use strict';

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');


const bulk_bulkSeq_GET = async(req, res) => {

    let bulkSequence = req.params.bulk_seq;

    let pageOffset = parseInt(req.query.pageOffset) || 0;
    let pageSize = parseInt(req.query.pageSize) || 10;
    let jobStatus = req.query.type;
    if (jobStatus === 'all') {
        jobStatus = ['ready', 'fetched', 'done', 'expired', 'invalid'];
    }

    try {
        const pool = await dbPool.getPool();
        const [bulkInfoResult, f1] = await pool.query(dbQuery.bulk_transfer_get.queryString, [bulkSequence]);
        const [bulkStatusCount, f2] = await pool.query(dbQuery.bulk_transfer_get_detail_status_count.queryString, [bulkSequence]);

        let statusInfo = {
            ready: 0,
            fetched: 0,
            done: 0,
            expired: 0,
            invalid: 0,
        }
        for (let i in bulkStatusCount) {
            statusInfo[bulkStatusCount[i].status] = bulkStatusCount[i].count
        }

        const [bulkListResult, f3] = await pool.query(dbQuery.bulk_transfer_get_detail_list.queryString, [bulkSequence, jobStatus, pageOffset, pageSize]);
        const [bulkListTotalResult, f4] = await pool.query(dbQuery.bulk_transfer_get_total_count_detail_list.queryString, [bulkSequence, jobStatus]);


        //bulkInfo 의 키값 순서대로 UI/UX가 만들어지기 때문에 룰 유지해주어야함.
        const bulkInfo = {
            bulk_seq: bulkInfoResult[0].bulk_seq,
            admin_id: bulkInfoResult[0].admin_id,
            svc_num: bulkInfoResult[0].svc_num,
            svc_name: bulkInfoResult[0].name,
            svc_mbr_grp_id: bulkInfoResult[0].mbr_grp_id,
            fixed_amount: bulkInfoResult[0].fixed_amount,
            total_count: bulkInfoResult[0].total_count,
            total_amount: bulkInfoResult[0].total_amount,
            link_check: bulkInfoResult[0].link_check,
            reg_dt: bulkInfoResult[0].reg_dt,
            reserve_dt: bulkInfoResult[0].reserve_dt,
            expire_dt: bulkInfoResult[0].expire_dt,
            bulk_memo: bulkInfoResult[0].memo,
            svc_desc: bulkInfoResult[0].description,
        }
        return sendRes(res, 200, {
            result: true,
            value: bulkInfo,
            list: bulkListResult,
            totalCount: bulkListTotalResult[0].total,
            statusInfo: statusInfo
        })
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


module.exports = { bulk_bulkSeq_GET };
