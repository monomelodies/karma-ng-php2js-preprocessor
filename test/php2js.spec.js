
"use strict";

describe('preprocessors php2js', () => {
    let File, chai, createPreprocessor, expect, html2js, logger, process, templateHelpers;
    chai = require('chai');
    templateHelpers = require('./helpers/template_cache');
    chai.use(templateHelpers);
    expect = chai.expect;
    html2js = require('../lib/php2js');
    logger = {
        create: () => ({debug: () => {}})
    };
    process = null;
    File = function (path, mtime) {
        this.path = path;
        this.originalPath = path;
        this.contentPath = path;
        this.mtime = mtime;
        return this.isUrl = false;
    };

    createPreprocessor = config => {
        config = config || {};
        if (!config.cacheIdFromPath) {
            config.cacheIdFromPath = filepath => filepath.replace(/.*?\/file/, '').replace(/\.php$/, '.html');
        }
        return html2js(logger, '/base', config);
    };

    beforeEach(() => {
        process = createPreprocessor();
    });

    it('should convert php to js code', done => {
        let file;
        file = new File(__dirname + '/../file/file.php');
        process('', file, processedContent => {
            expect(processedContent).to.defineModule('/file.html').and.to.defineTemplateId('/file.html').and.to.haveContent(`<html>
    <body>
        Hi mum!
    </body>
</html>`);
            done();
        });
    });

    it('should change path to *.js', done => {
        let file;
        file = new File(__dirname + '/../file/file.php');
        process('', file, processedContent => {
            expect(file.path).to.match(/\.js$/);
            done();
        });
    });

    it('should not append *.js to a processed file\'s path more than once', done => {
        let file;
        file = new File(__dirname + '/../file/file.php');
        process('', file, processedContent => {
            process('', file, processedContent => {
                expect(file.path).to.match(/\.php\.js$/);
                done();
            });
        });
    });

    it('should preserve new lines', done => {
        let file;
        file = new File(__dirname + '/../file/newline1.php');
        process('first\nsecond', file, processedContent => {
            expect(processedContent).to.defineModule('/newline1.html').and.to.defineTemplateId('/newline1.html').and.to.haveContent('first\nsecond');
            return done();
        });
    });

    it('should strip Windows new lines', done => {
        let file;
        file = new File(__dirname + '/../file/newline2.php');
        process('first\r\nsecond', file, processedContent => {
            expect(processedContent).to.not.contain('\r');
            done();
        });
    });

    it('should preserve the backslash character', done => {
        let file;
        file = new File(__dirname + '/../file/backslash.php');
        process('first\\second', file, processedContent => {
            expect(processedContent).to.defineModule('/backslash.html').and.to.defineTemplateId('/backslash.html').and.to.haveContent('first\\second');
            done();
        });
    });

    // Options
    describe('stripPrefix', () => {
        beforeEach(() => {
            process = createPreprocessor({
                stripPrefix: __dirname,
                cacheIdFromPath: 'default'
            });
        });
        it('strips the given prefix from the file path', done => {
            let file;
            file = new File(__dirname + '/../file/file.php');
            process('', file, processedContent => {
                expect(processedContent).to.defineModule('/../file/file.html').and.to.defineTemplateId('/../file/file.html').and.to.haveContent(`<html>
    <body>
        Hi mum!
    </body>
</html>`);
                done();
            });
        });
    });
    describe('prependPrefix', () => {
        beforeEach(() => {
            process = createPreprocessor({
                prependPrefix: 'served',
                stripPrefix: __dirname,
                cacheIdFromPath: 'default'
            });
        });
        it('prepends the given prefix from the file path', done => {
            let file;
            file = new File(__dirname + '/../file/file.php');
            process('', file, processedContent => {
                expect(processedContent).to.defineModule('served/../file/file.html').and.to.defineTemplateId('served/../file/file.html').and.to.haveContent(`<html>
    <body>
        Hi mum!
    </body>
</html>`);
                done();
            });
        });
    });
    describe('stripSuffix', () => {
        beforeEach(() => {
            process = createPreprocessor({
                stripSuffix: '.php',
                stripPrefix: __dirname,
                cacheIdFromPath: 'default'
            });
        });
        it('strips the given suffix from the file path', done => {
            let file;
            file = new File(__dirname + '/../file/file.php');
            return process('', file, processedContent => {
                expect(processedContent).to.defineModule('/../file/file').and.to.defineTemplateId('/../file/file').and.to.haveContent(`<html>
    <body>
        Hi mum!
    </body>
</html>`);
                done();
            });
        });
    });
    describe('cacheIdFromPath', () => {
        beforeEach(() => {
            process = createPreprocessor({
                cacheIdFromPath: filePath => "generated_id_for" + filePath.replace(__dirname, '')
            });
        });
        it('invokes custom transform function', done => {
            let file;
            file = new File(__dirname + '/../file/file.php');
            process('', file, processedContent => {
                expect(processedContent).to.defineModule('generated_id_for/../file/file.php').and.to.defineTemplateId('generated_id_for/../file/file.php').and.to.haveContent(`<html>
    <body>
        Hi mum!
    </body>
</html>`);
                done();
            });
        });
    });
    describe('moduleName', () => {
        it('should generate code with a given module name', done => {
            let bothFilesContent, file1, file2;
            process = createPreprocessor({
                moduleName: 'foo'
            });
            file1 = new File(__dirname + '/../file/newline1.php');
            file2 = new File(__dirname + '/../file/newline2.php');
            bothFilesContent = '';
            process('', file1, processedContent => {
                bothFilesContent += processedContent;
                process('', file2, processedContent => {
                    bothFilesContent += processedContent;
                    expect(bothFilesContent).to.defineModule('foo').and.to.defineTemplateId('/newline1.html').and.to.defineTemplateId('/newline2.html');
                    done();
                });
            });
        });
        it('should generate code with multiple module names', done => {
            let file1, file2, file3, threeFilesContent;
            process = createPreprocessor({
                moduleName: htmlPath => htmlPath.match(/(\w+)\.html$/)[1]
            });
            file1 = new File(__dirname + '/../file/newline1.php');
            file2 = new File(__dirname + '/../file/newline2.php');
            file3 = new File(__dirname + '/../file/backslash.php');
            threeFilesContent = '';
            process('', file1, processedContent => {
                threeFilesContent += processedContent;
                process('', file2, processedContent => {
                    threeFilesContent += processedContent;
                    process('', file3, processedContent => {
                        threeFilesContent += processedContent;
                        expect(threeFilesContent).to.defineModule('newline1').and.to.defineTemplateId('/newline1.html').and.to.defineModule('newline2').and.to.defineTemplateId('/newline2.html').to.defineModule('backslash').and.to.defineTemplateId('/backslash.html');
                        done();
                    });
                });
            });
        });
    });
    describe('RequireJS', () => {
        it('should wrap module with require', done => {
            let file;
            process = createPreprocessor({
                enableRequireJs: true
            });
            file = new File(__dirname + '/../file/file.php');
            process('', file, processedContent => {
                expect(processedContent).to.requireModule('angular').to.defineModule('/file.html').to.defineTemplateId('/file.html');
                done();
            });
        });
        it('should use custom angular module ID', done => {
            let file;
            process = createPreprocessor({
                enableRequireJs: true,
                requireJsAngularId: 'foo'
            });
            file = new File(__dirname + '/../file/file.php');
            process('', file, processedContent => {
                expect(processedContent).to.requireModule('foo').to.defineModule('/file.html').to.defineTemplateId('/file.html');
                done();
            });
        });
    });
    describe('angular version 2', () => {
        it('should store the template in window.$templateCache', done => {
            let file;
            process = createPreprocessor({
                angular: 2
            });
            file = new File(__dirname + '/../file/file.php');
            return process('', file, processedContent => {
                expect(processedContent).to.defineAngular2TemplateId('/file.html');
                done();
            });
        });
    });
});

