/**
 * Created by karl on 23/08/14.
 */

var extend = require('node.extend');
var path = require('path');
var is = require('is');
var sh = require('shelljs');

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
exports.local = {};

// common default options for npm install, npm update and npm uninstall
exports.npmOptions = function (module) {
    return {
        save: '--save',
        update: false,
        uninstall: false,
        name: module.split('@')[0],
        cwd: process.cwd()
    }
};

exports.execSilent = false;

// called to execute command line
exports.exec = function (command) {
    var result = sh.exec(command, { silent: exports.execSilent });
    if (result.code) {
        throw 'Error executing: ' + command;
    }
};

// called to execute a npm command
exports.npmExec = function (command) {
    if (command) {
        exports.log('NPM:', command);
        exports.exec(command);
    }
};

// uninstall one or more modules
// module can be anything that eachModule supports
exports.uninstall = function (module, options) {
    eachModule(module, options, function (module, options) {
        var command = null;
        options = extend(exports.npmOptions(module), options);
        if (sh.test('-e', path.join(options.cwd, 'node_modules', options.name))) {
            command = ['npm', 'uninstall', module, options.save].join(' ');
        }
        exports.npmExec(command);
    });
};

// install one or more modules
// module can be anything that eachModule supports
exports.install = function (module, options) {
    eachModule(module, options, function (module, options) {
        var command = null;
        options = extend(exports.npmOptions(module), options);
        if (sh.test('-e', path.join(options.cwd, 'node_modules', options.name))) {
            if (options.update) command = ['npm', 'update', module, options.save].join(' ');
        } else command = ['npm', 'install', module, options.save].join(' ');
        exports.npmExec(command);
    });
};

// called to log messages to the screen
exports.log = function () {
};

// get the environment, allows to customize how the environment is determined
exports.env = function () {
    return process.env.NODE_ENV || 'development';
};

// configure name with options
// options {object}
//  - modules {[string]|{module: options|string}}:
//      The required modules, can be anything that eachModule supports
//  - name {string}: name of the config key, e.g. session
//  - options {object}: key = environment, value = config object
//      e.g. { development: {}, production: {} }
exports.config = function (name, options) {
    options = extend({
        modules: [],
        env: exports.env(),
        configs: {}
    }, options);
    var env = options.env;
    var config = options.configs[env];
    if (is.object(config)) {
        exports.log('CONFIG:', name, 'FOR', env);
        exports.install(options.modules, null);
        exports.local[name] = config;
    } else {
        eachModule(options.modules, null, function (module, options) {
            if (options.uninstall) exports.uninstall(module, options);
        });
    }
};

// create configurator function
//  - name {string}: name of the config
//  - options {object}: any options that can be passed to exports.config with the following additions
//      - sailsConfig: sailsConfig instance, defaults to the sailsConfig used when the configurator was created
exports.configurator = function (name, options) {
    return function (configs) {
        exports.config(name, extend(true, {}, options, { configs: configs }));
    }
};

exports.use = function (cwd) {
    cwd = cwd || process.cwd();
    return function (module, configs) {
        if (module[0] !== '.') {
            exports.install(module);
        } else {
            module = path.resolve(cwd, module);
        }
        require(module)(exports)(configs);
    };
};

