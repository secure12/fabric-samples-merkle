# fabric-samples (merkle tree)

Prereqs: git, docker, docker-compose, go, nodejs, make, g++, python/python3

1. Clone this project and set up environment variable:
    ```
    git clone https://github.com/secure12/fabric-samples-merkle.git
    export PATH=$PATH:/path/to/fabric-samples-merkle/bin/
    ```
2. Bring up network and deploy chaincode:
    ```
    cd fabric-samples-merkle/test-network/
    ./network.sh up
    ```
    Run `docker ps` to see running containers. There should be six new containers running: `orderer.example.com`,  `peer0.org1.example.com`,  `peer0.org2.example.com`, `ca_orderer`, `ca_org1` and `ca_org2`.
    ```
    ./network.sh deployCC
    ```
    There should be two more chaincode containers `dev-peer0.org1.example.com-merkle...` and `dev-peer0.org2.example.com-merkle...`.
3. Install and use later version of node.js if version less than `v10.10.0`. I personally used `v14.15.1`.
    ```
    node -v # (check node.js version in use)
    nvm install 14
    nvm use 14
    ```
4. Install node.js dependencies for application:
    ```
    cd ../merkle/application-javascript/
    npm install
    ```
5. Run the application (require two terminals):
* With first terminal:
    ```
    cd /path/to/merkle/application-javascript/
    node app.js
    ```
* With second terminal:
    ```
    cd /path/to/merkle/application-javascript/
    nvm use 14
    node add.js 10 # (add 10 arbitrary transactions to the ledger)
    ```
6. On the first terminal, there should be some transactions for the i-th block and a root for their merkle tree tree_i. For example:
    ```
    ****************************************
    ***                                  ***
              Received Block 6
    ***                                  ***
    ****************************************
    Containing Transaction ID(s):
    09b5fe4179465850b5453dc44f928734a975d443aa743da72a290eb31880fe19
    e86b3619dd533e0b2417f9dcd3d63e13291615c0c91082e10ad80182ec06dcc2
    cd42493af9cfacb14b5591338eadf0f4c1c992e9a06bc023102fb5937efefdaf
    15b8269059f9e81bf52d6cc4d5058c3f386a6b657eaf8f36ef4afe5465285308
    d62384d403889b0ea296442fd943b09e4fbbbb02646f750217ab3f1671155979
    ebd0a7af0a66218873ea7f400a74505751af85ca4566bc37c15a468184179b08
    b7b3c12861e66105f2de5ebae17ac9c868985f35bd2164607d52a50f6bc31a28
    ae9d2890175efd4c4b80bba619bf0cb1ef643d475c720b9e07c6d95d8d10a950
    9564e3164a0d0c02d7d2061864e3fb6ddac94c08a8e4fce159ff24743668b98c
    f0f2d16e74ae1a2d9020ad61e76b0b94fa179e822d0257111d5d5ed1aad751d9
    
    putting merkle tree (tree_6) to ledger...
    tree_6 root:
    ce2b4b73d113e17c93bed12e380680c526888096d3660c679e0a349271e71d13
    ```
    On the second terminal, we can verify the membership of a transaction ID with `proof.js`:
    ```
    node proof.js \
    09b5fe4179465850b5453dc44f928734a975d443aa743da72a290eb31880fe19 \ # a transaction ID
    6 \ # the block number
    ce2b4b73d113e17c93bed12e380680c526888096d3660c679e0a349271e71d13 # the root of the Merkle tree
    ```
7. To restart the network (re-installed chaincode):
    ```
    cd ../../test-network/
    ./network.sh restart
    ./network.sh deployCC
    ```
8. To stop the network:
    ```
    ./network.sh down
