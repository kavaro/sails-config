/**
 * Created by karl on 23/08/14.
 *
 * Example local config file for sails
 *
 */

var sailsConfig = require('..');
var use = sailsConfig.use(__dirname);
sailsConfig.log = console.log.bind(console);

var dev = {
    db: 'test'
};

use('sails-config-mongo-session', {
    development: {
        db: dev.db
    }
});


console.log(sailsConfig.get());

module.exports = sailsConfig.get();

