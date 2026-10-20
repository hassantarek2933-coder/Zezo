import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  query,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// إعدادات مشروع Firebase الخاص بك
const firebaseConfig = {
  apiKey: "AIzaSyCz3NIPH0FpO7ooSqVO9ED1wzy0UDU0kTM",
  authDomain: "test-d872e.firebaseapp.com",
  databaseURL: "ضع_رابط_Realtime_Database_هنا",
  projectId: "test-d872e",
  storageBucket: "test-d872e.firebasestorage.app",
  messagingSenderId: "185135350040",
  appId: "1:185135350040:web:86eb3f8fd9c7d9d23fde6d",
  measurementId: "G-SEQGBFYQYT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const $ = id => document.getElementById(id);

const authPanel = $("authPanel");
const chatPanel = $("chatPanel");
const messagesBox = $("messages");
const messageForm = $("messageForm");

const messagesRef = ref(db, "message/messages");

let currentUser = null;
let approved = false;
let stopApproval = null;
let stopMessages = null;

function status(id, message, error = false) {
  $(id).textContent = message;
  $(id).style.color = error ? "#ff9292" : "#20d879";
}

function errorText(error) {
  const errors = {
    "auth/email-already-in-use": "البريد الإلكتروني مستخدم بالفعل.",
    "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
    "auth/weak-password": "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
    "auth/invalid-credential": "بيانات تسجيل الدخول غير صحيحة.",
    "auth/network-request-failed": "تحقق من اتصال الإنترنت."
  };

  return errors[error.code] || error.message || "حدث خطأ.";
}

$("signupBtn").addEventListener("click", async () => {
  try {
    status("authStatus", "");
    await createUserWithEmailAndPassword(
      auth,
      $("email").value.trim(),
      $("password").value
    );
  } catch (error) {
    status("authStatus", errorText(error), true);
  }
});

$("loginBtn").addEventListener("click", async () => {
  try {
    status("authStatus", "");
    await signInWithEmailAndPassword(
      auth,
      $("email").value.trim(),
      $("password").value
    );
  } catch (error) {
    status("authStatus", errorText(error), true);
  }
});

$("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

function cleanup() {
  if (stopApproval) stopApproval();
  if (stopMessages) stopMessages();

  stopApproval = null;
  stopMessages = null;
}

onAuthStateChanged(auth, user => {
  cleanup();
  currentUser = user;
  approved = false;

  authPanel.classList.toggle("hidden", !!user);
  chatPanel.classList.toggle("hidden", !user);

  if (!user) return;

  $("userLabel").textContent = user.email || "";
  watchApproval(user);
});

function watchApproval(user) {
  const approvalRef = ref(db, "approvedUsers/" + user.uid);

  stopApproval = onValue(
    approvalRef,
    snapshot => {
      approved = snapshot.val() === true;

      $("approvalNotice").classList.toggle("hidden", approved);
      messageForm.classList.toggle("hidden", !approved);

      if (approved) {
        startMessages();
      } else {
        if (stopMessages) stopMessages();
        stopMessages = null;
        messagesBox.innerHTML =
          '<p class="empty">حسابك في انتظار الموافقة.</p>';
      }
    },
    error => status("chatStatus", error.message, true)
  );
}

function startMessages() {
  if (stopMessages) return;

  messagesBox.innerHTML = "";

  const recent = query(messagesRef, limitToLast(100));

  stopMessages = onChildAdded(
    recent,
    snapshot => {
      const msg = snapshot.val();

      if (!msg || typeof msg.text !== "string") return;

      const bubble = document.createElement("div");
      bubble.className =
        "bubble" + (msg.uid === currentUser?.uid ? " mine" : "");

      const meta = document.createElement("div");
      meta.className = "meta";

      const sender = document.createElement("span");
      sender.textContent = msg.email || "صديق";

      const time = document.createElement("span");
      time.textContent = msg.createdAt
        ? new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit"
          })
        : "";

      meta.append(sender, document.createTextNode(" · "), time);

      const text = document.createElement("div");
      text.className = "message-text";
      text.textContent = msg.text;

      bubble.append(meta, text);
      messagesBox.appendChild(bubble);
      messagesBox.scrollTop = messagesBox.scrollHeight;
    },
    error => status("chatStatus", error.message, true)
  );
}

messageForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser || !approved) return;

  const text = $("messageInput").value.trim();
  if (!text) return;

  $("sendBtn").disabled = true;

  try {
    const newMessage = push(messagesRef);

    await set(newMessage, {
      uid: currentUser.uid,
      email: currentUser.email || "صديق",
      text,
      createdAt: Date.now()
    });

    $("messageInput").value = "";
    status("chatStatus", "");
  } catch (error) {
    status("chatStatus", errorText(error), true);
  } finally {
    $("sendBtn").disabled = false;
  }
});