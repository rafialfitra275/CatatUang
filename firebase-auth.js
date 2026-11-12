
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD2G6MlBVGflVeMPEVA_7U49p2_nSlpZqM",
  authDomain: "catatuang-59c2d.firebaseapp.com",
  projectId: "catatuang-59c2d",
  storageBucket: "catatuang-59c2d.firebasestorage.app",
  messagingSenderId: "350545190980",
  appId: "1:350545190980:web:da7855a02940ad83681c11"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const loginScreen = document.getElementById("loginScreen");
const appContent = document.getElementById("appContent");
const loginStatus = document.getElementById("loginStatus");

// Referensi transaksi milik pengguna yang sedang login
function transaksiRef(uid) {
  return collection(db, "users", uid, "transactions");
}

// Menyimpan data ke Firestore secara bertahap
async function simpanBanyakTransaksi(uid, data) {
  for (let i = 0; i < data.length; i += 400) {
    const batch = writeBatch(db);
    const bagian = data.slice(i, i + 400);

    bagian.forEach(item => {
      const id = String(item.id);
      const ref = doc(db, "users", uid, "transactions", id);
      batch.set(ref, item);
    });

    await batch.commit();
  }
}

// Menggabungkan data HP dan data online
async function sinkronisasiAwal(user) {
  const aplikasi = window.CatatUangApp;

  if (!aplikasi) {
    throw new Error("Jembatan aplikasi belum ditemukan.");
  }

  const lokal = aplikasi.getTransactions();

  const snapshot = await getDocs(transaksiRef(user.uid));

  const online = snapshot.docs.map(item => ({
    ...item.data(),
    id: item.data().id ?? item.id
  }));

  // Data online menjadi prioritas jika ID sama
  const gabungan = new Map();

  lokal.forEach(item => {
    gabungan.set(String(item.id), item);
  });

  online.forEach(item => {
    gabungan.set(String(item.id), item);
  });

  const hasil = Array.from(gabungan.values());

  // Simpan hasil gabungan ke lokal dan online
  aplikasi.setTransactions(hasil);

  await simpanBanyakTransaksi(user.uid, hasil);

  console.log("Sinkronisasi awal berhasil:", hasil.length);
}

// API untuk dipakai app.js
window.CatatUangCloud = {
  saveTransaction: async function(item) {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(
      db,
      "users",
      user.uid,
      "transactions",
      String(item.id)
    );

    await setDoc(ref, item);
  },

  deleteTransaction: async function(id) {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(
      db,
      "users",
      user.uid,
      "transactions",
      String(id)
    );

    await deleteDoc(ref);
  }
};

// Login Google
document.getElementById("googleLogin").addEventListener("click", async () => {
  try {
    loginStatus.textContent = "Menghubungkan ke Google...";

    await signInWithPopup(auth, provider);

    loginStatus.textContent = "Login berhasil!";
  } catch (error) {
    console.error("Login gagal:", error);

    loginStatus.textContent =
      "Login gagal: " + error.code;
  }
});

// Memeriksa status login
onAuthStateChanged(auth, async user => {
  if (user) {
    loginScreen.style.display = "none";
    appContent.style.display = "block";

    try {
      await sinkronisasiAwal(user);
    } catch (error) {
      console.error("Sinkronisasi gagal:", error);
      alert("Sinkronisasi gagal: " + error.message);
    }

    console.log("Login berhasil:", user.email);
  } else {
    loginScreen.style.display = "block";
    appContent.style.display = "none";
  }
});

// Logout
document.getElementById("googleLogout").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout gagal:", error);
  }
});
