"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
var AWS = require('aws-sdk');

const adminUser_adminUserId_GET = async(req, res) => {

    try {
        const pool = await dbPool.getPool();


        let adminUserId = req.params.admin_user_id;
        console.log('req.params.admin_user_id', adminUserId)


        const [adminUserDetailResult, f1] = await pool.query(dbQuery.admin_get_by_admin_id.queryString, [adminUserId]);
        const [adminBackofficePartAuthDetailResult, f2] = await pool.query(dbQuery.admin_backoffice_part_auth_get_by_admin_id.queryString, [adminUserId]);
        const [adminServiceGroupAuthDetailResult, f3] = await pool.query(dbQuery.admin_service_group_auth_get_by_admin_id.queryString, [adminUserId]);
        console.log('adminUserDetailResult', adminUserDetailResult)
        console.log('adminBackofficePartAuthDetailResult', adminBackofficePartAuthDetailResult)
        console.log('adminServiceGroupAuthDetailResult', adminServiceGroupAuthDetailResult)

        //get use auth service list
        // all case
        let serviceGorupList = [];
        if (adminServiceGroupAuthDetailResult[0].auth_list === 'all') {
            console.log('CALL GET ALL')
            const [serviceGroupAllResult, f4] = await pool.query(dbQuery.service_group_get_all.queryString, []);

            for (let i in serviceGroupAllResult) {
                serviceGorupList.push(serviceGroupAllResult[i].svc_grp_id)
            }
        }
        else {
            serviceGorupList = adminServiceGroupAuthDetailResult[0].auth_list.split(',');
        }
        const [serviceListResult, f5] = await pool.query(dbQuery.service_list_by_group_ids.queryString, [serviceGorupList]);
        console.log('serviceListResult', serviceListResult)


        if (adminUserDetailResult.length === 0 || adminBackofficePartAuthDetailResult.length === 0 || adminServiceGroupAuthDetailResult.length === 0 || serviceListResult.length === 0) {
            return sendRes(res, 400, { result: false });
        }

        return sendRes(res, 200, {
            result: true,
            userInfo: adminUserDetailResult[0],
            backofficePartAuth: adminBackofficePartAuthDetailResult,
            serviceGroupAuth: adminServiceGroupAuthDetailResult[0],
            serviceListAuth: serviceListResult,
        })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }

}


const adminUser_adminUserId_PUT = async(req, res) => {

    try {
        const pool = await dbPool.getPool();


        let adminUserId = req.params.admin_user_id;
        console.log('req.params.admin_user_id', adminUserId)


        const body = req.body;
        console.log('body', body);
        if (!body || !body.attributes || !body.auth || !body.serviceGroup) {
            return sendRes(res, 400, { code: 3000, message: '요청 파라미터 확인' })
        }

        const attributes = body.attributes;
        const auth = body.auth; // auth data array
        const serviceGroup = body.serviceGroup; // string
        const name = attributes.name;
        const company = attributes.company;

        const [updateAdminResult, f1] = await pool.query(dbQuery.admin_update.queryString, [name, company, adminUserId]);
        const [updateAdminServiceGroupAuthResult, f2] = await pool.query(dbQuery.admin_service_group_auth_update.queryString, [serviceGroup, adminUserId]);
        const [deleteAdminBackofficePartAuthResult, f3] = await pool.query(dbQuery.admin_backoffice_part_auth_delete_by_admin_id.queryString, [adminUserId]);
        console.log('updateAdminResult', updateAdminResult)
        console.log('updateAdminServiceGroupAuthResult', updateAdminServiceGroupAuthResult)
        console.log('deleteAdminBackofficePartAuthResult', deleteAdminBackofficePartAuthResult)

        let backoffice_part_auth_list = [];

        for (let i in auth) {
            backoffice_part_auth_list.push([adminUserId, auth[i].auth_type, auth[i].part_seq]);
        }
        console.log('backoffice_part_auth_list', backoffice_part_auth_list)
        const [insertAdminBackofficePartAuthResult, f4] = await pool.query(dbQuery.admin_backoffice_part_auth_insert.queryString, [backoffice_part_auth_list]);

        return sendRes(res, 200, {
            result: true,
            attributes: attributes,
            auth: auth,
            serviceGroup: serviceGroup
        })

    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}


const adminUser_adminUserId_DELETE = async(req, res) => {

    try {
        const pool = await dbPool.getPool();

        let adminUserId = req.params.admin_user_id;
        console.log('req.params.admin_user_id', adminUserId)

        // 1. delete cognito
        var cognitoParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: adminUserId,
        };

        var cognitoServiceProvider = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });

        const deleteUserResult = await cognitoServiceProvider.adminDeleteUser(cognitoParams).promise().then(res => {
            console.log('res work', res)
            return res;
        }, err => {
            console.log('err work', err)
            return { error: err }
        })
        if (deleteUserResult.error) {
            console.log('deleteUserResult error', deleteUserResult.error)
            return sendRes(res, 400, { code: 2021, message: 'ERROR', message: deleteUserResult.error.message })
        }

        const [deleteAdminResult, f1] = await pool.query(dbQuery.admin_delete_by_admin_id.queryString, [adminUserId]);
        const [deleteAdminBackofficePartAuthResult, f2] = await pool.query(dbQuery.admin_backoffice_part_auth_delete_by_admin_id.queryString, [adminUserId]);
        const [deleteAdminServiceGroupAuthResult, f3] = await pool.query(dbQuery.admin_service_group_auth_delete_by_admin_id.queryString, [adminUserId]);
        console.log('deleteAdminResult', deleteAdminResult)
        console.log('deleteAdminBackofficePartAuthResult', deleteAdminBackofficePartAuthResult)
        console.log('deleteAdminServiceGroupAuthResult', deleteAdminServiceGroupAuthResult)

        return sendRes(res, 200, {
            result: true,
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

module.exports = { adminUser_adminUserId_GET, adminUser_adminUserId_PUT, adminUser_adminUserId_DELETE };
