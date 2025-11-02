from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from config import Config
from database.models import db, Incident

app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
db.init_app(app)

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Create database tables
with app.app_context():
    db.create_all()

# ==================== ROUTES ====================

@app.route('/')
def index():
    """Landing page"""
    return render_template('index.html')

@app.route('/reporter')
def reporter():
    """Field reporter interface"""
    return render_template('reporter.html')

@app.route('/dashboard')
def dashboard():
    """Command center dashboard"""
    return render_template('dashboard.html')

# ==================== API ENDPOINTS ====================

@app.route('/api/report', methods=['POST'])
def submit_report():
    """Submit a new incident report"""
    try:
        # Get form data
        incident_type = request.form.get('type')
        severity = request.form.get('severity')
        description = request.form.get('description')
        latitude = float(request.form.get('latitude'))
        longitude = float(request.form.get('longitude'))
        accuracy = request.form.get('accuracy')
        
        reporter_name = request.form.get('reporter_name', 'Anonymous')
        reporter_unit = request.form.get('reporter_unit', '')
        reporter_contact = request.form.get('reporter_contact', '')
        
        # Handle photo upload
        photo_filename = None
        if 'photo' in request.files:
            file = request.files['photo']
            if file and file.filename and Config.allowed_file(file.filename):
                filename = secure_filename(file.filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                photo_filename = f"{timestamp}_{filename}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], photo_filename))
        
        # Create incident record
        incident = Incident(
            incident_type=incident_type,
            severity=severity,
            description=description,
            latitude=latitude,
            longitude=longitude,
            location_accuracy=float(accuracy) if accuracy else None,
            photo_filename=photo_filename,
            reporter_name=reporter_name,
            reporter_unit=reporter_unit,
            reporter_contact=reporter_contact
        )
        
        db.session.add(incident)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Incident reported successfully',
            'incident_id': incident.id
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 400

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    """Get all incidents (with optional filters)"""
    try:
        # Get filter parameters
        severity = request.args.get('severity')
        incident_type = request.args.get('type')
        status = request.args.get('status')
        
        # Build query
        query = Incident.query
        
        if severity:
            query = query.filter_by(severity=severity)
        if incident_type:
            query = query.filter_by(incident_type=incident_type)
        if status:
            query = query.filter_by(status=status)
        
        # Get results ordered by most recent
        incidents = query.order_by(Incident.reported_at.desc()).all()
        
        return jsonify({
            'success': True,
            'incidents': [inc.to_dict() for inc in incidents]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 400

@app.route('/api/incident/<int:incident_id>', methods=['GET'])
def get_incident(incident_id):
    """Get specific incident details"""
    try:
        incident = Incident.query.get_or_404(incident_id)
        return jsonify({
            'success': True,
            'incident': incident.to_dict()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 404

@app.route('/api/incident/<int:incident_id>/status', methods=['PUT'])
def update_status(incident_id):
    """Update incident status"""
    try:
        incident = Incident.query.get_or_404(incident_id)
        new_status = request.json.get('status')
        
        if new_status in ['Open', 'Investigating', 'Resolved']:
            incident.status = new_status
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'Status updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid status'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 400

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get incident statistics"""
    try:
        total = Incident.query.count()
        critical = Incident.query.filter_by(severity='Critical').count()
        high = Incident.query.filter_by(severity='High').count()
        open_incidents = Incident.query.filter_by(status='Open').count()
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'critical': critical,
                'high': high,
                'open': open_incidents
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 400

# ==================== RUN APP ====================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(debug=False, host='0.0.0.0', port=port)
