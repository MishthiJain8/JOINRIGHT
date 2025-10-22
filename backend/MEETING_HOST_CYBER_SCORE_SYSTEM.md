# Meeting Host Control & Cyber Score System

## 🎯 **Overview**

This system implements comprehensive meeting host controls with a cyber score reputation system that allows hosts to manage participants and track user behavior across meetings.

## 🏗️ **Architecture**

### **Database Models**

1. **`CyberScore`** - Tracks user behavior and reputation
2. **`MeetingParticipant`** - Manages individual participant sessions  
3. **`Meeting`** (Enhanced) - Added host controls and waiting room
4. **`User`** (Existing) - User information

### **API Endpoints**

**Base URL**: `/api/meeting-host/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:meetingId/start` | Start meeting (host only) |
| GET | `/:meetingId/waiting-room` | Get waiting room participants |
| POST | `/:meetingId/participants/:userId/entry` | Approve/deny participant |
| GET | `/:meetingId/participants` | Get all participants with cyber scores |
| POST | `/:meetingId/participants/:userId/manage` | Kick/mute/manage participant |
| POST | `/:meetingId/participants/:userId/rating` | Submit cyber score rating |
| GET | `/cyber-score/:userId` | Get user's cyber score history |

## 🎮 **Host Controls**

### **Meeting Management**
- **Host-only start**: Only meeting creator or co-hosts can start meetings
- **Waiting room**: Participants wait for host approval before joining
- **Participant approval**: Host sees cyber scores before allowing entry
- **Real-time control**: Mute, kick, disable video during meeting

### **Participant Visibility**
When participants request to join, hosts see:
```json
{
  "userId": "user_id",
  "userInfo": {
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com"
  },
  "cyberScore": {
    "score": 750,              // 0-1000 scale
    "level": "good",           // excellent, good, average, poor, banned
    "totalMeetings": 25,
    "positiveReviews": 18,
    "negativeReviews": 2,
    "isRestricted": false,
    "lastIncident": {
      "type": "minor_violation",
      "reason": "Interrupted presentation",
      "date": "2025-09-20"
    }
  },
  "waitingDuration": 3         // minutes waiting
}
```

## 🏆 **Cyber Score System**

### **Scoring Categories**
Each user is rated in 5 categories (0-100 each):

1. **Respectful Communication** - Polite, professional behavior
2. **Punctuality** - Joins on time, stays for duration
3. **Follows Guidelines** - Adheres to meeting rules
4. **Technical Conduct** - Proper use of tools, no disruptions
5. **Overall Participation** - Engagement, contribution quality

### **Total Score Calculation**
- **Range**: 0-1000 points
- **Formula**: Average of all categories × 10
- **Starting Score**: 500 (average)

### **Reputation Levels**
| Score Range | Level | Description |
|-------------|-------|-------------|
| 800-1000 | Excellent | Highly trusted participant |
| 650-799 | Good | Reliable participant |
| 400-649 | Average | Standard participant |
| 200-399 | Poor | Requires monitoring |
| 0-199 | Banned | Restricted access |

### **Score Changes**
Host ratings (1-5 scale) convert to score changes:
- **5 stars**: +20 points
- **4 stars**: +10 points  
- **3 stars**: 0 points (neutral)
- **2 stars**: -10 points
- **1 star**: -20 points

## 📊 **Rating System**

### **Host Rating Form**
```json
{
  "behaviorRating": {
    "respectfulCommunication": 4,    // 1-5 scale
    "punctuality": 5,
    "followsGuidelines": 4,
    "technicalConduct": 3,
    "overallParticipation": 4
  },
  "comments": "Good participation, but had some audio issues",
  "recommended": true,               // Would recommend to other hosts
  "incidentType": "neutral",         // positive, neutral, minor_violation, major_violation, severe_violation
  "evidence": {
    "screenshots": [],
    "chatLogs": [],
    "notes": "Audio feedback during presentation"
  }
}
```

## 🚫 **Restrictions & Penalties**

### **Temporary Bans**
- Applied for major violations
- Duration set by host
- Prevents joining any meetings during ban period

### **Permanent Restrictions**
- Microphone disabled
- Camera disabled  
- Chat disabled
- Screen sharing disabled

### **Auto-restrictions**
- Score < 200: Automatic restrictions
- Multiple kicks: Temporary ban
- Severe violations: Immediate restrictions

## 🔄 **Meeting Flow**

### **1. Meeting Creation**
```javascript
// Enhanced meeting object
{
  "hostControls": {
    "requireHostApproval": true,
    "allowParticipantsToJoinBeforeHost": false,
    "autoAdmitRegisteredUsers": false,
    "maxParticipants": 100,
    "enableWaitingRoom": true
  }
}
```

### **2. Participant Joins**
1. User requests to join meeting
2. System checks user's cyber score
3. User added to waiting room with score visible to host
4. Host sees participant with full reputation details
5. Host approves/denies entry based on cyber score

### **3. During Meeting** 
1. Host can monitor all participants
2. Real-time controls: mute, kick, disable video
3. Participant activities tracked
4. Host can take actions with reasons

### **4. Post-Meeting**
1. Host rates participants
2. Cyber scores updated based on ratings
3. Incident reports created if needed
4. Meeting statistics updated

## 💻 **Frontend Integration**

### **Host Dashboard Components**
```javascript
// Waiting Room Component
<WaitingRoomManager 
  participants={waitingParticipants}
  onApprove={handleApprove}
  onDeny={handleDeny}
/>

// Participant Management  
<ParticipantList
  participants={meetingParticipants}
  onKick={handleKick}
  onMute={handleMute}
  onRate={handleRate}
/>

// Cyber Score Display
<CyberScoreCard
  score={participant.cyberScore}
  showDetails={true}
/>
```

### **Rating Modal**
```javascript
<RatingModal
  participant={selectedParticipant}
  onSubmit={handleRatingSubmit}
  categories={ratingCategories}
/>
```

## 🔒 **Security Features**

### **Authentication**
- All endpoints require valid JWT token
- Host verification for all control actions
- Co-host support with same permissions

### **Authorization**
- Only meeting host/co-hosts can:
  - Start meetings
  - Manage participants
  - Submit ratings
  - View cyber scores

### **Audit Trail**
- All host actions logged
- Score changes tracked with reasons
- Meeting statistics maintained
- Evidence collection for violations

## 📈 **Benefits**

### **For Hosts**
- **Full Control**: Complete authority over meeting participants
- **Informed Decisions**: See participant history before allowing entry
- **Quality Assurance**: Rate and track participant behavior
- **Security**: Prevent problematic users from joining

### **For Participants**
- **Reputation Building**: Build trust through good behavior
- **Transparency**: Understand how they're perceived
- **Incentives**: Rewards for positive participation
- **Fair System**: Clear scoring criteria and history

### **For Platform**
- **Community Standards**: Maintain high-quality meeting environment
- **Self-Regulation**: Community-driven moderation
- **Data Insights**: Analytics on meeting behavior patterns
- **Scalability**: Automated reputation-based decisions

## 🚀 **Implementation Status**

✅ **Backend Complete**
- Database models created
- API endpoints implemented
- Controllers and routes added
- Authentication & authorization

⏳ **Frontend (Next Steps)**
- Host control UI components
- Cyber score displays
- Rating forms and modals
- Real-time participant management

## 🔧 **Configuration**

### **Environment Variables**
```env
# Cyber score settings
CYBER_SCORE_START_VALUE=500
CYBER_SCORE_MAX_PENALTY=50
CYBER_SCORE_DECAY_RATE=0.1

# Meeting host settings  
DEFAULT_WAITING_ROOM=true
DEFAULT_HOST_APPROVAL=true
MAX_PARTICIPANTS_DEFAULT=100
```

## 📝 **Usage Examples**

### **Start Meeting (Host)**
```javascript
POST /api/meeting-host/ABC123/start
Authorization: Bearer <host_jwt_token>
```

### **Get Waiting Room**
```javascript
GET /api/meeting-host/ABC123/waiting-room
Authorization: Bearer <host_jwt_token>

Response:
{
  "participants": [
    {
      "userId": "user123",
      "userInfo": { "firstName": "John", "lastName": "Doe" },
      "cyberScore": { "score": 750, "level": "good" },
      "waitingDuration": 3
    }
  ]
}
```

### **Submit Rating**
```javascript  
POST /api/meeting-host/ABC123/participants/user123/rating
Content-Type: application/json
Authorization: Bearer <host_jwt_token>

{
  "behaviorRating": {
    "respectfulCommunication": 4,
    "punctuality": 5,
    "followsGuidelines": 4,
    "technicalConduct": 3,
    "overallParticipation": 4
  },
  "comments": "Good participant, minor technical issues",
  "recommended": true,
  "incidentType": "neutral"
}
```

This comprehensive system ensures meeting hosts have full control while maintaining a fair, transparent reputation system for all participants. 🎯