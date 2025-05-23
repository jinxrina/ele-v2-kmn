document.addEventListener('DOMContentLoaded', () => {
    // --- Light/Dark Mode Toggle ---
    const darkModeToggle = document.getElementById('darkModeToggle');

    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    } else if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        darkModeToggle.checked = false;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // System is dark mode
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });

    // --- Wire/Cable Size Calculation ---
    const calculateWireBtn = document.getElementById('calculateWire');
    const currentInput = document.getElementById('current');
    const lengthInput = document.getElementById('length');
    const voltageInput = document.getElementById('voltage');
    const materialInput = document.getElementById('material');
    const vdPercentInput = document.getElementById('vd_percent');
    const recommendedSizeElem = document.getElementById('recommendedSize');
    const actualVoltageDropElem = document.getElementById('actualVoltageDrop');
    const wireAnimationContainer = document.getElementById('wire-animation-container');
    const currentFlowAnim = wireAnimationContainer.querySelector('.current-flow-anim');

    // Simplified resistance values per meter per mm^2 for copper/aluminum at 20°C
    // These are placeholders. Real values depend on temperature, standard, etc.
    const resistivityCopper = 0.0172; // Ohm·mm²/m
    const resistivityAluminum = 0.0282; // Ohm·mm²/m

    // Placeholder for valid cable sizes (mm^2) - this would be a much larger, standards-based list
    const validCableSizes = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
    // Placeholder for typical current carrying capacities (Iz) based on size, very simplified for demonstration
    // In a real application, these come from SS 638 tables with derating factors
    const cableCapacityMap = {
        '1.5': 18.5, '2.5': 25, '4': 32, '6': 41, '10': 57, '16': 76, '25': 99,
        '35': 125, '50': 149, '70': 185, '95': 224, '120': 258, '150': 295,
        '185': 335, '240': 386, '300': 437
    };


    calculateWireBtn.addEventListener('click', () => {
        const ib = parseFloat(currentInput.value);
        const length = parseFloat(lengthInput.value);
        const voltage = parseFloat(voltageInput.value);
        const material = materialInput.value;
        const vdPercent = parseFloat(vdPercentInput.value);

        if (isNaN(ib) || isNaN(length) || isNaN(voltage) || isNaN(vdPercent) || ib <= 0 || length <= 0 || vdPercent <= 0) {
            recommendedSizeElem.textContent = "Please enter valid positive numbers for all inputs.";
            actualVoltageDropElem.textContent = "";
            currentFlowAnim.style.width = '0%'; // Reset animation
            return;
        }

        const maxVoltageDrop = (vdPercent / 100) * voltage;
        const resistivity = (material === 'copper') ? resistivityCopper : resistivityAluminum;
        const K = (material === 'copper') ? 56 : 35; // K value for voltage drop calculation (simplified)

        let selectedCableSize = null;
        let actualVd = Infinity;
        let chosenIz = 0;

        // Iterate through valid cable sizes to find the smallest suitable one
        for (const size of validCableSizes) {
            // Check current carrying capacity (Iz >= Ib)
            const iz = cableCapacityMap[size.toString()];
            if (!iz || iz < ib) {
                continue; // This size cannot carry the design current
            }

            // Calculate voltage drop for this size
            // For single phase: (2 * Ib * L * resistivity) / CSA
            // For three phase: (sqrt(3) * Ib * L * resistivity) / CSA (simplified, typically also involves power factor and X)
            // Simplified voltage drop formula: (2 * current * length * resistivity) / cross-sectional_area
            // Or using K-factor: Vd = (2 * I * L) / (K * CSA) for single phase
            // For 3-phase, divide K by 2 (or use sqrt(3) on top for voltage drop formula)
            let calculatedVd;
            if (voltage === 230) { // Single Phase
                calculatedVd = (2 * ib * length) / (K * size);
            } else { // Three Phase (simplified, assumes balanced load & negligible reactance)
                calculatedVd = (ib * length) / (K * size); // K is already adjusted for 3-phase per unit current/length
            }

            if (calculatedVd <= maxVoltageDrop) {
                selectedCableSize = size;
                actualVd = calculatedVd;
                chosenIz = iz;
                break; // Found the smallest size meeting both criteria
            }
        }

        if (selectedCableSize) {
            recommendedSizeElem.textContent = `${selectedCableSize} mm² (Iz: ${chosenIz}A)`;
            actualVoltageDropElem.textContent = `${actualVd.toFixed(2)} Volts (${((actualVd / voltage) * 100).toFixed(2)}%)`;

            // Trigger wire animation
            currentFlowAnim.style.width = '100%';
            currentFlowAnim.style.backgroundColor = 'var(--button-bg)'; // Indicating safe flow
            gsap.to(currentFlowAnim, {
                duration: 1.5,
                width: "100%",
                ease: "power2.out",
                onComplete: () => {
                    // Optional: reset or change animation state after some time
                }
            });
        } else {
            recommendedSizeElem.textContent = "No suitable cable size found for the given parameters within typical ranges. Consider adjusting inputs or reviewing regulations.";
            actualVoltageDropElem.textContent = "";
            currentFlowAnim.style.width = '0%'; // Reset animation
        }
    });

    // --- Circuit Breaker Size Calculation ---
    const calculateCBBtn = document.getElementById('calculateCB');
    const cbLoadCurrentInput = document.getElementById('cbLoadCurrent');
    const cbCableCapacityInput = document.getElementById('cbCableCapacity');
    const recommendedCBElem = document.getElementById('recommendedCB');
    const cbAnimationContainer = document.getElementById('cb-animation-container');
    const breakerSwitch = cbAnimationContainer.querySelector('.breaker-switch');

    // Typical standard CB ratings
    const cbRatings = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];

    calculateCBBtn.addEventListener('click', () => {
        const ib = parseFloat(cbLoadCurrentInput.value);
        const iz = parseFloat(cbCableCapacityInput.value);

        if (isNaN(ib) || isNaN(iz) || ib <= 0 || iz <= 0) {
            recommendedCBElem.textContent = "Please enter valid positive numbers.";
            breakerSwitch.classList.remove('on', 'tripped'); // Reset animation
            return;
        }

        let suitableCB = null;
        for (const rating of cbRatings) {
            if (rating >= ib && rating <= iz && (rating * 1.45 >= iz)) { // N >= Ib and N <= Iz for fuses, or I2 <= 1.45 Iz for MCB/MCCB
                suitableCB = rating;
                break;
            }
        }

        if (suitableCB) {
            recommendedCBElem.textContent = `Recommended MCB Rating: ${suitableCB} Amperes`;
            breakerSwitch.classList.remove('tripped');
            breakerSwitch.classList.add('on'); // Show 'on' state

            // Animate to 'on' visually
            gsap.to(breakerSwitch.querySelector('::before'), { // Not directly targettable with CSS, but conceptually for GSAP
                duration: 0.3,
                top: '50px', // Simulate moving down
                backgroundColor: '#27ae60' // Green
            });

        } else {
            recommendedCBElem.textContent = "No standard circuit breaker rating found. Check load/cable capacity or consider a custom solution.";
            breakerSwitch.classList.remove('on');
            breakerSwitch.classList.add('tripped'); // Show 'tripped' state if no CB found or conditions not met

            // Animate to 'tripped' visually
            gsap.to(breakerSwitch.querySelector('::before'), { // Not directly targettable with CSS, but conceptually for GSAP
                duration: 0.3,
                top: '10px', // Simulate moving up
                backgroundColor: '#e74c3c' // Red
            });
            // Trigger spark animation
            breakerSwitch.classList.add('tripped');
            setTimeout(() => {
                breakerSwitch.classList.remove('tripped'); // Reset after animation
            }, 500);
        }
    });

    // --- Lighting Design Calculation ---
    const calculateLightingBtn = document.getElementById('calculateLighting');
    const roomLengthInput = document.getElementById('roomLength');
    const roomWidthInput = document.getElementById('roomWidth');
    const desiredLuxInput = document.getElementById('desiredLux');
    const numLuminairesElem = document.getElementById('numLuminaires');
    const lightingAnimationContainer = document.getElementById('lighting-animation-container');
    const roomLightSimulation = lightingAnimationContainer.querySelector('.room-light-simulation');

    calculateLightingBtn.addEventListener('click', () => {
        const length = parseFloat(roomLengthInput.value);
        const width = parseFloat(roomWidthInput.value);
        const desiredLux = parseFloat(desiredLuxInput.value);

        // Placeholder values for a generic LED panel
        const luminousFluxPerFixture = 3500; // Lumens
        const utilizationFactor = 0.6; // Common value for average room
        const maintenanceFactor = 0.8; // Common value, depends on environment and cleaning

        if (isNaN(length) || isNaN(width) || isNaN(desiredLux) || length <= 0 || width <= 0 || desiredLux <= 0) {
            numLuminairesElem.textContent = "Please enter valid positive numbers.";
            roomLightSimulation.classList.remove('bright');
            return;
        }

        const roomArea = length * width;
        const totalLumenRequired = desiredLux * roomArea;
        const effectiveLumenPerFixture = luminousFluxPerFixture * utilizationFactor * maintenanceFactor;

        const numFixtures = Math.ceil(totalLumenRequired / effectiveLumenPerFixture);

        numLuminairesElem.textContent = `${numFixtures} luminaires required`;

        // Trigger light simulation animation
        if (numFixtures > 0) {
            roomLightSimulation.classList.add('bright');
            roomLightSimulation.textContent = `Illuminated with ${numFixtures} lights`;
        } else {
            roomLightSimulation.classList.remove('bright');
            roomLightSimulation.textContent = `No lights needed, or adjust parameters.`;
        }
    });

    // --- Electrical Fault Calculation ---
    const calculateFaultBtn = document.getElementById('calculateFault');
    const sourceVoltageInput = document.getElementById('sourceVoltage');
    const loopImpedanceInput = document.getElementById('loopImpedance');
    const estimatedFaultCurrentElem = document.getElementById('estimatedFaultCurrent');
    const faultAnimationContainer = document.getElementById('fault-animation-container');
    const faultSurgeAnim = faultAnimationContainer.querySelector('.fault-surge-anim');


    calculateFaultBtn.addEventListener('click', () => {
        const voltage = parseFloat(sourceVoltageInput.value);
        const impedance = parseFloat(loopImpedanceInput.value);

        if (isNaN(voltage) || isNaN(impedance) || voltage <= 0 || impedance <= 0) {
            estimatedFaultCurrentElem.textContent = "Please enter valid positive numbers.";
            faultSurgeAnim.classList.remove('faulty');
            return;
        }

        // Simplified Ohm's Law for fault current (I = V/Z)
        const faultCurrent = voltage / impedance;

        estimatedFaultCurrentElem.textContent = `${faultCurrent.toFixed(2)} Amperes`;

        // Trigger fault surge animation
        faultSurgeAnim.classList.add('faulty');
        setTimeout(() => {
            faultSurgeAnim.classList.remove('faulty'); // Reset animation after it plays
        }, 1000); // Match animation duration
    });
});
