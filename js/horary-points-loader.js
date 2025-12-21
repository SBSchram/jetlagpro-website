// Horary Points Page - Load point data from points.json (DRY principle)
// Reuses the same data source as the demo to ensure consistency

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load points data from the same source as demo
        const response = await fetch('data/points.json');
        if (!response.ok) {
            throw new Error(`Failed to load points.json: ${response.status}`);
        }
        const data = await response.json();
        const points = data.points;

        // Find the points grid container
        const pointsGrid = document.querySelector('.points-grid');
        if (!pointsGrid) {
            console.warn('Points grid container not found');
            return;
        }

        // Clear existing content
        pointsGrid.innerHTML = '';

        // Generate point cards from JSON data
        points.forEach((point) => {
            const pointCard = document.createElement('div');
            pointCard.className = 'point-card';

            // Format time description to match original display format
            // Converts "3-5 AM" -> "3:00 AM - 5:00 AM", "11 AM - 1 PM" -> "11:00 AM - 1:00 PM"
            const formatTime = (timeDesc) => {
                // Handle formats like "11 AM - 1 PM" (already has AM/PM on both sides)
                if (timeDesc.includes(' - ')) {
                    const parts = timeDesc.split(' - ');
                    return `${formatSingleTime(parts[0].trim())} - ${formatSingleTime(parts[1].trim())}`;
                }
                // Handle formats like "3-5 AM" (single AM/PM at end)
                else if (timeDesc.includes('-')) {
                    const parts = timeDesc.split('-');
                    const ampmMatch = timeDesc.match(/\s*(AM|PM)/);
                    const ampm = ampmMatch ? ampmMatch[1] : '';
                    
                    const firstPart = parts[0].trim();
                    const secondPart = parts[1].trim().replace(/\s*AM|\s*PM/g, '').trim();
                    
                    // For times crossing midnight (e.g., "11 PM - 1 AM"), detect and handle
                    const firstNum = parseInt(firstPart);
                    const secondNum = parseInt(secondPart);
                    
                    if (!isNaN(firstNum) && !isNaN(secondNum) && firstNum > secondNum && ampm === 'PM') {
                        // Crosses midnight: "11 PM - 1 AM"
                        return `${formatSingleTime(firstPart)} PM - ${formatSingleTime(secondPart)} AM`;
                    } else {
                        // Same period: "3-5 AM"
                        return `${formatSingleTime(firstPart)} ${ampm} - ${formatSingleTime(secondPart)} ${ampm}`;
                    }
                }
                return timeDesc;
            };

            const formatSingleTime = (timeStr) => {
                timeStr = timeStr.trim();
                // Remove AM/PM if present (will be added back)
                timeStr = timeStr.replace(/\s*AM|\s*PM/gi, '').trim();
                // If it already has :00 or :, return as is
                if (timeStr.includes(':')) {
                    return timeStr;
                }
                // If it's just a number, add :00
                const num = parseInt(timeStr);
                if (!isNaN(num)) {
                    return `${num}:00`;
                }
                return timeStr;
            };

            const formattedTime = formatTime(point.timeDescription);

            pointCard.innerHTML = `
                <div class="point-header">
                    <div class="point-number">${point.id}</div>
                    <div>
                        <div class="point-name">${point.name} (${point.chineseName})</div>
                        <div class="point-time">${formattedTime}</div>
                    </div>
                </div>
                <div class="point-description">
                    <strong>Location:</strong> ${point.pointLocation}<br><br>
                    <strong>Stimulation:</strong> ${point.stimulationMethod}
                </div>
            `;

            pointsGrid.appendChild(pointCard);
        });

        console.log('✅ Horary points loaded from points.json');
    } catch (error) {
        console.error('❌ Error loading horary points:', error);
        // Show error message to user
        const pointsGrid = document.querySelector('.points-grid');
        if (pointsGrid) {
            pointsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: #666;">
                    <p>Unable to load point information. Please refresh the page.</p>
                </div>
            `;
        }
    }
});
