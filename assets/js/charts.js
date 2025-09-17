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






// Render dose-response analysis chart (multiple lines for different app usage levels)
function renderDoseResponseAnalysisChart(surveys) {
    const ctx = document.getElementById('doseResponseAnalysisChart').getContext('2d');
    
    // Group surveys by app usage levels
    const usageGroups = {
        '0-2 points': surveys.filter(s => s.pointsCompleted >= 0 && s.pointsCompleted <= 2),
        '3-5 points': surveys.filter(s => s.pointsCompleted >= 3 && s.pointsCompleted <= 5),
        '6-8 points': surveys.filter(s => s.pointsCompleted >= 6 && s.pointsCompleted <= 8),
        '9-12 points': surveys.filter(s => s.pointsCompleted >= 9 && s.pointsCompleted <= 12)
    };
    
    // Time zone ranges (X-axis)
    const timeZoneRanges = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    // Calculate aggregate severity for each usage group and time zone
    const datasets = [];
    const colors = [
        { border: '#dc2626', background: 'rgba(220, 38, 38, 0.1)' }, // Red - minimal usage
        { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }, // Orange - low usage
        { border: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }, // Blue - moderate usage
        { border: '#16a34a', background: 'rgba(22, 163, 74, 0.1)' }  // Green - high usage
    ];
    
    Object.entries(usageGroups).forEach(([groupName, groupSurveys], index) => {
        const severityData = [];
        const errorBars = [];
        
        timeZoneRanges.forEach(timeZones => {
            // Filter surveys for this specific time zone count
            const tzSurveys = groupSurveys.filter(s => s.timezonesCount === timeZones);
            
            if (tzSurveys.length > 0) {
                // Calculate aggregate severity (average of all available symptoms)
                const aggregateSeverities = tzSurveys.map(survey => {
                    const symptoms = ['postSleepSeverity', 'postFatigueSeverity', 'postConcentrationSeverity', 'postIrritabilitySeverity', 'postGISeverity'];
                    const validSymptoms = symptoms.filter(symptom => survey[symptom] !== null);
                    
                    if (validSymptoms.length > 0) {
                        return validSymptoms.reduce((sum, symptom) => sum + survey[symptom], 0) / validSymptoms.length;
                    }
                    return null;
                }).filter(severity => severity !== null);
                
                if (aggregateSeverities.length > 0) {
                    const avgSeverity = aggregateSeverities.reduce((sum, severity) => sum + severity, 0) / aggregateSeverities.length;
                    
                    // Calculate standard deviation
                    const variance = aggregateSeverities.reduce((sum, severity) => sum + Math.pow(severity - avgSeverity, 2), 0) / aggregateSeverities.length;
                    const stdDev = Math.sqrt(variance);
                    
                    // Calculate standard error (for error bars)
                    const standardError = stdDev / Math.sqrt(aggregateSeverities.length);
                    
                    severityData.push(avgSeverity);
                    errorBars.push(standardError);
                } else {
                    severityData.push(null);
                    errorBars.push(null);
                }
            } else {
                severityData.push(null);
                errorBars.push(null);
            }
        });
        
        datasets.push({
            label: `${groupName} (n=${groupSurveys.length})`,
            data: severityData,
            borderColor: colors[index].border,
            backgroundColor: colors[index].background,
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: colors[index].border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            // Store error bars data for custom rendering
            errorBars: errorBars
        });
    });
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeZoneRanges.map(tz => `${tz} TZ`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Dose-Response Analysis: App Usage vs Jet Lag Severity by Time Zones (±1 SE)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            return `Time Zones Crossed: ${context[0].label}`;
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            const dataset = context.dataset;
                            const errorBar = dataset.errorBars[context.dataIndex];
                            
                            if (value !== null && errorBar !== null) {
                                return `${dataset.label}: ${value.toFixed(2)} ± ${errorBar.toFixed(2)} severity`;
                            } else if (value !== null) {
                                return `${dataset.label}: ${value.toFixed(2)} severity`;
                            } else {
                                return `${dataset.label}: No data`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time Zones Crossed',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Aggregate Symptom Severity (1-5 scale)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: 1,
                    max: 5,
                    ticks: {
                        stepSize: 0.5
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        },
        plugins: [{
            id: 'errorBars',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                const scale = chart.scales.y;
                
                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    const points = meta.data;
                    
                    points.forEach((point, pointIndex) => {
                        if (point && dataset.data[pointIndex] !== null && dataset.errorBars[pointIndex] !== null) {
                            const x = point.x;
                            const y = point.y;
                            const errorBar = dataset.errorBars[pointIndex];
                            
                            // Convert error bar to pixel coordinates
                            const errorPixels = scale.getPixelForValue(y + errorBar) - scale.getPixelForValue(y);
                            
                            // Draw error bar
                            ctx.save();
                            ctx.strokeStyle = dataset.borderColor;
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            
                            // Vertical line
                            ctx.moveTo(x, y - errorPixels);
                            ctx.lineTo(x, y + errorPixels);
                            
                            // Top cap
                            ctx.moveTo(x - 4, y - errorPixels);
                            ctx.lineTo(x + 4, y - errorPixels);
                            
                            // Bottom cap
                            ctx.moveTo(x - 4, y + errorPixels);
                            ctx.lineTo(x + 4, y + errorPixels);
                            
                            ctx.stroke();
                            ctx.restore();
                        }
                    });
                });
            }
        }]
    });
}
