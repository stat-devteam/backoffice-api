"use strict";

const api = require('lambda-api')();
const smHandler = require("../modules/util_sm.js");
const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
const jwt_decode = require("jwt-decode");
const psHandler = require('../modules/util_ps.js');
const testProcessor = require('../processor/test.js');
const bulkBulkSeqProcessor = require('../processor/bulk.bulkSeq.js');
const bulkProcessor = require('../processor/bulk.js');
const bulkLinkCheckProcessor = require('../processor/bulk.link-check.js');
const bulkListProcessor = require('../processor/bulk.list.js');
const kasAccountIdProcessor = require('../processor/kas.accountId.js');
const kasProcessor = require('../processor/kas.js');
const kasSendProcessor = require("../processor/kas.send.js");
const kasTransferListProcessor = require("../processor/kas.transferList.js");
const linkProcessor = require('../processor/link.js');
const linkListProcessor = require('../processor/link.list.js');
const memberGroupProcessor = require('../processor/memberGroup.js');
const rewardListProcessor = require('../processor/reward.list.js');
const serviceProcessor = require('../processor/service.js');
const serviceSvcNumProcessor = require('../processor/service.svcNum.js');
const serviceGroupProcessor = require('../processor/serviceGroup.js');
const serviceGroupSvcGrpIdApikeyRefreshProcessor = require('../processor/serviceGroup.svcGrpId.apikeyRefresh.js');
const serviceGroupSvcGrpIdProcessor = require('../processor/serviceGroup.svcGrpId.js');
const serviceGroupSvcGrpIdPendingApikeyProcessor = require('../processor/serviceGroup.svcGrpId.pendingApikey.js');
const transferListProcessor = require('../processor/transfer.list.js');
const adminUserAdminUserIdProcessor = require('../processor/adminUser.adminUserId.js');
const adminUserProcessor = require('../processor/adminUser.js');
const adminUserDefaultPartProcessor = require("../processor/adminUser.defaultBackofficePart.js");
const actionLogProcessor = require("../processor/actionLog.js");
const biStatisticsUserProcessor = require("../processor/bi.statistics.user.js");
const biStatisticsTransferProcessor = require("../processor/bi.statistics.transfer.js");
const biStatisticsLinkProcessor = require("../processor/bi.statistics.link.js");
const biStatisticsNftProcessor = require("../processor/bi.statistics.nft.js");
const accountingProcessor = require("../processor/accounting.js");
const nftListProcessor = require("../processor/nft.list.js");
const nftNftSeqProcessor = require("../processor/nft.nftSeq.js");
// nft toekn (new)
const nftTokenListProcessor = require("../processor/nftToken.list.js");
// publisher (new)
const publisherListProcessor = require("../processor/publisher.list.js");
const publisherGetProcessor = require("../processor/publisher.get.js");
const publisherTokenListProcessor = require("../processor/publisher.token.list.js");
// fee stat (new)
const feeStatListProcessor = require("../processor/fee.stat.list.js");
// trader nft (new)
const traderNftGetProcessor = require("../processor/trader.nft.get.js");
const traderNftListGetProcessor = require("../processor/trader.nft.list.js");
const traderNftPostProcessor = require("../processor/trader.nft.post.js");
const traderNftDeleteProcessor = require("../processor/trader.nft.delete.js");

api.use(['/admin/*'], async(req, res, next) => {
    console.log('Maintenance - ParameterStore Check res', res);
    console.log('Maintenance - ParameterStore Check req', req);
    const pass = req.query.pass;
    const isMaintenance = await psHandler.getParameterStoreValue(process.env.PARAMETER_STORE_VALUE, 'backoffice', pass);
    console.log('isMaintenance', isMaintenance)
    if (isMaintenance) {
        res.header('maintenance', isMaintenance);
    }
    else {
        res.header('maintenance', '');
    }
    next();
});


api.use(['/admin/*'], async(req, res, next) => {
    console.log('Action Log Middleware')
    console.log('req', req);
    const headerToken = req.headers.authorization;
    const method = req.method;
    const path = req.path;
    const search = req.query;
    const body = req.body;
    const params = req.params;
    var decodedToken = jwt_decode(headerToken);
    const userName = decodedToken['cognito:username'];

    const data = {
        search: search,
        body: body,
        params: params,
    }
    const methodArray = ['PUT', 'POST', 'DELETE'];

    if (methodArray.includes(method)) {
        console.log('request insert');
        const pool = await dbPool.getPool();
        try {
            const [actionLogInsertResult, f1] = await pool.query(dbQuery.admin_action_log_insert.queryString, [userName, method, path, JSON.stringify(data)]);
        }
        catch (err) {
            console.log('insert error!', err);
        }
    }

    next();
});

api.use(['/admin/*', '/clearCache'], (req, res, next) => {
    console.log(req.coldStart, req.requestCount, req.ip, req.method, req.path, req);
    next();
});


api.finally((req, res) => {
    console.log("api.finally");
});

api.get('/clearCache', async(req, res) => {
    console.log('clearCache', req);
    smHandler.clearCache();
    psHandler.clearCache();
    let body = { result: true };
    return res.status(200).cors().json(body);
});


api.get('/admin/test', testProcessor.test_GET);
//bulk
api.get('/admin/bulk/:bulk_seq', bulkBulkSeqProcessor.bulk_bulkSeq_GET);
api.post('/admin/bulk', bulkProcessor.bulk_POST);
api.post('/admin/bulk/link-check', bulkLinkCheckProcessor.bulk_linkCheck_POST);
api.get('/admin/bulk/list', bulkListProcessor.bulk_list_GET);
//kas
api.get('/admin/kas/:account_id', kasAccountIdProcessor.kas_accountId_GET);
api.put('/admin/kas/:account_id', kasAccountIdProcessor.kas_accountId_PUT);
api.delete('/admin/kas/:account_id', kasAccountIdProcessor.kas_accountId_DELETE);
api.get('/admin/kas', kasProcessor.kas_GET);
api.post('/admin/kas', kasProcessor.kas_POST);
api.post('/admin/kas/send', kasSendProcessor.kas_send_POST);
api.get('/admin/kas/transfer_list', kasTransferListProcessor.kas_transferList_GET);
//link
api.delete('/admin/link', linkProcessor.link_DELETE);
api.get('/admin/link/list', linkListProcessor.link_list_GET);
//member-group
api.get('/admin/member-group', memberGroupProcessor.memberGroup_GET);
//reward
api.get('/admin/reward/list', rewardListProcessor.reward_list_GET);
//service
api.get('/admin/service ', serviceProcessor.service_GET);
api.post('/admin/service', serviceProcessor.service_POST);
api.get('/admin/service/:svc_num', serviceSvcNumProcessor.service_SvcNum_GET);
api.put('/admin/service/:svc_num', serviceSvcNumProcessor.service_SvcNum_PUT);
api.delete('/admin/service/:svc_num', serviceSvcNumProcessor.service_SvcNum_DELETE);
//service-group
api.get('/admin/service-group', serviceGroupProcessor.serviceGroup_GET);
api.post('/admin/service-group', serviceGroupProcessor.serviceGroup_POST);
api.put('/admin/service-group/:svc_grp_id/apikey-refresh', serviceGroupSvcGrpIdApikeyRefreshProcessor.serviceGroup_svcGrpId_apikeyRefresh_PUT);
api.get('/admin/service-group/:svc_grp_id', serviceGroupSvcGrpIdProcessor.serviceGroup_svcGrpId_GET);
api.put('/admin/service-group/:svc_grp_id', serviceGroupSvcGrpIdProcessor.serviceGroup_svcGrpId_PUT);
api.delete('/admin/service-group/:svc_grp_id', serviceGroupSvcGrpIdProcessor.serviceGroup_svcGrpId_DELETE);
api.delete('/admin/service-group/:svc_grp_id/pending-apikey', serviceGroupSvcGrpIdPendingApikeyProcessor.serviceGroup_svcGrpId_pendingApikey_DELETE);
//transfer
api.get('/admin/transfer/list', transferListProcessor.transfer_list_GET);
//adminUser
api.get('/admin/admin-user', adminUserProcessor.adminUser_GET);
api.post('/admin/admin-user', adminUserProcessor.adminUser_POST);
api.get('/admin/admin-user/:admin_user_id', adminUserAdminUserIdProcessor.adminUser_adminUserId_GET);
api.put('/admin/admin-user/:admin_user_id', adminUserAdminUserIdProcessor.adminUser_adminUserId_PUT);
api.delete('/admin/admin-user/:admin_user_id', adminUserAdminUserIdProcessor.adminUser_adminUserId_DELETE);
api.get('/admin/admin-user/default-backoffice-part', adminUserDefaultPartProcessor.adminUser_defaultBackOfficePart_GET);
// //system
api.get('/admin/system/action_log', actionLogProcessor.actionLog_GET);
//bi
api.get('/admin/bi/statistics/user', biStatisticsUserProcessor.bi_statistics_user_GET);
api.get('/admin/bi/statistics/transfer', biStatisticsTransferProcessor.bi_statistics_transfer_GET);
api.get('/admin/bi/statistics/link', biStatisticsLinkProcessor.bi_statistics_link_GET);
api.get('/admin/bi/statistics/nft', biStatisticsNftProcessor.bi_statistics_nft_GET);
//accounting
api.get('/admin/accounting', accountingProcessor.accounting_GET);
//nft
api.get('/admin/nft/list', nftListProcessor.nft_list_GET);
api.get('/admin/nft/:nft_seq', nftNftSeqProcessor.nft_nftSeq_GET);
//nft token (new)
api.get('/admin/nft-token/list', nftTokenListProcessor.nftToken_list_GET);
// publisher (new)
api.get('/admin/publihser/list', publisherListProcessor.publisher_list_GET);
api.get('/admin/publihser/:publisher_seq', publisherGetProcessor.publisher_GET);
api.get('/admin/publihser/:publisher_seq/nft-token', publisherTokenListProcessor.publisher_token_list_GET);
// fee stat (new)
api.get('/admin/fee/stat', feeStatListProcessor.fee_stat_list_GET);
// trader nft (new)
api.get('/admin/trader/nft', traderNftGetProcessor.trader_nft_GET);
api.get('/admin/trader/nft/list', traderNftListGetProcessor.trader_nft_list_GET);
api.post('/admin/trader/nft', traderNftPostProcessor.trader_nft_POST);
api.get('/admin/trader/nft/cancel', traderNftDeleteProcessor.trader_nft_DELETE);

exports.handler = async(event, context, callback) => {
    const type = event.type;
    if (type === 'alive-check') {
        console.log('[Alive-Check]')
        return;
    }
    else {
        context.callbackWaitsForEmptyEventLoop = false;
        return await api.run(event, context);
    }
};
