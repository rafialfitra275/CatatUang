
let saldo = 0;
let pemasukan = 0;
let pengeluaran = 0;
let transaksi = [];

let editingId = null;
let jenisTransaksi = "masuk";

// Mengambil data tersimpan
try {
  transaksi = JSON.parse(
    localStorage.getItem("catatUangData")
  ) || [];
} catch (error) {
  transaksi = [];
}

// Format rupiah
function rupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(angka);
}

// Membuka formulir
function openModal(jenis) {
  jenisTransaksi = jenis;
  editingId = null;

  document.getElementById("modalTitle").textContent =
    jenis === "masuk"
      ? "Tambah Pemasukan"
      : "Tambah Pengeluaran";

  document.getElementById("transactionForm").reset();

  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);

  document.getElementById("date").value = localDate;

  document.getElementById("transactionModal").style.display = "flex";
}

// Menutup formulir
function closeModal() {
  document.getElementById("transactionModal").style.display = "none";
  editingId = null;
}

// Menyimpan transaksi
document.getElementById("transactionForm").addEventListener(
  "submit",
  async function(event) {
    event.preventDefault();

    const nominal = Number(
      document.getElementById("amount").value
    );

    const keterangan =
      document.getElementById("description").value.trim();

    const kategori =
      document.getElementById("category").value;

    const tanggal =
      document.getElementById("date").value;

    if (
      !Number.isSafeInteger(nominal) ||
      nominal <= 0 ||
      !keterangan ||
      !tanggal
    ) {
      alert("Periksa kembali data transaksi!");
      return;
    }

    const dataBaru = {
      id: editingId !== null
        ? editingId
        : Date.now() + Math.random(),

      jenis: jenisTransaksi,
      nominal: nominal,
      keterangan: keterangan,
      kategori: kategori,
      tanggal: tanggal
    };

    const dataLama = transaksi;

    if (editingId !== null) {
      transaksi = transaksi.map(function(item) {
        return item.id === editingId ? dataBaru : item;
      });
    } else {
      transaksi = [dataBaru, ...transaksi];
    }

    try {
      localStorage.setItem(
        "catatUangData",
        JSON.stringify(transaksi)
      );
    } catch (error) {
      transaksi = dataLama;
      alert("Data gagal disimpan!");
      return;
    }

    closeModal();
tampilkanData();

try {
  if (window.CatatUangCloud) {
    await window.CatatUangCloud.saveTransaction(dataBaru);
    console.log("Transaksi berhasil disimpan online!");
  }
} catch (error) {
  console.error("Gagal menyimpan ke Firestore:", error);
  alert("Gagal menyinkronkan transaksi online.");
}
  }
);

// Menampilkan saldo dan riwayat
function tampilkanData() {
  pemasukan = 0;
  pengeluaran = 0;

  transaksi.forEach(function(item) {
    if (item.jenis === "masuk") {
      pemasukan += item.nominal;
    } else {
      pengeluaran += item.nominal;
    }
  });

  saldo = pemasukan - pengeluaran;

  document.getElementById("saldo").textContent =
    rupiah(saldo);

  document.getElementById("pemasukan").textContent =
    rupiah(pemasukan);

  document.getElementById("pengeluaran").textContent =
    rupiah(pengeluaran);

  tampilkanLaporan();

  const daftar =
    document.getElementById("transactionList");

  if (transaksi.length === 0) {
    daftar.className = "empty";
    daftar.innerHTML = `
      <div class="empty-icon">📋</div>
      <h3>Belum ada transaksi</h3>
      <p>Transaksi kamu akan muncul di sini.</p>
    `;
    return;
  }

  daftar.className = "transaction-list";
daftar.innerHTML = "";

const kataKunci = (
  document.getElementById("searchTransaction").value
).toLowerCase().trim();

const hasilPencarian = transaksi.filter(function(item) {
  return (
    item.keterangan.toLowerCase().includes(kataKunci) ||
    item.kategori.toLowerCase().includes(kataKunci)
  );
});

  if (hasilPencarian.length === 0) {
  daftar.innerHTML = `
    <div class="empty">
      <h3>Transaksi tidak ditemukan</h3>
      <p>Coba kata pencarian lainnya.</p>
    </div>
  `;
  return;
  }

hasilPencarian.forEach(function(item) {
    const baris = document.createElement("div");
    baris.className = "transaction-item";

    const kiri = document.createElement("div");

    const judul = document.createElement("strong");
    judul.textContent = item.keterangan;

    const detail = document.createElement("p");
    detail.textContent =
      item.kategori + " • " + item.tanggal;

    kiri.append(judul, detail);

    const nilai = document.createElement("strong");

    nilai.className =
      item.jenis === "masuk"
        ? "income-text"
        : "expense-text";

    nilai.textContent =
      (item.jenis === "masuk" ? "+" : "-") +
      rupiah(item.nominal);

    // Tombol aksi
    const aksi = document.createElement("div");
    aksi.className = "transaction-actions";

    const tombolEdit = document.createElement("button");
    tombolEdit.textContent = "Edit";

    tombolEdit.onclick = function() {
      editTransaksi(item.id);
    };

    const tombolHapus = document.createElement("button");
    tombolHapus.textContent = "Hapus";

    tombolHapus.onclick = function() {
      hapusTransaksi(item.id);
    };

    aksi.append(tombolEdit, tombolHapus);

    baris.append(kiri, nilai, aksi);
    daftar.appendChild(baris);
  });
}

// Mengedit transaksi
function editTransaksi(id) {
  const item = transaksi.find(function(t) {
    return t.id === id;
  });

  if (!item) return;

  editingId = id;
  jenisTransaksi = item.jenis;

  document.getElementById("modalTitle").textContent =
    "Edit Transaksi";

  document.getElementById("amount").value =
    item.nominal;

  document.getElementById("description").value =
    item.keterangan;

  document.getElementById("category").value =
    item.kategori;

  document.getElementById("date").value =
    item.tanggal;

  document.getElementById("transactionModal").style.display =
    "flex";
}

// Menghapus transaksi
async function hapusTransaksi(id) {
  const yakin = confirm(
    "Yakin ingin menghapus transaksi ini?"
  );

  if (!yakin) return;

  const dataLama = transaksi;

  transaksi = transaksi.filter(function(item) {
    return item.id !== id;
  });

  try {
    localStorage.setItem(
      "catatUangData",
      JSON.stringify(transaksi)
    );
  } catch (error) {
    transaksi = dataLama;
    alert("Gagal menghapus transaksi!");
    return;
  }

  tampilkanData();

try {
  if (window.CatatUangCloud) {
    await window.CatatUangCloud.deleteTransaction(id);
    console.log("Transaksi berhasil dihapus online!");
  }
} catch (error) {
  console.error("Gagal menghapus dari Firestore:", error);
  alert("Gagal menghapus transaksi dari penyimpanan online.");
}
}

// Aktifkan pencarian
document
  .getElementById("searchTransaction")
  .addEventListener("input", tampilkanData);


function tampilkanLaporan() {
  const sekarang = new Date();

const bulanIni =
  sekarang.getFullYear() + "-" +
  String(sekarang.getMonth() + 1).padStart(2, "0");

  const transaksiBulanIni = transaksi.filter(function(item) {
    return item.tanggal.startsWith(bulanIni);
  });

  let totalMasuk = 0;
  let totalKeluar = 0;

  transaksiBulanIni.forEach(function(item) {
    if (item.jenis === "masuk") {
      totalMasuk += item.nominal;
    } else {
      totalKeluar += item.nominal;
    }
  });

  const total = totalMasuk + totalKeluar;
  const jumlah = transaksiBulanIni.length;

  document.getElementById("totalTransaksi").textContent =
    jumlah;

  document.getElementById("laporanPemasukan").textContent =
    rupiah(totalMasuk);

  document.getElementById("laporanPengeluaran").textContent =
    rupiah(totalKeluar);

  const persenMasuk = total === 0
    ? 0
    : Math.round(totalMasuk / total * 100);

  const persenKeluar = total === 0
    ? 0
    : Math.round(totalKeluar / total * 100);

  document.getElementById("persenMasuk").textContent =
    persenMasuk + "%";

  document.getElementById("persenKeluar").textContent =
    persenKeluar + "%";

  document.getElementById("barMasuk").style.width =
    persenMasuk + "%";

  document.getElementById("barKeluar").style.width =
    persenKeluar + "%";
}


function eksporPDF() {
  // Periksa library PDF
  if (!window.jspdf) {
    alert("Library PDF belum berhasil dimuat!");
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Mengambil bulan lokal
    const sekarang = new Date();

    const bulanIni =
      sekarang.getFullYear() + "-" +
      String(sekarang.getMonth() + 1).padStart(2, "0");

    // Mengambil transaksi bulan ini
    const dataBulanIni = transaksi.filter(function(item) {
      return item.tanggal.startsWith(bulanIni);
    });

    // Menghitung total
    let totalMasuk = 0;
    let totalKeluar = 0;

    dataBulanIni.forEach(function(item) {
      if (item.jenis === "masuk") {
        totalMasuk += item.nominal;
      } else {
        totalKeluar += item.nominal;
      }
    });

    function formatPDF(angka) {
      return "Rp " +
        new Intl.NumberFormat("id-ID").format(angka);
    }

    // Judul laporan
    doc.setFontSize(20);
    doc.text("CATATUANG", 15, 20);

    doc.setFontSize(12);
    doc.text("Laporan Keuangan Bulanan", 15, 30);
    doc.text("Periode: " + bulanIni, 15, 38);

    // Ringkasan
    doc.setFontSize(11);
    doc.text("Total Transaksi: " + dataBulanIni.length, 15, 52);
    doc.text("Pemasukan: " + formatPDF(totalMasuk), 15, 60);
    doc.text("Pengeluaran: " + formatPDF(totalKeluar), 15, 68);
    doc.text("Saldo: " + formatPDF(totalMasuk - totalKeluar), 15, 76);

    doc.line(15, 83, 195, 83);

    // Daftar transaksi
    doc.setFontSize(13);
    doc.text("Daftar Transaksi", 15, 93);

    let y = 103;
    doc.setFontSize(9);

    if (dataBulanIni.length === 0) {
      doc.text("Belum ada transaksi bulan ini.", 15, y);
    }

    dataBulanIni.forEach(function(item, index) {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      const jenis =
        item.jenis === "masuk"
          ? "Pemasukan"
          : "Pengeluaran";

      doc.text(
        (index + 1) + ". " + item.keterangan,
        15, y
      );

      doc.text("Kategori: " + item.kategori, 20, y + 6);
      doc.text("Tanggal: " + item.tanggal, 20, y + 12);
      doc.text(
        jenis + ": " + formatPDF(item.nominal),
        20, y + 18
      );

      y += 27;
    });

    // Unduh PDF
    doc.save("CatatUang-Laporan-" + bulanIni + ".pdf");

  } catch (error) {
    alert("Gagal membuat PDF: " + error.message);
    console.error(error);
  }
}
// Jembatan antara aplikasi dan Firebase
window.CatatUangApp = {
  getTransactions: function() {
    return transaksi;
  },

  setTransactions: function(data) {
    transaksi = data;

    localStorage.setItem(
      "catatUangData",
      JSON.stringify(transaksi)
    );

    tampilkanData();
  }
};

// =========================
// NAVIGASI 4 HALAMAN
// =========================

const navHome = document.getElementById("navHome");
const navTransactions = document.getElementById("navTransactions");
const navReports = document.getElementById("navReports");
const navSettings = document.getElementById("navSettings");

// Mengambil semua halaman
const homePage = document.getElementById("homePage");
const transactionsPage = document.getElementById("transactionsPage");
const reportsPage = document.getElementById("reportsPage");
const settingsPage = document.getElementById("settingsPage");

// Fungsi berpindah halaman
function bukaHalaman(halaman, tombol) {

  // Sembunyikan semua halaman
  document.querySelectorAll(".page").forEach(function(item) {
    item.classList.remove("active");
  });

  // Tampilkan halaman yang dipilih
  halaman.classList.add("active");

  // Atur tombol navigasi
  document.querySelectorAll("nav div").forEach(function(item) {
    item.classList.remove("active");
  });

  tombol.classList.add("active");

  // Kembali ke posisi atas
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// Beranda
navHome.addEventListener("click", function() {
  bukaHalaman(homePage, navHome);
});

// Transaksi
navTransactions.addEventListener("click", function() {
  bukaHalaman(transactionsPage, navTransactions);
});

// Laporan
navReports.addEventListener("click", function() {
  bukaHalaman(reportsPage, navReports);
});

// Pengaturan
navSettings.addEventListener("click", function() {
  bukaHalaman(settingsPage, navSettings);
});
// Mendaftarkan Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("./sw.js")
      .then(function() {
        console.log("CatatUang siap digunakan sebagai PWA");
      })
      .catch(function(error) {
        console.error("Service Worker gagal:", error);
      });
  });
}

// Jalankan aplikasi
tampilkanData();