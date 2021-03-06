'use strict';

const fs = require('hexo-fs');
const pathFn = require('path');
const oss = require('ali-oss');
const assert = require('assert');
const dotenv = require('dotenv').config();

describe('deployer', () => {
    const baseDir = pathFn.join(__dirname, '');
    const publicDir = pathFn.join(baseDir, 'public');
    const fakeRegion = process.env.OSS_REGION;
    const fakeBucket = process.env.OSS_BUCKET;
    const fakeAK = process.env.OSS_ACCESSKEYID;
    const fakeAS = process.env.OSS_ACCESSKEYSECRET;
    const fakeTimeout = process.env.OSS_TIMEOUT;

    const ctx = {
        public_dir: publicDir,
        log: {
            info: () => { },
            error: () => {}
        }
    };

    const deployer = require('../lib/deployer').bind(ctx);

    const client = new oss({
        region: process.env.OSS_REGION,
        accessKeyId: fakeAK,
        accessKeySecret: fakeAS,
        bucket: process.env.OSS_BUCKET,
        timeout: fakeTimeout
    });

    before(() => {
        return fs.mkdir(publicDir).then(() => {
            return fs.writeFile(pathFn.join(publicDir, 'index.html'), 'index.html');
        });
    });

    function validate() {
        return client.getObjectMeta('index.html').then(function (result) {
            assert.equal(result.status, 200);
            return result;
        }).catch(function (err) {
            console.log(err);
            throw err;
        });
    }   

    function validateSupportSubDirTrue() {
        return client.getBucketWebsite(fakeBucket).then(function (result) {
            assert.equal(result.supportSubDir, "true");
            return result;
        }).catch(function (err) {
            console.log(err);
            throw err;
        });
    }

    function validateSupportSubDirFalse() {
        return client.getBucketWebsite(fakeBucket).then(function (result) {
            assert.equal(result.supportSubDir, "false");
            return result;
        }).catch(function (err) {
            console.log(err);
            throw err;
        });
    }


    it('upload public/index.html', () => {
        return deployer({
            region: fakeRegion,
            bucket: fakeBucket,
            accessKeyId: fakeAK,
            accessKeySecret: fakeAS,
            timeout: fakeTimeout
        }).then(() => {
          return validate();
        });
      });
    
    it('put BucketWebsite supportSubDir true', () => {
        client.putBucketWebsite(fakeBucket, {
            index: 'index.html',
            error: 'error.html',
            supportSubDir: 'true'  // ali-oss 6.6.0+ support
        }).then(() => {
            return validateSupportSubDirTrue()
        })
    })

    it('put BucketWebsite supportSubDir false', () => {
        client.putBucketWebsite(fakeBucket, {
            index: 'index.html',
            error: 'error.html',
            supportSubDir: 'false'  // ali-oss 6.6.0+ support
        }).then(() => {
            return validateSupportSubDirFalse()
        })
    })

    after(() => {
        return fs.rmdir(publicDir).then(() => {
            return client.delete('index.html');
        });
    });
});