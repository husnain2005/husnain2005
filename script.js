// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to clicked button and corresponding content
        btn.classList.add('active');
        document.getElementById(tabName).classList.add('active');
    });
});

// Update timestamp
function updateTimestamp() {
    const now = new Date();
    const formatted = now.toISOString().slice(0, 19).replace('T', ' ');
    document.getElementById('timestamp').textContent = formatted;
}

setInterval(updateTimestamp, 1000);

// Initialize Map
let map;
function initMap() {
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([19.6558, -1.185877], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Add marker
    const orangeIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: #ff8800; width: 20px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #fff;"></div>',
        iconSize: [20, 30],
        iconAnchor: [10, 30]
    });

    L.marker([19.6558, -1.185877], { icon: orangeIcon }).addTo(map);
}

// Initialize charts after page load
window.addEventListener('load', () => {
    initMap();
    initCharts();
    initGauges();
    simulateSensorData();
});

// Gyroscope Chart
let gyroChart;
function initCharts() {
    const gyroCtx = document.getElementById('gyroChart').getContext('2d');
    gyroChart = new Chart(gyroCtx, {
        type: 'line',
        data: {
            labels: ['0', '11', '83', '1', '93', '0'],
            datasets: [{
                data: [0.5, 0.8, 0.6, 0.9, 0.7, 0.5],
                borderColor: '#00ffff',
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    display: true,
                    grid: { color: '#2a2a2a' },
                    ticks: { color: '#888', font: { size: 8 } }
                },
                y: {
                    display: false,
                    grid: { display: false }
                }
            }
        }
    });

    // Acceleration Chart
    const accelCtx = document.getElementById('accelChart').getContext('2d');
    new Chart(accelCtx, {
        type: 'line',
        data: {
            labels: ['0', '60', '1', '11', '83', '1'],
            datasets: [
                {
                    label: 'X',
                    data: [0.3, 0.7, 0.5, 0.9, 0.6, 0.8],
                    borderColor: '#00ffff',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Y',
                    data: [0.6, 0.4, 0.8, 0.5, 0.9, 0.7],
                    borderColor: '#00ff00',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Z',
                    data: [0.2, 0.5, 0.3, 0.7, 0.4, 0.6],
                    borderColor: '#ff8800',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    display: true,
                    grid: { color: '#2a2a2a' },
                    ticks: { color: '#888', font: { size: 8 } }
                },
                y: {
                    display: false,
                    grid: { display: false }
                }
            }
        }
    });

    // Temperature Wave Chart
    const waveCtx = document.getElementById('tempWaveChart').getContext('2d');
    new Chart(waveCtx, {
        type: 'line',
        data: {
            labels: ['0', '15', '32', '51', '74', '83', '0'],
            datasets: [{
                data: [0.4, 0.7, 0.5, 0.8, 0.6, 0.9, 0.4],
                borderColor: '#00ffff',
                backgroundColor: 'rgba(0, 255, 255, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    display: true,
                    grid: { color: '#2a2a2a' },
                    ticks: { color: '#888', font: { size: 8 } }
                },
                y: {
                    display: false,
                    grid: { display: false }
                }
            }
        }
    });
}

// Initialize Gauges
function initGauges() {
    updateGauge('gauge1', 99);
    updateGauge('gauge2', 76);
}

function updateGauge(id, percentage) {
    const gauge = document.getElementById(id);
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (percentage / 100) * circumference;
    gauge.style.strokeDashoffset = offset;
}

// Simulate real-time sensor data updates
function simulateSensorData() {
    setInterval(() => {
        // Update temperature sensors with slight variations
        const sensors = document.querySelectorAll('.sensor-temp');
        sensors.forEach(sensor => {
            const currentTemp = parseFloat(sensor.textContent);
            const variation = (Math.random() - 0.5) * 0.5;
            const newTemp = (currentTemp + variation).toFixed(1);
            sensor.textContent = newTemp + '°C';
        });

        // Update gauges
        const gauge1Value = 95 + Math.random() * 5;
        const gauge2Value = 72 + Math.random() * 8;
        updateGauge('gauge1', gauge1Value);
        updateGauge('gauge2', gauge2Value);

        document.querySelector('.motion-gauges .gauge:first-child .gauge-value').textContent =
            Math.round(gauge1Value) + '%';
        document.querySelector('.motion-gauges .gauge:last-child .gauge-value').textContent =
            Math.round(gauge2Value);

        // Animate operator movement (random direction)
        const arrows = document.querySelectorAll('.arrow');
        arrows.forEach(arrow => arrow.classList.remove('active'));
        const randomArrow = arrows[Math.floor(Math.random() * arrows.length)];
        randomArrow.classList.add('active');

    }, 2000);

    // Update charts data periodically
    setInterval(() => {
        if (gyroChart) {
            gyroChart.data.datasets[0].data = gyroChart.data.datasets[0].data.map(() => Math.random());
            gyroChart.update('none');
        }
    }, 3000);
}

// Add glow effect to sensor cards on hover
document.querySelectorAll('.sensor-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.05)';
    });

    card.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
});

// Animate suit wireframe
let rotation = 0;
setInterval(() => {
    rotation += 0.5;
    const suits = document.querySelectorAll('.wireframe-suit, .wireframe-suit-large');
    suits.forEach(suit => {
        suit.style.filter = `hue-rotate(${rotation}deg) brightness(1.2)`;
    });
}, 50);

// Console log for debugging
console.log('Fire Suppression Suit Dashboard Initialized');
console.log('Real-time sensor monitoring active');
