# fabric-samples (merkle tree)

Prereqs: git, docker, docker-compose, go, nodejs, make, g++, python/python3

0. Pull the relevant docker images:
    ```
    docker pull hyperledger/fabric-orderer
    docker pull hyperledger/fabric-peer
    docker pull hyperledger/fabric-ca
    ```

1. Pull this project and set up environment variable:
    ```
    git clone https://github.com/secure12/fabric-samples-merkle.git
    export PATH=$PATH:/path/to/fabric-samples-merkle/bin/
    ```
2. Bring up network and deploy chaincode:
    ```
    cd fabric-samples-merkle/test-network/
    ./network.sh up
    ./network.sh deployCC
    ```
3. Install nodejs dependencies:
    ```
    cd ../merkle/application-javascript/
    node -v # (make sure node version is at least 10.10.0 for grpc)
    npm install
    ```
4. Run the application:
    ```
    node app.js # (with first terminal)
    node add.js # (with second terminal)
    node proof.js ef83... 20 0659... # (check that block 20 with root 0659... contains transaction id ef83...)
    ```
5. To restart the network:
    ```
    cd ../../test-network/
    ./network.sh restart
    ./network.sh deployCC
    ```
