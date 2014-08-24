/**
 * Created by karl on 23/08/14.
 *
 * Test local config file for sails
 *
 */

var config = require('../..')(module, require);
config.log = console.log.bind(console);

var dev = {
    db: config.pkg.name
};

config.use('sails-config-mongo-session', {
    development: {
        db: dev.db
    }
});

console.log(config.get());

module.exports = config.get();

