# fabric-samples (merkle tree)

Prereqs: git, docker, docker-compose, go, nodejs, make, g++, python/python3

1. Pull this project and set up environment variable:
    ```
    git clone https://github.com/secure12/fabric-samples-merkle.git
    export PATH=$PATH:/path/to/fabric-samples-merkle/bin/
    ```
2. Bring up network and deploy chaincode:
    ```
    cd fabric-samples-merkle/test-network/
    ./network.sh up createChannel -ca
    ./network.sh deployCC -ccn merkle
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
    node get.js tree_6
    ```

A merkle tree should be printed out as expected.
