/**
 * Created by karl on 23/08/14.
 */

var sailsConfig = require('..');
var use = sailsConfig.use(__dirname);
sailsConfig.log = console.log.bind(console);

var dev = {
    db: 'test'
};

var prod = {
};

use('sails-config-mongo-session', {
    development: {
        db: dev.db
    }
});


console.log(sailsConfig.local);

module.exports = sailsConfig.local;
