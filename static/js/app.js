const yanakInput = document.getElementById('fileInputYanak');
const ondenInput = document.getElementById('fileInputOnden');
const previewYanak = document.getElementById('previewYanak');
const previewOnden = document.getElementById('previewOnden');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultDiv = document.getElementById('result');
const container = document.getElementById('icerik-onerileri');
const urunContainer = document.getElementById('urun-onerileri');

// Görsel ön izleme
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
    resultDiv.innerHTML = `<strong>Analiz Sonucu:</strong> ${label}`;

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
        const filtrelenmis = data.filter(item => {
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
      });

  } catch (error) {
    console.error('Hata:', error);
    alert('Sunucuyla bağlantı kurulamadı.');
  }
});
