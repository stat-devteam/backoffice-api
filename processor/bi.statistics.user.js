'use strict';

var moment = require('moment-timezone');

const dbPool = require('../modules/util_rds_pool.js');

const dbQuery = require('../resource/sql.json');


const bi_statistics_user_GET = async(req, res) => {
    console.log('params', req.query);

    const now = moment(new Date()).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    const startDate = req.query.startDate || 0;
    const endDate = req.query.endDate || now;
    const memberGroupId = req.query.memberGroupId;
    const memberId = req.query.memberId;
    let transferType = req.query.transferType;
    if (transferType === 'all') {
        transferType = ['pay', 'rwd']
    }
    const optionType = req.query.optionType; //service_group, service
    const optionValue = req.query.optionValue;

    if (!memberGroupId || !memberId) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - 필수 정보' })
    }


    try {
        const pool = await dbPool.getRoPool();

        const [linkResult, f1] = await pool.query(dbQuery.check_link.queryString, [memberId, memberGroupId]);
        if (linkResult.length == 0) {
            let errorBody = {
                code: 1001,
                message: '[Shift] Link 정보가 없습니다.',
            };
            console.log('[400] - (1001) Link 정보가 없습니다.');
            console.log('linkResult', linkResult);
            return sendRes(res, 400, errorBody);
        }


        if (optionType === 'service' && optionValue) {
            const [getResult, f2] = await pool.query(dbQuery.transfer_bi_statistics_user_service_total.queryString, [memberGroupId, memberId, optionValue, transferType, startDate, endDate]);
            return sendRes(res, 200, { result: true, value: getResult[0] });
        }
        else if (optionType === 'service_group' && optionValue) {
            const serviceGroupIdsArray = optionValue.split(',');
            const [getResult, f2] = await pool.query(dbQuery.transfer_bi_statistics_user_service_group_total.queryString, [memberGroupId, memberId, serviceGroupIdsArray, transferType, startDate, endDate]);
            return sendRes(res, 200, { result: true, value: getResult[0] });
        }
        else {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 - 옵션 타입' });

        }



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


module.exports = { bi_statistics_user_GET };
