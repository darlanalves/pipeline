/* jshint node: true */
module.exports = function(config) {
    'use strict';

    var babelOptions = require(__dirname + '/babel-options.js');

    config.set({
        browsers: ['PhantomJS'],
        frameworks: ['jasmine'],
        files: [
            'promise.min.js',
            'src/*.js',
            'test/*.spec.js'
        ],
        preprocessors: {
            'src/*.js': ['babel'],
            'test/*.js': ['babel']
        },
        babelPreprocessor: {
            options: babelOptions
        }
    });
};
