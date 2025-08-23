import mongoose from 'mongoose';
import SupportTicket from './models/supportTicket.js';

// Test database connection
const testDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/webrtc');
    console.log('✅ Connected to database');
    
    // Find a support ticket to test with
    const ticket = await SupportTicket.findOne();
    if (!ticket) {
      console.log('❌ No support tickets found in database');
      return;
    }
    
    console.log('📋 Found ticket:', {
      id: ticket._id,
      subject: ticket.subject,
      currentChatMessages: ticket.chatMessages?.length || 0
    });
    
    // Test adding a chat message
    if (!ticket.chatMessages) {
      ticket.chatMessages = [];
    }
    
    const testMessage = {
      messageId: `test_${Date.now()}`,
      senderId: ticket.userId,
      senderEmail: 'test@example.com',
      senderRole: 'user',
      message: 'This is a test message from the test script',
      timestamp: new Date(),
      isRead: false
    };
    
    ticket.chatMessages.push(testMessage);
    await ticket.save();
    
    console.log('✅ Test message saved successfully');
    console.log('📊 Updated ticket chat messages count:', ticket.chatMessages.length);
    
    // Test retrieving messages
    const retrievedTicket = await SupportTicket.findById(ticket._id);
    console.log('📨 Retrieved messages:', retrievedTicket.chatMessages?.length || 0);
    
    // Clean up test message
    ticket.chatMessages = ticket.chatMessages.filter(msg => !msg.messageId.startsWith('test_'));
    await ticket.save();
    console.log('🧹 Test message cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
};

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabase();
}

export default testDatabase;
