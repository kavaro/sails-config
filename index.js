/**
 * Created by karl on 23/08/14.
 */

var extend = require('node.extend');
var path = require('path');
var fs = require('fs');
var is = require('is');
var sh = require('shelljs');
var pkginfo = require('pkginfo');

var installs = [];
var uninstalls = [];

module.exports = function (localModule, localRequire) {
    var app = pkginfo.read(localModule);
    var setup = {
        cwd: path.dirname(app.dir),
        pkg: app.package
    };

    // iterate all modules, module can be:
    //  - [string]: string is name of module, all modules use the same options
    //  - { module: {} }: key = module name, value = options object
    //  - string: name of module
    function eachModule(module, options, fn) {
        if (is.array(module)) {
            module.forEach(function (module) {
                fn(module, options);
            });
        } else if (is.object(module)) {
            Object.keys(module).forEach(function (name) {
                fn(name, module[name]);
            });
        } else {
            fn(module, options);
        }
    }

    // the locals object that will be configured
    setup.local = {};

    // common default options for npm install, npm update and npm uninstall
    setup.npmOptions = function (module) {
        return {
            save: '--save',
            update: false,
            uninstall: false,
            name: module.split('@')[0],
            cwd: setup.cwd
        }
    };

    // execute command line apps silently or not
    setup.execSilent = false;

    // called to log messages to the screen
    setup.log = function () {
    };

    // get the environment, allows to customize how the environment is determined
    setup.env = function () {
        return process.env.NODE_ENV || 'development';
    };

    setup.port = function() {
        return process.env.PORT || 1337;
    };

    setup.ssl = function() {
        var sslPath = path.join(setup.cwd, 'config', 'ssl');
        if (sh.test('-d', sslPath)) {
            return {
                ca: fs.readFileSync(path.join(sslPath, 'gd_bundle.crt')),
                key: fs.readFileSync(path.join(sslPath, 'ssl.key')),
                cert: fs.readFileSync(path.join(sslPath, 'ssl.crt'))
            };
        }
        return null;
    };

    // called to execute app
    setup.exec = function (command) {
        sh.pushd(setup.cwd);
        var result = sh.exec(command, { silent: setup.execSilent });
        sh.popd();
        if (result.code) {
            throw 'Error executing: ' + command;
        }
    };

    // called to execute a npm command
    setup.npmExec = function (command) {
        if (command) {
            setup.log('NPM:', command);
            setup.exec(command);
        }
    };

    // uninstall one or more modules
    // module can be anything that eachModule supports
    setup.uninstall = function (module, options) {
        eachModule(module, options, function (module, options) {
            uninstalls.push({ module: module, options: extend(setup.npmOptions(module), options) });
        });
    };

    // install one or more modules
    // module can be anything that eachModule supports
    setup.install = function (module, options) {
        eachModule(module, options, function (module, options) {
            installs.push({ module: module, options: extend(setup.npmOptions(module), options) });
        });
    };

    // configure name with options
    // options {object}
    //  - modules {[string]|{module: options|string}}:
    //      The required modules, can be anything that eachModule supports
    //  - name {string}: name of the config key, e.g. session
    //  - options {object}: key = environment, value = config object
    //      e.g. { development: {}, production: {} }
    setup.config = function (name, options) {
        options = extend({
            modules: [],
            env: setup.env(),
            configs: {}
        }, options);
        var env = options.env;
        var config = options.configs[env];
        if (is.object(config)) {
            setup.log('CONFIG:', name, 'FOR', env);
            setup.install(options.modules, null);
            extend(setup.local[name] || (setup.local[name] = {}), config);
        } else {
            eachModule(options.modules, null, function (module, options) {
                if (options.uninstall) setup.uninstall(module, options);
            });
        }
    };

    // create plugin, returns a plugin function that can be passed to 'use'
    //  - name {string}: name of the config
    //  - options {object}: any options that can be passed to setup.config with the following additions
    //      - sailsConfig: sailsConfig instance, defaults to the sailsConfig used when the configurator was created
    setup.plugin = function (name, options) {
        return function (configs) {
            setup.config(name, extend(true, {}, options, { configs: configs }));
        }
    };

    // The use function can be given a configurator module to install using installOptions and the configs
    // to call the configurator with.
    // Modules are resolved using setup.cwd/node_modules.
    setup.use = function (module, configs, installOptions) {
        setup.install(module, installOptions);
        localRequire(module)(setup)(configs);
    };

    // return local object, extended with common sense defaults
    setup.get = function (local) {
        uninstalls.forEach(function(uninstall) {
            var command = null;
            var options = module.options;
            var module = module.module;
            if (sh.test('-e', path.join(options.cwd, 'node_modules', options.name))) {
                command = ['npm', 'uninstall', module, options.save].join(' ');
            }
            setup.npmExec(command);
        });
        installs.forEach(function(install) {
            var command = null;
            var options = install.options;
            var module = install.module;
            if (sh.test('-e', path.join(options.cwd, 'node_modules', options.name))) {
                if (options.update) command = ['npm', 'update', module, options.save].join(' ');
            } else command = ['npm', 'install', module, options.save].join(' ');
            setup.npmExec(command);
        });
        var defaultLocal = {
            environment: setup.env(),
            port: setup.port()
        };
        var ssl = setup.ssl();
        if (ssl) defaultLocal.ssl = ssl;
        return extend(true, {}, defaultLocal, setup.local, local);
    };
    return setup;
};

