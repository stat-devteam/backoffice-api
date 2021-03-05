"use strict";

const dbPool = require('../modules/util_rds_pool.js');
const dbQuery = require('../resource/sql.json');
var AWS = require('aws-sdk');

const adminUser_GET = async(req, res) => {

    try {
        const pool = await dbPool.getPool();
        const [adminUserAllResult, f1] = await pool.query(dbQuery.admin_get_all.queryString, []);

        return sendRes(res, 200, {
            result: true,
            list: adminUserAllResult,
        })
    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }

}


const adminUser_POST = async(req, res) => {

    try {
        const pool = await dbPool.getPool();

        const body = req.body;
        console.log('body', body);
        if (!body || !body.attributes || !body.auth || !body.serviceGroup) {
            return sendRes(res, 400, { code: 3000, message: 'ERROR', info: '요청 파라미터 확인' })
        }

        const attributes = body.attributes;
        const auth = body.auth; // auth data array
        const serviceGroup = body.serviceGroup; // string

        const email = attributes.email;
        const name = attributes.name;
        const company = attributes.company;

        const tempPassword = generatePassword();
        console.log('tempPassword', tempPassword)
        var createParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: email,
            DesiredDeliveryMediums: ["EMAIL"],
            TemporaryPassword: tempPassword,
            UserAttributes: [{
                    Name: "email",
                    Value: email,
                },
                {
                    Name: "email_verified",
                    Value: "true"
                },
                {
                    Name: "name",
                    Value: name
                },
                {
                    Name: "custom:company",
                    Value: company
                }
            ],
        };
        var cognitoServiceProvider = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });
        const createUserResult = await cognitoServiceProvider.adminCreateUser(createParams).promise().then(res => {
            console.log('res work', res)
            return res;
        }, err => {
            console.log('err work', err)
            return { error: err }
        })
        if (createUserResult.error) {
            console.log('congitoUserList error', createUserResult.error)
            return sendRes(res, 400, { code: 2021, message: createUserResult.error.message })
        }

        console.log('createUserResult', createUserResult.User)


        // SQL INSERT USER Table

        const adminId = createUserResult.User.Username;

        //1. insert admin table
        const [insertAdminResult, f1] = await pool.query(dbQuery.admin_insert.queryString, [adminId, email, name, company]);


        //2. insert admin_backoffice_part_auth

        let backoffice_part_auth_list = [];

        for (let i in auth) {
            backoffice_part_auth_list.push([adminId, auth[i].auth_type, auth[i].part_seq]);
        }
        console.log('backoffice_part_auth_list', backoffice_part_auth_list)
        const [insertAdminBackofficePartAuthResult, f2] = await pool.query(dbQuery.admin_backoffice_part_auth_insert.queryString, [backoffice_part_auth_list]);

        //3. insert admin_service_group_auth
        const [insertAdminServiceGroupAuthResult, f3] = await pool.query(dbQuery.admin_service_group_auth_insert.queryString, [adminId, serviceGroup]);

        return sendRes(res, 200, {
            result: true,
            userInfo: createUserResult.User
        })


    }
    catch (err) {
        console.log(err);
        return sendRes(res, 400, { code: 2011, message: 'ERROR', info: err.message })
    }
}

const generatePassword = () => {
    var charLength = 4,
        charset = "abcdefghijklmnopqrstuvwxyz",
        retVal = "";
    for (var i = 0, n = charset.length; i < charLength; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    var numberLength = 4,
        numset = "0123456789";
    for (var i = 0, n = numset.length; i < numberLength; ++i) {
        retVal += numset.charAt(Math.floor(Math.random() * n));
    }
    var specialLength = 4,
        specialset = "!@#$%^&*()";
    for (var i = 0, n = specialset.length; i < specialLength; ++i) {
        retVal += specialset.charAt(Math.floor(Math.random() * n));
    }

    return retVal;
}


const sendRes = (res, status, body) => {
    return res.status(status).cors().json(body);
    };

module.exports = { adminUser_GET, adminUser_POST };
