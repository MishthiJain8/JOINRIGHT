# 🖥️ Screen Sharing Troubleshooting Guide

## ✅ **Fixes Applied:**

### 1. **Enhanced Error Handling**
- Added comprehensive error handling for `getDisplayMedia()` API
- Proper error messages for different failure scenarios
- Fallback mechanisms for track replacement

### 2. **Browser Compatibility Checks**
- Automatic detection of screen sharing support
- HTTPS requirement validation
- Browser compatibility verification

### 3. **Improved Track Management**
- Better track replacement using RTCRtpSender
- Fallback to legacy methods if modern APIs fail
- Proper cleanup of screen sharing streams

### 4. **User Experience Improvements**
- Button only shows if screen sharing is supported
- Clear error messages for common issues
- Proper visual feedback for screen sharing state

## 🔧 **Common Issues and Solutions:**

### **Issue 1: Screen Share Button Not Visible**
**Symptoms:** The screen share button doesn't appear in the controls
**Causes:**
- Running on HTTP instead of HTTPS
- Browser doesn't support `getDisplayMedia()`
- Missing browser permissions

**Solutions:**
```javascript
// Check browser support
console.log('Screen share supported:', {
  hasGetDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
  isHTTPS: window.location.protocol === 'https:',
  isLocalhost: window.location.hostname === 'localhost'
});
```

### **Issue 2: "Screen sharing was denied" Error**
**Symptoms:** Error popup when clicking screen share
**Causes:**
- User clicked "Don't allow" in browser permission dialog
- Browser blocked screen sharing due to security settings

**Solutions:**
1. **For Users:**
   - Click the screen share button again
   - Allow screen sharing when prompted
   - Check browser address bar for blocked permissions

2. **For Chrome:**
   - Go to Settings > Privacy and security > Site settings
   - Allow screen sharing for your domain

3. **For Firefox:**
   - Click the shield icon in address bar
   - Enable permissions for screen sharing

### **Issue 3: Screen Share Starts but Peers Can't See It**
**Symptoms:** Screen sharing indicator shows but others see black screen
**Causes:**
- Track replacement failed
- Peer connection issues
- WebRTC negotiation problems

**Solutions:**
```javascript
// Debug track replacement
peersRef.current.forEach(({ peer }) => {
  console.log('Peer connection state:', peer?.connectionState);
  console.log('Peer senders:', peer?.getSenders?.());
});
```

### **Issue 4: "Screen sharing requires HTTPS" Error**
**Symptoms:** Error message about HTTPS requirement
**Causes:**
- Accessing the application over HTTP
- Self-signed certificate issues

**Solutions:**
1. **For Development:**
   - Use `https://localhost:3000` instead of `http://localhost:3000`
   - Set up HTTPS in your development server

2. **For Production:**
   - Ensure your domain has a valid SSL certificate
   - Use HTTPS URLs in all configurations

### **Issue 5: Screen Share Stops Immediately**
**Symptoms:** Screen sharing starts then stops within seconds
**Causes:**
- User cancelled screen selection
- Screen source became unavailable
- Browser security restrictions

**Solutions:**
- Select a valid screen/window when prompted
- Check if the selected application is still running
- Ensure screen isn't locked or protected

## 🧪 **Testing Screen Share Functionality:**

### **Step 1: Basic Functionality Test**
```javascript
// Open browser console and run:
navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true
}).then(stream => {
  console.log('Screen sharing works!', stream);
  stream.getTracks().forEach(track => track.stop());
}).catch(error => {
  console.error('Screen sharing failed:', error);
});
```

### **Step 2: Check Peer Connections**
```javascript
// In meeting, check peer connections:
console.log('Active peers:', peersRef.current.length);
peersRef.current.forEach((peerObj, index) => {
  console.log(`Peer ${index}:`, {
    destroyed: peerObj.peer.destroyed,
    connectionState: peerObj.peer.connectionState,
    hasSenders: !!peerObj.peer.getSenders
  });
});
```

### **Step 3: Track Replacement Test**
```javascript
// Verify track replacement works:
const videoTrack = screenStream?.getVideoTracks()[0];
console.log('Screen video track:', {
  id: videoTrack?.id,
  kind: videoTrack?.kind,
  enabled: videoTrack?.enabled,
  readyState: videoTrack?.readyState
});
```

## 📋 **Checklist for Screen Sharing Issues:**

### **Browser Requirements:**
- [ ] Using Chrome 72+, Firefox 66+, or Safari 13+
- [ ] Site is accessed via HTTPS or localhost
- [ ] Screen sharing permission granted
- [ ] No ad blockers blocking media permissions

### **Application Requirements:**
- [ ] WebRTC peer connections established
- [ ] User media (camera/microphone) working
- [ ] Socket connection active
- [ ] Screen sharing button visible in controls

### **Network Requirements:**
- [ ] Stable internet connection
- [ ] Firewall allows WebRTC traffic
- [ ] No corporate restrictions on screen sharing
- [ ] TURN/STUN servers accessible if behind NAT

## 🔄 **Manual Recovery Steps:**

### **If Screen Share Gets Stuck:**
1. Click "Stop Share" button
2. Wait 2-3 seconds
3. Try starting screen share again
4. If still stuck, refresh the page

### **If Peers Can't See Screen:**
1. Stop screen sharing
2. Turn video off and on
3. Restart screen sharing
4. Ask peers to refresh their page

### **If Screen Share Button Missing:**
1. Check browser console for errors
2. Verify you're on HTTPS
3. Try a different browser
4. Clear browser cache and cookies

## 🛠️ **Advanced Debugging:**

### **Enable Detailed Logging:**
```javascript
// Add to browser console for detailed logs:
window.DEBUG_SCREEN_SHARE = true;

// This will enable verbose logging in screen share functions
```

### **Monitor WebRTC Stats:**
```javascript
// Check WebRTC connection quality:
peersRef.current.forEach(async ({ peer }, index) => {
  if (peer.getStats) {
    const stats = await peer.getStats();
    stats.forEach(report => {
      if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
        console.log(`Peer ${index} video stats:`, {
          bytesSent: report.bytesSent,
          framesEncoded: report.framesEncoded,
          framesSent: report.framesSent
        });
      }
    });
  }
});
```

### **Check Track States:**
```javascript
// Monitor all media tracks:
const logTrackStates = () => {
  console.log('User stream tracks:', 
    userStream?.getTracks().map(t => ({
      kind: t.kind,
      enabled: t.enabled,
      readyState: t.readyState
    }))
  );
  
  console.log('Screen stream tracks:', 
    screenStream?.getTracks().map(t => ({
      kind: t.kind,
      enabled: t.enabled,
      readyState: t.readyState
    }))
  );
};

// Run this periodically during screen sharing
setInterval(logTrackStates, 5000);
```

## 📞 **Contact Support:**

If screen sharing still doesn't work after following this guide:

1. **Gather Information:**
   - Browser name and version
   - Operating system
   - Error messages from console
   - Steps that led to the issue

2. **Try These First:**
   - Test in an incognito/private window
   - Try a different browser
   - Test from a different network

3. **Provide Debug Info:**
   ```javascript
   // Run in console and share output:
   console.log('Debug info:', {
     userAgent: navigator.userAgent,
     location: window.location.href,
     hasGetDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
     supportsScreenShare: supportsScreenShare,
     isScreenSharing: isScreenSharing,
     peersCount: peersRef.current.length
   });
   ```

## ✅ **Success Indicators:**

Your screen sharing is working correctly when:
- [ ] Screen share button appears in controls
- [ ] Clicking button shows screen selection dialog
- [ ] Other participants can see your shared screen
- [ ] Audio from shared applications is transmitted
- [ ] Screen sharing can be stopped cleanly
- [ ] No console errors during screen sharing
- [ ] Can switch between camera and screen share smoothly

---

**🎯 Remember:** Screen sharing requires HTTPS, modern browser support, and proper permissions. Most issues are resolved by ensuring these requirements are met.