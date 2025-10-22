# Emoji Broadcasting Test Guide

## Testing Emoji Synchronization Across Participants

### Setup for Testing
1. **Open Multiple Browser Tabs/Windows**:
   - Tab 1: Join meeting as "User1"
   - Tab 2: Join meeting as "User2" 
   - Tab 3 (optional): Join meeting as "User3"

2. **All Users Should Join Same Room**: Use same Room ID for all participants

### Test Cases

#### Test 1: Basic Emoji Sending
1. User1 clicks "Reactions" button
2. User1 clicks on 😀 emoji
3. **Expected**: 
   - User1 sees emoji floating animation locally
   - User2 and User3 see the same emoji with "User1" label
   - Console shows: "Sending emoji:" and "Emoji broadcasted to room:"

#### Test 2: Multiple Emojis
1. User1 sends 😂
2. User2 sends ❤️
3. User3 sends 👍
4. **Expected**: All users see all three emojis with correct sender names

#### Test 3: Expanded Emoji Picker
1. User1 clicks "Show More" in reactions panel
2. User1 clicks any emoji from the expanded grid
3. **Expected**: All participants see the selected emoji

### Debugging Checklist

If emojis don't appear for other participants:

1. **Check Console Logs**:
   ```javascript
   // Look for these messages:
   "Sending emoji: {emoji data}"
   "Emoji broadcasted to room: {roomId}"
   "Received emoji from another user: {data}"
   ```

2. **Check Socket Connection**:
   - Open browser DevTools → Network tab
   - Look for WebSocket connection to server
   - Should show "connected" status

3. **Verify Room ID**:
   - All participants must be in the same room
   - Check room ID in meeting header

### Expected Behavior

#### For Sender:
- Emoji appears immediately (local state)
- Animation plays smoothly
- No duplicate emoji from socket

#### For Receivers:
- Emoji appears with sender's name
- Animation plays at random position
- Emoji disappears after 3.5 seconds

### Socket Events Used

```javascript
// Outgoing (sender)
socket.emit('emoji-reaction', {
  roomId: roomId,
  emojiData: {
    emoji: '😀',
    userId: socket.id,
    userName: 'User Name',
    id: 'unique_id',
    position: { left: '45%', animationDelay: '0.2s' }
  }
});

// Incoming (receiver)
socket.on('emoji-reaction', (data) => {
  // Display emoji if from different user
});
```

### Troubleshooting

1. **Emojis Only Show for Sender**:
   - Check if server is handling 'emoji-reaction' events
   - Verify socket.io server is broadcasting to room

2. **No Emojis Show at All**:
   - Check if React state updates are working
   - Verify CSS animations are applied

3. **Duplicate Emojis**:
   - Check if sender is seeing their own emoji twice
   - Verify userId comparison in socket handler

4. **Animation Issues**:
   - Check if CSS keyframes are properly defined
   - Verify random positioning is working

This test ensures that the emoji system works correctly across all participants in real-time.