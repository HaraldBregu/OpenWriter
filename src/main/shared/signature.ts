import crypto from 'crypto';

const sign = crypto.createSign('RSA-SHA256');

const privateKey = "-----BEGIN RSA PRIVATE KEY-----\n" +
    "MIICWwIBAAKBgHhaVgf+kFfMKYSWKb3h8qIcH8BV8vbHHduGWRw4eWzIsOu0GSid\n" +
    "nDrktY7t8STBoshL+LKqjeHB/kt03Hb9vK2YMfG1/70OntS3cPnQNxGzNxA7oRA/\n" +
    "cPBVKL8kkAk31SYnGCM3eH3tuJ20yebZ7JVYPTjWrMDhn5Ef7QwqJEIRAgMBAAEC\n" +
    "gYB2PiqwCAbAe7F+thmkmMzNQFxhlw/yLIbFGyWJeGKz4ikQKg1dvhu0MOe/2T5G\n" +
    "IohPyXQ59R8YYoP4loPT1E790+h35Lu9mHGYJz9srVpNXK7+yHr4AifdIQGrVuhp\n" +
    "pkg96hqD1cy0HLuGlh01FyWYlPLonDrk8/ziaI8cypXJkQJBAMMTz3J0nC2wAioW\n" +
    "zSvpo6boOMC32PeY07JtYOuFLmwRCdFD77aK1DYX3govw3+rbQp6JNv8Ulfk7N6G\n" +
    "bID9f0cCQQCd8GVbNZ8ayxnD2wJ2YIDdtYRzGGp0MyWV/3dAtXtlQoscPYXd9lKj\n" +
    "s8GVj/6pXTp0ndNdzWM0BHDNOBmupM/nAkA+2REKdNskNQJdgP8U2K7qxQITxKdY\n" +
    "DZqWb3q8JiowksSw8Mw36T45NzNH4N+BMD9vEq7xWLdGrfBKONCYNhNdAkEAnaW/\n" +
    "BfPYBF6GMUECjDZ3atYshtXwLFyBP9/noOeFa+WoBWBDpvKgOlbK/AbnIxazqoN+\n" +
    "------END RSA PRIVATE KEY-----\n";

export const createSignature = (content: string): void => {
    const message = content;
    sign.update(message);

    try {
        const signature = sign.sign(privateKey, 'hex');
        console.log("Signature:", signature);
        console.log("Signature created successfully");
    } catch (error) {
        console.error("Error creating signature:", error);
        throw error;
    }

}
// Key and IV (initialization vector) for AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

// Encrypt the message
export function encrypt(text: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// Decrypt the message
export function decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
