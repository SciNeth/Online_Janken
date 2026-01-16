// Firebase SDKをインポート
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase設定（各自のプロジェクトの設定に置き換える）
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ゲーム状態
let currentRoom = null;
let playerName = null;
let playerId = null;

// DOM要素
const roomSelection = document.getElementById('room-selection');
const gameArea = document.getElementById('game-area');
const joinBtn = document.getElementById('join-btn');
const choiceBtns = document.querySelectorAll('.choice-btn');
const resetBtn = document.getElementById('reset-btn');
const statusDiv = document.getElementById('status');
const resultDiv = document.getElementById('result');
const playersInfo = document.getElementById('players-info');

// ルーム参加
joinBtn.addEventListener('click', () => {
    const roomId = document.getElementById('room-id').value.trim();
    const name = document.getElementById('player-name').value.trim();
    
    if (!roomId || !name) {
        alert('ルームIDと名前を入力してください');
        return;
    }
    
    currentRoom = roomId;
    playerName = name;
    playerId = 'player_' + Date.now();
    
    joinRoom();
});

function joinRoom() {
    const roomRef = ref(database, `rooms/${currentRoom}`);
    
    // ルーム情報を監視
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
            // 新規ルーム作成
            set(roomRef, {
                players: {
                    [playerId]: {
                        name: playerName,
                        choice: null
                    }
                },
                result: null
            });
            roomSelection.style.display = 'none';
            gameArea.style.display = 'block';
            statusDiv.textContent = '相手の参加を待っています...';
        } else {
            updateGameState(data);
        }
    });
    
    // プレイヤーを追加
    const playerRef = ref(database, `rooms/${currentRoom}/players/${playerId}`);
    set(playerRef, {
        name: playerName,
        choice: null
    });
}

function updateGameState(roomData) {
    const players = roomData.players || {};
    const playerList = Object.entries(players);
    
    // プレイヤー情報表示
    playersInfo.innerHTML = playerList.map(([id, data]) => 
        `<div>${data.name}: ${data.choice ? '選択済み✅' : '選択中...'}</div>`
    ).join('');
    
    roomSelection.style.display = 'none';
    gameArea.style.display = 'block';
    
    // 2人揃ったか確認
    if (playerList.length === 2) {
        statusDiv.textContent = '手を選んでください！';
        enableChoices();
        
        // 両方選択済みなら結果判定
        if (playerList.every(([_, data]) => data.choice)) {
            judgeResult(playerList);
        }
    } else if (playerList.length > 2) {
        statusDiv.textContent = 'ルームが満員です';
        disableChoices();
    } else {
        statusDiv.textContent = '相手の参加を待っています...';
        disableChoices();
    }
}

function enableChoices() {
    choiceBtns.forEach(btn => {
        btn.disabled = false;
        btn.onclick = () => makeChoice(btn.dataset.choice);
    });
}

function disableChoices() {
    choiceBtns.forEach(btn => btn.disabled = true);
}

function makeChoice(choice) {
    const playerRef = ref(database, `rooms/${currentRoom}/players/${playerId}`);
    update(playerRef, { choice: choice });
    
    disableChoices();
    statusDiv.textContent = '相手の選択を待っています...';
}

function judgeResult(playerList) {
    const [player1, player2] = playerList;
    const choice1 = player1[1].choice;
    const choice2 = player2[1].choice;
    
    let resultText = '';
    
    if (choice1 === choice2) {
        resultText = '引き分け！';
    } else if (
        (choice1 === 'rock' && choice2 === 'scissors') ||
        (choice1 === 'paper' && choice2 === 'rock') ||
        (choice1 === 'scissors' && choice2 === 'paper')
    ) {
        resultText = `${player1[1].name} の勝ち！🎉`;
    } else {
        resultText = `${player2[1].name} の勝ち！🎉`;
    }
    
    resultDiv.textContent = resultText;
    resultDiv.style.display = 'block';
    resetBtn.style.display = 'block';
    statusDiv.textContent = `${player1[1].name}: ${getEmoji(choice1)} vs ${player2[1].name}: ${getEmoji(choice2)}`;
}

function getEmoji(choice) {
    const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
    return emojis[choice] || '?';
}

// リセット機能
resetBtn.addEventListener('click', () => {
    const roomRef = ref(database, `rooms/${currentRoom}`);
    const playerRef = ref(database, `rooms/${currentRoom}/players/${playerId}`);
    
    update(playerRef, { choice: null });
    resultDiv.style.display = 'none';
    resetBtn.style.display = 'none';
});