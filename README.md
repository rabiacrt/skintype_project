🌟 Let It Glow – Skin Type Classification Web App

Let It Glow is a web application that uses deep learning to classify skin types from uploaded images. The application is designed to be user-friendly and can predict whether a person's skin is dry, oily, normal, or combination based on facial image input.

🚀 Features

Upload an image to detect skin type

Deep learning model based on MobileNetV2

Lightweight and fast

Clean and simple HTML/CSS interface

Runs locally using Flask

💄 Product Recommendation

Based on the detected skin type, the app suggests basic skincare product types (e.g., cleanser, moisturizer) tailored for:

Dry Skin → Hydrating and rich moisturizers

Oily Skin → Lightweight and non-comedogenic products

Normal Skin → Balanced formulas

Combination Skin → Zone-specific care recommendations

🧠 Model

Architecture: MobileNetV2

Format: Keras .h5 model file

Input: Facial image

Output: One of four skin types

🛠️ Tech Stack

Python

Flask

TensorFlow / Keras

HTML / CSS / Jinja2

Sample Usage

Upload a clear image of your face and click “Predict”. The model will classify your skin as:

Dry

Oily

Normal

Combination

Images from the Website<img width="830" alt="Ekran Resmi 2025-07-03 20 49 39" src="https://github.com/user-attachments/assets/0679ba9a-b498-434c-8c61-f6203ce892d9" />
<img width="827" alt="Ekran Resmi 2025-07-03 20 49 54" src="https://github.com/user-attachments/assets/cd679787-40e1-4d7a-ad49-468d018964d6" />

Future Improvements

Enhance dataset for better generalization

Add a confidence score display

Deploy online (e.g., using Streamlit, Heroku)


