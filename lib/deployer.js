'use strict';

var pathFn = require('path'),
    fs = require('hexo-fs'),
    OSS = require('ali-oss').Wrapper,
    Promise = require('bluebird');

module.exports = function (args, callback) {
    if (!args.bucketName || !args.region || !args.accessKeyId || !args.accessKeySecret) {
        var help = [
            'You should argsure deployment settings in _config.yml first!',
            '',
            'Example:',
            '  deploy:',
            '    type: aliyun',
            '    bucket: yourBucketName',
            '    region: yourOSSregion',
            '    accessKeyId: yourAccessKeyId',
            '    accessKeySecret: yourAccessKeySecret',
            '',
            'For more help, you can check the docs: ' + 'http://hexo.io/docs/deployment.html'.underline + ' and ' + 'https://help.aliyun.com/document_detail/31867.html?spm=5176.doc31950.2.1.WMtDHS'.underline
        ];
        console.log(help.join('\n'));
        return callback();
    }

    var publicDir = this.public_dir,
        log = this.log,
        uploadFileList = [];

    var client = new OSS({
        region: args.region,
        accessKeyId: args.accessKeyId,
        accessKeySecret: args.accessKeySecret,
        bucket: args.bucket
    });

    log.info('Uploading files to Aliyun...');

    // get all files sync
    traverseFiles(publicDir, function (file) {
        uploadFileList.push({
            uploadPath: getUploadPath(file, pathFn.basename(publicDir)),
            file: file
        });
    });

    // upload
    return Promise.all(uploadFileList.map(function (item) {
        return client.put(item.uploadPath, item.file)
            .then(function (result) {
                log.info(result);
                return result;
            })
            .catch(function (err) {
                log.error(err);
                throw err;
            });
    }))
        .then(function () {
            return client.putBucketLogging('bucket-name', 'region', {
                index: 'index.html',
                error: 'error.html'
            });
        });
};

function traverseFiles(dir, handle) {
    var files = fs.listDirSync(dir);
    files.forEach(function (filePath) {
        var absPath = pathFn.join(dir, filePath),
            stat = fs.statSync(absPath);
        if (stat.isDirectory()) {
            traverseFiles(absPath, handle);
        } else {
            handle(absPath);
        }
    });
}

function getUploadPath(absPath, root) {
    var pathArr = absPath.split(pathFn.sep),
        rootIndex = pathArr.indexOf(root);
    pathArr = pathArr.slice(rootIndex + 1);
    return '/' + pathArr.join('/');
}