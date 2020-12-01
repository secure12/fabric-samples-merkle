/*
SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

type MerkleTree struct {
	Leaves []string     `json:"leaves"`
	Layers [][][32]byte `json:"layers"`
}

type MerkleTreeProof struct {
	Index    int        `json:"index"`
	Siblings [][32]byte `json:"siblings"`
}

func (s *SmartContract) Log(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("************************ Println OK ************************")
	return errors.New("************************ Errors OK ************************")
}

func (s *SmartContract) GetMerkleRoot(ctx contractapi.TransactionContextInterface, index int) (string, error) {
	merkleTreeBytes, err := ctx.GetStub().GetState(fmt.Sprintf("tree_%d", index))
	if err != nil {
		return "", fmt.Errorf("failed to get tree: %v", err)
	}

	var merkleTree MerkleTree
	err = json.Unmarshal(merkleTreeBytes, &merkleTree)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal merkle tree: %v", err)
	}

	height := len(merkleTree.Layers)
	return string(merkleTree.Layers[height-1][0][:]), nil
}

func (s *SmartContract) BuildMerkleTree(ctx contractapi.TransactionContextInterface, txArrayStr string, index int) (string, error) {

	fmt.Println("BuildMerkleTree function called with inputs:")
	fmt.Println(txArrayStr)
	fmt.Println(index)

	testBytes, err := ctx.GetStub().GetState(fmt.Sprintf("tree_%d", index))
	if err != nil {
		return "", fmt.Errorf("failed to get tree bytes when testing if it existed: %v", err)
	}
	if len(testBytes) != 0 {
		return "", errors.New("Merkle tree already exists.")
	}

	var txArray []string
	err = json.Unmarshal([]byte(txArrayStr), &txArray)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal tx array: %v", err)
	}

	if len(txArray) == 0 {
		return "", errors.New("Error: Input array to BuildMerkleTree is empty.")
	}

	fmt.Printf("Number of leaves: %d\n", len(txArray))

	fmt.Println("Input array:")
	for i, tx := range txArray {
		fmt.Printf("%d: %s\n", i, tx)
	}

	var layers [][][32]byte
	var layer [][32]byte
	// convert leaves to hashes
	for _, tx := range txArray {
		layer = append(layer, sha256.Sum256([]byte(tx)))
	}

	layers = append(layers, layer)
	nodes := layer

	// while last layer is not root
	for len(nodes) > 1 {
		layer = [][32]byte{}
		for i := 0; i < len(nodes); i += 2 {
			left := nodes[i][:]
			// arrays are copied by value, so we use address of them
			var right *[32]byte
			// current node is at far right and has no sibling
			if i+1 == len(nodes) {
				// use itself as sibling
				right = &nodes[i]
			} else {
				// use sibling
				right = &nodes[i+1]
			}
			// append the hash of the concatenation of left and right nodes to current layer
			layer = append(layer, sha256.Sum256(append(left, (*right)[:]...)))
		}
		// work with the next layer
		nodes = layer
		layers = append(layers, layer)
	}

	layersBytes, err := json.Marshal(layers)
	fmt.Println(string(layersBytes))

	// make a MerkleTree object
	merkleTree := MerkleTree{
		Leaves: txArray,
		Layers: layers,
	}

	// convert to bytes
	merkleTreeBytes, err := json.Marshal(merkleTree)
	if err != nil {
		return "", fmt.Errorf("failed to marshal merkle tree: %v", err)
	}

	fmt.Println("printing merkle tree:")
	fmt.Println(string(merkleTreeBytes))

	err = ctx.GetStub().PutState(fmt.Sprintf("tree_%d", index), merkleTreeBytes)
	if err != nil {
		return "", fmt.Errorf("failed to put merkle tree: %v", err)
	}

	fmt.Println(len(layers[len(layers)-1][0][:]))
	fmt.Println(len(string(layers[len(layers)-1][0][:])))
	return string(layers[len(layers)-1][0][:]), nil
}

func (s *SmartContract) GetMerkleProof(ctx contractapi.TransactionContextInterface, tx string, index int) (string, error) {
	merkleTreeBytes, err := ctx.GetStub().GetState(fmt.Sprintf("tree_%d", index))
	if err != nil {
		return "", fmt.Errorf("failed to get merkle tree bytes: %v", err)
	}

	var merkleTree MerkleTree
	err = json.Unmarshal(merkleTreeBytes, &merkleTree)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal merkle tree: %v", err)
	}

	// check if the tx's membership and find its index
	exists := false
	var txIndex int
	for i, leaf := range merkleTree.Leaves {
		if leaf == tx {
			txIndex = i
			exists = true
			break
		}
	}

	if !exists {
		return "", errors.New("transaction does not exist.")
	}

	siblingIndex := txIndex
	var siblings [][32]byte
	for _, layer := range merkleTree.Layers {
		// skip the root node
		if len(layer) == 1 {
			break
		}
		switch {
		// node is on the right
		case siblingIndex&1 == 1:
			siblingIndex -= 1
		// node is on the left but it is the right-most
		case siblingIndex == len(layer)-1:
			break
		default:
			siblingIndex += 1
		}
		siblings = append(siblings, layer[siblingIndex])
		siblingIndex >>= 1
	}

	proof := MerkleTreeProof{
		Index:    txIndex,
		Siblings: siblings,
	}

	proofBytes, err := json.Marshal(proof)
	if err != nil {
		return "", fmt.Errorf("failed to marshal proof: %v", err)
	}

	return string(proofBytes), nil
}

func (s *SmartContract) Put(ctx contractapi.TransactionContextInterface, key string, val string) error {
	err := ctx.GetStub().PutState(key, []byte(val))
	return err
}

func (s *SmartContract) Get(ctx contractapi.TransactionContextInterface, key string) (string, error) {
	val, err := ctx.GetStub().GetState(key)
	if err != nil {
		return "", err
	}
	return string(val), err
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(SmartContract))
	if err != nil {
		log.Panicf("Error creating merkle tree chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("Error starting merkle tree chaincode: %v", err)
	}
}
