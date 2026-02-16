<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    
    let car : HTMLDivElement;
    let carCenterX: number;
    let carCenterY: number;
    let animationId: number;

    // set the car's center coordinates based on its position and dimensions
    function updateCarCenter() {
        carCenterX = car.offsetLeft + (car.offsetWidth / 2);
        carCenterY = car.offsetTop + (car.offsetHeight / 2);
    }

    export let carAttributes: CarAttributes = {
        color: "red",
        velocity: 10,
        maxSpeed: 10,
        acceleration: 3,
        deceleration: 5,
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
        hitDistance: number; // Distance to closest collision point
        collision: boolean;
        originPosition: { x: number; y: number };
        hitObject?: number;
    }
    
    let rays: ray[] = [];
    let dragging = false;
    let dragOffset = { x: 0, y: 0 };

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
        
        // Find all elements marked as obstacles (you can use class, data attribute, etc.)
        const obstacleElements = document.querySelectorAll('[data-obstacle], .obstacle, span[draggable="true"]');
        
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
        const rayEndX = rayStartX + Math.cos(ray.angle * Math.PI / 180) * ray.distance;
        const rayEndY = rayStartY + Math.sin(ray.angle * Math.PI / 180) * ray.distance;

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
        const maxDistance = 150;
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
            // update ray
            setInterval(() => {
                rays[i].collision = checkCollision(rays[i]);
            }, 10);
            
        }
    }

    function checkForwardCollision() {
        // Check if any rays in the forward direction (roughly front-facing) detect collision
        const forwardRays = rays.filter(ray => ray.angle >= -30 && ray.angle <= 30);
        return forwardRays.some(ray => ray.collision);
    }

    function moveCar() {
        // Get current position
        const currentLeft = parseFloat(car.style.left) || 0;
        const forwardRays = rays.filter(ray => ray.angle >= -30 && ray.angle <= 30);
        
        let speed = carAttributes.velocity;
        if (checkForwardCollision() && forwardRays.some(ray => ray.hitDistance < 50) ) {
            carAttributes.velocity = 0; // Stop if obstacle is very close
            console.log('Obstacle detected ahead! Stopping car.');
        } else if (checkForwardCollision() && forwardRays.some(ray => ray.hitDistance < 120) ) {
            carAttributes.velocity = 1; // Slow down if obstacle is moderately close
            console.log('Obstacle detected ahead! Slowing down car.');
        } else {
            carAttributes.velocity = 5; // Normal speed
        }   
        
        // Calculate new position
        const newLeft = currentLeft + carAttributes.velocity;
        
        // Apply movement
        car.style.left = `${newLeft}px`;
        updateCarCenter();
        
        // Continue animation loop
        animationId = requestAnimationFrame(moveCar);
    }

    let dragTarget: HTMLElement | null = null;

    function handlePointerDown(event: PointerEvent) {
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        dragOffset.x = event.clientX - rect.left;
        dragOffset.y = event.clientY - rect.top;
        dragging = true;
        dragTarget = el;
        el.setPointerCapture(event.pointerId);
        el.style.cursor = 'grabbing';
    }

    function handlePointerMove(event: PointerEvent) {
        if (!dragging || !dragTarget) return;
        dragTarget.style.left = `${event.clientX - dragOffset.x}px`;
        dragTarget.style.top  = `${event.clientY - dragOffset.y}px`;
    }

    function handlePointerUp(event: PointerEvent) {
        if (!dragTarget) return;
        dragging = false;
        dragTarget.style.cursor = 'grab';
        dragTarget.releasePointerCapture(event.pointerId);
        dragTarget = null;
    }

    onMount(() => {
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
    <div class="car"  style="background-color: {carAttributes.color}; width: 50px; height: 25px; position: relative; z-index: 2;">
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
                x2={25 + Math.cos(ray.angle * Math.PI / 180) * ray.distance}
                y2={12.5 + Math.sin(ray.angle * Math.PI / 180) * ray.distance}
                stroke={ray.collision ? "red" : "rgba(0, 255, 0, 0.7)"}
                stroke-width="1.5"
                opacity="0.8"
            />
        {/each}
    </svg>

    <!-- draggable box to simulate obstacle -->
</div>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    data-obstacle
    style="position: absolute; width: 30px; height: 30px; background-color: black; left: 200px; top: 45%; z-index: 10; cursor: grab; border-radius: 4px; touch-action: none; user-select: none;"
    on:pointerdown={handlePointerDown}
    on:pointermove={handlePointerMove}
    on:pointerup={handlePointerUp}
></div>