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
    try {
        const chartElement = document.getElementById('doseResponseAnalysisChart');
        if (!chartElement) {
            console.warn('Chart element not found: doseResponseAnalysisChart');
            return;
        }
        const ctx = chartElement.getContext('2d');
    
    // Group surveys by app usage levels
    const usageGroups = {
        '0-2 points': surveys.filter(s => s.pointsCompleted >= 0 && s.pointsCompleted <= 2),
        '3-5 points': surveys.filter(s => s.pointsCompleted >= 3 && s.pointsCompleted <= 5),
        '6-8 points': surveys.filter(s => s.pointsCompleted >= 6 && s.pointsCompleted <= 8),
        '9-12 points': surveys.filter(s => s.pointsCompleted >= 9 && s.pointsCompleted <= 12)
    };
    
    // Time zone ranges (X-axis) - starting at 2 time zones, ending at 12+ for all flights with 12 or more timezone crossings
    const timeZoneRanges = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, '12+'];
    
    // Baseline data from Waterhouse study (mapped to 1-5 scale) - starting at 2 time zones
    // Note: Waterhouse et al. (2007) data extends to 12 timezones; 12+ aggregates all flights ≥12 timezones
    const baselineData = [
        { timeZones: 2, severity: 1.8 },
        { timeZones: 3, severity: 2.5 },
        { timeZones: 4, severity: 2.5 },
        { timeZones: 5, severity: 2.5 },
        { timeZones: 6, severity: 3.1 },
        { timeZones: 7, severity: 3.1 },
        { timeZones: 8, severity: 3.1 },
        { timeZones: 9, severity: 3.6 },
        { timeZones: 10, severity: 3.6 },
        { timeZones: 11, severity: 3.6 },
        { timeZones: '12+', severity: 3.6 }
    ];
    
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
            // For '12+', aggregate all surveys with 12 or more timezone crossings
            const tzSurveys = timeZones === '12+' 
                ? groupSurveys.filter(s => s.timezonesCount >= 12)
                : groupSurveys.filter(s => s.timezonesCount === timeZones);
            
            if (tzSurveys.length > 0) {
                // Calculate aggregate severity (average of all available symptoms)
                const aggregateSeverities = tzSurveys.map(survey => {
                    const symptoms = ['postSleepSeverity', 'postFatigueSeverity', 'postConcentrationSeverity', 'postIrritabilitySeverity', 'postMotivationSeverity', 'postGISeverity'];
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
    
    // Add baseline dataset (natural jet lag severity without intervention)
    const baselineSeverityData = timeZoneRanges.map(tz => {
        const baselinePoint = baselineData.find(b => b.timeZones === tz);
        return baselinePoint ? baselinePoint.severity : null;
    });
    
    datasets.push({
        label: 'Baseline (No Intervention)',
        data: baselineSeverityData,
        borderColor: '#6b7280', // Gray
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5], // Dashed line
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#6b7280',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        errorBars: new Array(timeZoneRanges.length).fill(null) // No error bars for baseline
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
                    text: 'Dose-Response Analysis: App Usage vs Jet Lag Severity by Time Zones (±1 SE) - Including Baseline',
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
    } catch (error) {
        console.error('Error rendering dose response analysis chart:', error);
    }
}

// Render multi-series symptom analysis chart
function renderSymptomAnalysisChart(surveys, tzGroups) {
    try {
        const chartElement = document.getElementById('symptomAnalysisChart');
        if (!chartElement) {
            console.warn('Chart element not found: symptomAnalysisChart');
            return;
        }
        const ctx = chartElement.getContext('2d');
    
    // Define symptoms with their field names and colors
    const symptoms = [
        { name: 'Sleep', post: 'postSleepSeverity', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
        { name: 'Fatigue', post: 'postFatigueSeverity', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
        { name: 'Concentration', post: 'postConcentrationSeverity', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
        { name: 'Irritability', post: 'postIrritabilitySeverity', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
        { name: 'GI', post: 'postGISeverity', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' }
    ];
    
    // Prepare chart data
    const timeZoneRanges = Object.keys(tzGroups);
    const datasets = [];
    
    symptoms.forEach(symptom => {
        const data = [];
        const validData = [];
        
        timeZoneRanges.forEach(range => {
            const surveys = tzGroups[range] || [];
            const validSymptomSurveys = surveys.filter(s => s[symptom.post] !== null);
            
            if (validSymptomSurveys.length > 0) {
                const avgSeverity = validSymptomSurveys.reduce((sum, s) => sum + s[symptom.post], 0) / validSymptomSurveys.length;
                data.push(parseFloat(avgSeverity.toFixed(2)));
                validData.push(true);
            } else {
                data.push(null);
                validData.push(false);
            }
        });
        
        // Only add dataset if there's valid data
        if (validData.some(valid => valid)) {
            datasets.push({
                label: `${symptom.name} Symptoms`,
                data: data,
                borderColor: symptom.color,
                backgroundColor: symptom.bgColor,
                borderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: symptom.color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                tension: 0.1,
                fill: false,
                spanGaps: false
            });
        }
    });
    
    // Create the chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeZoneRanges,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Symptom Severity by Time Zone Range',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    callbacks: {
                        title: function(context) {
                            return `Time Zone Range: ${context[0].label}`;
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            return value !== null ? `${context.dataset.label}: ${value}` : `${context.dataset.label}: No data`;
                        },
                        afterLabel: function(context) {
                            const range = context[0].label;
                            const surveys = tzGroups[range] || [];
                            const symptom = symptoms.find(s => context.dataset.label.includes(s.name));
                            if (symptom) {
                                const validSurveys = surveys.filter(s => s[symptom.post] !== null);
                                return `Sample size: ${validSurveys.length}`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time Zone Ranges',
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
                    beginAtZero: true,
                    max: 5,
                    title: {
                        display: true,
                        text: 'Post-Travel Severity (1-5 scale)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        stepSize: 0.5,
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            elements: {
                line: {
                    borderWidth: 3
                },
                point: {
                    radius: 6,
                    hoverRadius: 8
                }
            }
        }
    });
    } catch (error) {
        console.error('Error rendering symptom analysis chart:', error);
    }
}
