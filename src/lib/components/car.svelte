<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    
    let car : HTMLDivElement;
    let carCenterX: number;
    let carCenterY: number;
    let animationId: number;
    let lastTime: number = 0;
    let rotation: number = 0;

    // set the car's center coordinates based on its position and dimensions
    function updateCarCenter() {
        carCenterX = car.offsetLeft + (car.offsetWidth / 2);
        carCenterY = car.offsetTop + (car.offsetHeight / 2);
    }

    export let carAttributes: CarAttributes = {
        color: "red",
        velocity: 0,          // px/s — starts at rest, integrated each frame
        maxSpeed: 200,        // px/s
        acceleration: 150,    // px/s²
        deceleration: 300,    // px/s²
        aggressionLevel: 0.5,
        reactionTime: 1.5,
        riskTolerance: 0.5,
        experienceLevel: 0.5,
        distractionLevel: 0.2,
        tailgateDistance: 2,
        followingDistance: 3,
        laneChangeFrequency: 0.2,
        mergeAggression: 0.5,
        turnSignalUsage: 0.8,
        waitTime: 10,
        yellowLightBehavior: 0.5,
        stopSignCompliance: 0.9
    };

    interface ray {
        id: number;
        angle: number;
        distance: number;
        hitDistance: number; 
        collision: boolean;
        originPosition: { x: number; y: number };
        hitObject?: number;
    }
    
    let rays: ray[] = [];

    function getSceneObstacles() {
        const obstacles = [] as {
            id: number;
            x: number;
            y: number;
            width: number;
            height: number;
            bottomLeftX?: number;
            bottomLeftY?: number;
            rightmostX?: number;
            rightmostY?: number;
        }[];
        
        // Find all elements marked as obstacles
        const obstacleElements = document.querySelectorAll('[data-obstacle]');
        
        obstacleElements.forEach((element, index) => {
            // console.log('Found obstacle element:', element);
            const rect = element.getBoundingClientRect();
                // Convert to relative coordinates within the car container
                const relativeX = rect.left;
                const relativeY = rect.top;
                
                obstacles.push({
                    id: index,
                    x: relativeX, // leftmost x
                    y: relativeY, // topmost y 
                    width: rect.width,
                    height: rect.height,
                    // Additional corner coordinates if needed:
                    bottomLeftX: relativeX,
                    bottomLeftY: relativeY + rect.height,
                    rightmostX: relativeX + rect.width,
                    rightmostY: relativeY
                });
        });
        return obstacles;
    }

    function checkCollision(ray: ray) {
        const obstacles = getSceneObstacles();
        const carRect = car.getBoundingClientRect();
        const rayStartX = carRect.left + ray.originPosition.x;
        const rayStartY = carRect.top + ray.originPosition.y;
        const worldAngle = (ray.angle + rotation) * Math.PI / 180;
        const rayEndX = rayStartX + Math.cos(worldAngle) * ray.distance;
        const rayEndY = rayStartY + Math.sin(worldAngle) * ray.distance;

        let closestDistance = ray.distance; // Start with max distance
        let hasCollision = false;

        for (let obstacle of obstacles) {
            const sides = [
                // left side
                lineLine(rayStartX, rayStartY, rayEndX, rayEndY, obstacle.x, obstacle.y, obstacle.x, obstacle.y + obstacle.height),
                // right side  
                lineLine(rayStartX, rayStartY, rayEndX, rayEndY, obstacle.x + obstacle.width, obstacle.y, obstacle.x + obstacle.width, obstacle.y + obstacle.height),
                // top side
                lineLine(rayStartX, rayStartY, rayEndX, rayEndY, obstacle.x, obstacle.y, obstacle.x + obstacle.width, obstacle.y),
                // bottom side
                lineLine(rayStartX, rayStartY, rayEndX, rayEndY, obstacle.x, obstacle.y + obstacle.height, obstacle.x + obstacle.width, obstacle.y + obstacle.height)
            ];

            for (let side of sides) {
                if (side.intersects) {
                    hasCollision = true;
                    // Calculate actual distance to intersection point
                    const intersectionDistance = side.t * ray.distance;
                    if (intersectionDistance < closestDistance) {
                        closestDistance = intersectionDistance;
                    }
                }
            }
        }

        ray.collision = hasCollision;
        ray.hitDistance = closestDistance; // Update hit distance, keep original max distance
        return hasCollision;
    }

    //line-line intersection
    function lineLine(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
        const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (den === 0) {
            return { intersects: false, t: 0 }; // Lines are parallel
        }

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

        const intersects = t > 0 && t < 1 && u > 0 && u < 1;
        return { intersects, t };
    }

    function projectRays(numRays: number) {
        rays = []; // Clear existing rays
        const totalSpread = 180; // Total degrees to cover (-90° to +90°)
        const angleIncrement = totalSpread / (numRays - 1 || 1); // Even distribution, inclusive of both ends
        const maxDistance = 200;
        const halfSpread = totalSpread / 2;
        for (let i = 0; i < numRays; i++) {
            // Center the rays symmetrically around 0° (forward / right)
            const angle = -halfSpread + i * angleIncrement;
            rays.push({
                id: i,
                angle: angle,
                distance: maxDistance,
                hitDistance: maxDistance, // Initialize to max distance
                collision: false,
                originPosition: { x: 25, y: 12.5 } // center of the car relative to container
            });
        }
    }

    function updateAllRays() {
        for (let i = 0; i < rays.length; i++) {
            checkCollision(rays[i]);
        }
        rays = rays; // Trigger Svelte reactivity
    }


    //  directional collision check 
    function checkCollisionInDirection(direction: 'forward' | 'left' | 'right' | 'custom', customAngleRange?: { min: number; max: number }) {
        let relevantRays: ray[] = [];
        if (direction === 'forward') {
            relevantRays = rays.filter(ray => ray.angle >= -10 && ray.angle <= 10);
        } else if (direction === 'left') {
            relevantRays = rays.filter(ray => ray.angle > 30 && ray.angle <= 90);
        } else if (direction === 'right') {
            relevantRays = rays.filter(ray => ray.angle < -30 && ray.angle >= -90);
        } else if (direction === 'custom' && customAngleRange) {
            relevantRays = rays.filter(ray => ray.angle >= customAngleRange.min && ray.angle <= customAngleRange.max);
        }
        return relevantRays.some(ray => ray.collision);
    }

    function moveCar(timestamp: number) {
        // dt in seconds; cap at 100 ms to avoid a large jump after tab blur/focus
        const dt = lastTime === 0 ? 0 : Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        // Update all ray collisions each frame
        updateAllRays();

        // Get current position
        const currentLeft = parseFloat(car.style.left) || 0;
        const currentTop  = parseFloat(car.style.top)  || 0;
        const forwardRays = rays.filter(ray => ray.angle >= -30 && ray.angle <= 30);

        // Stopping distance: d = v² / (2·a)
        const stoppingDistance = (carAttributes.velocity ** 2) / (2 * carAttributes.deceleration);
        const safetyMargin = 20; // px buffer beyond the computed stopping distance

        const minForwardHit = forwardRays.length > 0
            ? Math.min(...forwardRays.map(r => r.hitDistance))
            : Infinity;

        if (checkCollisionInDirection('forward') && minForwardHit < safetyMargin) {
            // Very close — brake hard and steer away
            // v = v₀ - a·dt  (decelerate)
            carAttributes.velocity = Math.max(0, carAttributes.velocity - carAttributes.deceleration * dt);
            rotation += 480 * dt; // ~8°/frame at 60 fps (angular velocity · dt)
        } else if (checkCollisionInDirection('forward') && minForwardHit < stoppingDistance + safetyMargin) {
            // Within braking distance — decelerate: v = v₀ - a·dt
            carAttributes.velocity = Math.max(0, carAttributes.velocity - carAttributes.deceleration * dt);
        } else {
            // Clear path — accelerate: v = v₀ + a·dt
            carAttributes.velocity = Math.min(carAttributes.maxSpeed, carAttributes.velocity + carAttributes.acceleration * dt);
        }

        // Position integration: x = x₀ + v·dt
        const rad = rotation * Math.PI / 180;
        const newLeft = currentLeft + carAttributes.velocity * Math.cos(rad) * dt;
        const newTop  = currentTop  + carAttributes.velocity * Math.sin(rad) * dt;

        // Apply movement
        car.style.left = `${newLeft}px`;
        car.style.top  = `${newTop}px`;
        updateCarCenter();

        // Continue animation loop
        animationId = requestAnimationFrame(moveCar);
    }



    onMount(() => {
        lastTime = 0;
        updateCarCenter();
        projectRays(100);
        animationId = requestAnimationFrame(moveCar);
    });

    onDestroy(() => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    }); 
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="car-container" bind:this={car} style="top:50%; position: absolute; width: 400px; height: 300px;">
    <div class="car" style="background-color: {carAttributes.color}; width: 50px; height: 25px; position: relative; z-index: 2; transform: rotate({rotation}deg); transform-origin: center center;">
    </div>
    
    <!-- Reactive SVG rays using Svelte's templating -->
    <svg 
        style="position: absolute; top: 0; left: 0; width: 400px; height: 300px; pointer-events: none; z-index: 1; overflow: visible;"
        viewBox="0 0 400 300"
    >
        {#each rays as ray}
            <line
                x1="25"
                y1="12.5"
                x2={25 + Math.cos((ray.angle + rotation) * Math.PI / 180) * (ray.collision ? ray.hitDistance : ray.distance)}
                y2={12.5 + Math.sin((ray.angle + rotation) * Math.PI / 180) * (ray.collision ? ray.hitDistance : ray.distance)}
                stroke={ray.collision ? "red" : "rgba(0, 255, 0, 0.7)"}
                stroke-width="1.5"
                opacity="0.8"
            />
        {/each}
    </svg>

</div>