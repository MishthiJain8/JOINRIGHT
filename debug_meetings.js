// Debug script to check meetings in database and test join functionality
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Meeting schema - simplified version for debugging
const meetingSchema = new mongoose.Schema({
  title: String,
  meetingId: String,
  password: String,
  creator: String,
  status: String,
  participants: [String]
});

const Meeting = mongoose.model('Meeting', meetingSchema);

async function debugMeetings() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check all meetings
    const meetings = await Meeting.find({});
    console.log('\n📋 Found', meetings.length, 'meetings in database:');
    
    meetings.forEach((meeting, index) => {
      console.log(`\n${index + 1}. Meeting:`);
      console.log(`   Title: ${meeting.title}`);
      console.log(`   Meeting ID: ${meeting.meetingId}`);
      console.log(`   Password: ${meeting.password}`);
      console.log(`   Creator: ${meeting.creator}`);
      console.log(`   Status: ${meeting.status}`);
      console.log(`   Participants: ${meeting.participants.join(', ')}`);
    });

    // Test specific meeting ID from test file
    const testMeetingId = 'CCD25217';
    console.log(`\n🔍 Looking for meeting with ID: ${testMeetingId}`);
    const testMeeting = await Meeting.findOne({ meetingId: testMeetingId });
    
    if (testMeeting) {
      console.log('✅ Found test meeting!');
      console.log('   Title:', testMeeting.title);
      console.log('   Password:', testMeeting.password);
    } else {
      console.log('❌ Test meeting not found!');
    }

    // Test meeting join API call
    console.log('\n🧪 Testing meeting join API...');
    const testData = {
      meetingId: testMeetingId,
      password: 'test123',
      user: 'test@example.com'
    };

    try {
      const response = await fetch('http://localhost:5000/api/meetings/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      console.log('API Response Status:', response.status);
      console.log('API Response:', JSON.stringify(result, null, 2));

    } catch (error) {
      console.error('API Call Error:', error.message);
    }

  } catch (error) {
    console.error('Database Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugMeetings();