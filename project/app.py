from flask import Flask
from flask import render_template
from pymongo import MongoClient
import json
from bson import json_util
from bson.json_util import dumps

app = Flask(__name__)

MONGODB_HOST = 'localhost'
MONGODB_PORT = 27017
DBS_NAME = 'mexicotaxi'
COLLECTION_NAME = 'taxis'
FIELDS = {'vendor_id': True, 'pickup_datetime': True, 'dropoff_datetime': True, 'pickup_latitude': True, 'pickup_longitude': True, 'dropoff_latitude': True, 'dropoff_longitude': True, '_id': False}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/mexicotaxi/taxis")
def mexicotaxi_taxis():
    connection = MongoClient(MONGODB_HOST, MONGODB_PORT)
    collection = connection[DBS_NAME][COLLECTION_NAME]
    taxis = collection.find(projection=FIELDS)
    json_taxis = []
    for taxi in taxis:
        if (taxi['vendor_id'] and taxi['pickup_datetime'] and taxi['dropoff_datetime'] and taxi['pickup_latitude'] and taxi['pickup_longitude'] and taxi['dropoff_latitude'] and taxi['dropoff_longitude']):
            json_taxis.append(taxi)
    json_taxis = json.dumps(json_taxis, default=json_util.default)
    connection.close()
    return json_taxis

if __name__ == "__main__":
    app.run(host='0.0.0.0',port=5000,debug=True)