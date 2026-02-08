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

    function moveCar() {
        if (car) {
            let position = 0;
            const roadWidth = car.parentElement?.clientWidth || 0;
            console.log("Road width:", roadWidth);

            const interval = setInterval(() => {
                if (position < roadWidth) {
                    position += carAttributes.velocity * 0.1; // Move based on velocity
                    car.style.transform = `translateX(${position}px)`;
                    
                    // Accelerate to max speed
                    if (carAttributes.velocity < carAttributes.maxSpeed) {
                        carAttributes.velocity += carAttributes.acceleration * 0.1;
                    }
                } else {
                    clearInterval(interval); // Stop when reaching the end
                }
            }, 100);
        }
    }

    onMount(() => {
        moveCar();
    });
</script>

<div class="car" bind:this={car} style="background-color: {carAttributes.color}; width: 50px; height: 25px;">
</div>