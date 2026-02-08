interface CarAttributes {
    // Visual
    color: string;

    // Movement & Speed
    velocity: number;
    maxSpeed: number;           // Preferred maximum speed
    acceleration: number;       // How quickly they speed up (m/s²)
    deceleration: number;       // How quickly they brake (m/s²)

    // Behavioral
    aggressionLevel: number;    // 0-1 scale, affects multiple behaviors
    reactionTime: number;       // Time to respond to changes (seconds)
    riskTolerance: number;      // 0-1 scale, willingness to take chances
    experienceLevel: number;    // 0-1 scale, affects decision quality
    distractionLevel: number;   // 0-1 scale, reduces attention/reaction time

    // Following & Distance
    tailgateDistance: number;   // Minimum following distance when aggressive
    followingDistance: number;  // Preferred following distance (seconds)

    // Lane & Merge Behavior
    laneChangeFrequency: number; // How often they change lanes (per mile)
    mergeAggression: number;     // 0-1 scale, how forcefully they merge
    turnSignalUsage: number;     // 0-1 scale, reliability of signaling

    // Traffic Control Response
    waitTime: number;           // Patience at intersections
    yellowLightBehavior: number; // 0-1 scale, 0=always stop, 1=always go
    stopSignCompliance: number;  // 0-1 scale, how completely they stop
}
