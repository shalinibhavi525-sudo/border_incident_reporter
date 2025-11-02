from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Incident(db.Model):
    """Model for storing border incident reports"""
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic incident info
    incident_type = db.Column(db.String(100), nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # Low, Medium, High, Critical
    description = db.Column(db.Text, nullable=False)
    
    # Location data
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    location_accuracy = db.Column(db.Float)  # GPS accuracy in meters
    
    # Photo evidence
    photo_filename = db.Column(db.String(255))
    
    # Reporter info
    reporter_name = db.Column(db.String(100))
    reporter_unit = db.Column(db.String(100))
    reporter_contact = db.Column(db.String(20))
    
    # Timestamps
    reported_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Status tracking
    status = db.Column(db.String(20), default='Open')  # Open, Investigating, Resolved
    priority = db.Column(db.Integer, default=0)  # For sorting
    
    def __repr__(self):
        return f'<Incident {self.id}: {self.incident_type} - {self.severity}>'
    
    def to_dict(self):
        """Convert incident to dictionary for JSON responses"""
        return {
            'id': self.id,
            'type': self.incident_type,
            'severity': self.severity,
            'description': self.description,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'photo': self.photo_filename,
            'reporter_name': self.reporter_name,
            'reporter_unit': self.reporter_unit,
            'reported_at': self.reported_at.strftime('%Y-%m-%d %H:%M:%S'),
            'status': self.status
        }
