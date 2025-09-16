// JetLagPro Analytics Charts JavaScript
// Chart rendering functions extracted from analytics-secret.html

// Helper function to calculate average post-travel severity
function calculateAveragePostTravelSeverity(surveys, symptom) {
    if (surveys.length === 0) return 0;
    
    const validSurveys = surveys.filter(s => {
        const post = s[`post${symptom.charAt(0).toUpperCase() + symptom.slice(1)}Severity`];
        return post !== null;
    });
    
    if (validSurveys.length === 0) return 0;
    
    const totalSeverity = validSurveys.reduce((sum, s) => {
        const post = s[`post${symptom.charAt(0).toUpperCase() + symptom.slice(1)}Severity`];
        return sum + post;
    }, 0);
    
    return totalSeverity / validSurveys.length;
}

// Render dose-response curve chart
function renderDoseResponseChart(surveys) {
    const ctx = document.getElementById('doseResponseChart').getContext('2d');
    
    // Group by points completed
    const pointGroups = {};
    for (let i = 0; i <= 12; i++) {
        pointGroups[i] = surveys.filter(s => s.pointsCompleted === i);
    }
    
    // Calculate average post-travel severity for each point group
    const labels = [];
    const severityData = [];
    const timezoneData = [];
    
    for (let points = 0; points <= 12; points++) {
        const group = pointGroups[points];
        if (group.length === 0) continue;
        
        labels.push(`${points} points`);
        
        // Calculate overall post-travel severity (all travel directions combined)
        const severity = calculateAveragePostTravelSeverity(group, 'sleep');
        severityData.push(severity);
        
        // Calculate average time zones crossed for this point group
        const avgTimezones = group.length > 0 ? 
            (group.reduce((sum, s) => sum + (s.timezonesCount || 0), 0) / group.length).toFixed(1) : 0;
        timezoneData.push(parseFloat(avgTimezones));
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Post-Travel Sleep Severity',
                data: severityData,
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                tension: 0.4,
                fill: false,
                yAxisID: 'y'
            }, {
                label: 'Avg Time Zones Crossed',
                data: timezoneData,
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                tension: 0.4,
                fill: false,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Dose-Response: App Usage vs Post-Travel Sleep Severity & Time Zones'
                },
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Post-Travel Sleep Severity (1-5 scale)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Time Zones Crossed'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
                x: {
                    title: {
                        display: true,
                        text: 'Acupressure Points Used'
                    }
                }
            }
        }
    });
}

// Render time zone effect chart
function renderTimezoneEffectChart(surveys) {
    const ctx = document.getElementById('timezoneEffectChart').getContext('2d');
    
    // Group by time zone ranges
    const tzGroups = {
        '1-3': surveys.filter(s => s.timezonesCount >= 1 && s.timezonesCount <= 3),
        '4-6': surveys.filter(s => s.timezonesCount >= 4 && s.timezonesCount <= 6),
        '7-9': surveys.filter(s => s.timezonesCount >= 7 && s.timezonesCount <= 9),
        '10+': surveys.filter(s => s.timezonesCount >= 10)
    };
    
    const labels = Object.keys(tzGroups);
    const highStimulationData = []; // 6+ points
    const lowStimulationData = [];  // 0-5 points
    
    labels.forEach(tzRange => {
        const group = tzGroups[tzRange];
        const highStim = group.filter(s => s.pointsCompleted >= 6);
        const lowStim = group.filter(s => s.pointsCompleted <= 5);
        
        highStimulationData.push(calculateAveragePostTravelSeverity(highStim, 'sleep'));
        lowStimulationData.push(calculateAveragePostTravelSeverity(lowStim, 'sleep'));
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'High Stimulation (6+ points)',
                data: highStimulationData,
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 1
            }, {
                label: 'Low Stimulation (0-5 points)',
                data: lowStimulationData,
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Time Zone Effect: Stimulation Level vs Post-Travel Sleep Severity'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Average Post-Travel Sleep Severity (1-5 scale)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time Zones Crossed'
                    }
                }
            }
        }
    });
}


// Render symptom effectiveness chart
function renderSymptomEffectivenessChart(surveys) {
    const ctx = document.getElementById('symptomEffectivenessChart').getContext('2d');
    
    const symptoms = ['Sleep', 'Fatigue', 'Concentration', 'Irritability', 'GI'];
    const effectivenessData = [];
    
    symptoms.forEach(symptom => {
        const severity = calculateAveragePostTravelSeverity(surveys, symptom.toLowerCase());
        effectivenessData.push(severity);
    });
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: symptoms,
            datasets: [{
                data: effectivenessData,
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Post-Travel Symptom Severity Distribution'
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Render 3D heatmap matrix
function render3DHeatmap(surveys) {
    const container = document.getElementById('heatmapContainer');
    
    // Create time zone ranges
    const tzRanges = ['1-3', '4-6', '7-9', '10+'];
    const pointRanges = ['0', '1-3', '4-6', '7-9', '10-12'];
    
    let html = '<div style="overflow-x: auto;">';
    html += '<table style="border-collapse: collapse; width: 100%; font-size: 0.9rem;">';
    
    // Header row
    html += '<thead><tr><th style="padding: 10px; border: 1px solid #ddd; background: #f8f9fa;">Points Used</th>';
    tzRanges.forEach(tz => {
        html += `<th style="padding: 10px; border: 1px solid #ddd; background: #f8f9fa; text-align: center;">${tz} TZ</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Data rows
    pointRanges.forEach(pointRange => {
        html += `<tr><td style="padding: 10px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">${pointRange}</td>`;
        
        tzRanges.forEach(tzRange => {
            const [tzMin, tzMax] = tzRange === '10+' ? [10, 99] : tzRange.split('-').map(Number);
            const [ptMin, ptMax] = pointRange === '0' ? [0, 0] : 
                                 pointRange === '10-12' ? [10, 12] : 
                                 pointRange.split('-').map(Number);
            
            const group = surveys.filter(s => {
                const tz = s.timezonesCount || 0;
                const pts = s.pointsCompleted || 0;
                return tz >= tzMin && tz <= tzMax && pts >= ptMin && pts <= ptMax;
            });
            
            const severity = calculateAveragePostTravelSeverity(group, 'sleep');
            const sampleSize = group.length;
            
            // Color coding based on severity (lower is better)
            let bgColor = '#f8f9fa';
            let textColor = '#000';
            
            if (sampleSize > 0) {
                if (severity <= 2) {
                    bgColor = '#dcfce7'; // Light green - good results
                    textColor = '#166534';
                } else if (severity <= 3) {
                    bgColor = '#fef3c7'; // Light yellow - moderate
                    textColor = '#92400e';
                } else if (severity <= 4) {
                    bgColor = '#fef2f2'; // Light red - poor
                    textColor = '#991b1b';
                } else {
                    bgColor = '#f3f4f6'; // Light gray - severe
                    textColor = '#6b7280';
                }
            }
            
            html += `<td style="padding: 10px; border: 1px solid #ddd; background: ${bgColor}; color: ${textColor}; text-align: center;">`;
            html += `<div style="font-weight: bold;">${severity.toFixed(2)}</div>`;
            html += `<div style="font-size: 0.8em; opacity: 0.7;">n=${sampleSize}</div>`;
            html += '</td>';
        });
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    html += '<div style="margin-top: 15px; padding: 10px; background: #f0f9ff; border-radius: 5px; font-size: 0.9em;">';
    html += '<strong>Legend:</strong> Values show post-travel symptom severity (1-5 scale). ';
    html += 'Green = Good results (≤2), Yellow = Moderate (3), Red = Poor (4), Gray = Severe (5).';
    html += '</div>';
    html += '</div>';
    
    container.innerHTML = html;
}
