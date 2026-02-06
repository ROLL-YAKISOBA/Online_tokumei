/*  This repository contains code powered by AI */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const path = require('path'); 


const PORT = process.env.PORT || 3000;



app.use(express.static('public'));


app.use(express.json());

app.get("/",(req,res)=>{
  res.sendFile(path.join(__dirname, 'v2', 'main.html'));
})



app.get('/threads', (req, res) => {
    res.sendFile(path.join(__dirname, 'v2', 'threads.html'));
});






// ログイン中のユーザーを管理するMap (socket.id => username)
const loginUsers = new Map();

io.on('connection', (socket) => {
  console.log('新規接続:', socket.id);

 
  socket.on('login', (username) => {
    loginUsers.set(socket.id, username);
    console.log(`${username} がログインしました`);

    // 全員に「誰がログインしたか」を通知
    io.emit('sys_message', `${username}さんが入室しました`);

  /*カウント*/
    io.emit('user_count', loginUsers.size);
    const users = Array.from(loginUsers).map(([id, name]) => ({
      id: id,
      username: name
    }));
    io.emit('user_list', users); 
    
   
  });

  // 2. メッセージ送信処理
  socket.on('send_message', (message) => {
    const username = loginUsers.get(socket.id) || '名無しさん';

    // 全員（自分含む）にメッセージと名前を送信
    io.emit('receive_message', {
      user: username,
      text: message,
      time: new Date().toLocaleTimeString()
    });
  });


  // . 個人チャット送信処理 (追加)
  socket.on('private_message', ({ toId, text }) => {
    const fromUsername = loginUsers.get(socket.id);
    if (fromUsername) {
      // 指定した ID (toId) の相手だけにイベントを飛ばす
      socket.to(toId).emit('receive_private_message', {
        fromUser: fromUsername,
        fromId: socket.id,
        text: text
      });
    }
  });

  
  socket.on('disconnect', () => {
    const username = loginUsers.get(socket.id);
    if (username) {
      loginUsers.delete(socket.id);
      io.emit('sys_message', `${username}さんが退室しました`);
      io.emit('user_count', loginUsers.size);
    }
  });

  
  // 通話リクエストの転送(じっそう予定)
  
  socket.on('call_request', ({ toId }) => {
      const fromUser = loginUsers.get(socket.id);
      if (fromUser) {
          socket.to(toId).emit('receive_call_request', {
              fromUser: fromUser.username,
              fromId: socket.id
          });
      }
  });

  // 通話応答の転送
  socket.on('call_response', ({ toId, accepted }) => {
      const fromUser = loginUsers.get(socket.id);
      if (accepted) {
          socket.to(toId).emit('sys_message', `${fromUser.username}さんが通話を承認しました。`);
      } else {
          socket.to(toId).emit('sys_message', `${fromUser.username}さんに通話を拒否されました。`);
      }
  });

});





server.listen(PORT, '0.0.0.0', () => { 
  console.log(`Server is running!`);
});
