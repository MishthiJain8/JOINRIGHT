import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import the CyberScore model
import CyberScore from './models/CyberScore.js';

const checkCyberScores = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jointright');
    console.log('✅ Connected to MongoDB');

    // Get total count of cyber score documents
    const totalCount = await CyberScore.countDocuments();
    console.log(`📊 Total CyberScore documents: ${totalCount}`);

    // Get documents with score history
    const withHistory = await CyberScore.countDocuments({ 
      scoreHistory: { $exists: true, $ne: [] } 
    });
    console.log(`📜 Documents with score history: ${withHistory}`);

    // Get some sample documents
    const sampleDocs = await CyberScore.find()
      .populate('userId', 'email firstName lastName')
      .limit(5)
      .lean();
    
    console.log('\n📋 Sample CyberScore documents:');
    sampleDocs.forEach((doc, index) => {
      console.log(`\n${index + 1}. User: ${doc.userId?.email || 'Unknown'}`);
      console.log(`   Current Score: ${doc.currentScore}`);
      console.log(`   Reputation: ${doc.reputationLevel}`);
      console.log(`   Score History Length: ${doc.scoreHistory?.length || 0}`);
      
      if (doc.scoreHistory && doc.scoreHistory.length > 0) {
        console.log('   Recent Review:', doc.scoreHistory[doc.scoreHistory.length - 1]?.reason || 'No reason');
      }
    });

    // Test the aggregation pipeline that's used in the API
    console.log('\n🔍 Testing aggregation pipeline...');
    
    const pipeline = [
      { $match: {} },
      { $unwind: '$scoreHistory' },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'scoreHistory.hostId',
          foreignField: '_id',
          as: 'host'
        }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          currentScore: 1,
          reputationLevel: 1,
          review: {
            _id: '$scoreHistory._id',
            meetingId: '$scoreHistory.meetingId',
            scoreChange: '$scoreHistory.scoreChange',
            category: '$scoreHistory.category',
            reason: '$scoreHistory.reason',
            incidentType: '$scoreHistory.incidentType',
            timestamp: '$scoreHistory.timestamp',
            evidence: '$scoreHistory.evidence'
          },
          user: {
            _id: { $arrayElemAt: ['$user._id', 0] },
            email: { $arrayElemAt: ['$user.email', 0] },
            firstName: { $arrayElemAt: ['$user.firstName', 0] },
            lastName: { $arrayElemAt: ['$user.lastName', 0] }
          },
          host: {
            _id: { $arrayElemAt: ['$host._id', 0] },
            email: { $arrayElemAt: ['$host.email', 0] },
            firstName: { $arrayElemAt: ['$host.firstName', 0] },
            lastName: { $arrayElemAt: ['$host.lastName', 0] }
          }
        }
      },
      { $sort: { 'review.timestamp': -1 } },
      { $limit: 5 }
    ];

    const aggregationResult = await CyberScore.aggregate(pipeline);
    console.log(`📈 Aggregation returned ${aggregationResult.length} results`);
    
    if (aggregationResult.length > 0) {
      console.log('\n📄 Sample aggregation result:');
      console.log(JSON.stringify(aggregationResult[0], null, 2));
    }

    // Check collection names to make sure we're using the right ones
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📚 Available collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
};

console.log('🔍 CyberScore Database Debug Tool');
console.log('==================================');
await checkCyberScores();