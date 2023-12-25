const host = window.location.hostname;
const port = window.location.port;
const socket = io(`https://${host}:${port}`);

const form = document.getElementById("forms");
const messageInput = document.getElementById("input");
const messageContainer = document.querySelector(".contain");
const roomContainer = document.getElementById("room_id");
const send = new Audio("send.mp3")
const receive = new Audio("recieve.mp3")
const left = new Audio("left.mp3")
const join = new Audio("join.mp3")

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const localPeerConnection = new RTCPeerConnection(configuration);

let isCalling = false;
let callStartTime;
let callTimerInterval;

const appendMessage = (message, position) => {
    const messageElement = document.createElement("div");
    const timestamp = new Date().toLocaleTimeString();
    
    messageElement.innerHTML = `<div class="main_message">${message}</div><span class="timestamp">${timestamp}</span>`;
    
    messageElement.classList.add("message");
    messageElement.classList.add(position);
    messageContainer.append(messageElement);
    if (position === "send") {
        send.play()
    }
    if (position === "receive") {
        receive.play()
    }
    if (position === "left") {
        left.play()
    }
    if (position === "join") {
        join.play()
    }
}

let name = prompt("Enter Your Name To Join This Chat");

if(!name){
    alert("Please enter your name properly");
    window.location.href = `https://${host}:${port}/notjoin.html`;
}else{

let roomId = prompt("Create your room Id. Someone has already created Room Id, so enter that Room Id and join chat. And when there is no need to create a room Id, then create your own room Id. And give that Id to your friend so that he can join this chat.");
if (!roomId) {
    alert("Please enter a valid Room ID");
    roomId = "Guest"
    window.location.href = `https://${host}:${port}/notjoin.html`;
}else{

roomContainer.innerText=roomId;
localStorage.setItem('roomId', roomId);

socket.emit('join-room', roomId, name);

}

}


socket.on('user-joined', name => {
    appendMessage(`${name} joined the Chat`, 'join');
    messageContainer.scrollTop = messageContainer.scrollHeight;
});

socket.on('welcome', welcomeMessage => {
    appendMessage(welcomeMessage, 'receive');
    messageContainer.scrollTop = messageContainer.scrollHeight;
});

socket.on('receive', data => {
    appendMessage(`${data.name} : ${data.message}`, 'receive');
    messageContainer.scrollTop = messageContainer.scrollHeight;
});

socket.on('left', name => {
    appendMessage(`${name} left the Chat`, 'left');
    messageContainer.scrollTop = messageContainer.scrollHeight;
});  

function showUserTyping(){
  const messageInput = document.getElementById("input");
  let message = messageInput.value.trim(); 
  const roomKey = localStorage.getItem('roomId');

  if(message!='' && message!=null){
  socket.emit('user-typing', roomKey);
  }

}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    let message = messageInput.value.trim(); 
    
    if (!message) {
        alert("Please Enter Message");
        message = "Hello";
    } else {
        appendMessage(`You : ${message}`, 'send');
        const roomKey = localStorage.getItem('roomId');
        socket.emit('send', { message: message, roomId: roomKey });
        messageInput.value = "";
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
});


function startVoiceCall() {
const roomKey = localStorage.getItem('roomId');

console.log('Before getUserMedia');

navigator.mediaDevices.getUserMedia({ audio: true })
.then((stream) => {
  document.getElementById('localAudio').srcObject = stream;

  stream.getTracks().forEach((track) => {
    localPeerConnection.addTrack(track, stream);
  });
})
.catch((error) => console.error('Error accessing microphone:', error));

localPeerConnection.onicecandidate = (event) => {
if (event.candidate) {
  const roomKey = localStorage.getItem('roomId');
  socket.emit('ice-candidate', event.candidate, roomKey);
}
};

localPeerConnection.ontrack = (event) => {
document.getElementById('remoteAudio').srcObject = new MediaStream([event.track]);
};

    localPeerConnection.createOffer()
      .then((offer) => localPeerConnection.setLocalDescription(offer))
      .then(() => {
        socket.emit('offer', localPeerConnection.localDescription, roomKey);
        console.log(localPeerConnection.localDescription);
        console.log(roomKey)
      })
      .catch((error) => console.error('Error creating offer:', error));
}

  socket.on('offer', (offer, senderSocketId) => {
    const roomKey = localStorage.getItem('roomId');

    const acceptCall = confirm(`${senderSocketId} is calling. Do you want to accept the call?`);
  
    if (acceptCall) {
      localPeerConnection.setRemoteDescription(offer);
  
      localPeerConnection.createAnswer()
        .then((answer) => localPeerConnection.setLocalDescription(answer))
        .then(() => {
          socket.emit('answer', localPeerConnection.localDescription, roomKey);
          startTimer();
        })
        .catch((error) => console.error('Error creating answer:', error));
    } else {
      socket.emit('reject-call', roomKey);
    }
  
  });

  socket.on('answer', (answer, user) => {
    console.log(answer);
    startTimer();
    localPeerConnection.setRemoteDescription(answer);
    alert(`The call has been accepted by ${user}.`);
    
  });

  socket.on('user-typinglisten', (user) => {

    const blinking_text = document.getElementById('usertypingbutton');
    blinking_text.innerText = `${user} is typing`;
    
    blinking_text.style.display = 'unset';
    
    if (blinking_text.timeoutId) {
      clearTimeout(blinking_text.timeoutId);
    }
    
    blinking_text.timeoutId = setTimeout(function() {
      blinking_text.style.display = 'none';
    }, 3000);

  });

  function startTimer(){
    callStartTime = new Date();
  updateCallDuration();
  clearInterval(callTimerInterval);
  callTimerInterval = setInterval(updateCallDuration, 1000);

  var link = document.getElementById('endCallButton');
  link.style.display = 'unset';

  }

  function updateCallDuration() {
    const now = new Date();
    const elapsedTime = now - callStartTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = ((elapsedTime % 60000) / 1000).toFixed(0);
    document.getElementById('callStartTime').innerHTML = `Call duration: ${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`;
  }

  function endVoiceCall(){
    const roomKey = localStorage.getItem('roomId');
    socket.emit('end', roomKey);
    closeTimer();
    localPeerConnection.close();
  }

  function closeTimer(){
    clearInterval(callTimerInterval);
    var link = document.getElementById('endCallButton');
    document.getElementById('callStartTime').innerHTML = ``;
    link.style.display = 'none';
  }

  socket.on('ice-candidate', (candidate, senderSocketId) => {
    localPeerConnection.addIceCandidate(candidate);
  });

  socket.on('reject-call', (user) => {
    alert(`The call has been rejected by ${user}.`);
  });
  
  socket.on('end', (user) => {
    localPeerConnection.close();
    closeTimer();
    alert(`The call has been ended by ${user}.`);
  });