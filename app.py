from flask import Flask, request, jsonify, render_template
from io import BytesIO
from PIL import Image
import tensorflow as tf
import numpy as np
import json
from collections import Counter

app = Flask(__name__)

# 🔹 Modeli yükle
model = tf.keras.models.load_model('skin_type_classifier7.h5')

# 🔹 JSON verisini oku
with open("static/veriler/icerikler.json", "r", encoding="utf-8") as f:
    data = json.load(f)

   


# 🔹 Eşanlamlılar ve gruplar
esanlamlilar = {
    "aqua(water)": "aqua/water",
    "aqua (water)": "aqua/water",
    "aqua": "aqua/water",
    "water": "aqua/water",
    "glycerin": "glycerine",
}

icerik_gruplari = {
    "aqua/water": "baz",
    "glycerine": "nemlendirici",
    "niacinamide": "aktif",
    "parfum": "parfüm",
    "phenoxyethanol": "koruyucu",
    "alcohol": "alkol",
}

kullanici_alergileri = {"parfum", "alcohol"}

def en_cok_gecen_icerikler(veri, urun_tipi, cilt_tipi):
    icerik_sayac = Counter()
    grup_sayac = Counter()

    for urun in veri:
        urun_adi = urun.get("urun_adi", "").lower()
        cilt = urun.get("cilt_tipi", "").lower()
        icerik_str = urun.get("icerik", "")

        if urun_tipi in urun_adi and cilt_tipi in cilt:
            maddeler = [madde.strip().lower() for madde in icerik_str.split(",")]
            for madde in maddeler:
                madde = esanlamlilar.get(madde, madde)
                if madde not in kullanici_alergileri:
                    icerik_sayac[madde] += 1
                    grup = icerik_gruplari.get(madde, "diğer")
                    grup_sayac[grup] += 1

    return icerik_sayac.most_common(5), grup_sayac.most_common(3)

def tahmin_yap(img):
    img = img.resize((224, 224))
    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    prediction = model.predict(img_array)
    predicted_class = np.argmax(prediction, axis=1)[0]

    if predicted_class == 0:
        return "kuru"
    elif predicted_class == 1:
        return "normal"
    elif predicted_class == 2:
        return "yağlı"
    else:
        return "bilinmeyen"

@app.route('/')
def index():
    return render_template('index.html')

@app.route("/search", methods=["POST"])
def search_product():
    urun_verileri = request.json
    aranan_urun = urun_verileri.get("urun_adi", "").lower()

    if not aranan_urun:
        return jsonify({"error": "Lütfen ürün adı girin."}), 400

    # Ürünleri ara
    bulunan_urun = None
    for urun in data.get("urunler", []):
        if aranan_urun in urun.get("urun_adi", "").lower():
            bulunan_urun = urun
            break

    if not bulunan_urun:
        return jsonify({"message": "Ürün bulunamadı."}), 404

    # Bulunan ürünün içerik bilgilerini dön
    return jsonify({
        "urun_adi": bulunan_urun.get("urun_adi"),
        "icerik": bulunan_urun.get("icerik", [])
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        image1 = request.files.get('image1')  # yanak
        image2 = request.files.get('image2')  # önden

        if not image1 or not image2:
            return jsonify({'error': 'İki görsel gerekli.'}), 400

        img1 = Image.open(BytesIO(image1.read()))
        img2 = Image.open(BytesIO(image2.read()))

        yanak_label = tahmin_yap(img1)
        onden_label = tahmin_yap(img2)

        if yanak_label == "kuru":
            final_label = "karma"
        else:
            final_label = onden_label

        urun_tipleri = ["nemlendirici", "jel", "tonik"]
        sonuclar = {}

        for urun_tipi in urun_tipleri:
            populer, gruplar = en_cok_gecen_icerikler(data, urun_tipi, final_label)
            sonuclar[urun_tipi] = {
                'onerilen_icerikler': [{ 'icerik': i, 'adet': a } for i, a in populer],
                'icerik_gruplari': [{ 'grup': g, 'adet': a } for g, a in gruplar]
            }

        return jsonify({
            'yanak': yanak_label,
            'onden': onden_label,
            'final_label': final_label,
            'urun_tipleri': sonuclar
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
