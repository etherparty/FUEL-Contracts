// Allows us to use ES6 in our migrations and tests.
require('babel-register')

module.exports = {
  networks: {
    development: {
    	host: 'localhost',
    	port: 8545,
    	network_id: '*',
    	gas: 4612386
    },
    ropsten: {
      host: 'https://ropsten.infura.io/VYHM28f6EsD7dSXSHcmM',
      port: 8545,
      network_id: 3, // Match any network id,
      gas: 4612386
    },
    live: {
      host: 'localhost',
      port: 8545,
      network_id: 1 // Match any network id,
    }
  }
}
