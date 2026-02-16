<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    
    let car : HTMLDivElement;
    let carCenterX: number;
    let carCenterY: number;
    let animationId: number;

    // --- Turn / Steering state ---
    let heading = 0;              // Current heading in degrees (0 = right, 90 = down)
    let targetHeading = 0;        // Where the car wants to steer toward
    let steeringRate = 2.5;       // Max degrees per frame the car can turn
    let isTurning = false;        // Whether a turn is in progress
    let turnCooldown = 0;         // Frames to wait before next turn decision

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
                    
                    console.log(`Ray ${ray.id} (angle: ${ray.angle.toFixed(1)}°) hit obstacle at distance: ${intersectionDistance.toFixed(2)}px (t=${side.t.toFixed(3)})`);
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

    let rayUpdateInterval: ReturnType<typeof setInterval>;

    function projectRays(numRays: number) {
        rays = []; // Clear existing rays
        const totalSpread = 180; // Full sensor arc in degrees
        const angleIncrement = totalSpread / (numRays - 1 || 1);
        const maxDistance = 150;
        const halfSpread = totalSpread / 2;

        for (let i = 0; i < numRays; i++) {
            const localAngle = -halfSpread + i * angleIncrement; // –90 … +90 relative
            const absoluteAngle = heading + localAngle;

            rays.push({
                id: i,
                angle: absoluteAngle,
                distance: maxDistance,
                hitDistance: maxDistance,
                collision: false,
                originPosition: { x: 25, y: 12.5 }
            });
        }

        // Single interval updates all rays and keeps them aligned with the heading
        if (rayUpdateInterval) clearInterval(rayUpdateInterval);
        rayUpdateInterval = setInterval(() => {
            const halfSpread = totalSpread / 2;
            for (let i = 0; i < rays.length; i++) {
                const localAngle = -halfSpread + i * angleIncrement;
                rays[i].angle = heading + localAngle; // Rotate with car
                checkCollision(rays[i]);
            }
            rays = rays; // Trigger Svelte reactivity
        }, 16);
    }

    /**
     * Analyse rays in a cone relative to the car's heading.
     * Returns { hasCollision, avgHitDistance } for that sector.
     */
    function analyseSector(fromDeg: number, toDeg: number) {
        const sector = rays.filter(r => {
            // ray.angle is absolute; normalise relative to heading
            let rel = ((r.angle - heading) % 360 + 360) % 360;
            if (rel > 180) rel -= 360; // –180 … 180
            return rel >= fromDeg && rel <= toDeg;
        });
        const collisions = sector.filter(r => r.collision);
        const avgHit = collisions.length
            ? collisions.reduce((s, r) => s + r.hitDistance, 0) / collisions.length
            : Infinity;
        return { hasCollision: collisions.length > 0, avgHitDistance: avgHit, count: collisions.length };
    }

    /**
     * Decide whether and where to turn.
     * Uses three sectors: left (–90 … –15), centre (–15 … 15), right (15 … 90).
     * The car steers toward the sector with the most open space.
     */
    function decideTurn() {
        const centre = analyseSector(-20, 20);
        const left   = analyseSector(-90, -20);
        const right  = analyseSector(20, 90);

        // Nothing ahead → go straight
        if (!centre.hasCollision) {
            targetHeading = heading;
            isTurning = false;
            return;
        }

        // Something ahead — pick the side with more room
        isTurning = true;

        const leftOpen  = left.hasCollision  ? left.avgHitDistance  : 999;
        const rightOpen = right.hasCollision ? right.avgHitDistance : 999;

        if (leftOpen > rightOpen) {
            // Turn left (counter-clockwise)
            targetHeading = heading - (45 + Math.random() * 30);
        } else if (rightOpen > leftOpen) {
            // Turn right (clockwise)
            targetHeading = heading + (45 + Math.random() * 30);
        } else {
            // Equal — slight random bias influenced by aggression
            const bias = carAttributes.aggressionLevel > 0.5 ? 1 : -1;
            targetHeading = heading + bias * (45 + Math.random() * 30);
        }
    }

    /**
     * Smoothly interpolate the heading toward the target heading.
     */
    function applySteering() {
        let diff = targetHeading - heading;
        // Normalise to –180 … 180
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        if (Math.abs(diff) < steeringRate) {
            heading = targetHeading;
            isTurning = false;
        } else {
            heading += Math.sign(diff) * steeringRate;
        }
    }

    function moveCar() {
        // --- Turn decision (throttled by cooldown) ---
        if (turnCooldown <= 0) {
            decideTurn();
            turnCooldown = 8; // Re-evaluate every ~8 frames
        } else {
            turnCooldown--;
        }

        // --- Steering ---
        applySteering();

        // --- Speed control ---
        const centre = analyseSector(-20, 20);
        let speed: number;
        if (centre.hasCollision && centre.avgHitDistance < 40) {
            speed = 0.5; // Almost stopped — very close obstacle
        } else if (centre.hasCollision) {
            speed = Math.max(1, carAttributes.velocity );
        } else {
            speed = carAttributes.velocity;
        }

        // --- Movement along heading ---
        const rad = heading * Math.PI / 180;
        const currentLeft = parseFloat(car.style.left) || 0;
        const currentTop  = parseFloat(car.style.top)  || 0;

        const newLeft = currentLeft + Math.cos(rad) * speed;
        const newTop  = currentTop  + Math.sin(rad) * speed;

        car.style.left = `${newLeft}px`;
        car.style.top  = `${newTop}px`;

        // Rotate the visual car
        car.style.transform = `rotate(${heading}deg)`;

        updateCarCenter();

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
        if (animationId) cancelAnimationFrame(animationId);
        if (rayUpdateInterval) clearInterval(rayUpdateInterval);
    }); 
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="car-container" bind:this={car} style="top:50%; left:0px; position: absolute; width: 400px; height: 300px; transform-origin: 25px 12.5px;">
    <div class="car"  style="background-color: {carAttributes.color}; width: 50px; height: 25px; position: relative; z-index: 2;">
    </div>
    
    <!-- Reactive SVG rays using Svelte's templating -->
    <svg 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;"
        viewBox="0 0 400 300"
    >
        {#each rays as ray}
            <line
                x1="25"
                y1="12.5"
                x2={25 + Math.cos(ray.angle * Math.PI / 180) * (ray.collision ? ray.hitDistance : ray.distance)}
                y2={12.5 + Math.sin(ray.angle * Math.PI / 180) * (ray.collision ? ray.hitDistance : ray.distance)}
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