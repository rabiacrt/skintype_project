const firebaseConfig = {
  apiKey: "AIzaSyB7rtQ4UfqrbWTSZiGsGtIJP_JmVi-VP3Q",
  authDomain: "bitirme-e59ed.firebaseapp.com",
  projectId: "bitirme-e59ed",
  storageBucket: "bitirme-e59ed.appspot.com",
  messagingSenderId: "1050424184852",
  appId: "1:1050424184852:web:eec13235993c41bba51701",
  measurementId: "G-536RM71HM0",
  databaseURL: "https://bitirme-e59ed-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

let currentUser = null;

auth.onAuthStateChanged(user => {
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
const signIn = document.getElementById("signIn");
const signUp = document.getElementById("signUp");
const logOut = document.getElementById('logoutBtn')

signIn.addEventListener("click", e => {
 
  console.log("Giriş yapılıyor...");

  logOut.style.display = "block";
  signIn.style.display = "none";
  signUp.style.display = "none";
  

})

signUp.addEventListener("click", e => {
  e.preventDefault();
  console.log("Giriş yapılıyor...");

  logOut.style.display = "block";
  signUp.style.display = "none";
  signIn.style.display = "none";
  

})

// 🔍 Görsel ön izleme
function handlePreview(input, previewElement) {
  input.addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        previewElement.src = e.target.result;
        previewElement.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
}

handlePreview(yanakInput, previewYanak);
handlePreview(ondenInput, previewOnden);

// 🔎 Analiz butonuna tıklanınca
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

    resultDiv.innerHTML = `<strong>Cilt Tipiniz:</strong> ${label}`;

    // 🔒 Sonuçları localStorage'a kaydet (kullanıcı sonra "Sonuçlarım"da görecek)
    localStorage.setItem('sonAnaliz', JSON.stringify({ result, label, ciltTipi }));

    // 🔐 Firebase'e kayıt
    if (currentUser) {
      const timestamp = new Date().toISOString();
      const avoidData = await fetch('static/veriler/avoid_icerikler.json').then(res => res.json());
      const avoidList = avoidData[ciltTipi]?.avoid || [];

      const resultToSave = {
        tarih: timestamp,
        kullanici: currentUser.email,
        cilt_tipi: label,
        urun_tipleri: result.urun_tipleri,
        onerilmeyen_icerikler: avoidList
      };

      database.ref(`analizSonuclari/${currentUser.uid}`).push(resultToSave);
    }

  } catch (error) {
    console.error('Hata:', error);
    alert('Sunucuyla bağlantı kurulamadı.');
  }
});
document.getElementById('viewResultsBtn').addEventListener('click', async () => {
  if (!currentUser) {
    alert('Bu sayfayı görmek için giriş yapmalısınız.');
    return;
  }

  const analizData = JSON.parse(localStorage.getItem('sonAnaliz'));
  if (!analizData) {
    alert('Önce bir analiz yapmalısınız.');
    return;
  }

  const { result, ciltTipi, label } = analizData;

  // İçerik önerileri
  const urunTipleri = result.urun_tipleri || {};
  let html = '';
  for (const [urunTipi, data] of Object.entries(urunTipleri)) {
    html += `<h3>${urunTipi.charAt(0).toUpperCase() + urunTipi.slice(1)} İçin Önerilen İçerikler</h3>`;

    if (data.onerilen_icerikler?.length > 0) {
      html += '<ul>';
      data.onerilen_icerikler.forEach(item => {
        html += `<li><strong>${item.icerik}</strong> (${item.adet} kez)</li>`;
      });
      html += '</ul>';
    } else {
      html += '<p>Önerilen içerik bulunamadı.</p>';
    }

    if (data.icerik_gruplari?.length > 0) {
      html += '<h4>İçerik Grupları</h4><ul>';
      data.icerik_gruplari.forEach(grup => {
        html += `<li><strong>${grup.grup}</strong> (${grup.adet} içerik)</li>`;
      });
      html += '</ul>';
    }

    if (data.kacinilmasi_gerekenler?.length > 0) {
      html += '<h4>Kaçınılması Gereken İçerikler</h4><ul>';
      data.kacinilmasi_gerekenler.forEach(icerik => {
        html += `<li>${icerik}</li>`;
      });
      html += '</ul>';
    }
  }
  container.innerHTML = html || '<p>İçerik önerisi bulunamadı.</p>';

  // Ürün önerileri
  const icerikData = await fetch('static/veriler/icerikler.json').then(res => res.json());
  const filtrelenmis = icerikData.filter(item => {
    const jsonTip = item.cilt_tipi?.toLowerCase().trim();
    return jsonTip?.includes(ciltTipi);
  });

  urunContainer.innerHTML = filtrelenmis.length > 0
    ? `<h2>${label} için Önerilen Ürünler</h2>`
    : `<h2>Önerilen ürün bulunamadı.</h2>`;

  filtrelenmis.forEach(urun => {
    const div = document.createElement('div');
    div.className = 'kart';
    div.innerHTML = `
      <h3>${urun.urun_adi}</h3>
      <p><strong>Ürün Tipi:</strong> ${urun.urun || 'Belirtilmemiş'}</p>
    `;
    urunContainer.appendChild(div);
  });

  // Avoid içerikleri
  const avoidData = await fetch('static/veriler/avoid_icerikler.json').then(res => res.json());
  const avoidList = avoidData[ciltTipi]?.avoid || [];

  if (avoidList.length > 0) {
    const avoidDiv = document.createElement('div');
    avoidDiv.innerHTML = `<h2 style="margin-top:30px;">${label} Cilt Tipi için Önerilmeyen İçerikler</h2><ul>`;
    avoidList.forEach(item => {
      avoidDiv.innerHTML += `
        <li style="margin-bottom:10px;">
          <strong>${item.ingredient}</strong>: ${item.reason}<br>
          <em>Yaygın bulunduğu ürünler:</em> ${item.common_in.join(', ')}
        </li>
      `;
    });
    avoidDiv.innerHTML += '</ul>';
    urunContainer.appendChild(avoidDiv);
  }
});

logOut.addEventListener('click', () => {
  auth.signOut().then(() => {
    alert("Çıkış yapıldı. Ana sayfaya yönlendiriliyorsunuz.");
    window.location.href = "/"; // Varsa giriş sayfasına yönlendir
  }).catch((error) => {
    console.error("Çıkış hatası:", error);
  });
});
