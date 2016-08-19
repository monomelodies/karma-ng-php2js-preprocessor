var util = require('util');
var exec = require('child_process').exec;

var TEMPLATE = "angular.module('%s', []).run(['$templateCache', function($templateCache) {\
    $templateCache.put('%s',\n    '%s');\
}]);\
";

var SINGLE_MODULE_TPL = "(function(module) {\
    try {\
        module = angular.module('%s');\
    } catch (e) {\
        module = angular.module('%s', []);\
    }\
    module.run(['$templateCache', function($templateCache) {\
        $templateCache.put('%s', '%s');\
    }]);\
})();\
";

var REQUIRE_MODULE_TPL = 'require([\'%s\'], function(angular) {%s});\n';

var ANGULAR2_TPL = "window.$templateCache = window.$templateCache || {};\
window.$templateCache['%s'] = '%s';\
";

/**
 * Helper to escape HTML content for inclusion in Javascript string.
 *
 * @param string content Unescaped content
 * @return string Escaped content
 */
function escapeContent(content) {
    return content.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, "\\n' +\n    '");
}

/**
 * Main "constructor" method.
 *
 * @param Logger logger Karma preprocessor logger
 * @param string basePath The base path for the file processed
 * @param object config Config object
 * @return function Processor function
 */
function createPhp2JsPreprocessor(logger, basePath, config) {
    config = typeof config === 'object' ? config : {}
    var log = logger.create('preprocessor.html2js');
    var getModuleName = typeof config.moduleName === 'function' ? config.moduleName : function() { return config.moduleName; }
    var stripPrefix = new RegExp('^' + (config.stripPrefix || ''));
    var prependPrefix = config.prependPrefix || '';
    var stripSuffix = new RegExp((config.stripSuffix || config.stripSuffix || '') + '$');
    var cacheIdFromPath = undefined;
    var phpBin = config.phpBin ? config.phpBin : '/usr/bin/php';
    if (config.cacheIdFromPath && config.cacheIdFromPath != 'default') {
        cacheIdFromPath = config.cacheIdFromPath;
    } else {
        cacheIdFromPath = function(filepath){ return prependPrefix + filepath.replace(stripPrefix, '').replace(stripSuffix, '').replace(/\.php$/, '.html');}
    }
    var enableRequireJs = config.enableRequireJs;
    var requireJsAngularId = config.requireJsAngularId || 'angular';
    var angular = config.angular || 1;
    return function (content, file, done) {
        log.debug('Executing "%s".', file.originalPath);
        exec(phpBin + ' ' + file.originalPath, function(err, stdout, stderr) {
            log.debug('Processing "%s".', file.originalPath);
            
            if (err) {
                console.log('Err:', err);
            }
            var originalPath = file.originalPath.replace(basePath + '/', '');
            var htmlPath = cacheIdFromPath(originalPath);
            var moduleName = getModuleName(htmlPath, originalPath);
            
            if (!/\.js$/.test(file.path)) {
                file.path = file.path + '.js'
            }
            var tpl = '';
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

