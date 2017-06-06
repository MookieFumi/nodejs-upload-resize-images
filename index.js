const fs = require("fs-extra");
const decompress = require('decompress');
const im = require('imagemagick');
const path = require('path');
const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(fileUpload());

app.get('/files', function (req, res) {
    var files = fs.readdirSync('images/big/');
    res.send({
        files: files
    })
});

app.post('/upload', function (req, res) {
    if (!req.files) {
        return res.status(400).send('No files were uploaded.');
    }

    const config = {
        uploadedFile: req.files.images,
        zipFile: 'tmp/images.zip',
        directories: {
            images: 'tmp/originals',
            thumbnails: 'images/thumbnail/',
            big: 'images/big/'
        }
    };

    const imagesService = {
        createFoldersStructure: function(){
            console.info('createFoldersStructure')
        },
        getUploadedImages: function () {
            console.info('getPreviousUploadedFiles')
            return new Promise(function (resolve, reject) {
                fs.readdir(config.directories.images, function (err, list) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(list);
                    }
                });
            });
        },
        removePreviousUploadedFiles: function (files) {
            console.info('removePreviousUploadedFiles')
            return new Promise(function (resolve, reject) {
                files.forEach(function (file) {
                    fs.remove(path.resolve(config.directories.images, file));
                });
                resolve();
            })
        },
        copyUploadedFile: function () {
            console.log('copyUploadedFile')
            return new Promise(function (resolve, reject) {
                config.uploadedFile.mv(config.zipFile);
                resolve();
            })
        },
        unzipUploadedFile: function () {
            console.log('unzipUploadedFile')
            return new Promise(function (resolve, reject) {
                resolve(decompress(config.zipFile, config.directories.images));
            })
        },
        removeUploadedFile: function () {
            console.log('removeUploadedFile')
            return new Promise(function (resolve, reject) {
                fs.remove(config.zipFile)
                resolve();
            })
        },
        transformImages: function (files) {
            console.log('transformImages')
            return new Promise(function (resolve, reject) {
                files.forEach(function (file) {
                    im.convert([config.directories.images + '/' + file.path, '-resize', '50x50', config.directories.thumbnails + file.path],
                        function (err, stdout) {
                            if (err) throw err;
                        });
                    im.convert([config.directories.images + '/' + file.path, '-resize', '600x600', config.directories.big + file.path],
                        function (err, stdout) {
                            if (err) throw err;
                        });
                });
                resolve();
            })
        }
    }

    imagesService.getUploadedImages(config)
        .then(imagesService.removePreviousUploadedFiles)
        .then(imagesService.copyUploadedFile)
        .then(imagesService.unzipUploadedFile)
        .then(imagesService.transformImages)
        .then(imagesService.removeUploadedFile)
        .then(function () {
            res.send('File uploaded. Processing images...')
        })
        .catch(function (err) {
            return res.status(500).send(err);
        });
});

app.listen(8080, function () {
    console.log('Listening on port 8080!');
});