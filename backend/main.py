from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from datetime import datetime
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
def init_db():
    conn = sqlite3.connect('safety.db', check_same_thread=False)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS sos_alerts
                 (id INTEGER PRIMARY KEY, tourist_id TEXT, location TEXT, 
                  timestamp DATETIME, status TEXT, responder_id TEXT)''')
    conn.commit()
    conn.close()

init_db()

@app.get("/")
async def root():
    return {"message": "Safety App Backend is running!"}

@app.post("/trigger_sos")
async def trigger_sos():
    conn = sqlite3.connect('safety.db', check_same_thread=False)
    c = conn.cursor()
    
    alert_id = random.randint(1000, 9999)
    tourist_id = "tourist_" + str(random.randint(100, 999))
    location = f"{random.uniform(40.70, 40.75):.4f}, {random.uniform(-74.02, -73.98):.4f}"
    
    c.execute('''INSERT INTO sos_alerts 
                 (id, tourist_id, location, timestamp, status) 
                 VALUES (?, ?, ?, ?, ?)''',
              (alert_id, tourist_id, location, datetime.now(), 'pending'))
    
    conn.commit()
    conn.close()
    
    return {"alert_id": alert_id, "status": "SOS sent successfully"}

@app.get("/get_safety_score")
async def get_safety_score(lat: float, lng: float):
    score = random.randint(30, 95)
    return {"safety_score": score, "risk_level": "Low" if score > 70 else "Medium" if score > 40 else "High"}

@app.get("/alerts")
async def get_alerts():
    conn = sqlite3.connect('safety.db', check_same_thread=False)
    c = conn.cursor()
    
    c.execute('''SELECT * FROM sos_alerts ORDER BY timestamp DESC''')
    alerts = c.fetchall()
    
    # Convert to list of dictionaries
    alert_list = []
    for alert in alerts:
        alert_list.append({
            "id": alert[0],
            "tourist_id": alert[1],
            "location": alert[2],
            "timestamp": alert[3],
            "status": alert[4],
            "responder_id": alert[5] if alert[5] else "Not assigned"
        })
    
    conn.close()
    return {"alerts": alert_list}

@app.post("/assign_responder")
async def assign_responder(alert_id: int, responder_id: str):
    conn = sqlite3.connect('safety.db', check_same_thread=False)
    c = conn.cursor()
    
    c.execute('''UPDATE sos_alerts SET status = "assigned", responder_id = ? WHERE id = ?''',
              (responder_id, alert_id))
    
    conn.commit()
    conn.close()
    
    return {"status": f"Responder {responder_id} assigned to alert {alert_id}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)