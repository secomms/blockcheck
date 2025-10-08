const {VerificationUtilities} = require("./verification/verificationUtilities");
const {PDFDocument} = require("pdf-lib");

const emptyProof = {}
async function removeProofFromPdf(pdf){
    async function removeProofOfIntegrity(pdfBufferPoF) {
        const pdfDoc = await PDFDocument.load(pdfBufferPoF)
        let subject, proof, issuer, expires, version, verificationScript
        try{
            subject = JSON.parse(pdfDoc.getSubject())

            for (let i=0; i<subject.length; i++){

                if(subject[i].issuer){
                    issuer = subject[i].issuer
                }
                if(subject[i].attestato_scade){
                    expires = subject[i].attestato_scade
                }
                if(subject[i].blockchain_proof){
                    proof = subject[i].blockchain_proof
                    subject[i].blockchain_proof = emptyProof
                }
                if(subject[i].version){
                    version = subject[i].version
                }
                if(subject[i].verification_script){
                    verificationScript = subject[i].verification_script
                }
            }
            if(!proof){
                throw new Error("No proof")
            }

            pdfDoc.setSubject(JSON.stringify(subject))
            pdfDoc.setCreationDate(new Date(0))
            pdfDoc.setModificationDate(new Date(0))

            const pdfBytes = await pdfDoc.save()
            return { pdfBuffer: Buffer.from(pdfBytes), proof: proof, issuer: issuer, expires: expires, version: version,
                verificationScript: verificationScript, error:false }
        }catch(error){
            return {
                cleaned: null,
                proof: null,
                issuer: null,
                expires: null,
                version: null,
                verificationScript: null,
                error: true
            };
        }
    }

    const cleanPdf= await removeProofOfIntegrity(pdf);

    return {
        cleaned:cleanPdf.pdfBuffer,
        proof: cleanPdf.proof,
        issuer: cleanPdf.issuer,
        expires: cleanPdf.expires,
        version: cleanPdf.version,
        verificationScript: cleanPdf.verificationScript,
        error: cleanPdf.error
    };
}


async function processPDFBase64(pdfBase64) {
    try {
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        const verifier = new VerificationUtilities();

        let response = {
            issuer: "Invalid",
            doc: "Invalid",
            expires: "Invalid",
            info: undefined
        };

        const { cleaned: cleanedPDF, proof: proofData, issuer, expires, version, verificationScript,error } =
            await removeProofFromPdf(pdfBuffer);

        if (error) {
            return { success: false, response, error: "Document not valid or not certified!" };
        }

        const issuerAuthenticity = await verifier.verifyIssuerAuthenticity(issuer);
        if (!issuerAuthenticity) {
            return { success: true, response };
        }

        response.issuer = `${issuer.name}`;

        const valid = await verifier.verifyCertificateIntegrity(cleanedPDF, {
            merkleproof: proofData.merkleproof,
            hash_transazione: proofData.hash_transazione
        });

        if (!valid) {
            return { success: true, response };
        }

        response.doc = "Certificate verified";
        const scaduto = verifier.checkExpired(expires);
        response.expires = scaduto ? "Expired" : "Currently valid";
        response.info = {
            version: version,
            verificationScript:verificationScript,
            issuer: issuer.name,
            blockchain: issuer.blockchain.blockchainName,
            wallet: issuer.blockchain.wallet,
            hash_transazione: proofData.hash_transazione,
            timestamp_transazione: proofData.timestamp,
            attestato_scade: expires!=="mai" ? expires : "Certificate doesn't expire"
        };

        return { success: true, response };

    } catch (err) {
        console.error("Error while verifying the pdf:", err);
        return { success: false, response: null, error: "Internal Server Error" };
    }
}

module.exports = { processPDFBase64 };
