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
const sha256 = require('js-sha256');

const channelName = 'mychannel';
const chaincodeName = 'merkle';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

function byteNumberArrayToHexString(arr) {
    return arr.map(b => {
        var s = b.toString(16);
        return ((s.length == 1) ? '0' : '') + s;
    }).join('');
}

// NOTE: If you see  kind an error like these:
/*
    2020-08-07T20:23:17.590Z - error: [DiscoveryService]: send[mychannel] - Channel:mychannel received discovery error:access denied
    ******** FAILED to run the application: Error: DiscoveryService: mychannel error: access denied

   OR

   Failed to register user : Error: fabric-ca request register failed with errors [[ { code: 20, message: 'Authentication failure' } ]]
   ******** FAILED to run the application: Error: Identity not found in wallet: appUser
*/
// Delete the /fabric-samples/asset-transfer-basic/application-javascript/wallet directory
// and retry this application.
//
// The certificate authority must have been restarted and the saved certificates for the
// admin and application user are not valid. Deleting the wallet store will force these to be reset
// with the new certificate authority.
//

async function main(tx, treeID, root) {
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
            let result = await contract.evaluateTransaction('GetMerkleProof', tx, treeID);
            console.log();
            console.log("Query Result:");

            const proof = JSON.parse(result.toString());
            console.log("{");
            console.log("  index: "+ proof.index +",");
            console.log("  siblings: [");
            var i;
            for (i = 0; i < proof.siblings.length; i++) {
                console.log("    " + byteNumberArrayToHexString(proof.siblings[i]) + ((i === proof.siblings.length-1)?'':','));
            }
            console.log("  ]");
            console.log("}");
            console.log();

            var index = proof.index;
            var hash = sha256.array(tx);
            console.log("Transaction's hash:");
            console.log(byteNumberArrayToHexString(hash));
            for (i = 0; i < proof.siblings.length; i++) {
                console.log();
                console.log("Hashing at height "+i+".");
                if ((index & 1) == 0) {
                    console.log("Padding sibling on right.");
                    hash = sha256.array(hash.concat(proof.siblings[i]));
                } else {
                    console.log("Padding sibling on left.");
                    hash = sha256.array(proof.siblings[i].concat(hash));
                }
                console.log("New hash:");
                console.log(byteNumberArrayToHexString(hash));
                index >>= 1;
            }

            console.log();
            console.log("Verification Result:");
            console.log(byteNumberArrayToHexString(hash) === root);
        } finally {
            // Disconnect from the gateway when the application is closing
            // This will close all connections to the network
            gateway.disconnect();
        }
    } catch (error) {
        console.error(`******** FAILED to run the application: ${error}`);
        console.error(error.stack);
    }
}

const argv = process.argv.slice(2);

if (argv.length < 3) {
    console.log("usage:   node verify.js <txID> <tree-index> <root-hash>");
    console.log("example: node verify.js 0c62...3831 14 147c...8875");
}
else {
    main(argv[0], argv[1], argv[2]);
}
