/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'merkle';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

// pre-requisites:
// - fabric-sample two organization test-network setup with two peers, ordering service,
//   and 2 certificate authorities
//         ===> from directory /fabric-samples/test-network
//         ./network.sh up createChannel -ca
// - deploy the chaincode to a channel.
//         ===> from directory /fabric-samples/test-network
//         ./network.sh deployCC -ccn merkle
// - Be sure that node.js 8.13.0 || >=10.10.0 is installed for @grpc/grpc-js
//         ===> from directory /fabric-samples/merkle/application-javascript
//         node -v
//         nvm install 14
//         nvm use 14
// - npm installed code dependencies
//         ===> from directory /fabric-samples/merkle/application-javascript
//         npm install
// - to run this test application
//         ===> from directory /fabric-samples/merkle/application-javascript
//         node app.js

// NOTE: If you see kinds of error like these:
/*
    2020-08-07T20:23:17.590Z - error: [DiscoveryService]: send[mychannel] - Channel:mychannel received discovery error:access denied
    ******** FAILED to run the application: Error: DiscoveryService: mychannel error: access denied

   OR

   Failed to register user : Error: fabric-ca request register failed with errors [[ { code: 20, message: 'Authentication failure' } ]]
   ******** FAILED to run the application: Error: Identity not found in wallet: appUser
*/
// Delete the /fabric-samples/merkle/application-javascript/wallet directory
// and retry this application.
//
// The certificate authority must have been restarted and the saved certificates for the
// admin and application user are not valid. Deleting the wallet store will force these to be reset
// with the new certificate authority.
//

async function main() {
    try {
        // build an in memory object with the network configuration (also known as a connection profile)
        const ccp = buildCCPOrg1();

        // build an instance of the fabric ca services client based on
        // the information in the network configuration
        const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

        // setup the wallet to hold the credentials of the application user
        const wallet = await buildWallet(Wallets, walletPath);

        // in a real application this would be done on an administrative flow, and only once
        await enrollAdmin(caClient, wallet, mspOrg1);

        // in a real application this would be done only when a new user was required to be added
        // and would be part of an administrative flow
        await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

        // Create a new gateway instance for interacting with the fabric network.
        // In a real application this would be done as the backend server session is setup for
        // a user that has been verified.
        const gateway = new Gateway();

        try {
            // setup the gateway instance
            // The user will now be able to create connections to the fabric network and be able to
            // submit transactions and query. All transactions submitted by this gateway will be
            // signed by this user using the credentials stored in the wallet.
            await gateway.connect(ccp, {
                wallet,
                identity: org1UserId,
                discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
            });

            // Build a network instance based on the channel where the smart contract is deployed
            const network = await gateway.getNetwork(channelName);
            const contract = network.getContract(chaincodeName);

            const listener = async (blockEvent) => {
                const index = blockEvent.blockNumber.toNumber();
                console.log('****************************************');
                console.log('***                                  ***');
                console.log('          Received Block ' + index);
                console.log('***                                  ***');
                console.log('****************************************');
                var txs = blockEvent.getTransactionEvents();
                var tx_array = [];
                var tree_array = [];
                var neither_array = [];
                var i;
                for (i = 0; i < txs.length; i++) {
                    const func = txs[i].transactionData.actions[0].payload.chaincode_proposal_payload.input.chaincode_spec.input.args[0].toString();
                    if (func === "Put") {
                        tx_array.push(txs[i].transactionId)
                    }
                    else if (func === "BuildMerkleTree") {
                        tree_array.push(txs[i]);
                    }
                    else {
                        console.log("unknown function: " + func);
                        neither_array.push(txs[i]);
                    }
                }
                if (tree_array.length != 0) {
                    console.log('Containing Merkle Tree(s):')
                    for (i = 0; i < tree_array.length; i++) {
                        console.log('tree_'+tree_array[i].transactionData.actions[0].payload.chaincode_proposal_payload.input.chaincode_spec.input.args[2].toString());
                    }
                }

                if (tx_array.length != 0) {
                    console.log('Containing Transaction ID(s):')
                    for (i = 0; i < tx_array.length; i++) {
                        console.log(tx_array[i]);
                    }
                    console.log();
                    console.log('putting merkle tree (tree_' + index + ') to ledger');
                    // not sure if stringify is necessary, but otherwise it panics
                    await contract.submitTransaction('BuildMerkleTree', JSON.stringify(tx_array), index);
                    console.log('run get.js to query Merkle trees');
                }
                console.log();
                console.log('Waiting for next block...');
                console.log('(run add.js <num_new_tx> to add transactions)');
                console.log('----------------------------------------');
                console.log();
            };
            /*
            const options = {
                startBlock: 1
            };
            */

            // keeps on listening - no await
            network.addBlockListener(listener);
        } finally {
            // Disconnect from the gateway when the application is closing
            // This will close all connections to the network
            gateway.disconnect();
        }
    } catch (error) {
        console.error(`******** FAILED to run the application: ${error}`);
    }
}

main();
