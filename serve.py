from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='.')


@app.route('/')
def root():
    # Serve login.html as the root page for local testing
    return send_from_directory('.', 'login.html')


@app.route('/<path:filename>')
def files(filename):
    # Serve any other static file from the project root
    return send_from_directory('.', filename)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)
