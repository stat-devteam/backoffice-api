'use strict';

const BigNumber = require('bignumber.js');
var moment = require('moment-timezone');

const dbPool = require('../modules/util_rds_pool.js');

const dbQuery = require('../resource/sql.json');


const bulk_POST = async(req, res) => {
    console.log('[bulk_send]', req);

    if (!req.body.serviceNumber ||
        !req.body.memo ||
        !req.body.totalAmount ||
        !req.body.totalCount ||
        !req.body.memo ||
        !req.body.fixedAmount ||
        !req.body.adminId ||
        !req.body.list ||
        req.body.list.length === 0) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
    }

    const serviceNumber = req.body.serviceNumber;
    const memo = req.body.memo;
    const adminId = req.body.adminId;
    const fixedAmount = new BigNumber(req.body.fixedAmount).multipliedBy(new BigNumber(1e+18)).toString(10);
    const reserveTime = req.body.reserveTime || null;
    const expireTime = req.body.expireTime || null;
    const checkLink = req.body.checkLink ? 1 : 0;
    const totalAmount = new BigNumber(req.body.totalAmount).multipliedBy(new BigNumber(1e+18)).toString(10);
    const totalCount = req.body.totalCount;

    let memberIdList = [];
    for (let i in req.body.list) {
        memberIdList.push(req.body.list[i].memberId);
    }

    try {
        const pool = await dbPool.getPool();

        //[VALIDATION - HK Klaytn Account exist, service - membergroup match ]
        const [hkAccountResult, f1] = await pool.query(dbQuery.check_hk_klayton.queryString, [serviceNumber]);
        if (hkAccountResult.length === 0) {
            return sendRes(res, 400, { code: 1002, message: '[Shift] 해당 서비스의 한경 클레이튼 정보가 없습니다.', });
        }

        const [serviceResult, f2] = await pool.query(dbQuery.service_get.queryString, [serviceNumber]);
        if (serviceResult.length === 0) {
            return sendRes(res, 400, { code: 1017, message: '[Shift] 요청 받은 서비스가 존재하지 않습니다.' })
        }

        const memberGroupId = serviceResult[0].mbr_grp_id;
        console.log('memberGroupId', memberGroupId)

        //memberGroup Id check
        let memberIdList = [];
        for (let i in req.body.list) {
            memberIdList.push(req.body.list[i].memberId);
        }
        console.log('memberIdList', memberIdList);

        const [linkListResult, f3] = await pool.query(dbQuery.link_get_all_where_in.queryString, [memberIdList]);
        const [createBulktransfer, f4] = await pool.query(dbQuery.bulk_transfer_create.queryString, [serviceNumber, adminId, fixedAmount, totalCount, totalAmount, reserveTime, expireTime, checkLink, memo]);
        const bulkTransferSequence = createBulktransfer.insertId;

        let bulkValueList = [];

        for (let i in req.body.list) {
            //checkLink
            if (checkLink) {
                //Insert Reward Que
                const memberId = req.body.list[i].memberId
                const amount = fixedAmount === '0' ? req.body.list[i].amount : fixedAmount;
                const jobStatus = 'ready';
                const jobFetchedDate = null;
                const bigNumberAmount = fixedAmount === '0' ? new BigNumber(amount).multipliedBy(new BigNumber(1e+18)) : fixedAmount;
                const klay = bigNumberAmount.toString(10);
                const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');

                // svc_num, mbr_id, mbr_grp_id, amount, reg_dt, reserve_dt, expire_dt, job_status, job_fetched_dt, svc_callback_seq, svc_memo_seq, bulk_seq
                const bulkValue = [serviceNumber, memberId, memberGroupId, klay, now, reserveTime, expireTime, jobStatus, jobFetchedDate, null, null, bulkTransferSequence];
                bulkValueList.push(bulkValue);
            }
            else {
                //Insert Reward Que
                const memberId = req.body.list[i].memberId
                const amount = fixedAmount === '0' ? req.body.list[i].amount : fixedAmount;
                const jobStatus = 'ready';
                const jobFetchedDate = null;
                const bigNumberAmount = fixedAmount === '0' ? new BigNumber(amount).multipliedBy(new BigNumber(1e+18)) : fixedAmount;
                const klay = bigNumberAmount.toString(10);
                const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');

                // svc_num, mbr_id, mbr_grp_id, amount, reg_dt, reserve_dt, expire_dt, job_status, job_fetched_dt, svc_callback_seq, svc_memo_seq, bulk_seq
                const bulkValue = [serviceNumber, memberId, memberGroupId, klay, now, reserveTime, expireTime, jobStatus, jobFetchedDate, null, null, bulkTransferSequence];
                bulkValueList.push(bulkValue);
            }
        }

        console.log('bulkValueList', bulkValueList)
        if (bulkValueList.length === 0) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - 요청을 수행할 수 있는 row가 없습니다.' })
        }

        const [insertRewardQueResult, f5] = await pool.query(dbQuery.reward_que_insert_bulk.queryString, [bulkValueList]);

        console.log('insertRewardQueResult', insertRewardQueResult);
        console.log('insert reward row count : ', insertRewardQueResult.affectedRows)

        return sendRes(res, 200, { result: true, bulkTransferSequence: bulkTransferSequence, rewardAffectedRows: insertRewardQueResult.affectedRows });
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

module.exports = { bulk_POST };
