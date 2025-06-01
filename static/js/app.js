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
const avoidContainer = document.getElementById('avoid-icerikler');
const signIn = document.getElementById("signIn");
const signUp = document.getElementById("signUp");
const logOut = document.getElementById('logoutBtn')
const searchBtn = document.getElementById('searchBtn');
const mainContainer = document.getElementById('main-container');
const searchContainer = document.getElementById('search-container');
const homeBtn = document.getElementById('homeBtn');
const settingsBtn = document.querySelector('.settingsBtn');
const settings = document.querySelector('.settings');
const skinTypeDiv = document.getElementById('skin-type');
const skinImageSettings1 = document.getElementById('skin-image-settings1');
const skinImageSettings2 = document.getElementById('skin-image-settings2');



firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    signIn.style.display = "none";
    signUp.style.display = "none";
    logOut.style.display = "block";
  } else {
    signIn.style.display = "block";
    signUp.style.display = "block";
    logOut.style.display = "none";
  }
});

logOut.onclick = () => {
  firebase.auth().signOut().then(() => location.reload());
};

const lastResults = JSON.parse(localStorage.getItem('sonAnaliz'));
if (lastResults) {
  const { label, ciltTipi } = lastResults;
  skinTypeDiv.innerHTML = `${label}`;
}

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

    // Sonuçları localStorage'a kaydet (kullanıcı sonra "Sonuçlarım"da görecek)
    localStorage.setItem('sonAnaliz', JSON.stringify({ result, label, ciltTipi}));

    // Firebase'e kayıt
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
    resultDiv.innerHTML = `<strong>Analiz Sonucu:</strong> ${label}`;

    // İçerik Önerileri
    const urunTipleri = result.urun_tipleri || {};
    let html = '';
    for (const [urunTipi, data] of Object.entries(urunTipleri)) {
      html += `<div class="urun-tipi-container">`;
      html += `<div class="urun-tipi">`;
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
      html += `</div>`;

      if (data.icerik_gruplari.length > 0) {
        html += `<div class="urun-tipi">`;
        html += '<h4>İçerik Grupları</h4><ul>';
        data.icerik_gruplari.forEach(grup => {
          html += `<li><strong>${grup.grup}</strong> (${grup.adet} içerik)</li>`;
        });
        html += '</ul>';
        html += `</div>`;
      }

      if (data.kacinilmasi_gerekenler && data.kacinilmasi_gerekenler.length > 0) {
        html += `<div class="urun-tipi">`;
        html += `<h4>Kaçınılması Gereken İçerikler</h4><ul>`;
        data.kacinilmasi_gerekenler.forEach(icerik => {
          html += `<li>${icerik}</li>`;
        });
        html += `</ul>`;
        html += `</div>`;
      }
      html += `</div>`;
    }
    container.innerHTML = html || '<p>İçerik önerisi bulunamadı.</p>';

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


    const filtrelenmisUrunler = data.filter(urun =>
      urun.cilt_tipi?.toLowerCase() === ciltTipi.toLowerCase()
    );

    const gosterilecekUrunler = filtrelenmisUrunler.length > 0 ? filtrelenmisUrunler : data;

    gosterilecekUrunler.forEach(urun => {
      const icerik = urun.icerik?.toLowerCase() || "";
      let puan = 100;

      zararliIcerikler.forEach(zararlilar => {
        if (icerik.includes(zararlilar)) {
          puan -= 5;
        }
      });

      urun.puan = puan;
    });

  // Aynı şekilde kategorilere göre grupla
  const kategorilereGore = {};
  gosterilecekUrunler.forEach(urun => {
    const kategori = urun.urun || 'diğer';
    if (!kategorilereGore[kategori]) {
      kategorilereGore[kategori] = [];
    }
    kategorilereGore[kategori].push(urun);
  });
  
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

  // Avoid içerikleri
  const avoidData = await fetch('static/veriler/avoid_icerikler.json').then(res => res.json());
  const avoidList = avoidData[ciltTipi]?.avoid || [];

  if (avoidList.length > 0) {
    avoidContainer.innerHTML = ''; 
    const avoidDiv = document.createElement('div');
    avoidDiv.innerHTML = " ";
    avoidDiv.className = 'avoid';
    let html = `<h2 style="margin-top:30px;">${label} Cilt Tipi için Önerilmeyen İçerikler</h2>`;
    html += `<ul>`;
    avoidList.forEach(item => {
      html += `
        <li style="margin-bottom:10px;">
          <strong>${item.ingredient}</strong>: ${item.reason}<br>
          <em>Yaygın bulunduğu ürünler:</em> ${item.common_in.join(', ')}
        </li>`;
    });
    html += `</ul>`;
    avoidDiv.innerHTML = html;
    avoidContainer.appendChild(avoidDiv);
  }

});

searchBtn.addEventListener('click', (e) => {
  e.preventDefault();
  mainContainer.style.display = 'none';
  searchContainer.style.display = 'block';
  settings.style.display = 'none';

});

homeBtn.addEventListener('click', (e) => {
  e.preventDefault();
  mainContainer.style.display = 'block';
  searchContainer.style.display = 'none';
  settings.style.display = 'none';
});


logOut.addEventListener('click', () => {
  auth.signOut().then(() => {
    alert("Çıkış yapıldı. Ana sayfaya yönlendiriliyorsunuz.");
    window.location.href = "/"; // Varsa giriş sayfasına yönlendir
  }).catch((error) => {
    console.error("Çıkış hatası:", error);
  });
});



document.addEventListener("DOMContentLoaded", () => {
  const data = {
    "vitamin c": {
      "unusable": [
        { with: "Niacinamide", reason: "Vitamin C'nin etkinliğini ciddi ölçüde azaltabilir." }
      ],
      "image": "/static/images/vitaminc.png"
    },
    "retinoids": {
      "unusable": [
        { with: "Acids (AHAs, BHAs)", reason: "Cildi aşırı hassaslaştırır; birlikte kullanılmamalı." },
        { with: "Benzoyl Peroxide", reason: "Retinoid'in etkinliğini azaltır; birlikte kullanılmamalı." }
      ],
      "image": "/static/images/retinoids.png"
    },
    "beta-hydroxy acid (bha)": {
      "unusable": [
        { with: "Alpha-Hydroxy Acid (AHA)", reason: "Tahriş ve kuruluk yaratabilir." }
      ],
      "image": "/static/images/bha.png"
    }
  };

  const ingredientListDiv = document.getElementById("ingredientList");
  const ingredientResultContainer = document.getElementById("ingredientResults");
  const searchInput = document.getElementById("searchInput");

  const allIngredients = Object.keys(data);

function renderButtons(filteredIngredients) {
  ingredientListDiv.innerHTML = "";
  filteredIngredients.forEach(item => {
    const ingredientData = data[item];
    const card = document.createElement("div");
    card.className = "ingredient-card";
    card.onclick = () => showConflicts(item);

    card.innerHTML = `
      <img src="${ingredientData.image}" alt="${item}">
      <div class="line-container">
        <div class="ball"></div>
        <div class="line"></div>
      </div>
      <div class="ingredient-info">
        <div class="ingredient-name">${capitalize(item)}</div>
        <div class="ingredient-description">İçerik hakkında bilgi görmek için tıkla.</div>
      </div>
    `;
    
    ingredientListDiv.appendChild(card);
  });
}


  function showConflicts(ingredientKey) {
    const normalized = ingredientKey.toLowerCase();
    const conflicts = data[normalized]?.unusable || [];

    const modal = document.getElementById("conflictModal");
    const modalBody = document.getElementById("modalBody");

    if (conflicts.length === 0) {
      modalBody.innerHTML = `<div>🎉 <b>${capitalize(normalized)}</b> ile ilgili herhangi bir uyumsuzluk bulunamadı.</div>`;
    } else {
      const list = conflicts.map(item =>
        `<div class="warning">⚠️ <b>${capitalize(normalized)}</b> ile <b>${item.with}</b>: ${item.reason}</div>`
      ).join("");
      modalBody.innerHTML = `<h3>Uyumsuz İçerikler</h3>${list}`;
    }

    modal.style.display = "block";
  }
  const closeBtn = document.getElementById("closeModal");
  const modal = document.getElementById("conflictModal");

  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  window.onclick = event => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase();
    const filtered = allIngredients.filter(i => i.includes(keyword));
    renderButtons(filtered);
    ingredientResultContainer.innerHTML = "";
  });

  // İlk başta tüm içerikleri göster
  renderButtons(allIngredients);
});

const userEmail = document.querySelector('.user-email');


settingsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  mainContainer.style.display = 'none';
  searchContainer.style.display = 'none';
  settings.style.display = 'block';

  userEmail.textContent = currentUser ? `${currentUser.email}` : 'Giriş yapmadınız.';

  const localAnalizData = JSON.parse(localStorage.getItem('sonAnaliz'));
  console.log(localAnalizData);

    if (localAnalizData) {
    const { ciltTipi, label, result } = localAnalizData;

  } else {
    settings.innerHTML += `<p>Analiz verisi bulunamadı.</p>`;
  }


});

