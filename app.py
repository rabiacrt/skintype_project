from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from io import BytesIO
from PIL import Image
import tensorflow as tf
import numpy as np
import json
from collections import Counter
import firebase_admin
from firebase_admin import credentials, firestore
import re
from static.veriler.equivalents import equivalents 

app = Flask(__name__)
app.secret_key = 'bu_cok_gizli_ve_uzun_bir_anahtar_olmalı_1234!'  

if not firebase_admin._apps:
    cred = credentials.Certificate("bitirme-e59ed-firebase-adminsdk-fbsvc-d8e9916e10.json")  
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://bitirme-e59ed-default-rtdb.firebaseio.com/'
    })

db = firestore.client()

model = tf.keras.models.load_model('skin_type_classifier8.h5')

with open("static/veriler/icerikler.json", "r", encoding="utf-8") as f:
    data = json.load(f)

   
esanlamlilar = equivalents

icerik_gruplari = {
    "aqua/water": "baz",
    "glycerine": "nemlendirici",
    "niacinamide": "aktif",
    "parfum": "parfüm",
    "phenoxyethanol": "koruyucu",
    "alcohol": "alkol",
}

kullanici_alergileri = {"parfum", "alcohol"}

def is_valid_content(text):
    return bool(re.search(r'[a-zA-Z0-9]', text))

def en_cok_gecen_icerikler(veri, urun_tipi, cilt_tipi):
    icerik_sayac = Counter()
    grup_sayac = Counter()

    for urun in veri:
        urun_adi = urun.get("urun_adi", "").lower()
        urun_turu = urun.get("urun", "").lower()
        cilt = urun.get("cilt_tipi", "").lower()
        icerik_str = urun.get("icerik", "")

        if urun_turu == urun_tipi and cilt_tipi in cilt:
            maddeler = [madde.strip().lower() for madde in icerik_str.split(",")]
            for madde in maddeler:
                madde = esanlamlilar.get(madde, madde)
                if not is_valid_content(madde):
                    continue    
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
    
def get_user_by_email(email):
    ref = db.reference('kullanicilar')
    kullanicilar = ref.get()
    
    if not kullanicilar:
        return None, None
    
    for uid, user_data in kullanicilar.items():
        if user_data.get('email') == email:
            return uid, user_data
    
    return None, None


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/sessionLogin', methods=['POST'])
def session_login():
    id_token = request.json.get('idToken')
    try:
        decoded_token = firebase_admin.auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        session['uid'] = uid
        return jsonify({"status": "success"})
    except:
        return jsonify({"status": "error"}), 401



@app.route('/login', methods=['POST'])
def login_post():
    email = request.form.get('email')
    password = request.form.get('password')
    

    
    uid, user_data = get_user_by_email(email)
    if uid is None:
        return "Kullanıcı bulunamadı veya şifre yanlış", 401
    
    session['uid'] = uid
    return redirect(url_for(''))



@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))


@app.route('/signup')
def signup():
    return render_template('signup.html')

@app.route("/search", methods=["POST"])
def search_product():
    urun_verileri = request.json
    aranan_urun = urun_verileri.get("urun_adi", "").lower()

    if not aranan_urun:
        return jsonify({"error": "Lütfen ürün adı girin."}), 400


    bulunan_urun = None
    for urun in data.get("urunler", []):
        if aranan_urun in urun.get("urun_adi", "").lower():
            bulunan_urun = urun
            break

    if not bulunan_urun:
        return jsonify({"message": "Ürün bulunamadı."}), 404

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

        if onden_label == "yağlı" and yanak_label in ["kuru", "normal"]:
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
