# Fuel Token and Crowdfund

We use a manager and data store pattern here, to be able to redeploy our Token and Crowdfund contracts in the event a bug or vulnerability is found.

`contracts\managers\{contractManager]` holds the Manager classes that delegate the calls to the actual contract, found in `contracts\{contract}`. When you add a new function, build it out on the Token itself, and call that same function with the same parameters on the Manager contract, and an additional first parameter of msg.sender. Any data needed by the Token is stored in the `\storage\DataStore` class, which requires a getter and a setter, with an `onlyToken` modifier.

Managers and DataStores can have their related contract addresses reset. This can only be done by the main Vanbex address initialized in the constructor. In this way we can re-deploy the main contract with the buggy logic.

# How to run the server/client

Start in the root directory:  
`npm install && cd client && npm install && sudo npm install gulp -g && gulp build && cd ../server && npm install && npm start`

The server will be available at `http://localhost:8080`


# Tests

You have to run `truffle test ./tests/fuelcrowdfund.js` then `truffle test./tests/fueltoken.js` to run them correctly. This is because FuelCrowdfund advances TestRPC time in the crowdfund for the token functions to be activated.