
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

    // İçerik Önerileri
    const urunTipleri = result.urun_tipleri || {};
    let html = '';
    for (const [urunTipi, data] of Object.entries(urunTipleri)) {
      html += `<h3>${urunTipi.charAt(0).toUpperCase() + urunTipi.slice(1)} İçin Önerilen İçerikler</h3>`;

      if (data.onerilen_icerikler.length > 0) {
        html += '<ul>';
        data.onerilen_icerikler.forEach(item => {
          html += `<li><strong>${item.icerik}</strong> (${item.adet} kez)</li>`;
        });
        html += '</ul>';
      } else {
        html += '<p>Önerilen içerik bulunamadı.</p>';
      }

      if (data.icerik_gruplari.length > 0) {
        html += '<h4>İçerik Grupları</h4><ul>';
        data.icerik_gruplari.forEach(grup => {
          html += `<li><strong>${grup.grup}</strong> (${grup.adet} içerik)</li>`;
        });
        html += '</ul>';
      }

      if (data.kacinilmasi_gerekenler && data.kacinilmasi_gerekenler.length > 0) {
        html += `<h4>Kaçınılması Gereken İçerikler</h4><ul>`;
        data.kacinilmasi_gerekenler.forEach(icerik => {
          html += `<li>${icerik}</li>`;
        });
        html += `</ul>`;
      }
    }
    container.innerHTML = html || '<p>İçerik önerisi bulunamadı.</p>';

    // Ürün Önerileri
    const ciltTipi = label.toLowerCase().trim().split(' ')[0];
    console.log("Cilt tipi (filtreleme için):", ciltTipi);

    fetch('static/veriler/icerikler.json')
    .then(res => res.json())
    .then(data => {
      const zararliIcerikler = [
        "Methylisothiazolinone",
        "Methylchloroisothiazolinone",
        "Butylated Hydroxyanisole (BHA)",
        "Butylated Hydroxytoluene (BHT)",
        "Formaldehyde-releasing Preservatives",
        "Imidazolidinyl Urea",
        "Diazolidinyl Urea",
        "Sunscreen Chemicals",
        "Parabens (e.g., Methylparaben)",
        "Propylparaben",
        "Phthalates (e.g., Dibutyl Phthalate)",
        "Diethyl Phthalate",
        "Lead (in certain color additives)",
        "Mercury (in some skin-lightening products)",
        "Coal tar (found in some hair dyes)",
        "Fragrance",
        "Triclosan",
        "Talc",
        "Mineral oils",
        "Ethanolamines (MEA, DEA, TEA)",
        "Microplastics",
        "Nanoparticles",
        "Hydroquinone",
        "Oxybenzone",
        "Sodium Lauryl Sulfate (SLS)",
        "Toluene",
        "Resorcinol",
        "Polyethylene Glycols (PEGs)",
        "Formaldehyde",
        "Retinyl Palmitate (Vitamin A)",
        "Artificial fragrance chemicals",
        "Ammonia",
        "Fragrance",
        "Heavy Oils",
        "Coconut Oil",
        "Sulfates (Sodium Lauryl Sulfate)"
        
        
      ].map(item => item.toLowerCase());
  
    // Puan hesapla
    data.forEach(urun => {
      const icerik = urun.icerik?.toLowerCase() || "";
      let puan = 100;

      zararliIcerikler.forEach(zararlilar => {
        if (icerik.includes(zararlilar)) {
          puan -= 5;
        }
      });

      urun.puan = puan;
    });

    // Kategorilere göre grupla
    const kategorilereGore = {};
    data.forEach(urun => {
      const kategori = urun.urun || 'diğer';
      if (!kategorilereGore[kategori]) {
        kategorilereGore[kategori] = [];
      }
      kategorilereGore[kategori].push(urun);
    });

    // DOM'a yazdır
    urunContainer.innerHTML = `<h2>En İyi ve Daha Az İyi Ürünler</h2>`;

    for (const kategori in kategorilereGore) {
      const grup = kategorilereGore[kategori];
      const sirali = grup.sort((a, b) => b.puan - a.puan); // yüksekten düşüğe

      // En iyi 3
      const enIyi = sirali.slice(0, 3);
      // En kötü 3
      const enKotu = sirali.slice(-3).reverse(); // tersten al ki düşük puanlılar yukarıda gözüksün

      const baslik = document.createElement('h3');
      baslik.textContent = kategori.toUpperCase();
      urunContainer.appendChild(baslik);

      const iyiBaslik = document.createElement('p');
      iyiBaslik.textContent = '✅ En İyi 3 Ürün:';
      urunContainer.appendChild(iyiBaslik);

      enIyi.forEach(urun => {
        const div = document.createElement('div');
        div.className = 'kart iyi';
        div.innerHTML = `
          <h4>${urun.urun_adi}</h4>
          <p><strong>Puan:</strong> ${urun.puan}</p>
         
        `;
        urunContainer.appendChild(div);
      });

      const kotuBaslik = document.createElement('p');
      kotuBaslik.textContent = '❌ Daha Az İyi 3 Ürün:';
      urunContainer.appendChild(kotuBaslik);

      enKotu.forEach(urun => {
        const div = document.createElement('div');
        div.className = 'kart kotu';
        div.innerHTML = `
          <h4>${urun.urun_adi}</h4>
          <p><strong>Puan:</strong> ${urun.puan}</p>
          
        `;
        urunContainer.appendChild(div);
      });
    }
  });

  } catch (error) {
    console.error('Sunucu hatası:', error);
    alert('Sunucuyla bağlantı kurulamadı.');
  }
});
