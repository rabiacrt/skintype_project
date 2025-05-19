
// 🔹 Firebase Başlat
const firebaseConfig = {
 apiKey: "AIzaSyB7rtQ4UfqrbWTSZiGsGtIJP_JmVi-VP3Q",
    authDomain: "bitirme-e59ed.firebaseapp.com",
    projectId: "bitirme-e59ed",
    storageBucket: "bitirme-e59ed.firebasestorage.app",
    messagingSenderId: "1050424184852",
    appId: "1:1050424184852:web:eec13235993c41bba51701",
    measurementId: "G-536RM71HM0",
    databaseURL: "https://bitirme-e59ed-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

let currentUser = null;

// 🔐 Kullanıcıyı kontrol et
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    currentUser = {
      uid: user.uid,
      email: user.email
    };
  } else {
    currentUser = null;
  }
});

// 🔍 HTML elementleri
const yanakInput = document.getElementById('fileInputYanak');
const ondenInput = document.getElementById('fileInputOnden');
const previewYanak = document.getElementById('previewYanak');
const previewOnden = document.getElementById('previewOnden');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultDiv = document.getElementById('result');
const container = document.getElementById('icerik-onerileri');
const urunContainer = document.getElementById('urun-onerileri');

// 🔍 Ön izleme
function handlePreview(input, previewElement) {
  input.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewElement.src = e.target.result;
        previewElement.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
}



handlePreview(yanakInput, previewYanak);
handlePreview(ondenInput, previewOnden);

// Analiz butonuna tıklanınca
analyzeBtn.addEventListener('click', async () => {
  const yanakFile = yanakInput.files[0];
  const ondenFile = ondenInput.files[0];

  if (!yanakFile || !ondenFile) {
    alert('Lütfen hem yanak hem de önden yüz fotoğrafı seçin.');
    return;
  }

  const formData = new FormData();
  formData.append('image1', yanakFile);
  formData.append('image2', ondenFile);

  try {
    const response = await fetch('http://127.0.0.1:5000/predict', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      alert('Sunucudan geçerli bir yanıt alınamadı.');
      return;
    }

    const result = await response.json();
    const label = result.final_label || 'Bilinmiyor';
    const ciltTipi = label.toLowerCase().trim();

    // Cilt tipi sonucunu göster
    resultDiv.innerHTML = `<strong>Cilt Tipiniz:</strong> ${label}`;

    // Eğer kullanıcı giriş yaptıysa, verileri kaydet ve /bakim sayfasına yönlendir
    if (currentUser) {
      // 🔥 Firebase’e yaz
      const userRef = database.ref("kullanicilar/" + currentUser.uid);

      // JSON’dan veri oku
      const veriResponse = await fetch('static/veriler/birlesik_veri.json');
      const data = await veriResponse.json();

      const urunler = data.urunler.filter(
        item => item.cilt_tipi.toLowerCase() === ciltTipi
      );
      const kacinilacaklar = data.ciltTipleri[ciltTipi]?.kacinilmasiGerekenler || [];

      const userData = {
        email: currentUser.email,
        cilt_tipi: label,
        onerilen_urunler: urunler.map(urun => ({
          urun_adi: urun.urun_adi,
          piyasa_adi: urun.piyasa_adi
        })),
        kacinilmasi_gerekenler: kacinilacaklar
      };

      await userRef.set(userData);
      console.log("Kullanıcı verileri Firebase'e kaydedildi.");
      
      // → Bakım sayfasına yönlendir
      window.location.href = "/bakim";

    } else {
      // Giriş yapılmamışsa sadece uyarı göster ve diğer kısımları gizle
      resultDiv.innerHTML += `
        <div style="margin-top: 15px; padding: 10px; background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; border-radius: 5px;">
          <span style="font-size: 1.2em;">🔒</span> 
          Bu cilt tipine özel <strong>cilt bakımı önerilerini</strong> görebilmek için 
          <a href="/signup" style="color: #007bff;"><strong>kayıt olun</strong></a> veya 
          <a href="/login" style="color: #007bff;"><strong>giriş yapın</strong></a>.
        </div>
      `;
      container.innerHTML = '';
      urunContainer.innerHTML = '';
    }

  } catch (error) {
    console.error('Sunucu hatası:', error);
    alert('Sunucuyla bağlantı kurulamadı.');
  }
});
