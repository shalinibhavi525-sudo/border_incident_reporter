// ========== GLOBAL VARIABLES ==========
let locationObtained = false;

// ========== GET LOCATION ==========
const getLocationBtn = document.getElementById('get-location-btn');
const locationStatus = document.getElementById('location-status');
const locationText = document.getElementById('location-text');
const locationIcon = document.getElementById('location-icon');
const latInput = document.getElementById('latitude');
const lngInput = document.getElementById('longitude');
const accInput = document.getElementById('accuracy');
const submitBtn = document.getElementById('submit-btn');

getLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    locationText.textContent = 'Getting location...';
    locationIcon.textContent = '⏳';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const acc = position.coords.accuracy;

            latInput.value = lat;
            lngInput.value = lng;
            accInput.value = acc;

            locationObtained = true;
            locationStatus.classList.add('success');
            locationIcon.textContent = '✅';
            locationText.textContent = `Location obtained (±${Math.round(acc)}m accuracy)`;
            
            // Enable submit button
            checkFormValidity();
        },
        (error) => {
            locationIcon.textContent = '❌';
            locationText.textContent = `Error: ${error.message}`;
            alert('Could not get your location. Please check permissions.');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
});

// ========== SEVERITY SELECTION ==========
const severityButtons = document.querySelectorAll('.severity-btn');
const severityInput = document.getElementById('severity');

severityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        severityButtons.forEach(b => b.classList.remove('active'));
        
        // Add active to clicked
        btn.classList.add('active');
        
        // Set hidden input value
        severityInput.value = btn.dataset.severity;
        
        checkFormValidity();
    });
});

// ========== FORM VALIDATION ==========
const form = document.getElementById('incident-form');
const typeSelect = document.getElementById('type');
const descriptionInput = document.getElementById('description');

function checkFormValidity() {
    const isValid = 
        locationObtained &&
        typeSelect.value !== '' &&
        severityInput.value !== '' &&
        descriptionInput.value.trim() !== '';
    
    submitBtn.disabled = !isValid;
}

// Listen for changes
typeSelect.addEventListener('change', checkFormValidity);
descriptionInput.addEventListener('input', checkFormValidity);

// ========== FORM SUBMISSION ==========
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!locationObtained) {
        alert('Please get your location first');
        return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // Create FormData
    const formData = new FormData(form);

    try {
        const response = await fetch('/api/report', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Show success message
            document.getElementById('incident-id').textContent = data.incident_id;
            document.getElementById('success-message').classList.remove('hidden');
            
            // Reset form
            form.reset();
            severityButtons.forEach(b => b.classList.remove('active'));
            locationObtained = false;
            locationStatus.classList.remove('success');
            locationIcon.textContent = '📍';
            locationText.textContent = 'Click below to get your location';
            
            // Scroll to success message
            document.getElementById('success-message').scrollIntoView({ behavior: 'smooth' });
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                document.getElementById('success-message').classList.add('hidden');
            }, 5000);
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Network error. Please check your connection and try again.');
        console.error('Error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
        checkFormValidity();
    }
});
