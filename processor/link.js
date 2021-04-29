'use strict';

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');


const link_DELETE = async(req, res) => {
    console.log('[link_DELETE]');

    let params = req.query;
    console.log('params', params);
    const memberId = params.memberId;
    const memberGroupId = params.memberGroupId;

    if (!params || !memberId || !memberGroupId) {
        return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인 memberId, memberGroupId' })
    }

    try {
        const pool = await dbPool.getPool();

        const [linkExistResult, f1] = await pool.query(dbQuery.link_check_registered.queryString, [memberId, memberGroupId]);
        //[중요] 삭제하는 원본 데이터의 기록을 남기기위한 로그
        console.log('[delete target] linkExistResult', linkExistResult)

        if (linkExistResult.length == 0) {
            let errorBody = {
                code: 1001,
                message: '[Shift] Link 정보가 없습니다.',
            };
            console.log('[400] - (1001) Link 정보가 없습니다.');
            console.log('linkExistResult', linkExistResult);
            return sendRes(res, 400, errorBody);
        }


        const [linkDeleteResult, f2] = await pool.query(dbQuery.link_delete.queryString, [memberId, memberGroupId]);
        console.log('linkDeleteResult', linkDeleteResult);
        const deletedLinkRows = linkDeleteResult.affectedRows;
        const [linkTempDeleteResult, f3] = await pool.query(dbQuery.link_temp_delete.queryString, [memberId, memberGroupId]);
        console.log('linkTempDeleteResult', linkTempDeleteResult);
        const deletedLinkTempRows = linkTempDeleteResult.affectedRows;

        return sendRes(res, 200, { result: true, deletedLinkRows: deletedLinkRows, deletedLinkTempRows: deletedLinkTempRows })


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

module.exports = { link_DELETE };
