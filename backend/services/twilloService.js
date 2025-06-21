import "dotenv/config";
import twilio from 'twilio';

const accountSid = process.env.TWILLIO_ACCOUNT_SID;    
const authToken = process.env.TWILLIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);



const sendMessage = async (to,text) => {
  try {
    const message = await client.messages.create({
      body: text,
      from: process.env.TWILLIO_PHONE_NUMBER,
      to: to
    });

    console.log('Message sent with SID:', message.sid);
  } catch (error) {
    console.error('Error sending message:', error.message);
  }
};

export default sendMessage;
