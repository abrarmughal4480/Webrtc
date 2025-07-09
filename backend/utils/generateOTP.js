export const generateOTP = () => {
    const otp = Math.floor(1000 + Math.random() * 9000);
    console.log(otp)
    return  otp// Range: 1000 to 9999
};
