
from flask import Flask, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

TOKEN = os.getenv("KOBO_TOKEN", "b9d3703b1892083539b96c51c51ff1c85eb6d81e")
ASSET_UID = os.getenv("KOBO_ASSET_UID", "ab6ZkVGRpcwY6xPLipughH")

@app.route("/api/kobo")
def get_kobo_data():

    url = f"https://kf.kobotoolbox.org/api/v2/assets/{ASSET_UID}/data/"

    headers = {
        "Authorization": f"Token {TOKEN}"
    }

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        return jsonify({
            "success": False,
            "status": response.status_code,
            "error": response.text
        }), response.status_code

    return jsonify(response.json())

@app.route("/")
def home():
    return jsonify({
        "status": "API KoBoToolbox active"
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
