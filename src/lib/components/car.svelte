<script lang="ts">
    import { onMount } from "svelte";

    
    let car : HTMLDivElement;

    export let carAttributes: CarAttributes = {
        color: "red",
        velocity: 10,
        maxSpeed: 60,
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

    function projectRays(numRays: number) {
        const frontFOV = 190; // field of view in degrees
        const halfFov = frontFOV / 2;
        const angleStep = frontFOV / (numRays - 1);

        const backFOV = -180; // field of view in degrees
        const backHalfFov = backFOV / 2;

        for (let i = 0; i < numRays; i++) {
            // Spread rays across the FOV centered on the forward direction
            // CSS rotation: 0deg = down, -90deg = right (forward for the car)
            // So forward center is -90deg, and we spread ±halfFov around it
            let rayAngle = -90 - halfFov + angleStep * i;

            let ray = document.createElement("div");
            ray.style.position = "absolute";
            ray.style.width = "1px";
            ray.style.height = "500px";
            ray.style.backgroundColor = "blue";
            // Position at the front-center of the car (right edge, vertical center)
            ray.style.left = `${car.offsetWidth}px`;
            ray.style.top = `${car.offsetHeight / 2}px`;
            ray.style.transformOrigin = "0 0";
            ray.style.transform = `rotate(${rayAngle}deg)`;
            car.appendChild(ray);
        }

        const backNumRays = 15;
        const absFov = Math.abs(backFOV);
        const backAngleStep = absFov / (backNumRays - 1);

        for (let i = 0; i < backNumRays; i++) {
            // Spread rays across the FOV centered on the backward direction
            // Backward center is 90deg, spread ±halfBackFov around it
            let rayAngle = 90 - absFov / 2 + backAngleStep * i;

            let ray = document.createElement("div");
            ray.style.position = "absolute";
            ray.style.width = "1px";
            ray.style.height = "300px";
            ray.style.backgroundColor = "red";
            // Position at the back-center of the car (left edge, vertical center)
            ray.style.left = `0px`;
            ray.style.top = `${car.offsetHeight / 2}px`;
            ray.style.transformOrigin = "0 0";
            ray.style.transform = `rotate(${rayAngle}deg)`;
            car.appendChild(ray);
        }
    }

    function moveCar() {

    }

    onMount(() => {
        projectRays(50);
    }); 
</script>

<div class="car" bind:this={car} style="background-color: {carAttributes.color}; width: 50px; height: 25px; position: relative; margin: 500px;">
</div>