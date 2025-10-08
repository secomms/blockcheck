const { default: Web3 } = require('web3');

const crypto = require("crypto");


function sha256(string) {
    return crypto.createHash('sha256').update(string).digest('hex');
}

function hashingMethod(string){
    return sha256(string)
}

class VerificationUtilities {

    #computeHashRoot(leaf, proof){
        let res = hashingMethod(hashingMethod(leaf));

        for (let elem of proof){
            if (elem['right']){
                res = hashingMethod(res + elem['right']);
            } else {
                res = hashingMethod(elem['left'] + res);
            }
        }
        return res;
    }

    async #getWeb3(){
        return new Web3("https://ethereum-rpc.publicnode.com");
    }

    computeRootHash(plainData, merkleProof){
        return this.#computeHashRoot(plainData, merkleProof);
    }

    async #getTransactionDataFromBC(transactionHash){
        let data = null;
        let web3 = await this.#getWeb3();
        try{
            let transaction = await web3.eth.getTransaction(transactionHash);
            if (!transaction) {
                console.error(`Verifier - Transaction not found`);
            } else{
                data = transaction.input;
            }
        } catch (error) {
            console.error(`Verifier - Error while fetching the transaction`);
            throw error
        }
        return data;
    }

    async verifyCertificateIntegrity(plainData, proof){
        const computedHashRoot = this.computeRootHash(plainData, proof.merkleproof);
        let readHashRoot = await this.#getTransactionDataFromBC(proof.hash_transazione)
        return "0x"+computedHashRoot === readHashRoot;
    }

    async verifyIssuerAuthenticity(issuer){
        const bcName = issuer.blockchain.blockchainName
        const wallet = issuer.blockchain.wallet
        return {blockchainName: bcName, wallet: wallet};
    }

    checkExpired(expires){
        if(expires === 'mai') return false
        const d = new Date(expires)
        const now = new Date()
        return d < now;
    }


}

module.exports = {VerificationUtilities};