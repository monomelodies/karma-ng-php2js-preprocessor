
"use strict";

const util = require('util');
const exec = require('child_process').exec;

const TEMPLATE = `angular.module('%s', []).run(['$templateCache', function($templateCache) {
    $templateCache.put('%s',\n    '%s');
}]);
`;

const SINGLE_MODULE_TPL = `(function(module) {
    try {
        module = angular.module('%s');
    } catch (e) {
        module = angular.module('%s', []);
    }
    module.run(['$templateCache', function($templateCache) {
        $templateCache.put('%s', '%s');
    }]);
})();
`;

const REQUIRE_MODULE_TPL = 'require([\'%s\'], function(angular) {%s});\n';

const ANGULAR2_TPL = `window.$templateCache = window.$templateCache || {};
window.$templateCache['%s'] = '%s';
`;

function escapeContent(content) {
    return content.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, "\\n' +\n    '");
}

function createPhp2JsPreprocessor(logger, basePath, config) {
    config = typeof config === 'object' ? config : {}
    let log = logger.create('preprocessor.html2js');
    const getModuleName = typeof config.moduleName === 'function' ? config.moduleName : () => config.moduleName;
    let stripPrefix = new RegExp('^' + (config.stripPrefix || ''));
    let prependPrefix = config.prependPrefix || '';
    let stripSuffix = new RegExp((config.stripSuffix || config.stripSuffix || '') + '$');
    let cacheIdFromPath = undefined;
    let phpBin = config.phpBin ? config.phpBin : '/usr/bin/php';
    if (config.cacheIdFromPath && config.cacheIdFromPath != 'default') {
        cacheIdFromPath = config.cacheIdFromPath;
    } else {
        cacheIdFromPath = filepath => prependPrefix + filepath.replace(stripPrefix, '').replace(stripSuffix, '').replace(/\.php$/, '.html');
    }
    let enableRequireJs = config.enableRequireJs;
    let requireJsAngularId = config.requireJsAngularId || 'angular';
    let angular = config.angular || 1;
    return function (content, file, done) {
        log.debug('Executing "%s".', file.originalPath);
        exec(phpBin + ' ' + file.originalPath, (err, stdout, stderr) => {
            log.debug('Processing "%s".', file.originalPath);
            
            let originalPath = file.originalPath.replace(basePath + '/', '');
            let htmlPath = cacheIdFromPath(originalPath);
            let moduleName = getModuleName(htmlPath, originalPath);
            
            if (!/\.js$/.test(file.path)) {
                file.path = file.path + '.js'
            }
            let tpl = '';
            if (angular === 2 || angular === '2') {
                tpl = util.format(ANGULAR2_TPL, htmlPath, escapeContent(stdout));
            } else {
                if (moduleName) {
                    tpl = util.format(SINGLE_MODULE_TPL, moduleName, moduleName, htmlPath, escapeContent(stdout));
                } else {
                    tpl = util.format(TEMPLATE, htmlPath, htmlPath, escapeContent(stdout));
                }
                
                if (enableRequireJs) {
                    tpl = util.format(REQUIRE_MODULE_TPL, requireJsAngularId, tpl);
                }
            }
            done(tpl);
        });
    };
}

createPhp2JsPreprocessor.$inject = ['logger', 'config.basePath', 'config.ngPhp2JsPreprocessor'];

module.exports = createPhp2JsPreprocessor;

