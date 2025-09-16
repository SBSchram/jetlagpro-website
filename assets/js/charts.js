// JetLagPro Analytics Charts JavaScript
// Chart rendering functions extracted from analytics-secret.html

// Helper function to calculate average improvement
function calculateAverageImprovement(surveys, symptom) {
    if (surveys.length === 0) return 0;
    
    const validSurveys = surveys.filter(s => {
        const baseline = s[`baseline${symptom.charAt(0).toUpperCase() + symptom.slice(1)}`];
        const post = s[`post${symptom.charAt(0).toUpperCase() + symptom.slice(1)}Severity`];
        return baseline !== null && post !== null;
    });
    
    if (validSurveys.length === 0) return 0;
    
    const totalImprovement = validSurveys.reduce((sum, s) => {
        const baseline = s[`baseline${symptom.charAt(0).toUpperCase() + symptom.slice(1)}`];
        const post = s[`post${symptom.charAt(0).toUpperCase() + symptom.slice(1)}Severity`];
        return sum + (baseline - post);
    }, 0);
    
    return totalImprovement / validSurveys.length;
}

// Render dose-response curve chart
function renderDoseResponseChart(surveys) {
    const ctx = document.getElementById('doseResponseChart').getContext('2d');
    
    // Group by points completed
    const pointGroups = {};
    for (let i = 0; i <= 12; i++) {
        pointGroups[i] = surveys.filter(s => s.pointsCompleted === i);
    }
    
    // Calculate average sleep improvement for each point group
    const labels = [];
    const improvementData = [];
    const timezoneData = [];
    
    for (let points = 0; points <= 12; points++) {
        const group = pointGroups[points];
        if (group.length === 0) continue;
        
        labels.push(`${points} points`);
        
        // Calculate overall improvement (all travel directions combined)
        const improvement = calculateAverageImprovement(group, 'sleep');
        improvementData.push(improvement);
        
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
                label: 'Sleep Improvement',
                data: improvementData,
                borderColor: '#16a34a',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
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
                    text: 'Dose-Response: App Usage vs Sleep Improvement & Time Zones'
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
                        text: 'Sleep Improvement (Baseline - Post-Travel)'
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
        
        highStimulationData.push(calculateAverageImprovement(highStim, 'sleep'));
        lowStimulationData.push(calculateAverageImprovement(lowStim, 'sleep'));
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
                    text: 'Time Zone Effect: Stimulation Level vs Sleep Improvement'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Average Sleep Improvement'
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
        const improvement = calculateAverageImprovement(surveys, symptom.toLowerCase());
        effectivenessData.push(improvement);
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
                    text: 'Overall Symptom Improvement Distribution'
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
            
            const improvement = calculateAverageImprovement(group, 'sleep');
            const sampleSize = group.length;
            
            // Color coding based on improvement
            let bgColor = '#f8f9fa';
            let textColor = '#000';
            
            if (sampleSize > 0) {
                if (improvement > 1.5) {
                    bgColor = '#dcfce7'; // Light green
                    textColor = '#166534';
                } else if (improvement > 0.5) {
                    bgColor = '#fef3c7'; // Light yellow
                    textColor = '#92400e';
                } else if (improvement > 0) {
                    bgColor = '#fef2f2'; // Light red
                    textColor = '#991b1b';
                } else {
                    bgColor = '#f3f4f6'; // Light gray
                    textColor = '#6b7280';
                }
            }
            
            html += `<td style="padding: 10px; border: 1px solid #ddd; background: ${bgColor}; color: ${textColor}; text-align: center;">`;
            html += `<div style="font-weight: bold;">${improvement.toFixed(2)}</div>`;
            html += `<div style="font-size: 0.8em; opacity: 0.7;">n=${sampleSize}</div>`;
            html += '</td>';
        });
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    html += '<div style="margin-top: 15px; padding: 10px; background: #f0f9ff; border-radius: 5px; font-size: 0.9em;">';
    html += '<strong>Legend:</strong> Values show comparison between anticipated and post-travel symptoms. ';
    html += 'Green = High improvement (>1.5), Yellow = Moderate (0.5-1.5), Red = Low (0-0.5), Gray = No data.';
    html += '</div>';
    html += '</div>';
    
    container.innerHTML = html;
}
