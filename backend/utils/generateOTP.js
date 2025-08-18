import crypto from 'crypto';

function isWeakOTP(otp) {
    // Rejects all identical digits (e.g., 0000, 1111), sequential (1234, 4321), and common patterns
    const sequential = ['0123', '1234', '2345', '3456', '4567', '5678', '6789', '7890', '0987', '9876', '8765', '7654', '6543', '5432', '4321'];
    if (/^(\d)\1{3}$/.test(otp)) return true; // all same digit
    if (sequential.includes(otp)) return true;
    return false;
}

export const generateOTP = () => {
    let otp;
    do {
        // Generate a random 4-digit number, allowing leading zeros
        otp = crypto.randomInt(0, 10000).toString().padStart(4, '0');
    } while (isWeakOTP(otp));
    return otp;
};
